import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { tiempoService } from '../../services/tiempoService';
import { minutesToHHMM } from '../../utils/time';
import type { Tiempo } from '../../types';

export interface CalendarViewProps {
  userId?: number;
  mostrarTodos?: boolean;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── Day cell popover ─────────────────────────────────────────────────────────

interface DayCellProps {
  date: Date;
  entries: Tiempo[];
  isCurrentMonth: boolean;
  onEditEntry?: (t: Tiempo) => void;
}

function DayCell({ date, entries, isCurrentMonth, onEditEntry }: DayCellProps) {
  const [open, setOpen] = useState(false);
  const totalMinutes = entries.reduce((s, t) => s + t.duracion_horas, 0);
  const visibleEntries = entries.slice(0, 2);
  const extraCount = entries.length - visibleEntries.length;

  return (
    <div className="relative">
      <div
        className={[
          'min-h-[90px] border border-gray-100 p-1.5 flex flex-col gap-1 cursor-default',
          isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50',
        ].join(' ')}
        onClick={() => entries.length > 0 && setOpen(!open)}
      >
        {/* Date number */}
        <div className="flex items-center justify-between">
          <span
            className={[
              'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
              isToday(date)
                ? 'bg-red-500 text-white'
                : isCurrentMonth
                ? 'text-gray-700'
                : 'text-gray-300',
            ].join(' ')}
          >
            {format(date, 'd')}
          </span>
        </div>

        {/* Entry pills */}
        <div className="flex flex-col gap-0.5 flex-1">
          {visibleEntries.map((t) => (
            <div
              key={t.id}
              className="bg-teal-50 text-teal-700 border border-teal-200 rounded px-1 py-0.5 text-[10px] leading-tight truncate"
              title={`${t.cliente?.razon_social ?? ''}: ${t.actividad}`}
            >
              {t.cliente?.razon_social?.split(' ')[0] ?? '—'} {minutesToHHMM(t.duracion_horas)}
            </div>
          ))}
          {extraCount > 0 && (
            <span className="text-[10px] text-gray-400 pl-1">+{extraCount} más</span>
          )}
        </div>

        {/* Day total */}
        {totalMinutes > 0 && (
          <div className="text-[10px] text-gray-400 text-right font-mono">
            {minutesToHHMM(totalMinutes)}
          </div>
        )}
      </div>

      {/* Popover */}
      {open && entries.length > 0 && (
        <div className="absolute z-30 top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-700">
              {format(date, "EEEE d 'de' MMMM", { locale: es })}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          {entries.map((t) => (
            <div
              key={t.id}
              className="border border-gray-100 rounded-lg p-2 flex flex-col gap-0.5 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-teal-700">
                  {t.cliente?.razon_social ?? '—'}
                </span>
                <span className="font-mono text-xs text-gray-600">
                  {minutesToHHMM(t.duracion_horas)}
                </span>
              </div>
              <span className="text-[11px] text-gray-500 line-clamp-2">{t.actividad}</span>
              {onEditEntry && (
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); onEditEntry(t); }}
                  className="text-[10px] text-teal-600 hover:underline self-start mt-0.5"
                >
                  Editar
                </button>
              )}
            </div>
          ))}
          <div className="border-t border-gray-100 pt-1 text-right text-xs text-gray-500 font-mono">
            Total: {minutesToHHMM(entries.reduce((s, t) => s + t.duracion_horas, 0))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export function CalendarView({ userId, mostrarTodos }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [editingTiempo, setEditingTiempo] = useState<Tiempo | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const fechaInicio = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const fechaFin = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['tiempos', 'calendar', { userId, mostrarTodos, fechaInicio, fechaFin }],
    queryFn: () =>
      tiempoService.getTiempos({
        usuario_id: mostrarTodos ? undefined : userId,
        mostrar_todos: mostrarTodos,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        limit: 500,
        page: 1,
      }),
  });

  // Group tiempos by date string 'yyyy-MM-dd'
  const tiemposByDate = useMemo(() => {
    const map = new Map<string, Tiempo[]>();
    for (const t of data?.data ?? []) {
      const key = format(new Date(t.fecha), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [data]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth((m) => startOfMonth(subMonths(m, 1)));
  const handleNextMonth = () => setCurrentMonth((m) => startOfMonth(addMonths(m, 1)));
  const handleToday = () => setCurrentMonth(startOfMonth(new Date()));

  // Lazy import modal to avoid circular deps
  const handleEditEntry = (t: Tiempo) => {
    setEditingTiempo(t);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
          >
            ←
          </button>
          <h2 className="text-base font-semibold text-gray-800 capitalize min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
          >
            →
          </button>
        </div>
        <button
          onClick={handleToday}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
        >
          Hoy
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center text-gray-400 py-8">Cargando calendario...</div>
      )}

      {/* Calendar grid */}
      {!isLoading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="text-center text-xs font-medium text-gray-500 py-2 uppercase tracking-wide"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date) => {
              const key = format(date, 'yyyy-MM-dd');
              const entries = tiemposByDate.get(key) ?? [];
              return (
                <DayCell
                  key={key}
                  date={date}
                  entries={entries}
                  isCurrentMonth={isSameMonth(date, currentMonth)}
                  onEditEntry={handleEditEntry}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Edit modal — lazy rendered */}
      {modalOpen && (
        <EditModalWrapper
          tiempo={editingTiempo}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Thin wrapper to lazy-load TimeModal ─────────────────────────────────────

import { TimeModal } from './TimeModal';
import { useQueryClient } from '@tanstack/react-query';

function EditModalWrapper({
  tiempo,
  isOpen,
  onClose,
}: {
  tiempo?: Tiempo;
  isOpen: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  return (
    <TimeModal
      isOpen={isOpen}
      onClose={onClose}
      tiempo={tiempo}
      onSuccess={() => qc.invalidateQueries({ queryKey: ['tiempos'] })}
    />
  );
}

