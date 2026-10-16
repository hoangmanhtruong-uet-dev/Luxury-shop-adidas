'use client';

import { useEffect, useState } from 'react';
import Reveal from '@/components/home/Reveal';

interface Testimonial {
  id: string;
  name: string;
  comment: string;
  productName: string;
  verified: boolean;
}

/**
 * Phase 2 — real 5★ reviews from `/api/testimonials`. The "Đã mua hàng" badge
 * renders only when the API confirms a delivered order for that product.
 * Hides entirely when empty instead of inventing praise.
 */
export default function TestimonialSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);

  useEffect(() => {
    fetch('/api/testimonials')
      .then(r => r.json())
      .then(data => setTestimonials(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => setTestimonials([]));
  }, []);

  if (testimonials !== null && testimonials.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-8 py-12">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase text-orange-400 tracking-wider">❤️ TRẢI NGHIỆM KHÁCH HÀNG</span>
          <h2 className="text-3xl font-black text-white">Khách hàng nói gì về Cún-shop?</h2>
          <p className="text-sm text-slate-400">Đánh giá 5 sao mới nhất từ khách hàng mua sắm thực tế</p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials === null
          ? [...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 space-y-4">
              <div className="h-4 w-28 bg-slate-800 rounded skeleton-shimmer" />
              <div className="h-3 w-full bg-slate-800 rounded skeleton-shimmer" />
              <div className="h-3 w-5/6 bg-slate-800 rounded skeleton-shimmer" />
              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <div className="w-10 h-10 rounded-full bg-slate-800 skeleton-shimmer" />
                <div className="h-4 w-32 bg-slate-800 rounded skeleton-shimmer" />
              </div>
            </div>
          ))
          : testimonials.map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i, 2) * 80}>
              <TestimonialCard
                name={t.name}
                role={`Đã mua: ${t.productName}`}
                comment={t.comment}
                verified={t.verified}
              />
            </Reveal>
          ))}
      </div>
    </section>
  );
}

function TestimonialCard({ name, role, comment, verified }: { name: string; role: string; comment: string; verified: boolean }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-lg h-full">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-amber-400 text-sm" aria-label="Đánh giá 5 sao">
            {[...Array(5)].map((_, i) => (
              <span key={i}>★</span>
            ))}
          </div>
          {verified && (
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded uppercase">Đã mua hàng</span>
          )}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed italic">&quot;{comment}&quot;</p>
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/40 to-rose-500/40 border border-slate-700 flex items-center justify-center text-sm font-black text-white">
          {initial}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">{name}</h4>
          <p className="text-[10px] text-slate-400 line-clamp-1">{role}</p>
        </div>
      </div>
    </div>
  );
}

export { TestimonialCard };
