'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiClock } from 'react-icons/fi';
import type { Product } from '@/types/product';
import ProductCard from '@/components/product/ProductCard';
import ProductSkeleton from '@/components/home/ProductSkeleton';
import Reveal from '@/components/home/Reveal';
import { useCountdown } from '@/hooks/useCountdown';

interface FlashItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  originalPrice: number;
  price: number;
  discountPercent: number;
  stockQuantity: number;
  soldQuantity: number;
  inStock: boolean;
  category: string;
  rating: number;
  reviews: number;
}

interface FlashSaleData {
  active: boolean;
  id?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  isUpcoming?: boolean;
  items?: FlashItem[];
}

/**
 * Phase 2 — real flash sale from `/api/flash-sale/current`.
 * Countdown ticks from the real `endTime` (or `startTime` when upcoming);
 * each card shows the real sold-% progress. The section hides itself when
 * there is no event, no items, or the countdown expires — never a frozen clock.
 */
export default function FlashSaleSection() {
  const [data, setData] = useState<FlashSaleData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/flash-sale/current')
      .then(r => r.json())
      .then(d => setData(d as FlashSaleData))
      .catch(() => setFailed(true));
  }, []);

  const target = data?.active && data.items && data.items.length > 0
    ? (data.isUpcoming ? data.startTime ?? null : data.endTime ?? null)
    : null;
  const { hours, minutes, seconds, expired } = useCountdown(target);

  if (failed) return null;
  if (data !== null && (!data.active || !data.items || data.items.length === 0 || expired)) return null;

  const items = data?.items ?? [];
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section className="max-w-7xl mx-auto px-8 py-10">
      <Reveal>
        <div className="bg-gradient-to-r from-slate-900 to-[#1E293B] rounded-3xl border border-slate-700 p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8 border-b border-slate-700/50 pb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 rounded-xl text-white font-black tracking-widest uppercase">
                ⚡ FLASH SALE
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                {data === null ? 'Đang tải...' : data.isUpcoming ? 'Bắt đầu sau:' : 'Kết thúc trong:'}
                <div className="flex items-center gap-1" aria-live="off">
                  <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-white font-bold">{data === null ? '--' : pad(hours)}</span>:
                  <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-white font-bold">{data === null ? '--' : pad(minutes)}</span>:
                  <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-white font-bold">{data === null ? '--' : pad(seconds)}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-400 flex-1 px-4 hidden xl:block">
              {data === null
                ? 'Đang tải ưu đãi...'
                : `${data.name ? `${data.name} — ` : ''}Siêu ưu đãi mỗi ngày, săn ngay deal giảm sâu cho ${items.length} mặt hàng.`}
            </p>
            <Link href="/flash-sale" className="px-6 py-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-500/50 rounded-full text-sm font-bold transition flex items-center gap-2">
              <FiClock /> Săn deal ngay
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {data === null
              ? [...Array(4)].map((_, i) => <ProductSkeleton key={i} />)
              : items.slice(0, 4).map((item, i) => {
                const pct = item.stockQuantity > 0
                  ? Math.min(100, Math.round((item.soldQuantity / item.stockQuantity) * 100))
                  : 0;
                const product: Product = {
                  id: item.productId,
                  name: item.name,
                  price: String(item.price),
                  originalPrice: String(item.originalPrice),
                  currency: 'VND',
                  description: '',
                  category: 'Flash Sale',
                  rating: item.rating,
                  reviews: item.reviews,
                  inStock: item.inStock,
                  stockQuantity: Math.max(0, item.stockQuantity - item.soldQuantity),
                  emoji: '',
                  gradient: '',
                  image: item.image,
                };
                return (
                  <div key={item.id} className="home-shine transform hover:-translate-y-1 transition duration-300">
                    <ProductCard product={product} index={i} />
                    <div className="mt-2 px-1">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 80 ? 'bg-gradient-to-r from-orange-500 to-rose-500 skeleton-shimmer' : 'bg-orange-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        {pct >= 100 ? 'Đã bán hết' : `Đã bán ${pct}%`}
                      </p>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </Reveal>
    </section>
  );
}
