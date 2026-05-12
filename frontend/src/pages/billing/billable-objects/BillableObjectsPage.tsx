import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { FacturarModal } from '../../wip/FacturarModal';
import { billableObjectsService, BillableAsunto } from '../../../services/billableObjectsService';
import { clienteService } from '../../../services/clienteService';
import { asuntoService } from '../../../services/asuntoService';
import { minutesToHHMM } from '../../../utils/time';
import { formatCurrency } from '../../../utils/currency';
import { getTipoFacturacionLabel } from '../../../utils/tipoFacturacion';
import type { Tiempo, WipAsunto } from '../../../types';

export function BillableObjectsPage() {
  const queryClient = useQueryClient();

  // Filters
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [asuntoId, setAsuntoId] = useState<number | null>(null);
  const [tipoFacturacion, setTipoFacturacion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [page, setPage] = useState(1);

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [facturarOpen, setFacturarOpen] = useState(false);

  // Data
  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 200 }),
  });

  const { data: asuntosData } = useQuery({
    queryKey: ['asuntos', clienteId],
    queryFn: () => asuntoService.getAsuntos({ cliente_id: clienteId!, limit: 200 }),
    enabled: clienteId != null,
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ['billable-objects', { clienteId, asuntoId, tipoFacturacion, fechaInicio, fechaFin, page }],
    queryFn: () =>
      billableObjectsService.getList({
        cliente_id: clienteId ?? undefined,
        asunto_id: asuntoId ?? undefined,
        tipo_facturacion: tipoFacturacion || undefined,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        page,
        limit: 10,
      }),
  });

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const all = listData?.data ?? [];
    if (selectedIds.size === all.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(all.map((a) => a.id)));
    }
  };

  const handleClearFilters = () => {
    setClienteId(null);
    setAsuntoId(null);
    setTipoFacturacion('');
    setFechaInicio('');
    setFechaFin('');
    setPage(1);
  };

  const totalPages = listData?.pagination.totalPages ?? 1;
  const clienteOptions = (clientesData?.data ?? []).map((c) => ({ value: c.id, label: `${c.codigo} — ${c.razon_social}` }));
  const asuntoOptions = (asuntosData?.data ?? []).map((a) => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` }));
  const selectedAsuntos = (listData?.data ?? []).filter((a) => selectedIds.has(a.id));

  const asWipAsuntos = (asuntos: BillableAsunto[]): WipAsunto[] =>
    asuntos.map((a) => ({
      ...a,
      horas_facturables: a.horas_facturables,
      valor_tiempos: a.valor,
      total_facturable: a.valor,
      count_tiempos: a.count_tiempos,
    }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Objetos Facturables</h1>
        {selectedIds.size > 0 && (
          <Button
            className="bg-teal-600 text-white hover:bg-teal-700"
            onClick={() => setFacturarOpen(true)}
          >
            + Facturar seleccionados ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Select
            label="Cliente"
            options={clienteOptions}
            placeholder="Todos"
            value={clienteId ?? ''}
            onChange={(e) => {
              setClienteId(e.target.value ? parseInt(e.target.value, 10) : null);
              setAsuntoId(null);
              setPage(1);
            }}
          />
          <Select
            label="Asunto"
            options={asuntoOptions}
            placeholder={clienteId ? 'Todos' : 'Seleccione cliente'}
            disabled={clienteId == null}
            value={asuntoId ?? ''}
            onChange={(e) => { setAsuntoId(e.target.value ? parseInt(e.target.value, 10) : null); setPage(1); }}
          />
          <Select
            label="Tipo Facturación"
            options={[
              { value: 'PorHoras', label: 'Por Horas' },
              { value: 'PorHorasConMontoEditable', label: 'Por Horas (Editable)' },
              { value: 'PorHitosOEtapas', label: 'Por Hitos' },
              { value: 'MontoFijoMensual', label: 'Monto Fijo Mensual' },
            ]}
            placeholder="Todos"
            value={tipoFacturacion}
            onChange={(e) => { setTipoFacturacion(e.target.value); setPage(1); }}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setPage(1); }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setPage(1); }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>Limpiar filtros</Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={(listData?.data.length ?? 0) > 0 && selectedIds.size === listData?.data.length}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Asunto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Modo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Responsable</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Moneda</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            )}
            {!isLoading && listData?.data.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">Sin objetos facturables</td></tr>
            )}
            {!isLoading && listData?.data.map((asunto: BillableAsunto) => (
              <BillableRow
                key={asunto.id}
                asunto={asunto}
                isExpanded={expandedRows.has(asunto.id)}
                onToggleExpand={() => toggleExpand(asunto.id)}
                isSelected={selectedIds.has(asunto.id)}
                onToggleSelect={() => toggleSelect(asunto.id)}
              />
            ))}
          </tbody>
        </table>

        {listData && listData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {listData.pagination.total} registros — Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      <FacturarModal
        isOpen={facturarOpen}
        onClose={() => setFacturarOpen(false)}
        selectedAsuntos={asWipAsuntos(selectedAsuntos)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['billable-objects'] });
          setSelectedIds(new Set());
        }}
      />
    </div>
  );
}

// ─── BillableRow ──────────────────────────────────────────────────────────────

interface BillableRowProps {
  asunto: BillableAsunto;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function BillableRow({ asunto, isExpanded, onToggleExpand, isSelected, onToggleSelect }: BillableRowProps) {
  const { data: tiemposData, isLoading } = useQuery({
    queryKey: ['billable-objects', 'tiempos', asunto.id],
    queryFn: () => billableObjectsService.getAsuntoTiempos(asunto.id),
    enabled: isExpanded,
  });

  const tiempos = tiemposData?.data ?? [];

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50">
        <td className="px-3 py-3 text-center">
          <button onClick={onToggleExpand} className="text-gray-400 hover:text-teal-600">
            {isExpanded ? '▼' : '▶'}
          </button>
        </td>
        <td className="px-3 py-3 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded border-gray-300"
          />
        </td>
        <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate">{asunto.cliente?.razon_social ?? '—'}</td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-800">{asunto.codigo}</div>
          <div className="text-xs text-gray-500">{asunto.nombre}</div>
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">{asunto.id}</td>
        <td className="px-4 py-3 text-gray-600 text-xs">{getTipoFacturacionLabel(asunto.tipo_facturacion)}</td>
        <td className="px-4 py-3 text-gray-600">{asunto.responsable?.nombre ?? '—'}</td>
        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
          {asunto.fecha_ultima ? format(new Date(asunto.fecha_ultima), 'dd/MM/yyyy') : '—'}
        </td>
        <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(asunto.valor, asunto.moneda)}</td>
        <td className="px-4 py-3 text-gray-500">{asunto.moneda}</td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={10} className="bg-gray-50 border-b border-gray-100 px-8 py-4">
            {isLoading ? (
              <p className="text-sm text-gray-400">Cargando tiempos...</p>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Usuario</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Fecha</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Descripción</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Duración</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500">Fact.</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiempos.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-4 text-gray-400">Sin tiempos</td></tr>
                    )}
                    {tiempos.map((t: Tiempo) => (
                      <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">{t.usuario?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          {t.fecha ? format(new Date(t.fecha), 'dd/MM/yyyy') : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={t.actividad}>{t.actividad}</td>
                        <td className="px-3 py-2 text-right font-mono">{minutesToHHMM(t.duracion_horas)}</td>
                        <td className="px-3 py-2 text-center">
                          {t.facturable ? <span className="text-green-600">$</span> : <span className="text-gray-400 line-through">$</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant="info">{t.estado}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
