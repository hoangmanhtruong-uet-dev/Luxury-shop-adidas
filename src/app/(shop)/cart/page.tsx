'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getAvailableStock, useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { multiplyMoneyByQuantity, compareMoneyStrings, percentageOff, subtractMoneyStrings, addMoneyStrings } from '@/lib/utils/client-money';
import SafeImage from '@/components/common/SafeImage';
import { getCategoryProductImage } from '@/lib/upload/product-image';
import { useToastStore } from '@/components/ui/Toast';
import {
  FiTrash2, FiCheckCircle, FiTruck, FiShield, FiRefreshCw,
  FiHeadphones, FiTag, FiArrowRight, FiBookmark, FiPlus,
  FiGift, FiLock, FiChevronDown, FiChevronUp, FiShoppingCart
} from 'react-icons/fi';

// Phụ kiện bóng đá bán kèm gợi ý
const CROSS_SELL_ITEMS = [
  {
    id: 'cs-1',
    name: 'Bóng Động Lực UHV 2.07 Size 5',
    price: 690000,
    originalPrice: 850000,
    discount: '-19%',
    tag: 'BÁN CHẠY',
    image: '/images/products/urban-sneakers.webp',
    category: 'Phụ kiện bóng đá',
    emoji: '⚽'
  },
  {
    id: 'cs-2',
    name: 'Tất Chống Trượt Compressport',
    price: 199000,
    originalPrice: 250000,
    discount: '-20%',
    tag: 'THIẾT YẾU',
    image: '/images/products/urban-sneakers.webp',
    category: 'Phụ kiện bóng đá',
    emoji: '🧦'
  },
  {
    id: 'cs-3',
    name: 'Băng Quấn Cổ Chân Thể Thao',
    price: 99000,
    originalPrice: 150000,
    discount: '-34%',
    tag: 'CHỐNG CHẤN THƯƠNG',
    image: '/images/products/urban-sneakers.webp',
    category: 'Phụ kiện bóng đá',
    emoji: '🩹'
  },
  {
    id: 'cs-4',
    name: 'Túi Đựng Giày Đá Bóng',
    price: 299000,
    originalPrice: 390000,
    discount: '-23%',
    tag: 'TIỆN LỢI',
    image: '/images/products/urban-sneakers.webp',
    category: 'Phụ kiện bóng đá',
    emoji: '🎒'
  }
];

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, clearCart, addItem } = useCartStore();
  const addToast = useToastStore(s => s.addToast);

  const [couponCode, setCouponCode] = useState('CUNMALL');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>({
    code: 'CUNMALL',
    discount: 50000
  });
  const [noteOpen, setNoteOpen] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [savedForLater, setSavedForLater] = useState<any[]>([
    {
      id: 'saved-1',
      name: 'Găng Tay Thủ Môn Adidas Chính Hãng',
      price: 899000,
      image: '/images/products/urban-sneakers.webp',
      emoji: '🧤'
    }
  ]);

  const rawTotal = getTotal();
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const grandTotal = discountAmount > 0
    ? subtractMoneyStrings(rawTotal, discountAmount)
    : rawTotal;
  const grandTotalNum = Number(grandTotal.split('.')[0]);
  const rewardPoints = Math.floor(grandTotalNum / 100000);
  const rewardValue = rewardPoints * 100;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'CUNMALL') {
      setAppliedCoupon({ code: 'CUNMALL', discount: 50000 });
      addToast('Áp dụng mã CUNMALL thành công (-50.000 ₫)! 🎉');
    } else if (couponCode.toUpperCase() === 'CUN100K') {
      setAppliedCoupon({ code: 'CUN100K', discount: 100000 });
      addToast('Áp dụng mã CUN100K thành công (-100.000 ₫)! 🎉');
    } else {
      addToast('Mã giảm giá không hợp lệ hoặc đã hết hạn', 'error');
    }
  };

  const handleSaveForLater = (item: any) => {
    setSavedForLater(prev => [...prev, {
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      image: item.product.image,
      emoji: item.product.emoji
    }]);
    removeItem(item.product.id);
    addToast(`Đã lưu "${item.product.name}" để mua sau 📌`);
  };

  const handleMoveBackToCart = (savedItem: any) => {
    addItem({
      id: savedItem.id,
      name: savedItem.name,
      price: String(savedItem.price),
      currency: 'VND',
      description: '',
      category: 'Khác',
      rating: 5,
      reviews: 10,
      inStock: true,
      emoji: savedItem.emoji || '📦',
      gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
    }, 1);
    setSavedForLater(prev => prev.filter(i => i.id !== savedItem.id));
    addToast(`Đã chuyển "${savedItem.name}" trở lại giỏ hàng! 🛒`);
  };

  const handleAddCrossSell = (csItem: typeof CROSS_SELL_ITEMS[0]) => {
    addItem({
      id: csItem.id,
      name: csItem.name,
      price: String(csItem.price),
      originalPrice: String(csItem.originalPrice),
      currency: 'VND',
      description: '',
      category: csItem.category,
      rating: 4.8,
      reviews: 50,
      inStock: true,
      emoji: csItem.emoji,
      gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
    }, 1);
    addToast(`Đã thêm phụ kiện "${csItem.name}" vào giỏ hàng! 🔌`);
  };

  if (items.length === 0 && savedForLater.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl animate-bounce">
          🛒
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Giỏ hàng của bạn đang trống</h2>
        <p className="text-slate-400 text-sm max-w-md text-center mb-8">
          Hãy khám phá hàng trăm mẫu giày đá bóng chính hãng tại Cún-shop!
        </p>
        <Link href="/products" className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-full transition shadow-lg shadow-orange-500/20">
          🛍️ Mua sắm ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-16">
      
      {/* Step Header Indicator */}
      <div className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Link href="/" className="hover:text-white transition">Trang chủ</Link>
            <span>/</span>
            <span className="text-white font-bold">Giỏ hàng của bạn ({items.length} sản phẩm)</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-2 text-orange-400">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
              <span>1. Giỏ hàng</span>
            </div>
            <span className="text-slate-700">—</span>
            <div className="flex items-center gap-2 text-slate-500">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-black">2</span>
              <span>2. Địa chỉ & Giao hàng</span>
            </div>
            <span className="text-slate-700">—</span>
            <div className="flex items-center gap-2 text-slate-500">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-black">3</span>
              <span>3. Thanh toán</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Banner Alert Freeship */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 text-emerald-400">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-500 uppercase block mb-1">
              🛒 MÃ PHIÊN GIỎ HÀNG: #MTR-98214
            </span>
            <h1 className="text-2xl font-black text-white">
              Giỏ hàng <span className="text-orange-500">của bạn</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-emerald-950/80 border border-emerald-500/40 px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-300">
            <FiTruck size={20} className="text-emerald-400 shrink-0" />
            <span>Chúc mừng! Bạn đủ điều kiện <strong>FREESHIP TOÀN QUỐC</strong> - Đã tiết kiệm 50.000đ phí giao hàng hỏa tốc.</span>
          </div>
        </div>

        {/* Main Grid: Items List (Left) vs Summary Sidebar (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Cart Items (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Table Control Header */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-orange-500 rounded cursor-pointer" />
                <span>Chọn tất cả ({items.length} sản phẩm)</span>
              </label>

              <button
                onClick={clearCart}
                className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition"
              >
                <FiTrash2 size={14} /> Xóa tất cả
              </button>
            </div>

            {/* Item List Cards */}
            <div className="space-y-4">
              {items.map(item => {
                const availableStock = getAvailableStock(item.product);
                const hasDiscount = Boolean(item.product.originalPrice && compareMoneyStrings(item.product.originalPrice, item.product.price) > 0);
                const imageFallback = getCategoryProductImage(item.product.category);
                const itemTotal = multiplyMoneyByQuantity(item.product.price, item.quantity);

                return (
                  <div
                    key={item.product.id}
                    className="bg-[#1E293B] border border-slate-700/80 hover:border-slate-600 rounded-2xl p-5 transition shadow-lg space-y-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-orange-500 rounded cursor-pointer mt-3 shrink-0" />

                      {/* Product Thumbnail */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                        {item.product.image ? (
                          <SafeImage
                            src={item.product.image}
                            fallbackSrc={imageFallback}
                            alt={item.product.name}
                            fill
                            sizes="96px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            {item.product.emoji || '📦'}
                          </div>
                        )}
                        {hasDiscount && item.product.originalPrice && (
                          <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                            -{percentageOff(item.product.price, item.product.originalPrice)}%
                          </span>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded uppercase">
                            MALL AUTHENTIC
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Bảo hành 12 tháng</span>
                        </div>

                        <Link
                          href={`/products/${item.product.id}`}
                          className="text-sm sm:text-base font-bold text-white hover:text-orange-400 transition line-clamp-1"
                        >
                          {item.product.name}
                        </Link>

                        <p className="text-xs text-slate-400">
                          Phân loại: <span className="text-slate-300 font-semibold">{item.product.category} | Bản Quốc Tế</span>
                        </p>

                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-base font-black text-orange-500">
                            {formatPrice(item.product.price)}
                          </span>
                          {hasDiscount && item.product.originalPrice && (
                            <span className="text-xs text-slate-500 line-through">
                              {formatPrice(item.product.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls & Line Total */}
                      <div className="flex flex-col items-end justify-between gap-4 shrink-0">
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl text-xs">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="px-2.5 py-1.5 text-slate-400 hover:text-white font-bold transition"
                          >
                            −
                          </button>
                          <span className="px-3 py-1.5 text-white font-mono font-bold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= availableStock}
                            className="px-2.5 py-1.5 text-slate-400 hover:text-white font-bold transition disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        <p className="text-sm font-black text-white">
                          {formatPrice(itemTotal)}
                        </p>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSaveForLater(item)}
                            className="text-[11px] text-slate-400 hover:text-orange-400 flex items-center gap-1 transition"
                            title="Lưu để mua sau"
                          >
                            <FiBookmark size={13} /> Để mua sau
                          </button>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="text-slate-500 hover:text-rose-400 transition"
                            title="Xóa khỏi giỏ"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save for Later Section */}
            {savedForLater.length > 0 && (
              <div className="bg-[#131C2E] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FiBookmark className="text-orange-400" /> Danh sách đã lưu để mua sau ({savedForLater.length})
                  </h3>
                  <span className="text-[10px] text-slate-500">Sẽ không tính vào tổng đơn hiện tại</span>
                </div>

                <div className="space-y-3">
                  {savedForLater.map(savedItem => (
                    <div key={savedItem.id} className="flex items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xl">
                          {savedItem.emoji || '📦'}
                        </div>
                        <div>
                          <h4 className="font-bold text-white line-clamp-1">{savedItem.name}</h4>
                          <span className="text-orange-400 font-bold">{formatPrice(savedItem.price)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleMoveBackToCart(savedItem)}
                        className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 rounded-lg font-bold transition flex items-center gap-1"
                      >
                        <FiShoppingCart size={12} /> Thêm lại vào giỏ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <Link href="/products" className="hover:text-white flex items-center gap-1 font-semibold transition">
                ← Tiếp tục mua sắm các sản phẩm khác
              </Link>
              <span>Hỗ trợ thanh toán bảo mật 100%</span>
            </div>

          </div>

          {/* Right Column: Order Summary (4 cols) */}
          <div className="lg:col-span-4 space-y-6 sticky top-20">
            
            <div className="bg-[#1E293B] border border-slate-700/80 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-rose-500"></div>

              <h3 className="text-lg font-bold text-white flex items-center justify-between">
                <span>Tóm tắt đơn hàng</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </h3>

              {/* Voucher Code Form */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <FiTag className="text-orange-400" /> Mã giảm giá / Voucher
                </label>
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="Nhập mã giảm giá..."
                    className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white uppercase font-bold focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition"
                  >
                    Áp dụng
                  </button>
                </form>

                {/* Applied Vouchers List */}
                {appliedCoupon && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg">
                      <FiCheckCircle size={10} /> {appliedCoupon.code} (-{formatPrice(appliedCoupon.discount)})
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold rounded-lg">
                      <FiTruck size={10} /> FREESHIP (Toàn quốc)
                    </span>
                  </div>
                )}
              </div>

              {/* Price Breakdown List */}
              <div className="space-y-3 text-xs border-t border-b border-slate-700/60 py-4">
                <div className="flex justify-between text-slate-400">
                  <span>Tạm tính</span>
                  <span className="text-white font-bold">{formatPrice(rawTotal)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1"><FiCheckCircle /> Voucher {appliedCoupon.code}</span>
                    <span>-{formatPrice(appliedCoupon.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-400">
                  <span>Phí vận chuyển siêu tốc</span>
                  <span className="text-emerald-400 font-bold">
                    <span className="line-through text-slate-600 mr-1">50.000 ₫</span> Miễn phí
                  </span>
                </div>

                <div className="flex justify-between text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-[11px]">
                  <span>Điểm thưởng tích lũy nhận được</span>
                  <span className="font-bold">+{rewardPoints} Điểm ({formatPrice(rewardValue)})</span>
                </div>
              </div>

              {/* Grand Total Display */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-white">Tổng thanh toán</span>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-orange-500 block">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>(Đã bao gồm thuế GTGT VAT)</span>
                  <span className="text-emerald-400 font-bold">
                    Tiết kiệm {formatPrice(4540000)} so với giá niêm yết
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Link
                href="/checkout"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 uppercase tracking-wider"
              >
                <span>TIẾN HÀNH THANH TOÁN</span>
                <FiArrowRight size={18} />
              </Link>

              {/* Payment Methods Accepted */}
              <div className="text-center space-y-2 pt-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  CHẤP NHẬN THANH TOÁN LINH HOẠT
                </p>
                <div className="flex justify-center items-center gap-2 text-[10px] font-bold text-slate-400">
                  <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded">VISA</span>
                  <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded">Mastercard</span>
                  <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-pink-400">MoMo QR</span>
                  <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-blue-400">VNPay</span>
                  <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-emerald-400">VietQR</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                <FiLock className="text-emerald-400" />
                <span>Bảo mật chứng thực PCI-DSS & mã hóa 256-bit SSL</span>
              </div>

              {/* Accordion: Order Note */}
              <div className="border-t border-slate-800 pt-3">
                <button
                  onClick={() => setNoteOpen(!noteOpen)}
                  className="w-full text-xs text-slate-400 hover:text-white font-semibold flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5"><FiGift /> Thêm ghi chú đơn hàng hoặc yêu cầu gói quà</span>
                  {noteOpen ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {noteOpen && (
                  <textarea
                    value={orderNote}
                    onChange={e => setOrderNote(e.target.value)}
                    placeholder="Nhập ghi chú xuất hóa đơn VAT, thời gian giao hàng mong muốn..."
                    className="w-full mt-3 p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    rows={3}
                  />
                )}
              </div>

            </div>

          </div>

        </div>

        {/* Cross-Sell Section: Phụ kiện thường được mua cùng */}
        <div className="space-y-6 pt-8 border-t border-slate-800">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[10px] font-bold text-orange-400 tracking-widest uppercase">DEAL SỐC MUA KÈM</span>
              <h2 className="text-2xl font-black text-white mt-1">Phụ kiện thường được mua cùng</h2>
            </div>
            <Link href="/products" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition">
              Xem tất cả phụ kiện tương thích <FiArrowRight />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CROSS_SELL_ITEMS.map(item => (
              <div key={item.id} className="bg-[#1E293B] border border-slate-700 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-lg group hover:border-slate-500 transition">
                <div className="space-y-3">
                  <div className="relative h-40 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      {item.discount}
                    </span>
                    <span className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                      {item.tag}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-orange-400 uppercase">{item.tag}</span>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{item.name}</h3>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-base font-black text-orange-500 block">{formatPrice(item.price)}</span>
                    <span className="text-[10px] text-slate-500 line-through">{formatPrice(item.originalPrice)}</span>
                  </div>
                  <button
                    onClick={() => handleAddCrossSell(item)}
                    className="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition shadow-lg"
                    title="Thêm phụ kiện"
                  >
                    <FiPlus size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Guarantee Trust Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-slate-800">
          <div className="bg-[#1E293B]/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xl shrink-0">
              <FiTruck />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Miễn phí vận chuyển</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Áp dụng đơn hàng toàn quốc từ 500k, giao siêu tốc 2h</p>
            </div>
          </div>

          <div className="bg-[#1E293B]/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xl shrink-0">
              <FiRefreshCw />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">7 Ngày đổi trả miễn phí</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Cam kết hoàn tiền 100% nếu phát hiện lỗi từ nhà sản xuất</p>
            </div>
          </div>

          <div className="bg-[#1E293B]/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xl shrink-0">
              <FiShield />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">100% Hàng chính hãng</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Chứng nhận & xuất xứ rõ ràng, bảo hành từ 12-24 tháng</p>
            </div>
          </div>

          <div className="bg-[#1E293B]/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xl shrink-0">
              <FiHeadphones />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Hỗ trợ chuyên nghiệp 24/7</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Đội ngũ tư vấn chọn size tận tình qua Hotline 0968 544 769</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
