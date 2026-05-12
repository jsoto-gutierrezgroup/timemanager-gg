/**
 * Convert minutes to "H:MM" format.
 * e.g. 90 → "1:30", 5 → "0:05", 0 → "0:00"
 */
export function minutesToHHMM(minutes: number): string {
  const totalMins = Math.max(0, Math.round(minutes));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Convert "HH:MM" string to minutes.
 * e.g. "1:30" → 90, "01:30" → 90
 */
export function hhmmToMinutes(value: string): number {
  const parts = value.split(':');
  if (parts.length !== 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Format seconds as "H:MM:SS" for the live timer display.
 */
export function secondsToDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format minutes as a human-readable label.
 * e.g. 90 → "1h 30m", 30 → "30m", 0 → "0m"
 */
export function minutesToLabel(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
