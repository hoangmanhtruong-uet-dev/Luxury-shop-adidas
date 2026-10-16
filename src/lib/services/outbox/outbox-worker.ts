import os from 'node:os';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { type DispatchResult } from '@/lib/services/outbox/outbox-dispatcher';
import { outboxConfig } from '@/lib/services/outbox/outbox.service';

export type WorkerState = 'idle' | 'starting' | 'ready' | 'stopping' | 'stopped' | 'failed';
export interface WorkerStatus {
  workerId: string;
  state: WorkerState;
  inflight: number;
  lastPollAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  error: string | null;
}
export interface OutboxWorkerHandle {
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): WorkerStatus;
}

interface DispatcherHandle {
  dispatchOnce(): Promise<DispatchResult>;
}

interface WorkerOptions {
  workerId?: string;
  version?: string;
  pollIntervalMs?: number;
  shutdownTimeoutMs?: number;
  heartbeatTtlSeconds?: number;
}

export class OutboxWorker implements OutboxWorkerHandle {
  private state: WorkerState = 'idle';
  private inflight = 0;
  private lastPollAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private lastErrorAt: Date | null = null;
  private error: string | null = null;
  private loopPromise: Promise<void> | null = null;
  private shutdownPromise: Promise<void> | null = null;
  private wakePoll: (() => void) | null = null;
  readonly workerId: string;
  private readonly version: string;
  private readonly pollIntervalMs: number;
  private readonly shutdownTimeoutMs: number;
  private readonly heartbeatTtlSeconds: number;

  constructor(
    private readonly dispatcher: DispatcherHandle,
    private readonly client: PrismaClient = prisma,
    options: WorkerOptions = {},
  ) {
    this.workerId = options.workerId ?? `${os.hostname()}:${process.pid}:${randomUUID()}`;
    this.version = options.version ?? process.env.OUTBOX_WORKER_VERSION ?? process.env.npm_package_version ?? 'unknown';
    this.pollIntervalMs = options.pollIntervalMs ?? outboxConfig.pollIntervalMs;
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? outboxConfig.shutdownTimeoutMs;
    this.heartbeatTtlSeconds = options.heartbeatTtlSeconds ?? outboxConfig.heartbeatTtlSeconds;
  }

  status(): WorkerStatus {
    return {
      workerId: this.workerId, state: this.state, inflight: this.inflight,
      lastPollAt: this.lastPollAt, lastSuccessAt: this.lastSuccessAt,
      lastErrorAt: this.lastErrorAt, error: this.error,
    };
  }

  private async heartbeat(status: WorkerState): Promise<void> {
    const now = new Date();
    await this.client.workerHeartbeat.upsert({
      where: { workerId: this.workerId },
      create: {
        workerId: this.workerId, status, version: this.version, lastPollAt: this.lastPollAt ?? now,
        lastSuccessAt: this.lastSuccessAt, lastErrorAt: this.lastErrorAt, inflight: this.inflight,
        expiresAt: new Date(now.getTime() + this.heartbeatTtlSeconds * 1000), lastError: this.error,
      },
      update: {
        status, version: this.version, lastPollAt: this.lastPollAt ?? now,
        lastSuccessAt: this.lastSuccessAt, lastErrorAt: this.lastErrorAt, inflight: this.inflight,
        expiresAt: new Date(now.getTime() + this.heartbeatTtlSeconds * 1000), lastError: this.error,
      },
    });
  }

  private async poll(): Promise<DispatchResult> {
    this.inflight = 1;
    this.lastPollAt = new Date();
    await this.heartbeat(this.state);
    try {
      const result = await this.dispatcher.dispatchOnce();
      this.lastSuccessAt = new Date();
      return result;
    } finally {
      this.inflight = 0;
    }
  }

  private waitForNextPoll(): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.wakePoll = null; resolve(); }, this.pollIntervalMs);
      this.wakePoll = () => { clearTimeout(timer); this.wakePoll = null; resolve(); };
    });
  }

  async start(): Promise<void> {
    if (this.state === 'ready' || this.state === 'starting') return;
    if (this.state === 'stopping') throw new Error('Cannot start a stopping outbox worker');
    this.state = 'starting';
    try {
      await this.poll();
      this.state = 'ready';
      await this.heartbeat('ready');
    } catch (error: unknown) {
      this.state = 'failed'; this.error = error instanceof Error ? error.message : 'Unknown worker failure'; this.lastErrorAt = new Date();
      await this.heartbeat('failed').catch((heartbeatError: unknown) => logger.error('outbox.heartbeat_failed', heartbeatError, { workerId: this.workerId }));
      throw error;
    }
    this.loopPromise = this.runLoop();
  }

  private async runLoop(): Promise<void> {
    // OP3: a single poll failure previously set `state = 'failed'` PERMANENTLY —
    // the worker never polled again and, with no alerting wired up, the outbox
    // silently stopped draining. Now each iteration is guarded individually: on
    // error the worker records it, backs off (capped at 5 minutes with jitter),
    // and keeps going. Only a deploy replaces this process.
    let consecutiveFailures = 0;
    while (this.state === 'ready') {
      await this.waitForNextPoll();
      if (this.state !== 'ready') break;
      try {
        await this.poll();
        await this.heartbeat('ready');
        consecutiveFailures = 0;
      } catch (error: unknown) {
        consecutiveFailures += 1;
        this.lastErrorAt = new Date();
        this.error = error instanceof Error ? error.message : 'Unknown worker failure';
        logger.error('outbox.worker_failed', error, {
          workerId: this.workerId,
          consecutiveFailures,
        });
        await this.heartbeat('failed').catch((heartbeatError: unknown) =>
          logger.error('outbox.heartbeat_failed', heartbeatError, { workerId: this.workerId }),
        );
        const backoffMs = Math.min(
          5 * 60 * 1000,
          this.pollIntervalMs * 2 ** Math.min(consecutiveFailures, 8),
        );
        await this.waitForBackoff(backoffMs);
      }
    }
  }

  /** Interruptible sleep so `stop()` never waits out a full backoff. */
  private waitForBackoff(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.wakePoll = null;
        resolve();
      }, ms);
      this.wakePoll = () => {
        clearTimeout(timer);
        this.wakePoll = null;
        resolve();
      };
    });
  }

  async stop(): Promise<void> {
    if (this.shutdownPromise) return this.shutdownPromise;
    this.shutdownPromise = (async () => {
      if (this.state === 'stopped' || this.state === 'idle') { this.state = 'stopped'; return; }
      this.state = 'stopping'; this.wakePoll?.();
      const loop = this.loopPromise ?? Promise.resolve();
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([loop, new Promise<void>((_, reject) => { timer = setTimeout(() => reject(new Error('Outbox shutdown timed out')), this.shutdownTimeoutMs); })]);
      if (timer) clearTimeout(timer);
      this.state = 'stopped';
      await this.heartbeat('stopped');
    })();
    return this.shutdownPromise;
  }
}
