'use client';

import { useParams, usePathname, useRouter, notFound } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { compareMoneyStrings, percentageOff } from '@/lib/utils/client-money';
import { useState, useEffect, useTransition } from 'react';
import { getAvailableStock, useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/components/ui/Toast';
import { Product } from '@/types/product';
import { useAuthStore } from '@/store/authStore';
import SafeImage from '@/components/common/SafeImage';
import { getCategoryProductImage } from '@/lib/upload/product-image';
import ProductCard from '@/components/product/ProductCard';
import Link from 'next/link';
import {
  FiHeart, FiShare2, FiShoppingCart, FiZap, FiTruck, FiShield,
  FiRefreshCw, FiStar, FiClock, FiCheckCircle, FiInfo, FiSliders,
  FiMessageSquare, FiFileText, FiArrowRight
} from 'react-icons/fi';
import ProductReviews from '@/components/shop/ProductReviews';
import { escapeJsonForHtmlScript } from '@/lib/utils/json-script';
import { extractProducts } from '@/lib/api/products-response';
import { recordProductView } from '@/components/home/RecentlyViewed';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('Đen / Xanh đen');
  const [activeTab, setActiveTab] = useState<'specs' | 'highlights' | 'reviews' | 'warranty'>('specs');
  const [isLiked, setIsLiked] = useState(false);
  const [isPending, startTransition] = useTransition();

  const addItem = useCartStore(s => s.addItem);
  const addToast = useToastStore(s => s.addToast);

  // Countdown timer cho Flash Sale Ticker
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 6 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setProduct(data);
        // Phase 3 — feed the "recently viewed" rail on the homepage.
        if (data && typeof data.id === 'string') {
          recordProductView({
            id: data.id,
            name: data.name ?? 'Sản phẩm',
            image: data.image ?? data.images?.[0]?.url,
            price: data.price ?? 0,
          });
        }
        if (data.category) {
          fetch(`/api/products?category=${encodeURIComponent(data.category)}&limit=12`)
            .then(r => r.json())
            .then(list => {
              setRelatedProducts(extractProducts(list).filter((p: Product) => p.id !== data.id).slice(0, 4));
            })
            .catch(() => setRelatedProducts([]));
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Load trạng thái wishlist
  useEffect(() => {
    if (!id || !isAuthenticated) return;
    fetch('/api/me/wishlist')
      .then(res => res.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const liked = data.some(item => item.productId === id);
          setIsLiked(liked);
        }
      })
      .catch(console.error);
  }, [id, isAuthenticated]);

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để lưu sản phẩm yêu thích.');
      router.push('/login?from=' + encodeURIComponent(pathname || '/'));
      return;
    }
    const previousState = isLiked;
    setIsLiked(!isLiked); // Optimistic UI
    
    try {
      const res = await fetch(`/api/me/wishlist${previousState ? `?productId=${id}` : ''}`, {
        method: previousState ? 'DELETE' : 'POST',
        headers: previousState ? undefined : { 'Content-Type': 'application/json' },
        body: previousState ? undefined : JSON.stringify({ productId: id }),
      });
      if (!res.ok) throw new Error('Failed to toggle wishlist');
      addToast(previousState ? 'Đã xóa khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích 💖');
    } catch {
      setIsLiked(previousState); // Revert on failure
      addToast('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] p-8 max-w-7xl mx-auto space-y-8">
        <div className="h-6 bg-slate-800 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="h-[480px] bg-slate-900 rounded-3xl animate-pulse"></div>
          <div className="space-y-6">
            <div className="h-10 bg-slate-800 rounded w-3/4 animate-pulse"></div>
            <div className="h-12 bg-slate-900 rounded w-1/2 animate-pulse"></div>
            <div className="h-32 bg-slate-900 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Phase 4.1: the previous branch rendered "Sản phẩm không tồn tại" with an HTTP
  // 200. That is a soft 404: Google indexes an unbounded pool of 200-status
  // "not found" pages and wastes crawl budget. `notFound()` emits a real 404 and
  // renders src/app/not-found.tsx.
  // Reached only once `loading` is false, so a transient fetch error is not
  // mis-reported as a missing product.
  if (!product) {
    notFound();
  }

  const availableStock = getAvailableStock(product);
  const hasDiscount = Boolean(product.originalPrice && compareMoneyStrings(product.originalPrice, product.price) > 0);
  const mainImage = product.images?.[activeImageIndex]?.url || product.image;
  const imageFallback = getCategoryProductImage(product.category || product.categoryRef?.name);

  const curPriceNum = Number(product.price) || 0;
  const origPriceNum = Number(product.originalPrice) || 0;
  const savingsAmount = origPriceNum > curPriceNum ? origPriceNum - curPriceNum : 0;
  const discountPercent = origPriceNum > curPriceNum ? Math.round(((origPriceNum - curPriceNum) / origPriceNum) * 100) : 0;

  const handleAddToCart = () => {
    if (isAuthLoading || availableStock <= 0) return;
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
      router.push('/login?from=' + encodeURIComponent(pathname || '/'));
      return;
    }
    startTransition(() => {
      addItem(product, qty);
      const total = useCartStore.getState().getItemCount();
      addToast(`Đã thêm ${qty} × ${product.name} (giỏ: ${total} món)`, 'success', { label: 'Xem giỏ', href: '/cart' });
    });
  };

  const handleBuyNow = () => {
    if (isAuthLoading || availableStock <= 0) return;
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để tiếp tục thanh toán.');
      router.push('/login?from=' + encodeURIComponent(pathname || '/'));
      return;
    }
    startTransition(() => {
      addItem(product, qty);
      router.push('/checkout');
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('Đã sao chép đường dẫn sản phẩm! 🔗');
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: mainImage ? [mainImage] : [],
    description: product.description || product.name,
    sku: (product as any).sku || product.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'VND',
      price: product.price,
      availability: availableStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Cún-shop',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: String(product.rating || '5.0'),
      reviewCount: String(product.reviews || '286'),
    },
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-16">
      {/*
        Phase 2.1 (Critical #8): JSON.stringify does NOT escape < > or &, so a
        seller-supplied name/description containing "</script><script>..." would
        terminate this element and execute arbitrary JS in every visitor's
        browser (including admins). Escaping them as unicode escapes is
        equivalent JSON but cannot break out of the script tag.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonForHtmlScript(JSON.stringify(jsonLd)) }}
      />
      
      {/* Top Breadcrumb & Flash Sale Ticker Bar */}
      <div className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400 overflow-x-auto">
            <Link href="/" className="hover:text-white transition">Trang chủ</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-white transition">{product.category}</Link>
            <span>/</span>
            <span className="text-white font-semibold line-clamp-1">{product.name}</span>
          </div>

          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/30 px-3 py-1 rounded-full text-orange-400 font-bold shrink-0">
            <FiZap className="animate-pulse" />
            <span>FLASH SALE ĐANG DIỄN RA</span>
            <span className="text-slate-500">|</span>
            <span>Kết thúc sau</span>
            <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-white text-[11px]">
              {String(timeLeft.hours).padStart(2, '0')} : {String(timeLeft.minutes).padStart(2, '0')} : {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        
        {/* Main Product Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Gallery & Highlights (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main Image Box */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#1E293B] to-[#0F172A] border border-slate-700/80 overflow-hidden shadow-2xl p-6 group">
              
              {/* Badges */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                {hasDiscount && (
                  <span className="bg-rose-600 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg tracking-wider">
                    -{discountPercent}% GIẢM
                  </span>
                )}
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                  CHÍNH HÃNG 100%
                </span>
              </div>

              {product.badge && (
                <div className="absolute top-4 right-4 z-10 bg-orange-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                  {product.badge}
                </div>
              )}

              {/* Glowing Halo Effect behind image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-rose-500/5 to-indigo-500/10 rounded-3xl blur-2xl opacity-60"></div>

              {/* Image Container */}
              <div className="relative h-[380px] w-full flex items-center justify-center">
                {mainImage ? (
                  <SafeImage
                    src={mainImage}
                    fallbackSrc={imageFallback}
                    alt={product.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 500px"
                    style={{ objectFit: 'contain' }}
                    className="transform group-hover:scale-105 transition duration-500 drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]"
                  />
                ) : (
                  <span className="text-9xl drop-shadow-[0_15px_25px_rgba(0,0,0,0.5)]">
                    {product.emoji}
                  </span>
                )}
              </div>

              {/* 360 View Button Overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <button className="px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 text-xs font-bold hover:text-white hover:border-orange-500 transition flex items-center gap-1.5 shadow-lg">
                  🎥 Xem chi tiết 360°
                </button>
              </div>
            </div>

            {/* Thumbnails Row */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((img: any, i: number) => (
                  <button
                    key={img.id || i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative h-20 rounded-2xl overflow-hidden border-2 transition p-1 bg-slate-900/60 ${
                      activeImageIndex === i
                        ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <SafeImage
                      src={img.url}
                      fallbackSrc={imageFallback}
                      alt={`${product.name} thumbnail ${i + 1}`}
                      fill
                      sizes="80px"
                      style={{ objectFit: 'cover' }}
                      className="rounded-xl"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Trust Features Grid Below Image */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-[#1E293B]/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Âm Thanh Hi-Res Chuẩn</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Giải mã LDAC & aptX HD</p>
                </div>
              </div>
              <div className="bg-[#1E293B]/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h4 className="text-xs font-bold text-white">30 Ngày 1 Đổi 1</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Lỗi phần cứng từ NSX</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Main Info & Buying Panel (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Category Tag & Action Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase rounded-full tracking-wider">
                  HI-RES AUDIO
                </span>
                <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase rounded-full tracking-wider">
                  FLAGSHIP SERIES
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleWishlist}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition ${
                    isLiked
                      ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title={isLiked ? "Đã yêu thích" : "Thêm vào yêu thích"}
                >
                  <FiHeart className={isLiked ? 'fill-current' : ''} size={16} />
                </button>
                <button
                  onClick={handleShare}
                  className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                  title="Chia sẻ sản phẩm"
                >
                  <FiShare2 size={16} />
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
              {product.name}
            </h1>

            {/* Rating & Social Proof */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className="fill-current" size={14} />
                  ))}
                </div>
                <span className="text-white text-sm font-black ml-1">{product.rating || '5.0'}</span>
              </div>
              <span className="text-slate-700">•</span>
              <span><strong className="text-white">{product.reviews || 286}</strong> đánh giá thực tế</span>
              <span className="text-slate-700">•</span>
              <span><strong className="text-white">1.4K</strong> đã bán ra</span>
              <span className="text-slate-700">•</span>
              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                ✅ Phổ Biến Nhất
              </span>
            </div>

            {/* Price Box */}
            <div className="bg-gradient-to-r from-[#1E293B] to-[#172033] border border-slate-700/80 rounded-2xl p-6 space-y-3 shadow-xl">
              <div className="flex items-baseline gap-4">
                <span className="text-3xl sm:text-4xl font-black text-orange-500">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && product.originalPrice && (
                  <span className="text-lg text-slate-500 line-through font-normal">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                {hasDiscount && (
                  <span className="bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold px-2.5 py-1 rounded-full">
                    Tiết kiệm: {formatPrice(savingsAmount)} (-{discountPercent}%)
                  </span>
                )}
              </div>

              {/* Stock Bar Ticker */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-orange-400 flex items-center gap-1">
                    🔥 Tình trạng kho
                  </span>
                  <span className="text-slate-400">Còn {availableStock} chiếc</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className={`h-full rounded-full ${availableStock > 10 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-orange-500 to-rose-500'}`}
                    style={{ width: `${Math.min(100, Math.max(4, availableStock))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Short Description */}
            <p className="text-slate-300 text-sm leading-relaxed">
              {product.description || 'Giày đá bóng chính hãng với form ôm chân chuẩn người Việt, đế bám sân tốt và độ bền đã được kiểm chứng qua hàng ngàn trận phủi. Bảo hành keo – chỉ 6 tháng, đổi size miễn phí trong 30 ngày.'}
            </p>

            {/* Color Variant Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Màu sắc lựa chọn:</span>
                <span className="text-orange-400 font-semibold">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: 'Đen / Xanh đen', color: 'bg-slate-900 border-slate-600' },
                  { name: 'Trắng / Bạc', color: 'bg-slate-200 border-slate-400' },
                  { name: 'Hồng / Đỏ', color: 'bg-rose-600 border-rose-400' }
                ].map(variant => (
                  <button
                    key={variant.name}
                    onClick={() => setSelectedColor(variant.name)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                      selectedColor === variant.name
                        ? 'border-orange-500 bg-orange-500/10 text-white shadow-lg'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full border ${variant.color}`}></span>
                    {variant.name.split(' ')[0]} {variant.name.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector & Stock Status */}
            <div className="flex items-center gap-4 pt-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Số lượng:</span>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3.5 py-2 text-slate-400 hover:text-white font-bold text-base transition"
                >
                  −
                </button>
                <span className="px-4 py-2 text-white font-mono font-bold text-sm">
                  {qty}
                </span>
                <button
                  onClick={() => setQty(Math.min(availableStock, qty + 1))}
                  disabled={qty >= availableStock}
                  className="px-3.5 py-2 text-slate-400 hover:text-white font-bold text-base transition disabled:opacity-30"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-slate-400">
                Còn <strong className="text-white">{availableStock}</strong> sản phẩm trong kho
              </span>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <button
                onClick={handleAddToCart}
                disabled={isPending || isAuthLoading || availableStock <= 0}
                className="px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <FiShoppingCart size={18} />
                <span>{availableStock <= 0 ? 'Hết hàng' : isPending ? 'Đang thêm...' : 'Thêm Vào Giỏ Hàng'}</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isPending || isAuthLoading || availableStock <= 0}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 disabled:opacity-50"
              >
                <FiZap size={18} />
                <span>Mua Ngay 1 Chạm</span>
              </button>
            </div>

            {/* Policy & Guarantees List */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <FiTruck className="text-orange-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-white">Miễn Phí Vận Chuyển Hỏa Tốc Toàn Quốc</h4>
                  <p className="text-slate-400 mt-0.5">Giao siêu tốc 2h nội thành TP.HCM & Hà Nội cho đơn từ 2.000.000 ₫.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FiShield className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-white">Bảo Hành Chính Hãng 12 Tháng 1 Đổi 1</h4>
                  <p className="text-slate-400 mt-0.5">Trung tâm bảo hành ủy quyền Bitexco Financial Tower, Quận 1, TP.HCM.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FiRefreshCw className="text-amber-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-white">Cam Kết Hoàn Tiền 200%</h4>
                  <p className="text-slate-400 mt-0.5">Bảo vệ quyền lợi tuyệt đối nếu phát hiện hàng giả, hàng không nguyên seal.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Feature Highlight Banner (Middle Banner from Screenshot) */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-[#1E293B] to-slate-900 border border-slate-700/80 p-8 md:p-12 overflow-hidden relative shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase rounded-full tracking-wider">
                KIỂM SOÁT BÓNG & BỨT TỐC
              </span>

              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                Ôm chân như may đo. Bứt tốc và xử lý bóng tự tin trên mọi mặt sân.
              </h2>

              <p className="text-slate-300 text-sm leading-relaxed">
                Upper ôm sát theo form chân Á Đông, đế đinh tối ưu độ bám giúp vào bóng và đổi hướng chắc chắn. Độ bền keo – chỉ đã được kiểm chứng qua hàng ngàn trận phủi, càng đá càng mềm.
              </p>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-orange-400">6 Tháng</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">Bảo hành keo – chỉ</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-white">30 Ngày</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">Đổi size miễn phí</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-white">100%</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">Chính hãng, check auth</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
              <img
                src="/images/products/urban-sneakers.webp"
                alt="Giày đá bóng Cún-shop"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-xs font-semibold text-slate-200">
                ⚽ Hàng chính hãng 100% – bao check auth trọn đời, phát hiện fake đền 200% giá trị đơn hàng.
              </div>
            </div>

          </div>
        </div>

        {/* Tabbed Technical Specifications Section */}
        <div className="space-y-6 pt-4">
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
            {[
              { id: 'specs', label: 'Thông Số Kỹ Thuật', icon: FiSliders },
              { id: 'highlights', label: 'Đặc Điểm Nổi Bật', icon: FiZap },
              { id: 'reviews', label: `Đánh Giá Từ Khách Hàng (${product.reviews || 0})`, icon: FiMessageSquare },
              { id: 'warranty', label: 'Chính Sách & Bảo Hành', icon: FiShield }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-lg'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={14} className={activeTab === tab.id ? 'text-orange-400' : ''} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="bg-[#1E293B]/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            
            {activeTab === 'specs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Tech Specs Block 1 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="text-orange-400">⚙️</span> Chất Liệu & Form Dáng
                  </h3>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-800/60">
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold w-1/3">Chất liệu upper</td>
                        <td className="py-2.5 text-white font-medium">Da tổng hợp cao cấp / da kangaroo (tuỳ phiên bản)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Form dáng</td>
                        <td className="py-2.5 text-white font-medium">Ôm chân (snug fit), phù hợp chân người Việt</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Lót trong</td>
                        <td className="py-2.5 text-white font-medium">Đệm êm kháng khuẩn, tháo rời được</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Cổ giày</td>
                        <td className="py-2.5 text-white font-medium">Cổ thấp linh hoạt hoặc cổ cao ôm (tuỳ mẫu mã)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Bảo hành</td>
                        <td className="py-2.5 text-white font-medium">Bảo hành keo – chỉ 6 tháng, đổi size 30 ngày</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tech Specs Block 2 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="text-emerald-400">🏟️</span> Đế Giày & Mặt Sân
                  </h3>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-800/60">
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold w-1/3">Loại đinh</td>
                        <td className="py-2.5 text-white font-medium">FG (cỏ tự nhiên) / TF (cỏ nhân tạo) / IC (futsal)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Chất liệu đế</td>
                        <td className="py-2.5 text-white font-medium">TPU cao cấp, chống mài mòn, bám sân tốt</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Trọng lượng</td>
                        <td className="py-2.5 text-white font-medium">~200 – 230g (size 42), siêu nhẹ khi bứt tốc</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Mặt sân phù hợp</td>
                        <td className="py-2.5 text-white font-medium">Sân cỏ tự nhiên / nhân tạo / sân futsal</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Size</td>
                        <td className="py-2.5 text-white font-medium">39 – 45, tư vấn chọn size miễn phí qua hotline</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {activeTab === 'highlights' && (
              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <h3 className="text-base font-bold text-white">Điểm Nổi Bật Thiết Kế & Trải Nghiệm Cún-shop</h3>
                <p>
                  - Công nghệ upper mới nhất giúp kiểm soát bóng chắc chắn và bứt tốc tự tin trong mọi tình huống.
                </p>
                <p>
                  - Đế đinh tối ưu độ bám sân, giảm trượt và hạn chế chấn thương cổ chân khi vào bóng.
                </p>
                <p>
                  - Form ôm chân Á Đông, đi kèm chính sách đổi size miễn phí trong 30 ngày và tư vấn size qua hotline.
                </p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <ProductReviews productId={product.id} />
            )}

            {activeTab === 'warranty' && (
              <div className="space-y-3 text-xs text-slate-300">
                <h3 className="text-sm font-bold text-white">Chính Sách Bảo Hành Cún-shop</h3>
                <p>• Hàng chính hãng 100%, bao check auth trọn đời. Phát hiện hàng fake đền 200% giá trị đơn hàng.</p>
                <p>• Bảo hành keo – chỉ 6 tháng; đổi size miễn phí trong 30 ngày nếu không vừa.</p>
                <p>• Miễn phí giao nhận hàng bảo hành tận nhà trên toàn quốc.</p>
              </div>
            )}

          </div>

        </div>

        {/* Related Products Grid */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6 pt-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[10px] font-bold text-orange-400 tracking-widest uppercase">HỆ SINH THÁI THƯƠNG LƯU</span>
                <h2 className="text-2xl font-black text-white mt-1">Sản phẩm gợi ý cùng danh mục</h2>
              </div>
              <Link href="/products" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition">
                Xem tất cả danh mục <FiArrowRight />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
