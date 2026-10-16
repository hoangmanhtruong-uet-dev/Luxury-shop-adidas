import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import type { TransactionClient } from '@/lib/services/idempotency.service';
import { InventoryService } from '@/lib/services/fulfillment/inventory.service';
import { buildProviderIdempotencyKey, internalWalletProvider } from '@/lib/services/payment/payment-provider';
import { Money, assertSameCurrency } from '@/lib/utils/money';
import { ORDER_STATUS, transitionOrderInTransaction } from '@/lib/services/order/order-state.service';

export class PaymentService {
  static async recordWebhookSuccess(tx: TransactionClient, input: { orderId: string; provider: string; providerEventId: string }) {
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw('"order"')} WHERE id = ${input.orderId} FOR UPDATE`);
    const order = await tx.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new NotFoundError('Webhook references an unknown order');
    if (!order.userId) throw new ValidationError('Paid order has no wallet owner');
    const digest = createHash('sha256').update(`${input.provider}:${input.orderId}`).digest('hex');
    const payment = await tx.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id, userId: order.userId, amount: order.total, status: 'SUCCEEDED',
        operation: `webhook:payment:${order.id}`, idempotencyKey: input.providerEventId,
        provider: input.provider, providerOutcome: 'SUCCEEDED', currency: order.currency,
        providerIdempotencyKey: `webhook-payment:${digest}`, providerTransactionId: `webhook-txn:${digest}`,
      },
      update: {},
    });
    assertSameCurrency(payment.currency, order.currency);
    const outcome = await InventoryService.consumeForPayment(tx, order.id, payment.id, { type: 'PAYMENT_WEBHOOK', provider: input.provider });
    if (outcome === 'late' && payment.status !== 'SUCCEEDED_LATE') return tx.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED_LATE' } });
    return payment;
  }

  static async create(tx: TransactionClient, input: { orderId: string; userId: string; idempotencyKey: string }) {
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw('"order"')} WHERE id = ${input.orderId} FOR UPDATE`);
    const order = await tx.order.findFirst({ where: { id: input.orderId, userId: input.userId } });
    if (!order) throw new NotFoundError('Không tìm thấy đơn hàng');
    if (order.paymentStatus === 'paid') throw new ConflictError('Đơn hàng đã được thanh toán');
    if (order.paymentStatus === 'refunded' || ['cancelled', 'returned'].includes(order.status)) throw new ConflictError('Không thể thanh toán đơn hàng đã hủy, trả hoặc hoàn tiền');

    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM user WHERE id = ${input.userId} FOR UPDATE`);
    const wallet = await tx.user.findUnique({ where: { id: input.userId }, select: { balance: true, currency: true } });
    if (!wallet) throw new NotFoundError('Không tìm thấy ví');
    assertSameCurrency(wallet.currency, order.currency);
    if (Money.compare(wallet.balance, order.total) < 0) throw new ValidationError('Số dư không đủ');

    const operation = `payment:create:${order.id}`;
    const providerIdempotencyKey = buildProviderIdempotencyKey(operation, input.userId, input.idempotencyKey);
    const providerResult = await internalWalletProvider.createPayment(
      { orderId: order.id, userId: input.userId, amount: Money.serialize(order.total), currency: order.currency }, providerIdempotencyKey,
    );
    if (providerResult.outcome !== 'SUCCEEDED') throw new ConflictError(`Payment provider outcome: ${providerResult.outcome}`);

    const balanceAfter = Money.round(Money.subtract(wallet.balance, order.total));
    await tx.user.update({ where: { id: input.userId }, data: { balance: balanceAfter } });
    const payment = await tx.payment.create({ data: {
      orderId: order.id, userId: input.userId, amount: order.total, operation, idempotencyKey: input.idempotencyKey,
      providerIdempotencyKey, providerTransactionId: providerResult.transactionId, providerOutcome: providerResult.outcome, currency: order.currency,
    } });
    await tx.walletLedger.create({ data: {
      userId: input.userId, refundId: null, deterministicKey: `payment:${payment.id}:wallet-debit`, referenceType: 'Payment', referenceId: payment.id,
      amount: Money.subtract('0', order.total), balanceBefore: wallet.balance, balanceAfter, currency: order.currency, entryType: 'PAYMENT_DEBIT',
    } });
    await InventoryService.consumeForPayment(tx, order.id, payment.id, { type: 'SYSTEM', workerId: 'internal-wallet-payment' });
    const { idempotencyKey: _idempotencyKey, ...safePayment } = payment;
    return safePayment;
  }
}

export class RefundService {
  static async create(tx: TransactionClient, input: { paymentId: string; userId: string; amount: Prisma.Decimal; currency: string; idempotencyKey: string }) {
    if (!Money.isPositive(input.amount)) throw new ValidationError('Số tiền hoàn phải lớn hơn 0');
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM payment WHERE id = ${input.paymentId} FOR UPDATE`);
    const payment = await tx.payment.findFirst({ where: { id: input.paymentId, userId: input.userId } });
    if (!payment) throw new NotFoundError('Không tìm thấy giao dịch thanh toán');
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw('"order"')} WHERE id = ${payment.orderId} FOR UPDATE`);
    let order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
    if (order.status !== ORDER_STATUS.REFUND_PENDING) {
      order = await transitionOrderInTransaction(tx, { orderId: order.id, targetStatus: ORDER_STATUS.REFUND_PENDING, actor: { type: 'SYSTEM', workerId: 'refund-service' }, reason: 'Refund requested', idempotencyKey: `refund-pending:${input.idempotencyKey}` });
    }
    assertSameCurrency(input.currency, payment.currency);
    const nextRefunded = Money.round(Money.add(payment.refundedAmount, input.amount));
    if (Money.compare(nextRefunded, payment.amount) > 0) throw new ConflictError('Tổng số tiền hoàn vượt quá số tiền đã thanh toán');

    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM user WHERE id = ${input.userId} FOR UPDATE`);
    const wallet = await tx.user.findUnique({ where: { id: input.userId }, select: { balance: true, currency: true } });
    if (!wallet) throw new NotFoundError('Không tìm thấy ví');
    assertSameCurrency(wallet.currency, payment.currency);

    const operation = `payment:refund:${payment.id}`;
    const providerIdempotencyKey = buildProviderIdempotencyKey(operation, input.userId, input.idempotencyKey);
    const providerResult = await internalWalletProvider.createRefund(
      { paymentId: payment.id, userId: input.userId, amount: Money.serialize(input.amount), currency: payment.currency }, providerIdempotencyKey,
    );
    if (providerResult.outcome !== 'SUCCEEDED') throw new ConflictError(`Payment provider outcome: ${providerResult.outcome}`);

    const refund = await tx.refund.create({ data: {
      paymentId: payment.id, userId: input.userId, amount: Money.round(input.amount), operation,
      idempotencyKey: input.idempotencyKey, providerRefundId: providerResult.transactionId,
      providerOutcome: providerResult.outcome, currency: payment.currency,
    } });
    const balanceAfter = Money.round(Money.add(wallet.balance, input.amount));
    await tx.user.update({ where: { id: input.userId }, data: { balance: balanceAfter } });
    await tx.walletLedger.create({ data: {
      userId: input.userId, refundId: refund.id, deterministicKey: `refund:${refund.id}:wallet-credit`, referenceType: 'Refund', referenceId: refund.id,
      amount: input.amount, balanceBefore: wallet.balance, balanceAfter, currency: payment.currency, entryType: 'REFUND_CREDIT',
    } });
    const fullyRefunded = Money.compare(nextRefunded, payment.amount) === 0;
    await tx.payment.update({ where: { id: payment.id }, data: { status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED', refundedAmount: nextRefunded } });
    if (fullyRefunded) await transitionOrderInTransaction(tx, { orderId: payment.orderId, targetStatus: ORDER_STATUS.REFUNDED, actor: { type: 'SYSTEM', workerId: 'refund-service' }, reason: 'Full refund completed', idempotencyKey: `refund-completed:${input.idempotencyKey}` });
    const { idempotencyKey: _idempotencyKey, ...safeRefund } = refund;
    return safeRefund;
  }
}
