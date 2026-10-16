'use client';

import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/product/ProductCard';
import { compareMoneyStrings } from '@/lib/utils/client-money';
import type { Product } from '@/types/product';
import { extractProducts } from '@/lib/api/products-response';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CategoryDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState('default');
  const [priceMax, setPriceMax] = useState(30000000);
  const [selectedRating, setSelectedRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const categoryResponse = await fetch('/api/categories');
        const categoryData = await categoryResponse.json();
        if (!categoryResponse.ok) throw new Error(categoryData.error || 'Không thể tải danh mục');
        const found = Array.isArray(categoryData)
          ? categoryData.find((item: Category) => item.slug === decodeURIComponent(slug))
          : null;
        if (!found) throw new Error('Danh mục không tồn tại');
        setCategory(found);

        const productResponse = await fetch(`/api/products?category=${encodeURIComponent(found.name)}&limit=50`);
        const productData = await productResponse.json();
        if (!productResponse.ok) throw new Error(productData.error || 'Không thể tải sản phẩm');
        setProducts(extractProducts(productData));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Không thể tải danh mục');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const filteredProducts = useMemo(() => {
    const result = products.filter(product =>
      compareMoneyStrings(product.price, priceMax) <= 0 &&
      (selectedRating === 0 || Math.round(product.rating) >= selectedRating)
    );
    if (sortBy === 'price-asc') result.sort((a, b) => compareMoneyStrings(a.price, b.price));
    if (sortBy === 'price-desc') result.sort((a, b) => compareMoneyStrings(b.price, a.price));
    if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating);
    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return result;
  }, [products, priceMax, selectedRating, sortBy]);

  if (loading) return <div className="page-container" style={{ paddingTop: '100px', textAlign: 'center' }}>Đang tải...</div>;

  // Phase 4.1: a real 404 instead of a 200-status "Danh mục không tồn tại" page.
  // `error` still renders inline (it is a genuine failure, not a missing record).
  if (!category && !error) {
    notFound();
  }

  if (error || !category) {
    return (
      <div className="page-container" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '16px' }}>{error || 'Danh mục không tồn tại'}</h1>
        <Link href="/categories" className="btn-primary">Quay lại danh mục</Link>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
      <div style={{ marginBottom: '32px', color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--accent)' }}>Trang chủ</Link> /{' '}
        <Link href="/categories" style={{ color: 'var(--accent)' }}>Danh mục</Link> / {category.name}
      </div>
      <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '8px' }}>{category.name}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>{filteredProducts.length} sản phẩm</p>

      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <select className="input-field" value={sortBy} onChange={event => setSortBy(event.target.value)} style={{ maxWidth: '220px' }}>
          <option value="default">Sắp xếp mặc định</option>
          <option value="price-asc">Giá: thấp đến cao</option>
          <option value="price-desc">Giá: cao đến thấp</option>
          <option value="rating">Đánh giá cao nhất</option>
          <option value="name">Tên A-Z</option>
        </select>
        <select className="input-field" value={selectedRating} onChange={event => setSelectedRating(Number(event.target.value))} style={{ maxWidth: '180px' }}>
          <option value={0}>Mọi đánh giá</option>
          <option value={4}>Từ 4 sao</option>
          <option value={3}>Từ 3 sao</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
          Giá tối đa
          <input type="range" min={0} max={30000000} step={500000} value={priceMax} onChange={event => setPriceMax(Number(event.target.value))} />
          <span>{new Intl.NumberFormat('vi-VN').format(priceMax)}đ</span>
        </label>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="product-grid">
          {filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} imagePriority={index === 0} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>Không có sản phẩm phù hợp.</div>
      )}
    </div>
  );
}