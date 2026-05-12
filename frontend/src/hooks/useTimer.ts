import { useState, useEffect, useCallback, useRef } from 'react';

const TIMER_STORAGE_KEY = 'tm_active_timer';

interface TimerStorageState {
  startTimestamp: number;
  clienteId: number;
  asuntoId: number;
}

interface UseTimerReturn {
  isRunning: boolean;
  elapsedSeconds: number;
  clienteId: number | null;
  asuntoId: number | null;
  start: (clienteId: number, asuntoId: number) => void;
  stop: () => number; // returns elapsed minutes
  reset: () => void;
}

export function useTimer(): UseTimerReturn {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize from localStorage
  const [state, setState] = useState<{
    isRunning: boolean;
    startTimestamp: number | null;
    clienteId: number | null;
    asuntoId: number | null;
    elapsedSeconds: number;
  }>(() => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (raw) {
        const stored: TimerStorageState = JSON.parse(raw);
        const elapsed = Math.floor((Date.now() - stored.startTimestamp) / 1000);
        return {
          isRunning: true,
          startTimestamp: stored.startTimestamp,
          clienteId: stored.clienteId,
          asuntoId: stored.asuntoId,
          elapsedSeconds: elapsed,
        };
      }
    } catch {
      // ignore
    }
    return {
      isRunning: false,
      startTimestamp: null,
      clienteId: null,
      asuntoId: null,
      elapsedSeconds: 0,
    };
  });

  // Tick effect
  useEffect(() => {
    if (state.isRunning && state.startTimestamp != null) {
      intervalRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsedSeconds: Math.floor((Date.now() - (prev.startTimestamp ?? Date.now())) / 1000),
        }));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.startTimestamp]);

  const start = useCallback((clienteId: number, asuntoId: number) => {
    const startTimestamp = Date.now();
    const stored: TimerStorageState = { startTimestamp, clienteId, asuntoId };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stored));
    setState({
      isRunning: true,
      startTimestamp,
      clienteId,
      asuntoId,
      elapsedSeconds: 0,
    });
  }, []);

  const stop = useCallback((): number => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem(TIMER_STORAGE_KEY);
    let elapsedMinutes = 0;
    setState((prev) => {
      elapsedMinutes = Math.floor(prev.elapsedSeconds / 60);
      return {
        isRunning: false,
        startTimestamp: null,
        clienteId: null,
        asuntoId: null,
        elapsedSeconds: 0,
      };
    });
    return elapsedMinutes;
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem(TIMER_STORAGE_KEY);
    setState({
      isRunning: false,
      startTimestamp: null,
      clienteId: null,
      asuntoId: null,
      elapsedSeconds: 0,
    });
  }, []);

  return {
    isRunning: state.isRunning,
    elapsedSeconds: state.elapsedSeconds,
    clienteId: state.clienteId,
    asuntoId: state.asuntoId,
    start,
    stop,
    reset,
  };
}
