import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { asuntoService } from '../../services/asuntoService';
import { clienteService } from '../../services/clienteService';
import type { Asunto } from '../../types';
import { TIPO_FACTURACION_OPTIONS } from '../../utils/tipoFacturacion';

const settingsService = {
  async getPracticeAreas() {
    const { api } = await import('../../services/api');
    const { data } = await api.get<{ data: { id: number; nombre: string }[] }>('/settings/areas-practica');
    return data;
  },
};

const schema = z.object({
  cliente_id: z.coerce.number().int().positive('Cliente requerido'),
  nombre: z.string().min(1, 'Nombre requerido'),
  area_practica_id: z.coerce.number().int().positive().optional().nullable(),
  tipo_facturacion: z.enum(['PorHoras', 'PorHorasConMontoEditable', 'PorHitosOEtapas', 'MontoFijoMensual']),
  moneda: z.enum(['COP', 'USD', 'EUR']).optional(),
  monto_fijo: z.coerce.number().optional().nullable(),
  estado: z.enum(['Activo', 'Inactivo', 'Cerrado']).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  asunto?: Asunto;
  prefilledClienteId?: number;
  onSuccess?: () => void;
}

export function AsuntoModal({ isOpen, onClose, asunto, prefilledClienteId, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!asunto;

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const tipoFacturacion = watch('tipo_facturacion');

  useEffect(() => {
    if (isOpen) {
      reset(
        asunto
          ? {
              cliente_id: asunto.cliente_id,
              nombre: asunto.nombre,
              area_practica_id: asunto.area_practica_id ?? undefined,
              tipo_facturacion: asunto.tipo_facturacion,
              moneda: asunto.moneda,
              monto_fijo: asunto.monto_fijo ? parseFloat(asunto.monto_fijo as string) : undefined,
              estado: asunto.estado,
            }
          : {
              cliente_id: prefilledClienteId ?? undefined,
              nombre: '',
              tipo_facturacion: 'PorHoras',
              moneda: 'COP',
              estado: 'Activo',
            }
      );
    }
  }, [isOpen, asunto, prefilledClienteId, reset]);

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 200 }),
  });

  const { data: areasData } = useQuery({
    queryKey: ['areas-practica'],
    queryFn: settingsService.getPracticeAreas,
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        cliente_id: values.cliente_id,
        nombre: values.nombre,
        area_practica_id: values.area_practica_id || null,
        tipo_facturacion: values.tipo_facturacion,
        moneda: values.moneda,
        monto_fijo: values.monto_fijo || null,
        estado: values.estado,
      };
      if (isEditing && asunto) {
        return asuntoService.updateAsunto(asunto.id, payload);
      }
      return asuntoService.createAsunto(payload as Parameters<typeof asuntoService.createAsunto>[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wip'] });
      queryClient.invalidateQueries({ queryKey: ['asuntos'] });
      onSuccess?.();
      onClose();
    },
  });

  const clienteOptions = (clientesData?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.codigo} — ${c.razon_social}`,
  }));

  const areaOptions = (areasData?.data ?? []).map((a) => ({ value: a.id, label: a.nombre }));

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Asunto' : 'Nuevo Asunto'}
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>
            {isEditing ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Select
            label="Cliente"
            required
            options={clienteOptions}
            placeholder="Seleccionar cliente"
            error={errors.cliente_id?.message}
            disabled={!!prefilledClienteId && !isEditing}
            {...register('cliente_id')}
          />
        </div>
        <div className="col-span-2">
          <Input
            label="Nombre"
            required
            error={errors.nombre?.message}
            {...register('nombre')}
          />
        </div>
        <Select
          label="Área de Práctica"
          options={areaOptions}
          placeholder="Seleccionar"
          {...register('area_practica_id')}
        />
        <Select
          label="Tipo Facturación"
          required
          options={TIPO_FACTURACION_OPTIONS}
          placeholder="Seleccionar"
          error={errors.tipo_facturacion?.message}
          {...register('tipo_facturacion')}
        />
        <Select
          label="Moneda"
          options={[
            { value: 'COP', label: 'COP' },
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
          ]}
          placeholder="Seleccionar"
          {...register('moneda')}
        />
        {tipoFacturacion === 'MontoFijoMensual' && (
          <Input
            label="Monto Fijo"
            type="number"
            {...register('monto_fijo')}
          />
        )}
        <Select
          label="Estado"
          options={[
            { value: 'Activo', label: 'Activo' },
            { value: 'Inactivo', label: 'Inactivo' },
            { value: 'Cerrado', label: 'Cerrado' },
          ]}
          placeholder="Seleccionar"
          {...register('estado')}
        />
      </div>
      {mutation.isError && (
        <p className="mt-3 text-sm text-red-600">{(mutation.error as Error).message}</p>
      )}
    </Modal>
  );
}
