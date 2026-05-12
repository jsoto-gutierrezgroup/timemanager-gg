import { Response, NextFunction } from 'express';
import { PrismaClient, EstadoTiempo } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getBillingDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      primer_aprobador_id,
      segundo_aprobador_id,
      cliente_id,
      asunto_id,
      fecha_inicio,
      fecha_fin,
      periodo,
    } = req.query as Record<string, string>;

    // ── Aprobación ──────────────────────────────────────────────────────────

    const aprobacionWhere: Record<string, unknown> = {
      estado: { in: [EstadoTiempo.Activo, EstadoTiempo.Aprobado] },
    };

    // Filter by approver: union of primer and segundo aprobador IDs
    const aprobadorIds: number[] = [];
    if (primer_aprobador_id) aprobadorIds.push(parseInt(primer_aprobador_id, 10));
    if (segundo_aprobador_id) aprobadorIds.push(parseInt(segundo_aprobador_id, 10));
    if (aprobadorIds.length > 0) {
      aprobacionWhere.usuario_id = { in: aprobadorIds };
    }

    if (cliente_id) aprobacionWhere.cliente_id = parseInt(cliente_id, 10);
    if (asunto_id) aprobacionWhere.asunto_id = parseInt(asunto_id, 10);
    if (fecha_inicio || fecha_fin) {
      aprobacionWhere.fecha = {};
      if (fecha_inicio) (aprobacionWhere.fecha as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (aprobacionWhere.fecha as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const aprobacionTiempos = await prisma.tiempos.findMany({
      where: aprobacionWhere,
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    // Group by usuario
    const usuarioMap = new Map<
      number,
      {
        usuario_id: number;
        nombre: string;
        total_tiempos: number;
        horas_facturables: number;
        valor_total: number;
        estados: { Activo: number; Aprobado: number };
      }
    >();

    for (const t of aprobacionTiempos) {
      const uid = t.usuario_id;
      if (!usuarioMap.has(uid)) {
        usuarioMap.set(uid, {
          usuario_id: uid,
          nombre: t.usuario?.nombre ?? `Usuario ${uid}`,
          total_tiempos: 0,
          horas_facturables: 0,
          valor_total: 0,
          estados: { Activo: 0, Aprobado: 0 },
        });
      }
      const entry = usuarioMap.get(uid)!;
      entry.total_tiempos += 1;
      if (t.facturable) {
        entry.horas_facturables += t.duracion_horas;
      }
      if (t.estado === EstadoTiempo.Activo) entry.estados.Activo += 1;
      if (t.estado === EstadoTiempo.Aprobado) entry.estados.Aprobado += 1;
    }

    const resumen = Array.from(usuarioMap.values());
    const total_pendientes = aprobacionTiempos.filter((t) => t.estado === EstadoTiempo.Activo).length;
    const total_aprobados = aprobacionTiempos.filter((t) => t.estado === EstadoTiempo.Aprobado).length;

    // ── Podio ────────────────────────────────────────────────────────────────

    const podioWhere: Record<string, unknown> = {
      estado: { in: [EstadoTiempo.Facturado, EstadoTiempo.FacturadoPagado] },
      facturable: true,
    };

    if (periodo) {
      const now = new Date();
      let periodoStart: Date;
      if (periodo === 'mes') {
        periodoStart = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (periodo === '3meses') {
        periodoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      } else if (periodo === 'anio') {
        periodoStart = new Date(now.getFullYear(), 0, 1);
      } else {
        periodoStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      podioWhere.fecha = { gte: periodoStart };
    }

    const podioTiempos = await prisma.tiempos.findMany({
      where: podioWhere,
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    const podioMap = new Map<number, { usuario_id: number; nombre: string; horas_facturadas: number; valor: number }>();

    for (const t of podioTiempos) {
      const uid = t.usuario_id;
      if (!podioMap.has(uid)) {
        podioMap.set(uid, {
          usuario_id: uid,
          nombre: t.usuario?.nombre ?? `Usuario ${uid}`,
          horas_facturadas: 0,
          valor: 0,
        });
      }
      const entry = podioMap.get(uid)!;
      entry.horas_facturadas += t.duracion_horas;
    }

    const rankings = Array.from(podioMap.values())
      .sort((a, b) => b.horas_facturadas - a.horas_facturadas)
      .map((entry, idx) => ({ posicion: idx + 1, ...entry }));

    res.json({
      aprobacion: {
        resumen,
        total_pendientes,
        total_aprobados,
        valor_pendiente: 0, // Value computation would require tarifa_horaria lookup
      },
      podio: {
        rankings,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Approval Table ───────────────────────────────────────────────────────────

export async function getApprovalTable(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      primer_aprobador_id,
      segundo_aprobador_id,
      cliente_id,
      asunto_id,
      fecha_inicio,
      fecha_fin,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const where: Record<string, unknown> = {
      estado: { in: [EstadoTiempo.Activo, EstadoTiempo.Aprobado] },
    };

    const aprobadorIds: number[] = [];
    if (primer_aprobador_id) aprobadorIds.push(parseInt(primer_aprobador_id, 10));
    if (segundo_aprobador_id) aprobadorIds.push(parseInt(segundo_aprobador_id, 10));
    if (aprobadorIds.length > 0) where.usuario_id = { in: aprobadorIds };
    if (cliente_id) where.cliente_id = parseInt(cliente_id, 10);
    if (asunto_id) where.asunto_id = parseInt(asunto_id, 10);
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) (where.fecha as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (where.fecha as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const tiempos = await prisma.tiempos.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    // Group by usuario and paginate
    const map = new Map<
      number,
      {
        usuario_id: number;
        nombre: string;
        total_tiempos: number;
        horas_facturables: number;
        valor_total: number;
        count_aprobados: number;
      }
    >();

    for (const t of tiempos) {
      const uid = t.usuario_id;
      if (!map.has(uid)) {
        map.set(uid, { usuario_id: uid, nombre: t.usuario?.nombre ?? '', total_tiempos: 0, horas_facturables: 0, valor_total: 0, count_aprobados: 0 });
      }
      const e = map.get(uid)!;
      e.total_tiempos += 1;
      if (t.facturable) e.horas_facturables += t.duracion_horas;
      if (t.estado === EstadoTiempo.Aprobado) e.count_aprobados += 1;
    }

    const all = Array.from(map.values());
    const total = all.length;
    const data = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);

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
