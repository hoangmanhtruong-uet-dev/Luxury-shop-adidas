'use client';

import { useEffect, useState } from 'react';

/**
 * Thin gradient scroll-progress bar pinned to the top of the viewport.
 * transform scaleX only — zero layout cost.
 */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none" aria-hidden="true">
      <div
        className="h-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 origin-left"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
