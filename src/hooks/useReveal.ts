import { useEffect, useRef, useState } from 'react';

/**
 * Phase 1 — Home motion foundation.
 * Reveal-on-scroll via a single IntersectionObserver per element.
 * Falls back to immediately visible when IntersectionObserver is unavailable
 * (old browsers, SSR prerender, tests) so content can never get stuck hidden.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.12) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}
