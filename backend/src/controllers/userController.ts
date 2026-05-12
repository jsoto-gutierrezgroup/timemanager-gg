import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { PrismaClient, EstadoUsuario } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const userSelect = {
  id: true,
  nombre: true,
  email: true,
  categoria_id: true,
  rol_id: true,
  area_practica_id: true,
  tarifa_horaria: true,
  estado: true,
  created_at: true,
  updated_at: true,
  categoria: { select: { id: true, nombre: true } },
  rol: { select: { id: true, nombre: true } },
  area_practica: { select: { id: true, nombre: true } },
};

const createUserSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  categoria_id: z.number().int().positive().optional().nullable(),
  rol_id: z.number().int().positive().optional().nullable(),
  area_practica_id: z.number().int().positive().optional().nullable(),
  tarifa_horaria: z.number().positive().optional().nullable(),
  estado: z.nativeEnum(EstadoUsuario).optional(),
});

const updateUserSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  categoria_id: z.number().int().positive().optional().nullable(),
  rol_id: z.number().int().positive().optional().nullable(),
  area_practica_id: z.number().int().positive().optional().nullable(),
  tarifa_horaria: z.number().positive().optional().nullable(),
  estado: z.nativeEnum(EstadoUsuario).optional(),
});

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      categoria_id,
      rol_id,
      area_practica_id,
      estado,
      search,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (categoria_id) where.categoria_id = parseInt(categoria_id, 10);
    if (rol_id) where.rol_id = parseInt(rol_id, 10);
    if (area_practica_id) where.area_practica_id = parseInt(area_practica_id, 10);
    if (estado) where.estado = estado as EstadoUsuario;

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.usuarios.count({ where }),
      prisma.usuarios.findMany({
        where,
        select: userSelect,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.json({
      data: users,
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

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const user = await prisma.usuarios.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createUserSchema.parse(req.body);

    const existing = await prisma.usuarios.findUnique({ where: { email: body.email } });
    if (existing) throw new AppError('El email ya está registrado', 400);

    const password_hash = await bcrypt.hash(body.password, 12);

    const user = await prisma.usuarios.create({
      data: {
        nombre: body.nombre,
        email: body.email,
        password_hash,
        categoria_id: body.categoria_id ?? null,
        rol_id: body.rol_id ?? null,
        area_practica_id: body.area_practica_id ?? null,
        tarifa_horaria: body.tarifa_horaria ?? null,
        estado: body.estado ?? EstadoUsuario.Activo,
      },
      select: userSelect,
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const body = updateUserSchema.parse(req.body);

    const existing = await prisma.usuarios.findUnique({ where: { id } });
    if (!existing) throw new AppError('Usuario no encontrado', 404);

    if (body.email && body.email !== existing.email) {
      const emailTaken = await prisma.usuarios.findUnique({ where: { email: body.email } });
      if (emailTaken) throw new AppError('El email ya está registrado', 400);
    }

    const updateData: Record<string, unknown> = {
      nombre: body.nombre,
      email: body.email,
      categoria_id: body.categoria_id,
      rol_id: body.rol_id,
      area_practica_id: body.area_practica_id,
      tarifa_horaria: body.tarifa_horaria,
      estado: body.estado,
    };

    // Remove undefined keys so Prisma doesn't nullify them
    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) delete updateData[k];
    });

    if (body.password) {
      updateData.password_hash = await bcrypt.hash(body.password, 12);
    }

    const user = await prisma.usuarios.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.usuarios.findUnique({ where: { id } });
    if (!existing) throw new AppError('Usuario no encontrado', 404);

    const user = await prisma.usuarios.update({
      where: { id },
      data: { estado: EstadoUsuario.Inactivo },
      select: userSelect,
    });

    res.json({ message: 'Usuario inactivado correctamente', user });
  } catch (err) {
    next(err);
  }
}
