'use client';

import Link from 'next/link';
import { FiTrendingUp } from 'react-icons/fi';
import Reveal from '@/components/home/Reveal';

const KEYWORDS = [
  'Nike Mercurial', 'Adidas Predator', 'Mizuno Morelia', 'Puma Future',
  'Giày sân nhân tạo', 'Giày futsal', 'Tất chống trượt', 'Bóng đá Động Lực',
  'Kamito', 'Zocker', 'Đổi size', 'Chính hãng',
];

/**
 * Phase 3 — trending keywords (học Tiki). Curated suggestion links into real
 * catalogue search — discovery aid, not fabricated trend data.
 */
export default function TrendingKeywords() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 border-t border-[#1f2937]" aria-label="Từ khóa được quan tâm">
      <Reveal>
        <h2 className="text-lg font-black text-white flex items-center gap-2 mb-5">
          <FiTrendingUp className="text-orange-400" /> Tìm kiếm nổi bật
        </h2>
        <div className="flex flex-wrap gap-2">
          {KEYWORDS.map(kw => (
            <Link
              key={kw}
              href={`/products?search=${encodeURIComponent(kw)}`}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[#1E293B] text-slate-300 border border-slate-700 hover:border-orange-500/50 hover:text-white transition"
            >
              {kw}
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
