export const TIPO_FACTURACION_LABELS: Record<string, string> = {
  PorHoras: 'Por Horas',
  PorHorasConMontoEditable: 'Por Horas (Editable)',
  PorHitosOEtapas: 'Por Hitos',
  MontoFijoMensual: 'Monto Fijo Mensual',
};

export function getTipoFacturacionLabel(tipo: string): string {
  return TIPO_FACTURACION_LABELS[tipo] ?? tipo;
}

export const TIPO_FACTURACION_OPTIONS = Object.entries(TIPO_FACTURACION_LABELS).map(
  ([value, label]) => ({ value, label })
);
