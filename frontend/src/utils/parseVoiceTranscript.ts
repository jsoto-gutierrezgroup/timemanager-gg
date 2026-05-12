import { format, subDays, startOfWeek, addDays } from 'date-fns';

export interface ParsedTimeEntry {
  actividad?: string;
  fecha?: string;       // 'yyyy-MM-dd'
  duracion?: string;    // 'HH:MM'
  facturable?: boolean;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Convert various word forms to a numeric value if possible */
function wordToNumber(word: string): number | null {
  const map: Record<string, number> = {
    una: 1, un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11,
    doce: 12, trece: 13, catorce: 14, quince: 15, dieciséis: 16,
    dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
    veinte: 20, veintiuno: 21, veintidós: 22, veintidos: 22,
    veintitrés: 23, veintitres: 23, veinticuatro: 24,
    media: 30, // "media hora" = 30 min
  };
  const n = parseFloat(word);
  if (!isNaN(n)) return n;
  return map[word.toLowerCase()] ?? null;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseVoiceTranscript(
  transcript: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _clientes: { id: number; razon_social: string }[]
): ParsedTimeEntry {
  const lower = transcript.toLowerCase().trim();
  let remainder = lower;
  const result: ParsedTimeEntry = {};

  // ── Facturable ──────────────────────────────────────────────────────────────
  if (/no facturable|interno|no factura/i.test(remainder)) {
    result.facturable = false;
    remainder = remainder.replace(/no facturable|interno|no factura/gi, '').trim();
  } else {
    result.facturable = true;
  }

  // ── Duración ────────────────────────────────────────────────────────────────
  // Patterns (in order of specificity):
  // "1 hora 30 minutos", "una hora y media", "media hora", "2 horas", "45 minutos"

  let durationMinutes: number | null = null;

  // "X hora(s) Y minuto(s)" or "X hora(s) y Y minuto(s)"
  const horaMinutoMatch = remainder.match(
    /(\w+)\s+hora[s]?\s+(?:y\s+)?(\w+)\s+minuto[s]?/i
  );
  if (horaMinutoMatch) {
    const h = wordToNumber(horaMinutoMatch[1]) ?? 0;
    const m = wordToNumber(horaMinutoMatch[2]) ?? 0;
    durationMinutes = h * 60 + m;
    remainder = remainder.replace(horaMinutoMatch[0], '').trim();
  }

  // "X hora(s) y media" → X:30
  if (durationMinutes === null) {
    const horaMedMatch = remainder.match(/(\w+)\s+hora[s]?\s+y\s+media/i);
    if (horaMedMatch) {
      const h = wordToNumber(horaMedMatch[1]) ?? 0;
      durationMinutes = h * 60 + 30;
      remainder = remainder.replace(horaMedMatch[0], '').trim();
    }
  }

  // "media hora" → 30 min
  if (durationMinutes === null && /media hora/i.test(remainder)) {
    durationMinutes = 30;
    remainder = remainder.replace(/media hora/gi, '').trim();
  }

  // "X hora(s)" only
  if (durationMinutes === null) {
    const horaMatch = remainder.match(/(\w+)\s+hora[s]?/i);
    if (horaMatch) {
      const h = wordToNumber(horaMatch[1]);
      if (h !== null) {
        durationMinutes = h * 60;
        remainder = remainder.replace(horaMatch[0], '').trim();
      }
    }
  }

  // "X minuto(s)" only
  if (durationMinutes === null) {
    const minMatch = remainder.match(/(\w+)\s+minuto[s]?/i);
    if (minMatch) {
      const m = wordToNumber(minMatch[1]);
      if (m !== null) {
        durationMinutes = m;
        remainder = remainder.replace(minMatch[0], '').trim();
      }
    }
  }

  if (durationMinutes !== null && durationMinutes >= 0) {
    result.duracion = minutesToHHMM(durationMinutes);
  }

  // ── Fecha ────────────────────────────────────────────────────────────────────
  const today = new Date();

  if (/\bhoy\b/i.test(remainder)) {
    result.fecha = format(today, 'yyyy-MM-dd');
    remainder = remainder.replace(/\bhoy\b/gi, '').trim();
  } else if (/\bayer\b/i.test(remainder)) {
    result.fecha = format(subDays(today, 1), 'yyyy-MM-dd');
    remainder = remainder.replace(/\bayer\b/gi, '').trim();
  } else {
    // "el lunes/martes/..." → most recent past weekday
    const weekdays: Record<string, number> = {
      lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
      jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 0,
    };

    const dayMatch = remainder.match(/\bel\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i);
    if (dayMatch) {
      const targetDay = weekdays[dayMatch[1].toLowerCase()];
      if (targetDay !== undefined) {
        // Walk back from today to find most recent occurrence
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
        let candidate = addDays(weekStart, targetDay === 0 ? 6 : targetDay - 1);
        if (candidate > today) {
          candidate = subDays(candidate, 7);
        }
        result.fecha = format(candidate, 'yyyy-MM-dd');
        remainder = remainder.replace(dayMatch[0], '').trim();
      }
    }
  }

  // ── Actividad ────────────────────────────────────────────────────────────────
  // Strip filler words and punctuation
  const fillerWords = /\b(el|la|los|las|un|una|unos|unas|de|del|para|por|con|en|y|o|a|también|también)\b/gi;
  const actividad = remainder
    .replace(fillerWords, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (actividad.length > 0) {
    // Capitalize first letter
    result.actividad = actividad.charAt(0).toUpperCase() + actividad.slice(1);
  }

  return result;
}

