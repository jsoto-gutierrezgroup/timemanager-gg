import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, TipoDocumentoFacturacion, Moneda, EstadoDocumento } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// ─── Documentos ───────────────────────────────────────────────────────────────

const documentoSelect = {
  id: true,
  tipo_documento: true,
  receptor_id: true,
  receptor: { select: { id: true, razon_social: true } },
  emisor_id: true,
  emisor: { select: { id: true, nombre: true } },
  asunto_id: true,
  asunto: { select: { id: true, codigo: true, nombre: true } },
  rango_fecha_inicio: true,
  rango_fecha_fin: true,
  valor: true,
  moneda: true,
  impuesto_id: true,
  impuesto: { select: { id: true, nombre: true, porcentaje: true } },
  gravamen_id: true,
  gravamen: { select: { id: true, nombre: true, valor: true } },
  tasa_cambio_id: true,
  tasa_cambio: { select: { id: true, moneda_origen: true, moneda_destino: true, tasa: true, fecha_vigencia: true } },
  estado: true,
  created_at: true,
};

export async function getDocuments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      receptor_id,
      emisor_id,
      asunto_id,
      tipo_documento,
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
    if (receptor_id) where.receptor_id = parseInt(receptor_id, 10);
    if (emisor_id) where.emisor_id = parseInt(emisor_id, 10);
    if (asunto_id) where.asunto_id = parseInt(asunto_id, 10);
    if (tipo_documento) where.tipo_documento = tipo_documento as TipoDocumentoFacturacion;
    if (estado) where.estado = estado as EstadoDocumento;
    if (fecha_inicio || fecha_fin) {
      where.created_at = {};
      if (fecha_inicio) (where.created_at as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (where.created_at as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const [total, data] = await Promise.all([
      prisma.documentos_facturacion.count({ where }),
      prisma.documentos_facturacion.findMany({
        where,
        select: documentoSelect,
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

export async function getDocumentById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const doc = await prisma.documentos_facturacion.findUnique({ where: { id }, select: documentoSelect });
    if (!doc) throw new AppError('Documento no encontrado', 404);
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

const createDocumentoSchema = z.object({
  tipo_documento: z.nativeEnum(TipoDocumentoFacturacion),
  receptor_id: z.number().int().positive(),
  emisor_id: z.number().int().positive().optional().nullable(),
  asunto_id: z.number().int().positive().optional().nullable(),
  rango_fecha_inicio: z.string(),
  rango_fecha_fin: z.string(),
  valor: z.number(),
  moneda: z.nativeEnum(Moneda),
  impuesto_id: z.number().int().positive().optional().nullable(),
  gravamen_id: z.number().int().positive().optional().nullable(),
  tasa_cambio_id: z.number().int().positive().optional().nullable(),
  estado: z.nativeEnum(EstadoDocumento).optional(),
});

export async function createDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createDocumentoSchema.parse(req.body);
    const doc = await prisma.documentos_facturacion.create({
      data: {
        tipo_documento: body.tipo_documento,
        receptor_id: body.receptor_id,
        emisor_id: body.emisor_id ?? null,
        asunto_id: body.asunto_id ?? null,
        rango_fecha_inicio: new Date(body.rango_fecha_inicio),
        rango_fecha_fin: new Date(body.rango_fecha_fin),
        valor: body.valor,
        moneda: body.moneda,
        impuesto_id: body.impuesto_id ?? null,
        gravamen_id: body.gravamen_id ?? null,
        tasa_cambio_id: body.tasa_cambio_id ?? null,
        estado: body.estado ?? EstadoDocumento.Borrador,
      },
      select: documentoSelect,
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

export async function updateDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const existing = await prisma.documentos_facturacion.findUnique({ where: { id } });
    if (!existing) throw new AppError('Documento no encontrado', 404);

    const body = createDocumentoSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.tipo_documento !== undefined) updateData.tipo_documento = body.tipo_documento;
    if (body.receptor_id !== undefined) updateData.receptor_id = body.receptor_id;
    if (body.emisor_id !== undefined) updateData.emisor_id = body.emisor_id;
    if (body.asunto_id !== undefined) updateData.asunto_id = body.asunto_id;
    if (body.rango_fecha_inicio !== undefined) updateData.rango_fecha_inicio = new Date(body.rango_fecha_inicio);
    if (body.rango_fecha_fin !== undefined) updateData.rango_fecha_fin = new Date(body.rango_fecha_fin);
    if (body.valor !== undefined) updateData.valor = body.valor;
    if (body.moneda !== undefined) updateData.moneda = body.moneda;
    if (body.impuesto_id !== undefined) updateData.impuesto_id = body.impuesto_id;
    if (body.gravamen_id !== undefined) updateData.gravamen_id = body.gravamen_id;
    if (body.tasa_cambio_id !== undefined) updateData.tasa_cambio_id = body.tasa_cambio_id;
    if (body.estado !== undefined) updateData.estado = body.estado;

    const doc = await prisma.documentos_facturacion.update({ where: { id }, data: updateData, select: documentoSelect });
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

// ─── Impuestos ────────────────────────────────────────────────────────────────

export async function getImpuestos(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await prisma.impuestos.findMany({ orderBy: { nombre: 'asc' } });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

const impuestoSchema = z.object({
  nombre: z.string().min(1),
  porcentaje: z.number(),
});

export async function createImpuesto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = impuestoSchema.parse(req.body);
    const imp = await prisma.impuestos.create({ data: body });
    res.status(201).json(imp);
  } catch (err) {
    next(err);
  }
}

export async function updateImpuesto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const body = impuestoSchema.partial().parse(req.body);
    const imp = await prisma.impuestos.update({ where: { id }, data: body });
    res.json(imp);
  } catch (err) {
    next(err);
  }
}

export async function deleteImpuesto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    await prisma.impuestos.delete({ where: { id } });
    res.json({ message: 'Impuesto eliminado' });
  } catch (err) {
    next(err);
  }
}

// ─── Gravámenes ──────────────────────────────────────────────────────────────

export async function getGravamenes(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await prisma.gravamenes.findMany({ orderBy: { nombre: 'asc' } });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

const gravamenSchema = z.object({
  nombre: z.string().min(1),
  valor: z.number(),
});

export async function createGravamen(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = gravamenSchema.parse(req.body);
    const grav = await prisma.gravamenes.create({ data: body });
    res.status(201).json(grav);
  } catch (err) {
    next(err);
  }
}

export async function updateGravamen(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const body = gravamenSchema.partial().parse(req.body);
    const grav = await prisma.gravamenes.update({ where: { id }, data: body });
    res.json(grav);
  } catch (err) {
    next(err);
  }
}

export async function deleteGravamen(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    await prisma.gravamenes.delete({ where: { id } });
    res.json({ message: 'Gravamen eliminado' });
  } catch (err) {
    next(err);
  }
}

// ─── Tasas de cambio ─────────────────────────────────────────────────────────

export async function getTasasCambio(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await prisma.tasas_cambio.findMany({ orderBy: { fecha_vigencia: 'desc' } });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

const tasaCambioSchema = z.object({
  moneda_origen: z.nativeEnum(Moneda),
  moneda_destino: z.nativeEnum(Moneda),
  tasa: z.number(),
  fecha_vigencia: z.string(),
});

export async function createTasaCambio(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = tasaCambioSchema.parse(req.body);
    const tasa = await prisma.tasas_cambio.create({
      data: { ...body, fecha_vigencia: new Date(body.fecha_vigencia) },
    });
    res.status(201).json(tasa);
  } catch (err) {
    next(err);
  }
}

export async function updateTasaCambio(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    const body = tasaCambioSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = { ...body };
    if (body.fecha_vigencia) updateData.fecha_vigencia = new Date(body.fecha_vigencia);
    const tasa = await prisma.tasas_cambio.update({ where: { id }, data: updateData });
    res.json(tasa);
  } catch (err) {
    next(err);
  }
}

export async function deleteTasaCambio(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('ID inválido', 400);
    await prisma.tasas_cambio.delete({ where: { id } });
    res.json({ message: 'Tasa de cambio eliminada' });
  } catch (err) {
    next(err);
  }
}
