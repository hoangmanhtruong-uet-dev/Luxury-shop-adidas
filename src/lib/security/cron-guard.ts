import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

/**
 * Shared gate for all `/api/admin/cron/*` endpoints (OP10).
 *
 * Every Vercel cron sends `Authorization: Bearer <CRON_SECRET>` (configured in
 * the Vercel dashboard per job). The check runs in ALL environments — the old
 * `NODE_ENV === 'production' &&` prefix left preview/staging fully
 * unauthenticated — and uses a constant-time comparison. Returns a 401 response
 * when rejected, or `null` when the request may proceed.
 */
export function rejectUnauthenticatedCron(
  request: Request,
  path: string,
): NextResponse | null {
  const authHeader = request.headers.get('authorization') ?? '';

  if (!env.CRON_SECRET) {
    logger.error('security.cron_secret_missing', { path });
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const provided = Buffer.from(authHeader);
  const wanted = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const authorized =
    provided.length === wanted.length &&
    provided.length > 0 &&
    timingSafeEqual(provided, wanted);

  if (!authorized) {
    logger.warn('security.cron_unauthorized', { path });
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return null;
}