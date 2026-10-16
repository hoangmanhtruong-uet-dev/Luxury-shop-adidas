'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SafeImage from '@/components/common/SafeImage';
import { formatPrice } from '@/lib/utils';
import Reveal from '@/components/home/Reveal';
import SectionHeader from '@/components/home/SectionHeader';

export interface RecentItem {
  id: string;
  name: string;
  image?: string;
  price: string | number;
}

const STORAGE_KEY = 'cun-shop-recently-viewed';
const MAX_ITEMS = 8;

/** Called from the product detail page. Keeps the 8 most recent, deduped. */
export function recordProductView(item: RecentItem): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: RecentItem[] = raw ? (JSON.parse(raw) as RecentItem[]) : [];
    const next = [item, ...list.filter(p => p.id !== item.id)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota — viewing history is a nice-to-have.
  }
}

function readRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as RecentItem[]) : [];
    return Array.isArray(list) ? list.filter(p => p && typeof p.id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Phase 3 — recently viewed rail. Purely local (localStorage), hidden when
 * empty. Read on mount + on window focus (covers navigation back from a
 * product page without remounting home).
 */
export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[] | null>(null);

  useEffect(() => {
    setItems(readRecent());
    const onFocus = () => setItems(readRecent());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (items === null || items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 border-t border-[#1f2937]" aria-label="Đã xem gần đây">
      <Reveal>
        <SectionHeader
          title={<><span className="text-orange-500">🕘</span> Đã xem gần đây</>}
          sub="Tiếp tục từ nơi bạn dừng lại"
          linkHref="/products"
          linkText="Xem tất cả"
        />
      </Reveal>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.slice(0, 4).map(item => (
          <Link
            key={item.id}
            href={`/products/${item.id}`}
            className="flex items-center gap-3 bg-[#1E293B] border border-slate-700 hover:border-slate-500 rounded-2xl p-3 transition group"
          >
            <span className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 shrink-0 relative block">
              {item.image ? (
                <SafeImage src={item.image} alt={item.name} fill sizes="56px" style={{ objectFit: 'cover' }} />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-white line-clamp-2 group-hover:text-orange-400 transition-colors">
                {item.name}
              </span>
              <span className="block text-xs font-black text-orange-500 mt-1">{formatPrice(item.price)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
