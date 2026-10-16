/**
 * POST /api/payments/vnpay/create-url
 * Tạo URL redirect sang VNPay payment gateway.
 *
 * Body: { orderId: string; orderInfo?: string; bankCode?: string }
 *
 * CRITICAL (Phase 1.5): `amount` is NO LONGER accepted from the client and the
 * order is loaded from the DB and scoped to the caller. Previously the endpoint
 * trusted `body.orderId` and `body.amount`, so any authenticated user could mint
 * a signed gateway URL for somebody else's order at an arbitrary amount.
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth/auth';
import { getVNPayProvider } from '@/lib/services/payment/vnpay-provider';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit/rate-limit';
import { getRateLimitIdentity } from '@/lib/network/client-ip';
import { Money } from '@/lib/utils/money';
import { z } from 'zod';

export const runtime = 'nodejs';

const schema = z.object({
  orderId: z.string().min(1),
  orderInfo: z.string().max(255).optional(),
  bankCode: z.string().optional(),
}).strict();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest) {
  try {
    const limiter = await rateLimit(getRateLimitIdentity(req, 'vnpay-create-url'), {
      windowMs: 10 * 60 * 1000,
      max: 20,
    });
    if (!limiter.success) return getRateLimitResponse(limiter);

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vnpay = getVNPayProvider();
    if (!vnpay) {
      return NextResponse.json(
        { error: 'VNPay chưa được cấu hình. Vui lòng liên hệ admin.' },
        { status: 503 }
      );
    }

    const body = schema.parse(await req.json());

    // Ownership check: the order MUST belong to the authenticated caller.
    const order = await prisma.order.findFirst({
      where: { id: body.orderId, userId: session.userId },
      select: { id: true, total: true, status: true, paymentStatus: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    // Amount is authoritative from the database, never from the request body.
    const amount = Math.round(Number(order.total));
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Số tiền đơn hàng không hợp lệ' }, { status: 409 });
    }

    const paymentUrl = vnpay.createPaymentUrl({
      orderId: order.id,
      amount,
      orderInfo: body.orderInfo ?? `Thanh toan don hang ${order.id.slice(0, 8)}`,
      ipAddress: getClientIp(req),
      bankCode: body.bankCode,
    });

    return NextResponse.json({ paymentUrl, amount: Money.serialize(order.total) });
  } catch (error) {
    console.error('[VNPAY_CREATE_URL]', error);
    return NextResponse.json({ error: 'Lỗi tạo URL thanh toán' }, { status: 500 });
  }
}