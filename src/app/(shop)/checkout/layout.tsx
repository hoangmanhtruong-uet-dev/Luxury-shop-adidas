import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thanh toán đơn hàng',
  description: 'Thanh toán an toàn, đa dạng phương thức và giao hàng siêu tốc.',
  // Phase 4.2: private flow — must not be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
