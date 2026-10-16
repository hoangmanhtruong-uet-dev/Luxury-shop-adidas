/**
 * Shared route-level loading fallback.
 *
 * Used by the per-segment `loading.tsx` files (shop/auth/admin/seller/shipper)
 * instead of a single root `app/loading.tsx`.
 *
 * Why: a root `loading.tsx` wraps the *entire* app in one Suspense boundary.
 * Combined with client pages that call `useSearchParams()` (which Opt-in to
 * client-side rendering up to the closest Suspense boundary), that single root
 * boundary could never resolve during a full document load in dev — every route
 * was stuck on this spinner. Segment-level boundaries keep the loading UX while
 * letting each segment hydrate normally.
 */
export default function RouteLoading() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Đang tải...</p>
    </div>
  );
}
