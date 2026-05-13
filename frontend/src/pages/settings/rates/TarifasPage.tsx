import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { tarifasService, Tarifa } from '../../../services/tarifasService';
import { userService } from '../../../services/userService';
import { clienteService } from '../../../services/clienteService';
import { categoriesService } from '../../../services/settingsService';
import { formatCurrency } from '../../../utils/currency';
import { TarifaModal } from './TarifaModal';

type Tab = 'usuario' | 'categoria' | 'cliente';

function ActionsMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800"
      >
        ···
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-sm">
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
              onClick={() => { setOpen(false); onEdit(); }}
            >
              Editar
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600"
              onClick={() => { setOpen(false); onDelete(); }}
            >
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TarifasPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('usuario');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarifa, setEditingTarifa] = useState<Tarifa | null>(null);

  // ─── POR USUARIO ───────────────────────────────────────────────────────────

  const [filterUsuarioPU, setFilterUsuarioPU] = useState('');
  const [filterClientePU, setFilterClientePU] = useState('');
  const [filterMonedaPU, setFilterMonedaPU] = useState('');

  const { data: usuariosData = [] } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userService.getUsers({ limit: 200 }).then(res => res.data || []),
  });

  const { data: clientesData = [] } = useQuery({
    queryKey: ['clientes', 'all'],
    queryFn: () => clienteService.getClientes({ limit: 200 }).then(res => res.data || []),
  });

  const { data: tarifasPURes } = useQuery({
    queryKey: ['tarifas', 'usuario', { filterUsuarioPU, filterClientePU, filterMonedaPU, page }],
    queryFn: () =>
      tarifasService.getTarifas({
        usuario_id: filterUsuarioPU ? parseInt(filterUsuarioPU) : undefined,
        cliente_id: filterClientePU ? parseInt(filterClientePU) : undefined,
        moneda: (filterMonedaPU as any) || undefined,
        page,
        limit: 10,
      }),
    enabled: activeTab === 'usuario',
  });

  // ─── POR CATEGORÍA ────────────────────────────────────────────────────────

  const [filterCategoriaPC, setFilterCategoriaPC] = useState('');
  const [filterClientePC, setFilterClientePC] = useState('');
  const [filterMonedaPC, setFilterMonedaPC] = useState('');

  const { data: categoriasData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getAll(),
  });

  const { data: tarifasPCRes } = useQuery({
    queryKey: ['tarifas', 'categoria', { filterCategoriaPC, filterClientePC, filterMonedaPC, page }],
    queryFn: () =>
      tarifasService.getTarifas({
        categoria_id: filterCategoriaPC ? parseInt(filterCategoriaPC) : undefined,
        cliente_id: filterClientePC ? parseInt(filterClientePC) : undefined,
        moneda: (filterMonedaPC as any) || undefined,
        page,
        limit: 10,
      }),
    enabled: activeTab === 'categoria',
  });

  // ─── POR CLIENTE ──────────────────────────────────────────────────────────

  const [filterClientePCl, setFilterClientePCl] = useState('');
  const [filterMonedaPCl, setFilterMonedaPCl] = useState('');

  const { data: tarifasPClRes } = useQuery({
    queryKey: ['tarifas', 'cliente', { filterClientePCl, filterMonedaPCl, page }],
    queryFn: () =>
      tarifasService.getTarifas({
        cliente_id: filterClientePCl ? parseInt(filterClientePCl) : undefined,
        moneda: (filterMonedaPCl as any) || undefined,
        page,
        limit: 10,
      }),
    enabled: activeTab === 'cliente',
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tarifasService.deleteTarifa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarifas'] });
    },
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function handleOpenCreate() {
    setEditingTarifa(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(tarifa: Tarifa) {
    setEditingTarifa(tarifa);
    setIsModalOpen(true);
  }

  function handleDelete(id: number) {
    if (window.confirm('¿Eliminar esta tarifa?')) {
      deleteMutation.mutate(id);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'usuario', label: 'Por Usuario' },
    { id: 'categoria', label: 'Por Categoría' },
    { id: 'cliente', label: 'Por Cliente' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Tarifas Horarias</h2>
        <p className="text-sm text-gray-500 mt-1">Gestión de tarifas horarias por usuario, categoría o cliente</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* POR USUARIO TAB */}
      {activeTab === 'usuario' && (
        <TabPorUsuario
          usuariosData={usuariosData}
          clientesData={clientesData}
          filterUsuarioPU={filterUsuarioPU}
          setFilterUsuarioPU={setFilterUsuarioPU}
          filterClientePU={filterClientePU}
          setFilterClientePU={setFilterClientePU}
          filterMonedaPU={filterMonedaPU}
          setFilterMonedaPU={setFilterMonedaPU}
          tarifasRes={tarifasPURes}
          page={page}
          setPage={setPage}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      )}

      {/* POR CATEGORÍA TAB */}
      {activeTab === 'categoria' && (
        <TabPorCategoria
          categoriasData={categoriasData}
          clientesData={clientesData}
          filterCategoriaPC={filterCategoriaPC}
          setFilterCategoriaPC={setFilterCategoriaPC}
          filterClientePC={filterClientePC}
          setFilterClientePC={setFilterClientePC}
          filterMonedaPC={filterMonedaPC}
          setFilterMonedaPC={setFilterMonedaPC}
          tarifasRes={tarifasPCRes}
          page={page}
          setPage={setPage}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      )}

      {/* POR CLIENTE TAB */}
      {activeTab === 'cliente' && (
        <TabPorCliente
          clientesData={clientesData}
          filterClientePCl={filterClientePCl}
          setFilterClientePCl={setFilterClientePCl}
          filterMonedaPCl={filterMonedaPCl}
          setFilterMonedaPCl={setFilterMonedaPCl}
          tarifasRes={tarifasPClRes}
          page={page}
          setPage={setPage}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      )}

      <TarifaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tarifa={editingTarifa}
        currentTab={activeTab}
        usuariosData={usuariosData}
        categoriasData={categoriasData}
        clientesData={clientesData}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tarifas'] })}
      />
    </div>
  );
}

// ─── TAB COMPONENTS ────────────────────────────────────────────────────────

interface TabProps {
  page: number;
  setPage: (p: number) => void;
  onOpenCreate: () => void;
  onOpenEdit: (t: Tarifa) => void;
  onDelete: (id: number) => void;
  tarifasRes: any;
}

function TabPorUsuario({
  usuariosData,
  clientesData,
  filterUsuarioPU,
  setFilterUsuarioPU,
  filterClientePU,
  setFilterClientePU,
  filterMonedaPU,
  setFilterMonedaPU,
  page,
  setPage,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  tarifasRes,
}: TabProps & {
  usuariosData: any[];
  clientesData: any[];
  filterUsuarioPU: string;
  setFilterUsuarioPU: (s: string) => void;
  filterClientePU: string;
  setFilterClientePU: (s: string) => void;
  filterMonedaPU: string;
  setFilterMonedaPU: (s: string) => void;
}) {
  const tarifas = tarifasRes?.data ?? [];
  const pagination = tarifasRes?.pagination;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="w-44">
          <Select
            options={usuariosData.map((u) => ({ value: String(u.id), label: u.nombre }))}
            placeholder="Seleccionar usuario"
            value={filterUsuarioPU}
            onChange={(e) => { setFilterUsuarioPU(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-44">
          <Select
            options={clientesData.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            placeholder="Cliente (opcional)"
            value={filterClientePU}
            onChange={(e) => { setFilterClientePU(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-32">
          <Select
            options={[
              { value: 'COP', label: 'COP' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
            placeholder="Moneda"
            value={filterMonedaPU}
            onChange={(e) => { setFilterMonedaPU(e.target.value); setPage(1); }}
          />
        </div>
        {(filterUsuarioPU || filterClientePU || filterMonedaPU) && (
          <Button variant="secondary" size="sm" onClick={() => {
            setFilterUsuarioPU('');
            setFilterClientePU('');
            setFilterMonedaPU('');
            setPage(1);
          }}>
            Limpiar
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onOpenCreate} className="ml-auto">
          + Crear Tarifa
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Moneda</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tarifas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  No hay tarifas
                </td>
              </tr>
            )}
            {tarifas.map((tarifa: Tarifa) => (
              <tr key={tarifa.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{tarifa.usuario?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{tarifa.cliente?.razon_social ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(tarifa.valor, tarifa.moneda)}</td>
                <td className="px-4 py-3 text-gray-500">{tarifa.moneda}</td>
                <td className="px-4 py-3 text-right">
                  <ActionsMenu
                    onEdit={() => onOpenEdit(tarifa)}
                    onDelete={() => onDelete(tarifa.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination pagination={pagination} page={page} setPage={setPage} />
    </div>
  );
}

function TabPorCategoria({
  categoriasData,
  clientesData,
  filterCategoriaPC,
  setFilterCategoriaPC,
  filterClientePC,
  setFilterClientePC,
  filterMonedaPC,
  setFilterMonedaPC,
  page,
  setPage,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  tarifasRes,
}: TabProps & {
  categoriasData: any[];
  clientesData: any[];
  filterCategoriaPC: string;
  setFilterCategoriaPC: (s: string) => void;
  filterClientePC: string;
  setFilterClientePC: (s: string) => void;
  filterMonedaPC: string;
  setFilterMonedaPC: (s: string) => void;
}) {
  const tarifas = tarifasRes?.data ?? [];
  const pagination = tarifasRes?.pagination;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="w-44">
          <Select
            options={categoriasData.map((c) => ({ value: String(c.id), label: c.nombre }))}
            placeholder="Seleccionar categoría"
            value={filterCategoriaPC}
            onChange={(e) => { setFilterCategoriaPC(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-44">
          <Select
            options={clientesData.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            placeholder="Cliente (opcional)"
            value={filterClientePC}
            onChange={(e) => { setFilterClientePC(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-32">
          <Select
            options={[
              { value: 'COP', label: 'COP' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
            placeholder="Moneda"
            value={filterMonedaPC}
            onChange={(e) => { setFilterMonedaPC(e.target.value); setPage(1); }}
          />
        </div>
        {(filterCategoriaPC || filterClientePC || filterMonedaPC) && (
          <Button variant="secondary" size="sm" onClick={() => {
            setFilterCategoriaPC('');
            setFilterClientePC('');
            setFilterMonedaPC('');
            setPage(1);
          }}>
            Limpiar
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onOpenCreate} className="ml-auto">
          + Crear Tarifa
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Categoría</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Moneda</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tarifas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  No hay tarifas
                </td>
              </tr>
            )}
            {tarifas.map((tarifa: Tarifa) => (
              <tr key={tarifa.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{tarifa.categoria?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{tarifa.cliente?.razon_social ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(tarifa.valor, tarifa.moneda)}</td>
                <td className="px-4 py-3 text-gray-500">{tarifa.moneda}</td>
                <td className="px-4 py-3 text-right">
                  <ActionsMenu
                    onEdit={() => onOpenEdit(tarifa)}
                    onDelete={() => onDelete(tarifa.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination pagination={pagination} page={page} setPage={setPage} />
    </div>
  );
}

function TabPorCliente({
  clientesData,
  filterClientePCl,
  setFilterClientePCl,
  filterMonedaPCl,
  setFilterMonedaPCl,
  page,
  setPage,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  tarifasRes,
}: TabProps & {
  clientesData: any[];
  filterClientePCl: string;
  setFilterClientePCl: (s: string) => void;
  filterMonedaPCl: string;
  setFilterMonedaPCl: (s: string) => void;
}) {
  const tarifas = tarifasRes?.data ?? [];
  const pagination = tarifasRes?.pagination;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="w-44">
          <Select
            options={clientesData.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            placeholder="Seleccionar cliente"
            value={filterClientePCl}
            onChange={(e) => { setFilterClientePCl(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-32">
          <Select
            options={[
              { value: 'COP', label: 'COP' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
            placeholder="Moneda"
            value={filterMonedaPCl}
            onChange={(e) => { setFilterMonedaPCl(e.target.value); setPage(1); }}
          />
        </div>
        {(filterClientePCl || filterMonedaPCl) && (
          <Button variant="secondary" size="sm" onClick={() => {
            setFilterClientePCl('');
            setFilterMonedaPCl('');
            setPage(1);
          }}>
            Limpiar
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onOpenCreate} className="ml-auto">
          + Crear Tarifa
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Moneda</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tarifas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                  No hay tarifas
                </td>
              </tr>
            )}
            {tarifas.map((tarifa: Tarifa) => (
              <tr key={tarifa.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{tarifa.cliente?.razon_social ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(tarifa.valor, tarifa.moneda)}</td>
                <td className="px-4 py-3 text-gray-500">{tarifa.moneda}</td>
                <td className="px-4 py-3 text-right">
                  <ActionsMenu
                    onEdit={() => onOpenEdit(tarifa)}
                    onDelete={() => onDelete(tarifa.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination pagination={pagination} page={page} setPage={setPage} />
    </div>
  );
}

function Pagination({ pagination, page, setPage }: { pagination: any; page: number; setPage: (p: number) => void }) {
  if (!pagination || pagination.totalPages <= 0) return null;

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>{pagination.total} registros</span>
      <div className="flex gap-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Anterior
        </Button>
        {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={[
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                p === page
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              {p}
            </button>
          );
        })}
        {pagination.totalPages > 7 && (
          <span className="px-2 py-1.5 text-gray-400">...</span>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={page === pagination.totalPages}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
