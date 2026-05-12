import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from '../ui/Select';
import { clienteService } from '../../services/clienteService';
import { asuntoService } from '../../services/asuntoService';

interface ClienteAsuntoSelectProps {
  clienteId: number | null;
  asuntoId: number | null;
  onClienteChange: (id: number | null) => void;
  onAsuntoChange: (id: number | null) => void;
  error?: { cliente?: string; asunto?: string };
  disabled?: boolean;
}

export function ClienteAsuntoSelect({
  clienteId,
  asuntoId,
  onClienteChange,
  onAsuntoChange,
  error,
  disabled,
}: ClienteAsuntoSelectProps) {
  const { data: clientesData, isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes', 'activos'],
    queryFn: () => clienteService.getClientes({ estado: 'Activo', limit: 100 }),
  });

  const { data: asuntosData, isLoading: loadingAsuntos } = useQuery({
    queryKey: ['asuntos', clienteId],
    queryFn: () =>
      asuntoService.getAsuntos({ cliente_id: clienteId!, estado: 'Activo', limit: 100 }),
    enabled: clienteId != null,
  });

  // Reset asunto when cliente changes
  useEffect(() => {
    onAsuntoChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const clienteOptions = (clientesData?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.codigo} — ${c.razon_social}`,
  }));

  const asuntoOptions = (asuntosData?.data ?? []).map((a) => ({
    value: a.id,
    label: `${a.codigo} — ${a.nombre}`,
  }));

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Cliente"
        required
        disabled={disabled || loadingClientes}
        placeholder="Seleccione un cliente"
        value={clienteId ?? ''}
        options={clienteOptions}
        error={error?.cliente}
        onChange={(e) => {
          const val = e.target.value;
          onClienteChange(val ? parseInt(val, 10) : null);
        }}
      />
      <Select
        label="Asunto"
        required
        disabled={disabled || clienteId == null || loadingAsuntos}
        placeholder={clienteId == null ? 'Seleccione primero un cliente' : 'Seleccione un asunto'}
        value={asuntoId ?? ''}
        options={asuntoOptions}
        error={error?.asunto}
        onChange={(e) => {
          const val = e.target.value;
          onAsuntoChange(val ? parseInt(val, 10) : null);
        }}
      />
    </div>
  );
}
