import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { tarifasService, Tarifa } from '../../../services/tarifasService';

const schema = z.object({
  usuario_id: z.coerce.number().int().positive().optional().nullable(),
  categoria_id: z.coerce.number().int().positive().optional().nullable(),
  cliente_id: z.coerce.number().int().positive().optional().nullable(),
  valor: z.coerce.number().positive('Requerido'),
  moneda: z.enum(['COP', 'USD', 'EUR']),
});

type FormValues = z.infer<typeof schema>;
type Tab = 'usuario' | 'categoria' | 'cliente';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tarifa?: Tarifa;
  currentTab: Tab;
  usuariosData: any[];
  categoriasData: any[];
  clientesData: any[];
  onSuccess?: () => void;
}

export function TarifaModal({
  isOpen,
  onClose,
  tarifa,
  currentTab,
  usuariosData,
  categoriasData,
  clientesData,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!tarifa;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      moneda: 'COP',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing && tarifa) {
        reset({
          usuario_id: tarifa.usuario_id ?? undefined,
          categoria_id: tarifa.categoria_id ?? undefined,
          cliente_id: tarifa.cliente_id ?? undefined,
          valor: typeof tarifa.valor === 'string' ? parseFloat(tarifa.valor) : tarifa.valor,
          moneda: tarifa.moneda,
        });
      } else {
        reset({
          usuario_id: undefined,
          categoria_id: undefined,
          cliente_id: undefined,
          valor: undefined,
          moneda: 'COP',
        });
      }
    }
  }, [isOpen, tarifa, reset, isEditing]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        usuario_id: values.usuario_id || null,
        categoria_id: values.categoria_id || null,
        cliente_id: values.cliente_id || null,
        valor: values.valor,
        moneda: values.moneda,
      };
      if (isEditing && tarifa) {
        return tarifasService.updateTarifa(tarifa.id, payload);
      }
      return tarifasService.createTarifa(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarifas'] });
      onSuccess?.();
      onClose();
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  const usuarioId = watch('usuario_id');
  const categoriaId = watch('categoria_id');
  const clienteId = watch('cliente_id');

  const getTitle = () => {
    if (isEditing) return 'Editar Tarifa';
    switch (currentTab) {
      case 'usuario':
        return 'Crear Tarifa por Usuario';
      case 'categoria':
        return 'Crear Tarifa por Categoría';
      case 'cliente':
        return 'Crear Tarifa por Cliente';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={mutation.isPending}>
            {isEditing ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        {/* POR USUARIO */}
        {currentTab === 'usuario' && (
          <>
            <Select
              label="Usuario"
              required
              options={usuariosData.map((u) => ({ value: String(u.id), label: u.nombre }))}
              placeholder="Seleccionar"
              error={errors.usuario_id?.message}
              {...register('usuario_id')}
            />
            <Select
              label="Cliente (Opcional)"
              options={clientesData.map((c) => ({ value: String(c.id), label: c.razon_social }))}
              placeholder="Seleccionar"
              {...register('cliente_id')}
            />
          </>
        )}

        {/* POR CATEGORÍA */}
        {currentTab === 'categoria' && (
          <>
            <Select
              label="Categoría"
              required
              options={categoriasData.map((c) => ({ value: String(c.id), label: c.nombre }))}
              placeholder="Seleccionar"
              error={errors.categoria_id?.message}
              {...register('categoria_id')}
            />
            <Select
              label="Cliente (Opcional)"
              options={clientesData.map((c) => ({ value: String(c.id), label: c.razon_social }))}
              placeholder="Seleccionar"
              {...register('cliente_id')}
            />
          </>
        )}

        {/* POR CLIENTE */}
        {currentTab === 'cliente' && (
          <Select
            label="Cliente"
            required
            options={clientesData.map((c) => ({ value: String(c.id), label: c.razon_social }))}
            placeholder="Seleccionar"
            error={errors.cliente_id?.message}
            {...register('cliente_id')}
          />
        )}

        <Input
          label="Valor"
          type="number"
          step="0.01"
          required
          error={errors.valor?.message}
          {...register('valor')}
        />

        <Select
          label="Moneda"
          required
          options={[
            { value: 'COP', label: 'COP' },
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
          ]}
          placeholder="Seleccionar"
          error={errors.moneda?.message}
          {...register('moneda')}
        />
      </div>

      {mutation.isError && (
        <p className="mt-3 text-sm text-red-600">{(mutation.error as Error).message}</p>
      )}
    </Modal>
  );
}
