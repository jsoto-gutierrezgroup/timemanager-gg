/**
 * Convert minutes to "H:MM" display string.
 * e.g. 90 → "1:30", 0 → "0:00"
 */
export function minutesToHHMM(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Format a numeric amount with currency symbol.
 * e.g. (1500000, 'COP') → "COP 1,500,000"
 */
export function formatCurrency(amount: number, moneda: string): string {
  const formatted = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${moneda} ${formatted}`;
}

/**
 * Format a Date or ISO string as "dd/MM/yyyy".
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
