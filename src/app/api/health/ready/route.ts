import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { outboxConfig, OUTBOX_EVENT } from '@/lib/services/outbox/outbox.service';

export const dynamic = 'force-dynamic';

const DB_PROBE_TIMEOUT_MS = 3_000;

export async function GET() {
  // Phase 3.4: the previous `setTimeout` was never cleared, leaving a 3s timer
  // pending on every probe (negligible on serverless, a slow leak on a
  // long-lived Render instance).
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('database-probe-timeout')), DB_PROBE_TIMEOUT_MS);
      }),
    ]);
    const now = new Date();
    const heartbeat = await prisma.workerHeartbeat.findFirst({
      where: { status: 'ready', expiresAt: { gt: now } },
      orderBy: { lastPollAt: 'desc' },
    });
    const requiredVersion = process.env.OUTBOX_REQUIRED_WORKER_VERSION;
    const requiredIdentity = process.env.OUTBOX_REQUIRED_WORKER_ID_PREFIX;
    const identityValid = !requiredIdentity || heartbeat?.workerId.startsWith(requiredIdentity);
    const versionValid = !requiredVersion || heartbeat?.version === requiredVersion;
    const criticalDeadLetters = await prisma.outboxEvent.count({
      where: { status: 'DEAD_LETTER', eventType: OUTBOX_EVENT.REFUND_REQUIRED },
    });
    const deadLetterHealthy = outboxConfig.deadLetterCriticalThreshold === 0
      || criticalDeadLetters < outboxConfig.deadLetterCriticalThreshold;
    if (!heartbeat || !identityValid || !versionValid || !deadLetterHealthy) {
      return NextResponse.json({
        status: 'not_ready', database: 'connected',
        worker: heartbeat ? {
          workerId: heartbeat.workerId, status: heartbeat.status, version: heartbeat.version,
          lastPollAt: heartbeat.lastPollAt, expiresAt: heartbeat.expiresAt,
        } : null,
        checks: { heartbeat: Boolean(heartbeat), identityValid, versionValid, deadLetterHealthy, criticalDeadLetters },
        timestamp: now.toISOString(),
      }, { status: 503 });
    }
    return NextResponse.json({
      status: 'ready', database: 'connected',
      worker: { workerId: heartbeat.workerId, version: heartbeat.version, lastPollAt: heartbeat.lastPollAt },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    // Unauthenticated endpoint: log the real cause, never return it.
    logger.error('health.readiness_failed', error);
    return NextResponse.json({
      status: 'error', database: 'disconnected',
    }, { status: 503 });
  } finally {
    if (timer) clearTimeout(timer);
  }
}