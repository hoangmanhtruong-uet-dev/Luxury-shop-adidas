import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import payOS from '@/lib/payment/payos';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { PaymentService } from '@/lib/services/payment/payment.service';
import {
  ORDER_STATUS,
  transitionOrderInTransaction,
} from '@/lib/services/order/order-state.service';
import { Money } from '@/lib/utils/money';

export const runtime = 'nodejs'; // PayOS SDK uses crypto

/** The PayOS envelope is `{ code, desc, success, data, signature }`. */
interface PayOsEnvelope {
  code?: unknown;
  desc?: unknown;
  success?: unknown;
}

function isSuccessfulEnvelope(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const envelope = body as PayOsEnvelope;
  // PayOS uses code '00' for success. Require BOTH so a malformed payload that
  // merely carries `success: true` cannot mark an order as paid.
  return envelope.success === true && String(envelope.code) === '00';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Xác thực chữ ký dữ liệu Webhook từ PayOS (HMAC SHA256)
    const webhookData = await payOS.webhooks.verify(body);

    if (!webhookData || !webhookData.orderCode) {
      return NextResponse.json({ success: false, message: 'Invalid webhook data' }, { status: 400 });
    }

    const orderCode = String(webhookData.orderCode);

    // A failed payment must never advance the order. Ack the delivery (so PayOS
    // stops retrying) but leave the order untouched.
    if (!isSuccessfulEnvelope(body)) {
      logger.warn('payos.webhook.not_successful', {
        orderCode,
        code: (body as PayOsEnvelope)?.code,
        desc: (body as PayOsEnvelope)?.desc,
      });
      return NextResponse.json({ success: true, message: 'Acknowledged' });
    }

    // Tìm order tương ứng thông qua idempotencyScope
    const order = await prisma.order.findFirst({
      where: { idempotencyScope: orderCode },
      select: { id: true, total: true, paymentStatus: true, status: true },
    });

    if (!order) {
      // 404 so PayOS keeps retrying — the order may not be committed yet.
      logger.error('payos.webhook.order_not_found', undefined, { orderCode });
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Compare the provider-reported amount against the order total. Without this,
    // an under/over-payment would be silently accepted.
    const received = parseMoneyAmount(webhookData.amount);
    if (received === null || Money.compare(received, order.total) !== 0) {
      logger.error('payos.webhook.amount_mismatch', undefined, {
        orderCode,
        orderId: order.id,
        expected: Money.serialize(order.total),
        received: webhookData.amount,
      });
      // 500 -> PayOS retries; a human must reconcile the mismatch.
      return NextResponse.json({ success: false, message: 'Amount mismatch' }, { status: 500 });
    }

    logger.info('payos.webhook.received', { orderCode, orderId: order.id, amount: Money.serialize(received) });

    if (order.paymentStatus === 'completed' || order.status === ORDER_STATUS.PAID) {
      logger.info('payos.webhook.already_processed', { orderCode, orderId: order.id });
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    await prisma.$transaction(async (tx) => {
      // Re-read under a row lock so concurrent duplicate deliveries cannot both pass.
      const fresh = await tx.order.findUnique({
        where: { id: order.id },
        select: { id: true, status: true, paymentStatus: true },
      });
      if (!fresh) throw new Error(`Order ${order.id} disappeared during webhook handling`);
      if (fresh.paymentStatus === 'completed' || fresh.status === ORDER_STATUS.PAID) return;

      // Route through PaymentService so the payment row, inventory consumption
      // and wallet ledger are all written. The previous implementation skipped
      // all of this, leaving stock reserved forever and no money trail.
      await PaymentService.recordWebhookSuccess(tx, {
        orderId: order.id,
        provider: 'PAYOS',
        providerEventId: String(webhookData.reference ?? orderCode),
      });

      // Route through the order state machine so the transition history stays
      // consistent and ORDER_PAID is emitted to the outbox exactly once.
      await transitionOrderInTransaction(tx, {
        orderId: order.id,
        targetStatus: ORDER_STATUS.PAID,
        actor: { type: 'PAYMENT_WEBHOOK', provider: 'PAYOS' },
        reason: 'PayOS payment confirmed',
        idempotencyKey: `payos:${orderCode}:paid`,
      });

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'completed', paidAt: new Date() },
      });
    });

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error('payos.webhook.error', error);
    // 500 so PayOS retries — this path covers transient DB failures.
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

/** PayOS sends a plain integer VND amount; reject anything non-canonical. */
function parseMoneyAmount(value: unknown): Prisma.Decimal | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return new Prisma.Decimal(value);
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) return new Prisma.Decimal(value);
  return null;
}