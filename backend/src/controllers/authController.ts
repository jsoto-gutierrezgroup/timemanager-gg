import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.usuarios.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        nombre: true,
        email: true,
        password_hash: true,
        rol_id: true,
        estado: true,
        categoria_id: true,
        area_practica_id: true,
        tarifa_horaria: true,
        categoria: { select: { id: true, nombre: true } },
        rol: { select: { id: true, nombre: true, permisos: true } },
        area_practica: { select: { id: true, nombre: true } },
      },
    });

    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    if (user.estado === 'Inactivo') {
      throw new AppError('Usuario inactivo', 403);
    }

    const passwordValid = await bcrypt.compare(body.password, user.password_hash);
    if (!passwordValid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('JWT_SECRET no configurado', 500);

    const payload = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol_id: user.rol_id,
    };

    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    const { password_hash: _pw, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    next(err);
  }
}
