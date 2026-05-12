import { Response, NextFunction } from 'express';
import { PrismaClient, EstadoTiempo } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export async function getWipClientes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      search,
      estado,
      responsable_id,
      emisor_facturacion_id,
      grupo_empresarial_id,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { razon_social: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (estado) where.estado = estado;
    if (responsable_id) where.responsable_id = parseInt(responsable_id, 10);
    if (emisor_facturacion_id) where.emisor_facturacion_id = parseInt(emisor_facturacion_id, 10);
    if (grupo_empresarial_id) where.grupo_empresarial_id = parseInt(grupo_empresarial_id, 10);

    const [total, data] = await Promise.all([
      prisma.clientes.count({ where }),
      prisma.clientes.findMany({
        where,
        select: {
          id: true,
          codigo: true,
          razon_social: true,
          nombre_comercial: true,
          pais: true,
          ciudad: true,
          estado: true,
          created_at: true,
          updated_at: true,
          _count: { select: { asuntos: true } },
        },
        skip,
        take: limitNum,
        orderBy: { razon_social: 'asc' },
      }),
    ]);

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

export async function getWipAsuntos(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const clienteId = parseInt(req.params.clienteId, 10);
    if (isNaN(clienteId)) throw new AppError('ID de cliente inválido', 400);

    const {
      usuario_id,
      area_practica_id,
      tipo_facturacion,
      estado_asunto,
      estado_tiempos,
      facturable,
    } = req.query as Record<string, string>;

    const asuntoWhere: Record<string, unknown> = { cliente_id: clienteId };
    if (area_practica_id) asuntoWhere.area_practica_id = parseInt(area_practica_id, 10);
    if (tipo_facturacion) asuntoWhere.tipo_facturacion = tipo_facturacion;
    if (estado_asunto) asuntoWhere.estado = estado_asunto;

    const tiempoWhere: Record<string, unknown> = {};
    if (usuario_id) tiempoWhere.usuario_id = parseInt(usuario_id, 10);
    if (estado_tiempos) tiempoWhere.estado = estado_tiempos as EstadoTiempo;
    if (facturable !== undefined && facturable !== '') {
      tiempoWhere.facturable = facturable === 'true';
    }

    const asuntos = await prisma.asuntos.findMany({
      where: asuntoWhere,
      include: {
        area_practica: { select: { id: true, nombre: true } },
        cliente: {
          select: {
            id: true,
            razon_social: true,
            responsable: { select: { id: true, nombre: true, tarifa_horaria: true } },
          },
        },
        tiempos: {
          where: {
            ...tiempoWhere,
            estado: { notIn: [EstadoTiempo.FacturadoPagado] },
          },
        },
      },
      orderBy: { codigo: 'asc' },
    });

    const result = asuntos.map((a) => {
      const tiemposFacturables = a.tiempos.filter((t) => t.facturable);
      const horas_facturables = tiemposFacturables.reduce((sum, t) => sum + t.duracion_horas, 0);
      const tarifa = parseFloat(a.cliente?.responsable?.tarifa_horaria?.toString() ?? '0') || 0;
      // duracion_horas is stored in minutes, convert to hours for value calc
      const valor_tiempos = Math.round((horas_facturables / 60) * tarifa);
      const total_facturable = valor_tiempos;
      const count_tiempos = a.tiempos.length;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tiempos: _tiempos, ...asuntoFields } = a;

      return {
        ...asuntoFields,
        horas_facturables,
        valor_tiempos,
        total_facturable,
        count_tiempos,
      };
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
