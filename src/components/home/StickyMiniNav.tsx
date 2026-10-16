'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiSearch, FiShoppingCart, FiArrowUp } from 'react-icons/fi';
import { useCartStore } from '@/store/cartStore';

/**
 * Phase 3 — sticky mini-nav + back-to-top. Slides in after the hero scrolls
 * away (600px), giving search + cart access without scrolling back up.
 */
export default function StickyMiniNav() {
  const [visible, setVisible] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const itemCount = useCartStore(s => s.getItemCount());

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y > 600);
      setShowTop(y > 900);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <div
        className={`fixed top-0 inset-x-0 z-40 transition-transform duration-300 ${
          visible ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!visible}
      >
        <div className="bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 flex items-center gap-3">
            <Link href="/" className="font-black text-white text-sm tracking-wide shrink-0">
              CÚN<span className="text-orange-500">.</span>
            </Link>
            <form onSubmit={submit} className="flex-1 flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-full px-4 py-1.5">
              <FiSearch size={14} className="text-slate-400 shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm sản phẩm..."
                aria-label="Tìm sản phẩm"
                className="bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </form>
            <Link
              href="/cart"
              aria-label={`Giỏ hàng, ${itemCount} sản phẩm`}
              className="relative w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 hover:text-white transition shrink-0"
            >
              <FiShoppingCart size={16} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Về đầu trang"
        className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex items-center justify-center transition-all duration-300 ${
          showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <FiArrowUp size={18} />
      </button>
    </>
  );
}
