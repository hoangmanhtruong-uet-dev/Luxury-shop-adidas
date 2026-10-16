'use client';

import Link from 'next/link';
import { FiShield, FiRefreshCw, FiCreditCard, FiCheckCircle } from 'react-icons/fi';
import Reveal from '@/components/home/Reveal';

const ITEMS = [
  {
    icon: FiShield,
    title: 'Chính hãng 100%',
    desc: 'Nike, Adidas, Mizuno, Puma — đền 200% nếu phát hiện fake',
    href: '/chinh-sach',
  },
  {
    icon: FiRefreshCw,
    title: 'Đổi size 30 ngày',
    desc: 'Tư vấn chọn size theo form chân, đổi ngang không mất phí',
    href: '/returns',
  },
  {
    icon: FiCheckCircle,
    title: 'Bao check auth',
    desc: 'Check trọn đời sản phẩm, hóa đơn đầy đủ từng đôi',
    href: '/chinh-sach',
  },
  {
    icon: FiCreditCard,
    title: 'Thanh toán an toàn',
    desc: 'VietQR PayOS, VNPay, ví nội bộ bảo mật',
    href: '/checkout',
  },
];

/**
 * Phase 3 — USP bar (học CellphoneS). Four commitment cards linking to the
 * real policy pages. Static content: commitments are policy, not data.
 */
export default function USPBar() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ITEMS.map(({ icon: Icon, title, desc, href }, i) => (
          <Reveal key={title} delay={Math.min(i, 3) * 80}>
            <Link
              href={href}
              className="flex items-start gap-3 bg-[#131C2E] border border-slate-800 hover:border-orange-500/40 rounded-2xl p-4 transition h-full"
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Icon size={18} className="text-orange-400" />
              </span>
              <span>
                <span className="block text-sm font-bold text-white">{title}</span>
                <span className="block text-[11px] text-slate-400 mt-0.5 leading-snug">{desc}</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
