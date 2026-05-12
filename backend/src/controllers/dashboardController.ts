import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

function getPeriodDates(periodo: string): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  if (periodo === 'ultima_semana') {
    start.setDate(start.getDate() - 6);
  } else if (periodo === 'ultimos_3_meses') {
    start.setMonth(start.getMonth() - 3);
  } else {
    // ultimo_mes (default)
    start.setMonth(start.getMonth() - 1);
  }
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function countWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { periodo = 'ultimo_mes' } = req.query as Record<string, string>;
    const userId = req.user!.id;

    const { start, end } = getPeriodDates(periodo);

    // Tareas counts (for current user, not archived)
    const [tareasActivas, tareasFinalizadas] = await Promise.all([
      prisma.tareas.count({
        where: { usuario_id: userId, finalizada: false, archivada: false },
      }),
      prisma.tareas.count({
        where: { usuario_id: userId, finalizada: true, archivada: false },
      }),
    ]);

    const totalTareas = tareasActivas + tareasFinalizadas;

    // Tiempos for period (for current user)
    const tiemposDelPeriodo = await prisma.tiempos.findMany({
      where: {
        usuario_id: userId,
        fecha: { gte: start, lte: end },
      },
      select: {
        duracion_horas: true,
        facturable: true,
        fecha: true,
        cliente: { select: { razon_social: true } },
      },
    });

    const horasEjecutadas = tiemposDelPeriodo.reduce((sum, t) => sum + t.duracion_horas, 0);

    // Estimado from tareas activas
    const tareasConEstimado = await prisma.tareas.findMany({
      where: { usuario_id: userId, finalizada: false, archivada: false },
      select: { estimado_minutos: true },
    });
    const horasEstimadas = tareasConEstimado.reduce((sum, t) => sum + t.estimado_minutos, 0);

    // Capacity: working days * 8h * 60min
    const workingDays = countWorkingDays(start, end);
    const capacidadMinutos = workingDays * 8 * 60;

    // Top 5 clientes by minutes
    const clienteMap = new Map<string, number>();
    for (const t of tiemposDelPeriodo) {
      const nombre = t.cliente?.razon_social ?? 'Sin cliente';
      clienteMap.set(nombre, (clienteMap.get(nombre) ?? 0) + t.duracion_horas);
    }
    const topClientes = Array.from(clienteMap.entries())
      .map(([nombre, minutos]) => ({ nombre, minutos }))
      .sort((a, b) => b.minutos - a.minutos)
      .slice(0, 5);

    // Horas por día — last 7 or 30 days depending on period
    const daysBack = periodo === 'ultima_semana' ? 7 : periodo === 'ultimos_3_meses' ? 90 : 30;
    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - (daysBack - 1));
    chartStart.setHours(0, 0, 0, 0);

    const tiemposChart = await prisma.tiempos.findMany({
      where: {
        usuario_id: userId,
        fecha: { gte: chartStart, lte: end },
      },
      select: { duracion_horas: true, facturable: true, fecha: true },
    });

    // Build day buckets
    const dayMap = new Map<string, { facturables: number; noFacturables: number }>();
    const cur = new Date(chartStart);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      dayMap.set(key, { facturables: 0, noFacturables: 0 });
      cur.setDate(cur.getDate() + 1);
    }

    for (const t of tiemposChart) {
      const key = new Date(t.fecha).toISOString().slice(0, 10);
      const bucket = dayMap.get(key);
      if (bucket) {
        if (t.facturable) bucket.facturables += t.duracion_horas;
        else bucket.noFacturables += t.duracion_horas;
      }
    }

    const horasPorDia = Array.from(dayMap.entries()).map(([fecha, vals]) => ({
      fecha,
      facturables: vals.facturables,
      noFacturables: vals.noFacturables,
    }));

    res.json({
      tareasActivas,
      tareasFinalizadas,
      totalTareas,
      horasEjecutadas,
      horasEstimadas,
      capacidadMinutos,
      topClientes,
      horasPorDia,
    });
  } catch (err) {
    next(err);
  }
}
