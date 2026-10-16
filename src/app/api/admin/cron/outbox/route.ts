import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { OutboxDispatcher } from '@/lib/services/outbox/outbox-dispatcher';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import os from 'os';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

/**
 * GET /api/admin/cron/outbox
 *
 * Phase 2.5 (Critical #11): the previous guard was
 *   `if (env.NODE_ENV === 'production' && authHeader !== \`Bearer ${process.env.CRON_SECRET}\`)`
 * which had two defects:
 *   1. Under any non-production NODE_ENV the endpoint was fully unauthenticated.
 *   2. CRON_SECRET was never declared in the env schema, so an unset value made
 *      the expected header the literal string "Bearer undefined" and every cron
 *      returned 401 — the outbox silently stopped draining with no alert.
 * The secret is now schema-validated and the comparison is constant-time.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${env.CRON_SECRET ?? ''}`;

  const provided = Buffer.from(authHeader);
  const wanted = Buffer.from(env.CRON_SECRET ? expected : '');
  const authorized =
    provided.length === wanted.length &&
    provided.length > 0 &&
    timingSafeEqual(provided, wanted);

  if (!authorized) {
    logger.warn('security.cron_unauthorized', { path: '/api/admin/cron/outbox' });
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Phase 4.3: a unique workerId per invocation. Two overlapping cron runs
    // previously shared `vercel-cron-<hostname>`, which defeats the
    // `lockedBy = workerId` guard in complete()/fail().
    const dispatcher = new OutboxDispatcher(undefined, undefined, {
      workerId: `vercel-cron:${os.hostname()}:${randomUUID()}`,
    });
    const result = await dispatcher.dispatchOnce();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error('cron.outbox.error', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}