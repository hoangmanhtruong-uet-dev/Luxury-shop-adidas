import type { Metadata } from 'next';
import SellerLayoutClient from './SellerLayoutClient';

/** Phase 4.2: seller workspace must not be indexed. */
export const metadata: Metadata = {
  title: 'Kênh người bán',
  robots: { index: false, follow: false, nocache: true },
};

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <SellerLayoutClient>{children}</SellerLayoutClient>;
}