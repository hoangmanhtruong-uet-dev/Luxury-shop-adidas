'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '@/hooks/useReveal';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms for grid items. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Phase 1 — Home motion foundation.
 * Wrapper that fades + slides content in on first scroll into view.
 * End state is pixel-identical to having no wrapper (opacity 1, no transform).
 */
export default function Reveal({ children, delay = 0, className = '', style }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ ...style, transitionDelay: `${delay}ms` }}
      className={`reveal${visible ? ' revealed' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  );
}
