import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit/rate-limit';
import { getRateLimitIdentity } from '@/lib/network/client-ip';

export const runtime = 'nodejs';

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ').max(191),
});

/**
 * POST /api/newsletter/subscribe — Phase 3.
 * Real email capture: validates, rate-limits (3/hour, same budget as
 * forgot-password), upserts by email. Resubscribing returns the previously
 * issued code. The welcome code is the first currently-active sitewide voucher
 * with remaining uses; when none exists the subscription still succeeds with
 * `voucherCode: null` instead of inventing a code.
 */
export async function POST(req: Request) {
  const limiter = await rateLimit(getRateLimitIdentity(req, 'newsletter'), {
    windowMs: 60 * 60 * 1000,
    max: 3,
  });
  if (!limiter.success) return getRateLimitResponse(limiter);

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { email } = parsed.data;

  const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ success: true, voucherCode: existing.voucherCode, returning: true });
  }

  const now = new Date();
  const welcome = await prisma.voucher.findFirst({
    where: { startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { endDate: 'asc' },
  });
  const voucherCode = welcome && welcome.usedCount < welcome.usageLimit ? welcome.code : null;

  const created = await prisma.newsletterSubscription.create({
    data: { email, voucherCode },
  });
  return NextResponse.json({ success: true, voucherCode: created.voucherCode, returning: false }, { status: 201 });
}
