import { createHash } from 'node:crypto';
import type { OutboxEvent, Prisma } from '@prisma/client';
import { z } from 'zod';
import type { TransactionClient } from '@/lib/services/idempotency.service';
import { logger } from '@/lib/logger';
import { Money, parseMoneyInput, serializeMoneyFields } from '@/lib/utils/money';

export const OUTBOX_EVENT = Object.freeze({
  INVENTORY_RESERVED: 'INVENTORY_RESERVED',
  INVENTORY_CONSUMED: 'INVENTORY_CONSUMED',
  INVENTORY_RESERVATION_EXPIRED: 'INVENTORY_RESERVATION_EXPIRED',
  ORDER_PAID: 'ORDER_PAID',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_PACKING_STARTED: 'ORDER_PACKING_STARTED',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_RETURN_REQUESTED: 'ORDER_RETURN_REQUESTED',
  ORDER_RETURNED: 'ORDER_RETURNED',
  ORDER_REFUNDED: 'ORDER_REFUNDED',
  LATE_PAYMENT_REVIEW_REQUIRED: 'LATE_PAYMENT_REVIEW_REQUIRED',
  ORDER_REFUND_PENDING: 'ORDER_REFUND_PENDING',
  REFUND_REQUIRED: 'REFUND_REQUIRED',
  NOTIFICATION_REQUESTED: 'NOTIFICATION_REQUESTED',
} as const);

export interface EnqueueOutboxInput {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  payload: unknown;
  orderId?: string;
  maxAttempts?: number;
}

export async function enqueueOutboxEvent(tx: TransactionClient, input: EnqueueOutboxInput): Promise<OutboxEvent> {
  return tx.outboxEvent.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: input.idempotencyKey,
      payload: JSON.stringify(serializeMoneyFields(input.payload)),
      orderId: input.orderId,
      maxAttempts: input.maxAttempts ?? outboxConfig.maxAttempts,
    },
    update: {},
  });
}

export const orderPayloadSchema = z.object({ orderId: z.string().min(1) }).strict();
export const latePaymentPayloadSchema = orderPayloadSchema.extend({ paymentId: z.string().min(1).optional() }).strict();
const outboxMoneySchema = z.union([z.string(), z.number().finite()]).transform((value, ctx) => {
  try {
    if (typeof value === 'number') logger.warn('outbox.legacy_numeric_money_payload', { value: String(value) });
    return Money.serialize(parseMoneyInput(typeof value === 'number' ? String(value) : value, { allowZero: false, field: 'amount' }));
  } catch (error: unknown) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : 'Invalid money payload' });
    return z.NEVER;
  }
});
export const refundRequiredPayloadSchema = z.object({
  orderId: z.string().min(1), paymentId: z.string().min(1), refundId: z.string().min(1),
  amount: outboxMoneySchema.optional(), currency: z.literal('VND').optional(),
}).strict();
export const notificationPayloadSchema = z.object({
  channel: z.enum(['email', 'sms']).default('email'),
  recipient: z.string().trim().min(1).max(191),
  template: z.string().trim().min(1).max(96),
  orderId: z.string().min(1).optional(),
  refundId: z.string().min(1).optional(),
}).strict();

const payloadSchemas: Readonly<Record<string, z.ZodType<unknown>>> = Object.freeze({
  [OUTBOX_EVENT.INVENTORY_RESERVED]: orderPayloadSchema.extend({ expiresAt: z.string().datetime() }).strict(),
  [OUTBOX_EVENT.INVENTORY_CONSUMED]: orderPayloadSchema,
  [OUTBOX_EVENT.INVENTORY_RESERVATION_EXPIRED]: orderPayloadSchema,
  [OUTBOX_EVENT.ORDER_PAID]: orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict(),
  [OUTBOX_EVENT.ORDER_CONFIRMED]: orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict(),
  [OUTBOX_EVENT.ORDER_PACKING_STARTED]: orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict(),
  [OUTBOX_EVENT.ORDER_SHIPPED]: orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict(),
  [OUTBOX_EVENT.ORDER_DELIVERED]: orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict(),
  [OUTBOX_EVENT.ORDER_CANCELLED]: z.union([orderPayloadSchema, orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict()]),
  [OUTBOX_EVENT.ORDER_RETURN_REQUESTED]: orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict(),
  [OUTBOX_EVENT.ORDER_RETURNED]: orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict(),
  [OUTBOX_EVENT.ORDER_REFUNDED]: orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict(),
  [OUTBOX_EVENT.LATE_PAYMENT_REVIEW_REQUIRED]: latePaymentPayloadSchema,
  [OUTBOX_EVENT.ORDER_REFUND_PENDING]: orderPayloadSchema.extend({ fromStatus: z.string(), toStatus: z.string() }).strict(),
  [OUTBOX_EVENT.REFUND_REQUIRED]: refundRequiredPayloadSchema,
  [OUTBOX_EVENT.NOTIFICATION_REQUESTED]: notificationPayloadSchema,
});

export function parseOutboxPayload(event: Pick<OutboxEvent, 'eventType' | 'payload'>): unknown {
  const schema = payloadSchemas[event.eventType];
  if (!schema) throw new NonRetryableOutboxError('UNKNOWN_EVENT_TYPE', `No consumer schema for ${event.eventType}`);
  let value: unknown;
  try {
    value = JSON.parse(event.payload) as unknown;
  } catch {
    throw new NonRetryableOutboxError('INVALID_JSON', 'Outbox payload is not valid JSON');
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new NonRetryableOutboxError('INVALID_PAYLOAD', parsed.error.message);
  return parsed.data;
}

export class NonRetryableOutboxError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export class RetryableOutboxError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export class OutboxLeaseLostError extends Error {
  constructor(eventId: string) { super(`Lease ownership lost for outbox event ${eventId}`); }
}

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= min ? Math.min(value, max) : fallback;
}

export const outboxConfig = Object.freeze({
  batchSize: intEnv('OUTBOX_BATCH_SIZE', 50, 1, 1000),
  pollIntervalMs: intEnv('OUTBOX_POLL_INTERVAL_MS', 1000, 50, 60_000),
  leaseSeconds: intEnv('OUTBOX_LEASE_SECONDS', 60, 1, 3600),
  maxAttempts: intEnv('OUTBOX_MAX_ATTEMPTS', 10, 1, 100),
  backoffBaseMs: intEnv('OUTBOX_BACKOFF_BASE_MS', 1000, 1, 300_000),
  backoffMaxMs: intEnv('OUTBOX_BACKOFF_MAX_MS', 300_000, 1, 86_400_000),
  concurrency: intEnv('OUTBOX_CONCURRENCY', 5, 1, 100),
  shutdownTimeoutMs: intEnv('OUTBOX_SHUTDOWN_TIMEOUT_MS', 8_000, 100, 300_000),
  heartbeatTtlSeconds: intEnv('OUTBOX_HEARTBEAT_TTL_SECONDS', 15, 2, 300),
  deadLetterCriticalThreshold: intEnv('OUTBOX_DEAD_LETTER_CRITICAL_THRESHOLD', 1, 0, 100_000),
});

export function resultHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function isRetryableDatabaseError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2034'].includes(code);
}

export type OutboxTransaction = Prisma.TransactionClient;
