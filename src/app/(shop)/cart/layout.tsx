import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giỏ hàng của bạn',
  description: 'Xem lại các sản phẩm trong giỏ hàng và tiến hành thanh toán tại Cún-shop.',
  // Phase 4.2: private flow — must not be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
