import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, EstadoTiempo } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export async function getApprovalList(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
      estado: EstadoTiempo.Activo,
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
          cliente: { select: { id: true, codigo: true, razon_social: true } },
          area_practica: { select: { id: true, nombre: true } },
          tiempos: {
            where: tiempoWhere,
            include: { usuario: { select: { id: true, nombre: true } } },
          },
        },
        skip,
        take: limitNum,
        orderBy: { codigo: 'asc' },
      }),
    ]);

    const data = asuntos.map((a) => {
      const activos = a.tiempos.filter((t) => t.estado === EstadoTiempo.Activo);
      const aprobados = a.tiempos.filter((t) => t.estado === EstadoTiempo.Aprobado);
      const facturables = a.tiempos.filter((t) => t.facturable);
      const noFacturables = a.tiempos.filter((t) => !t.facturable);
      const horas_facturables = facturables.reduce((s, t) => s + t.duracion_horas, 0);
      const horas_no_facturables = noFacturables.reduce((s, t) => s + t.duracion_horas, 0);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tiempos: _t, ...rest } = a;
      return {
        ...rest,
        count_activos: activos.length,
        count_aprobados: aprobados.length,
        count_tiempos: a.tiempos.length,
        horas_facturables,
        horas_no_facturables,
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

export async function getAsuntoTiemposApproval(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const asuntoId = parseInt(req.params.asuntoId, 10);
    if (isNaN(asuntoId)) throw new AppError('ID de asunto inválido', 400);

    const tiempos = await prisma.tiempos.findMany({
      where: { asunto_id: asuntoId, estado: EstadoTiempo.Activo },
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

const bulkUpdateSchema = z.object({
  tiempo_ids: z.array(z.number().int().positive()),
  estado: z.enum(['Aprobado', 'Activo']),
});

export async function bulkUpdateTiempoEstado(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = bulkUpdateSchema.parse(req.body);

    const result = await prisma.tiempos.updateMany({
      where: { id: { in: body.tiempo_ids } },
      data: { estado: body.estado as EstadoTiempo },
    });

    res.json({ updated: result.count, estado: body.estado });
  } catch (err) {
    next(err);
  }
}
