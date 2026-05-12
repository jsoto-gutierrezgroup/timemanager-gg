import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { paymentsService } from '../../../services/paymentsService';
import { clienteService } from '../../../services/clienteService';
import { billingService } from '../../../services/billingService';
import { formatCurrency } from '../../../utils/currency';
import type { Pago } from '../../../types';

const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'default'> = {
  Pendiente: 'warning',
  Aplicado: 'success',
};

export function PaymentsPage() {
  const queryClient = useQueryClient();

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [estado, setEstado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPago, setEditingPago] = useState<Pago | undefined>(undefined);

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 200 }),
  });

  const { data: pagosData, isLoading } = useQuery({
    queryKey: ['payments', { clienteId, estado, fechaInicio, fechaFin, page }],
    queryFn: () =>
      paymentsService.getPayments({
        cliente_id: clienteId ?? undefined,
        estado: (estado as 'Pendiente' | 'Aplicado') || undefined,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        page,
        limit: 10,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => paymentsService.deletePayment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });

  const handleClearFilters = () => {
    setClienteId(null);
    setEstado('');
    setFechaInicio('');
    setFechaFin('');
    setPage(1);
  };

  const totalPages = pagosData?.pagination.totalPages ?? 1;
  const clienteOptions = (clientesData?.data ?? []).map((c) => ({ value: c.id, label: `${c.codigo} — ${c.razon_social}` }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Pagos</h1>
        <Button onClick={() => { setEditingPago(undefined); setModalOpen(true); }}>
          + Crear Pago
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select
            label="Cliente"
            options={clienteOptions}
            placeholder="Todos"
            value={clienteId ?? ''}
            onChange={(e) => { setClienteId(e.target.value ? parseInt(e.target.value, 10) : null); setPage(1); }}
          />
          <Select
            label="Estado"
            options={[
              { value: 'Pendiente', label: 'Pendiente' },
              { value: 'Aplicado', label: 'Aplicado' },
            ]}
            placeholder="Todos"
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPage(1); }}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setPage(1); }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setPage(1); }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>Limpiar filtros</Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Documento</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Moneda</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha pago</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            )}
            {!isLoading && pagosData?.data.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Sin pagos</td></tr>
            )}
            {!isLoading && pagosData?.data.map((pago: Pago) => (
              <tr key={pago.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{pago.cliente?.razon_social ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{pago.documento?.tipo_documento ?? '—'}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">
                  {formatCurrency(pago.monto, pago.moneda)}
                </td>
                <td className="px-4 py-3 text-gray-500">{pago.moneda}</td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {pago.fecha_pago ? format(new Date(pago.fecha_pago), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={ESTADO_VARIANT[pago.estado] ?? 'default'}>{pago.estado}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => { setEditingPago(pago); setModalOpen(true); }}
                      className="text-xs text-gray-500 hover:text-teal-600 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { if (confirm('¿Eliminar pago?')) deleteMutation.mutate(pago.id); }}
                      className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagosData && pagosData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {pagosData.pagination.total} pagos — Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        pago={editingPago}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['payments'] })}
      />
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

const pagoSchema = z.object({
  cliente_id: z.coerce.number().int().positive('Cliente requerido'),
  documento_id: z.coerce.number().int().positive().optional().nullable(),
  monto: z.coerce.number().positive('Monto requerido'),
  moneda: z.enum(['COP', 'USD', 'EUR']),
  fecha_pago: z.string().min(1, 'Requerido'),
  estado: z.enum(['Pendiente', 'Aplicado']).optional(),
});
type PagoFormValues = z.infer<typeof pagoSchema>;

function PaymentModal({
  isOpen,
  onClose,
  pago,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  pago?: Pago;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!pago;

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<PagoFormValues>({
    resolver: zodResolver(pagoSchema),
  });

  const clienteId = watch('cliente_id');

  useEffect(() => {
    if (isOpen) {
      reset(
        pago
          ? {
              cliente_id: pago.cliente_id,
              documento_id: pago.documento_id ?? undefined,
              monto: typeof pago.monto === 'string' ? parseFloat(pago.monto) : pago.monto,
              moneda: pago.moneda,
              fecha_pago: pago.fecha_pago?.slice(0, 10),
              estado: pago.estado,
            }
          : {
              moneda: 'COP',
              estado: 'Pendiente',
            }
      );
    }
  }, [isOpen, pago, reset]);

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 200 }),
  });

  const { data: docsData } = useQuery({
    queryKey: ['billing', 'documents', { receptor_id: clienteId }],
    queryFn: () => billingService.getDocuments({ receptor_id: Number(clienteId), limit: 100 }),
    enabled: !!clienteId,
  });

  const mutation = useMutation({
    mutationFn: (values: PagoFormValues) => {
      const payload = {
        cliente_id: values.cliente_id,
        documento_id: values.documento_id || null,
        monto: values.monto,
        moneda: values.moneda,
        fecha_pago: values.fecha_pago,
        estado: values.estado,
      };
      if (isEditing && pago) return paymentsService.updatePayment(pago.id, payload);
      return paymentsService.createPayment(payload as Parameters<typeof paymentsService.createPayment>[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      onSuccess?.();
      onClose();
    },
  });

  const clienteOptions = (clientesData?.data ?? []).map((c) => ({ value: c.id, label: `${c.codigo} — ${c.razon_social}` }));
  const docOptions = (docsData?.data ?? []).map((d) => ({ value: d.id, label: `#${d.id} — ${d.tipo_documento}` }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Pago' : 'Crear Pago'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} loading={mutation.isPending}>
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
            {...register('cliente_id')}
          />
        </div>
        <div className="col-span-2">
          <Select
            label="Documento"
            options={docOptions}
            placeholder={clienteId ? 'Sin documento' : 'Seleccione cliente primero'}
            disabled={!clienteId}
            {...register('documento_id')}
          />
        </div>
        <Input label="Monto" type="number" step="0.01" required error={errors.monto?.message} {...register('monto')} />
        <Select
          label="Moneda"
          required
          options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
          {...register('moneda')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Fecha pago <span className="text-red-500">*</span></label>
          <input
            type="date"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            {...register('fecha_pago')}
          />
          {errors.fecha_pago && <p className="text-xs text-red-600">{errors.fecha_pago.message}</p>}
        </div>
        <Select
          label="Estado"
          options={[{ value: 'Pendiente', label: 'Pendiente' }, { value: 'Aplicado', label: 'Aplicado' }]}
          {...register('estado')}
        />
      </div>
      {mutation.isError && <p className="mt-3 text-sm text-red-600">{(mutation.error as Error).message}</p>}
    </Modal>
  );
}
