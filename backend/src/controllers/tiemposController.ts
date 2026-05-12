import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, EstadoTiempo } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const tiempoSelect = {
  id: true,
  usuario_id: true,
  cliente_id: true,
  asunto_id: true,
  actividad: true,
  fecha: true,
  duracion_horas: true,
  facturable: true,
  compartido_con: true,
  estado: true,
  created_at: true,
  updated_at: true,
  usuario: { select: { id: true, nombre: true } },
  cliente: { select: { id: true, razon_social: true } },
  asunto: { select: { id: true, codigo: true, nombre: true } },
  compartido_usuario: { select: { id: true, nombre: true } },
};

// Parse "HH:MM" → minutes
function hhmmToMinutes(value: string): number {
  const parts = value.split(':');
  if (parts.length !== 2) throw new AppError('Formato de duración inválido. Use HH:MM', 400);
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || m < 0 || m > 59) {
    throw new AppError('Formato de duración inválido. Use HH:MM', 400);
  }
  return h * 60 + m;
}

const createTiempoSchema = z.object({
  usuario_id: z.number().int().positive(),
  cliente_id: z.number().int().positive('Cliente requerido'),
  asunto_id: z.number().int().positive('Asunto requerido'),
  actividad: z.string().min(1, 'Actividad requerida'),
  fecha: z.string().min(1, 'Fecha requerida'),
  duracion: z.string().min(1, 'Duración requerida'), // HH:MM format from frontend
  facturable: z.boolean().optional(),
  compartido_con: z.number().int().positive().optional().nullable(),
  estado: z.nativeEnum(EstadoTiempo).optional(),
});

const updateTiempoSchema = createTiempoSchema.partial();

export async function getTiempos(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      usuario_id,
      cliente_id,
      asunto_id,
      estado,
      facturable,
      fecha_inicio,
      fecha_fin,
      mostrar_todos = 'false',
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (mostrar_todos !== 'true' && req.user?.id) {
      where.usuario_id = req.user.id;
    } else if (usuario_id) {
      where.usuario_id = parseInt(usuario_id, 10);
    }

    if (cliente_id) where.cliente_id = parseInt(cliente_id, 10);
    if (asunto_id) where.asunto_id = parseInt(asunto_id, 10);
    if (estado) where.estado = estado as EstadoTiempo;
    if (facturable !== undefined && facturable !== '') {
      where.facturable = facturable === 'true';
    }
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) (where.fecha as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (where.fecha as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const [total, data] = await Promise.all([
      prisma.tiempos.count({ where }),
      prisma.tiempos.findMany({
        where,
        select: tiempoSelect,
        skip,
        take: limitNum,
        orderBy: { fecha: 'desc' },
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

export async function getTiempoById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const tiempo = await prisma.tiempos.findUnique({ where: { id }, select: tiempoSelect });
    if (!tiempo) throw new AppError('Tiempo no encontrado', 404);

    res.json(tiempo);
  } catch (err) {
    next(err);
  }
}

export async function createTiempo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createTiempoSchema.parse(req.body);
    const duracion_horas = hhmmToMinutes(body.duracion);

    const tiempo = await prisma.tiempos.create({
      data: {
        usuario_id: body.usuario_id,
        cliente_id: body.cliente_id,
        asunto_id: body.asunto_id,
        actividad: body.actividad,
        fecha: new Date(body.fecha),
        duracion_horas,
        facturable: body.facturable ?? true,
        compartido_con: body.compartido_con ?? null,
        estado: body.estado ?? EstadoTiempo.Activo,
      },
      select: tiempoSelect,
    });

    res.status(201).json(tiempo);
  } catch (err) {
    next(err);
  }
}

export async function updateTiempo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.tiempos.findUnique({ where: { id } });
    if (!existing) throw new AppError('Tiempo no encontrado', 404);

    const body = updateTiempoSchema.parse(req.body);
    const updateData: Record<string, unknown> = {};

    if (body.usuario_id !== undefined) updateData.usuario_id = body.usuario_id;
    if (body.cliente_id !== undefined) updateData.cliente_id = body.cliente_id;
    if (body.asunto_id !== undefined) updateData.asunto_id = body.asunto_id;
    if (body.actividad !== undefined) updateData.actividad = body.actividad;
    if (body.fecha !== undefined) updateData.fecha = new Date(body.fecha);
    if (body.duracion !== undefined) updateData.duracion_horas = hhmmToMinutes(body.duracion);
    if (body.facturable !== undefined) updateData.facturable = body.facturable;
    if (body.compartido_con !== undefined) updateData.compartido_con = body.compartido_con;
    if (body.estado !== undefined) updateData.estado = body.estado;

    const tiempo = await prisma.tiempos.update({
      where: { id },
      data: updateData,
      select: tiempoSelect,
    });

    res.json(tiempo);
  } catch (err) {
    next(err);
  }
}

export async function deleteTiempo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.tiempos.findUnique({ where: { id } });
    if (!existing) throw new AppError('Tiempo no encontrado', 404);

    await prisma.tiempos.delete({ where: { id } });
    res.json({ message: 'Tiempo eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}
