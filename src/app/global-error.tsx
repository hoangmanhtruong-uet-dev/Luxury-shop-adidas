'use client';

/**
 * Phase 4.1 (Warning W9): last-resort boundary for a crash in the ROOT layout.
 * Next requires this file to render its own <html>/<body>, and the built-in
 * fallback page has no styling, no analytics and no way back into the app.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B1120',
          color: '#e2e8f0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>Đã xảy ra lỗi</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
            Ứng dụng gặp lỗi nghiêm trọng và đã được khởi động lại. Vui lòng thử tải lại trang.
          </p>
          {error.digest && (
            <p style={{ marginTop: 12, fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
              Mã lỗi: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: '12px 28px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--accent, #f97316)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tải lại
          </button>
        </div>
      </body>
    </html>
  );
}