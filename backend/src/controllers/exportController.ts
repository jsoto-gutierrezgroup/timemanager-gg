import { Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaClient, EstadoTiempo } from '@prisma/client';
import { AuthRequest } from '../types';
import { minutesToHHMM, formatCurrency, formatDate } from '../utils/exportHelpers';

const prisma = new PrismaClient();

// ─── Tiempos XLS ─────────────────────────────────────────────────────────────

export async function exportTiemposXls(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      usuario_id,
      cliente_id,
      asunto_id,
      estado,
      facturable,
      fecha_inicio,
      fecha_fin,
      mostrar_todos = 'false',
    } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};

    if (mostrar_todos !== 'true' && req.user?.id) {
      where.usuario_id = req.user.id;
    } else if (usuario_id) {
      where.usuario_id = parseInt(usuario_id, 10);
    }

    if (cliente_id) where.cliente_id = parseInt(cliente_id, 10);
    if (asunto_id) where.asunto_id = parseInt(asunto_id, 10);
    if (estado) where.estado = estado as EstadoTiempo;
    if (facturable !== undefined && facturable !== '') {
      where.facturable = facturable === 'true';
    }
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) (where.fecha as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (where.fecha as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const tiempos = await prisma.tiempos.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, razon_social: true } },
        asunto: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Time Manager';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Tiempos');

    ws.columns = [
      { header: '#', key: 'num', width: 6 },
      { header: 'Usuario', key: 'usuario', width: 22 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Asunto', key: 'asunto', width: 22 },
      { header: 'Actividad', key: 'actividad', width: 40 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Duración', key: 'duracion', width: 12 },
      { header: 'Facturable', key: 'facturable', width: 12 },
      { header: 'Estado', key: 'estado', width: 16 },
    ];

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    tiempos.forEach((t, i) => {
      ws.addRow({
        num: i + 1,
        usuario: t.usuario?.nombre ?? '',
        cliente: t.cliente?.razon_social ?? '',
        asunto: t.asunto ? `${t.asunto.codigo} — ${t.asunto.nombre}` : '',
        actividad: t.actividad,
        fecha: formatDate(t.fecha),
        duracion: minutesToHHMM(t.duracion_horas),
        facturable: t.facturable ? 'Sí' : 'No',
        estado: t.estado,
      });
    });

    // Total row
    const totalMinutes = tiempos.reduce((s, t) => s + t.duracion_horas, 0);
    const totalRow = ws.addRow({
      num: '',
      usuario: '',
      cliente: '',
      asunto: '',
      actividad: 'TOTAL',
      fecha: '',
      duracion: minutesToHHMM(totalMinutes),
      facturable: '',
      estado: `${tiempos.length} registros`,
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="tiempos.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

// ─── Tiempos PDF ─────────────────────────────────────────────────────────────

export async function exportTiemposPdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      usuario_id,
      cliente_id,
      asunto_id,
      estado,
      facturable,
      fecha_inicio,
      fecha_fin,
      mostrar_todos = 'false',
    } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};

    if (mostrar_todos !== 'true' && req.user?.id) {
      where.usuario_id = req.user.id;
    } else if (usuario_id) {
      where.usuario_id = parseInt(usuario_id, 10);
    }

    if (cliente_id) where.cliente_id = parseInt(cliente_id, 10);
    if (asunto_id) where.asunto_id = parseInt(asunto_id, 10);
    if (estado) where.estado = estado as EstadoTiempo;
    if (facturable !== undefined && facturable !== '') {
      where.facturable = facturable === 'true';
    }
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) (where.fecha as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (where.fecha as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const tiempos = await prisma.tiempos.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, razon_social: true } },
        asunto: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tiempos.pdf"');

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    // ── Header ──
    doc.fontSize(16).font('Helvetica-Bold').text('Time Manager — Reporte de Tiempos', { align: 'center' });
    doc.moveDown(0.3);

    if (fecha_inicio || fecha_fin) {
      const rangeStr = `Período: ${fecha_inicio ? formatDate(fecha_inicio) : '—'} al ${fecha_fin ? formatDate(fecha_fin) : '—'}`;
      doc.fontSize(10).font('Helvetica').text(rangeStr, { align: 'center' });
    }

    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(`Generado: ${formatDate(new Date())}`, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(0.8);

    // ── Table ──
    const cols = [
      { label: 'Usuario', width: 90 },
      { label: 'Cliente', width: 120 },
      { label: 'Asunto', width: 90 },
      { label: 'Actividad', width: 200 },
      { label: 'Fecha', width: 65 },
      { label: 'Duración', width: 60 },
      { label: 'Fact.', width: 35 },
      { label: 'Estado', width: 70 },
    ];

    const tableTop = doc.y;
    const rowHeight = 18;
    let startX = 40;

    // Header row background
    doc.rect(startX, tableTop, cols.reduce((s, c) => s + c.width, 0), rowHeight)
      .fill('#0D9488');

    let cx = startX;
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    for (const col of cols) {
      doc.text(col.label, cx + 3, tableTop + 4, { width: col.width - 6, lineBreak: false });
      cx += col.width;
    }
    doc.fillColor('#000000');

    let y = tableTop + rowHeight;

    for (let i = 0; i < tiempos.length; i++) {
      const t = tiempos[i];

      // Alternate row background
      if (i % 2 === 0) {
        doc.rect(startX, y, cols.reduce((s, c) => s + c.width, 0), rowHeight).fill('#F0FDFA');
      }

      const rowData = [
        t.usuario?.nombre ?? '',
        t.cliente?.razon_social ?? '',
        t.asunto ? `${t.asunto.codigo}` : '',
        t.actividad.length > 55 ? t.actividad.slice(0, 55) + '…' : t.actividad,
        formatDate(t.fecha),
        minutesToHHMM(t.duracion_horas),
        t.facturable ? 'Sí' : 'No',
        t.estado,
      ];

      cx = startX;
      doc.fillColor('#111111').fontSize(7.5).font('Helvetica');
      for (let j = 0; j < cols.length; j++) {
        doc.text(rowData[j], cx + 3, y + 4, { width: cols[j].width - 6, lineBreak: false });
        cx += cols[j].width;
      }

      y += rowHeight;

      // Page break check
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
    }

    // ── Footer / summary ──
    const totalMinutes = tiempos.reduce((s, t) => s + t.duracion_horas, 0);
    doc.moveDown(1.5);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0D9488')
      .text(`Total registros: ${tiempos.length}   |   Total horas: ${minutesToHHMM(totalMinutes)}`, 40, y + 10);

    doc.end();
  } catch (err) {
    next(err);
  }
}

// ─── Users XLS ───────────────────────────────────────────────────────────────

export async function exportUsersXls(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, categoria_id, rol_id, area_practica_id, estado } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (categoria_id) where.categoria_id = parseInt(categoria_id, 10);
    if (rol_id) where.rol_id = parseInt(rol_id, 10);
    if (area_practica_id) where.area_practica_id = parseInt(area_practica_id, 10);
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.usuarios.findMany({
      where,
      include: {
        categoria: { select: { nombre: true } },
        rol: { select: { nombre: true } },
        area_practica: { select: { nombre: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Usuarios');

    ws.columns = [
      { header: '#', key: 'num', width: 6 },
      { header: 'Nombre', key: 'nombre', width: 28 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Rol', key: 'rol', width: 20 },
      { header: 'Área de práctica', key: 'area', width: 22 },
      { header: 'Tarifa horaria', key: 'tarifa', width: 16 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Fecha creación', key: 'created', width: 16 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };

    users.forEach((u, i) => {
      ws.addRow({
        num: i + 1,
        nombre: u.nombre,
        email: u.email,
        categoria: u.categoria?.nombre ?? '',
        rol: u.rol?.nombre ?? '',
        area: u.area_practica?.nombre ?? '',
        tarifa: u.tarifa_horaria ? Number(u.tarifa_horaria) : '',
        estado: u.estado,
        created: formatDate(u.created_at),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

// ─── Approval XLS ────────────────────────────────────────────────────────────

export async function exportApprovalXls(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { usuario_id, cliente_id, asunto_id, area_practica_id, fecha_inicio, fecha_fin } = req.query as Record<string, string>;

    const tiempoWhere: Record<string, unknown> = { estado: EstadoTiempo.Activo };
    if (usuario_id) tiempoWhere.usuario_id = parseInt(usuario_id, 10);
    if (fecha_inicio || fecha_fin) {
      tiempoWhere.fecha = {};
      if (fecha_inicio) (tiempoWhere.fecha as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (tiempoWhere.fecha as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const asuntoWhere: Record<string, unknown> = { tiempos: { some: tiempoWhere } };
    if (cliente_id) asuntoWhere.cliente_id = parseInt(cliente_id, 10);
    if (asunto_id) asuntoWhere.id = parseInt(asunto_id, 10);
    if (area_practica_id) asuntoWhere.area_practica_id = parseInt(area_practica_id, 10);

    const asuntos = await prisma.asuntos.findMany({
      where: asuntoWhere,
      include: {
        cliente: { select: { razon_social: true } },
        tiempos: { where: tiempoWhere },
      },
      orderBy: { codigo: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Aprobación');

    ws.columns = [
      { header: '#', key: 'num', width: 6 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Asunto', key: 'asunto', width: 32 },
      { header: 'Tipo Facturación', key: 'tipo', width: 22 },
      { header: 'Moneda', key: 'moneda', width: 10 },
      { header: 'Horas Facturables', key: 'horas', width: 18 },
      { header: 'Valor Tiempos', key: 'valor', width: 18 },
      { header: 'Estado tiempos', key: 'estado', width: 16 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };

    asuntos.forEach((a, i) => {
      const facturables = a.tiempos.filter((t) => t.facturable);
      const horasFacturables = facturables.reduce((s, t) => s + t.duracion_horas, 0);
      ws.addRow({
        num: i + 1,
        cliente: a.cliente?.razon_social ?? '',
        asunto: `${a.codigo} — ${a.nombre}`,
        tipo: a.tipo_facturacion,
        moneda: a.moneda,
        horas: minutesToHHMM(horasFacturables),
        valor: '',
        estado: `${a.tiempos.length} activos`,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="aprobacion.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

// ─── Billing XLS ─────────────────────────────────────────────────────────────

export async function exportBillingXls(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { receptor_id, emisor_id, asunto_id, tipo_documento, estado, fecha_inicio, fecha_fin } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (receptor_id) where.receptor_id = parseInt(receptor_id, 10);
    if (emisor_id) where.emisor_id = parseInt(emisor_id, 10);
    if (asunto_id) where.asunto_id = parseInt(asunto_id, 10);
    if (tipo_documento) where.tipo_documento = tipo_documento;
    if (estado) where.estado = estado;
    if (fecha_inicio || fecha_fin) {
      where.created_at = {};
      if (fecha_inicio) (where.created_at as Record<string, unknown>).gte = new Date(fecha_inicio);
      if (fecha_fin) (where.created_at as Record<string, unknown>).lte = new Date(fecha_fin);
    }

    const docs = await prisma.documentos_facturacion.findMany({
      where,
      include: {
        receptor: { select: { razon_social: true } },
        emisor: { select: { nombre: true } },
        asunto: { select: { codigo: true, nombre: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Facturación');

    ws.columns = [
      { header: '#', key: 'num', width: 6 },
      { header: 'Receptor', key: 'receptor', width: 28 },
      { header: 'Asunto', key: 'asunto', width: 30 },
      { header: 'Emisor', key: 'emisor', width: 22 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Tipo', key: 'tipo', width: 18 },
      { header: 'Valor', key: 'valor', width: 16 },
      { header: 'Moneda', key: 'moneda', width: 10 },
      { header: 'Estado', key: 'estado', width: 14 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };

    docs.forEach((d, i) => {
      ws.addRow({
        num: i + 1,
        receptor: d.receptor?.razon_social ?? '',
        asunto: d.asunto ? `${d.asunto.codigo} — ${d.asunto.nombre}` : '',
        emisor: d.emisor?.nombre ?? '',
        fecha: formatDate(d.created_at),
        tipo: d.tipo_documento,
        valor: Number(d.valor),
        moneda: d.moneda,
        estado: d.estado,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="facturacion.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}
