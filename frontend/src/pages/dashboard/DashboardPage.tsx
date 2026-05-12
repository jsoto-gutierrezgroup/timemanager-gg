import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService, DashboardPeriodo } from '../../services/dashboardService';
import { tareaService } from '../../services/tareaService';
import { minutesToHHMM, minutesToLabel, secondsToDisplay } from '../../utils/time';
import { useTimer } from '../../hooks/useTimer';
import { TimeModal } from '../times/TimeModal';

const PERIOD_LABELS: Record<DashboardPeriodo, string> = {
  ultima_semana: 'Última semana',
  ultimo_mes: 'Último mes',
  ultimos_3_meses: 'Últimos 3 meses',
};

const PIE_COLORS = ['#00897B', '#26A69A', '#4DB6AC', '#80CBC4', '#B2DFDB'];

function KpiCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

function PeriodPills({
  value,
  onChange,
}: {
  value: DashboardPeriodo;
  onChange: (v: DashboardPeriodo) => void;
}) {
  return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {(Object.keys(PERIOD_LABELS) as DashboardPeriodo[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={[
            'px-2 py-0.5 rounded text-xs font-medium transition-colors',
            value === p
              ? 'bg-teal-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ].join(' ')}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ value, max, colorClass = 'bg-teal-600' }: { value: number; max: number; colorClass?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div
        className={`h-2 rounded-full transition-all ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function DashboardPage() {
  const [periodo, setPeriodo] = useState<DashboardPeriodo>('ultimo_mes');
  const [taskFilter, setTaskFilter] = useState<'activas' | 'todas' | 'finalizadas'>('activas');
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [prefilledCliente, setPrefilledCliente] = useState<number | null>(null);
  const [prefilledAsunto, setPrefilledAsunto] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const timer = useTimer();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard', 'stats', periodo],
    queryFn: () => dashboardService.getStats(periodo),
  });

  const { data: tareasData } = useQuery({
    queryKey: ['tareas', 'dashboard', taskFilter],
    queryFn: () => {
      if (taskFilter === 'activas') {
        return tareaService.getTareas({ finalizada: false, archivada: false, limit: 10 });
      } else if (taskFilter === 'finalizadas') {
        return tareaService.getTareas({ finalizada: true, archivada: false, limit: 10 });
      }
      return tareaService.getTareas({ archivada: false, limit: 10 });
    },
  });

  // Derive displayed task count from stats
  const displayedCount =
    taskFilter === 'activas'
      ? stats?.tareasActivas
      : taskFilter === 'finalizadas'
      ? stats?.tareasFinalizadas
      : stats?.totalTareas;

  // Ejecucion card values
  const pctEjecucion =
    stats && stats.horasEstimadas > 0
      ? Math.round((stats.horasEjecutadas / stats.horasEstimadas) * 100)
      : 0;

  // Capacidad card values
  const pctCapacidad =
    stats && stats.capacidadMinutos > 0
      ? Math.round((stats.horasEjecutadas / stats.capacidadMinutos) * 100)
      : 0;

  // Pie chart data
  const pieData =
    stats?.topClientes.map((c) => ({
      name: c.nombre,
      value: c.minutos,
      label: `${minutesToHHMM(c.minutos)}h`,
    })) ?? [];

  // Bar chart data
  const barData =
    stats?.horasPorDia.map((d) => ({
      fecha: d.fecha.slice(5), // MM-DD
      Facturables: d.facturables,
      'No facturables': d.noFacturables,
    })) ?? [];

  const handlePlayTask = (clienteId: number, asuntoId: number) => {
    if (timer.isRunning) {
      timer.stop();
    }
    setPrefilledCliente(clienteId);
    setPrefilledAsunto(asuntoId);
    timer.start(clienteId, asuntoId);
  };

  return (
    <div className="flex gap-4 min-h-full">
      {/* Left panel — active tasks */}
      <aside className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-fit">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Tareas Activas</h3>
        {tareasData?.data.length === 0 && (
          <p className="text-xs text-gray-400">Sin tareas activas</p>
        )}
        <ul className="flex flex-col gap-2">
          {(tareasData?.data ?? []).slice(0, 10).map((tarea) => {
            const isActive =
              timer.isRunning &&
              timer.clienteId === tarea.cliente_id &&
              timer.asuntoId === tarea.asunto_id;

            return (
              <li
                key={tarea.id}
                className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{tarea.titulo}</p>
                  <p className="text-xs text-gray-400 truncate">{tarea.cliente?.razon_social}</p>
                  {isActive && (
                    <p className="text-xs font-mono text-green-600 mt-0.5">
                      {secondsToDisplay(timer.elapsedSeconds)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handlePlayTask(tarea.cliente_id, tarea.asunto_id)}
                  title={isActive ? 'Cronómetro activo' : 'Iniciar cronómetro'}
                  className={[
                    'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                    isActive
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-500 hover:bg-teal-100 hover:text-teal-600',
                  ].join(' ')}
                >
                  {isActive ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {timer.isRunning && (
          <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
            <p className="text-xs font-semibold text-teal-700 mb-1">Cronómetro activo</p>
            <p className="text-lg font-mono text-teal-800 font-bold">
              {secondsToDisplay(timer.elapsedSeconds)}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  const mins = timer.stop();
                  if (timer.clienteId && timer.asuntoId) {
                    setPrefilledCliente(timer.clienteId);
                    setPrefilledAsunto(timer.asuntoId);
                  }
                  void mins;
                  setTimeModalOpen(true);
                }}
                className="flex-1 text-xs px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={() => timer.reset()}
                className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        {/* KPI cards row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Tareas KPI */}
          <KpiCard>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tareas</p>
            <p className="text-4xl font-bold text-teal-600 mt-1">
              {loadingStats ? '—' : (displayedCount ?? 0)}
            </p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {(['activas', 'todas', 'finalizadas'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={[
                    'px-2 py-0.5 rounded text-xs font-medium capitalize transition-colors',
                    taskFilter === f
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </KpiCard>

          {/* Ejecucion KPI */}
          <KpiCard>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ejecución</p>
            <p className="text-4xl font-bold text-teal-600 mt-1">
              {loadingStats ? '—' : `${pctEjecucion}%`}
            </p>
            <ProgressBar value={stats?.horasEjecutadas ?? 0} max={stats?.horasEstimadas ?? 0} />
            <p className="text-xs text-gray-400 mt-1">
              {minutesToLabel(stats?.horasEjecutadas ?? 0)} / {minutesToLabel(stats?.horasEstimadas ?? 0)}
            </p>
            <PeriodPills value={periodo} onChange={setPeriodo} />
          </KpiCard>

          {/* Capacidad KPI */}
          <KpiCard>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Capacidad</p>
            <p className="text-4xl font-bold text-teal-600 mt-1">
              {loadingStats ? '—' : `${pctCapacidad}%`}
            </p>
            <ProgressBar
              value={stats?.horasEjecutadas ?? 0}
              max={stats?.capacidadMinutos ?? 0}
              colorClass={pctCapacidad > 100 ? 'bg-red-500' : 'bg-teal-600'}
            />
            <p className="text-xs text-gray-400 mt-1">
              {minutesToLabel(stats?.horasEjecutadas ?? 0)} / {minutesToLabel(stats?.capacidadMinutos ?? 0)} disponibles
            </p>
            <PeriodPills value={periodo} onChange={setPeriodo} />
          </KpiCard>
        </div>

        {/* Period selector (shared label) */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Período:</span>
          {(Object.keys(PERIOD_LABELS) as DashboardPeriodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={[
                'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                periodo === p
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Pie chart — Top 5 Clientes */}
          <KpiCard>
            <p className="text-sm font-semibold text-gray-700 mb-3">Top 5 Clientes</p>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Sin datos para el período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, label }) => `${name.slice(0, 12)}: ${label}`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [minutesToHHMM(value) + 'h', 'Horas']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </KpiCard>

          {/* Bar chart — Horas Registradas */}
          <KpiCard>
            <p className="text-sm font-semibold text-gray-700 mb-3">Horas Registradas</p>
            {barData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Sin datos para el período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 10 }}
                    interval={Math.floor(barData.length / 7)}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => minutesToHHMM(v)} />
                  <Tooltip
                    formatter={(value: number, name: string) => [minutesToHHMM(value) + 'h', name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={480} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '8h', fontSize: 10, fill: '#ef4444' }} />
                  <Bar dataKey="Facturables" stackId="a" fill="#00897B" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="No facturables" stackId="a" fill="#9CA3AF" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </KpiCard>
        </div>
      </div>

      {/* Time modal (for saving timer) */}
      {timeModalOpen && (
        <TimeModal
          isOpen={timeModalOpen}
          onClose={() => {
            setTimeModalOpen(false);
            setPrefilledCliente(null);
            setPrefilledAsunto(null);
          }}
          defaultClienteId={prefilledCliente ?? undefined}
          defaultAsuntoId={prefilledAsunto ?? undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tiempos'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setTimeModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
