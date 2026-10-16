/**
 * Phase 1 — Home motion foundation.
 * Skeleton that matches ProductCard's real dimensions (h-48 media + p-4 body),
 * so content doesn't jump when data arrives. Replaces the generic
 * `h-80 bg-slate-800 animate-pulse` blocks.
 */
export default function ProductSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-full bg-[#1E293B] border border-slate-700 rounded-2xl overflow-hidden"
    >
      <div className="h-48 bg-slate-800 skeleton-shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-2/3 bg-slate-800 rounded skeleton-shimmer" />
        <div className="h-4 w-full bg-slate-800 rounded skeleton-shimmer" />
        <div className="h-4 w-5/6 bg-slate-800 rounded skeleton-shimmer" />
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <div className="h-5 w-20 bg-slate-800 rounded skeleton-shimmer" />
          <div className="h-9 w-9 bg-slate-800 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
