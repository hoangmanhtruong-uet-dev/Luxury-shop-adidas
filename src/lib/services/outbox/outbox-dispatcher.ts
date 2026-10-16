import { createHash } from 'node:crypto';
import { Prisma, type OutboxEvent, type PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { OutboxConsumerRegistry } from '@/lib/services/outbox/outbox-consumers';
import {
  isRetryableDatabaseError,
  NonRetryableOutboxError,
  outboxConfig,
  OutboxLeaseLostError,
  RetryableOutboxError,
} from '@/lib/services/outbox/outbox.service';

export interface OutboxEventHandler {
  handle(event: OutboxEvent): Promise<void>;
}

export interface DispatcherOptions {
  workerId: string;
  batchSize?: number;
  leaseSeconds?: number;
  concurrency?: number;
  now?: () => Date;
}

export interface DispatchResult {
  claimed: number;
  completed: number;
  retried: number;
  deadLettered: number;
  staleRecovered: number;
}

function bounded(value: number | undefined, fallback: number, max: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Math.min(Number(value), max) : fallback;
}

export function retryDelayMs(eventId: string, attemptCount: number): number {
  const exponential = Math.min(outboxConfig.backoffMaxMs, outboxConfig.backoffBaseMs * (2 ** Math.max(0, attemptCount - 1)));
  const digest = createHash('sha256').update(`${eventId}:${attemptCount}`).digest();
  const jitter = 0.8 + (digest.readUInt16BE(0) / 65535) * 0.4;
  return Math.max(1, Math.floor(exponential * jitter));
}

function errorDetails(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof NonRetryableOutboxError) return { code: error.code, message: error.message, retryable: false };
  if (error instanceof RetryableOutboxError) return { code: error.code, message: error.message, retryable: true };
  if (isRetryableDatabaseError(error)) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'DATABASE_TRANSIENT';
    return { code, message: error instanceof Error ? error.message : 'Transient database failure', retryable: true };
  }
  return { code: 'CONSUMER_FAILURE', message: error instanceof Error ? error.message : 'Unknown consumer failure', retryable: true };
}

export class OutboxDispatcher {
  private readonly batchSize: number;
  private readonly leaseSeconds: number;
  private readonly concurrency: number;
  private readonly now: () => Date;

  constructor(
    private readonly client: PrismaClient = prisma,
    private readonly registry: OutboxEventHandler = new OutboxConsumerRegistry(client),
    private readonly options: DispatcherOptions,
  ) {
    if (!options.workerId.trim()) throw new Error('Outbox workerId is required');
    this.batchSize = bounded(options.batchSize, outboxConfig.batchSize, 1000);
    this.leaseSeconds = bounded(options.leaseSeconds, outboxConfig.leaseSeconds, 3600);
    this.concurrency = bounded(options.concurrency, outboxConfig.concurrency, 100);
    this.now = options.now ?? (() => new Date());
  }

  async claimBatch(): Promise<{ events: OutboxEvent[]; staleRecovered: number }> {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        return await this.claimBatchOnce();
      } catch (error: unknown) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!retryable || attempt === 4) throw error;
        logger.warn('outbox.claim_transaction_retry', { workerId: this.options.workerId, attempt });
      }
    }
    throw new Error('Outbox claim retry limit exceeded');
  }

  private async claimBatchOnce(): Promise<{ events: OutboxEvent[]; staleRecovered: number }> {
    const now = this.now();
    const lockedUntil = new Date(now.getTime() + this.leaseSeconds * 1000);
    return this.client.$transaction(async (tx) => {
      const recovered = await tx.outboxEvent.updateMany({
        where: { status: 'PROCESSING', lockedUntil: { lt: now } },
        data: { status: 'RETRY', nextAttemptAt: now, lockedAt: null, lockedUntil: null, lockedBy: null, lastErrorCode: 'STALE_LEASE' },
      });
      // NOTE (postgres): MySQL's FORCE INDEX hint has no equivalent here and is
      // intentionally omitted — the planner uses outbox_status_next_idx via the
      // WHERE + ORDER BY shape. If claim latency regresses, check
      // pg_stat_user_tables / EXPLAIN before reaching for planner hacks.
      const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM outbox_event
        WHERE status IN ('PENDING', 'RETRY')
          AND nextAttemptAt <= ${now}
          AND (lockedUntil IS NULL OR lockedUntil < ${now})
        ORDER BY status, nextAttemptAt, id
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED`);
      if (rows.length === 0) return { events: [], staleRecovered: recovered.count };
      const ids = rows.map((row) => row.id);
      const claimed = await tx.outboxEvent.updateMany({
        where: { id: { in: ids }, status: { in: ['PENDING', 'RETRY'] } },
        data: {
          status: 'PROCESSING', lockedAt: now, lockedUntil, lockedBy: this.options.workerId,
          attemptCount: { increment: 1 }, lastError: null, lastErrorCode: null,
        },
      });
      if (claimed.count !== ids.length) throw new Error('Outbox claim invariant violated');
      const events = await tx.outboxEvent.findMany({ where: { id: { in: ids } }, orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }] });
      return { events, staleRecovered: recovered.count };
    }, { maxWait: 10_000, timeout: 10_000 });
  }

  private async renewLease(eventId: string): Promise<boolean> {
    const now = this.now();
    const result = await this.client.outboxEvent.updateMany({
      where: { id: eventId, status: 'PROCESSING', lockedBy: this.options.workerId, lockedUntil: { gte: now } },
      data: { lockedUntil: new Date(now.getTime() + this.leaseSeconds * 1000) },
    });
    return result.count === 1;
  }

  private startLeaseRenewal(eventId: string): { stop: () => void; lost: () => boolean } {
    let stopped = false;
    let leaseLost = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interval = Math.max(250, Math.floor(this.leaseSeconds * 1000 / 3));
    const schedule = () => {
      timer = setTimeout(async () => {
        if (stopped) return;
        try {
          if (!(await this.renewLease(eventId))) leaseLost = true;
        } catch (error: unknown) {
          leaseLost = true;
          logger.error('outbox.lease_renewal_failed', error, { eventId, workerId: this.options.workerId });
        }
        if (!stopped && !leaseLost) schedule();
      }, interval);
    };
    schedule();
    return {
      stop: () => { stopped = true; if (timer) clearTimeout(timer); },
      lost: () => leaseLost,
    };
  }

  private async complete(event: OutboxEvent): Promise<void> {
    const result = await this.client.outboxEvent.updateMany({
      where: { id: event.id, status: 'PROCESSING', lockedBy: this.options.workerId, lockedUntil: { gte: this.now() } },
      data: { status: 'COMPLETED', processedAt: this.now(), lockedAt: null, lockedUntil: null, lockedBy: null, lastError: null, lastErrorCode: null },
    });
    if (result.count !== 1) throw new OutboxLeaseLostError(event.id);
  }

  private async fail(event: OutboxEvent, error: unknown): Promise<'retried' | 'dead-lettered'> {
    const details = errorDetails(error);
    const deadLetter = !details.retryable || event.attemptCount >= event.maxAttempts;
    const now = this.now();
    const result = await this.client.outboxEvent.updateMany({
      where: { id: event.id, status: 'PROCESSING', lockedBy: this.options.workerId, lockedUntil: { gte: now } },
      data: deadLetter ? {
        status: 'DEAD_LETTER', deadLetteredAt: now, lastError: details.message.slice(0, 16_000), lastErrorCode: details.code,
        lockedAt: null, lockedUntil: null, lockedBy: null,
      } : {
        status: 'RETRY', nextAttemptAt: new Date(now.getTime() + retryDelayMs(event.id, event.attemptCount)),
        lastError: details.message.slice(0, 16_000), lastErrorCode: details.code,
        lockedAt: null, lockedUntil: null, lockedBy: null,
      },
    });
    if (result.count !== 1) throw new OutboxLeaseLostError(event.id);
    logger.error(deadLetter ? 'outbox.dead_lettered' : 'outbox.retry_scheduled', error, {
      eventId: event.id, eventType: event.eventType, workerId: this.options.workerId,
      attemptCount: event.attemptCount, errorCode: details.code,
    });
    return deadLetter ? 'dead-lettered' : 'retried';
  }

  async processClaimed(event: OutboxEvent): Promise<'completed' | 'retried' | 'dead-lettered'> {
    const renewal = this.startLeaseRenewal(event.id);
    try {
      await this.registry.handle(event);
      renewal.stop();
      if (renewal.lost()) throw new OutboxLeaseLostError(event.id);
      await this.complete(event);
      return 'completed';
    } catch (error: unknown) {
      renewal.stop();
      if (error instanceof OutboxLeaseLostError) throw error;
      return this.fail(event, error);
    }
  }

  async dispatchOnce(): Promise<DispatchResult> {
    const claim = await this.claimBatch();
    const result: DispatchResult = { claimed: claim.events.length, completed: 0, retried: 0, deadLettered: 0, staleRecovered: claim.staleRecovered };
    let cursor = 0;
    const work = async () => {
      while (cursor < claim.events.length) {
        const event = claim.events[cursor++];
        const outcome = await this.processClaimed(event);
        if (outcome === 'completed') result.completed += 1;
        else if (outcome === 'retried') result.retried += 1;
        else result.deadLettered += 1;
      }
    };
    // Phase 4.3: this was `Promise.all`, which rejects on the FIRST failure and
    // abandons the other `concurrency - 1` workers mid-flight. Their
    // `renewal.stop()` never ran, their leases stayed held for up to
    // OUTBOX_LEASE_SECONDS, and the throw propagated to `OutboxWorker.poll()`,
    // which set `state = 'failed'` and STOPPED THE WORKER PERMANENTLY — a single
    // lease race (e.g. a `P2034` deadlock) took the whole consumer down.
    // `allSettled` lets every claimed event finish.
    const settled = await Promise.allSettled(
      Array.from({ length: Math.min(this.concurrency, claim.events.length) }, () => work()),
    );
    for (const outcome of settled) {
      if (outcome.status === 'rejected') {
        logger.error('outbox.dispatch_worker_failed', outcome.reason, {
          workerId: this.options.workerId,
        });
      }
    }
    logger.info('outbox.dispatch_batch', { workerId: this.options.workerId, ...result });
    return result;
  }
}
