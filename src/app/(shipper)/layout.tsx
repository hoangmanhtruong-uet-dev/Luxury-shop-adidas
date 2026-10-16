import type { Metadata } from 'next';
import ShipperLayoutClient from './ShipperLayoutClient';

/** Phase 4.2: shipper console must not be indexed. */
export const metadata: Metadata = {
  title: 'Cổng giao hàng',
  robots: { index: false, follow: false, nocache: true },
};

export default function ShipperLayout({ children }: { children: React.ReactNode }) {
  return <ShipperLayoutClient>{children}</ShipperLayoutClient>;
}