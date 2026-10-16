'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiArrowRight } from 'react-icons/fi';
import type { Product } from '@/types/product';
import { extractProducts } from '@/lib/api/products-response';
import ProductCard from '@/components/product/ProductCard';
import ProductSkeleton from '@/components/home/ProductSkeleton';
import Reveal from '@/components/home/Reveal';
import SectionHeader from '@/components/home/SectionHeader';

const TABS = ['Giày sân cỏ tự nhiên', 'Giày sân cỏ nhân tạo', 'Giày futsal', 'Phụ kiện bóng đá'];

/**
 * Phase 3 — deal tabs (học CellphoneS). Each tab fetches its own top-rated
 * slice; the active tab lives in `?tab=` so links are shareable. Hovering a
 * tab prefetches its data (desktop); stale responses from rapid tab switches
 * are discarded via a request id.
 */
export default function DealTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = TABS.includes(searchParams.get('tab') ?? '') ? searchParams.get('tab')! : TABS[0];
  const [tab, setTab] = useState(initial);
  const [items, setItems] = useState<Record<string, Product[]>>({});
  const [loadingTab, setLoadingTab] = useState<string | null>(initial);
  const requestId = useRef(0);

  const fetchTab = useCallback(async (name: string) => {
    const id = ++requestId.current;
    setLoadingTab(name);
    try {
      const res = await fetch(`/api/products?category=${encodeURIComponent(name)}&sortBy=rating&order=desc&limit=8`);
      const data = await res.json();
      if (requestId.current !== id) return;
      setItems(prev => ({ ...prev, [name]: extractProducts(data) }));
    } catch {
      if (requestId.current !== id) return;
      setItems(prev => ({ ...prev, [name]: [] }));
    } finally {
      if (requestId.current === id) setLoadingTab(null);
    }
  }, []);

  useEffect(() => {
    if (!items[tab]) void fetchTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const select = (name: string) => {
    setTab(name);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', name);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const prefetch = (name: string) => {
    if (!items[name] && loadingTab !== name) void fetchTab(name);
  };

  const list = items[tab];
  const loading = loadingTab === tab || list === undefined;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 border-t border-[#1f2937]">
      <Reveal>
        <SectionHeader
          title={<><span className="text-orange-500">🏷️</span> Săn deal theo ngành hàng</>}
          sub="Top sản phẩm đánh giá cao nhất mỗi ngành, cập nhật liên tục"
          linkHref="/products"
          linkText="Xem tất cả"
        />
      </Reveal>

      <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Ngành hàng">
        {TABS.map(name => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => select(name)}
            onMouseEnter={() => prefetch(name)}
            onFocus={() => prefetch(name)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition border ${
              tab === name
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-lg'
                : 'bg-[#1E293B] text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">Ngành hàng này chưa có sản phẩm. Quay lại sau nhé!</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {list.slice(0, 4).map((p, i) => (
            <div key={p.id} className="home-shine transform hover:-translate-y-1 transition duration-300">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="text-center mt-8">
          <Link
            href={`/products?category=${encodeURIComponent(tab)}`}
            className="inline-flex items-center gap-2 px-8 py-3 bg-transparent hover:bg-[#1E293B] border border-slate-700 rounded-full text-white font-bold transition text-sm"
          >
            Xem tất cả {tab} <FiArrowRight />
          </Link>
        </div>
      )}
    </section>
  );
}
