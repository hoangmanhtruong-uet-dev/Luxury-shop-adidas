'use client';

import { useState, useEffect } from 'react';
import ProductCard from '@/components/product/ProductCard';
import { Product } from '@/types/product';
import { FiClock, FiZap, FiTag, FiFilter } from 'react-icons/fi';
import Link from 'next/link';

export default function FlashSalePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [endTime, setEndTime] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/flash-sale/current')
      .then(r => r.json())
      .then(data => {
        if (data.active && data.items) {
          setProducts(data.items);
          setEndTime(new Date(data.endTime));
        } else {
          // No active flash sale
          setProducts([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Lỗi khi tải Flash Sale:', err);
        setLoading(false);
      });
  }, []);

  // Đếm ngược thời gian
  useEffect(() => {
    if (!endTime) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [endTime]);

  const categories = ['Tất cả', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = selectedCategory === 'Tất cả'
    ? products
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Banner Flash Sale */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 p-8 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
                <FiZap className="animate-bounce text-amber-300" /> SIÊU GIẢM GIÁ GIỜ VÀNG
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                Flash Sale <span className="text-amber-300">Đặc Quyền</span>
              </h1>
              <p className="text-white/90 text-sm md:text-base max-w-xl">
                Cơ hội sở hữu giày đá bóng chính hãng với giá ưu đãi cực sốc lên đến 50%. Số lượng có hạn!
              </p>
            </div>

            {/* Countdown Box */}
            <div className="bg-slate-950/60 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center space-y-3 min-w-[280px]">
              <p className="text-xs font-bold uppercase text-amber-300 tracking-wider flex items-center justify-center gap-1">
                <FiClock /> Kết thúc sau
              </p>
              <div className="flex justify-center items-center gap-3 font-mono">
                <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-2xl font-black text-white">
                  {String(timeLeft.hours).padStart(2, '0')}
                  <span className="block text-[9px] font-sans font-semibold text-slate-400 uppercase">Giờ</span>
                </div>
                <span className="text-amber-400 font-bold text-xl">:</span>
                <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-2xl font-black text-white">
                  {String(timeLeft.minutes).padStart(2, '0')}
                  <span className="block text-[9px] font-sans font-semibold text-slate-400 uppercase">Phút</span>
                </div>
                <span className="text-amber-400 font-bold text-xl">:</span>
                <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-2xl font-black text-amber-400 animate-pulse">
                  {String(timeLeft.seconds).padStart(2, '0')}
                  <span className="block text-[9px] font-sans font-semibold text-slate-400 uppercase">Giây</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-slate-800">
          <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1 mr-2 shrink-0">
            <FiFilter /> Danh mục:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800"></div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product, idx) => (
              <div key={product.id} className="relative group">
                {(() => {
                  const origPrice = Number(product.originalPrice);
                  const curPrice = Number(product.price);
                  const hasDiscount = origPrice > curPrice;
                  const discountPercent = hasDiscount ? Math.round(((origPrice - curPrice) / origPrice) * 100) : 0;
                  return (
                    <>
                      {hasDiscount && (
                        <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-rose-600 to-orange-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wider">
                          <FiTag size={10} /> -{discountPercent}%
                        </div>
                      )}
                      <ProductCard product={product} index={idx} />
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
            <p className="text-slate-400 text-lg">Hiện chưa có sản phẩm giảm giá trong danh mục này.</p>
            <Link href="/products" className="inline-block mt-4 text-orange-400 hover:underline font-bold text-sm">
              Xem tất cả sản phẩm →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
