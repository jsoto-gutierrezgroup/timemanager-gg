import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { areasService } from '../../../services/settingsService';
import { PracticeArea } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';

const schema = z.object({ nombre: z.string().min(1, 'Nombre requerido') });
type FormData = z.infer<typeof schema>;

export function AreasTab() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PracticeArea | null>(null);

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasService.getAll(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    setEditing(null);
    reset({ nombre: '' });
    setIsModalOpen(true);
  }

  function openEdit(area: PracticeArea) {
    setEditing(area);
    reset({ nombre: area.nombre });
    setIsModalOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editing ? areasService.update(editing.id, data) : areasService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => areasService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['areas'] }),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Crear Área
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
                <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {areas.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                    No hay áreas de práctica registradas
                  </td>
                </tr>
              )}
              {areas.map((area) => (
                <tr key={area.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900">{area.nombre}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(area)}>
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar "${area.nombre}"?`)) {
                            deleteMutation.mutate(area.id);
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
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Editar Área de Práctica' : 'Crear Área de Práctica'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              onClick={handleSubmit((d) => saveMutation.mutate(d))}
            >
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
          <Input
            label="Nombre del área"
            required
            placeholder="Ej: Real Estate, Visa Application, General Legal Advisory"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
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
