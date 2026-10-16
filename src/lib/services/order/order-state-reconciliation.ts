import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export interface OrderStateAnomaly {
  type: string;
  orderId: string;
  details: string | null;
}

export class OrderStateReconciliationService {
  static async audit(limit = 500): Promise<OrderStateAnomaly[]> {
    const bounded = Math.max(1, Math.min(limit, 5000));
    const anomalies = await prisma.$queryRaw<OrderStateAnomaly[]>(Prisma.sql`
      SELECT 'PAID_WITHOUT_SUCCEEDED_PAYMENT' type, o.id orderId, o.status details
      FROM ${Prisma.raw('"order"')} o LEFT JOIN payment p ON p."orderId" = o.id
      WHERE o.status IN ('paid','confirmed','packing','shipping','delivered')
        AND (p.id IS NULL OR p.status NOT IN ('SUCCEEDED','completed'))
      UNION ALL
      SELECT 'SHIPPING_WITHOUT_TRACKING', o.id, o.status FROM ${Prisma.raw('"order"')} o
      WHERE o.status = 'shipping' AND (o."trackingNumber" IS NULL OR o."trackingNumber" = '')
      UNION ALL
      SELECT 'DELIVERED_WITHOUT_TIMESTAMP', o.id, o.status FROM ${Prisma.raw('"order"')} o
      WHERE o.status = 'delivered' AND o."deliveredAt" IS NULL
      UNION ALL
      SELECT 'CANCELLED_WITH_ACTIVE_RESERVATION', o.id, o.status
      FROM ${Prisma.raw('"order"')} o JOIN inventory_reservation r ON r."orderId" = o.id
      WHERE o.status = 'cancelled' AND r.status = 'ACTIVE'
      UNION ALL
      SELECT 'CANCELLED_PAID_WITHOUT_REFUND', o.id, o."paymentStatus" FROM ${Prisma.raw('"order"')} o
      LEFT JOIN payment p ON p."orderId" = o.id LEFT JOIN refund f ON f."paymentId" = p.id
      WHERE o.status = 'cancelled' AND o."paymentStatus" IN ('paid','paid_late') AND f.id IS NULL
      UNION ALL
      SELECT 'REFUNDED_AMOUNT_INCOMPLETE', o.id, o.status FROM ${Prisma.raw('"order"')} o
      JOIN payment p ON p."orderId" = o.id WHERE o.status = 'refunded' AND p."refundedAmount" < p.amount
      UNION ALL
      SELECT 'RETURNED_WITHOUT_RETURN_RECORD', o.id, o.status FROM ${Prisma.raw('"order"')} o
      LEFT JOIN order_return r ON r."orderId" = o.id AND r.status = 'COMPLETED'
      WHERE o.status = 'returned' AND r.id IS NULL
      UNION ALL
      SELECT 'TERMINAL_WITH_ACTIVE_RESERVATION', o.id, o.status FROM ${Prisma.raw('"order"')} o
      JOIN inventory_reservation r ON r."orderId" = o.id
      WHERE o.status IN ('cancelled','expired','refunded','returned','return_rejected') AND r.status = 'ACTIVE'
      UNION ALL
      SELECT 'TRANSITION_HISTORY_MISMATCH', o.id, concat(t."toStatus", '!=', o.status)
      FROM ${Prisma.raw('"order"')} o JOIN order_status_transition t ON t.id = (
        SELECT t2.id FROM order_status_transition t2 WHERE t2."orderId" = o.id ORDER BY t2."createdAt" DESC, t2.id DESC LIMIT 1
      ) WHERE t."toStatus" <> o.status
      UNION ALL
      SELECT 'LEGACY_OR_UNKNOWN_STATUS', o.id, o.status FROM ${Prisma.raw('"order"')} o
      WHERE o.status NOT IN ('pending','paid','payment_failed','confirmed','packing','shipping','delivered','expired','cancelled','payment_review','refund_pending','refunded','return_requested','return_approved','return_rejected','returning','returned')
      LIMIT ${bounded}`);
    for (const anomaly of anomalies) logger.warn('order_state.reconciliation_anomaly', { ...anomaly });
    return anomalies;
  }
}