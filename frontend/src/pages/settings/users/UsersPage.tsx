import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { userService } from '../../../services/userService';
import { rolesService, categoriesService, areasService } from '../../../services/settingsService';
import { User } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { UserModal } from './UserModal';
import { RolesTab } from './RolesTab';
import { CategoriesTab } from './CategoriesTab';
import { AreasTab } from './AreasTab';
import { AusenciasTab } from './AusenciasTab';

type Tab = 'usuarios' | 'roles' | 'categorias' | 'areas' | 'ausencias';

const tabs: { id: Tab; label: string }[] = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'roles', label: 'Roles' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'areas', label: 'Área de práctica' },
  { id: 'ausencias', label: 'Ausencias' },
];

function ActionsMenu({ user, onEdit, onInactivate }: { user: User; onEdit: () => void; onInactivate: () => void }) {
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
            {user.estado === 'Activo' && (
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

export function UsersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterRol, setFilterRol] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users', page, search, filterCategoria, filterRol, filterArea, filterEstado],
    queryFn: () =>
      userService.getUsers({
        page,
        limit: 10,
        search: search || undefined,
        categoria_id: filterCategoria ? parseInt(filterCategoria) : undefined,
        rol_id: filterRol ? parseInt(filterRol) : undefined,
        area_practica_id: filterArea ? parseInt(filterArea) : undefined,
        estado: filterEstado || undefined,
      }),
  });

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => rolesService.getAll() });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesService.getAll() });
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => areasService.getAll() });

  const inactivateMutation = useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const users = usersRes?.data ?? [];
  const pagination = usersRes?.pagination;

  function openCreate() {
    setEditingUser(null);
    setIsModalOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setIsModalOpen(true);
  }

  function handleInactivate(user: User) {
    if (window.confirm(`¿Inactivar al usuario "${user.nombre}"?`)) {
      inactivateMutation.mutate(user.id);
    }
  }

  function clearFilters() {
    setSearch('');
    setFilterCategoria('');
    setFilterRol('');
    setFilterArea('');
    setFilterEstado('');
    setPage(1);
  }

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Usuarios</h2>
        <p className="text-sm text-gray-500 mt-1">Gestión de usuarios, roles y configuraciones</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* Tab content */}
      {activeTab === 'roles' && <RolesTab />}
      {activeTab === 'categorias' && <CategoriesTab />}
      {activeTab === 'areas' && <AreasTab />}
      {activeTab === 'ausencias' && <AusenciasTab />}

      {activeTab === 'usuarios' && (
        <div>
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-44">
              <Select
                options={categories.map((c) => ({ value: c.id, label: c.nombre }))}
                placeholder="Categoría"
                value={filterCategoria}
                onChange={(e) => { setFilterCategoria(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-44">
              <Select
                options={roles.map((r) => ({ value: r.id, label: r.nombre }))}
                placeholder="Rol"
                value={filterRol}
                onChange={(e) => { setFilterRol(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-44">
              <Select
                options={areas.map((a) => ({ value: a.id, label: a.nombre }))}
                placeholder="Área de práctica"
                value={filterArea}
                onChange={(e) => { setFilterArea(e.target.value); setPage(1); }}
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
            {(search || filterCategoria || filterRol || filterArea || filterEstado) && (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" size="sm">
                Exportar XLS
              </Button>
              <Button variant="primary" size="sm" onClick={openCreate}>
                + Crear Usuario
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
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Categoría</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Rol</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Área de práctica</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha creación</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                          No se encontraron usuarios
                        </td>
                      </tr>
                    )}
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{user.nombre}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3 text-gray-500">{user.categoria?.nombre ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{user.rol?.nombre ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{user.area_practica?.nombre ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={user.estado === 'Activo' ? 'success' : 'danger'}>
                            {user.estado}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <ActionsMenu
                            user={user}
                            onEdit={() => openEdit(user)}
                            onInactivate={() => handleInactivate(user)}
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
        </div>
      )}

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={editingUser}
      />
    </div>
  );
}
