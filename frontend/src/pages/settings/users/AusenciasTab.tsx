import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ausenciasService } from '../../../services/settingsService';
import { userService } from '../../../services/userService';
import { Absence, TipoAusencia } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

const tipoOptions: { value: TipoAusencia; label: string }[] = [
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Permiso', label: 'Permiso' },
  { value: 'Incapacidad', label: 'Incapacidad' },
  { value: 'Otro', label: 'Otro' },
];

const schema = z.object({
  usuario_id: z.string().min(1, 'Usuario requerido'),
  fecha_inicio: z.string().min(1, 'Fecha inicio requerida'),
  fecha_fin: z.string().min(1, 'Fecha fin requerida'),
  tipo: z.enum(['Vacaciones', 'Permiso', 'Incapacidad', 'Otro'] as const),
  descripcion: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function AusenciasTab() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Absence | null>(null);
  const [page, setPage] = useState(1);

  const { data: ausenciasRes, isLoading } = useQuery({
    queryKey: ['ausencias', page],
    queryFn: () => ausenciasService.getAll({ page, limit: 10 }),
  });

  const { data: usersRes } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => userService.getUsers({ limit: 200 }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const ausencias = ausenciasRes?.data ?? [];
  const pagination = ausenciasRes?.pagination;
  const userOptions = (usersRes?.data ?? []).map((u) => ({ value: u.id, label: u.nombre }));

  function openCreate() {
    setEditing(null);
    reset({ tipo: 'Vacaciones' });
    setIsModalOpen(true);
  }

  function openEdit(a: Absence) {
    setEditing(a);
    reset({
      usuario_id: a.usuario_id.toString(),
      fecha_inicio: a.fecha_inicio.slice(0, 10),
      fecha_fin: a.fecha_fin.slice(0, 10),
      tipo: a.tipo,
      descripcion: a.descripcion ?? '',
    });
    setIsModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        usuario_id: parseInt(data.usuario_id),
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        tipo: data.tipo,
        descripcion: data.descripcion || null,
      };
      return editing
        ? ausenciasService.update(editing.id, payload)
        : ausenciasService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ausencias'] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ausenciasService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ausencias'] }),
  });

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Registrar Ausencia
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Usuario</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha inicio</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha fin</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Descripción</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ausencias.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No hay ausencias registradas
                    </td>
                  </tr>
                )}
                {ausencias.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {a.usuario?.nombre ?? `Usuario ${a.usuario_id}`}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(a.fecha_inicio)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(a.fecha_fin)}</td>
                    <td className="px-4 py-3 text-gray-600">{a.tipo}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{a.descripcion ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(a)}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (window.confirm('¿Eliminar esta ausencia?')) {
                              deleteMutation.mutate(a.id);
                            }
                          }}
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

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
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
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
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
                ))}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Editar Ausencia' : 'Registrar Ausencia'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              onClick={handleSubmit((d) => saveMutation.mutate(d))}
            >
              {editing ? 'Guardar' : 'Registrar'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
          <Select
            label="Usuario"
            required
            options={userOptions}
            placeholder="Seleccionar usuario"
            error={errors.usuario_id?.message}
            {...register('usuario_id')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha inicio"
              type="date"
              required
              error={errors.fecha_inicio?.message}
              {...register('fecha_inicio')}
            />
            <Input
              label="Fecha fin"
              type="date"
              required
              error={errors.fecha_fin?.message}
              {...register('fecha_fin')}
            />
          </div>

          <Select
            label="Tipo"
            required
            options={tipoOptions}
            error={errors.tipo?.message}
            {...register('tipo')}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              rows={3}
              placeholder="Detalle adicional (opcional)"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              {...register('descripcion')}
            />
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
