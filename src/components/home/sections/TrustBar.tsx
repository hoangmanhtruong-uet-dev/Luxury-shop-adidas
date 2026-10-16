'use client';

import { useEffect, useState } from 'react';
import { FiShield, FiTruck, FiRefreshCw, FiCheckCircle, FiZap } from 'react-icons/fi';

const ITEMS = [
  { icon: FiShield, text: '100% giày đá bóng chính hãng' },
  { icon: FiCheckCircle, text: 'Bao check auth trọn đời' },
  { icon: FiRefreshCw, text: 'Đổi size trong 30 ngày' },
  { icon: FiTruck, text: 'Freeship đơn từ 300K' },
  { icon: FiZap, text: 'Giao nhanh 2h nội thành' },
];

/**
 * Phase 3 — trust bar (học Tiki). Static policy commitments, hides on
 * scroll-down to reclaim space, slides back on scroll-up.
 */
export default function TrustBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 120 && y > lastY);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`bg-[#0F172A] border-b border-slate-800/60 overflow-hidden transition-all duration-300 ${
        hidden ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center gap-6 overflow-x-auto py-2.5 text-[11px] font-semibold text-slate-300 whitespace-nowrap marquee-paused">
          {ITEMS.map(({ icon: Icon, text }) => (
            <span key={text} className="inline-flex items-center gap-1.5 shrink-0">
              <Icon size={13} className="text-emerald-400" /> {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
