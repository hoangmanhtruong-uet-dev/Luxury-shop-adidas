import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth/auth';
import { enforceManualWalletMutationPolicy } from '@/lib/security/manual-wallet-mutation-guard';
import { ManualWalletMutationDisabledError } from '@/lib/security/manual-wallet-mutation-policy';
import { Money, normalizeCurrency, parseMoneyInput, serializeMoneyFields } from '@/lib/utils/money';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    enforceManualWalletMutationPolicy('admin-balance-adjustment', '/api/admin/users/:id/balance');
    const actor = await requireAdmin();
    const params = await context.params;
    const body = await req.json() as Record<string, unknown>;
    const currency = normalizeCurrency(body.currency ?? 'VND');
    if ((body.amount === undefined) === (body.balance === undefined)) {
      return NextResponse.json({ error: 'Provide exactly one of amount or balance as a decimal string' }, { status: 400 });
    }
    const requested = parseMoneyInput(body.amount ?? body.balance, { allowZero: body.balance !== undefined, field: body.amount !== undefined ? 'amount' : 'balance' });
    const referenceId = randomUUID();
    const updated = await prisma.$transaction(async (tx) => {
      // Keep the production invariant adjacent to the write as well as at the
      // route boundary so a future service extraction cannot bypass it.
      enforceManualWalletMutationPolicy('admin-balance-adjustment', '/api/admin/users/:id/balance');
      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM user WHERE id = ${params.id} FOR UPDATE`);
      const wallet = await tx.user.findUniqueOrThrow({ where: { id: params.id }, select: { id: true, name: true, email: true, balance: true, currency: true } });
      if (wallet.currency !== currency) throw new Error('currency mismatch');
      const balanceAfter = body.amount !== undefined ? Money.round(Money.add(wallet.balance, requested)) : Money.round(requested);
      const signedAmount = Money.subtract(balanceAfter, wallet.balance);
      const user = await tx.user.update({ where: { id: params.id }, data: { balance: balanceAfter }, select: { id: true, name: true, email: true, balance: true, currency: true } });
      await tx.walletLedger.create({ data: {
        userId: params.id, refundId: null, deterministicKey: `admin-adjustment:${referenceId}`,
        referenceType: 'AdminAdjustment', referenceId, amount: signedAmount, balanceBefore: wallet.balance,
        balanceAfter, currency, entryType: 'ADMIN_ADJUSTMENT',
      } });
      await tx.domainAuditLog.create({ data: {
        action: 'WALLET_ADMIN_ADJUSTMENT', actorId: 'userId' in actor ? String(actor.userId) : null,
        entityType: 'User', entityId: params.id,
        details: JSON.stringify({ referenceId, amount: Money.serialize(signedAmount), currency }),
      } });
      return user;
    });
    return NextResponse.json(serializeMoneyFields(updated));
  } catch (error) {
    if (error instanceof ManualWalletMutationDisabledError) {
      return NextResponse.json({
        error: { code: error.code, message: error.message },
      }, { status: error.statusCode });
    }
    console.error('[PATCH /api/admin/users/:id/balance]', error);
    // Phase 3.4 (Warning W4): this endpoint mutates real wallet balances and
    // previously returned `error.message` verbatim with status 400 — leaking
    // Prisma/MySQL internals (P2025, deadlock text, host/port/database name) and
    // mis-reporting server faults as client errors.
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi server' } },
      { status: 500 },
    );
  }
}
