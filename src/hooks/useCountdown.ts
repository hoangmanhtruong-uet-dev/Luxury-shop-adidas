import { useEffect, useState } from 'react';

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  expired: boolean;
}

function toMs(target: number | string | Date | null): number | null {
  if (target == null) return null;
  if (target instanceof Date) return target.getTime();
  if (typeof target === 'string') {
    const parsed = Date.parse(target);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return target;
}

/**
 * Phase 1 — Home motion foundation (wired up in Phase 2).
 * Ticks once per second toward `target`. A single interval per hook instance —
 * never one interval per card. Returns zeros + `expired: true` when the target
 * is missing or already passed, so sections can hide themselves instead of
 * rendering a frozen "04:32:12".
 */
export function useCountdown(target: number | string | Date | null): Countdown {
  const targetMs = toMs(target);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs == null || targetMs - Date.now() <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [targetMs]);

  const totalMs = targetMs == null ? 0 : Math.max(0, targetMs - now);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
    expired: totalMs <= 0,
  };
}

/** "04:32:12" style. Hours may exceed 24 (flash sales run for days). */
export function formatCountdown(hours: number, minutes: number, seconds: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
