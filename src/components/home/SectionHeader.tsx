import Link from 'next/link';
import type { ReactNode } from 'react';
import { FiArrowRight } from 'react-icons/fi';

interface SectionHeaderProps {
  /** Small uppercase eyebrow line, e.g. "FLASH SALE GIỜ VÀNG". */
  eyebrow?: ReactNode;
  eyebrowClassName?: string;
  /** Main H2. Pass icon nodes inline to preserve existing designs. */
  title: ReactNode;
  sub?: ReactNode;
  linkHref?: string;
  linkText?: string;
}

/**
 * Phase 1 — Home motion foundation.
 * One standard section header: eyebrow + H2 + sub + optional "view all" link.
 * Replaces the 6 slightly-different hand-written headers on the old homepage.
 */
export default function SectionHeader({
  eyebrow,
  eyebrowClassName = 'text-orange-400',
  title,
  sub,
  linkHref,
  linkText,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        {eyebrow && (
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${eyebrowClassName}`}>
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-black text-white flex items-center gap-2">{title}</h2>
        {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
      </div>
      {linkHref && linkText && (
        <Link
          href={linkHref}
          className="text-sm font-semibold text-slate-300 hover:text-orange-500 transition flex items-center gap-1 shrink-0"
        >
          {linkText} <FiArrowRight />
        </Link>
      )}
    </div>
  );
}
