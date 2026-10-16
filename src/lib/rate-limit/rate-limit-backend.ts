import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  failureMode?: 'closed' | 'open';
  backendTimeoutMs?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
  reason?: 'limit_exceeded' | 'backend_unavailable';
}

export interface RateLimitBackend {
  increment(keyHash: string, now: Date, windowMs: number): Promise<{ count: number; reset: number }>;
  get?(keyHash: string, now: Date): Promise<{ count: number; reset: number } | null>;
  reset?(keyHash: string): Promise<void>;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  max: 10,
  failureMode: 'closed',
  backendTimeoutMs: 2_000,
};

export function hashRateLimitIdentifier(identifier: string, windowMs: number): string {
  // HMAC prevents raw user ids, emails, and IP addresses from being recoverable from database keys.
  return crypto
    .createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`rate-limit:v1:${windowMs}:${identifier}`)
    .digest('hex');
}

export type FullRateLimitBackend = Required<Pick<RateLimitBackend, 'increment' | 'get' | 'reset'>>;

const DEADLOCK_ATTEMPTS = 3;

/** True for Prisma deadlock / lock-wait-timeout errors. */
function isDeadlock(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2034' || error.code === 'P2024')
  );
}

/**
 * Retries a bucket write on deadlock with jittered backoff. Without this, a
 * burst of concurrent requests on the same bucket (e.g. launch-minute login
 * traffic collapsing onto few buckets) surfaces as a 503 via the fail-closed
 * default instead of succeeding on retry.
 */
async function withRetryOnDeadlock<T>(work: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < DEADLOCK_ATTEMPTS; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (!isDeadlock(error)) throw error;
      lastError = error;
      const backoffMs = Math.min(500, 50 * 2 ** attempt) + Math.floor(Math.random() * 50);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError;
}

export const databaseRateLimitBackend: FullRateLimitBackend = {
  async increment(keyHash, now, windowMs) {
    const nextExpiry = new Date(now.getTime() + windowMs);

    // OP5: the INSERT..ON DUPLICATE + SELECT FOR UPDATE pair deadlocks under
    // burst contention (two requests racing the same bucket). The other P2034
    // retry loops in the codebase all back off; this one previously threw
    // straight into the fail-closed path (503 on login during a DB stall).
    return withRetryOnDeadlock(() =>
      prisma.$transaction(async (tx) => {
        // This statement takes an exclusive row lock. Assignment order is intentional:
        // every predicate observes the old expiresAt before expiresAt is replaced.
        // Postgres has no IF() and no ON DUPLICATE KEY UPDATE. The CASE expression
        // below reproduces the exact window-reset semantics; camelCase identifiers
        // must be double-quoted (unquoted folds to lowercase in Postgres).
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO rate_limit_bucket
            ("keyHash", count, "windowStart", "expiresAt", "createdAt", "updatedAt")
          VALUES
            (${keyHash}, 1, ${now}, ${nextExpiry}, ${now}, ${now})
          ON CONFLICT ("keyHash") DO UPDATE SET
            count = CASE WHEN rate_limit_bucket."expiresAt" <= ${now} THEN 1 ELSE rate_limit_bucket.count + 1 END,
            "windowStart" = CASE WHEN rate_limit_bucket."expiresAt" <= ${now} THEN ${now} ELSE rate_limit_bucket."windowStart" END,
            "expiresAt" = CASE WHEN rate_limit_bucket."expiresAt" <= ${now} THEN ${nextExpiry} ELSE rate_limit_bucket."expiresAt" END,
            "updatedAt" = ${now}
        `);

        const rows = await tx.$queryRaw<Array<{ count: number; expiresAt: Date }>>(Prisma.sql`
          SELECT count, "expiresAt"
          FROM rate_limit_bucket
          WHERE "keyHash" = ${keyHash}
          FOR UPDATE
        `);
        const bucket = rows[0];
        if (!bucket) throw new Error('Rate-limit bucket was not persisted');
        return { count: Number(bucket.count), reset: new Date(bucket.expiresAt).getTime() };
      }),
    );
  },


  async get(keyHash, now) {
    const bucket = await prisma.rateLimitBucket.findUnique({
      where: { keyHash },
      select: { count: true, expiresAt: true },
    });
    if (!bucket || bucket.expiresAt <= now) return null;
    return { count: bucket.count, reset: bucket.expiresAt.getTime() };
  },

  async reset(keyHash) {
    await prisma.rateLimitBucket.deleteMany({ where: { keyHash } });
  },
};

function validateConfig(config: RateLimitConfig): Required<RateLimitConfig> {
  const merged = { ...DEFAULT_CONFIG, ...config } as Required<RateLimitConfig>;
  if (!Number.isSafeInteger(merged.windowMs) || merged.windowMs <= 0) {
    throw new TypeError('rateLimit windowMs must be a positive integer');
  }
  if (!Number.isSafeInteger(merged.max) || merged.max <= 0) {
    throw new TypeError('rateLimit max must be a positive integer');
  }
  if (!Number.isSafeInteger(merged.backendTimeoutMs) || merged.backendTimeoutMs <= 0) {
    throw new TypeError('rateLimit backendTimeoutMs must be a positive integer');
  }
  return merged;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Rate-limit backend timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createFailureCounter(
  backend: FullRateLimitBackend,
  clock: () => number = Date.now,
) {
  return {
    async check(identifier: string, config: RateLimitConfig = DEFAULT_CONFIG): Promise<RateLimitResult> {
      const options = validateConfig(config);
      const nowMs = clock();
      const keyHash = hashRateLimitIdentifier(identifier, options.windowMs);
      try {
        const bucket = await withTimeout(backend.get(keyHash, new Date(nowMs)), options.backendTimeoutMs);
        const count = bucket?.count ?? 0;
        const reset = bucket?.reset ?? nowMs + options.windowMs;
        // OP5: was `count < options.max`, one request stricter than the
        // limiter's `count <= options.max` below. Unified on `<=` so both paths
        // admit exactly `max` requests per window.
        const success = count <= options.max;
        return {
          success,
          limit: options.max,
          remaining: Math.max(0, options.max - count),
          reset,
          retryAfter: Math.max(1, Math.ceil((reset - nowMs) / 1000)),
          ...(success ? {} : { reason: 'limit_exceeded' as const }),
        };
      } catch (error) {
        logger.error('[RATE_LIMIT_BACKEND]', error, { failureMode: options.failureMode });
        return {
          success: options.failureMode === 'open',
          limit: options.max,
          remaining: options.failureMode === 'open' ? options.max : 0,
          reset: nowMs + options.windowMs,
          retryAfter: Math.max(1, Math.ceil(options.windowMs / 1000)),
          reason: 'backend_unavailable',
        };
      }
    },
    async recordFailure(identifier: string, config: RateLimitConfig = DEFAULT_CONFIG): Promise<RateLimitResult> {
      return createRateLimiter(backend, clock)(identifier, config);
    },
    async reset(identifier: string, config: RateLimitConfig = DEFAULT_CONFIG): Promise<void> {
      const options = validateConfig(config);
      const keyHash = hashRateLimitIdentifier(identifier, options.windowMs);
      await withTimeout(backend.reset(keyHash), options.backendTimeoutMs);
    },
  };
}

export function createRateLimiter(
  backend: RateLimitBackend,
  clock: () => number = Date.now,
) {
  return async function distributedRateLimit(
    identifier: string,
    config: RateLimitConfig = DEFAULT_CONFIG,
  ): Promise<RateLimitResult> {
    const options = validateConfig(config);
    const nowMs = clock();
    const resetOnFailure = nowMs + options.windowMs;
    const keyHash = hashRateLimitIdentifier(identifier, options.windowMs);

    try {
      const bucket = await withTimeout(
        backend.increment(keyHash, new Date(nowMs), options.windowMs),
        options.backendTimeoutMs,
      );
      const success = bucket.count <= options.max;
      return {
        success,
        limit: options.max,
        remaining: Math.max(0, options.max - bucket.count),
        reset: bucket.reset,
        retryAfter: Math.max(1, Math.ceil((bucket.reset - nowMs) / 1000)),
        ...(success ? {} : { reason: 'limit_exceeded' as const }),
      };
    } catch (error) {
      // Never log identifier/keyHash: callers can scope them with IP/email/user id.
      logger.error('[RATE_LIMIT_BACKEND]', error, { failureMode: options.failureMode });
      return {
        success: options.failureMode === 'open',
        limit: options.max,
        remaining: options.failureMode === 'open' ? options.max : 0,
        reset: resetOnFailure,
        retryAfter: Math.max(1, Math.ceil(options.windowMs / 1000)),
        reason: 'backend_unavailable',
      };
    }
  };
}
