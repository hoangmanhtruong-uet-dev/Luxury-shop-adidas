import { NextRequest, NextResponse } from 'next/server';
import { orderRequestSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth/auth';
import prisma from '@/lib/db';
import { OrderService } from '@/lib/services/order/order.service';
import { verifyPaymentPinOrThrow } from '@/lib/security/payment-pin-policy';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, AppError, ValidationError } from '@/lib/errors';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { requireIdempotencyKey } from '@/lib/idempotency/idempotency';
import { logger } from '@/lib/logger';

export const GET = createHandler(async () => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  return OrderService.getOrders(session.userId, session.role);
});

export const POST = createHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError('Đăng nhập là bắt buộc để tạo đơn hàng');
  const idempotencyKey = requireIdempotencyKey(req.headers);
  const parsed = orderRequestSchema.parse(await req.json());
  const { paymentPin, bankId, paymentPhone, ...orderInput } = parsed;

  if (['Banking', 'MoMo'].includes(parsed.paymentMethod)) {
    await verifyPaymentPinOrThrow(session.userId, paymentPin);
  }

  if (parsed.paymentMethod === 'Banking') {
    const bank = await prisma.bankInfo.findFirst({ where: { id: bankId, userId: session.userId }, select: { id: true } });
    if (!bank) throw new ValidationError('Tài khoản ngân hàng không hợp lệ');
  }

  const safeRequest = { ...orderInput, bankId, paymentPhone };
  const outcome = await IdempotencyService.execute({
    scopeId: session.userId,
    operation: 'order:create',
    method: req.method,
    signal: req.signal,
    key: idempotencyKey,
    request: safeRequest,
    handler: async (tx) => {
      const order = await OrderService.createOrderInTransaction(tx, { ...orderInput, userId: session.userId, idempotencyKey });

      let orderCode: string | null = null;
      if (orderInput.paymentMethod === 'PayOS') {
        // Reserve a PayOS orderCode INSIDE the transaction so the webhook mapping
        // becomes durable at the same time as the order.
        orderCode = String(createPayOsOrderCode());
        await tx.order.update({
          where: { id: order.id },
          data: { idempotencyScope: orderCode },
        });
      }

      return { status: 201, body: { ...order, orderCode }, resourceType: 'order', resourceId: order.id };
    },
  });

  // Phase 1.7: the PayOS API call MUST NOT run inside the 30s database transaction.
  // @payos/node defaults to a 60s timeout x 3 retries (~4 minutes); a slow provider
  // rolled the transaction back, losing the order while the payment link already
  // existed at PayOS — the customer paid and the system had no order.
  let checkoutUrl: string | null = null;
  const created = outcome.body as { id?: string; total?: unknown; orderCode?: string | null };
  if (created.orderCode && orderInput.paymentMethod === 'PayOS' && typeof created.id === 'string') {
    const orderId = created.id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
      const payOS = (await import('@/lib/payment/payos')).default;
      const paymentLink = await payOS.paymentRequests.create({
        orderCode: Number(created.orderCode),
        amount: Number(created.total),
        description: `Thanh toan DH ${orderId.slice(0, 5)}`,
        returnUrl: `${appUrl}/checkout/payment?status=success&orderId=${orderId}`,
        cancelUrl: `${appUrl}/checkout/payment?status=cancel&orderId=${orderId}`,
      });
      checkoutUrl = paymentLink.checkoutUrl;
    } catch (error: unknown) {
      // The order is already committed and recoverable. Log loudly for alerting,
      // and never leak the provider's raw error text to the client.
      logger.error('payos.create_payment_request_failed', error, {
        orderId,
        orderCode: created.orderCode,
      });
      throw new AppError(
        'Không tạo được link thanh toán, vui lòng thử lại sau.',
        502,
        'PAYMENT_PROVIDER_UNAVAILABLE',
      );
    }
  }

  return NextResponse.json({ ...outcome.body, checkoutUrl }, {
    status: outcome.status,
    headers: outcome.replayed ? { 'Idempotency-Replayed': 'true' } : undefined,
  });
});

/**
 * PayOS orderCode must be a positive integer <= Number.MAX_SAFE_INTEGER.
 * Derived from a millisecond timestamp plus a random suffix so it stays unique,
 * replacing `Math.floor(Math.random() * 1e9)` which could collide and let one
 * order's webhook mark a different order as paid.
 */
function createPayOsOrderCode(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}