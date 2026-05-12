import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, EstadoJob } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const jobSelect = {
  id: true,
  nombre: true,
  responsable_id: true,
  responsable: { select: { id: true, nombre: true } },
  cliente_id: true,
  cliente: { select: { id: true, razon_social: true } },
  tipo: true,
  estado: true,
  created_at: true,
};

export async function getJobs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      responsable_id,
      cliente_id,
      tipo,
      estado,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (responsable_id) where.responsable_id = parseInt(responsable_id, 10);
    if (cliente_id) where.cliente_id = parseInt(cliente_id, 10);
    if (tipo) where.tipo = { contains: tipo, mode: 'insensitive' };
    if (estado) where.estado = estado as EstadoJob;

    const [total, data] = await Promise.all([
      prisma.jobs.count({ where }),
      prisma.jobs.findMany({
        where,
        select: jobSelect,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.json({
      data,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getJobById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const job = await prisma.jobs.findUnique({ where: { id }, select: jobSelect });
    if (!job) throw new AppError('Job no encontrado', 404);
    res.json(job);
  } catch (err) {
    next(err);
  }
}

const createJobSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  responsable_id: z.number().int().positive().optional().nullable(),
  cliente_id: z.number().int().positive().optional().nullable(),
  tipo: z.string().optional().nullable(),
  estado: z.nativeEnum(EstadoJob).optional(),
});

export async function createJob(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createJobSchema.parse(req.body);
    const job = await prisma.jobs.create({
      data: {
        nombre: body.nombre,
        responsable_id: body.responsable_id ?? null,
        cliente_id: body.cliente_id ?? null,
        tipo: body.tipo ?? null,
        estado: body.estado ?? EstadoJob.Activo,
      },
      select: jobSelect,
    });
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
}

export async function updateJob(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.jobs.findUnique({ where: { id } });
    if (!existing) throw new AppError('Job no encontrado', 404);

    const body = createJobSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.responsable_id !== undefined) updateData.responsable_id = body.responsable_id;
    if (body.cliente_id !== undefined) updateData.cliente_id = body.cliente_id;
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.estado !== undefined) updateData.estado = body.estado;

    const job = await prisma.jobs.update({ where: { id }, data: updateData, select: jobSelect });
    res.json(job);
  } catch (err) {
    next(err);
  }
}

export async function deleteJob(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const existing = await prisma.jobs.findUnique({ where: { id } });
    if (!existing) throw new AppError('Job no encontrado', 404);
    await prisma.jobs.delete({ where: { id } });
    res.json({ message: 'Job eliminado' });
  } catch (err) {
    next(err);
  }
}
