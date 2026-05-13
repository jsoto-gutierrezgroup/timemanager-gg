import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const tarifaSchema = z.object({
  usuario_id: z.number().optional(),
  categoria_id: z.number().optional(),
  cliente_id: z.number().optional(),
  valor: z.number().positive('Valor debe ser positivo'),
  moneda: z.enum(['COP', 'USD', 'EUR']),
});

export async function getTarifas(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { usuario_id, categoria_id, cliente_id, moneda } = req.query;
    const where: any = {};
    if (usuario_id) where.usuario_id = parseInt(usuario_id as string);
    if (categoria_id) where.categoria_id = parseInt(categoria_id as string);
    if (cliente_id) where.cliente_id = parseInt(cliente_id as string);
    if (moneda) where.moneda = moneda;

    const tarifas = await prisma.tarifas_horarias.findMany({
      where,
      include: { usuario: { select: { nombre: true } }, categoria: { select: { nombre: true } }, cliente: { select: { razon_social: true } } },
      orderBy: { id: 'desc' },
    });
    res.json(tarifas);
  } catch (err) { next(err); }
}

export async function getTarifa(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const tarifa = await prisma.tarifas_horarias.findUnique({
      where: { id },
      include: { usuario: true, categoria: true, cliente: true },
    });
    if (!tarifa) throw new AppError('Tarifa no encontrada', 404);
    res.json(tarifa);
  } catch (err) { next(err); }
}

export async function createTarifa(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = tarifaSchema.parse(req.body);
    const tarifa = await prisma.tarifas_horarias.create({
      data: body,
      include: { usuario: { select: { nombre: true } }, categoria: { select: { nombre: true } }, cliente: { select: { razon_social: true } } },
    });
    res.status(201).json(tarifa);
  } catch (err) { next(err); }
}

export async function updateTarifa(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const body = tarifaSchema.partial().parse(req.body);
    const tarifa = await prisma.tarifas_horarias.update({
      where: { id },
      data: body,
      include: { usuario: { select: { nombre: true } }, categoria: { select: { nombre: true } }, cliente: { select: { razon_social: true } } },
    });
    res.json(tarifa);
  } catch (err) { next(err); }
}

export async function deleteTarifa(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.tarifas_horarias.delete({ where: { id } });
    res.json({ message: 'Tarifa eliminada' });
  } catch (err) { next(err); }
}
