'use client';
import SellerSidebar from '@/components/seller/SellerSidebar';

/** Phase 4.2: split out so `layout.tsx` can export `metadata`. */
export default function SellerLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-container" style={{ paddingTop: '30px', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
        {/* Sidebar Kênh người bán */}
        <SellerSidebar />

        {/* Vùng làm việc chính */}
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}