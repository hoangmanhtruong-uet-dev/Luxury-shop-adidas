'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { extractProducts } from '@/lib/api/products-response';
import TrustBar from '@/components/home/sections/TrustBar';
import HeroSection, { type HeroStats } from '@/components/home/sections/HeroSection';
import USPBar from '@/components/home/sections/USPBar';
import FlashSaleSection from '@/components/home/sections/FlashSaleSection';
import DealTabs from '@/components/home/sections/DealTabs';
import CategorySection from '@/components/home/sections/CategorySection';
import FeaturedSection from '@/components/home/sections/FeaturedSection';
import VoucherSection from '@/components/home/sections/VoucherSection';
import BrandStrip from '@/components/home/sections/BrandStrip';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import TestimonialSection from '@/components/home/sections/TestimonialSection';
import B2BStrip from '@/components/home/sections/B2BStrip';
import NewsletterSection from '@/components/home/sections/NewsletterSection';
import TrendingKeywords from '@/components/home/sections/TrendingKeywords';
import StickyMiniNav from '@/components/home/StickyMiniNav';
import ScrollProgress from '@/components/home/ScrollProgress';

/**
 * Phase 3 — section order follows the conversion flow from Fix_Trangchu_plan:
 * trust → promo → deal → category → brand → proof → capture.
 * Data orchestration stays here; each section owns its own fetching except
 * the two shared sources below (products grid + hero stats).
 */
export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [stats, setStats] = useState<HeroStats>({ orders: null, products: null, avgRating: null });

  useEffect(() => {
    fetch('/api/products?sortBy=rating&order=desc&limit=50')
      .then(r => r.json())
      .then(data => {
        setProducts(extractProducts(data));
        setLoading(false);
      })
      .catch(() => {
        setProducts([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/home/stats')
      .then(r => r.json())
      .then(data => {
        setStats({
          orders: typeof data.orders === 'number' ? data.orders : null,
          products: typeof data.products === 'number' ? data.products : null,
          avgRating: typeof data.avgRating === 'number' ? data.avgRating : null,
        });
      })
      .catch(() => setStats({ orders: null, products: null, avgRating: null }));
  }, []);

  const filteredLatest = activeTab === 'Tất cả'
    ? products
    : products.filter(p => p.category === activeTab);

  return (
    <div className="bg-[#0B1120] min-h-screen text-slate-200 font-sans">
      <ScrollProgress />
      <StickyMiniNav />
      <TrustBar />
      <HeroSection stats={stats} />
      <USPBar />
      <FlashSaleSection />
      <DealTabs />
      <CategorySection />
      <FeaturedSection
        filteredLatest={filteredLatest}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        loading={loading}
      />
      <VoucherSection />
      <BrandStrip />
      <RecentlyViewed />
      <TestimonialSection />
      <B2BStrip />
      <NewsletterSection />
      <TrendingKeywords />
    </div>
  );
}
