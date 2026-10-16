'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiGift } from 'react-icons/fi';
import { formatPrice } from '@/lib/utils';
import Reveal from '@/components/home/Reveal';
import SectionHeader from '@/components/home/SectionHeader';
import { useToastStore } from '@/components/ui/Toast';

interface Voucher {
  id: string;
  code: string;
  description?: string | null;
  discountType: string;
  discountValue: string | number;
  minOrderValue?: string | number | null;
  endDate: string;
  usageLimit: number;
  usedCount: number;
}

const CARD_COLORS = [
  'from-orange-600 to-amber-600',
  'from-emerald-600 to-teal-600',
  'from-purple-600 to-rose-600',
];

function voucherTitle(v: Voucher): string {
  if (v.discountType === 'percentage') {
    const pct = Math.round(Number(v.discountValue));
    return `Giảm ${pct}% Đơn Hàng`;
  }
  return `Giảm ${formatPrice(v.discountValue)}`;
}

function voucherDesc(v: Voucher): string {
  if (v.description?.trim()) return v.description;
  const min = Number(v.minOrderValue ?? 0);
  return min > 0 ? `Cho đơn hàng từ ${formatPrice(min)}` : 'Áp dụng cho mọi đơn hàng';
}

function expiryLabel(endDate: string): string {
  const msLeft = new Date(endDate).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  const date = new Date(endDate).toLocaleDateString('vi-VN');
  if (daysLeft <= 0) return `Hết hạn hôm nay (${date})`;
  if (daysLeft === 1) return `Hết hạn ngày mai (${date})`;
  return `Còn ${daysLeft} ngày (đến ${date})`;
}

/**
 * Phase 2 — real vouchers from `/api/user/vouchers` (active window, unused).
 * Guests see a login CTA instead of fake codes; the section hides when empty.
 * Codes are sitewide vouchers shown for discovery — copying still uses the
 * clipboard; per-user collect needs a backend table that doesn't exist yet.
 */
export default function VoucherSection() {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'guest' } | { status: 'ready'; vouchers: Voucher[] }>({ status: 'loading' });

  useEffect(() => {
    fetch('/api/user/vouchers')
      .then(async r => {
        if (r.status === 401) {
          setState({ status: 'guest' });
          return;
        }
        const data = await r.json();
        setState({ status: 'ready', vouchers: Array.isArray(data) ? data.slice(0, 3) : [] });
      })
      .catch(() => setState({ status: 'ready', vouchers: [] }));
  }, []);

  if (state.status === 'ready' && state.vouchers.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-8 py-12 border-t border-slate-800">
      <Reveal>
        <SectionHeader
          eyebrow={<span className="inline-flex items-center gap-1.5"><FiGift /> VOUCHER GIỜ VÀNG</span>}
          eyebrowClassName="text-amber-400"
          title={<>Mã giảm giá <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Đặc Quyền Hôm Nay</span></>}
          sub="Lưu ngay mã ưu đãi để áp dụng khi thanh toán đơn hàng"
        />
      </Reveal>

      {state.status === 'loading' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 space-y-3">
              <div className="h-3 w-24 bg-slate-800 rounded skeleton-shimmer" />
              <div className="h-6 w-40 bg-slate-800 rounded skeleton-shimmer" />
              <div className="h-3 w-full bg-slate-800 rounded skeleton-shimmer" />
              <div className="h-8 w-24 bg-slate-800 rounded-full skeleton-shimmer" />
            </div>
          ))}
        </div>
      )}

      {state.status === 'guest' && (
        <Reveal>
          <div className="bg-[#1E293B] border border-dashed border-slate-600 rounded-2xl p-8 text-center">
            <p className="text-slate-300 font-bold">Đăng nhập để xem mã giảm giá dành riêng cho bạn</p>
            <p className="text-xs text-slate-500 mt-1 mb-5">Voucher giờ vàng, freeship và ưu đãi thành viên mới.</p>
            <Link href="/login" className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-full text-sm transition shadow-lg">
              Đăng nhập ngay
            </Link>
          </div>
        </Reveal>
      )}

      {state.status === 'ready' && state.vouchers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {state.vouchers.map((v, i) => (
            <Reveal key={v.id} delay={Math.min(i, 2) * 80}>
              <VoucherCard
                code={v.code}
                title={voucherTitle(v)}
                desc={voucherDesc(v)}
                exp={expiryLabel(v.endDate)}
                color={CARD_COLORS[i % CARD_COLORS.length]}
              />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

function VoucherCard({ code, title, desc, exp, color }: { code: string; title: string; desc: string; exp: string; color: string }) {
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    addToast(`Đã chép mã ${code}`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1E293B] border border-slate-700 hover:border-slate-500 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-lg relative overflow-hidden group h-full">
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${color}`}></div>
      <div className="space-y-1">
        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{code}</span>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-700/60">
        <span className="text-[10px] text-slate-500 font-semibold">{exp}</span>
        <button
          onClick={handleCopy}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/40'
          }`}
        >
          {copied ? '✓ Đã chép' : 'Sao chép'}
        </button>
      </div>
    </div>
  );
}
