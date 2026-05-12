import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { userService } from '../../../services/userService';
import { rolesService, categoriesService, areasService } from '../../../services/settingsService';
import { User } from '../../../types';

const createSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  categoria_id: z.string().optional(),
  rol_id: z.string().optional(),
  area_practica_id: z.string().optional(),
  tarifa_horaria: z.string().optional(),
  estado: z.enum(['Activo', 'Inactivo']).optional(),
});

const editSchema = createSchema.extend({
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
});

type FormData = z.infer<typeof createSchema>;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
}

export function UserModal({ isOpen, onClose, user }: UserModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!user;
  const schema = isEdit ? editSchema : createSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => rolesService.getAll() });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesService.getAll() });
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => areasService.getAll() });

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          nombre: user.nombre,
          email: user.email,
          password: '',
          categoria_id: user.categoria_id?.toString() ?? '',
          rol_id: user.rol_id?.toString() ?? '',
          area_practica_id: user.area_practica_id?.toString() ?? '',
          tarifa_horaria: user.tarifa_horaria ?? '',
          estado: user.estado,
        });
      } else {
        reset({ nombre: '', email: '', password: '', estado: 'Activo' });
      }
    }
  }, [isOpen, user, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        nombre: data.nombre,
        email: data.email,
        password: data.password || undefined,
        categoria_id: data.categoria_id ? parseInt(data.categoria_id) : null,
        rol_id: data.rol_id ? parseInt(data.rol_id) : null,
        area_practica_id: data.area_practica_id ? parseInt(data.area_practica_id) : null,
        tarifa_horaria: data.tarifa_horaria ? parseFloat(data.tarifa_horaria) : null,
        estado: data.estado as 'Activo' | 'Inactivo' | undefined,
      };
      if (isEdit) {
        return userService.updateUser(user!.id, payload);
      }
      return userService.createUser({ ...payload, password: data.password! });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.nombre }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.nombre }));
  const areaOptions = areas.map((a) => ({ value: a.id, label: a.nombre }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Usuario' : 'Crear Usuario'}
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            loading={mutation.isPending}
            onClick={handleSubmit((d) => mutation.mutate(d))}
          >
            {isEdit ? 'Guardar cambios' : 'Crear Usuario'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre"
            required
            placeholder="Nombre completo"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <Input
            label="Email"
            type="email"
            required
            placeholder="usuario@empresa.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <Input
          label={isEdit ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}
          type="password"
          required={!isEdit}
          placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Categoría"
            options={categoryOptions}
            placeholder="Seleccionar categoría"
            error={errors.categoria_id?.message}
            {...register('categoria_id')}
          />
          <Select
            label="Rol"
            options={roleOptions}
            placeholder="Seleccionar rol"
            error={errors.rol_id?.message}
            {...register('rol_id')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Área de práctica"
            options={areaOptions}
            placeholder="Seleccionar área"
            error={errors.area_practica_id?.message}
            {...register('area_practica_id')}
          />
          <Input
            label="Tarifa horaria"
            type="number"
            placeholder="0.00"
            error={errors.tarifa_horaria?.message}
            {...register('tarifa_horaria')}
          />
        </div>

        <Select
          label="Estado"
          options={[
            { value: 'Activo', label: 'Activo' },
            { value: 'Inactivo', label: 'Inactivo' },
          ]}
          error={errors.estado?.message}
          {...register('estado')}
        />

        {mutation.isError && (
          <p className="text-sm text-red-600">
            {mutation.error instanceof Error ? mutation.error.message : 'Error al guardar'}
          </p>
        )}
      </form>
    </Modal>
  );
}
