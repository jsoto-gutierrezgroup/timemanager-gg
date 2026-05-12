import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, EstadoAsunto, TipoFacturacion, Moneda } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const asuntoSelect = {
  id: true,
  codigo: true,
  cliente_id: true,
  nombre: true,
  area_practica_id: true,
  tipo_facturacion: true,
  moneda: true,
  monto_fijo: true,
  grupo_facturacion_id: true,
  estado: true,
  created_at: true,
  updated_at: true,
  cliente: { select: { id: true, codigo: true, razon_social: true } },
  area_practica: { select: { id: true, nombre: true } },
  grupo_facturacion: { select: { id: true, nombre: true } },
};

const createAsuntoSchema = z.object({
  cliente_id: z.number().int().positive('Cliente requerido'),
  nombre: z.string().min(1, 'Nombre requerido'),
  area_practica_id: z.number().int().positive().optional().nullable(),
  tipo_facturacion: z.nativeEnum(TipoFacturacion),
  moneda: z.nativeEnum(Moneda).optional(),
  monto_fijo: z.number().positive().optional().nullable(),
  grupo_facturacion_id: z.number().int().positive().optional().nullable(),
  estado: z.nativeEnum(EstadoAsunto).optional(),
});

const updateAsuntoSchema = createAsuntoSchema.partial();

async function generateCodigo(clienteId: number): Promise<string> {
  const cliente = await prisma.clientes.findUnique({
    where: { id: clienteId },
    select: { codigo: true },
  });
  if (!cliente) throw new AppError('Cliente no encontrado', 404);

  // Find max sequence for this client
  const asuntosDelCliente = await prisma.asuntos.findMany({
    where: { cliente_id: clienteId },
    select: { codigo: true },
  });

  let maxSeq = 0;
  for (const a of asuntosDelCliente) {
    // format is {cliente_codigo}-{4-digit-seq}
    const parts = a.codigo.split('-');
    if (parts.length >= 2) {
      const seq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${cliente.codigo}-${nextSeq}`;
}

export async function getAsuntos(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      cliente_id,
      estado,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (cliente_id) where.cliente_id = parseInt(cliente_id, 10);
    if (estado) where.estado = estado as EstadoAsunto;

    const [total, data] = await Promise.all([
      prisma.asuntos.count({ where }),
      prisma.asuntos.findMany({
        where,
        select: asuntoSelect,
        skip,
        take: limitNum,
        orderBy: { nombre: 'asc' },
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

export async function getAsuntoById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const asunto = await prisma.asuntos.findUnique({ where: { id }, select: asuntoSelect });
    if (!asunto) throw new AppError('Asunto no encontrado', 404);

    res.json(asunto);
  } catch (err) {
    next(err);
  }
}

export async function createAsunto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createAsuntoSchema.parse(req.body);
    const codigo = await generateCodigo(body.cliente_id);

    const asunto = await prisma.asuntos.create({
      data: {
        codigo,
        cliente_id: body.cliente_id,
        nombre: body.nombre,
        area_practica_id: body.area_practica_id ?? null,
        tipo_facturacion: body.tipo_facturacion,
        moneda: body.moneda ?? Moneda.COP,
        monto_fijo: body.monto_fijo ?? null,
        grupo_facturacion_id: body.grupo_facturacion_id ?? null,
        estado: body.estado ?? EstadoAsunto.Activo,
      },
      select: asuntoSelect,
    });

    res.status(201).json(asunto);
  } catch (err) {
    next(err);
  }
}

export async function updateAsunto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.asuntos.findUnique({ where: { id } });
    if (!existing) throw new AppError('Asunto no encontrado', 404);

    const body = updateAsuntoSchema.parse(req.body);
    const updateData: Record<string, unknown> = { ...body };
    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) delete updateData[k];
    });

    const asunto = await prisma.asuntos.update({
      where: { id },
      data: updateData,
      select: asuntoSelect,
    });

    res.json(asunto);
  } catch (err) {
    next(err);
  }
}
