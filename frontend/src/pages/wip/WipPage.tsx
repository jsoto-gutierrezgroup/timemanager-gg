import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { ClienteModal } from './ClienteModal';
import { AsuntoModal } from './AsuntoModal';
import { FacturarModal } from './FacturarModal';
import { wipService } from '../../services/wipService';
import { clienteService } from '../../services/clienteService';
import { minutesToHHMM } from '../../utils/time';
import { formatCurrency } from '../../utils/currency';
import { getTipoFacturacionLabel } from '../../utils/tipoFacturacion';
import type { WipCliente, WipAsunto, Cliente } from '../../types';

function truncate(text: string, max: number) {
  return text && text.length > max ? text.slice(0, max) + '…' : text;
}

export function WipPage() {
  const queryClient = useQueryClient();

  // Client filters
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);

  // Expanded state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [asuntoFilters, setAsuntoFilters] = useState<Record<number, { estado_asunto: string; tipo_facturacion: string }>>({});

  // Selected asuntos per client (for facturar)
  const [selectedAsuntos, setSelectedAsuntos] = useState<Record<number, Set<number>>>({});
  const [asuntosForFacturar, setAsuntosForFacturar] = useState<WipAsunto[]>([]);
  const [facturarOpen, setFacturarOpen] = useState(false);

  // Modals
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | undefined>(undefined);
  const [asuntoModalOpen, setAsuntoModalOpen] = useState(false);
  const [prefilledClienteId, setPrefilledClienteId] = useState<number | undefined>(undefined);

  const { data: clientesData, isLoading } = useQuery({
    queryKey: ['wip', { search, estadoFilter, page }],
    queryFn: () =>
      wipService.getClientes({
        search: search || undefined,
        estado: (estadoFilter as 'Activo' | 'Inactivo') || undefined,
        page,
        limit: 10,
      }),
  });

  // Per-client asuntos queries (lazy)
  const asuntosQueries: Record<number, ReturnType<typeof useQuery<{ data: WipAsunto[] }>>> = {};

  const toggleExpand = (clienteId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(clienteId)) {
        next.delete(clienteId);
      } else {
        next.add(clienteId);
      }
      return next;
    });
  };

  const totalPages = clientesData?.pagination.totalPages ?? 1;

  const handleFacturarSelected = (clienteId: number, allAsuntos: WipAsunto[]) => {
    const ids = selectedAsuntos[clienteId] ?? new Set();
    const selected = allAsuntos.filter((a) => ids.has(a.id));
    setAsuntosForFacturar(selected);
    setFacturarOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Gestión del WIP</h1>
        <Button
          onClick={() => {
            setEditingCliente(undefined);
            setClienteModalOpen(true);
          }}
        >
          + Nuevo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Buscar</label>
            <input
              type="text"
              placeholder="Razón social o código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Select
            label="Estado"
            options={[
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
            ]}
            placeholder="Todos"
            value={estadoFilter}
            onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }}
          />
          <div className="flex items-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setSearch(''); setEstadoFilter(''); setPage(1); }}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="w-8 px-3 py-3" />
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Razón Social</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nombre Comercial</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">País</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ciudad</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Creación</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-400">Cargando...</td>
              </tr>
            )}
            {!isLoading && clientesData?.data.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-400">Sin registros</td>
              </tr>
            )}
            {!isLoading && clientesData?.data.map((cliente: WipCliente) => (
              <ClienteRow
                key={cliente.id}
                cliente={cliente}
                isExpanded={expandedRows.has(cliente.id)}
                onToggleExpand={() => toggleExpand(cliente.id)}
                onEdit={(c) => { setEditingCliente(c as Cliente); setClienteModalOpen(true); }}
                onAddAsunto={(clienteId) => { setPrefilledClienteId(clienteId); setAsuntoModalOpen(true); }}
                selectedAsuntos={selectedAsuntos[cliente.id] ?? new Set()}
                onSelectionChange={(ids) => setSelectedAsuntos((prev) => ({ ...prev, [cliente.id]: ids }))}
                asuntoFilter={asuntoFilters[cliente.id] ?? { estado_asunto: '', tipo_facturacion: '' }}
                onAsuntoFilterChange={(f) => setAsuntoFilters((prev) => ({ ...prev, [cliente.id]: f }))}
                onFacturar={(asuntos) => handleFacturarSelected(cliente.id, asuntos)}
                queryClient={queryClient}
                asuntosQueries={asuntosQueries}
              />
            ))}
          </tbody>
        </table>

        {clientesData && clientesData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {clientesData.pagination.total} clientes — Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ClienteModal
        isOpen={clienteModalOpen}
        onClose={() => setClienteModalOpen(false)}
        cliente={editingCliente}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['wip'] })}
      />
      <AsuntoModal
        isOpen={asuntoModalOpen}
        onClose={() => setAsuntoModalOpen(false)}
        prefilledClienteId={prefilledClienteId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['wip'] })}
      />
      <FacturarModal
        isOpen={facturarOpen}
        onClose={() => setFacturarOpen(false)}
        selectedAsuntos={asuntosForFacturar}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['wip'] });
          setSelectedAsuntos({});
        }}
      />
    </div>
  );
}

// ─── ClienteRow ───────────────────────────────────────────────────────────────

interface ClienteRowProps {
  cliente: WipCliente;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (c: WipCliente) => void;
  onAddAsunto: (clienteId: number) => void;
  selectedAsuntos: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
  asuntoFilter: { estado_asunto: string; tipo_facturacion: string };
  onAsuntoFilterChange: (f: { estado_asunto: string; tipo_facturacion: string }) => void;
  onFacturar: (asuntos: WipAsunto[]) => void;
  queryClient: ReturnType<typeof useQueryClient>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asuntosQueries: Record<number, any>;
}

function ClienteRow({
  cliente,
  isExpanded,
  onToggleExpand,
  onEdit,
  onAddAsunto,
  selectedAsuntos,
  onSelectionChange,
  asuntoFilter,
  onAsuntoFilterChange,
  onFacturar,
}: ClienteRowProps) {
  const { data: asuntosData, isLoading: asuntosLoading } = useQuery({
    queryKey: ['wip', 'asuntos', cliente.id, asuntoFilter],
    queryFn: () =>
      wipService.getAsuntos(cliente.id, {
        estado_asunto: asuntoFilter.estado_asunto || undefined,
        tipo_facturacion: asuntoFilter.tipo_facturacion || undefined,
      }),
    enabled: isExpanded,
  });

  const asuntos = asuntosData?.data ?? [];

  const toggleAsunto = (id: number) => {
    const next = new Set(selectedAsuntos);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (selectedAsuntos.size === asuntos.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(asuntos.map((a) => a.id)));
    }
  };

  const handleInactivar = async () => {
    if (!confirm(`¿Cambiar estado de "${cliente.razon_social}"?`)) return;
    const newEstado = cliente.estado === 'Activo' ? 'Inactivo' : 'Activo';
    await clienteService.updateCliente(cliente.id, { estado: newEstado as 'Activo' | 'Inactivo' });
  };

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50">
        <td className="px-3 py-3 text-center">
          <button
            onClick={onToggleExpand}
            className="text-gray-400 hover:text-teal-600 transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">{cliente.id}</td>
        <td className="px-4 py-3 font-mono text-xs text-teal-700">{cliente.codigo}</td>
        <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">
          {cliente.razon_social}
        </td>
        <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">
          {cliente.nombre_comercial ?? '—'}
        </td>
        <td className="px-4 py-3 text-gray-500">{cliente.pais ?? '—'}</td>
        <td className="px-4 py-3 text-gray-500">{cliente.ciudad ?? '—'}</td>
        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
          {cliente.created_at ? format(new Date(cliente.created_at), 'dd/MM/yyyy') : '—'}
        </td>
        <td className="px-4 py-3 text-center">
          <Badge variant={cliente.estado === 'Activo' ? 'success' : 'default'}>
            {cliente.estado}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => onEdit(cliente)}
              className="text-xs text-gray-500 hover:text-teal-600 px-2 py-1 rounded hover:bg-gray-100"
            >
              Editar
            </button>
            <button
              onClick={handleInactivar}
              className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100"
            >
              {cliente.estado === 'Activo' ? 'Inactivar' : 'Activar'}
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={10} className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            {/* Sub-filters */}
            <div className="flex gap-3 mb-3 flex-wrap items-end">
              <Select
                label="Estado asunto"
                options={[
                  { value: 'Activo', label: 'Activo' },
                  { value: 'Inactivo', label: 'Inactivo' },
                  { value: 'Cerrado', label: 'Cerrado' },
                ]}
                placeholder="Todos"
                value={asuntoFilter.estado_asunto}
                onChange={(e) => onAsuntoFilterChange({ ...asuntoFilter, estado_asunto: e.target.value })}
              />
              <Select
                label="Tipo facturación"
                options={[
                  { value: 'PorHoras', label: 'Por Horas' },
                  { value: 'PorHorasConMontoEditable', label: 'Por Horas (Editable)' },
                  { value: 'PorHitosOEtapas', label: 'Por Hitos' },
                  { value: 'MontoFijoMensual', label: 'Monto Fijo Mensual' },
                ]}
                placeholder="Todos"
                value={asuntoFilter.tipo_facturacion}
                onChange={(e) => onAsuntoFilterChange({ ...asuntoFilter, tipo_facturacion: e.target.value })}
              />
              <Button variant="secondary" size="sm" onClick={() => onAddAsunto(cliente.id)}>
                + Nuevo Asunto
              </Button>
              {selectedAsuntos.size > 0 && (
                <Button
                  size="sm"
                  className="bg-teal-600 text-white hover:bg-teal-700"
                  onClick={() => onFacturar(asuntos.filter((a) => selectedAsuntos.has(a.id)))}
                >
                  Facturar ({selectedAsuntos.size})
                </Button>
              )}
            </div>

            {/* Sub-table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={asuntos.length > 0 && selectedAsuntos.size === asuntos.length}
                        onChange={toggleAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase">ID</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase">Asunto</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase">Facturación</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 uppercase">Moneda</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 uppercase">Facturable</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 uppercase">Valor tiempos</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 uppercase">Total</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {asuntosLoading && (
                    <tr>
                      <td colSpan={10} className="text-center py-6 text-gray-400">Cargando...</td>
                    </tr>
                  )}
                  {!asuntosLoading && asuntos.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-6 text-gray-400">Sin asuntos</td>
                    </tr>
                  )}
                  {!asuntosLoading && asuntos.map((a: WipAsunto) => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedAsuntos.has(a.id)}
                          onChange={() => toggleAsunto(a.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-400">{a.id}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{a.codigo}</div>
                        <div className="text-gray-500">{truncate(a.nombre, 40)}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{getTipoFacturacionLabel(a.tipo_facturacion)}</td>
                      <td className="px-3 py-2 text-gray-500">{a.moneda}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700">{minutesToHHMM(a.horas_facturables)}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(a.valor_tiempos, a.moneda)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(a.total_facturable, a.moneda)}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={a.estado === 'Activo' ? 'success' : a.estado === 'Cerrado' ? 'default' : 'warning'}>
                          {a.estado}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-gray-400 cursor-default" title={`${a.count_tiempos} tiempo(s) registrado(s)`}>ℹ</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
