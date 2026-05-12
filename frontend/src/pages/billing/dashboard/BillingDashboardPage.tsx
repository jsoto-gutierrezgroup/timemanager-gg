import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import {
  billingDashboardService,
  type BillingDashboardParams,
  type ApprovalTableItem,
  type PodioRankingItem,
} from '../../../services/billingDashboardService';
import { downloadFile } from '../../../utils/downloadFile';
import { minutesToHHMM } from '../../../utils/time';
import { clienteService } from '../../../services/clienteService';
import { asuntoService } from '../../../services/asuntoService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TabId = 'aprobacion' | 'podio';
type PeriodoId = 'mes' | '3meses' | 'anio';

const PERIODO_LABELS: Record<PeriodoId, string> = {
  mes: 'Último mes',
  '3meses': 'Últimos 3 meses',
  anio: 'Este año',
};

const MEDALLAS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

// ─── Approval Tab ─────────────────────────────────────────────────────────────

interface AprobacionTabProps {
  filters: BillingDashboardParams;
  onFiltersChange: (f: Partial<BillingDashboardParams>) => void;
}

function AprobacionTab({ filters, onFiltersChange }: AprobacionTabProps) {
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['billing-dashboard-stats', 'aprobacion', filters],
    queryFn: () => billingDashboardService.getStats(filters),
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ['billing-dashboard-table', filters, page],
    queryFn: () => billingDashboardService.getApprovalTable({ ...filters, page, limit: 10 }),
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 100 }),
  });

  const { data: asuntosData } = useQuery({
    queryKey: ['asuntos', filters.cliente_id],
    queryFn: () => asuntoService.getAsuntos({ cliente_id: filters.cliente_id!, estado: 'Activo', limit: 100 }),
    enabled: !!filters.cliente_id,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () =>
      import('../../../services/api').then(({ api }) =>
        api.get('/users', { params: { limit: 100 } }).then((r) => r.data)
      ),
  });

  const userOptions = (
    (usersData as { data?: { id: number; nombre: string }[] })?.data ?? []
  ).map((u) => ({ value: u.id, label: u.nombre }));

  const clienteOptions = (clientesData?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.codigo} — ${c.razon_social}`,
  }));

  const asuntoOptions = (asuntosData?.data ?? []).map((a) => ({
    value: a.id,
    label: `${a.codigo} — ${a.nombre}`,
  }));

  const aprobacion = stats?.aprobacion;
  const totalPendientes = aprobacion?.total_pendientes ?? 0;
  const totalAprobados = aprobacion?.total_aprobados ?? 0;
  const totalHorasPendientes = (aprobacion?.resumen ?? [])
    .reduce((s, r) => s + r.horas_facturables, 0);

  const handleExport = async () => {
    try {
      await downloadFile('/export/approval/xls', 'aprobacion.xlsx', filters as Record<string, unknown>);
    } catch {
      // silently fail — user will see no download
    }
  };

  const totalPages = tableData?.pagination.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Select
            label="1er Aprobador"
            options={userOptions}
            placeholder="Todos"
            value={filters.primer_aprobador_id ?? ''}
            onChange={(e) => onFiltersChange({ primer_aprobador_id: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          />
          <Select
            label="2do Aprobador"
            options={userOptions}
            placeholder="Todos"
            value={filters.segundo_aprobador_id ?? ''}
            onChange={(e) => onFiltersChange({ segundo_aprobador_id: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          />
          <Select
            label="Cliente"
            options={clienteOptions}
            placeholder="Todos"
            value={filters.cliente_id ?? ''}
            onChange={(e) => onFiltersChange({ cliente_id: e.target.value ? parseInt(e.target.value, 10) : undefined, asunto_id: undefined })}
          />
          <Select
            label="Asunto"
            options={asuntoOptions}
            placeholder={filters.cliente_id ? 'Todos' : 'Seleccione cliente'}
            disabled={!filters.cliente_id}
            value={filters.asunto_id ?? ''}
            onChange={(e) => onFiltersChange({ asunto_id: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha inicio</label>
            <input
              type="date"
              value={filters.fecha_inicio ?? ''}
              onChange={(e) => onFiltersChange({ fecha_inicio: e.target.value || undefined })}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha fin</label>
            <input
              type="date"
              value={filters.fecha_fin ?? ''}
              onChange={(e) => onFiltersChange({ fecha_fin: e.target.value || undefined })}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {statsLoading ? (
        <div className="text-center text-gray-400 py-4">Cargando estadísticas...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="Total pendientes" value={totalPendientes} sub="tiempos en estado Activo" />
          <SummaryCard label="Horas pendientes" value={minutesToHHMM(totalHorasPendientes)} sub="facturables en estado Activo" />
          <SummaryCard label="Total aprobados" value={totalAprobados} sub="tiempos en estado Aprobado" />
        </div>
      )}

      {/* Table + Export */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Detalle por usuario</h3>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Exportar XLS
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Usuario</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total tiempos</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Horas Facturables</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">% Aprobado</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tableLoading && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">Cargando...</td>
              </tr>
            )}
            {!tableLoading && (tableData?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">Sin registros</td>
              </tr>
            )}
            {!tableLoading && (tableData?.data ?? []).map((row: ApprovalTableItem) => {
              const pctAprobado = row.total_tiempos > 0
                ? Math.round((row.count_aprobados / row.total_tiempos) * 100)
                : 0;
              return (
                <tr key={row.usuario_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.nombre}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{row.total_tiempos}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">{minutesToHHMM(row.horas_facturables)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-500 h-2 rounded-full"
                          style={{ width: `${pctAprobado}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-10 text-right">{pctAprobado}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={row.count_aprobados === row.total_tiempos ? 'success' : 'default'}>
                      {row.count_aprobados}/{row.total_tiempos} aprobados
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {tableData && tableData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {tableData.pagination.total} usuarios — Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Podio Tab ────────────────────────────────────────────────────────────────

function PodioTab() {
  const [periodo, setPeriodo] = useState<PeriodoId>('mes');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['billing-dashboard-stats', 'podio', periodo],
    queryFn: () => billingDashboardService.getStats({ periodo }),
  });

  const rankings = stats?.podio.rankings ?? [];
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="flex flex-col gap-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(Object.keys(PERIODO_LABELS) as PeriodoId[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
              periodo === p
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400',
            ].join(' ')}
          >
            {PERIODO_LABELS[p]}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center text-gray-400 py-10">Cargando podio...</div>}

      {!isLoading && rankings.length === 0 && (
        <div className="text-center text-gray-400 py-10">
          No hay tiempos facturados en el período seleccionado
        </div>
      )}

      {!isLoading && rankings.length > 0 && (
        <>
          {/* Podio visual — top 3 */}
          <div className="flex items-end justify-center gap-6">
            {/* Re-order: 2nd, 1st, 3rd for visual podium shape */}
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((r: PodioRankingItem) => {
              const isFirst = r.posicion === 1;
              const heights: Record<number, string> = { 1: 'h-36', 2: 'h-24', 3: 'h-20' };
              return (
                <div key={r.usuario_id} className="flex flex-col items-center gap-2">
                  <div className="text-3xl">{MEDALLAS[r.posicion] ?? ''}</div>
                  <div
                    className={[
                      'w-28 rounded-t-xl flex flex-col items-center justify-center gap-1 text-white',
                      heights[r.posicion] ?? 'h-16',
                      isFirst ? 'bg-teal-600' : 'bg-teal-400',
                    ].join(' ')}
                  >
                    <span className="text-xl font-bold">{minutesToHHMM(r.horas_facturadas)}</span>
                    <span className="text-xs opacity-80">horas</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-800 text-center max-w-[112px]">
                    {r.nombre}
                  </div>
                  <div className="text-xs text-gray-500">#{r.posicion}</div>
                </div>
              );
            })}
          </div>

          {/* Full ranking table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Ranking completo</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Posición</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Horas Facturadas</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r: PodioRankingItem) => (
                  <tr key={r.usuario_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-gray-700 font-medium">
                        {MEDALLAS[r.posicion] && <span>{MEDALLAS[r.posicion]}</span>}
                        #{r.posicion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{r.nombre}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{minutesToHHMM(r.horas_facturadas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BillingDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('aprobacion');
  const [filters, setFilters] = useState<BillingDashboardParams>({});

  const handleFiltersChange = (partial: Partial<BillingDashboardParams>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard de Facturación</h1>
          <div className="flex gap-2 mt-1">
            {(['aprobacion', 'podio'] as TabId[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  'text-sm pb-0.5 font-medium capitalize',
                  activeTab === tab
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-400',
                ].join(' ')}
              >
                {tab === 'aprobacion' ? 'Aprobación' : 'Podio'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'aprobacion' && (
        <AprobacionTab filters={filters} onFiltersChange={handleFiltersChange} />
      )}
      {activeTab === 'podio' && <PodioTab />}
    </div>
  );
}
