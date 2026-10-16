'use client';

import { useState } from 'react';
import Reveal from '@/components/home/Reveal';
import { useToastStore } from '@/components/ui/Toast';

/**
 * Phase 3 — real subscribe via `POST /api/newsletter/subscribe` (validated,
 * rate-limited 3/hour, upsert by email). Returns the actual welcome voucher
 * code when one exists; honest "no code right now" state otherwise.
 */
export default function NewsletterSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-rose-600 to-purple-700 p-8 md:p-14 text-white shadow-2xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              🎁 ƯU ĐÃI THÀNH VIÊN MỚI
            </span>
            <h2 className="text-3xl md:text-4xl font-black leading-tight">
              Đăng ký nhận mã giảm giá <span className="text-amber-300">ngay hôm nay</span>
            </h2>
            <p className="text-white/90 text-sm leading-relaxed">
              Trở thành VIP Member để nhận thông báo sớm nhất về các đợt Flash Sale giờ vàng và chương trình quà tặng độc quyền.
            </p>

            <NewsletterForm />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

type FormState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'done'; voucherCode: string | null; returning: boolean }
  | { status: 'error'; message: string };

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>({ status: 'idle' });
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || state.status === 'sending') return;
    setState({ status: 'sending' });
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ status: 'error', message: data.error || 'Đăng ký thất bại, thử lại sau.' });
        return;
      }
      setState({ status: 'done', voucherCode: data.voucherCode ?? null, returning: !!data.returning });
      addToast(
        data.voucherCode ? `Đã nhận mã ${data.voucherCode}!` : 'Đăng ký thành công!',
        'success',
      );
    } catch {
      setState({ status: 'error', message: 'Mất kết nối, thử lại sau.' });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state.status === 'done') {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl text-white text-sm font-bold space-y-2">
        <p className="flex items-center gap-2">
          <span>🎉</span>
          {state.returning ? 'Email này đã đăng ký trước đó.' : 'Cảm ơn bạn đã đăng ký!'}
        </p>
        {state.voucherCode ? (
          <p className="flex flex-wrap items-center gap-3">
            <span>Mã chào mừng của bạn:</span>
            <code className="px-3 py-1 rounded-lg bg-slate-950/60 border border-amber-400/50 text-amber-300 tracking-widest">
              {state.voucherCode}
            </code>
            <button
              type="button"
              onClick={() => copyCode(state.voucherCode as string)}
              className="px-4 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition"
            >
              {copied ? '✓ Đã chép' : 'Sao chép'}
            </button>
          </p>
        ) : (
          <p className="font-normal text-white/80">Hiện chưa có voucher chào mừng — bạn sẽ nhận tin khi có đợt mới.</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          placeholder="Nhập địa chỉ email của bạn..."
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          disabled={state.status === 'sending'}
          className="px-5 py-3.5 rounded-full bg-slate-950/60 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400 flex-1 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state.status === 'sending'}
          className="px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-full text-sm transition shadow-lg shrink-0 disabled:opacity-60"
        >
          {state.status === 'sending' ? 'Đang gửi...' : 'Nhận mã ngay'}
        </button>
      </form>
      {state.status === 'error' && (
        <p className="text-xs font-bold text-amber-200 mt-2">{state.message}</p>
      )}
    </div>
  );
}
