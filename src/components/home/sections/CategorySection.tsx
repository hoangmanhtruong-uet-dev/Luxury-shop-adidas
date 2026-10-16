'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Reveal from '@/components/home/Reveal';
import SectionHeader from '@/components/home/SectionHeader';
import { getCategoryProductImage } from '@/lib/upload/product-image';

interface CategoryItem {
  name: string;
  slug: string;
  count: number;
}

interface CategoryApiRow {
  name: string;
  slug: string;
  _count?: { products?: number };
}

/**
 * Phase 2 — real categories from `/api/categories` (approved only, cached 60s
 * server-side). Shows 8 skeleton tiles while loading; hides the whole section
 * on error or when empty instead of rendering invented counts.
 */
export default function CategorySection() {
  const [categories, setCategories] = useState<CategoryItem[] | null>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) {
          setCategories([]);
          return;
        }
        setCategories(
          (data as CategoryApiRow[]).slice(0, 8).map(row => ({
            name: row.name,
            slug: row.slug,
            count: row._count?.products ?? 0,
          })),
        );
      })
      .catch(() => setCategories([]));
  }, []);

  if (categories !== null && categories.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-8 py-10 border-t border-[#1f2937]">
      <Reveal>
        <SectionHeader
          title={<><span className="text-orange-500">🔥</span> Danh mục nổi bật</>}
          sub="Khám phá các bộ sưu tập tuyển chọn hàng đầu Cún-shop"
          linkHref="/products"
          linkText="Xem tất cả"
        />
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {categories === null
          ? [...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-800 rounded-2xl mb-4 skeleton-shimmer" />
              <div className="h-5 w-24 mx-auto bg-slate-800 rounded mb-2 skeleton-shimmer" />
              <div className="h-3 w-16 mx-auto bg-slate-800 rounded skeleton-shimmer" />
            </div>
          ))
          : categories.map((cat, i) => (
            <Reveal key={cat.slug || cat.name} delay={Math.min(i, 3) * 80}>
              <Link href={`/products?category=${encodeURIComponent(cat.name)}`}
                className="block bg-[#1E293B] hover:bg-[#273549] border border-slate-700 hover:border-slate-500 rounded-2xl p-6 text-center transition duration-300 group">
                <div className="w-16 h-16 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-inner overflow-hidden">
                  <img
                    src={getCategoryProductImage(cat.name)}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-white font-bold text-lg">{cat.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{cat.count} sản phẩm</p>
              </Link>
            </Reveal>
          ))}
      </div>
    </section>
  );
}
