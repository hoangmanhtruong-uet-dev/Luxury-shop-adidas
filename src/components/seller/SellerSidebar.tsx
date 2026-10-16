'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sellerMenu = [
  { label: 'Tổng Quan', icon: '📊', href: '/seller' },
  { label: 'Quản Lý Sản Phẩm', icon: '📦', href: '/seller/products' },
  { label: 'Quản Lý Đơn Hàng', icon: '📝', href: '/seller/orders' },
  { label: 'Khuyến Mãi', icon: '🎟️', href: '/seller/marketing' },
  { label: 'Phân Tích Bán Hàng', icon: '📉', href: '/seller/analytics' },
  { label: 'Tài chính và Đối soát', icon: '💰', href: '/seller/finance' },
  { label: 'Hồ Sơ Shop', icon: '🏪', href: '/seller/shop-profile' },
  { label: 'Cài Đặt', icon: '⚙️', href: '/seller/settings' },
];

export default function SellerSidebar() {
  const pathname = usePathname();

  return (
    <div style={{ 
      width: '260px', 
      background: 'rgba(255,255,255,0.02)', 
      height: 'calc(100vh - 100px)', 
      position: 'sticky', 
      top: '80px',
      borderRadius: '24px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ padding: '10px 15px', marginBottom: '15px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>Cún Seller</h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mã shop: #889234</p>
      </div>

      {sellerMenu.map((item, idx) => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={idx} 
            href={item.href}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px',
              borderRadius: '12px',
              textDecoration: 'none',
              background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: isActive ? 700 : 500, 
              color: isActive ? 'var(--accent)' : 'var(--text-muted)' 
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}

      <div style={{ marginTop: 'auto', padding: '15px', borderRadius: '16px', background: 'var(--accent-gradient)', color: 'white', fontSize: '12px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 5px', fontWeight: 700 }}>Hỗ trợ 24/7</p>
        <p style={{ margin: 0, opacity: 0.8 }}>Hotline: 0968 544 769</p>
      </div>
    </div>
  );
}
