import type { Metadata } from 'next';
import AdminLayoutClient from './AdminLayoutClient';

/**
 * Phase 4.2: the admin console must never be indexed. Previously this file was
 * `'use client'` and therefore exported no metadata, so it inherited the root
 * layout's `robots: { index: true, follow: true }`.
 */
export const metadata: Metadata = {
  title: 'Quản trị hệ thống',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}