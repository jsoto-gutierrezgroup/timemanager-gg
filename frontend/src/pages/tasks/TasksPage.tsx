import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isPast, parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { TaskModal } from './TaskModal';
import { TimeModal } from '../times/TimeModal';
import { clienteService } from '../../services/clienteService';
import { asuntoService } from '../../services/asuntoService';
import { tareaService } from '../../services/tareaService';
import { useAuthStore } from '../../store/authStore';
import { minutesToHHMM } from '../../utils/time';
import type { Tarea } from '../../types';

type FilterView =
  | 'todas'
  | 'activas'
  | 'vencimiento'
  | 'asignadas'
  | 'importancia'
  | 'archivadas'
  | 'finalizadas';

const FILTER_LABELS: Record<FilterView, string> = {
  todas: 'Todas',
  activas: 'Activas',
  vencimiento: 'Por vencimiento',
  asignadas: 'Asignadas a mí',
  importancia: 'Por importancia',
  archivadas: 'Archivadas',
  finalizadas: 'Finalizadas',
};

const IMPORTANCIA_DISPLAY: Record<string, { label: string; className: string }> = {
  Baja: { label: '!', className: 'text-yellow-600 font-bold' },
  Media: { label: '!!', className: 'text-orange-600 font-bold' },
  Alta: { label: '!!!', className: 'text-red-600 font-bold' },
};

function buildQueryFilters(view: FilterView, currentUserId?: number) {
  switch (view) {
    case 'activas':
      return { finalizada: false, archivada: false, mostrar_todos: true };
    case 'finalizadas':
      return { finalizada: true, archivada: false, mostrar_todos: true };
    case 'archivadas':
      return { archivada: true, mostrar_todos: true };
    case 'asignadas':
      return { finalizada: false, archivada: false, usuario_id: currentUserId };
    case 'vencimiento':
      return { finalizada: false, archivada: false, mostrar_todos: true, sort: 'vencimiento' as const };
    case 'importancia':
      return { finalizada: false, archivada: false, mostrar_todos: true, sort: 'importancia' as const };
    case 'todas':
    default:
      return { archivada: false, mostrar_todos: true };
  }
}

export function TasksPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.rol?.nombre === 'Administrador';

  const [activeView, setActiveView] = useState<FilterView>('activas');
  const [search, setSearch] = useState('');
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [asuntoId, setAsuntoId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTarea, setEditingTarea] = useState<Tarea | undefined>(undefined);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [timeModalDefaults, setTimeModalDefaults] = useState<{
    clienteId?: number;
    asuntoId?: number;
  }>({});

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

  const queryFilters = buildQueryFilters(activeView, user?.id);

  const { data: tareasData, isLoading } = useQuery({
    queryKey: ['tareas', activeView, clienteId, asuntoId, page],
    queryFn: () =>
      tareaService.getTareas({
        ...queryFilters,
        cliente_id: clienteId ?? undefined,
        asunto_id: asuntoId ?? undefined,
        page,
        limit: 20,
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

  const handleToggleFinalizada = async (tarea: Tarea) => {
    await tareaService.updateTarea(tarea.id, { finalizada: !tarea.finalizada });
    queryClient.invalidateQueries({ queryKey: ['tareas'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    await tareaService.deleteTarea(id);
    queryClient.invalidateQueries({ queryKey: ['tareas'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const handleArchive = async (tarea: Tarea) => {
    await tareaService.updateTarea(tarea.id, { archivada: !tarea.archivada });
    queryClient.invalidateQueries({ queryKey: ['tareas'] });
  };

  const openTimeModalForTarea = (tarea: Tarea) => {
    setTimeModalDefaults({ clienteId: tarea.cliente_id, asuntoId: tarea.asunto_id });
    setTimeModalOpen(true);
  };

  // Filter locally by search
  const tareas = (tareasData?.data ?? []).filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.titulo.toLowerCase().includes(q) ||
      (t.cliente?.razon_social ?? '').toLowerCase().includes(q) ||
      (t.asunto?.nombre ?? '').toLowerCase().includes(q)
    );
  });

  const totalPages = tareasData?.pagination.totalPages ?? 1;

  return (
    <div className="flex gap-0 min-h-full">
      {/* Left sidebar */}
      <aside className="w-48 flex-shrink-0 pr-4">
        <nav className="flex flex-col gap-1">
          {(Object.keys(FILTER_LABELS) as FilterView[]).map((view) => (
            <button
              key={view}
              onClick={() => {
                setActiveView(view);
                setPage(1);
              }}
              className={[
                'text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
                activeView === view
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100',
              ].join(' ')}
            >
              {FILTER_LABELS[view]}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="w-48">
            <Select
              options={clienteOptions}
              placeholder="Todos los clientes"
              value={clienteId ?? ''}
              onChange={(e) => {
                setClienteId(e.target.value ? parseInt(e.target.value, 10) : null);
                setAsuntoId(null);
                setPage(1);
              }}
            />
          </div>
          {clienteId && (
            <div className="w-48">
              <Select
                options={asuntoOptions}
                placeholder="Todos los asuntos"
                value={asuntoId ?? ''}
                onChange={(e) => {
                  setAsuntoId(e.target.value ? parseInt(e.target.value, 10) : null);
                  setPage(1);
                }}
              />
            </div>
          )}
          <Button
            onClick={() => {
              setEditingTarea(undefined);
              setTaskModalOpen(true);
            }}
          >
            + Nueva Tarea
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-8 px-3 py-3" />
                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Título</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Asunto</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Inicio</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Vence</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">!</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Est.</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Reg.</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    Cargando...
                  </td>
                </tr>
              )}
              {!isLoading && tareas.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    Sin tareas
                  </td>
                </tr>
              )}
              {!isLoading &&
                tareas.map((t) => {
                  const isOverdue =
                    t.fecha_vencimiento &&
                    !t.finalizada &&
                    isPast(parseISO(t.fecha_vencimiento));
                  const imp = t.importancia ? IMPORTANCIA_DISPLAY[t.importancia] : null;

                  return (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                      {/* Toggle finalizada */}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleToggleFinalizada(t)}
                          title={t.finalizada ? 'Marcar como activa' : 'Marcar como finalizada'}
                          className={[
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                            t.finalizada
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-400',
                          ].join(' ')}
                        >
                          {t.finalizada && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      </td>

                      {/* Titulo */}
                      <td className="px-3 py-2.5 max-w-[180px]">
                        <span
                          className={[
                            'text-sm font-medium truncate block',
                            t.finalizada ? 'line-through text-gray-400' : 'text-gray-800',
                          ].join(' ')}
                        >
                          {t.titulo}
                        </span>
                        {t.usuario && (
                          <span className="text-xs text-gray-400">{t.usuario.nombre}</span>
                        )}
                      </td>

                      {/* Cliente */}
                      <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[120px] truncate">
                        {t.cliente?.razon_social ?? '—'}
                      </td>

                      {/* Asunto */}
                      <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[100px] truncate">
                        {t.asunto?.codigo ?? '—'}
                      </td>

                      {/* Fecha inicio */}
                      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {t.fecha_inicio
                          ? format(parseISO(t.fecha_inicio), 'dd/MM/yy')
                          : '—'}
                      </td>

                      {/* Vencimiento */}
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {t.fecha_vencimiento ? (
                          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {format(parseISO(t.fecha_vencimiento), 'dd/MM/yy')}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Importancia */}
                      <td className="px-3 py-2.5 text-center">
                        {imp ? (
                          <span className={imp.className}>{imp.label}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Estimado */}
                      <td className="px-3 py-2.5 text-right font-mono text-gray-500 text-xs">
                        {t.estimado_minutos > 0 ? minutesToHHMM(t.estimado_minutos) : '—'}
                      </td>

                      {/* Tiempo reg */}
                      <td className="px-3 py-2.5 text-right text-xs">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-mono text-gray-400">0:00</span>
                          <button
                            onClick={() => openTimeModalForTarea(t)}
                            title="Registrar tiempo"
                            className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center hover:bg-teal-200 transition-colors text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTarea(t);
                              setTaskModalOpen(true);
                            }}
                            className="text-xs text-gray-500 hover:text-teal-600 px-1.5 py-1 rounded hover:bg-gray-100"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleArchive(t)}
                            className="text-xs text-gray-500 hover:text-orange-600 px-1.5 py-1 rounded hover:bg-gray-100"
                          >
                            {t.archivada ? 'Desarchivar' : 'Archivar'}
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="text-xs text-gray-500 hover:text-red-600 px-1.5 py-1 rounded hover:bg-gray-100"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* Pagination */}
          {tareasData && tareasData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {tareasData.pagination.total} tareas — Página {page} de {totalPages}
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
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        tarea={editingTarea}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tareas'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />

      {/* Time Modal (from task) */}
      <TimeModal
        isOpen={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        defaultClienteId={timeModalDefaults.clienteId}
        defaultAsuntoId={timeModalDefaults.asuntoId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tiempos'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />
    </div>
  );
}
