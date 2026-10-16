'use client';

import { useRef, type ReactNode, type MouseEvent } from 'react';

/**
 * Magnetic hover: the child drifts toward the cursor (max ~10px) and springs
 * back on leave. Pure transform, no layout cost. Desktop nicety — harmless on
 * touch (no mousemove fires).
 */
export default function Magnetic({ children, strength = 10, className = '' }: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.max(rect.width, rect.height) / 2;
    const clamp = (v: number) => Math.max(-strength, Math.min(strength, (v / dist) * strength));
    el.style.transform = `translate(${clamp(dx)}px, ${clamp(dy)}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'translate(0px, 0px)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`inline-block transition-transform duration-200 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}
