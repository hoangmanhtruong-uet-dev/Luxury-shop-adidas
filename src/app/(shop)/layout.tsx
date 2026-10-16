// src/app/(shop)/layout.tsx
'use client';
import { Suspense, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    // Đọc lại user từ cookie khi ứng dụng khởi chạy
    fetchMe();
  }, [fetchMe]);

  return (
    <>
      {/* Navbar calls `useSearchParams()`, which opts everything above it in the
          tree out of prerendering up to the closest Suspense boundary. Without
          this boundary the production build fails with
          "useSearchParams() should be wrapped in a suspense boundary". */}
      <Suspense fallback={<div style={{ height: '64px' }} />}>
        <Navbar />
      </Suspense>
      <main>{children}</main>
      <Footer />
    </>
  );
}
