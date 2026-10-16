/**
 * POST /api/payments/vnpay/ipn
 * VNPay IPN (Instant Payment Notification) webhook.
 * VNPay server gọi endpoint này để thông báo kết quả thanh toán server-to-server.
 * KHÔNG yêu cầu auth — phải verify bằng chữ ký HMAC-SHA512.
 *
 * Response phải trả về trong 5 giây, theo định dạng:
 *   { RspCode: "00", Message: "Confirmed" }  — thành công
 *   { RspCode: "97", Message: "..." }         — lỗi chữ ký
 *   { RspCode: "01", Message: "..." }         — order không tồn tại
 *   { RspCode: "04", Message: "..." }         — số tiền không khớp
 *   { RspCode: "02", Message: "..." }         — order đã xử lý
 */
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getVNPayProvider } from '@/lib/services/payment/vnpay-provider';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { PaymentService } from '@/lib/services/payment/payment.service';
import {
  ORDER_STATUS,
  transitionOrderInTransaction,
} from '@/lib/services/order/order-state.service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const vnpay = getVNPayProvider();
    if (!vnpay) {
      return NextResponse.json({ RspCode: '99', Message: 'Provider not configured' });
    }

    const body = await req.json();
    const { RspCode, Message, result } = vnpay.verifyIpn(body);

    if (RspCode !== '00') {
      return NextResponse.json({ RspCode, Message });
    }

    // Tìm order trong DB
    const order = await prisma.order.findUnique({
      where: { id: result.txnRef },
      select: { id: true, status: true, total: true, paymentStatus: true },
    });

    if (!order) {
      logger.warn('vnpay.ipn.order_not_found', { txnRef: result.txnRef });
      return NextResponse.json({ RspCode: '01', Message: 'Order not found' });
    }

    // Kiểm tra số tiền khớp (tolerance 1 VND)
    const orderTotal = Math.round(Number(order.total));
    if (Math.abs(orderTotal - result.amount) > 1) {
      logger.warn('vnpay.ipn.amount_mismatch', {
        txnRef: result.txnRef,
        expected: orderTotal,
        received: result.amount,
      });
      return NextResponse.json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // Kiểm tra đã xử lý chưa
    if (order.paymentStatus === 'completed' || order.status === ORDER_STATUS.PAID) {
      logger.info('vnpay.ipn.already_processed', { txnRef: result.txnRef });
      return NextResponse.json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    // Phase 1.6: the previous version wrote `paymentStatus`/`status` directly,
    // which skipped inventory consumption, the wallet ledger, the payment record
    // and the ORDER_PAID outbox event. It also left the order with no transition
    // history, so the reconciliation job reported a permanent mismatch.
    await prisma.$transaction(async (tx) => {
      // Lock the row so two concurrent IPN deliveries cannot both proceed.
      await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM ${Prisma.raw('"order"')} WHERE id = ${order.id} FOR UPDATE`,
      );
      const fresh = await tx.order.findUnique({
        where: { id: order.id },
        select: { status: true, paymentStatus: true },
      });
      if (!fresh) throw new Error(`Order ${order.id} disappeared during IPN handling`);
      if (fresh.paymentStatus === 'completed' || fresh.status === ORDER_STATUS.PAID) return;

      if (result.isSuccess) {
        await PaymentService.recordWebhookSuccess(tx, {
          orderId: order.id,
          provider: 'VNPAY',
          providerEventId: String(result.transactionNo ?? result.txnRef),
        });
        await transitionOrderInTransaction(tx, {
          orderId: order.id,
          targetStatus: ORDER_STATUS.PAID,
          actor: { type: 'PAYMENT_WEBHOOK', provider: 'VNPAY' },
          reason: 'VNPay payment confirmed',
          idempotencyKey: `vnpay:${result.transactionNo ?? result.txnRef}:paid`,
        });
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'completed', paidAt: new Date() },
        });

        logger.info('vnpay.ipn.payment_confirmed', {
          orderId: order.id,
          amount: result.amount,
          transactionNo: result.transactionNo,
          bankCode: result.bankCode,
        });
      } else {
        await transitionOrderInTransaction(tx, {
          orderId: order.id,
          targetStatus: ORDER_STATUS.PAYMENT_FAILED,
          actor: { type: 'PAYMENT_WEBHOOK', provider: 'VNPAY' },
          reason: 'VNPay payment failed',
          idempotencyKey: `vnpay:${result.transactionNo ?? result.txnRef}:failed`,
        });
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'failed' },
        });

        logger.warn('vnpay.ipn.payment_failed', {
          orderId: order.id,
          responseCode: result.responseCode,
        });
      }
    });

    return NextResponse.json({ RspCode: '00', Message: 'Confirmed' });
  } catch (error) {
    logger.error('vnpay.ipn.error', error);
    // RspCode 99 makes VNPay retry. The success path is now idempotent, so a
    // retry after a partial failure is safe.
    return NextResponse.json({ RspCode: '99', Message: 'Unknown error' });
  }
}