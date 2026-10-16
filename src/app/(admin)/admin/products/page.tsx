'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';
import SafeImage from '@/components/common/SafeImage';
import { DEFAULT_PRODUCT_IMAGE } from '@/lib/upload/product-image';
import { extractProducts } from '@/lib/api/products-response';

export default function AdminProductsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const addToast = useToastStore(s => s.addToast);
  const router = useRouter();

  const fetchAllProducts = useCallback(async () => {
    try {
      // Phase 3.2: the endpoint is now paginated with a 50-row server cap.
      // Admin needs a dedicated paginated listing for catalogues beyond 50 rows.
      const res = await fetch('/api/products?limit=50');
      const data = await res.json();
      setProducts(extractProducts(data));
    } catch {
      addToast('Lỗi khi lấy dữ liệu sản phẩm.');
    } finally {
      setLoadingProducts(false);
    }
  }, [addToast]);

  const fetchAllCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch {
      addToast('Lỗi khi lấy dữ liệu danh mục.');
    } finally {
      setLoadingCategories(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAllProducts();
    fetchAllCategories();
  }, [fetchAllCategories, fetchAllProducts]);

  const toggleStock = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock: !currentStatus }),
      });
      if (res.ok) {
        addToast(!currentStatus ? 'Đã kiểm duyệt sản phẩm thành công! ✨' : 'Đã tạm khóa sản phẩm! 🔒');
        fetchAllProducts();
      } else {
        addToast('Lỗi khi cập nhật trạng thái.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  const updateImage = async (id: string, currentImage: string | null) => {
    const newImage = window.prompt('Nhập URL hình ảnh mới cho sản phẩm (để trống để xóa):', currentImage || '');
    if (newImage === null) return; // user cancelled
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: newImage || null }),
      });
      if (res.ok) {
        addToast('Đã cập nhật ảnh sản phẩm! 🖼️');
        fetchAllProducts();
      } else {
        addToast('Lỗi khi cập nhật ảnh.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast('Đã gỡ bỏ sản phẩm thành công! 🗑️');
        fetchAllProducts();
      } else {
        addToast('Lỗi khi gỡ sản phẩm.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này? Tất cả sản phẩm thuộc danh mục này sẽ bị ngắt liên kết.')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast('Đã gỡ bỏ danh mục thành công! 🗑️');
        fetchAllCategories();
        fetchAllProducts();
      } else {
        addToast('Lỗi khi gỡ danh mục.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  const addCategory = async () => {
    const name = window.prompt('Nhập tên danh mục mới:');
    if (!name) return;
    const description = window.prompt('Nhập mô tả cho danh mục (tùy chọn):') || '';
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        addToast('Đã tạo danh mục mới! 🎉');
        fetchAllCategories();
      } else {
        const errorData = await res.json();
        addToast(errorData.error || 'Lỗi khi tạo danh mục.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  

  const approveCategory = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        addToast(`Danh mục "${name}" đã được duyệt hợp lệ! ✅`);
        fetchAllCategories();
      } else if (data && data.error) {
        addToast(data.error);
      } else if (res.status === 403) {
        addToast('Bạn không có quyền thực hiện hành động này.');
      } else {
        addToast('Lỗi khi duyệt danh mục.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Quản Lý Sản Phẩm & Danh Mục</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>
            {activeTab === 'products' 
              ? `Tổng cộng ${products.length} sản phẩm đang được bày bán từ mọi người bán.` 
              : `Tổng cộng ${categories.length} danh mục sản phẩm trên sàn.`}
          </p>
        </div>
        {activeTab === 'categories' && (
          <button onClick={addCategory} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '12px' }}>
            ➕ Thêm danh mục mới
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('products')} 
          style={{ 
            background: 'none', border: 'none', color: activeTab === 'products' ? 'var(--accent)' : 'rgba(255,255,255,0.4)', 
            fontSize: '16px', fontWeight: activeTab === 'products' ? 700 : 500, cursor: 'pointer',
            padding: '8px 16px', borderBottom: activeTab === 'products' ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Sản Phẩm ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('categories')} 
          style={{ 
            background: 'none', border: 'none', color: activeTab === 'categories' ? 'var(--accent)' : 'rgba(255,255,255,0.4)', 
            fontSize: '16px', fontWeight: activeTab === 'categories' ? 700 : 500, cursor: 'pointer',
            padding: '8px 16px', borderBottom: activeTab === 'categories' ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Danh Mục ({categories.length})
        </button>
      </div>

      {activeTab === 'products' ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>SẢN PHẨM / NGƯỜI BÁN</th>
                <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>GIÁ BÁN</th>
                <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>KHO HÀNG</th>
                <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>ĐÁNH GIÁ</th>
                <th style={{ padding: '20px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loadingProducts ? (
                <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center' }}>Đang tải dữ liệu sản phẩm...</td></tr>
              ) : products.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {p.image ? (
                        <SafeImage src={p.image} fallbackSrc={DEFAULT_PRODUCT_IMAGE} alt={p.name} width={32} height={32} sizes="32px" style={{ objectFit: 'cover', borderRadius: '6px' }} />
                      ) : (
                        <span style={{ fontSize: '30px' }}>{p.emoji || '📦'}</span>
                      )}
                      <div>
                        <p style={{ margin: 0, fontWeight: 700 }}>{p.name}</p>
                        <span style={{ fontSize: '11px', color: 'var(--accent)' }}>Shop ID: {p.sellerId?.slice(0,8)}...</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px', fontWeight: 700 }}>{formatPrice(p.price)}</td>
                  <td style={{ padding: '20px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                      background: p.inStock ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: p.inStock ? '#10b981' : '#ef4444'
                    }}>
                      {p.inStock ? 'Hợp lệ' : 'Tạm khóa'}
                    </span>
                  </td>
                  <td style={{ padding: '20px', fontSize: '13px' }}>⭐ {p.rating} ({p.reviews})</td>
                  <td style={{ padding: '20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => router.push(`/admin/image-editor?productId=${p.id}&imageUrl=${encodeURIComponent(p.image || '')}`)} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                        Sửa ảnh
                      </button>
                      <button onClick={() => toggleStock(p.id, p.inStock)} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                        {p.inStock ? 'Khóa bán' : 'Kiểm duyệt'}
                      </button>
                      <button onClick={() => deleteProduct(p.id)} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Gỡ bỏ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>DANH MỤC</th>
                <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>SLUG</th>
                <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>MÔ TẢ</th>
                <th style={{ padding: '20px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loadingCategories ? (
                <tr><td colSpan={4} style={{ padding: '50px', textAlign: 'center' }}>Đang tải dữ liệu danh mục...</td></tr>
              ) : categories.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontSize: '24px' }}>📁</span>
                      <p style={{ margin: 0, fontWeight: 700 }}>{c.name}</p>
                      {c.approved ? (
                        <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>Đã duyệt</div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '6px' }}>Chờ duyệt</div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '20px', color: 'var(--accent)', fontSize: '13px' }}>{c.slug}</td>
                  <td style={{ padding: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                    {c.description || 'Không có mô tả'}
                  </td>
                  <td style={{ padding: '20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => approveCategory(c.id, c.name)}
                        disabled={c.approved}
                        title={c.approved ? 'Đã duyệt' : 'Kiểm duyệt'}
                        style={{
                          padding: '8px 12px', borderRadius: '10px', background: c.approved ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                          color: c.approved ? '#10b981' : 'white', border: 'none', cursor: c.approved ? 'default' : 'pointer', fontSize: '12px'
                        }}
                      >
                        {c.approved ? 'Đã duyệt' : 'Kiểm duyệt'}
                      </button>
                      <button onClick={() => deleteCategory(c.id)} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Gỡ bỏ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
