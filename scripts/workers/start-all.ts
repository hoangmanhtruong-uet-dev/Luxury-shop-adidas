/**
 * DEPRECATED — Vercel topology (OP1).
 *
 * This combined supervisor (Next.js web child + infinite outbox worker loop) only
 * makes sense on a long-lived VM (Render / VPS). On Vercel `npm start` is never
 * invoked — Vercel serves the serverless entrypoint and background work runs via
 * `vercel.json` crons hitting `/api/admin/cron/*`.
 *
 * Kept for local full-stack dev (`npm run start:legacy-all`) and as a reference
 * if the project ever moves back to a VM. Do NOT point any production
 * Procfile/start command at this file while deployed on Vercel.
 */
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { OutboxConsumerRegistry } from '@/lib/services/outbox/outbox-consumers';
import { OutboxDispatcher } from '@/lib/services/outbox/outbox-dispatcher';
import { OutboxWorker } from '@/lib/services/outbox/outbox-worker';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
const workerId = `${os.hostname()}:${process.pid}:${randomUUID()}`;
const registry = new OutboxConsumerRegistry(prisma);
const dispatcher = new OutboxDispatcher(prisma, registry, { workerId });
const worker = new OutboxWorker(dispatcher, prisma, { workerId });

function startWeb(): ChildProcess {
  return spawn(process.execPath, [nextBin, 'start'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
}

async function main(): Promise<void> {
  const web = startWeb();
  let stopping = false;

  await new Promise<void>((resolve, reject) => {
    const shutdown = async (reason: string, exitCode: number) => {
      if (stopping) return;
      stopping = true;
      logger.info('combined_process.shutdown_started', { reason, workerId });
      try {
        await worker.stop();
      } catch (error: unknown) {
        logger.error('combined_process.worker_stop_failed', error, { workerId });
        exitCode = 1;
      }
      if (web.exitCode === null && web.signalCode === null) web.kill('SIGTERM');
      process.exitCode = exitCode;
      resolve();
    };

    web.once('error', reject);
    web.once('exit', (code, signal) => {
      void shutdown(`web-exit:${signal ?? code ?? 'unknown'}`, code ?? (signal ? 1 : 0));
    });
    process.once('SIGTERM', () => { void shutdown('SIGTERM', 0); });
    process.once('SIGINT', () => { void shutdown('SIGINT', 0); });

    worker.start()
      .then(() => logger.info('combined_process.ready', { workerId, webPid: web.pid }))
      .catch((error: unknown) => {
        logger.error('combined_process.worker_start_failed', error, { workerId });
        if (web.exitCode === null) web.kill('SIGTERM');
        reject(error);
      });
  });

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  logger.error('combined_process.failed', error, { workerId });
  await worker.stop().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
