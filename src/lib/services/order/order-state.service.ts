import { createHash } from 'node:crypto';
import { Prisma, type Order, type PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { TransactionClient } from '@/lib/services/idempotency.service';
import { enqueueOutboxEvent, OUTBOX_EVENT } from '@/lib/services/outbox/outbox.service';
import { Money } from '@/lib/utils/money';

export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending', PAID: 'paid', PAYMENT_FAILED: 'payment_failed', CONFIRMED: 'confirmed',
  PACKING: 'packing', SHIPPING: 'shipping', DELIVERED: 'delivered', EXPIRED: 'expired', CANCELLED: 'cancelled',
  PAYMENT_REVIEW: 'payment_review', REFUND_PENDING: 'refund_pending', REFUNDED: 'refunded',
  RETURN_REQUESTED: 'return_requested', RETURN_APPROVED: 'return_approved', RETURN_REJECTED: 'return_rejected',
  RETURNING: 'returning', RETURNED: 'returned',
} as const;
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export type OrderTransitionActor =
  | { type: 'CUSTOMER'; userId: string }
  | { type: 'ADMIN'; userId: string }
  | { type: 'SELLER'; userId: string }
  | { type: 'SHIPPER'; userId: string }
  | { type: 'PAYMENT_WEBHOOK'; provider: string }
  | { type: 'SYSTEM'; workerId: string };

export interface TransitionOrderInput {
  orderId: string;
  targetStatus: OrderStatus;
  actor: OrderTransitionActor;
  reason?: string;
  metadata?: Readonly<Record<string, unknown>>;
  idempotencyKey: string;
}

export const allowedOrderTransitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = Object.freeze({
  pending: ['paid', 'payment_failed', 'expired', 'cancelled', 'payment_review'],
  payment_failed: ['pending', 'cancelled'],
  paid: ['confirmed', 'refund_pending', 'payment_review'],
  confirmed: ['packing', 'refund_pending'],
  packing: ['shipping', 'refund_pending'],
  shipping: ['delivered'],
  delivered: ['return_requested', 'refund_pending'],
  return_requested: ['return_approved', 'return_rejected'],
  return_approved: ['returning'],
  return_rejected: [],
  returning: ['returned'],
  returned: ['refund_pending'],
  refund_pending: ['refunded', 'payment_review'],
  payment_review: ['refund_pending', 'confirmed', 'cancelled'],
  expired: ['payment_review'],
  cancelled: ['payment_review'],
  refunded: [],
});

export const terminalOrderStatuses: readonly OrderStatus[] = Object.freeze(['refunded', 'return_rejected']);

const eventForStatus: Partial<Record<OrderStatus, string>> = {
  paid: OUTBOX_EVENT.ORDER_PAID, confirmed: OUTBOX_EVENT.ORDER_CONFIRMED,
  packing: OUTBOX_EVENT.ORDER_PACKING_STARTED, shipping: OUTBOX_EVENT.ORDER_SHIPPED,
  delivered: OUTBOX_EVENT.ORDER_DELIVERED, cancelled: OUTBOX_EVENT.ORDER_CANCELLED,
  return_requested: OUTBOX_EVENT.ORDER_RETURN_REQUESTED, returned: OUTBOX_EVENT.ORDER_RETURNED,
  refund_pending: OUTBOX_EVENT.ORDER_REFUND_PENDING, refunded: OUTBOX_EVENT.ORDER_REFUNDED,
};

function actorId(actor: OrderTransitionActor): string {
  if ('userId' in actor) return actor.userId;
  return actor.type === 'SYSTEM' ? actor.workerId : actor.provider;
}

function edge(from: string, to: string): string { return `${from}->${to}`; }

const actorEdges: Readonly<Record<OrderTransitionActor['type'], readonly string[]>> = Object.freeze({
  CUSTOMER: [edge('pending', 'cancelled'), edge('delivered', 'return_requested')],
  ADMIN: [edge('pending', 'cancelled'), edge('paid', 'confirmed'), edge('confirmed', 'packing'), edge('packing', 'shipping'), edge('shipping', 'delivered'), edge('delivered', 'return_requested'), edge('delivered', 'refund_pending'), edge('return_requested', 'return_approved'), edge('return_requested', 'return_rejected'), edge('return_approved', 'returning'), edge('returning', 'returned'), edge('returned', 'refund_pending'), edge('payment_review', 'refund_pending')],
  SELLER: [edge('paid', 'confirmed'), edge('confirmed', 'packing')],
  SHIPPER: [edge('packing', 'shipping'), edge('shipping', 'delivered'), edge('return_approved', 'returning'), edge('returning', 'returned')],
  PAYMENT_WEBHOOK: [edge('pending', 'paid'), edge('pending', 'payment_failed'), edge('expired', 'payment_review'), edge('cancelled', 'payment_review')],
  SYSTEM: [edge('paid', 'refund_pending'), edge('confirmed', 'refund_pending'), edge('packing', 'refund_pending'), edge('delivered', 'refund_pending'), edge('pending', 'cancelled'), edge('pending', 'paid'), edge('pending', 'payment_failed'), edge('pending', 'expired'), edge('expired', 'payment_review'), edge('cancelled', 'payment_review'), edge('payment_review', 'refund_pending'), edge('refund_pending', 'refunded'), edge('returned', 'refund_pending')],
});

function orderError(code: string, message: string, statusCode: number, metadata?: unknown): AppError {
  return new AppError(message, statusCode, code, true, metadata);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function requestHash(input: TransitionOrderInput): string {
  return createHash('sha256').update(canonical({ orderId: input.orderId, targetStatus: input.targetStatus, actor: input.actor, reason: input.reason ?? null, metadata: input.metadata ?? null })).digest('hex');
}

function safeMetadata(value?: Readonly<Record<string, unknown>>): string | undefined {
  if (!value) return undefined;
  const denied = /password|secret|token|authorization|card|cvv/i;
  const filtered = Object.fromEntries(Object.entries(value).filter(([key]) => !denied.test(key)));
  const serialized = canonical(filtered);
  return serialized.length <= 8000 ? serialized : canonical({ truncated: true });
}

async function assertActorScope(tx: TransactionClient, order: Order, actor: OrderTransitionActor, target: OrderStatus, metadata?: Readonly<Record<string, unknown>>): Promise<void> {
  if (!actorEdges[actor.type].includes(edge(order.status, target))) {
    throw orderError('ACTOR_NOT_ALLOWED', `${actor.type} cannot perform ${order.status} -> ${target}`, 403);
  }
  if (actor.type === 'CUSTOMER' && order.userId !== actor.userId) throw orderError('ACTOR_NOT_ALLOWED', 'Customer does not own this order', 403);
  if (actor.type === 'SHIPPER') {
    const assignsSelfAtomically = order.shipperId === null && order.status === 'packing' && target === 'shipping' && metadata?.assignSelf === true;
    if (order.shipperId !== actor.userId && !assignsSelfAtomically) throw orderError('ACTOR_NOT_ALLOWED', 'Shipment is not assigned to this shipper', 403);
  }
  if (actor.type === 'SELLER') {
    const items = await tx.orderItem.findMany({ where: { orderId: order.id }, select: { product: { select: { sellerId: true } } } });
    if (items.length === 0 || items.some((item) => item.product.sellerId !== actor.userId)) {
      throw orderError('ACTOR_NOT_ALLOWED', 'Seller does not own every item in this order', 403);
    }
  }
}

async function assertInvariants(tx: TransactionClient, order: Order, input: TransitionOrderInput): Promise<void> {
  const target = input.targetStatus;
  const payment = await tx.payment.findUnique({ where: { orderId: order.id } });
  const reservations = await tx.inventoryReservation.findMany({ where: { orderId: order.id }, select: { status: true } });
  if (target === 'paid') {
    if (!payment || !['SUCCEEDED', 'completed'].includes(payment.status) || payment.providerOutcome !== 'SUCCEEDED') throw orderError('PAYMENT_NOT_COMPLETED', 'Payment has not succeeded', 422);
    if (payment.currency !== order.currency || Money.compare(payment.amount, order.total) !== 0) throw orderError('PAYMENT_NOT_COMPLETED', 'Payment amount or currency does not match order', 422);
    if (reservations.length === 0 || reservations.some((item) => item.status !== 'CONSUMED')) throw orderError('PAYMENT_REVIEW_REQUIRED', 'Inventory reservation was not consumed', 422);
  }
  if (['confirmed', 'packing', 'shipping', 'delivered'].includes(target)) {
    if (!payment || !['SUCCEEDED', 'completed'].includes(payment.status) || order.paymentStatus !== 'paid') throw orderError('PAYMENT_NOT_COMPLETED', 'Fulfillment requires a completed payment', 422);
    if (reservations.some((item) => item.status !== 'CONSUMED')) throw orderError('PAYMENT_NOT_COMPLETED', 'Fulfillment requires consumed inventory', 422);
  }
  if (target === 'packing' && await tx.orderItem.count({ where: { orderId: order.id } }) === 0) throw orderError('INVALID_ORDER_TRANSITION', 'Cannot pack an empty order', 422);
  if (target === 'shipping' && (!order.trackingNumber && typeof input.metadata?.trackingNumber !== 'string')) throw orderError('INVALID_ORDER_TRANSITION', 'Tracking number is required before shipping', 422);
  if (target === 'delivered' && !order.shipperId && input.actor.type === 'SHIPPER') throw orderError('ACTOR_NOT_ALLOWED', 'Shipment has no assigned shipper', 403);
  if (target === 'return_requested') {
    const reason = input.reason?.trim();
    if (!reason) throw orderError('INVALID_ORDER_TRANSITION', 'Return reason is required', 400);
    if (!order.deliveredAt) throw orderError('INVALID_ORDER_TRANSITION', 'Only a delivered order can be returned', 422);
    const returnDays = Number(process.env.ORDER_RETURN_WINDOW_DAYS || 30);
    if (Date.now() - order.deliveredAt.getTime() > returnDays * 86_400_000) throw orderError('RETURN_WINDOW_EXPIRED', 'Return window has expired', 422);
    if (await tx.orderReturn.count({ where: { orderId: order.id, status: { in: ['REQUESTED', 'APPROVED', 'RETURNING'] } } })) throw orderError('RETURN_ALREADY_EXISTS', 'An active return already exists', 409);
    if (payment && Money.compare(payment.refundedAmount, payment.amount) >= 0) throw orderError('RETURN_ALREADY_EXISTS', 'A fully refunded order cannot be returned', 409);
  }
  if (target === 'refunded') {
    if (!payment || Money.compare(payment.refundedAmount, payment.amount) !== 0 || !['REFUNDED', 'refunded'].includes(payment.status)) throw orderError('REFUND_REQUIRED', 'Full refund has not completed', 422);
  }
}

function transitionData(target: OrderStatus, now: Date, metadata: Readonly<Record<string, unknown>> | undefined, actor: OrderTransitionActor): Prisma.OrderUncheckedUpdateManyInput {
  const data: Prisma.OrderUncheckedUpdateManyInput = { status: target, statusVersion: { increment: 1 } };
  if (target === 'paid') { data.paidAt = now; data.paymentStatus = 'paid'; }
  if (target === 'confirmed') data.confirmedAt = now;
  if (target === 'packing') data.packingStartedAt = now;
  if (target === 'shipping') {
    data.shippedAt = now;
    if (typeof metadata?.trackingNumber === 'string') data.trackingNumber = metadata.trackingNumber;
    if (typeof metadata?.shippingProvider === 'string') data.shippingProvider = metadata.shippingProvider;
    if (typeof metadata?.estimatedDelivery === 'string') data.estimatedDelivery = new Date(metadata.estimatedDelivery);
    if (actor.type === 'SHIPPER' && metadata?.assignSelf === true) data.shipperId = actor.userId;
  }
  if (target === 'delivered') data.deliveredAt = now;
  if (target === 'cancelled') data.cancelledAt = now;
  if (target === 'return_requested') data.returnRequestedAt = now;
  if (target === 'returned') data.returnedAt = now;
  if (target === 'refund_pending') data.refundPendingAt = now;
  if (target === 'refunded') { data.refundedAt = now; data.paymentStatus = 'refunded'; }
  if (target === 'payment_failed') data.paymentStatus = 'failed';
  if (target === 'payment_review') data.paymentStatus = 'paid_late';
  return data;
}

const fulfillmentProjectionOrder: Readonly<Record<string, number>> = Object.freeze({
  pending: 0, paid: 1, confirmed: 2, packing: 3, shipping: 4, delivered: 5,
});

function projectedOrderStatus(statuses: readonly string[]): OrderStatus | null {
  if (statuses.length === 0) return null;
  if (statuses.every((status) => status === 'delivered')) return ORDER_STATUS.DELIVERED;
  if (statuses.some((status) => status === 'shipping' || status === 'delivered' || status === 'delivery_failed')) return ORDER_STATUS.SHIPPING;
  if (statuses.some((status) => status === 'packing')) return ORDER_STATUS.PACKING;
  if (statuses.some((status) => status === 'confirmed')) return ORDER_STATUS.CONFIRMED;
  if (statuses.every((status) => status === 'paid')) return ORDER_STATUS.PAID;
  return null;
}

async function projectOrderTransitionToFulfillments(tx: TransactionClient, orderId: string, target: OrderStatus, now: Date, metadata?: Readonly<Record<string, unknown>>): Promise<void> {
  const previousByTarget: Partial<Record<OrderStatus, string>> = {
    paid: 'pending', confirmed: 'paid', packing: 'confirmed', shipping: 'packing', delivered: 'shipping',
  };
  const previous = previousByTarget[target];
  if (previous) {
    await tx.sellerFulfillment.updateMany({
      where: { orderId, status: previous },
      data: {
        status: target, statusVersion: { increment: 1 },
        ...(target === 'confirmed' ? { confirmedAt: now } : {}),
        ...(target === 'packing' ? { packingStartedAt: now } : {}),
        ...(target === 'shipping' ? {
          shippedAt: now,
          ...(typeof metadata?.trackingNumber === 'string' ? { trackingNumber: metadata.trackingNumber } : {}),
          ...(typeof metadata?.shippingProvider === 'string' ? { shippingProvider: metadata.shippingProvider } : {}),
          ...(typeof metadata?.estimatedDelivery === 'string' ? { estimatedDelivery: new Date(metadata.estimatedDelivery) } : {}),
        } : {}),
        ...(target === 'delivered' ? { deliveredAt: now } : {}),
      },
    });
  } else if (['cancelled', 'expired', 'refunded'].includes(target)) {
    await tx.sellerFulfillment.updateMany({
      where: { orderId, status: { notIn: ['delivered', 'cancelled', 'expired', 'refunded'] } },
      data: { status: target, statusVersion: { increment: 1 } },
    });
  }
}

export async function syncOrderFromFulfillmentsInTransaction(tx: TransactionClient, orderId: string, actor: OrderTransitionActor, sourceKey: string): Promise<Order> {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  const fulfillments = await tx.sellerFulfillment.findMany({ where: { orderId }, select: { status: true } });
  const target = projectedOrderStatus(fulfillments.map((item) => item.status));
  const currentRank = fulfillmentProjectionOrder[order.status];
  const targetRank = target ? fulfillmentProjectionOrder[target] : undefined;
  if (!target || currentRank === undefined || targetRank === undefined || targetRank <= currentRank) return order;
  const codStartsFulfillment = order.paymentMethod === 'COD' && order.status === 'pending' && target === 'confirmed';
  if (!codStartsFulfillment && !allowedOrderTransitions[order.status as OrderStatus]?.includes(target)) {
    throw orderError('INVALID_ORDER_TRANSITION', `Fulfillment projection cannot move order ${order.status} -> ${target}`, 409);
  }
  const now = new Date();
  const updated = await tx.order.updateMany({
    where: { id: order.id, status: order.status, statusVersion: order.statusVersion },
    data: transitionData(target, now, undefined, actor),
  });
  if (updated.count !== 1) throw orderError('ORDER_STATUS_CONFLICT', 'Order changed concurrently', 409);
  const aggregateKey = `fulfillment:${createHash('sha256').update(sourceKey).digest('hex')}`;
  const hash = createHash('sha256').update(canonical({ orderId, fromStatus: order.status, toStatus: target, sourceKey })).digest('hex');
  await tx.orderStatusTransition.create({ data: { orderId, fromStatus: order.status, toStatus: target, actorType: actor.type, actorId: actorId(actor), reason: 'Aggregated from seller fulfillments', metadata: canonical({ sourceKey }), idempotencyKey: aggregateKey, requestHash: hash } });
  await tx.domainAuditLog.create({ data: { action: 'ORDER_FULFILLMENT_AGGREGATED', actorId: actorId(actor), entityType: 'Order', entityId: orderId, details: canonical({ fromStatus: order.status, toStatus: target, sourceKey }) } });
  const eventType = eventForStatus[target];
  if (eventType) await enqueueOutboxEvent(tx, { eventType, aggregateType: 'Order', aggregateId: orderId, orderId, idempotencyKey: `transition:${aggregateKey}:${eventType}`, payload: { orderId, fromStatus: order.status, toStatus: target } });
  return tx.order.findUniqueOrThrow({ where: { id: orderId } });
}

export async function transitionOrderInTransaction(tx: TransactionClient, input: TransitionOrderInput): Promise<Order> {
  if (!input.idempotencyKey || input.idempotencyKey.length > 191) throw orderError('INVALID_ORDER_TRANSITION', 'A bounded idempotency key is required', 400);
  const hash = requestHash(input);
  const existing = await tx.orderStatusTransition.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.requestHash !== hash) throw orderError('IDEMPOTENCY_CONFLICT', 'Idempotency key was reused with a different transition', 409);
    return tx.order.findUniqueOrThrow({ where: { id: existing.orderId } });
  }

  await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw('"order"')} WHERE id = ${input.orderId} FOR UPDATE`);
  const order = await tx.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw orderError('ORDER_NOT_FOUND', 'Order not found', 404);
  if (order.status === input.targetStatus) throw orderError('ORDER_STATUS_CONFLICT', 'Self-transition requires the original idempotency key', 409);
  const knownFrom = order.status as OrderStatus;
  if (!allowedOrderTransitions[knownFrom]?.includes(input.targetStatus)) throw orderError('INVALID_ORDER_TRANSITION', `Invalid order transition: ${order.status} -> ${input.targetStatus}`, 400);
  await assertActorScope(tx, order, input.actor, input.targetStatus, input.metadata);
  await assertInvariants(tx, order, input);

  const now = new Date();
  const updated = await tx.order.updateMany({ where: { id: order.id, status: order.status, statusVersion: order.statusVersion }, data: transitionData(input.targetStatus, now, input.metadata, input.actor) });
  if (updated.count !== 1) throw orderError('ORDER_STATUS_CONFLICT', 'Order changed concurrently', 409);
  await projectOrderTransitionToFulfillments(tx, order.id, input.targetStatus, now, input.metadata);

  if (input.targetStatus === 'return_requested') {
    await tx.orderReturn.create({ data: { orderId: order.id, reason: input.reason!.trim(), requestedBy: actorId(input.actor), idempotencyKey: `return:${input.idempotencyKey}` } });
  } else if (['return_approved', 'return_rejected', 'returning', 'returned'].includes(input.targetStatus)) {
    const activeReturn = await tx.orderReturn.findFirst({ where: { orderId: order.id }, orderBy: { requestedAt: 'desc' } });
    if (!activeReturn) throw orderError('RETURN_ALREADY_EXISTS', 'Return record is missing', 422);
    const returnStatus = input.targetStatus === 'return_approved' ? 'APPROVED' : input.targetStatus === 'return_rejected' ? 'REJECTED' : input.targetStatus === 'returning' ? 'RETURNING' : 'COMPLETED';
    await tx.orderReturn.update({ where: { id: activeReturn.id }, data: { status: returnStatus, ...(['APPROVED', 'REJECTED'].includes(returnStatus) ? { decidedAt: now } : {}), ...(returnStatus === 'COMPLETED' ? { completedAt: now } : {}) } });
  }

  await tx.orderStatusTransition.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: input.targetStatus, actorType: input.actor.type, actorId: actorId(input.actor), reason: input.reason?.trim(), metadata: safeMetadata(input.metadata), idempotencyKey: input.idempotencyKey, requestHash: hash } });
  await tx.domainAuditLog.create({ data: { action: 'ORDER_STATUS_TRANSITION', actorId: actorId(input.actor), entityType: 'Order', entityId: order.id, details: canonical({ fromStatus: order.status, toStatus: input.targetStatus, reason: input.reason ?? null, idempotencyKey: input.idempotencyKey }) } });
  const eventType = eventForStatus[input.targetStatus];
  if (eventType) await enqueueOutboxEvent(tx, { eventType, aggregateType: 'Order', aggregateId: order.id, orderId: order.id, idempotencyKey: `transition:${input.idempotencyKey}:${eventType}`, payload: { orderId: order.id, fromStatus: order.status, toStatus: input.targetStatus } });
  return tx.order.findUniqueOrThrow({ where: { id: order.id } });
}

export class OrderStateService {
  static async transition(input: TransitionOrderInput, client: PrismaClient = prisma): Promise<Order> {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try { return await client.$transaction((tx) => transitionOrderInTransaction(tx, input), { maxWait: 10_000, timeout: 20_000 }); }
      catch (error: unknown) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!retryable || attempt === 4) throw error;
      }
    }
    throw orderError('ORDER_STATUS_CONFLICT', 'Order transition retry limit exceeded', 409);
  }
}
