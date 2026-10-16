import Link from 'next/link';

/**
 * Phase 4.1 (Warning W9).
 *
 * Before this file existed, Next.js served its built-in unstyled English 404.
 * The root `(shop)/layout.tsx` does not wrap the `/_not-found` segment, so the
 * old page also had no Navbar and no Footer.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-200 flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <p className="text-7xl font-black text-[var(--accent)] leading-none">404</p>
        <h1 className="mt-4 text-2xl font-bold">Không tìm thấy trang bạn yêu cầu</h1>
        <p className="mt-3 text-slate-400 text-sm leading-relaxed">
          Đường dẫn này không tồn tại hoặc sản phẩm bạn tìm đã được gỡ khỏi cửa hàng.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="btn-primary px-6 py-3 rounded-xl font-semibold text-sm"
          >
            Về trang chủ
          </Link>
          <Link
            href="/products"
            className="px-6 py-3 rounded-xl font-semibold text-sm border border-white/15 hover:bg-white/5"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      </div>
    </main>
  );
}