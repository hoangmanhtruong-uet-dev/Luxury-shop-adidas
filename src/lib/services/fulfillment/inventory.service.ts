import { InventoryReservationStatus, Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { ConflictError, ValidationError } from '@/lib/errors';
import type { TransactionClient } from '@/lib/services/idempotency.service';
import { logger } from '@/lib/logger';
import { enqueueOutboxEvent, OUTBOX_EVENT } from '@/lib/services/outbox/outbox.service';
import { ORDER_STATUS, transitionOrderInTransaction, type OrderTransitionActor } from '@/lib/services/order/order-state.service';

export const inventoryConfig = Object.freeze({
  reservationTtlMinutes: positiveInt(process.env.INVENTORY_RESERVATION_TTL_MINUTES, 15, 24 * 60),
  maxActiveOrdersPerUser: positiveInt(process.env.INVENTORY_MAX_ACTIVE_ORDERS_PER_USER, 3, 100),
  maxOrdersPerWindow: positiveInt(process.env.INVENTORY_MAX_ORDERS_PER_WINDOW, 10, 1000),
  orderRateWindowMinutes: positiveInt(process.env.INVENTORY_ORDER_RATE_WINDOW_MINUTES, 1, 60),
  expiryBatchSize: positiveInt(process.env.INVENTORY_EXPIRY_BATCH_SIZE, 100, 1000),
  transactionMaxAttempts: positiveInt(process.env.INVENTORY_TRANSACTION_MAX_ATTEMPTS, 4, 10),
  reconciliationBatchSize: positiveInt(process.env.INVENTORY_RECONCILIATION_BATCH_SIZE, 250, 5000),
});

function positiveInt(value: string | undefined, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

async function lockOrder(tx: TransactionClient, orderId: string): Promise<void> {
  await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw('"order"')} WHERE id = ${orderId} FOR UPDATE`);
}

async function lockedReservations(tx: TransactionClient, orderId: string) {
  await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM inventory_reservation WHERE "orderId" = ${orderId} ORDER BY "productId", id FOR UPDATE`);
  return tx.inventoryReservation.findMany({ where: { orderId }, orderBy: [{ productId: 'asc' }, { id: 'asc' }] });
}

async function transactionWithRetry<T>(operation: (tx: TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= inventoryConfig.transactionMaxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { maxWait: 10_000, timeout: 20_000 });
    } catch (error: unknown) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!retryable || attempt === inventoryConfig.transactionMaxAttempts) throw error;
      logger.warn('inventory.transaction_retry', { attempt });
    }
  }
  throw new ConflictError('Inventory transaction retry limit exceeded');
}

export class InventoryService {
  static expiresAt(now = new Date()): Date {
    return new Date(now.getTime() + inventoryConfig.reservationTtlMinutes * 60_000);
  }

  static async assertPendingOrderAllowance(tx: TransactionClient, userId: string): Promise<void> {
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM user WHERE id = ${userId} FOR UPDATE`);
    const active = await tx.order.count({
      where: { userId, status: 'pending', inventoryReservations: { some: { status: InventoryReservationStatus.ACTIVE } } },
    });
    if (active >= inventoryConfig.maxActiveOrdersPerUser) {
      const error = new ConflictError('Maximum active pending orders reached');
      error.code = 'PENDING_ORDER_LIMIT';
      throw error;
    }
    const windowStart = new Date(Date.now() - inventoryConfig.orderRateWindowMinutes * 60_000);
    const recentOrders = await tx.order.count({ where: { userId, createdAt: { gte: windowStart } } });
    if (recentOrders >= inventoryConfig.maxOrdersPerWindow) {
      const error = new ConflictError('Checkout rate limit exceeded');
      error.code = 'ORDER_RATE_LIMIT';
      error.statusCode = 429;
      throw error;
    }
  }

  static async reserveOrderItems(
    tx: TransactionClient,
    orderId: string,
    items: ReadonlyArray<{ id: string; productId: string; quantity: number }>,
    expiresAt = this.expiresAt(),
  ): Promise<void> {
    const sorted = [...items].sort((left, right) => left.productId.localeCompare(right.productId));
    for (const item of sorted) {
      const affected = await tx.$executeRaw(Prisma.sql`
        UPDATE product SET "reservedQuantity" = "reservedQuantity" + ${item.quantity}
        WHERE id = ${item.productId} AND "stockQuantity" - "reservedQuantity" >= ${item.quantity}`);
      if (affected !== 1) {
        const error = new ConflictError(`Product ${item.productId} does not have enough available stock`);
        error.code = 'OUT_OF_STOCK';
        throw error;
      }
      await tx.inventoryReservation.create({
        data: { orderId, orderItemId: item.id, productId: item.productId, quantity: item.quantity, expiresAt },
      });
    }
    await enqueueOutboxEvent(tx, {
      eventType: OUTBOX_EVENT.INVENTORY_RESERVED, aggregateType: 'Order', aggregateId: orderId, orderId,
      idempotencyKey: `inventory:${OUTBOX_EVENT.INVENTORY_RESERVED}:${orderId}:${orderId}`,
      payload: { orderId, expiresAt: expiresAt.toISOString() },
    });
  }

  static async consumeForPayment(tx: TransactionClient, orderId: string, paymentId?: string, actor: OrderTransitionActor = { type: 'SYSTEM', workerId: 'internal-payment' }): Promise<'consumed' | 'duplicate' | 'late'> {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const reservations = await lockedReservations(tx, orderId);
    const active = reservations.filter((entry) => entry.status === InventoryReservationStatus.ACTIVE);
    if (active.length === 0) {
      if (reservations.length > 0 && reservations.every((entry) => entry.status === InventoryReservationStatus.CONSUMED)) return 'duplicate';
      if (!['payment_review', 'refund_required', 'refunded'].includes(order.status)) {
        await transitionOrderInTransaction(tx, { orderId, targetStatus: ORDER_STATUS.PAYMENT_REVIEW, actor, reason: 'Payment succeeded after reservation ended', idempotencyKey: `order:${orderId}:late-payment:${paymentId ?? 'unrecorded'}` });
      }
      await enqueueOutboxEvent(tx, {
        eventType: OUTBOX_EVENT.LATE_PAYMENT_REVIEW_REQUIRED, aggregateType: 'Order', aggregateId: orderId, orderId,
        idempotencyKey: `order:${orderId}:payment-late:${paymentId ?? 'unrecorded'}`,
        payload: { orderId, ...(paymentId ? { paymentId } : {}) },
      });
      return 'late';
    }
    if (active.length !== reservations.length) {
      throw new ConflictError('Order has mixed reservation states and requires reconciliation');
    }
    const now = new Date();
    for (const entry of active) {
      const changed = await tx.product.updateMany({
        where: { id: entry.productId, stockQuantity: { gte: entry.quantity }, reservedQuantity: { gte: entry.quantity } },
        data: { stockQuantity: { decrement: entry.quantity }, reservedQuantity: { decrement: entry.quantity } },
      });
      if (changed.count !== 1) throw new ConflictError('Inventory invariant violation while consuming reservation');
      await tx.product.updateMany({ where: { id: entry.productId, stockQuantity: 0 }, data: { inStock: false } });
      await tx.inventoryReservation.update({ where: { id: entry.id }, data: { status: InventoryReservationStatus.CONSUMED, consumedAt: now } });
      const stockAfter = (await tx.product.findUniqueOrThrow({ where: { id: entry.productId }, select: { stockQuantity: true } })).stockQuantity;
      await tx.inventoryMovement.create({ data: { productId: entry.productId, actorId: null, type: 'SALE', quantityDelta: -entry.quantity, stockBefore: stockAfter + entry.quantity, stockAfter, reason: 'Consumed inventory reservation', referenceType: 'InventoryReservation', referenceId: entry.id, idempotencyKey: 'consume:' + entry.id } });
    }
    if (order.status === 'pending') {
      await transitionOrderInTransaction(tx, { orderId, targetStatus: ORDER_STATUS.PAID, actor, reason: 'Payment succeeded and inventory consumed', idempotencyKey: `order:${orderId}:paid:${paymentId ?? 'internal'}` });
    }
    await enqueueOutboxEvent(tx, {
      eventType: OUTBOX_EVENT.INVENTORY_CONSUMED, aggregateType: 'Order', aggregateId: orderId, orderId,
      idempotencyKey: `inventory:${OUTBOX_EVENT.INVENTORY_CONSUMED}:${orderId}:${orderId}`, payload: { orderId },
    });
    return 'consumed';
  }

  static async consumeForCodFulfillment(tx: TransactionClient, fulfillmentId: string): Promise<'consumed' | 'duplicate'> {
    const fulfillment = await tx.sellerFulfillment.findUnique({
      where: { id: fulfillmentId },
      include: { order: { select: { id: true, paymentMethod: true } } },
    });
    if (!fulfillment) throw new ValidationError('Fulfillment not found');
    if (fulfillment.order.paymentMethod !== 'COD') throw new ValidationError('COD inventory consumption requires a COD order');
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT r.id FROM inventory_reservation r
      JOIN orderitem oi ON oi.id = r."orderItemId"
      WHERE oi."fulfillmentId" = ${fulfillmentId}
      ORDER BY r."productId", r.id FOR UPDATE`);
    const reservations = await tx.inventoryReservation.findMany({
      where: { orderItem: { fulfillmentId } },
      orderBy: [{ productId: 'asc' }, { id: 'asc' }],
    });
    if (reservations.length === 0) throw new ConflictError('Fulfillment has no inventory reservations');
    const active = reservations.filter((entry) => entry.status === InventoryReservationStatus.ACTIVE);
    if (active.length === 0 && reservations.every((entry) => entry.status === InventoryReservationStatus.CONSUMED)) return 'duplicate';
    if (active.length !== reservations.length) throw new ConflictError('Fulfillment has unavailable inventory reservations');
    const now = new Date();
    for (const entry of active) {
      const changed = await tx.product.updateMany({
        where: { id: entry.productId, stockQuantity: { gte: entry.quantity }, reservedQuantity: { gte: entry.quantity } },
        data: { stockQuantity: { decrement: entry.quantity }, reservedQuantity: { decrement: entry.quantity } },
      });
      if (changed.count !== 1) throw new ConflictError('Inventory invariant violation while consuming COD fulfillment');
      await tx.product.updateMany({ where: { id: entry.productId, stockQuantity: 0 }, data: { inStock: false } });
      await tx.inventoryReservation.update({ where: { id: entry.id }, data: { status: InventoryReservationStatus.CONSUMED, consumedAt: now } });
      const stockAfter = (await tx.product.findUniqueOrThrow({ where: { id: entry.productId }, select: { stockQuantity: true } })).stockQuantity;
      await tx.inventoryMovement.create({ data: { productId: entry.productId, actorId: null, type: 'SALE', quantityDelta: -entry.quantity, stockBefore: stockAfter + entry.quantity, stockAfter, reason: 'Consumed inventory reservation', referenceType: 'InventoryReservation', referenceId: entry.id, idempotencyKey: 'consume:' + entry.id } });
    }
    await enqueueOutboxEvent(tx, {
      eventType: OUTBOX_EVENT.INVENTORY_CONSUMED,
      aggregateType: 'SellerFulfillment', aggregateId: fulfillmentId, orderId: fulfillment.order.id,
      idempotencyKey: `inventory:${OUTBOX_EVENT.INVENTORY_CONSUMED}:${fulfillment.order.id}:${fulfillmentId}`,
      payload: { orderId: fulfillment.order.id },
    });
    return 'consumed';
  }

  static async releaseOrder(
    tx: TransactionClient,
    orderId: string,
    target: 'RELEASED' | 'EXPIRED',
    actor: OrderTransitionActor = { type: 'SYSTEM', workerId: 'inventory-worker' },
    idempotencyKey = `order:${orderId}:${target.toLowerCase()}`,
  ): Promise<number> {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (target === 'RELEASED' && order.status !== 'pending') {
      if (order.status === 'cancelled') return 0;
      const error = new ConflictError(`Invalid order transition: ${order.status} -> cancelled`);
      error.code = 'INVALID_ORDER_TRANSITION';
      throw error;
    }
    const reservations = await lockedReservations(tx, orderId);
    const active = reservations.filter((entry) => entry.status === InventoryReservationStatus.ACTIVE);
    const now = new Date();
    for (const entry of active) {
      const changed = await tx.product.updateMany({
        where: { id: entry.productId, reservedQuantity: { gte: entry.quantity } },
        data: { reservedQuantity: { decrement: entry.quantity } },
      });
      if (changed.count !== 1) throw new ConflictError('Inventory invariant violation while releasing reservation');
      await tx.inventoryReservation.update({
        where: { id: entry.id },
        data: { status: target, releasedAt: now },
      });
    }
    if (order.status === 'pending') {
      const next = target === 'EXPIRED' ? 'expired' : 'cancelled';
      await transitionOrderInTransaction(tx, { orderId, targetStatus: next === 'expired' ? ORDER_STATUS.EXPIRED : ORDER_STATUS.CANCELLED, actor, reason: target === 'EXPIRED' ? 'Inventory reservation expired' : 'Order cancelled before payment', idempotencyKey });
      if (target === 'EXPIRED') {
        await enqueueOutboxEvent(tx, {
          eventType: OUTBOX_EVENT.INVENTORY_RESERVATION_EXPIRED,
          aggregateType: 'Order', aggregateId: orderId, orderId,
          idempotencyKey: `inventory:${OUTBOX_EVENT.INVENTORY_RESERVATION_EXPIRED}:${orderId}:${orderId}`,
          payload: { orderId },
        });
      }
    }
    return active.length;
  }

  static async cancel(
    orderId: string,
    actor: OrderTransitionActor = { type: 'SYSTEM', workerId: 'inventory-service' },
    idempotencyKey = `order:${orderId}:cancel`,
  ): Promise<number> {
    return transactionWithRetry((tx) => this.releaseOrder(tx, orderId, 'RELEASED', actor, idempotencyKey));
  }
}

export class InventoryExpiryWorker {
  static async runBatch(now = new Date(), batchSize = inventoryConfig.expiryBatchSize): Promise<number> {
    const candidates = await prisma.inventoryReservation.findMany({
      where: { status: InventoryReservationStatus.ACTIVE, expiresAt: { lte: now } },
      select: { orderId: true }, distinct: ['orderId'], orderBy: { expiresAt: 'asc' }, take: Math.max(1, Math.min(batchSize, 1000)),
    });
    let released = 0;
    for (const candidate of candidates) {
      released += await transactionWithRetry(async (tx) => {
        await lockOrder(tx, candidate.orderId);
        const due = await tx.inventoryReservation.count({
          where: { orderId: candidate.orderId, status: InventoryReservationStatus.ACTIVE, expiresAt: { lte: now } },
        });
        return due > 0 ? InventoryService.releaseOrder(tx, candidate.orderId, 'EXPIRED', { type: 'SYSTEM', workerId: 'inventory-expiry' }, `order:${candidate.orderId}:expired`) : 0;
      });
    }
    return released;
  }
}

export interface ReconciliationMismatch { productId: string; stored: number; expected: number; stock: number }
export interface InventoryAnomaly {
  type: string;
  orderId: string | null;
  reservationId: string | null;
  productId: string | null;
}


export class InventoryReconciliationService {
  static async auditAnomalies(now = new Date(), limit = inventoryConfig.reconciliationBatchSize): Promise<InventoryAnomaly[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 5000));
    const anomalies = await prisma.$queryRaw<InventoryAnomaly[]>(Prisma.sql`
      SELECT 'ACTIVE_ON_PAID_ORDER' AS type, r."orderId", r.id AS reservationId, r."productId"
      FROM inventory_reservation r JOIN ${Prisma.raw('"order"')} o ON o.id = r."orderId"
      WHERE r.status = 'ACTIVE' AND o."paymentStatus" IN ('paid', 'refunded')
      UNION ALL
      SELECT 'CONSUMED_ON_UNPAID_ORDER', r."orderId", r.id, r."productId"
      FROM inventory_reservation r JOIN ${Prisma.raw('"order"')} o ON o.id = r."orderId"
      WHERE r.status = 'CONSUMED' AND o."paymentStatus" NOT IN ('paid', 'refunded')
      UNION ALL
      SELECT 'OVERDUE_ACTIVE', r."orderId", r.id, r."productId"
      FROM inventory_reservation r WHERE r.status = 'ACTIVE' AND r."expiresAt" <= ${now}
      UNION ALL
      SELECT 'INVALID_PRODUCT_COUNTS', NULL, NULL, p.id
      FROM product p WHERE p."stockQuantity" < 0 OR p."reservedQuantity" < 0 OR p."reservedQuantity" > p."stockQuantity"
      UNION ALL
      SELECT 'SUCCEEDED_PAYMENT_ORDER_UNPAID', p."orderId", NULL, NULL
      FROM payment p JOIN ${Prisma.raw('"order"')} o ON o.id = p."orderId"
      WHERE p.status = 'completed' AND o."paymentStatus" NOT IN ('paid', 'refunded')
      UNION ALL
      SELECT 'EXPIRED_ORDER_ACTIVE', r."orderId", r.id, r."productId"
      FROM inventory_reservation r JOIN ${Prisma.raw('"order"')} o ON o.id = r."orderId"
      WHERE o.status = 'expired' AND r.status = 'ACTIVE'
      LIMIT ${boundedLimit}`);
    for (const anomaly of anomalies) logger.error('inventory.reconciliation_anomaly', undefined, { ...anomaly });
    return anomalies;
  }

  static async run(options: { repair?: boolean; batchSize?: number } = {}): Promise<ReconciliationMismatch[]> {
    const client: PrismaClient = prisma;
    await this.auditAnomalies(new Date(), options.batchSize ?? inventoryConfig.reconciliationBatchSize);
    const products = await client.product.findMany({
      select: { id: true, stockQuantity: true, reservedQuantity: true }, orderBy: { id: 'asc' },
      take: Math.max(1, Math.min(options.batchSize ?? inventoryConfig.reconciliationBatchSize, 5000)),
    });
    const mismatches: ReconciliationMismatch[] = [];
    for (const product of products) {
      const aggregate = await client.inventoryReservation.aggregate({
        where: { productId: product.id, status: InventoryReservationStatus.ACTIVE }, _sum: { quantity: true },
      });
      const expected = aggregate._sum.quantity ?? 0;
      if (expected === product.reservedQuantity) continue;
      const mismatch = { productId: product.id, stored: product.reservedQuantity, expected, stock: product.stockQuantity };
      mismatches.push(mismatch);
      logger.error('inventory.reconciliation_mismatch', undefined, mismatch);
      if (options.repair) {
        if (expected < 0 || expected > product.stockQuantity) throw new ValidationError('Refusing unsafe inventory reconciliation repair', mismatch);
        await client.$transaction(async (tx) => {
          await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM product WHERE id = ${product.id} FOR UPDATE`);
          const current = await tx.inventoryReservation.aggregate({
            where: { productId: product.id, status: InventoryReservationStatus.ACTIVE }, _sum: { quantity: true },
          });
          const safeExpected = current._sum.quantity ?? 0;
          const lockedProduct = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
          if (safeExpected > lockedProduct.stockQuantity) throw new ValidationError('Refusing unsafe inventory reconciliation repair', mismatch);
          await tx.product.update({ where: { id: product.id }, data: { reservedQuantity: safeExpected } });
        });
      }
    }
    return mismatches;
  }
}
