import type { Metadata } from 'next';
import HomePage from '@/components/home/HomePage';
import { escapeJsonForHtmlScript } from '@/lib/utils/json-script';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://website-banhang-mzzl.onrender.com';

/**
 * Phase 5 — homepage SEO. The page itself stays a thin server shell over the
 * client `HomePage` island, so metadata + structured data live here while all
 * interactivity stays client-side.
 */
export const metadata: Metadata = {
  title: 'Giày đá bóng chính hãng Nike, Adidas, Mizuno, Puma',
  description:
    'Cún-shop — shop giày đá bóng uy tín, chất lượng: săn Flash Sale mỗi ngày, bao check auth, đổi size 30 ngày, thanh toán VietQR PayOS, giao hỏa tốc 2h nội thành.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Cún-shop — Giày đá bóng chính hãng',
    description: 'Uy tín, chất lượng. Bao check auth trọn đời, đổi size 30 ngày, thanh toán VietQR tự động qua PayOS.',
    url: '/',
    siteName: 'Cún-shop',
    locale: 'vi_VN',
    type: 'website',
    images: [{ url: '/images/products/urban-sneakers.webp', width: 1200, height: 630, alt: 'Cún-shop' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cún-shop — Giày đá bóng chính hãng',
    description: 'Uy tín, chất lượng. Bao check auth trọn đời, đổi size 30 ngày, thanh toán VietQR tự động qua PayOS.',
    images: ['/images/products/urban-sneakers.webp'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Cún-shop',
      url: BASE_URL,
      logo: `${BASE_URL}/favicon.ico`,
    },
    {
      '@type': 'WebSite',
      name: 'Cún-shop',
      url: BASE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${BASE_URL}/products?search={query}`,
        'query-input': 'required name=query',
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonForHtmlScript(JSON.stringify(jsonLd)) }}
      />
      <HomePage />
    </>
  );
}
