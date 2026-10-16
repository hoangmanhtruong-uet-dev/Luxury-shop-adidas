import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * GET /api/admin/cron/flash-sale
 *
 * Phase 2.5 (Critical #11): same defect as /api/admin/cron/outbox — the guard
 * was skipped outside production, and an undeclared CRON_SECRET made the
 * expected header the literal "Bearer undefined" so every run 401'd.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';

  if (!env.CRON_SECRET) {
    logger.error('security.cron_secret_missing', { path: '/api/admin/cron/flash-sale' });
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const provided = Buffer.from(authHeader);
  const wanted = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const authorized =
    provided.length === wanted.length &&
    provided.length > 0 &&
    timingSafeEqual(provided, wanted);

  if (!authorized) {
    logger.warn('security.cron_unauthorized', { path: '/api/admin/cron/flash-sale' });
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();

    // Deactivate expired flash sales
    const result = await prisma.flashSaleEvent.updateMany({
      where: {
        isActive: true,
        endTime: { lte: now },
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true, deactivated: result.count });
  } catch (error) {
    logger.error('cron.flash_sale.error', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}