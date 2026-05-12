import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, TipoAusencia } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// ─── Roles ────────────────────────────────────────────────────────────────────

const roleSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  permisos: z.record(z.unknown()).optional().default({}),
});

export async function getRoles(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const roles = await prisma.roles.findMany({ orderBy: { nombre: 'asc' } });
    res.json(roles);
  } catch (err) { next(err); }
}

export async function createRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = roleSchema.parse(req.body);
    const existing = await prisma.roles.findUnique({ where: { nombre: body.nombre } });
    if (existing) throw new AppError('Ya existe un rol con ese nombre', 400);
    const role = await prisma.roles.create({ data: { nombre: body.nombre, permisos: body.permisos } });
    res.status(201).json(role);
  } catch (err) { next(err); }
}

export async function updateRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const body = roleSchema.partial().parse(req.body);
    const role = await prisma.roles.update({ where: { id }, data: body });
    res.json(role);
  } catch (err) { next(err); }
}

export async function deleteRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    await prisma.roles.delete({ where: { id } });
    res.json({ message: 'Rol eliminado' });
  } catch (err) { next(err); }
}

// ─── Categorías ───────────────────────────────────────────────────────────────

const categoriaSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
});

export async function getCategories(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const cats = await prisma.categorias_usuario.findMany({ orderBy: { nombre: 'asc' } });
    res.json(cats);
  } catch (err) { next(err); }
}

export async function createCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = categoriaSchema.parse(req.body);
    const existing = await prisma.categorias_usuario.findUnique({ where: { nombre: body.nombre } });
    if (existing) throw new AppError('Ya existe una categoría con ese nombre', 400);
    const cat = await prisma.categorias_usuario.create({ data: body });
    res.status(201).json(cat);
  } catch (err) { next(err); }
}

export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const body = categoriaSchema.parse(req.body);
    const cat = await prisma.categorias_usuario.update({ where: { id }, data: body });
    res.json(cat);
  } catch (err) { next(err); }
}

export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    await prisma.categorias_usuario.delete({ where: { id } });
    res.json({ message: 'Categoría eliminada' });
  } catch (err) { next(err); }
}

// ─── Áreas de práctica ────────────────────────────────────────────────────────

const areaSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
});

export async function getAreas(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const areas = await prisma.areas_practica.findMany({ orderBy: { nombre: 'asc' } });
    res.json(areas);
  } catch (err) { next(err); }
}

export async function createArea(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = areaSchema.parse(req.body);
    const existing = await prisma.areas_practica.findUnique({ where: { nombre: body.nombre } });
    if (existing) throw new AppError('Ya existe un área con ese nombre', 400);
    const area = await prisma.areas_practica.create({ data: body });
    res.status(201).json(area);
  } catch (err) { next(err); }
}

export async function updateArea(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const body = areaSchema.parse(req.body);
    const area = await prisma.areas_practica.update({ where: { id }, data: body });
    res.json(area);
  } catch (err) { next(err); }
}

export async function deleteArea(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    await prisma.areas_practica.delete({ where: { id } });
    res.json({ message: 'Área eliminada' });
  } catch (err) { next(err); }
}

// ─── Ausencias ────────────────────────────────────────────────────────────────

const ausenciaSchema = z.object({
  usuario_id: z.number().int().positive('Usuario requerido'),
  fecha_inicio: z.string().min(1, 'Fecha inicio requerida'),
  fecha_fin: z.string().min(1, 'Fecha fin requerida'),
  tipo: z.nativeEnum(TipoAusencia),
  descripcion: z.string().optional().nullable(),
});

const ausenciaSelectFields = {
  id: true,
  usuario_id: true,
  fecha_inicio: true,
  fecha_fin: true,
  tipo: true,
  descripcion: true,
  usuario: { select: { id: true, nombre: true, email: true } },
};

export async function getAusencias(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { usuario_id, page = '1', limit = '10' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (usuario_id) where.usuario_id = parseInt(usuario_id, 10);

    const [total, ausencias] = await Promise.all([
      prisma.ausencias.count({ where }),
      prisma.ausencias.findMany({
        where,
        select: ausenciaSelectFields,
        skip,
        take: limitNum,
        orderBy: { fecha_inicio: 'desc' },
      }),
    ]);

    res.json({
      data: ausencias,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) { next(err); }
}

export async function createAusencia(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = ausenciaSchema.parse(req.body);
    const ausencia = await prisma.ausencias.create({
      data: {
        usuario_id: body.usuario_id,
        fecha_inicio: new Date(body.fecha_inicio),
        fecha_fin: new Date(body.fecha_fin),
        tipo: body.tipo,
        descripcion: body.descripcion ?? null,
      },
      select: ausenciaSelectFields,
    });
    res.status(201).json(ausencia);
  } catch (err) { next(err); }
}

export async function updateAusencia(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const body = ausenciaSchema.partial().parse(req.body);

    const updateData: Record<string, unknown> = {};
    if (body.usuario_id !== undefined) updateData.usuario_id = body.usuario_id;
    if (body.fecha_inicio !== undefined) updateData.fecha_inicio = new Date(body.fecha_inicio);
    if (body.fecha_fin !== undefined) updateData.fecha_fin = new Date(body.fecha_fin);
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;

    const ausencia = await prisma.ausencias.update({
      where: { id },
      data: updateData,
      select: ausenciaSelectFields,
    });
    res.json(ausencia);
  } catch (err) { next(err); }
}

export async function deleteAusencia(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    await prisma.ausencias.delete({ where: { id } });
    res.json({ message: 'Ausencia eliminada' });
  } catch (err) { next(err); }
}
