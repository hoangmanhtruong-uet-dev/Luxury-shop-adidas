import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth/auth';
import { Money, serializeMoneyFields } from '@/lib/utils/money';
import { voucherMoneySchema } from '@/lib/validations';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const raw = await req.json() as Record<string, unknown>;
    const parsed = voucherMoneySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    const code = typeof raw.code === 'string' ? raw.code.toUpperCase().trim() : '';
    const discountType = raw.discountType === 'percentage' || raw.discountType === 'fixed' ? raw.discountType : null;
    if (!code || !discountType || typeof raw.endDate !== 'string') return NextResponse.json({ error: 'Invalid voucher' }, { status: 400 });
    if (discountType === 'percentage' && Money.compare(parsed.data.discountValue, '100') > 0) return NextResponse.json({ error: 'Percentage discount must not exceed 100' }, { status: 400 });
    const voucher = await prisma.voucher.create({ data: {
      code, description: typeof raw.description === 'string' ? raw.description : null, discountType,
      discountValue: parsed.data.discountValue, minOrderValue: parsed.data.minOrderValue, maxDiscount: parsed.data.maxDiscount ?? null,
      currency: parsed.data.currency, sellerId: session.userId, endDate: new Date(raw.endDate),
      usageLimit: typeof raw.usageLimit === 'number' && Number.isInteger(raw.usageLimit) ? raw.usageLimit : 100,
    } });
    return NextResponse.json(serializeMoneyFields(voucher));
  } catch (error) {
    // Phase 3.4 (Warning W4): this returned `error.message` verbatim with a 400,
    // leaking raw Prisma/MySQL text (host, database name, driver internals) and
    // mis-reporting server faults as client errors.
    logger.error('admin.vouchers.create_failed', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server' } },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  // Phase 3.4 (Warning W8): bounded + paginated. This previously returned the
  // entire voucher table.
  try {
    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(serializeMoneyFields(vouchers));
  } catch (error) {
    logger.error('admin.vouchers.list_failed', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server' } },
      { status: 500 },
    );
  }
}
