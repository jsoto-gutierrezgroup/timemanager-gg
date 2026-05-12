import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, EstadoCliente, TipoDocumento } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const clienteSelect = {
  id: true,
  codigo: true,
  razon_social: true,
  nombre_comercial: true,
  tipo_documento: true,
  numero_documento: true,
  pais: true,
  ciudad: true,
  sector: true,
  tipo: true,
  responsable_id: true,
  emisor_facturacion_id: true,
  grupo_empresarial_id: true,
  estado: true,
  created_at: true,
  updated_at: true,
  responsable: { select: { id: true, nombre: true } },
  emisor_facturacion: { select: { id: true, nombre: true } },
  grupo_empresarial: { select: { id: true, nombre: true } },
};

const createClienteSchema = z.object({
  razon_social: z.string().min(1, 'Razón social requerida'),
  nombre_comercial: z.string().optional().nullable(),
  tipo_documento: z.nativeEnum(TipoDocumento).optional().nullable(),
  numero_documento: z.string().optional().nullable(),
  pais: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  sector: z.string().optional().nullable(),
  tipo: z.string().optional().nullable(),
  responsable_id: z.number().int().positive().optional().nullable(),
  emisor_facturacion_id: z.number().int().positive().optional().nullable(),
  grupo_empresarial_id: z.number().int().positive().optional().nullable(),
  estado: z.nativeEnum(EstadoCliente).optional(),
});

const updateClienteSchema = createClienteSchema.partial();

async function generateCodigo(): Promise<string> {
  const result = await prisma.clientes.aggregate({ _max: { codigo: true } });
  const maxCodigo = result._max.codigo;
  if (!maxCodigo) return '000001';
  const num = parseInt(maxCodigo, 10);
  return String(isNaN(num) ? 1 : num + 1).padStart(6, '0');
}

export async function getClientes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      search,
      estado,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado as EstadoCliente;
    if (search) {
      where.OR = [
        { razon_social: { contains: search, mode: 'insensitive' } },
        { nombre_comercial: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.clientes.count({ where }),
      prisma.clientes.findMany({
        where,
        select: clienteSelect,
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

export async function getClienteById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const cliente = await prisma.clientes.findUnique({ where: { id }, select: clienteSelect });
    if (!cliente) throw new AppError('Cliente no encontrado', 404);

    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

export async function createCliente(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createClienteSchema.parse(req.body);
    const codigo = await generateCodigo();

    const cliente = await prisma.clientes.create({
      data: {
        codigo,
        razon_social: body.razon_social,
        nombre_comercial: body.nombre_comercial ?? null,
        tipo_documento: body.tipo_documento ?? null,
        numero_documento: body.numero_documento ?? null,
        pais: body.pais ?? null,
        ciudad: body.ciudad ?? null,
        sector: body.sector ?? null,
        tipo: body.tipo ?? null,
        responsable_id: body.responsable_id ?? null,
        emisor_facturacion_id: body.emisor_facturacion_id ?? null,
        grupo_empresarial_id: body.grupo_empresarial_id ?? null,
        estado: body.estado ?? EstadoCliente.Activo,
      },
      select: clienteSelect,
    });

    res.status(201).json(cliente);
  } catch (err) {
    next(err);
  }
}

export async function updateCliente(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.clientes.findUnique({ where: { id } });
    if (!existing) throw new AppError('Cliente no encontrado', 404);

    const body = updateClienteSchema.parse(req.body);
    const updateData: Record<string, unknown> = { ...body };
    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) delete updateData[k];
    });

    const cliente = await prisma.clientes.update({
      where: { id },
      data: updateData,
      select: clienteSelect,
    });

    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

export async function deleteCliente(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.clientes.findUnique({ where: { id } });
    if (!existing) throw new AppError('Cliente no encontrado', 404);

    const cliente = await prisma.clientes.update({
      where: { id },
      data: { estado: EstadoCliente.Inactivo },
      select: clienteSelect,
    });

    res.json({ message: 'Cliente inactivado correctamente', cliente });
  } catch (err) {
    next(err);
  }
}
