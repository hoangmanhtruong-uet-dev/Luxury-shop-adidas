'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';

export default function ShopProfilePage() {
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const [shopName, setShopName] = useState(user?.name + ' Official Store');

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Hồ Sơ Shop</h1>
        <p style={{ color: 'var(--text-muted)' }}>Quản lý thông tin hiển thị của gian hàng trên Cún-Store.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Avatar & Cover */}
        <div className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
          <div style={{ 
            width: '120px', height: '120px', borderRadius: '50%', 
            background: 'var(--accent-gradient)', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '50px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            🏪
          </div>
          <button className="btn-secondary" style={{ padding: '8px 20px', fontSize: '13px' }}>Thay đổi Logo</button>
          <div style={{ marginTop: '30px', textAlign: 'left' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '5px' }}>Trạng thái shop</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '13px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
              Đang hoạt động
            </div>
          </div>
        </div>

        {/* Info Form */}
        <div className="glass-card" style={{ padding: '40px' }}>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Tên Shop</label>
              <input className="input-field" value={shopName} onChange={e => setShopName(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Mô tả Shop</label>
              <textarea 
                className="input-field" 
                style={{ width: '100%', minHeight: '120px' }} 
                placeholder="Giới thiệu về các sản phẩm tuyệt vời của bạn..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Địa chỉ lấy hàng mặc định</label>
              <p style={{ margin: 0, fontSize: '14px' }}>Hà Nội, Việt Nam <span style={{ color: 'var(--accent)', cursor: 'pointer', marginLeft: '10px' }}>Thay đổi</span></p>
            </div>

            <button 
              type="button" 
              onClick={() => addToast('Đã lưu thông tin Shop! ✨')}
              className="btn-primary" 
              style={{ marginTop: '20px', padding: '15px' }}
            >
              Lưu thay đổi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
