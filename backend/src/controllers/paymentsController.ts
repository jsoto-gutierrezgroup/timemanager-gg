import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, Moneda, EstadoPago, EstadoTiempo } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const pagoSelect = {
  id: true,
  cliente_id: true,
  cliente: { select: { id: true, razon_social: true } },
  documento_id: true,
  documento: { select: { id: true, tipo_documento: true } },
  monto: true,
  moneda: true,
  fecha_pago: true,
  estado: true,
  created_at: true,
};

export async function getPayments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      cliente_id,
      documento_id,
      estado,
      fecha_inicio,
      fecha_fin,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (cliente_id) where.cliente_id = parseInt(cliente_id, 10);
    if (documento_id) where.documento_id = parseInt(documento_id, 10);
    if (estado) where.estado = estado as EstadoPago;
    if (fecha_inicio || fecha_fin) {
      where.fecha_pago = {};
      if (fecha_inicio) (where.fecha_pago as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (where.fecha_pago as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const [total, data] = await Promise.all([
      prisma.pagos.count({ where }),
      prisma.pagos.findMany({
        where,
        select: pagoSelect,
        skip,
        take: limitNum,
        orderBy: { fecha_pago: 'desc' },
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

export async function getPaymentById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const pago = await prisma.pagos.findUnique({ where: { id }, select: pagoSelect });
    if (!pago) throw new AppError('Pago no encontrado', 404);
    res.json(pago);
  } catch (err) {
    next(err);
  }
}

const createPagoSchema = z.object({
  cliente_id: z.number().int().positive(),
  documento_id: z.number().int().positive().optional().nullable(),
  monto: z.number().positive(),
  moneda: z.nativeEnum(Moneda),
  fecha_pago: z.string(),
  estado: z.nativeEnum(EstadoPago).optional(),
});

export async function createPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createPagoSchema.parse(req.body);
    const pago = await prisma.pagos.create({
      data: {
        cliente_id: body.cliente_id,
        documento_id: body.documento_id ?? null,
        monto: body.monto,
        moneda: body.moneda,
        fecha_pago: new Date(body.fecha_pago),
        estado: body.estado ?? EstadoPago.Pendiente,
      },
      select: pagoSelect,
    });
    res.status(201).json(pago);
  } catch (err) {
    next(err);
  }
}

export async function updatePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);

    const existing = await prisma.pagos.findUnique({ where: { id } });
    if (!existing) throw new AppError('Pago no encontrado', 404);

    const body = createPagoSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.cliente_id !== undefined) updateData.cliente_id = body.cliente_id;
    if (body.documento_id !== undefined) updateData.documento_id = body.documento_id;
    if (body.monto !== undefined) updateData.monto = body.monto;
    if (body.moneda !== undefined) updateData.moneda = body.moneda;
    if (body.fecha_pago !== undefined) updateData.fecha_pago = new Date(body.fecha_pago);
    if (body.estado !== undefined) updateData.estado = body.estado;

    const pago = await prisma.pagos.update({ where: { id }, data: updateData, select: pagoSelect });

    // If applying payment and document is linked → mark tiempos as FacturadoPagado
    if (body.estado === EstadoPago.Aplicado && pago.documento_id) {
      const doc = await prisma.documentos_facturacion.findUnique({
        where: { id: pago.documento_id },
        select: { asunto_id: true },
      });
      if (doc?.asunto_id) {
        await prisma.tiempos.updateMany({
          where: { asunto_id: doc.asunto_id, estado: EstadoTiempo.Facturado },
          data: { estado: EstadoTiempo.FacturadoPagado },
        });
      }
    }

    res.json(pago);
  } catch (err) {
    next(err);
  }
}

export async function deletePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const existing = await prisma.pagos.findUnique({ where: { id } });
    if (!existing) throw new AppError('Pago no encontrado', 404);
    await prisma.pagos.delete({ where: { id } });
    res.json({ message: 'Pago eliminado' });
  } catch (err) {
    next(err);
  }
}
