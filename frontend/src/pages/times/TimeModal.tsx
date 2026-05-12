import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DurationInput } from '../../components/ui/DurationInput';
import { clienteService } from '../../services/clienteService';
import { asuntoService } from '../../services/asuntoService';
import { tiempoService } from '../../services/tiempoService';
import { useAuthStore } from '../../store/authStore';
import type { Tiempo } from '../../types';
import { minutesToHHMM } from '../../utils/time';

const schema = z.object({
  usuario_id: z.number().int().positive('Usuario requerido'),
  cliente_id: z.number({ required_error: 'Cliente requerido' }).int().positive('Cliente requerido'),
  asunto_id: z.number({ required_error: 'Asunto requerido' }).int().positive('Asunto requerido'),
  fecha: z.string().min(1, 'Fecha requerida'),
  duracion: z
    .string()
    .min(1, 'Duración requerida')
    .regex(/^\d+:[0-5]\d$/, 'Formato inválido. Use HH:MM'),
  actividad: z.string().min(1, 'Actividad requerida'),
  facturable: z.boolean(),
  compartido_con: z.number().int().positive().nullable().optional(),
  estado: z.enum(['Activo', 'Aprobado', 'Facturado', 'FacturadoPagado']).optional(),
});

type FormValues = z.infer<typeof schema>;

interface TimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiempo?: Tiempo; // editing mode
  defaultClienteId?: number;
  defaultAsuntoId?: number;
  defaultDurationMinutes?: number;
  onSuccess?: () => void;
}

export function TimeModal({
  isOpen,
  onClose,
  tiempo,
  defaultClienteId,
  defaultAsuntoId,
  defaultDurationMinutes,
  onSuccess,
}: TimeModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isEditing = !!tiempo;

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
      usuario_id: tiempo?.usuario_id ?? user?.id ?? 0,
      cliente_id: tiempo?.cliente_id ?? defaultClienteId,
      asunto_id: tiempo?.asunto_id ?? defaultAsuntoId,
      fecha: tiempo?.fecha
        ? new Date(tiempo.fecha).toISOString().slice(0, 10)
        : format(new Date(), 'yyyy-MM-dd'),
      duracion: tiempo ? minutesToHHMM(tiempo.duracion_horas) : defaultDurationMinutes
        ? minutesToHHMM(defaultDurationMinutes)
        : '',
      actividad: tiempo?.actividad ?? '',
      facturable: tiempo?.facturable ?? true,
      compartido_con: tiempo?.compartido_con ?? null,
      estado: tiempo?.estado ?? 'Activo',
    },
  });

  const clienteId = watch('cliente_id');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      reset({
        usuario_id: tiempo?.usuario_id ?? user?.id ?? 0,
        cliente_id: tiempo?.cliente_id ?? defaultClienteId,
        asunto_id: tiempo?.asunto_id ?? defaultAsuntoId,
        fecha: tiempo?.fecha
          ? new Date(tiempo.fecha).toISOString().slice(0, 10)
          : format(new Date(), 'yyyy-MM-dd'),
        duracion: tiempo ? minutesToHHMM(tiempo.duracion_horas) : defaultDurationMinutes
          ? minutesToHHMM(defaultDurationMinutes)
          : '',
        actividad: tiempo?.actividad ?? '',
        facturable: tiempo?.facturable ?? true,
        compartido_con: tiempo?.compartido_con ?? null,
        estado: tiempo?.estado ?? 'Activo',
      });
    }
  }, [isOpen]);

  // When cliente changes, reset asunto
  useEffect(() => {
    setValue('asunto_id', undefined as unknown as number);
  }, [clienteId, setValue]);

  // Data fetching
  const { data: usuariosData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () =>
      import('../../services/api').then(({ api }) =>
        api.get('/users', { params: { limit: 100 } }).then((r) => r.data)
      ),
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
      if (isEditing && tiempo) {
        await tiempoService.updateTiempo(tiempo.id, {
          usuario_id: values.usuario_id,
          cliente_id: values.cliente_id,
          asunto_id: values.asunto_id,
          actividad: values.actividad,
          fecha: values.fecha,
          duracion: values.duracion,
          facturable: values.facturable,
          compartido_con: values.compartido_con,
          estado: values.estado,
        });
      } else {
        await tiempoService.createTiempo({
          usuario_id: values.usuario_id,
          cliente_id: values.cliente_id,
          asunto_id: values.asunto_id,
          actividad: values.actividad,
          fecha: values.fecha,
          duracion: values.duracion,
          facturable: values.facturable,
          compartido_con: values.compartido_con ?? null,
          estado: values.estado,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tiempos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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

  const facturableValue = watch('facturable');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Tiempo' : 'Nuevo Tiempo'}
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="time-modal-form"
            loading={isSubmitting}
          >
            {isEditing ? 'Guardar cambios' : 'Crear tiempo'}
          </Button>
        </>
      }
    >
      <form id="time-modal-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Usuario */}
        <Controller
          name="usuario_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Usuario"
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

        {/* Fecha */}
        <Input
          label="Fecha"
          type="date"
          required
          {...register('fecha')}
          error={errors.fecha?.message}
        />

        {/* Duración */}
        <Controller
          name="duracion"
          control={control}
          render={({ field }) => (
            <DurationInput
              label="Duración"
              required
              value={field.value}
              onChange={field.onChange}
              error={errors.duracion?.message}
            />
          )}
        />

        {/* Actividad */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Descripción / Actividad <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('actividad')}
            rows={3}
            className={[
              'block w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              errors.actividad ? 'border-red-400' : 'border-gray-300',
            ].join(' ')}
            placeholder="Describe la actividad realizada..."
          />
          {errors.actividad && (
            <p className="text-xs text-red-600">{errors.actividad.message}</p>
          )}
        </div>

        {/* Facturable toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Facturable</span>
          <button
            type="button"
            onClick={() => setValue('facturable', !facturableValue)}
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              facturableValue ? 'bg-teal-600' : 'bg-gray-300',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                facturableValue ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
          <span className="text-sm text-gray-500">{facturableValue ? 'Sí' : 'No'}</span>
        </div>

        {/* Compartir con */}
        <Controller
          name="compartido_con"
          control={control}
          render={({ field }) => (
            <Select
              label="Compartir con"
              options={usuarioOptions}
              placeholder="Ninguno (opcional)"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
              error={errors.compartido_con?.message}
            />
          )}
        />

        {/* Estado (editing only) */}
        {isEditing && (
          <Controller
            name="estado"
            control={control}
            render={({ field }) => (
              <Select
                label="Estado"
                options={[
                  { value: 'Activo', label: 'Activo' },
                  { value: 'Aprobado', label: 'Aprobado' },
                  { value: 'Facturado', label: 'Facturado' },
                  { value: 'FacturadoPagado', label: 'Facturado y Pagado' },
                ]}
                value={field.value ?? 'Activo'}
                onChange={(e) => field.onChange(e.target.value)}
                error={errors.estado?.message}
              />
            )}
          />
        )}
      </form>
    </Modal>
  );
}
