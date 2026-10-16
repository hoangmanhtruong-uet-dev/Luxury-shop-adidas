import { formatPrice } from '@/lib/utils';

interface PriceProps {
  /** Canonical money string from the API (e.g. "25990000.0000"). */
  value: string | number;
  original?: string | number | null;
  priceClassName?: string;
  originalClassName?: string;
}

/**
 * Phase 1 — Home motion foundation.
 * One standard price rendering: orange-black current price + struck original.
 * Same output as the hand-written hero price blocks it replaces.
 */
export default function Price({
  value,
  original,
  priceClassName = 'text-2xl font-black text-orange-500',
  originalClassName = 'text-sm text-slate-500 line-through font-normal ml-2',
}: PriceProps) {
  return (
    <p className={priceClassName}>
      {formatPrice(value)}
      {original != null && <span className={originalClassName}>{formatPrice(original)}</span>}
    </p>
  );
}
