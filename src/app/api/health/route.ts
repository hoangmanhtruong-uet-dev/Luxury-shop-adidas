import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const DB_PROBE_TIMEOUT_MS = 2_000;

/**
 * GET /api/health
 *
 * Phase 3.4 (Warning W10 + W7): this endpoint is unauthenticated, so
 *   - the raw Prisma error (host, port, database name, driver internals) must
 *     never reach the response body — it is logged server-side instead, and
 *   - `process.uptime()` / `rssMB` were removed because they are free
 *     fingerprinting for an anonymous caller, and
 *   - the DB probe is bounded by a timeout. Without one, a MySQL endpoint that
 *     accepts TCP but never answers (failover, blackhole) makes the probe hang
 *     for the platform's full request timeout — precisely the case where the
 *     probe must fail fast.
 */
export async function GET() {
  const startTime = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('database-probe-timeout')), DB_PROBE_TIMEOUT_MS);
      }),
    ]);
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: { status: 'connected', latencyMs: dbLatencyMs },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('health.database_unreachable', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: { status: 'disconnected' },
      },
      { status: 503 },
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}