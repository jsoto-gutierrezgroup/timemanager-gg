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
import { jobsService } from '../../../services/jobsService';
import { clienteService } from '../../../services/clienteService';
import { userService } from '../../../services/userService';
import { useAuthStore } from '../../../store/authStore';
import type { Job } from '../../../types';

const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'default'> = {
  Activo: 'success',
  Cerrado: 'default',
  Pausado: 'warning',
};

export function JobsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [misSoloJobs, setMisSoloJobs] = useState(false);
  const [responsableId, setResponsableId] = useState<number | null>(null);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined);

  const { data: usersData } = useQuery({
    queryKey: ['users', 'activos'],
    queryFn: () => userService.getUsers({ estado: 'Activo', limit: 200 }),
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 200 }),
  });

  const effectiveResponsableId = misSoloJobs ? (user?.id ?? null) : responsableId;

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs', { responsableId: effectiveResponsableId, clienteId, tipo, estado, page }],
    queryFn: () =>
      jobsService.getJobs({
        responsable_id: effectiveResponsableId ?? undefined,
        cliente_id: clienteId ?? undefined,
        tipo: tipo || undefined,
        estado: (estado as 'Activo' | 'Cerrado' | 'Pausado') || undefined,
        page,
        limit: 50,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => jobsService.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setSelectedJob(null);
    },
  });

  const userOptions = (usersData?.data ?? []).map((u) => ({ value: u.id, label: u.nombre }));
  const clienteOptions = (clientesData?.data ?? []).map((c) => ({ value: c.id, label: `${c.codigo} — ${c.razon_social}` }));

  const jobs = jobsData?.data ?? [];

  return (
    <div className="flex gap-0 h-[calc(100vh-120px)]">
      {/* Left Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
        {/* Sidebar Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Jobs</h2>
            <Button size="sm" onClick={() => { setEditingJob(undefined); setModalOpen(true); }}>
              + Crear
            </Button>
          </div>

          {/* Mis Jobs toggle */}
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={misSoloJobs}
              onChange={(e) => { setMisSoloJobs(e.target.checked); setPage(1); }}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs text-gray-700">Mis Jobs</span>
          </label>

          {/* Filters */}
          <div className="flex flex-col gap-2">
            {!misSoloJobs && (
              <Select
                label="Responsable"
                options={userOptions}
                placeholder="Todos"
                value={responsableId ?? ''}
                onChange={(e) => { setResponsableId(e.target.value ? parseInt(e.target.value, 10) : null); setPage(1); }}
              />
            )}
            <Select
              label="Cliente"
              options={clienteOptions}
              placeholder="Todos"
              value={clienteId ?? ''}
              onChange={(e) => { setClienteId(e.target.value ? parseInt(e.target.value, 10) : null); setPage(1); }}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Tipo</label>
              <input
                type="text"
                placeholder="Filtrar por tipo..."
                value={tipo}
                onChange={(e) => { setTipo(e.target.value); setPage(1); }}
                className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Select
              label="Estado"
              options={[
                { value: 'Activo', label: 'Activo' },
                { value: 'Cerrado', label: 'Cerrado' },
                { value: 'Pausado', label: 'Pausado' },
              ]}
              placeholder="Todos"
              value={estado}
              onChange={(e) => { setEstado(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Job List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              Cargando...
            </div>
          )}
          {!isLoading && jobs.length === 0 && (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              Sin jobs
            </div>
          )}
          {!isLoading && jobs.map((job: Job) => (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={[
                'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                selectedJob?.id === job.id ? 'bg-teal-50 border-l-2 border-l-teal-500' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-gray-800 truncate">{job.nombre}</div>
                  {job.cliente && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">{job.cliente.razon_social}</div>
                  )}
                </div>
                <Badge variant={ESTADO_VARIANT[job.estado] ?? 'default'}>{job.estado}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {job.tipo && <span className="text-xs text-gray-400">{job.tipo}</span>}
                <span className="text-xs text-gray-400">{job.created_at ? format(new Date(job.created_at), 'dd/MM/yy') : ''}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {!selectedJob ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">Selecciona un job para ver el detalle</p>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-xl">
            {/* Job Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedJob.nombre}</h2>
                <div className="mt-1">
                  <Badge variant={ESTADO_VARIANT[selectedJob.estado] ?? 'default'}>{selectedJob.estado}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setEditingJob(selectedJob); setModalOpen(true); }}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => { if (confirm('¿Eliminar job?')) deleteMutation.mutate(selectedJob.id); }}
                >
                  Eliminar
                </Button>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              <DetailRow label="Responsable" value={selectedJob.responsable?.nombre ?? '—'} />
              <DetailRow label="Cliente" value={selectedJob.cliente?.razon_social ?? '—'} />
              <DetailRow label="Tipo" value={selectedJob.tipo ?? '—'} />
              <DetailRow label="Estado" value={selectedJob.estado} />
              <DetailRow
                label="Fecha creación"
                value={selectedJob.created_at ? format(new Date(selectedJob.created_at), 'dd/MM/yyyy') : '—'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Job Modal */}
      <JobModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        job={editingJob}
        onSuccess={(updatedJob) => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          if (updatedJob) setSelectedJob(updatedJob);
        }}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

// ─── Job Modal ────────────────────────────────────────────────────────────────

const jobSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  responsable_id: z.coerce.number().int().positive().optional().nullable(),
  cliente_id: z.coerce.number().int().positive().optional().nullable(),
  tipo: z.string().optional().nullable(),
  estado: z.enum(['Activo', 'Cerrado', 'Pausado']).optional(),
});
type JobFormValues = z.infer<typeof jobSchema>;

function JobModal({
  isOpen,
  onClose,
  job,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  job?: Job;
  onSuccess?: (job?: Job) => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!job;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        job
          ? {
              nombre: job.nombre,
              responsable_id: job.responsable_id ?? undefined,
              cliente_id: job.cliente_id ?? undefined,
              tipo: job.tipo ?? '',
              estado: job.estado,
            }
          : {
              nombre: '',
              tipo: '',
              estado: 'Activo',
            }
      );
    }
  }, [isOpen, job, reset]);

  const { data: usersData } = useQuery({
    queryKey: ['users', 'activos'],
    queryFn: () => userService.getUsers({ estado: 'Activo', limit: 200 }),
  });

  const { data: clientesData } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 200 }),
  });

  const mutation = useMutation({
    mutationFn: (values: JobFormValues) => {
      const payload = {
        nombre: values.nombre,
        responsable_id: values.responsable_id || null,
        cliente_id: values.cliente_id || null,
        tipo: values.tipo || null,
        estado: values.estado,
      };
      if (isEditing && job) return jobsService.updateJob(job.id, payload);
      return jobsService.createJob(payload as Parameters<typeof jobsService.createJob>[0]);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onSuccess?.(result as Job);
      onClose();
    },
  });

  const userOptions = (usersData?.data ?? []).map((u) => ({ value: u.id, label: u.nombre }));
  const clienteOptions = (clientesData?.data ?? []).map((c) => ({ value: c.id, label: `${c.codigo} — ${c.razon_social}` }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Job' : 'Crear Job'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} loading={mutation.isPending}>
            {isEditing ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Nombre" required error={errors.nombre?.message} {...register('nombre')} />
        <Select
          label="Responsable"
          options={userOptions}
          placeholder="Seleccionar"
          {...register('responsable_id')}
        />
        <Select
          label="Cliente"
          options={clienteOptions}
          placeholder="Seleccionar"
          {...register('cliente_id')}
        />
        <Input label="Tipo" placeholder="Ej. Corporativo, Laboral..." {...register('tipo')} />
        <Select
          label="Estado"
          options={[
            { value: 'Activo', label: 'Activo' },
            { value: 'Cerrado', label: 'Cerrado' },
            { value: 'Pausado', label: 'Pausado' },
          ]}
          placeholder="Seleccionar"
          {...register('estado')}
        />
      </div>
      {mutation.isError && <p className="mt-3 text-sm text-red-600">{(mutation.error as Error).message}</p>}
    </Modal>
  );
}
