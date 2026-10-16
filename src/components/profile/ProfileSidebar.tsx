'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';
import SafeImage from '@/components/common/SafeImage';
import { FiUser, FiBox, FiMapPin, FiHeart, FiKey, FiHeadphones } from 'react-icons/fi';
import { RiBankLine, RiCoupon3Line } from 'react-icons/ri';

const menuItems = [
  { label: 'Hồ sơ cá nhân', icon: <FiUser />, href: '/profile' },
  { label: 'Đơn hàng của tôi', icon: <FiBox />, href: '/profile/orders', badge: '3' },
  { label: 'Ngân hàng & Ví', icon: <RiBankLine />, href: '/profile/bank' },
  { label: 'Địa chỉ nhận hàng', icon: <FiMapPin />, href: '/profile/address' },
  { label: 'Sản phẩm yêu thích', icon: <FiHeart />, href: '/profile/wishlist' },
  { label: 'Kho Voucher', icon: <RiCoupon3Line />, href: '/profile/vouchers', badgeText: '5 Mới' },
  { label: 'Đổi mật khẩu', icon: <FiKey />, href: '/profile/password' },
];

export default function ProfileSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  useEffect(() => {
    if (searchParams.get('needSeller') === '1') {
      addToast('Bấm "Trở thành Người bán" để kích hoạt kênh seller (hoặc đăng nhập lại).');
    }
  }, [searchParams, addToast]);

  const handleRegisterSeller = () => { window.location.href = '/profile/seller-register'; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="glass-card profile-sidebar" style={{ padding: '40px 24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, border: '1px solid rgba(255,255,255,0.03)', background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(0,0,0,0.8) 100%)' }}>
        
        {/* Centered User Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', width: '100%', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)', zIndex: 0 }} />
          
          <div style={{ 
            width: '90px', height: '90px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '32px', color: 'white', fontWeight: 800, margin: '0 auto 16px',
            boxShadow: '0 0 30px rgba(249, 115, 22, 0.4)', position: 'relative', overflow: 'hidden',
            zIndex: 1
          }}>
            {user?.avatar && !avatarError
              ? <SafeImage src={user.avatar} alt={user.name || 'Avatar'} fill sizes="90px" onImageError={() => setAvatarError(true)} style={{ borderRadius: '50%', objectFit: 'cover' }} />
              : (user?.name?.charAt(0) || 'TH')}
          </div>
          
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#fff', position: 'relative', zIndex: 1 }}>{user?.name || 'Trường Developer Hoàng'}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px', position: 'relative', zIndex: 1 }}>{user?.email || 'devhoangtruong@gmail.com'}</p>
          
          {/* Verification Status */}
          {user && !user.isEmailVerified && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginBottom: '16px' }}>
              <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>Chưa xác thực Email</span>
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    btn.innerText = 'Đang gửi...';
                    try {
                      const res = await fetch('/api/auth/send-verification', { method: 'POST' });
                      const data = await res.json();
                      if (res.ok) addToast('Đã gửi email xác thực, vui lòng kiểm tra hộp thư.');
                      else addToast(data.error || 'Lỗi gửi email.');
                    } catch (e) {
                      addToast('Lỗi kết nối.');
                    } finally {
                      btn.innerText = 'Gửi lại';
                      setTimeout(() => btn.disabled = false, 60000);
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: '4px' }}
                >
                  Xác thực ngay
                </button>
              </div>
            </div>
          )}
          
          {/* Seller Status */}
          {user?.isSeller ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <Link href="/seller" className="btn-primary" style={{ display: 'block', padding: '10px', fontSize: '13px', textDecoration: 'none', textAlign: 'center', borderRadius: 12 }}>
                🏪 Kênh Người Bán
              </Link>
            </div>
          ) : (
            <button type="button" onClick={handleRegisterSeller} className="btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
              🚀 Trở thành Người bán
            </button>
          )}
        </div>

        {/* Menu List */}
        <nav style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item, idx) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={idx} 
                href={item.href}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 16px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  background: 'transparent',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {isActive && <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3, background: 'var(--accent)', borderRadius: '0 4px 4px 0' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '20px', color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.3)' }}>{item.icon}</span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: isActive ? 700 : 500, 
                    color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.7)'
                  }}>
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{item.badge}</span>
                )}
                {item.badgeText && (
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 600, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 10 }}>{item.badgeText}</span>
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* Hotline */}
        <div style={{ width: '100%', marginTop: 'auto', paddingTop: 32 }}>
          <div style={{ height: 1, width: '100%', background: 'rgba(255,255,255,0.05)', marginBottom: 24 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px' }}>
            <FiHeadphones size={24} color="rgba(255,255,255,0.3)" />
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>HOTLINE VIP 24/7</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>0968 544 769</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
