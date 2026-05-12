import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { approvalService, ApprovalAsunto } from '../../../services/approvalService';
import { clienteService } from '../../../services/clienteService';
import { userService } from '../../../services/userService';
import { asuntoService } from '../../../services/asuntoService';
import { minutesToHHMM } from '../../../utils/time';
import { getTipoFacturacionLabel } from '../../../utils/tipoFacturacion';
import type { Tiempo } from '../../../types';

const ESTADO_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'default' | 'danger'> = {
  Activo: 'default',
  Aprobado: 'info',
  Facturado: 'warning',
  FacturadoPagado: 'success',
};

export function ApprovalPage() {
  const queryClient = useQueryClient();

  // Filters
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [asuntoId, setAsuntoId] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [page, setPage] = useState(1);

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedTiempos, setSelectedTiempos] = useState<Set<number>>(new Set());
  const [selectedAsuntoIds, setSelectedAsuntoIds] = useState<Set<number>>(new Set());

  // Data
  const { data: usersData } = useQuery({
    queryKey: ['users', 'activos'],
    queryFn: () => userService.getUsers({ estado: 'Activo', limit: 200 }),
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 200 }),
  });

  const { data: asuntosData } = useQuery({
    queryKey: ['asuntos', clienteId],
    queryFn: () => asuntoService.getAsuntos({ cliente_id: clienteId!, limit: 200 }),
    enabled: clienteId != null,
  });

  const { data: approvalData, isLoading } = useQuery({
    queryKey: ['approval', { usuarioId, clienteId, asuntoId, fechaInicio, fechaFin, page }],
    queryFn: () =>
      approvalService.getApprovalList({
        usuario_id: usuarioId ?? undefined,
        cliente_id: clienteId ?? undefined,
        asunto_id: asuntoId ?? undefined,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        page,
        limit: 10,
      }),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, estado }: { ids: number[]; estado: 'Aprobado' | 'Activo' }) =>
      approvalService.bulkUpdateEstado(ids, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval'] });
      setSelectedTiempos(new Set());
    },
  });

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAsunto = (id: number) => {
    setSelectedAsuntoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearFilters = () => {
    setUsuarioId(null);
    setClienteId(null);
    setAsuntoId(null);
    setFechaInicio('');
    setFechaFin('');
    setPage(1);
  };

  const totalPages = approvalData?.pagination.totalPages ?? 1;
  const userOptions = (usersData?.data ?? []).map((u) => ({ value: u.id, label: u.nombre }));
  const clienteOptions = (clientesData?.data ?? []).map((c) => ({ value: c.id, label: `${c.codigo} — ${c.razon_social}` }));
  const asuntoOptions = (asuntosData?.data ?? []).map((a) => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Aprobación</h1>
        {selectedTiempos.size > 0 && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => bulkMutation.mutate({ ids: Array.from(selectedTiempos), estado: 'Activo' })}
              loading={bulkMutation.isPending}
            >
              Rechazar seleccionados ({selectedTiempos.size})
            </Button>
            <Button
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => bulkMutation.mutate({ ids: Array.from(selectedTiempos), estado: 'Aprobado' })}
              loading={bulkMutation.isPending}
            >
              Aprobar seleccionados ({selectedTiempos.size})
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Select
            label="Usuario"
            options={userOptions}
            placeholder="Todos"
            value={usuarioId ?? ''}
            onChange={(e) => { setUsuarioId(e.target.value ? parseInt(e.target.value, 10) : null); setPage(1); }}
          />
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
                <input type="checkbox" className="rounded border-gray-300" onChange={() => {}} />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Asunto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Moneda</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Facturable</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tiempos</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            )}
            {!isLoading && approvalData?.data.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">Sin asuntos pendientes de aprobación</td></tr>
            )}
            {!isLoading && approvalData?.data.map((asunto: ApprovalAsunto) => (
              <ApprovalRow
                key={asunto.id}
                asunto={asunto}
                isExpanded={expandedRows.has(asunto.id)}
                onToggleExpand={() => toggleExpand(asunto.id)}
                isSelected={selectedAsuntoIds.has(asunto.id)}
                onToggleAsunto={() => toggleAsunto(asunto.id)}
                selectedTiempos={selectedTiempos}
                onTiempoSelectionChange={setSelectedTiempos}
                onBulkAction={(ids, estado) => bulkMutation.mutate({ ids, estado })}
                queryClient={queryClient}
              />
            ))}
          </tbody>
        </table>

        {approvalData && approvalData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {approvalData.pagination.total} asuntos — Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ApprovalRow ──────────────────────────────────────────────────────────────

interface ApprovalRowProps {
  asunto: ApprovalAsunto;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSelected: boolean;
  onToggleAsunto: () => void;
  selectedTiempos: Set<number>;
  onTiempoSelectionChange: (ids: Set<number>) => void;
  onBulkAction: (ids: number[], estado: 'Aprobado' | 'Activo') => void;
  queryClient: ReturnType<typeof useQueryClient>;
}

function ApprovalRow({
  asunto,
  isExpanded,
  onToggleExpand,
  isSelected,
  onToggleAsunto,
  selectedTiempos,
  onTiempoSelectionChange,
  onBulkAction,
}: ApprovalRowProps) {
  const { data: tiemposData, isLoading } = useQuery({
    queryKey: ['approval', 'tiempos', asunto.id],
    queryFn: () => approvalService.getAsuntoTiempos(asunto.id),
    enabled: isExpanded,
  });

  const tiempos = tiemposData?.data ?? [];

  const toggleTiempo = (id: number) => {
    const next = new Set(selectedTiempos);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onTiempoSelectionChange(next);
  };

  const toggleAllTiempos = () => {
    const allIds = tiempos.map((t) => t.id);
    const allSelected = allIds.every((id) => selectedTiempos.has(id));
    const next = new Set(selectedTiempos);
    if (allSelected) {
      allIds.forEach((id) => next.delete(id));
    } else {
      allIds.forEach((id) => next.add(id));
    }
    onTiempoSelectionChange(next);
  };

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
            onChange={onToggleAsunto}
            className="rounded border-gray-300"
          />
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">{asunto.id}</td>
        <td className="px-4 py-3 text-gray-700">{asunto.cliente?.razon_social ?? '—'}</td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-800">{asunto.codigo}</div>
          <div className="text-xs text-gray-500">{asunto.nombre}</div>
        </td>
        <td className="px-4 py-3 text-gray-600 text-xs">{getTipoFacturacionLabel(asunto.tipo_facturacion)}</td>
        <td className="px-4 py-3 text-gray-500">{asunto.moneda}</td>
        <td className="px-4 py-3 text-right font-mono text-gray-700">{minutesToHHMM(asunto.horas_facturables)}</td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs text-gray-600">
            <Badge variant="default">{asunto.count_activos} Activos</Badge>
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-gray-400 cursor-default text-xs" title="Ver detalle">ℹ</span>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={10} className="bg-blue-50 border-b border-blue-100 px-8 py-4">
            {isLoading ? (
              <p className="text-sm text-gray-400">Cargando tiempos...</p>
            ) : (
              <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-blue-100 bg-blue-50">
                  <span className="text-xs font-medium text-blue-700">{tiempos.length} tiempo(s) activos</span>
                  {tiempos.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onBulkAction(tiempos.map((t) => t.id).filter((id) => selectedTiempos.has(id)), 'Activo')}
                      >
                        Rechazar seleccionados
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => onBulkAction(tiempos.map((t) => t.id).filter((id) => selectedTiempos.has(id)), 'Aprobado')}
                      >
                        Aprobar seleccionados
                      </Button>
                    </div>
                  )}
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-3 py-2">
                        <input
                          type="checkbox"
                          onChange={toggleAllTiempos}
                          checked={tiempos.length > 0 && tiempos.every((t) => selectedTiempos.has(t.id))}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Usuario</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Fecha</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Descripción</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Duración</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500">Fact.</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-500">Estado</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {tiempos.map((t: Tiempo) => (
                      <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTiempos.has(t.id)}
                            onChange={() => toggleTiempo(t.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-700">{t.usuario?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          {t.fecha ? format(new Date(t.fecha), 'dd/MM/yyyy') : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={t.actividad}>
                          {t.actividad}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{minutesToHHMM(t.duracion_horas)}</td>
                        <td className="px-3 py-2 text-center">
                          {t.facturable ? (
                            <span className="text-green-600 font-semibold">$</span>
                          ) : (
                            <span className="text-gray-400 line-through">$</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant={ESTADO_VARIANT[t.estado] ?? 'default'}>{t.estado}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              className="text-green-600 hover:bg-green-50 px-2 py-0.5 rounded text-xs border border-green-200"
                              onClick={() => onBulkAction([t.id], 'Aprobado')}
                            >
                              Aprobar
                            </button>
                            <button
                              className="text-red-600 hover:bg-red-50 px-2 py-0.5 rounded text-xs border border-red-200"
                              onClick={() => onBulkAction([t.id], 'Activo')}
                            >
                              Rechazar
                            </button>
                          </div>
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
