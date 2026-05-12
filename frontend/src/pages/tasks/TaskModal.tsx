import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { clienteService } from '../../services/clienteService';
import { asuntoService } from '../../services/asuntoService';
import { tareaService } from '../../services/tareaService';
import { useAuthStore } from '../../store/authStore';
import { minutesToLabel } from '../../utils/time';
import type { Tarea } from '../../types';

const schema = z.object({
  titulo: z.string().min(1, 'Título requerido'),
  usuario_id: z.number().int().positive('Usuario requerido'),
  cliente_id: z.number({ required_error: 'Cliente requerido' }).int().positive('Cliente requerido'),
  asunto_id: z.number({ required_error: 'Asunto requerido' }).int().positive('Asunto requerido'),
  detalles: z.string().min(1, 'Detalles requeridos'),
  fecha_inicio: z.string().nullable().optional(),
  fecha_vencimiento: z.string().nullable().optional(),
  importancia: z.enum(['Baja', 'Media', 'Alta']).nullable().optional(),
  estimado_minutos: z.number().int().min(0).default(0),
});

type FormValues = z.infer<typeof schema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarea?: Tarea;
  onSuccess?: () => void;
}

const IMPORTANCIA_CONFIG = [
  { value: 'Baja', label: '!', color: 'text-yellow-600', bg: 'bg-yellow-100', activeBg: 'bg-yellow-500 text-white' },
  { value: 'Media', label: '!!', color: 'text-orange-600', bg: 'bg-orange-100', activeBg: 'bg-orange-500 text-white' },
  { value: 'Alta', label: '!!!', color: 'text-red-600', bg: 'bg-red-100', activeBg: 'bg-red-500 text-white' },
] as const;

const QUICK_ADD = [
  { label: '+1h', minutes: 60 },
  { label: '+30m', minutes: 30 },
  { label: '+10m', minutes: 10 },
  { label: '+5m', minutes: 5 },
  { label: '+1m', minutes: 1 },
];

export function TaskModal({ isOpen, onClose, tarea, onSuccess }: TaskModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isEditing = !!tarea;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: tarea?.titulo ?? '',
      usuario_id: tarea?.usuario_id ?? user?.id ?? 0,
      cliente_id: tarea?.cliente_id,
      asunto_id: tarea?.asunto_id,
      detalles: tarea?.detalles ?? '',
      fecha_inicio: tarea?.fecha_inicio?.slice(0, 10) ?? null,
      fecha_vencimiento: tarea?.fecha_vencimiento?.slice(0, 10) ?? null,
      importancia: tarea?.importancia ?? null,
      estimado_minutos: tarea?.estimado_minutos ?? 0,
    },
  });

  const clienteId = watch('cliente_id');
  const importanciaValue = watch('importancia');
  const estimadoValue = watch('estimado_minutos') ?? 0;

  useEffect(() => {
    if (isOpen) {
      reset({
        titulo: tarea?.titulo ?? '',
        usuario_id: tarea?.usuario_id ?? user?.id ?? 0,
        cliente_id: tarea?.cliente_id,
        asunto_id: tarea?.asunto_id,
        detalles: tarea?.detalles ?? '',
        fecha_inicio: tarea?.fecha_inicio?.slice(0, 10) ?? null,
        fecha_vencimiento: tarea?.fecha_vencimiento?.slice(0, 10) ?? null,
        importancia: tarea?.importancia ?? null,
        estimado_minutos: tarea?.estimado_minutos ?? 0,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isEditing) {
      setValue('asunto_id', undefined as unknown as number);
    }
  }, [clienteId, setValue, isEditing]);

  // Users for select
  const { data: usuariosData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () =>
      import('../../services/api').then(({ api }) =>
        api.get('/users', { params: { limit: 100 } }).then((r) => r.data)
      ),
    enabled: isOpen,
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 100 }),
    enabled: isOpen,
  });

  const { data: asuntosData } = useQuery({
    queryKey: ['asuntos', clienteId],
    queryFn: () =>
      asuntoService.getAsuntos({ cliente_id: clienteId, estado: 'Activo', limit: 100 }),
    enabled: !!clienteId,
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && tarea) {
        await tareaService.updateTarea(tarea.id, {
          titulo: values.titulo,
          usuario_id: values.usuario_id,
          cliente_id: values.cliente_id,
          asunto_id: values.asunto_id,
          detalles: values.detalles,
          fecha_inicio: values.fecha_inicio || null,
          fecha_vencimiento: values.fecha_vencimiento || null,
          importancia: values.importancia ?? null,
          estimado_minutos: values.estimado_minutos,
        });
      } else {
        await tareaService.createTarea({
          titulo: values.titulo,
          usuario_id: values.usuario_id,
          cliente_id: values.cliente_id,
          asunto_id: values.asunto_id,
          detalles: values.detalles,
          fecha_inicio: values.fecha_inicio || null,
          fecha_vencimiento: values.fecha_vencimiento || null,
          importancia: values.importancia ?? null,
          estimado_minutos: values.estimado_minutos,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const usuarioOptions = (
    (usuariosData as { data?: { id: number; nombre: string }[] })?.data ?? []
  ).map((u) => ({ value: u.id, label: u.nombre }));

  const clienteOptions = (clientesData?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.codigo} — ${c.razon_social}`,
  }));

  const asuntoOptions = (asuntosData?.data ?? []).map((a) => ({
    value: a.id,
    label: `${a.codigo} — ${a.nombre}`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="task-modal-form" loading={isSubmitting}>
            {isEditing ? 'Guardar cambios' : 'Crear tarea'}
          </Button>
        </>
      }
    >
      <form id="task-modal-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Título */}
        <Input
          label="Título"
          required
          {...register('titulo')}
          error={errors.titulo?.message}
        />

        {/* Usuario */}
        <Controller
          name="usuario_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Asignado a"
              required
              options={usuarioOptions}
              placeholder="Seleccione usuario"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              error={errors.usuario_id?.message}
            />
          )}
        />

        {/* Cliente */}
        <Controller
          name="cliente_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Cliente"
              required
              options={clienteOptions}
              placeholder="Seleccione cliente"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              error={errors.cliente_id?.message}
            />
          )}
        />

        {/* Asunto */}
        <Controller
          name="asunto_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Asunto"
              required
              disabled={!clienteId}
              options={asuntoOptions}
              placeholder={clienteId ? 'Seleccione asunto' : 'Seleccione primero un cliente'}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              error={errors.asunto_id?.message}
            />
          )}
        />

        {/* Detalles */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Detalles <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('detalles')}
            rows={3}
            className={[
              'block w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              errors.detalles ? 'border-red-400' : 'border-gray-300',
            ].join(' ')}
            placeholder="Descripción de la tarea..."
          />
          {errors.detalles && (
            <p className="text-xs text-red-600">{errors.detalles.message}</p>
          )}
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha de inicio"
            type="date"
            {...register('fecha_inicio')}
            error={errors.fecha_inicio?.message}
          />
          <Input
            label="Fecha de vencimiento"
            type="date"
            {...register('fecha_vencimiento')}
            error={errors.fecha_vencimiento?.message}
          />
        </div>

        {/* Importancia */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Importancia</label>
          <div className="flex gap-2">
            {IMPORTANCIA_CONFIG.map(({ value, label, activeBg, bg, color }) => {
              const isActive = importanciaValue === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('importancia', isActive ? null : value)}
                  className={[
                    'px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border',
                    isActive
                      ? `${activeBg} border-transparent`
                      : `${bg} ${color} border-transparent hover:opacity-80`,
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
            {importanciaValue && (
              <span className="text-xs text-gray-500 flex items-center ml-1">{importanciaValue}</span>
            )}
          </div>
        </div>

        {/* Estimado */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Estimado
            {estimadoValue > 0 && (
              <span className="ml-2 text-teal-600 font-normal">{minutesToLabel(estimadoValue)}</span>
            )}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {QUICK_ADD.map(({ label, minutes }) => (
              <button
                key={label}
                type="button"
                onClick={() => setValue('estimado_minutos', estimadoValue + minutes)}
                className="px-2.5 py-1 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setValue('estimado_minutos', 0)}
              className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
            >
              Limpiar
            </button>
            <Controller
              name="estimado_minutos"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={0}
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="min"
                />
              )}
            />
            <span className="text-xs text-gray-400">min</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
