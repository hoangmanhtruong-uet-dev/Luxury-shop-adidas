'use client';

import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import type { Product } from '@/types/product';
import ProductCard from '@/components/product/ProductCard';
import ProductSkeleton from '@/components/home/ProductSkeleton';
import Reveal from '@/components/home/Reveal';
import SectionHeader from '@/components/home/SectionHeader';

const TABS = ['Tất cả', 'Giày sân cỏ tự nhiên', 'Giày sân cỏ nhân tạo', 'Giày futsal', 'Phụ kiện bóng đá'];

interface FeaturedSectionProps {
  filteredLatest: Product[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  loading: boolean;
}

/**
 * Phase 1 — moved verbatim from `src/app/(shop)/page.tsx`.
 * Phase 2 keeps the tabs but fetches per-tab from the API (with `?tab=` in URL).
 */
export default function FeaturedSection({ filteredLatest, activeTab, onTabChange, loading }: FeaturedSectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-8 py-10">
      <Reveal>
        <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="text-emerald-500">🌟</span> Sản phẩm nổi bật &amp; Mới nhất
            </h2>
            <p className="text-sm text-slate-400 mt-1">Được tuyển chọn theo chất lượng, trải nghiệm cao và phản hồi tích cực nhất</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition border ${
                  activeTab === tab
                    ? 'bg-slate-100 text-[#0B1120] border-slate-100'
                    : 'bg-[#1E293B] text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading
          ? [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
          : filteredLatest.slice(0, 8).map((p, i) => (
            <div key={p.id} className="home-shine transform hover:-translate-y-1 transition duration-300">
              <ProductCard product={p} index={i} />
            </div>
          ))
        }
      </div>

      {filteredLatest.length > 8 && (
        <div className="text-center mt-10">
          <Link href="/products" className="inline-flex items-center gap-2 px-8 py-3 bg-transparent hover:bg-[#1E293B] border border-slate-700 rounded-full text-white font-bold transition">
            Xem thêm {filteredLatest.length - 8} sản phẩm <FiArrowRight />
          </Link>
        </div>
      )}
    </section>
  );
}
