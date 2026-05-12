import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, EstadoTiempo, TipoDocumentoFacturacion, Moneda } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export async function getBillableObjects(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      usuario_id,
      cliente_id,
      asunto_id,
      area_practica_id,
      fecha_inicio,
      fecha_fin,
      tipo_facturacion,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const tiempoWhere: Record<string, unknown> = {
      estado: EstadoTiempo.Aprobado,
    };
    if (usuario_id) tiempoWhere.usuario_id = parseInt(usuario_id, 10);
    if (fecha_inicio || fecha_fin) {
      tiempoWhere.fecha = {};
      if (fecha_inicio) (tiempoWhere.fecha as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (tiempoWhere.fecha as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const asuntoWhere: Record<string, unknown> = {
      tiempos: { some: tiempoWhere },
    };
    if (cliente_id) asuntoWhere.cliente_id = parseInt(cliente_id, 10);
    if (asunto_id) asuntoWhere.id = parseInt(asunto_id, 10);
    if (area_practica_id) asuntoWhere.area_practica_id = parseInt(area_practica_id, 10);
    if (tipo_facturacion) asuntoWhere.tipo_facturacion = tipo_facturacion;

    const [total, asuntos] = await Promise.all([
      prisma.asuntos.count({ where: asuntoWhere }),
      prisma.asuntos.findMany({
        where: asuntoWhere,
        include: {
          cliente: {
            select: {
              id: true,
              codigo: true,
              razon_social: true,
              responsable: { select: { id: true, nombre: true, tarifa_horaria: true } },
            },
          },
          area_practica: { select: { id: true, nombre: true } },
          tiempos: {
            where: tiempoWhere,
            orderBy: { fecha: 'desc' },
          },
        },
        skip,
        take: limitNum,
        orderBy: { codigo: 'asc' },
      }),
    ]);

    const data = asuntos.map((a) => {
      const facturables = a.tiempos.filter((t) => t.facturable);
      const horas_facturables = facturables.reduce((s, t) => s + t.duracion_horas, 0);
      const tarifa = parseFloat(a.cliente?.responsable?.tarifa_horaria?.toString() ?? '0') || 0;
      const valor = Math.round((horas_facturables / 60) * tarifa);
      const fecha_ultima = a.tiempos[0]?.fecha ?? null;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tiempos: _t, ...rest } = a;
      return {
        ...rest,
        responsable: a.cliente?.responsable ?? null,
        count_tiempos: a.tiempos.length,
        horas_facturables,
        valor,
        fecha_ultima,
      };
    });

    res.json({
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getBillableAsuntoTiempos(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const asuntoId = parseInt(req.params.asuntoId, 10);
    if (isNaN(asuntoId)) throw new AppError('ID de asunto inválido', 400);

    const tiempos = await prisma.tiempos.findMany({
      where: { asunto_id: asuntoId, estado: EstadoTiempo.Aprobado },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    res.json({ data: tiempos });
  } catch (err) {
    next(err);
  }
}

const facturarSchema = z.object({
  asunto_ids: z.array(z.number().int().positive()),
  tipo_documento: z.nativeEnum(TipoDocumentoFacturacion),
  rango_fecha_inicio: z.string(),
  rango_fecha_fin: z.string(),
  moneda: z.nativeEnum(Moneda),
  impuesto_id: z.number().int().positive().optional().nullable(),
  gravamen_id: z.number().int().positive().optional().nullable(),
  tasa_cambio_id: z.number().int().positive().optional().nullable(),
});

export async function facturar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = facturarSchema.parse(req.body);

    const documentos = [];

    for (const asunto_id of body.asunto_ids) {
      const asunto = await prisma.asuntos.findUnique({
        where: { id: asunto_id },
        include: {
          cliente: {
            include: {
              responsable: { select: { id: true, tarifa_horaria: true } },
            },
          },
          tiempos: {
            where: { estado: EstadoTiempo.Aprobado, facturable: true },
          },
        },
      });

      if (!asunto) continue;

      const horas_facturables = asunto.tiempos.reduce((s, t) => s + t.duracion_horas, 0);
      const tarifa = parseFloat(asunto.cliente?.responsable?.tarifa_horaria?.toString() ?? '0') || 0;
      const valor = Math.round((horas_facturables / 60) * tarifa);

      const doc = await prisma.documentos_facturacion.create({
        data: {
          tipo_documento: body.tipo_documento,
          receptor_id: asunto.cliente_id,
          emisor_id: req.user?.id ?? null,
          asunto_id,
          rango_fecha_inicio: new Date(body.rango_fecha_inicio),
          rango_fecha_fin: new Date(body.rango_fecha_fin),
          valor,
          moneda: body.moneda,
          impuesto_id: body.impuesto_id ?? null,
          gravamen_id: body.gravamen_id ?? null,
          tasa_cambio_id: body.tasa_cambio_id ?? null,
          estado: 'Borrador',
        },
        include: {
          receptor: { select: { id: true, razon_social: true } },
          asunto: { select: { id: true, codigo: true, nombre: true } },
        },
      });

      // Update tiempos to Facturado
      await prisma.tiempos.updateMany({
        where: { asunto_id, estado: EstadoTiempo.Aprobado },
        data: { estado: EstadoTiempo.Facturado },
      });

      documentos.push(doc);
    }

    res.status(201).json({ data: documentos, created: documentos.length });
  } catch (err) {
    next(err);
  }
}
