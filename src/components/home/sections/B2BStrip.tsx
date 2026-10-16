'use client';

import Link from 'next/link';
import { FiBriefcase, FiArrowRight } from 'react-icons/fi';
import Reveal from '@/components/home/Reveal';

/**
 * Phase 3 — seller recruitment strip. One message, one CTA to the real
 * seller onboarding page. Static by design.
 */
export default function B2BStrip() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#1a2340] to-slate-900 border border-slate-700 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <span className="w-14 h-14 shrink-0 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <FiBriefcase size={24} className="text-orange-400" />
          </span>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-black text-white">Bán hàng cùng Cún-shop</h2>
            <p className="text-sm text-slate-400 mt-1">
              Mở gian hàng trong 5 phút — 0 phí mở shop, thanh toán VietQR tự động, đối soát minh bạch.
            </p>
          </div>
          <Link
            href="/profile/seller-register"
            className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-full text-sm transition shadow-lg shrink-0"
          >
            Mở shop ngay <FiArrowRight />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
