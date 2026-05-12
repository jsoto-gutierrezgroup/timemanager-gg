import { useState } from 'react';
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
import { billingService } from '../../../services/billingService';
import { clienteService } from '../../../services/clienteService';
import { userService } from '../../../services/userService';
import { formatCurrency } from '../../../utils/currency';
import type { DocumentoFacturacion, Impuesto, Gravamen, TasaCambio } from '../../../types';

type Tab = 'documentos' | 'tasas' | 'impuestos' | 'gravamenes';

const ESTADO_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'default' | 'danger'> = {
  Borrador: 'default',
  Emitido: 'info',
  Pagado: 'success',
  Anulado: 'danger',
};

const TIPO_LABEL: Record<string, string> = {
  Factura: 'Factura',
  NotaDebito: 'Nota Débito',
  NotaCredito: 'Nota Crédito',
  Recibo: 'Recibo',
  Otro: 'Otro',
};

export function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('documentos');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'documentos', label: 'Documentos' },
    { id: 'tasas', label: 'Tasas de cambio' },
    { id: 'impuestos', label: 'Impuestos' },
    { id: 'gravamenes', label: 'Gravámenes' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header + Tabs */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-3">Facturación</h1>
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'documentos' && <DocumentosTab />}
      {activeTab === 'tasas' && <TasasCambioTab />}
      {activeTab === 'impuestos' && <ImpuestosTab />}
      {activeTab === 'gravamenes' && <GravamenesTab />}
    </div>
  );
}

// ─── Documentos Tab ───────────────────────────────────────────────────────────

function DocumentosTab() {
  const queryClient = useQueryClient();
  const [receptorId, setReceptorId] = useState<number | null>(null);
  const [emisorId, setEmisorId] = useState<number | null>(null);
  const [tipoDoco, setTipoDoco] = useState('');
  const [estado, setEstado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentoFacturacion | undefined>(undefined);

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 200 }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'activos'],
    queryFn: () => userService.getUsers({ estado: 'Activo', limit: 200 }),
  });

  const { data: docsData, isLoading } = useQuery({
    queryKey: ['billing', 'documents', { receptorId, emisorId, tipoDoco, estado, fechaInicio, fechaFin, page }],
    queryFn: () =>
      billingService.getDocuments({
        receptor_id: receptorId ?? undefined,
        emisor_id: emisorId ?? undefined,
        tipo_documento: tipoDoco || undefined,
        estado: estado || undefined,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        page,
        limit: 10,
      }),
  });

  const totalPages = docsData?.pagination.totalPages ?? 1;
  const clienteOptions = (clientesData?.data ?? []).map((c) => ({ value: c.id, label: `${c.codigo} — ${c.razon_social}` }));
  const userOptions = (usersData?.data ?? []).map((u) => ({ value: u.id, label: u.nombre }));

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Select
            label="Receptor"
            options={clienteOptions}
            placeholder="Todos"
            value={receptorId ?? ''}
            onChange={(e) => { setReceptorId(e.target.value ? parseInt(e.target.value, 10) : null); setPage(1); }}
          />
          <Select
            label="Emisor"
            options={userOptions}
            placeholder="Todos"
            value={emisorId ?? ''}
            onChange={(e) => { setEmisorId(e.target.value ? parseInt(e.target.value, 10) : null); setPage(1); }}
          />
          <Select
            label="Tipo Documento"
            options={[
              { value: 'Factura', label: 'Factura' },
              { value: 'NotaDebito', label: 'Nota Débito' },
              { value: 'NotaCredito', label: 'Nota Crédito' },
              { value: 'Recibo', label: 'Recibo' },
              { value: 'Otro', label: 'Otro' },
            ]}
            placeholder="Todos"
            value={tipoDoco}
            onChange={(e) => { setTipoDoco(e.target.value); setPage(1); }}
          />
          <Select
            label="Estado"
            options={[
              { value: 'Borrador', label: 'Borrador' },
              { value: 'Emitido', label: 'Emitido' },
              { value: 'Pagado', label: 'Pagado' },
              { value: 'Anulado', label: 'Anulado' },
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
          <div className="flex items-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setReceptorId(null); setEmisorId(null); setTipoDoco(''); setEstado(''); setFechaInicio(''); setFechaFin(''); setPage(1); }}
            >
              Limpiar
            </Button>
            <Button size="sm" onClick={() => { setEditingDoc(undefined); setModalOpen(true); }}>
              + Crear
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Receptor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Asunto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Emisor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Moneda</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            )}
            {!isLoading && docsData?.data.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Sin documentos</td></tr>
            )}
            {!isLoading && docsData?.data.map((doc: DocumentoFacturacion) => (
              <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{doc.receptor?.razon_social ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {doc.asunto ? `${doc.asunto.codigo} — ${doc.asunto.nombre}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{doc.emisor?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{TIPO_LABEL[doc.tipo_documento] ?? doc.tipo_documento}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">
                  {formatCurrency(doc.valor, doc.moneda)}
                </td>
                <td className="px-4 py-3 text-gray-500">{doc.moneda}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={ESTADO_VARIANT[doc.estado] ?? 'default'}>{doc.estado}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => { setEditingDoc(doc); setModalOpen(true); }}
                      className="text-xs text-gray-500 hover:text-teal-600 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => billingService.updateDocument(doc.id, { estado: 'Anulado' }).then(() => queryClient.invalidateQueries({ queryKey: ['billing', 'documents'] }))}
                      className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Anular
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {docsData && docsData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {docsData.pagination.total} registros — Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      <DocumentoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        documento={editingDoc}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['billing', 'documents'] })}
      />
    </div>
  );
}

// ─── Documento Modal ──────────────────────────────────────────────────────────

const docSchema = z.object({
  tipo_documento: z.enum(['Factura', 'NotaDebito', 'NotaCredito', 'Recibo', 'Otro']),
  receptor_id: z.coerce.number().int().positive('Receptor requerido'),
  emisor_id: z.coerce.number().int().positive().optional().nullable(),
  asunto_id: z.coerce.number().int().positive().optional().nullable(),
  rango_fecha_inicio: z.string().min(1, 'Requerido'),
  rango_fecha_fin: z.string().min(1, 'Requerido'),
  valor: z.coerce.number().min(0, 'Requerido'),
  moneda: z.enum(['COP', 'USD', 'EUR']),
  impuesto_id: z.coerce.number().int().positive().optional().nullable(),
  gravamen_id: z.coerce.number().int().positive().optional().nullable(),
  tasa_cambio_id: z.coerce.number().int().positive().optional().nullable(),
  estado: z.enum(['Borrador', 'Emitido', 'Pagado', 'Anulado']).optional(),
});
type DocFormValues = z.infer<typeof docSchema>;

function DocumentoModal({
  isOpen,
  onClose,
  documento,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  documento?: DocumentoFacturacion;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!documento;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<DocFormValues>({
    resolver: zodResolver(docSchema),
  });

  const moneda = watch('moneda');

  useState(() => {
    if (isOpen) {
      reset(
        documento
          ? {
              tipo_documento: documento.tipo_documento,
              receptor_id: documento.receptor_id,
              emisor_id: documento.emisor_id ?? undefined,
              asunto_id: documento.asunto_id ?? undefined,
              rango_fecha_inicio: documento.rango_fecha_inicio?.slice(0, 10),
              rango_fecha_fin: documento.rango_fecha_fin?.slice(0, 10),
              valor: typeof documento.valor === 'string' ? parseFloat(documento.valor) : documento.valor,
              moneda: documento.moneda,
              impuesto_id: documento.impuesto_id ?? undefined,
              gravamen_id: documento.gravamen_id ?? undefined,
              tasa_cambio_id: documento.tasa_cambio_id ?? undefined,
              estado: documento.estado,
            }
          : {
              tipo_documento: 'Factura',
              moneda: 'COP',
              estado: 'Borrador',
            }
      );
    }
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 200 }),
  });
  const { data: usersData } = useQuery({
    queryKey: ['users', 'activos'],
    queryFn: () => userService.getUsers({ estado: 'Activo', limit: 200 }),
  });
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
    mutationFn: (values: DocFormValues) => {
      const payload = {
        ...values,
        emisor_id: values.emisor_id || null,
        asunto_id: values.asunto_id || null,
        impuesto_id: values.impuesto_id || null,
        gravamen_id: values.gravamen_id || null,
        tasa_cambio_id: values.tasa_cambio_id || null,
      };
      if (isEditing && documento) return billingService.updateDocument(documento.id, payload);
      return billingService.createDocument(payload as Parameters<typeof billingService.createDocument>[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'documents'] });
      onSuccess?.();
      onClose();
    },
  });

  const clienteOptions = (clientesData?.data ?? []).map((c) => ({ value: c.id, label: `${c.codigo} — ${c.razon_social}` }));
  const userOptions = (usersData?.data ?? []).map((u) => ({ value: u.id, label: u.nombre }));
  const impuestoOptions = (impuestosData?.data ?? []).map((i) => ({ value: i.id, label: `${i.nombre} (${i.porcentaje}%)` }));
  const gravamenOptions = (gravamenesData?.data ?? []).map((g) => ({ value: g.id, label: `${g.nombre} — ${g.valor}` }));
  const tasaOptions = (tasasData?.data ?? []).map((t) => ({ value: t.id, label: `${t.moneda_origen} → ${t.moneda_destino}: ${t.tasa}` }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Documento' : 'Crear Documento'}
      maxWidth="xl"
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
          label="Receptor"
          required
          options={clienteOptions}
          placeholder="Seleccionar cliente"
          error={errors.receptor_id?.message}
          {...register('receptor_id')}
        />
        <Select
          label="Emisor"
          options={userOptions}
          placeholder="Seleccionar"
          {...register('emisor_id')}
        />
        <Select
          label="Moneda"
          required
          options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
          {...register('moneda')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Fecha inicio <span className="text-red-500">*</span></label>
          <input type="date" className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" {...register('rango_fecha_inicio')} />
          {errors.rango_fecha_inicio && <p className="text-xs text-red-600">{errors.rango_fecha_inicio.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Fecha fin <span className="text-red-500">*</span></label>
          <input type="date" className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" {...register('rango_fecha_fin')} />
          {errors.rango_fecha_fin && <p className="text-xs text-red-600">{errors.rango_fecha_fin.message}</p>}
        </div>
        <Input label="Valor" type="number" required error={errors.valor?.message} {...register('valor')} />
        <Select label="Estado" options={[{ value: 'Borrador', label: 'Borrador' }, { value: 'Emitido', label: 'Emitido' }, { value: 'Pagado', label: 'Pagado' }, { value: 'Anulado', label: 'Anulado' }]} {...register('estado')} />
        <Select label="Impuesto" options={impuestoOptions} placeholder="Ninguno" {...register('impuesto_id')} />
        <Select label="Gravamen" options={gravamenOptions} placeholder="Ninguno" {...register('gravamen_id')} />
        {moneda !== 'COP' && (
          <div className="col-span-2">
            <Select label="Tasa de Cambio" options={tasaOptions} placeholder="Seleccionar tasa" {...register('tasa_cambio_id')} />
          </div>
        )}
      </div>
      {mutation.isError && <p className="mt-3 text-sm text-red-600">{(mutation.error as Error).message}</p>}
    </Modal>
  );
}

// ─── Tasas de Cambio Tab ──────────────────────────────────────────────────────

const tasaSchema = z.object({
  moneda_origen: z.enum(['COP', 'USD', 'EUR']),
  moneda_destino: z.enum(['COP', 'USD', 'EUR']),
  tasa: z.coerce.number().positive('Requerido'),
  fecha_vigencia: z.string().min(1, 'Requerido'),
});
type TasaFormValues = z.infer<typeof tasaSchema>;

function TasasCambioTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TasaCambio | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['tasas-cambio'],
    queryFn: () => billingService.getTasasCambio(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => billingService.deleteTasaCambio(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasas-cambio'] }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TasaFormValues>({
    resolver: zodResolver(tasaSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (values: TasaFormValues) => {
      if (editing) return billingService.updateTasaCambio(editing.id, values);
      return billingService.createTasaCambio(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasas-cambio'] });
      setModalOpen(false);
    },
  });

  const openModal = (tasa?: TasaCambio) => {
    setEditing(tasa);
    reset(tasa ? {
      moneda_origen: tasa.moneda_origen as 'COP' | 'USD' | 'EUR',
      moneda_destino: tasa.moneda_destino as 'COP' | 'USD' | 'EUR',
      tasa: typeof tasa.tasa === 'string' ? parseFloat(tasa.tasa) : tasa.tasa,
      fecha_vigencia: tasa.fecha_vigencia?.slice(0, 10),
    } : { moneda_origen: 'USD', moneda_destino: 'COP' });
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openModal()}>+ Nueva Tasa</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Origen</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Destino</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tasa</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha vigencia</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Cargando...</td></tr>}
            {!isLoading && (data?.data ?? []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin tasas</td></tr>}
            {!isLoading && (data?.data ?? []).map((t: TasaCambio) => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{t.moneda_origen}</td>
                <td className="px-4 py-3 text-gray-600">{t.moneda_destino}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">{t.tasa}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{t.fecha_vigencia ? format(new Date(t.fecha_vigencia), 'dd/MM/yyyy') : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openModal(t)} className="text-xs text-gray-500 hover:text-teal-600 px-2 py-1 rounded hover:bg-gray-100">Editar</button>
                    <button onClick={() => { if (confirm('¿Eliminar tasa?')) deleteMutation.mutate(t.id); }} className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Tasa' : 'Nueva Tasa'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit((v) => saveMutation.mutate(v))} loading={saveMutation.isPending}>{editing ? 'Guardar' : 'Crear'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Moneda origen" required options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} error={errors.moneda_origen?.message} {...register('moneda_origen')} />
          <Select label="Moneda destino" required options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} error={errors.moneda_destino?.message} {...register('moneda_destino')} />
          <Input label="Tasa" type="number" step="0.000001" required error={errors.tasa?.message} {...register('tasa')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha vigencia <span className="text-red-500">*</span></label>
            <input type="date" className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" {...register('fecha_vigencia')} />
            {errors.fecha_vigencia && <p className="text-xs text-red-600">{errors.fecha_vigencia.message}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Impuestos Tab ────────────────────────────────────────────────────────────

const impuestoSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  porcentaje: z.coerce.number().min(0, 'Requerido'),
});
type ImpuestoFormValues = z.infer<typeof impuestoSchema>;

function ImpuestosTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Impuesto | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['impuestos'],
    queryFn: () => billingService.getImpuestos(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => billingService.deleteImpuesto(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['impuestos'] }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ImpuestoFormValues>({
    resolver: zodResolver(impuestoSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (values: ImpuestoFormValues) => {
      if (editing) return billingService.updateImpuesto(editing.id, values);
      return billingService.createImpuesto(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impuestos'] });
      setModalOpen(false);
    },
  });

  const openModal = (imp?: Impuesto) => {
    setEditing(imp);
    reset(imp ? {
      nombre: imp.nombre,
      porcentaje: typeof imp.porcentaje === 'string' ? parseFloat(imp.porcentaje) : imp.porcentaje,
    } : {});
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openModal()}>+ Nuevo Impuesto</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Porcentaje</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Cargando...</td></tr>}
            {!isLoading && (data?.data ?? []).length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Sin impuestos</td></tr>}
            {!isLoading && (data?.data ?? []).map((imp: Impuesto) => (
              <tr key={imp.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{imp.nombre}</td>
                <td className="px-4 py-3 text-right text-gray-700">{imp.porcentaje}%</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openModal(imp)} className="text-xs text-gray-500 hover:text-teal-600 px-2 py-1 rounded hover:bg-gray-100">Editar</button>
                    <button onClick={() => { if (confirm('¿Eliminar?')) deleteMutation.mutate(imp.id); }} className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Impuesto' : 'Nuevo Impuesto'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit((v) => saveMutation.mutate(v))} loading={saveMutation.isPending}>{editing ? 'Guardar' : 'Crear'}</Button></>}>
        <div className="flex flex-col gap-4">
          <Input label="Nombre" required error={errors.nombre?.message} {...register('nombre')} />
          <Input label="Porcentaje (%)" type="number" step="0.01" required error={errors.porcentaje?.message} {...register('porcentaje')} />
        </div>
      </Modal>
    </div>
  );
}

// ─── Gravámenes Tab ───────────────────────────────────────────────────────────

const gravamenSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  valor: z.coerce.number().min(0, 'Requerido'),
});
type GravamenFormValues = z.infer<typeof gravamenSchema>;

function GravamenesTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Gravamen | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['gravamenes'],
    queryFn: () => billingService.getGravamenes(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => billingService.deleteGravamen(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gravamenes'] }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GravamenFormValues>({
    resolver: zodResolver(gravamenSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (values: GravamenFormValues) => {
      if (editing) return billingService.updateGravamen(editing.id, values);
      return billingService.createGravamen(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gravamenes'] });
      setModalOpen(false);
    },
  });

  const openModal = (grav?: Gravamen) => {
    setEditing(grav);
    reset(grav ? {
      nombre: grav.nombre,
      valor: typeof grav.valor === 'string' ? parseFloat(grav.valor) : grav.valor,
    } : {});
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openModal()}>+ Nuevo Gravamen</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Cargando...</td></tr>}
            {!isLoading && (data?.data ?? []).length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Sin gravámenes</td></tr>}
            {!isLoading && (data?.data ?? []).map((g: Gravamen) => (
              <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{g.nombre}</td>
                <td className="px-4 py-3 text-right text-gray-700">{g.valor}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openModal(g)} className="text-xs text-gray-500 hover:text-teal-600 px-2 py-1 rounded hover:bg-gray-100">Editar</button>
                    <button onClick={() => { if (confirm('¿Eliminar?')) deleteMutation.mutate(g.id); }} className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Gravamen' : 'Nuevo Gravamen'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit((v) => saveMutation.mutate(v))} loading={saveMutation.isPending}>{editing ? 'Guardar' : 'Crear'}</Button></>}>
        <div className="flex flex-col gap-4">
          <Input label="Nombre" required error={errors.nombre?.message} {...register('nombre')} />
          <Input label="Valor" type="number" step="0.01" required error={errors.valor?.message} {...register('valor')} />
        </div>
      </Modal>
    </div>
  );
}
