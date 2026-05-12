/**
 * Format a number as currency using Intl.NumberFormat.
 * Supports COP, USD, EUR.
 */
export function formatCurrency(amount: number | string, moneda: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';

  const localeMap: Record<string, string> = {
    COP: 'es-CO',
    USD: 'en-US',
    EUR: 'de-DE',
  };

  const locale = localeMap[moneda] ?? 'es-CO';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moneda || 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
