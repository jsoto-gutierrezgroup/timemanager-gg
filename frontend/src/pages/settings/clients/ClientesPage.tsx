import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { clienteService } from '../../../services/clienteService';
import { userService } from '../../../services/userService';
import { Cliente } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { ClienteModal } from '../../wip/ClienteModal';

type Tab = 'clientes';

function ActionsMenu({ cliente, onEdit, onInactivate }: { cliente: Cliente; onEdit: () => void; onInactivate: () => void }) {
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
          <div className="absolute right-0 z-20 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-sm">
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
              onClick={() => { setOpen(false); onEdit(); }}
            >
              Editar
            </button>
            {cliente.estado === 'Activo' && (
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600"
                onClick={() => { setOpen(false); onInactivate(); }}
              >
                Inactivar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ClientesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterResponsable, setFilterResponsable] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const { data: clientesRes, isLoading } = useQuery({
    queryKey: ['clientes', page, search, filterEstado, filterResponsable, filterTipo],
    queryFn: () =>
      clienteService.getClientes({
        page,
        limit: 10,
        search: search || undefined,
        estado: (filterEstado as 'Activo' | 'Inactivo') || undefined,
      }),
  });

  const { data: usersData = [] } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userService.getUsers({ limit: 200 }).then(res => res.data || []),
  });

  const inactivateMutation = useMutation({
    mutationFn: (cliente: Cliente) =>
      clienteService.updateCliente(cliente.id, {
        estado: cliente.estado === 'Activo' ? 'Inactivo' : 'Activo'
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
  });

  const clientes = clientesRes?.data ?? [];
  const pagination = clientesRes?.pagination;

  function openCreate() {
    setEditingCliente(null);
    setIsModalOpen(true);
  }

  function openEdit(cliente: Cliente) {
    setEditingCliente(cliente);
    setIsModalOpen(true);
  }

  function handleInactivate(cliente: Cliente) {
    if (window.confirm(`¿Cambiar estado de "${cliente.razon_social}"?`)) {
      inactivateMutation.mutate(cliente);
    }
  }

  function clearFilters() {
    setSearch('');
    setFilterEstado('');
    setFilterResponsable('');
    setFilterTipo('');
    setPage(1);
  }

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  }

  // Get unique tipos
  const tiposSet = new Set(clientes.map(c => c.tipo).filter(Boolean));
  const tipoOptions = Array.from(tiposSet).map(t => ({ value: t!, label: t! }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Clientes</h2>
        <p className="text-sm text-gray-500 mt-1">Gestión de clientes y contactos</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex-1 min-w-48">
          <Input
            placeholder="Buscar por razón social o código..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-36">
          <Select
            options={[
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
            ]}
            placeholder="Estado"
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-44">
          <Select
            options={usersData.map((u) => ({ value: String(u.id), label: u.nombre }))}
            placeholder="Responsable"
            value={filterResponsable}
            onChange={(e) => { setFilterResponsable(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-36">
          <Select
            options={tipoOptions}
            placeholder="Tipo"
            value={filterTipo}
            onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}
          />
        </div>
        {(search || filterEstado || filterResponsable || filterTipo) && (
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm">
            Exportar XLS
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            + Crear Cliente
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Razón social</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre comercial</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">País</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ciudad</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Sector</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Responsable</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha creación</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                      No se encontraron clientes
                    </td>
                  </tr>
                )}
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-teal-700">{cliente.codigo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{cliente.razon_social}</td>
                    <td className="px-4 py-3 text-gray-600">{cliente.nombre_comercial ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{cliente.pais ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{cliente.ciudad ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{cliente.sector ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{cliente.tipo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{cliente.responsable?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={cliente.estado === 'Activo' ? 'success' : 'danger'}>
                        {cliente.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(cliente.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <ActionsMenu
                        cliente={cliente}
                        onEdit={() => openEdit(cliente)}
                        onInactivate={() => handleInactivate(cliente)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>{pagination.total} registros</span>
              <div className="flex gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
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
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ClienteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cliente={editingCliente ?? undefined}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['clientes'] })}
      />
    </div>
  );
}
