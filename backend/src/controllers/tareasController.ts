import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, Importancia } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const tareaSelect = {
  id: true,
  titulo: true,
  usuario_id: true,
  cliente_id: true,
  asunto_id: true,
  detalles: true,
  fecha_inicio: true,
  fecha_vencimiento: true,
  importancia: true,
  estimado_minutos: true,
  finalizada: true,
  archivada: true,
  created_at: true,
  updated_at: true,
  usuario: { select: { id: true, nombre: true } },
  cliente: { select: { id: true, razon_social: true } },
  asunto: { select: { id: true, codigo: true, nombre: true } },
};

const createTareaSchema = z.object({
  titulo: z.string().min(1, 'Título requerido'),
  usuario_id: z.number().int().positive(),
  cliente_id: z.number().int().positive('Cliente requerido'),
  asunto_id: z.number().int().positive('Asunto requerido'),
  detalles: z.string().min(1, 'Detalles requeridos'),
  fecha_inicio: z.string().optional().nullable(),
  fecha_vencimiento: z.string().optional().nullable(),
  importancia: z.nativeEnum(Importancia).optional().nullable(),
  estimado_minutos: z.number().int().min(0).optional(),
  finalizada: z.boolean().optional(),
  archivada: z.boolean().optional(),
});

const updateTareaSchema = createTareaSchema.partial();

export async function getTareas(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      usuario_id,
      cliente_id,
      asunto_id,
      finalizada,
      archivada,
      importancia,
      mostrar_todos = 'false',
      sort,
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
    if (finalizada !== undefined && finalizada !== '') {
      where.finalizada = finalizada === 'true';
    }
    if (archivada !== undefined && archivada !== '') {
      where.archivada = archivada === 'true';
    }
    if (importancia) where.importancia = importancia as Importancia;

    // Default: active (not finalizada, not archivada)
    // Sort options
    let orderBy: Record<string, unknown> | Record<string, unknown>[] = { created_at: 'desc' };
    if (sort === 'vencimiento') {
      orderBy = { fecha_vencimiento: 'asc' };
    } else if (sort === 'importancia') {
      // Importancia: Alta > Media > Baja — use raw ordering
      orderBy = [{ importancia: 'asc' }, { created_at: 'desc' }];
    }

    const [total, data] = await Promise.all([
      prisma.tareas.count({ where }),
      prisma.tareas.findMany({
        where,
        select: tareaSelect,
        skip,
        take: limitNum,
        orderBy,
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

export async function getTareaById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const tarea = await prisma.tareas.findUnique({ where: { id }, select: tareaSelect });
    if (!tarea) throw new AppError('Tarea no encontrada', 404);

    res.json(tarea);
  } catch (err) {
    next(err);
  }
}

export async function createTarea(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createTareaSchema.parse(req.body);

    const tarea = await prisma.tareas.create({
      data: {
        titulo: body.titulo,
        usuario_id: body.usuario_id,
        cliente_id: body.cliente_id,
        asunto_id: body.asunto_id,
        detalles: body.detalles,
        fecha_inicio: body.fecha_inicio ? new Date(body.fecha_inicio) : null,
        fecha_vencimiento: body.fecha_vencimiento ? new Date(body.fecha_vencimiento) : null,
        importancia: body.importancia ?? null,
        estimado_minutos: body.estimado_minutos ?? 0,
        finalizada: body.finalizada ?? false,
        archivada: body.archivada ?? false,
      },
      select: tareaSelect,
    });

    res.status(201).json(tarea);
  } catch (err) {
    next(err);
  }
}

export async function updateTarea(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.tareas.findUnique({ where: { id } });
    if (!existing) throw new AppError('Tarea no encontrada', 404);

    const body = updateTareaSchema.parse(req.body);
    const updateData: Record<string, unknown> = {};

    if (body.titulo !== undefined) updateData.titulo = body.titulo;
    if (body.usuario_id !== undefined) updateData.usuario_id = body.usuario_id;
    if (body.cliente_id !== undefined) updateData.cliente_id = body.cliente_id;
    if (body.asunto_id !== undefined) updateData.asunto_id = body.asunto_id;
    if (body.detalles !== undefined) updateData.detalles = body.detalles;
    if (body.fecha_inicio !== undefined) updateData.fecha_inicio = body.fecha_inicio ? new Date(body.fecha_inicio) : null;
    if (body.fecha_vencimiento !== undefined) updateData.fecha_vencimiento = body.fecha_vencimiento ? new Date(body.fecha_vencimiento) : null;
    if (body.importancia !== undefined) updateData.importancia = body.importancia ?? null;
    if (body.estimado_minutos !== undefined) updateData.estimado_minutos = body.estimado_minutos;
    if (body.finalizada !== undefined) updateData.finalizada = body.finalizada;
    if (body.archivada !== undefined) updateData.archivada = body.archivada;

    const tarea = await prisma.tareas.update({
      where: { id },
      data: updateData,
      select: tareaSelect,
    });

    res.json(tarea);
  } catch (err) {
    next(err);
  }
}

export async function deleteTarea(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.tareas.findUnique({ where: { id } });
    if (!existing) throw new AppError('Tarea no encontrada', 404);

    await prisma.tareas.delete({ where: { id } });
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}
