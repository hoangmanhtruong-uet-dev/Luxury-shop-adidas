'use client';

import Link from 'next/link';
import Reveal from '@/components/home/Reveal';

const BRANDS = [
  'Nike', 'Adidas', 'Puma', 'Mizuno', 'New Balance', 'Joma',
  'Kelme', 'Kamito', 'Zocker', 'Mitre', 'Grand Sport', 'Pan',
];

/**
 * Phase 3 — brand marquee. Clicking a brand searches the catalogue for it
 * (`/products?search=`, which matches name/description server-side), so no
 * brand column or backend change is needed.
 */
export default function BrandStrip() {
  const loop = [...BRANDS, ...BRANDS];
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10" aria-label="Thương hiệu nổi bật">
      <Reveal>
        <div className="bg-[#131C2E] border border-slate-800 rounded-3xl p-8 text-center space-y-6 overflow-hidden">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            🤝 THƯƠNG HIỆU ĐỒNG HÀNH CHÍNH HÃNG 100%
          </p>
          <div className="marquee-paused overflow-hidden" tabIndex={0} aria-label="Danh sách thương hiệu, di chuột để dừng">
            <div className="animate-marquee flex gap-6 w-max items-center">
              {loop.map((brand, i) => (
                <Link
                  key={`${brand}-${i}`}
                  href={`/products?search=${encodeURIComponent(brand)}`}
                  aria-hidden={i >= BRANDS.length}
                  tabIndex={i >= BRANDS.length ? -1 : undefined}
                  className="py-3 px-6 bg-slate-900/60 border border-slate-800 rounded-2xl font-black text-slate-300 text-lg tracking-wider hover:border-orange-500/50 hover:text-white transition shrink-0"
                >
                  {brand.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
