import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { billableObjectsService } from '../../services/billableObjectsService';
import { billingService } from '../../services/billingService';
import { formatCurrency } from '../../utils/currency';
import type { WipAsunto } from '../../types';

const schema = z.object({
  tipo_documento: z.enum(['Factura', 'NotaDebito', 'NotaCredito', 'Recibo', 'Otro']),
  rango_fecha_inicio: z.string().min(1, 'Requerido'),
  rango_fecha_fin: z.string().min(1, 'Requerido'),
  moneda: z.enum(['COP', 'USD', 'EUR']),
  impuesto_id: z.coerce.number().int().positive().optional().nullable(),
  gravamen_id: z.coerce.number().int().positive().optional().nullable(),
  tasa_cambio_id: z.coerce.number().int().positive().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedAsuntos: WipAsunto[];
  onSuccess?: () => void;
}

export function FacturarModal({ isOpen, onClose, selectedAsuntos, onSuccess }: Props) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      tipo_documento: 'Factura',
      moneda: 'COP',
    },
  });

  const moneda = watch('moneda');

  const { data: impuestosData } = useQuery({
    queryKey: ['impuestos'],
    queryFn: () => billingService.getImpuestos(),
  });

  const { data: gravamenesData } = useQuery({
    queryKey: ['gravamenes'],
    queryFn: () => billingService.getGravamenes(),
  });

  const { data: tasasData } = useQuery({
    queryKey: ['tasas-cambio'],
    queryFn: () => billingService.getTasasCambio(),
    enabled: moneda !== 'COP',
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      billableObjectsService.facturar({
        asunto_ids: selectedAsuntos.map((a) => a.id),
        tipo_documento: values.tipo_documento,
        rango_fecha_inicio: values.rango_fecha_inicio,
        rango_fecha_fin: values.rango_fecha_fin,
        moneda: values.moneda,
        impuesto_id: values.impuesto_id || null,
        gravamen_id: values.gravamen_id || null,
        tasa_cambio_id: values.tasa_cambio_id || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wip'] });
      queryClient.invalidateQueries({ queryKey: ['billable-objects'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      onSuccess?.();
      onClose();
    },
  });

  const impuestoOptions = (impuestosData?.data ?? []).map((i) => ({
    value: i.id,
    label: `${i.nombre} (${i.porcentaje}%)`,
  }));

  const gravamenOptions = (gravamenesData?.data ?? []).map((g) => ({
    value: g.id,
    label: `${g.nombre} — ${g.valor}`,
  }));

  const tasaOptions = (tasasData?.data ?? []).map((t) => ({
    value: t.id,
    label: `${t.moneda_origen} → ${t.moneda_destino}: ${t.tasa}`,
  }));

  const totalValue = selectedAsuntos.reduce((s, a) => s + a.total_facturable, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Facturar Asuntos Seleccionados"
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} loading={mutation.isPending}>
            Crear Documentos
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Summary */}
        <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
          <p className="text-sm font-medium text-teal-800 mb-2">
            {selectedAsuntos.length} asunto(s) seleccionado(s)
          </p>
          <ul className="space-y-1">
            {selectedAsuntos.map((a) => (
              <li key={a.id} className="flex justify-between text-sm text-teal-700">
                <span>{a.codigo} — {a.nombre}</span>
                <span className="font-medium">{formatCurrency(a.total_facturable, a.moneda)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 pt-2 border-t border-teal-200 flex justify-between text-sm font-semibold text-teal-900">
            <span>Total estimado</span>
            <span>{formatCurrency(totalValue, 'COP')}</span>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo Documento"
            required
            options={[
              { value: 'Factura', label: 'Factura' },
              { value: 'NotaDebito', label: 'Nota Débito' },
              { value: 'NotaCredito', label: 'Nota Crédito' },
              { value: 'Recibo', label: 'Recibo' },
              { value: 'Otro', label: 'Otro' },
            ]}
            error={errors.tipo_documento?.message}
            {...register('tipo_documento')}
          />
          <Select
            label="Moneda"
            required
            options={[
              { value: 'COP', label: 'COP' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
            {...register('moneda')}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha inicio <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
              {...register('rango_fecha_inicio')}
            />
            {errors.rango_fecha_inicio && (
              <p className="text-xs text-red-600">{errors.rango_fecha_inicio.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha fin <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
              {...register('rango_fecha_fin')}
            />
            {errors.rango_fecha_fin && (
              <p className="text-xs text-red-600">{errors.rango_fecha_fin.message}</p>
            )}
          </div>
          <Select
            label="Impuesto"
            options={impuestoOptions}
            placeholder="Ninguno"
            {...register('impuesto_id')}
          />
          <Select
            label="Gravamen"
            options={gravamenOptions}
            placeholder="Ninguno"
            {...register('gravamen_id')}
          />
          {moneda !== 'COP' && (
            <div className="col-span-2">
              <Select
                label="Tasa de Cambio"
                options={tasaOptions}
                placeholder="Seleccionar tasa"
                {...register('tasa_cambio_id')}
              />
            </div>
          )}
        </div>
      </div>
      {mutation.isError && (
        <p className="mt-3 text-sm text-red-600">{(mutation.error as Error).message}</p>
      )}
    </Modal>
  );
}
