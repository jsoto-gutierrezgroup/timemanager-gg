import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { clienteService } from '../../services/clienteService';
import { userService } from '../../services/userService';
import type { Cliente } from '../../types';

const schema = z.object({
  razon_social: z.string().min(1, 'Requerido'),
  nombre_comercial: z.string().optional().nullable(),
  tipo_documento: z.string().optional().nullable(),
  numero_documento: z.string().optional().nullable(),
  pais: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  sector: z.string().optional().nullable(),
  tipo: z.string().optional().nullable(),
  responsable_id: z.coerce.number().int().positive().optional().nullable(),
  emisor_facturacion_id: z.coerce.number().int().positive().optional().nullable(),
  grupo_empresarial_id: z.coerce.number().int().positive().optional().nullable(),
  estado: z.enum(['Activo', 'Inactivo']).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cliente?: Cliente;
  onSuccess?: () => void;
}

export function ClienteModal({ isOpen, onClose, cliente, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!cliente;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        cliente
          ? {
              razon_social: cliente.razon_social,
              nombre_comercial: cliente.nombre_comercial ?? '',
              tipo_documento: cliente.tipo_documento ?? '',
              numero_documento: cliente.numero_documento ?? '',
              pais: cliente.pais ?? '',
              ciudad: cliente.ciudad ?? '',
              sector: cliente.sector ?? '',
              tipo: cliente.tipo ?? '',
              responsable_id: cliente.responsable_id ?? undefined,
              emisor_facturacion_id: cliente.emisor_facturacion_id ?? undefined,
              estado: cliente.estado,
            }
          : {
              razon_social: '',
              nombre_comercial: '',
              tipo_documento: '',
              numero_documento: '',
              pais: '',
              ciudad: '',
              sector: '',
              tipo: '',
              estado: 'Activo',
            }
      );
    }
  }, [isOpen, cliente, reset]);

  const { data: usersData } = useQuery({
    queryKey: ['users', 'activos'],
    queryFn: () => userService.getUsers({ estado: 'Activo', limit: 200 }),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        responsable_id: values.responsable_id || null,
        emisor_facturacion_id: values.emisor_facturacion_id || null,
        grupo_empresarial_id: values.grupo_empresarial_id || null,
      };
      if (isEditing && cliente) {
        return clienteService.updateCliente(cliente.id, payload);
      }
      return clienteService.createCliente(payload as Parameters<typeof clienteService.createCliente>[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wip'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      onSuccess?.();
      onClose();
    },
  });

  const userOptions = (usersData?.data ?? []).map((u) => ({ value: u.id, label: u.nombre }));

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
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
          <Input
            label="Razón Social"
            required
            error={errors.razon_social?.message}
            {...register('razon_social')}
          />
        </div>
        <Input label="Nombre Comercial" {...register('nombre_comercial')} />
        <Select
          label="Tipo Documento"
          options={[
            { value: 'CC', label: 'CC' },
            { value: 'NIT', label: 'NIT' },
            { value: 'Pasaporte', label: 'Pasaporte' },
            { value: 'RUT', label: 'RUT' },
            { value: 'CE', label: 'CE' },
            { value: 'Otro', label: 'Otro' },
          ]}
          placeholder="Seleccionar"
          {...register('tipo_documento')}
        />
        <Input label="Número Documento" {...register('numero_documento')} />
        <Input label="País" {...register('pais')} />
        <Input label="Ciudad" {...register('ciudad')} />
        <Input label="Sector" {...register('sector')} />
        <Input label="Tipo" {...register('tipo')} />
        <Select
          label="Responsable"
          options={userOptions}
          placeholder="Seleccionar"
          {...register('responsable_id')}
        />
        <Select
          label="Emisor de Facturación"
          options={userOptions}
          placeholder="Seleccionar"
          {...register('emisor_facturacion_id')}
        />
        <Select
          label="Estado"
          options={[
            { value: 'Activo', label: 'Activo' },
            { value: 'Inactivo', label: 'Inactivo' },
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
