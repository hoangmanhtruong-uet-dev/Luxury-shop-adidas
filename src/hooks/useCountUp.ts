import { useEffect, useRef, useState } from 'react';

/**
 * Animates 0 → `target` with easeOutExpo when `start` becomes true.
 * Respects reduced-motion (jumps to final) and unmounts cleanly.
 */
export function useCountUp(target: number | null, start: boolean, durationMs = 1400): number {
  const [value, setValue] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (!start || target == null) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let stopped = false;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (stopped) return;
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf.current);
    };
  }, [start, target, durationMs]);

  return value;
}
