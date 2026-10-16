import os from 'node:os';
import { randomUUID } from 'node:crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { OutboxConsumerRegistry } from '@/lib/services/outbox/outbox-consumers';
import { OutboxDispatcher } from '@/lib/services/outbox/outbox-dispatcher';
import { OutboxWorker } from '@/lib/services/outbox/outbox-worker';

/**
 * Phase 4.3 (Warning W15).
 *
 * The previous shutdown loop polled `while (!shutdown) await sleep(1000)` and
 * `main()` only set `process.exitCode` — it never called `process.exit()`. With
 * `OUTBOX_SHUTDOWN_TIMEOUT_MS` at 30 000 that exceeded Render's 10s SIGTERM
 * grace period, so on every deploy the worker was SIGKILLed before `stop()`
 * finished: events stayed in PROCESSING (recovered only after
 * OUTBOX_LEASE_SECONDS) and the final `heartbeat('stopped')` was never written.
 *
 * Now: a promise gate replaces the 1s poll, the shutdown budget is clamped below
 * the platform grace period, and the process exits explicitly.
 */

/** Must stay under Render's 10s SIGTERM grace period. */
const SHUTDOWN_TIMEOUT_MS = 8_000;

const command = process.argv[2] ?? 'worker';
const workerId = `${os.hostname()}:${process.pid}:${randomUUID()}`;
const registry = new OutboxConsumerRegistry(prisma);
const dispatcher = new OutboxDispatcher(prisma, registry, { workerId });

async function main(): Promise<void> {
  if (command === 'once') {
    const result = await dispatcher.dispatchOnce();
    console.log(JSON.stringify(result));
    return;
  }
  if (command !== 'worker') throw new Error(`Unknown outbox command: ${command}`);

  const worker = new OutboxWorker(dispatcher, prisma, { workerId, shutdownTimeoutMs: 8_000 });

  let resolveShutdown!: () => void;
  const shutdownGate = new Promise<void>((resolve) => {
    resolveShutdown = resolve;
  });
  let stopping = false;

  const stop = (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info('outbox.shutdown_started', { workerId, signal });
    // `worker.stop()` can reject; never let that become an unhandled rejection.
    void worker
      .stop()
      .catch((error: unknown) => {
        logger.error('outbox.shutdown_failed', error, { workerId, signal });
      })
      .finally(() => resolveShutdown());
  };

  process.once('SIGTERM', () => stop('SIGTERM'));
  process.once('SIGINT', () => stop('SIGINT'));

  await worker.start();
  logger.info('outbox.worker_ready', { workerId, shutdownTimeoutMs: SHUTDOWN_TIMEOUT_MS });

  await shutdownGate;
  logger.info('outbox.shutdown_complete', { workerId });
}

main()
  .catch((error: unknown) => {
    logger.error('outbox.cli_failed', error, { workerId, command });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    // Explicit exit: a pending timer or socket would otherwise keep the event
    // loop alive and the platform would SIGKILL us anyway.
    process.exit(process.exitCode ?? 0);
  });