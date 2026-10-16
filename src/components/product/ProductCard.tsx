'use client';
import Link from 'next/link';
import { Product } from '@/types/product';
import { getAvailableStock, useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { compareMoneyStrings, percentageOff } from '@/lib/utils/client-money';
import { useState } from 'react';
import { DEFAULT_PRODUCT_IMAGE, getProductImage } from '@/lib/upload/product-image';
import SafeImage from '@/components/common/SafeImage';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';
import { usePathname, useRouter } from 'next/navigation';
import { FiShoppingCart, FiStar } from 'react-icons/fi';

function getBadgeColors(badge?: string) {
  if (!badge) return 'bg-blue-500 text-white';
  const b = badge.toLowerCase();
  if (b === 'hot' || b === 'hot trend') return 'bg-orange-500 text-white';
  if (b === 'sale' || b.includes('%')) return 'bg-rose-500 text-white';
  if (b === 'mới' || b === 'new') return 'bg-cyan-500 text-white';
  if (b === 'bán chạy' || b === 'best seller') return 'bg-emerald-500 text-white';
  if (b === 'premium') return 'bg-purple-500 text-white';
  return 'bg-blue-500 text-white';
}

type ProductCardProps = {
  product: Product;
  index?: number;
  imagePriority?: boolean;
};

export default function ProductCard({ product, index = 0, imagePriority = false }: ProductCardProps) {
  const addItem = useCartStore(s => s.addItem);
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [added, setAdded] = useState(false);
  const image = getProductImage(product);
  const category = product.category || product.categoryRef?.name || 'Sản phẩm';
  const availableStock = getAvailableStock(product);
  const hasDiscount = Boolean(product.originalPrice && compareMoneyStrings(product.originalPrice, product.price) > 0);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading || availableStock <= 0) return;
    if (!isAuthenticated) {
      router.push('/login?from=' + encodeURIComponent(pathname || '/'));
      return;
    }
    addItem(product, 1);
    setAdded(true);
    const total = useCartStore.getState().getItemCount();
    useToastStore.getState().addToast(
      `Đã thêm ${product.name} (giỏ: ${total} món)`,
      'success',
      { label: 'Xem giỏ', href: '/cart' },
    );
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link href={`/products/${product.id}`} className="block h-full bg-[#1E293B] hover:bg-[#273549] border border-slate-700 hover:border-slate-500 rounded-2xl overflow-hidden transition duration-300 group">
      <div className="flex flex-col h-full">
        <div className="relative h-48 bg-[#0F172A] flex items-center justify-center overflow-hidden">
          <SafeImage
            src={image}
            alt={product.name}
            fallbackSrc={DEFAULT_PRODUCT_IMAGE}
            fill
            priority={imagePriority}
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 280px"
            style={{ objectFit: 'cover' }}
            className="group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent opacity-60"></div>
          
          <div className="absolute top-3 left-3 flex gap-2">
            {product.badge && (
              <span className={`px-2 py-1 text-[9px] font-bold uppercase rounded tracking-wider ${getBadgeColors(product.badge)}`}>
                {product.badge}
              </span>
            )}
            {hasDiscount && product.originalPrice && (
              <span className="px-2 py-1 bg-rose-500 text-white text-[9px] font-bold uppercase rounded tracking-wider">
                -{percentageOff(product.price, product.originalPrice)}%
              </span>
            )}
          </div>
          
          <button className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition">
             <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
        </div>
        
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-2">
             <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{category}</p>
             <div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold">
               <FiStar className="text-orange-400 fill-orange-400" /> {product.rating.toFixed(1)} <span className="text-slate-500 font-normal">({product.reviews})</span>
             </div>
          </div>
          
          <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 leading-snug group-hover:text-orange-400 transition-colors">
            {product.name}
          </h3>
          
          <div className="flex items-end justify-between mt-auto pt-2 border-t border-slate-700/50">
            <div>
              <p className="text-base font-black text-orange-500">{formatPrice(product.price)}</p>
              {hasDiscount && product.originalPrice && (
                <p className="text-[10px] text-slate-500 line-through mt-0.5">{formatPrice(product.originalPrice)}</p>
              )}
            </div>
            
            <button 
              onClick={handleAdd} 
              disabled={isLoading || availableStock <= 0}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md ${
                availableStock <= 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 
                added ? 'bg-emerald-500 text-white scale-110' : 'bg-orange-500 hover:bg-orange-600 text-white hover:scale-105'
              }`}
            >
              {availableStock <= 0 ? 'Hết' : added ? '✓' : <FiShoppingCart size={16} />}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
