'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Phase 4.1 (Warning W9): route-level error boundary. Without it a render crash
 * fell back to Next's built-in page, whose opaque digest could not be correlated
 * with the `requestId` that `src/lib/api-handler.ts` logs for the same failure.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the digest so support can find the matching server log entry.
    console.error('[ui_error]', error.digest ?? 'no-digest', error.message);
  }, [error]);

  return (
    <main className="min-h-[60vh] bg-[#0B1120] text-slate-200 flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <p className="text-5xl font-black text-[var(--accent)] leading-none">500</p>
        <h1 className="mt-4 text-2xl font-bold">Đã xảy ra lỗi</h1>
        <p className="mt-3 text-slate-400 text-sm leading-relaxed">
          Hệ thống gặp sự cố tạm thời. Vui lòng thử lại, nếu lỗi tiếp tục xảy ra hãy liên hệ
          bộ phận hỗ trợ.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-slate-500">Mã lỗi: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary px-6 py-3 rounded-xl font-semibold text-sm"
          >
            Thử lại
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-semibold text-sm border border-white/15 hover:bg-white/5"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}