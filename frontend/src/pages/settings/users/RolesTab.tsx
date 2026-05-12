import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rolesService } from '../../../services/settingsService';
import { Role } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';

const roleSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  permisos: z.string().optional(),
});

type RoleForm = z.infer<typeof roleSchema>;

export function RolesTab() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.getAll(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleForm>({ resolver: zodResolver(roleSchema) });

  function openCreate() {
    setEditingRole(null);
    reset({ nombre: '', permisos: '{}' });
    setIsModalOpen(true);
  }

  function openEdit(role: Role) {
    setEditingRole(role);
    reset({ nombre: role.nombre, permisos: JSON.stringify(role.permisos, null, 2) });
    setIsModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: RoleForm) => {
      let permisos: Record<string, unknown> = {};
      try {
        permisos = data.permisos ? JSON.parse(data.permisos) : {};
      } catch {
        permisos = {};
      }
      if (editingRole) {
        return rolesService.update(editingRole.id, { nombre: data.nombre, permisos });
      }
      return rolesService.create({ nombre: data.nombre, permisos });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  function handleDelete(role: Role) {
    if (window.confirm(`¿Eliminar el rol "${role.nombre}"?`)) {
      deleteMutation.mutate(role.id);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Crear Rol
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Permisos</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No hay roles registrados
                  </td>
                </tr>
              )}
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{role.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {Object.keys(role.permisos).length} permisos configurados
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(role)}>
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(role)}
                        loading={deleteMutation.isPending}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? 'Editar Rol' : 'Crear Rol'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              onClick={handleSubmit((d) => saveMutation.mutate(d))}
            >
              {editingRole ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
          <Input
            label="Nombre del rol"
            required
            placeholder="Ej: Administrador"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Permisos (JSON)
            </label>
            <textarea
              rows={6}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder='{"modulo": ["leer", "escribir"]}'
              {...register('permisos')}
            />
            <p className="text-xs text-gray-400">Formato JSON. Dejar vacío para sin permisos.</p>
          </div>
          {saveMutation.isError && (
            <p className="text-sm text-red-600">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Error al guardar'}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
