import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tất cả sản phẩm',
  description: 'Khám phá giày đá bóng chính hãng Nike, Adidas, Mizuno, Puma và phụ kiện bóng đá giá tốt nhất tại Cún-shop.',
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
