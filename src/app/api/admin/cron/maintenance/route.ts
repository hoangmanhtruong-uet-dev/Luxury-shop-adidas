import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { SessionService } from '@/lib/services/auth/session.service';
import { rejectUnauthenticatedCron } from '@/lib/security/cron-guard';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * GET /api/admin/cron/maintenance — OP10 (F6).
 *
 * Hourly janitor for unbounded growth tables. Idempotency rows carry full
 * serialized orders (`responseBody` Text) with 72h/168h/720h retentions and
 * no delete path; rate-limit buckets and sessions likewise accumulate. Without
 * this job the tables grow until the Supabase disk quota halts the instance.
 * Vercel schedule: hourly.
 */
export async function GET(request: Request) {
  const rejected = rejectUnauthenticatedCron(request, '/api/admin/cron/maintenance');
  if (rejected) return rejected;

  try {
    const now = new Date();
    const [idempotencyCleaned, rateBuckets, sessions] = await Promise.all([
      IdempotencyService.cleanup(500),
      prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lte: now } } }),
      SessionService.cleanupExpiredSessions(now),
    ]);
    return NextResponse.json({
      success: true,
      idempotencyCleaned,
      rateBuckets: rateBuckets.count,
      sessions: sessions.count,
    });
  } catch (error) {
    logger.error('cron.maintenance.error', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}