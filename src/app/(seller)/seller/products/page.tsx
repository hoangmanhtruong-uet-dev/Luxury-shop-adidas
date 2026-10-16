'use client';
import { useCallback, useEffect, useState } from 'react';
import { useToastStore } from '@/components/ui/Toast';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

export default function SellerProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(s => s.addToast);

  const fetchSellerProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/seller/products');
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSellerProducts(); }, [fetchSellerProducts]);

  const deleteProduct = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Đã xóa sản phẩm thành công.');
        fetchSellerProducts();
      }
    } catch {
      addToast('Lỗi khi xóa sản phẩm.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Quản Lý Sản Phẩm</h1>
              <p style={{ color: 'var(--text-muted)' }}>Danh sách toàn bộ sản phẩm bạn đang kinh doanh trên Cún-Store.</p>
            </div>
            <Link href="/seller" className="btn-primary" style={{ padding: '8px 16px' }}>🏠 Home</Link>
          </div>
        </div>
        <Link href="/seller/products/new" className="btn-primary" style={{ padding: '12px 24px', textDecoration: 'none' }}>
          ➕ Đăng sản phẩm mới
        </Link>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)' }}>SẢN PHẨM</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)' }}>DANH MỤC</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)' }}>GIÁ BÁN</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)' }}>ĐÃ BÁN</th>
              <th style={{ padding: '20px', textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center' }}>Đang tải danh sách...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Bạn chưa có sản phẩm nào. Hãy đăng sản phẩm đầu tiên!</td></tr>
            ) : products.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                <td style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                      {p.emoji}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, margin: 0 }}>{p.name}</p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {p.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '20px' }}>
                  <span style={{ fontSize: '14px' }}>{p.categoryRef?.name}</span>
                </td>
                <td style={{ padding: '20px' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(p.price)}</p>
                  {p.originalPrice && <span style={{ fontSize: '11px', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatPrice(p.originalPrice)}</span>}
                </td>
                <td style={{ padding: '20px' }}>
                  {p.soldQuantity ?? 0}
                </td>
                <td style={{ padding: '20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Link href={`/seller/products/edit/${p.id}`} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', textDecoration: 'none', fontSize: '13px' }}>Sửa</Link>
                    <button onClick={() => deleteProduct(p.id)} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
