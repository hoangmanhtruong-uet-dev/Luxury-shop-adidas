import type { Product } from '@/types/product';

const CATEGORY_IMAGES: Record<string, string> = {
  'Th\u1EDDi trang': '/images/products/category-fashion.webp',
  'C\u00F4ng ngh\u1EC7': '/images/products/category-technology.webp',
  'L\u00E0m \u0111\u1EB9p': '/images/products/category-beauty.webp',
  'Gia d\u1EE5ng': '/images/products/category-home.webp',
  'Giày sân cỏ tự nhiên': '/images/products/urban-sneakers.webp',
  'Giày sân cỏ nhân tạo': '/images/products/urban-sneakers.webp',
  'Giày futsal': '/images/products/urban-sneakers.webp',
  'Phụ kiện bóng đá': '/images/products/urban-sneakers.webp',
};

export const DEFAULT_PRODUCT_IMAGE = '/images/products/urban-sneakers.webp';

export function getCategoryProductImage(category?: string | null) {
  return (category && CATEGORY_IMAGES[category]) || DEFAULT_PRODUCT_IMAGE;
}

export function getProductImage(product: Pick<Product, 'image' | 'images' | 'category' | 'categoryRef'>) {
  return product.image
    || product.images?.[0]?.url
    || getCategoryProductImage(product.category || product.categoryRef?.name);
}
