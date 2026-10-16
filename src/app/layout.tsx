import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastContainer from '@/components/ui/Toast'
import Analytics from '@/components/common/Analytics'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://website-banhang-mzzl.onrender.com'),
  title: {
    default: 'Cún-shop - Giày đá bóng chính hãng | Uy tín & Chất lượng',
    template: '%s | Cún-shop',
  },
  description: 'Cún-shop chuyên giày đá bóng chính hãng Nike, Adidas, Mizuno, Puma. Uy tín, chất lượng, bao check auth, đổi size 30 ngày.',
  keywords: ['Cún-shop', 'giày đá bóng', 'giày đá banh chính hãng', 'Nike Mercurial', 'Adidas Predator', 'đổi size 30 ngày', 'PayOS', 'VietQR'],
  openGraph: {
    title: 'Cún-shop - Giày đá bóng chính hãng',
    description: 'Uy tín, chất lượng. Bao check auth trọn đời, đổi size 30 ngày, thanh toán VietQR qua PayOS.',
    url: 'https://website-banhang-mzzl.onrender.com',
    siteName: 'Cún-shop',
    locale: 'vi_VN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {children}
        <ToastContainer />
        <Analytics />
      </body>
    </html>
  )
}