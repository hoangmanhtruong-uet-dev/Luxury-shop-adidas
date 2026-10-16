import { NextResponse } from 'next/server';
import { InventoryExpiryWorker } from '@/lib/services/fulfillment/inventory.service';
import { rejectUnauthenticatedCron } from '@/lib/security/cron-guard';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * GET /api/admin/cron/inventory — OP10 (F3).
 *
 * Releases expired inventory reservations. Without this running every minute,
 * abandoned checkouts leave ACTIVE reservations forever: after 3 of them a user
 * can never order again (`PENDING_ORDER_LIMIT`), and `reservedQuantity` only
 * grows platform-wide (phantom out-of-stock). Vercel schedule: `* * * * *`.
 */
export async function GET(request: Request) {
  const rejected = rejectUnauthenticatedCron(request, '/api/admin/cron/inventory');
  if (rejected) return rejected;

  try {
    const released = await InventoryExpiryWorker.runBatch();
    return NextResponse.json({ success: true, released });
  } catch (error) {
    logger.error('cron.inventory.error', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}