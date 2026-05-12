import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { TimeModal } from './TimeModal';
import { clienteService } from '../../services/clienteService';
import { asuntoService } from '../../services/asuntoService';
import { tiempoService } from '../../services/tiempoService';
import { useAuthStore } from '../../store/authStore';
import { minutesToHHMM } from '../../utils/time';
import type { Tiempo } from '../../types';

const ESTADO_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'default' | 'danger'> = {
  Activo: 'default',
  Aprobado: 'info',
  Facturado: 'warning',
  FacturadoPagado: 'success',
};

const ESTADO_LABEL: Record<string, string> = {
  Activo: 'Activo',
  Aprobado: 'Aprobado',
  Facturado: 'Facturado',
  FacturadoPagado: 'Fact. Pagado',
};

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export function TimesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.rol?.nombre === 'Administrador';

  // Filters
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [asuntoId, setAsuntoId] = useState<number | null>(null);
  const [estado, setEstado] = useState('');
  const [facturable, setFacturable] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [page, setPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTiempo, setEditingTiempo] = useState<Tiempo | undefined>(undefined);

  // Data
  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 100 }),
  });

  const { data: asuntosData } = useQuery({
    queryKey: ['asuntos', clienteId],
    queryFn: () =>
      asuntoService.getAsuntos({ cliente_id: clienteId!, estado: 'Activo', limit: 100 }),
    enabled: clienteId != null,
  });

  const { data: tiemposData, isLoading } = useQuery({
    queryKey: [
      'tiempos',
      { clienteId, asuntoId, estado, facturable, fechaInicio, fechaFin, mostrarTodos, page },
    ],
    queryFn: () =>
      tiempoService.getTiempos({
        cliente_id: clienteId ?? undefined,
        asunto_id: asuntoId ?? undefined,
        estado: (estado || undefined) as Tiempo['estado'] | undefined,
        facturable: facturable === '' ? undefined : facturable === 'true',
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        mostrar_todos: mostrarTodos,
        page,
        limit: 10,
      }),
  });

  const clienteOptions = (clientesData?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.codigo} — ${c.razon_social}`,
  }));

  const asuntoOptions = (asuntosData?.data ?? []).map((a) => ({
    value: a.id,
    label: `${a.codigo} — ${a.nombre}`,
  }));

  const handleClearFilters = () => {
    setClienteId(null);
    setAsuntoId(null);
    setEstado('');
    setFacturable('');
    setFechaInicio('');
    setFechaFin('');
    setMostrarTodos(false);
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro de tiempo?')) return;
    await tiempoService.deleteTiempo(id);
    queryClient.invalidateQueries({ queryKey: ['tiempos'] });
  };

  const totalPages = tiemposData?.pagination.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tiempos</h1>
          <div className="flex gap-2 mt-1">
            <button className="text-sm text-teal-600 font-medium border-b-2 border-teal-600 pb-0.5">
              Lista
            </button>
            <button className="text-sm text-gray-400 pb-0.5">Calendario</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md">
            PDF
          </button>
          <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-300 rounded-md">
            XLS
          </button>
          <Button
            onClick={() => {
              setEditingTiempo(undefined);
              setModalOpen(true);
            }}
          >
            + Nuevo Tiempo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
            onChange={(e) => {
              setAsuntoId(e.target.value ? parseInt(e.target.value, 10) : null);
              setPage(1);
            }}
          />
          <Select
            label="Estado"
            options={[
              { value: 'Activo', label: 'Activo' },
              { value: 'Aprobado', label: 'Aprobado' },
              { value: 'Facturado', label: 'Facturado' },
              { value: 'FacturadoPagado', label: 'Fact. Pagado' },
            ]}
            placeholder="Todos"
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPage(1); }}
          />
          <Select
            label="Facturable"
            options={[
              { value: 'true', label: 'Sí' },
              { value: 'false', label: 'No' },
            ]}
            placeholder="Todos"
            value={facturable}
            onChange={(e) => { setFacturable(e.target.value); setPage(1); }}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setPage(1); }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setPage(1); }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-end gap-3">
            {isAdmin && (
              <label className="flex items-center gap-2 cursor-pointer mb-0.5">
                <input
                  type="checkbox"
                  checked={mostrarTodos}
                  onChange={(e) => { setMostrarTodos(e.target.checked); setPage(1); }}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">Todos los usuarios</span>
              </label>
            )}
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Asunto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actividad</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tiempo</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fact.</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && tiemposData?.data.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  Sin registros
                </td>
              </tr>
            )}
            {!isLoading &&
              tiemposData?.data.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate">
                    {t.cliente?.razon_social ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate text-xs">
                    {t.asunto?.codigo ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[200px]">
                    <span title={t.actividad}>{truncate(t.actividad, 60)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {t.fecha ? format(new Date(t.fecha), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    {minutesToHHMM(t.duracion_horas)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.facturable ? (
                      <span className="text-green-600 font-semibold text-xs">$</span>
                    ) : (
                      <span className="text-gray-400 text-xs line-through">$</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={ESTADO_VARIANT[t.estado] ?? 'default'}>
                      {ESTADO_LABEL[t.estado] ?? t.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => {
                          setEditingTiempo(t);
                          setModalOpen(true);
                        }}
                        className="text-xs text-gray-500 hover:text-teal-600 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Pagination */}
        {tiemposData && tiemposData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {tiemposData.pagination.total} registros — Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <TimeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tiempo={editingTiempo}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tiempos'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />
    </div>
  );
}
