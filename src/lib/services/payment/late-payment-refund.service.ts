import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { enqueueOutboxEvent, OUTBOX_EVENT } from '@/lib/services/outbox/outbox.service';
import { Money } from '@/lib/utils/money';
import { ORDER_STATUS, transitionOrderInTransaction } from '@/lib/services/order/order-state.service';

const APPROVAL_ATTEMPTS = 4;

export class LatePaymentRefundService {
  static async approve(orderId: string, actorId: string, client: PrismaClient = prisma) {
    for (let attempt = 1; attempt <= APPROVAL_ATTEMPTS; attempt += 1) {
      try {
        return await client.$transaction(async (tx) => {
          await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
            SELECT id FROM ${Prisma.raw('"order"')} WHERE id = ${orderId} FOR UPDATE`);
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order) throw new NotFoundError('Order not found');
          const payment = await tx.payment.findUnique({ where: { orderId } });
          if (!payment) throw new ConflictError('Late payment has no durable payment record');
          await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM payment WHERE id = ${payment.id} FOR UPDATE`);

          const approvalKey = `order:${order.id}:late-refund:${payment.id}`;
          const existing = await tx.refund.findUnique({ where: { approvalKey } });
          if (existing) return { refund: existing, replayed: true };
          if (order.status !== 'payment_review' || order.paymentStatus !== 'paid_late' || payment.status !== 'SUCCEEDED_LATE') {
            throw new ConflictError('Order is not awaiting a late-payment refund decision');
          }
          if (payment.currency !== 'VND') throw new ConflictError('Unsupported refund currency');
          const refundable = Money.round(Money.subtract(payment.amount, payment.refundedAmount));
          if (!Money.isPositive(refundable)) throw new ConflictError('Payment has no refundable balance');

          const refund = await tx.refund.create({
            data: {
              paymentId: payment.id,
              userId: payment.userId,
              amount: refundable,
              status: 'PENDING',
              operation: `late-payment:refund:${payment.id}`,
              idempotencyKey: approvalKey,
              approvalKey,
              currency: payment.currency,
              provider: payment.provider,
              providerOutcome: 'PENDING',
              approvedBy: actorId,
              approvedAt: new Date(),
            },
          });
          await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUND_PENDING' } });
          await transitionOrderInTransaction(tx, { orderId: order.id, targetStatus: ORDER_STATUS.REFUND_PENDING, actor: { type: 'ADMIN', userId: actorId }, reason: 'Late payment refund approved', idempotencyKey: `order:${order.id}:refund-pending:${payment.id}` });
          await enqueueOutboxEvent(tx, {
            eventType: OUTBOX_EVENT.REFUND_REQUIRED,
            aggregateType: 'Refund',
            aggregateId: refund.id,
            orderId: order.id,
            idempotencyKey: `order:${order.id}:refund-required:${payment.id}`,
            payload: { orderId: order.id, paymentId: payment.id, refundId: refund.id, amount: Money.serialize(refund.amount), currency: refund.currency },
          });
          await tx.domainAuditLog.create({
            data: {
              action: 'LATE_PAYMENT_REFUND_APPROVED', actorId,
              entityType: 'Refund', entityId: refund.id,
              details: JSON.stringify({ orderId: order.id, paymentId: payment.id }),
            },
          });
          return { refund, replayed: false };
        }, { maxWait: 10_000, timeout: 20_000 });
      } catch (error: unknown) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (retryable && attempt < APPROVAL_ATTEMPTS) continue;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const payment = await client.payment.findUnique({ where: { orderId } });
          if (payment) {
            const existing = await client.refund.findUnique({ where: { approvalKey: `order:${orderId}:late-refund:${payment.id}` } });
            if (existing) return { refund: existing, replayed: true };
          }
        }
        throw error;
      }
    }
    throw new ConflictError('Refund approval retry limit exceeded');
  }
}
