'use client';
import { Suspense } from 'react';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiHome, FiChevronRight } from 'react-icons/fi';

const routeNames: Record<string, string> = {
  '/profile': 'Hồ sơ cá nhân',
  '/profile/orders': 'Đơn hàng của tôi',
  '/profile/bank': 'Ngân hàng & Ví',
  '/profile/address': 'Địa chỉ nhận hàng',
  '/profile/wishlist': 'Sản phẩm yêu thích',
  '/profile/vouchers': 'Kho Voucher',
  '/profile/password': 'Đổi mật khẩu',
  '/profile/notifications': 'Thông Báo',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentPage = routeNames[pathname] || 'Tài khoản';

  return (
    <div className="page-container" style={{ paddingTop: '20px', paddingBottom: '80px' }}>
      
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, fontWeight: 600 }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}><FiHome size={14} /> Trang chủ</Link>
        <FiChevronRight size={14} />
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Tài khoản</span>
        <FiChevronRight size={14} />
        <span style={{ color: 'var(--accent)' }}>{currentPage}</span>
      </div>

      <div className="profile-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px', alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div style={{ position: 'sticky', top: '100px', height: 'calc(100vh - 120px)' }}>
          {/* ProfileSidebar reads `useSearchParams()`; the boundary keeps the
              production prerender from failing. */}
          <Suspense fallback={null}>
            <ProfileSidebar />
          </Suspense>
        </div>

        {/* Nội dung trang bên phải */}
        <main style={{ minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
