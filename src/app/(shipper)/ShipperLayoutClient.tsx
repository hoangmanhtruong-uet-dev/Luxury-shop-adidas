'use client';
import React from 'react';
import Link from 'next/link';

/** Phase 4.2: split out so `layout.tsx` can export `metadata`. */
export default function ShipperLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Navbar đơn giản cho Shipper */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(5,5,8,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>🚚</span>
          <span style={{ fontWeight: 700, fontSize: '18px' }}>
            <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Cổng Shipper
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/shipper/orders" style={{
            fontSize: '14px', color: 'var(--text-secondary)',
            padding: '8px 16px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}>
            📦 Đơn Hàng
          </Link>
          <Link href="/" style={{
            fontSize: '14px', color: 'var(--text-secondary)',
            padding: '8px 16px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}>
            🏠 Về Trang Chủ
          </Link>
        </div>
      </nav>

      {/* Nội dung trang */}
      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}