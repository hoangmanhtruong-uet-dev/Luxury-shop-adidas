'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { FiShoppingCart } from 'react-icons/fi';
import Price from '@/components/home/Price';
import Reveal from '@/components/home/Reveal';
import Magnetic from '@/components/home/Magnetic';
import { useCountUp } from '@/hooks/useCountUp';

// Phase 4 (A10): three.js chunk loads only on desktop hero, never SSR.
// Any load/WebGL failure resolves to null → transparent layer, content intact.
const Hero3D = dynamic(() => import('@/components/home/Hero3D').then(m => m.default).catch(() => () => null), {
  ssr: false,
});

export interface HeroStats {
  orders: number | null;
  products: number | null;
  avgRating: number | null;
}

/** Compact "12.5K" style for large counts. "—" while loading, never invented. */
function compact(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number(k.toFixed(1))}K+`;
  }
  return String(n);
}

/**
 * Phase 1 — moved verbatim from `src/app/(shop)/page.tsx`.
 * Phase 2 wires the real stats; the dead cart button stays dead
 * until then (tracked in Fix_Trangchu_plan §1.1).
 */
export default function HeroSection({ stats }: { stats: HeroStats }) {
  // Phase 4 (A10): canvas only on fine-pointer desktop without reduced-motion.
  // Evaluated on mount to avoid hydration mismatch.
  const [show3D, setShow3D] = useState(false);
  const [glow, setGlow] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const mqFine = window.matchMedia('(pointer: fine)');
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqWide = window.matchMedia('(min-width: 1024px)');
    const update = () => setShow3D(mqFine.matches && !mqMotion.matches && mqWide.matches);
    update();
    mqFine.addEventListener('change', update);
    mqMotion.addEventListener('change', update);
    mqWide.addEventListener('change', update);
    return () => {
      mqFine.removeEventListener('change', update);
      mqMotion.removeEventListener('change', update);
      mqWide.removeEventListener('change', update);
    };
  }, []);

  const ordersUp = useCountUp(stats.orders, stats.orders != null);
  const productsUp = useCountUp(stats.products, stats.products != null);
  const ratingUp = useCountUp(stats.avgRating, stats.avgRating != null);

  const onHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlow({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <section id="hero" onMouseMove={onHeroMouseMove} onMouseLeave={() => setGlow(null)} className="relative max-w-7xl mx-auto px-8 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center overflow-hidden">
      {show3D && <Hero3D />}
      {/* Cursor glow: desktop pointer only, radial brand gradient. */}
      {glow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-0 h-72 w-72 rounded-full blur-3xl hidden lg:block"
          style={{
            left: glow.x - 144,
            top: glow.y - 144,
            background: 'radial-gradient(circle, rgba(249,115,22,0.14), rgba(244,63,94,0.08) 45%, transparent 70%)',
          }}
        />
      )}
      <Reveal className="relative z-10">
        <div className="space-y-8">
          <div className="hero-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider" style={{ animationDelay: '0ms' }}>
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            CÚN-SHOP • GIÀY ĐÁ BÓNG CHÍNH HÃNG
          </div>

          <h1 className="hero-up text-4xl md:text-5xl lg:text-6xl font-black leading-tight" style={{ animationDelay: '90ms' }}>
            Ra sân với đôi giày{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">
              thật
            </span>{' '}
            — uy tín, chất lượng.
          </h1>

          <p className="hero-up text-slate-400 text-sm md:text-base leading-relaxed max-w-lg" style={{ animationDelay: '180ms' }}>
            Cún-shop chuyên giày đá bóng chính hãng: Nike, Adidas, Mizuno, Puma.
            Bao check auth trọn đời, đổi size 30 ngày, tư vấn chọn size theo form chân.
          </p>

          <div className="hero-up flex items-center gap-4 pt-4" style={{ animationDelay: '270ms' }}>
            <Magnetic>
              <Link href="/products" className="inline-block px-8 py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-full transition shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                🛍️ Mua sắm ngay
              </Link>
            </Magnetic>
          </div>

          <div className="hero-up grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-slate-800" style={{ animationDelay: '360ms' }}>
            <div>
              <p className="text-2xl font-black text-white tabular-nums">{stats.orders == null ? '—' : compact(ordersUp)}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Đơn hàng thành công</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums">{stats.products == null ? '—' : compact(productsUp)}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Sản phẩm chất lượng</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums">{stats.avgRating == null ? '—' : `${ratingUp.toFixed(1)}/5`}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Đánh giá trung bình</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">24/7</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Hỗ trợ chuyên nghiệp</p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Hero Showcase Cards */}
      <Reveal delay={120} className="relative z-10 h-[500px] hidden lg:block">
        <div className="absolute top-0 right-0 w-[450px] bg-[#1E293B] border border-slate-700 rounded-3xl p-6 shadow-2xl transform hover:-translate-y-2 transition duration-500 z-10">
          <div className="flex justify-between items-start mb-4">
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded flex items-center gap-1 uppercase">
              <FiCheckCircle size={12} /> BEST PICK
            </span>
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1"><FiStar className="fill-current" /> Chính hãng</span>
          </div>
          <div className="h-48 bg-[#0F172A] rounded-xl flex items-center justify-center mb-6 overflow-hidden relative border border-slate-800">
            <img src="/images/products/urban-sneakers.webp" alt="Giày đá bóng Nike Mercurial" className="w-full h-full object-cover" />
          </div>
          <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-1">GIÀY SÂN CỎ TỰ NHIÊN</p>
          <h3 className="text-xl font-bold text-white mb-2">Nike Mercurial Vapor 16 Elite</h3>
          <div className="flex items-end justify-between">
            <div>
              <Price value="5490000" original="6500000" />
            </div>
            <button className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition shadow-lg">
              <FiShoppingCart size={20} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 left-0 w-[380px] bg-[#1E293B] border border-slate-700 rounded-3xl p-5 shadow-2xl transform hover:-translate-y-2 transition duration-500 z-20">
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-[#0F172A] rounded-xl flex items-center justify-center shrink-0 border border-slate-800 relative overflow-hidden">
              <span className="text-4xl" role="img" aria-label="Giày đá bóng">👟</span>
            </div>
            <div className="flex flex-col justify-center flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-bold rounded uppercase">BÁN CHẠY</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">Adidas Predator Elite Sân Nhân Tạo</h3>
              <div className="flex items-center justify-between mt-auto">
                <Price
                  value="4990000"
                  original="5800000"
                  priceClassName="text-base font-black text-orange-500"
                  originalClassName="text-[10px] text-slate-500 line-through ml-1"
                />
                <button className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition">
                  <FiShoppingCart size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// Local icons (moved verbatim from page.tsx; react-icons/fi lacks these two)
function FiStar({ className }: { className?: string }) {
  return <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" className={className} height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path></svg>;
}
function FiCheckCircle({ size = 24, className = '' }: { size?: number, className?: string }) {
  return <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className={className} height={size} width={size} xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
}
