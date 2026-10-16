'use client';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiSearch, FiHeart, FiShoppingCart, FiPhone, FiTruck, FiCheckCircle, FiBell } from 'react-icons/fi';

/** Phase 4.2: derive local initials so no user name is sent to a third party. */
function initialsOf(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemCount = useCartStore(s => s.getItemCount());
  const { isAuthenticated, isLoading, user, logout, fetchMe } = useAuthStore();
  const isSeller = user?.isSeller || false;
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    fetchMe();
    if (isAuthenticated) {
      fetch('/api/me/notifications?unreadOnly=true')
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch(console.error);
    }
  }, [fetchMe, isAuthenticated]);

  useEffect(() => {
    const q = searchParams?.get('search');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      router.push('/products');
      return;
    }
    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/seller') || pathname?.startsWith('/shipper')) return null;

  return (
    <div className="w-full bg-[#0B1120] text-slate-300 font-sans border-b border-[#1f2937]">
      {/* Top Bar */}
      <div className="hidden md:flex justify-between items-center px-8 py-1.5 bg-[#0F172A] text-[11px] font-medium border-b border-[#1f2937]">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <FiTruck size={12} /> Free ship toàn quốc đơn từ 500k
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <FiCheckCircle size={12} /> Cam kết chính hãng 100%
          </span>
        </div>
        <div className="flex gap-4 text-slate-400">
          <Link href="#" className="hover:text-white transition">📞 Hotline 0968 544 769</Link>
          <span className="text-slate-600">|</span>
          <Link href="/chinh-sach" className="hover:text-white transition">Chính sách</Link>
          <span className="text-slate-600">|</span>
          <Link href="#" className="hover:text-white transition">Tra cứu đơn hàng</Link>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="px-8 py-4 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl">💎</span>
          <div className="leading-tight">
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500 tracking-tight">
              CÚN-
              <br />STORE
            </h1>
            <p className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase">Giày đá bóng chính hãng</p>
          </div>
        </Link>

        {/* Primary Links */}
        <div className="hidden lg:flex items-center gap-6 font-semibold text-sm">
          <Link href="/products" className="text-white hover:text-orange-500 transition">Sản phẩm</Link>
          <Link href="/flash-sale" className="text-slate-300 hover:text-orange-500 transition">Flash Sale</Link>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative hidden md:flex">
          <div className="absolute inset-y-0 left-0 flex items-center">
            <span className="flex items-center gap-1 px-4 text-xs font-medium text-slate-400 border-r border-slate-700">
              Tất cả
            </span>
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm giày đá bóng, thương hiệu, phụ kiện..." 
            className="w-full pl-24 pr-24 py-2.5 bg-[#1E293B] border border-slate-700 rounded-full text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors placeholder-slate-500"
          />
          <button type="submit" className="absolute inset-y-1 right-1 px-5 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold rounded-full hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition">
            Tìm kiếm
          </button>
        </form>

        {/* Actions & Profile */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <Link href="/profile/wishlist" className="text-slate-300 hover:text-orange-500 transition">
            <FiHeart size={22} />
          </Link>
          <Link href="/profile/notifications" className="relative text-slate-300 hover:text-orange-500 transition">
            <FiBell size={22} />
            {mounted && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border border-[#0B1120]"></span>
            )}
          </Link>
          
          <Link href="/cart" className="relative text-slate-300 hover:text-orange-500 transition flex items-center gap-2">
            <FiShoppingCart size={22} />
            <span className="hidden xl:block text-sm font-semibold">Giỏ hàng</span>
            {mounted && itemCount > 0 && (
              <span className="absolute -top-2 left-3 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0B1120]">
                {itemCount}
              </span>
            )}
          </Link>

          {!mounted || isLoading ? (
            <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
          ) : isAuthenticated ? (
            <div className="relative group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#0B1120] flex items-center justify-center overflow-hidden">
                    {/*
                    Phase 4.2: previously this rendered
                    `https://ui-avatars.com/api/?name=${user?.name}`, which
                    (a) shipped the user's real display name to a third party on
                        every authenticated page view (GDPR / PDPD concern), and
                    (b) interpolated an unencoded value, so a name containing `&`
                        injected extra query parameters into that request.
                    Render initials locally from our own data instead.
                  */}
                  <span
                    aria-hidden="true"
                    className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                  >
                    {initialsOf(user?.name)}
                  </span>
                  </div>
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">{user?.name}</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <FiCheckCircle size={10} /> {isSeller ? 'Verified Seller' : 'Thành viên'}
                  </p>
                </div>
              </div>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#1E293B] border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <div className="p-2">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg">Hồ sơ cá nhân</Link>
                  <Link href="/profile/orders" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg">Đơn hàng</Link>
                  <div className="h-px bg-slate-700 my-2" />
                  <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg">Đăng xuất</button>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/login" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-full transition backdrop-blur-md border border-white/10">
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {/* Sub Navbar */}
      <div className="hidden md:flex items-center justify-between px-8 py-2.5 bg-[#080d1a] text-xs font-semibold">
        <div className="flex items-center gap-6">
          <Link href="/products?category=Giày+sân+cỏ+tự+nhiên" className="text-slate-300 hover:text-orange-400 transition">Giày sân cỏ tự nhiên</Link>
          <Link href="/products?category=Giày+sân+cỏ+nhân+tạo" className="text-slate-300 hover:text-orange-400 transition">Giày sân cỏ nhân tạo</Link>
          <Link href="/products?category=Giày+futsal" className="text-slate-300 hover:text-orange-400 transition">Giày futsal</Link>
          <Link href="/products?category=Phụ+kiện+bóng+đá" className="text-slate-300 hover:text-orange-400 transition">Phụ kiện bóng đá</Link>
          <span className="text-slate-600">|</span>
          <Link href="/products?sale=true" className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition">
            🔥 Khuyến mãi Hot
          </Link>
        </div>
        
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex items-center gap-1.5"><FiCheckCircle className="text-emerald-500" /> Flash Deal kết thúc sau:</span>
          <div className="flex items-center gap-1">
            <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">02</span>:
            <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">45</span>:
            <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">12</span>
          </div>
        </div>
      </div>
    </div>
  );
}
