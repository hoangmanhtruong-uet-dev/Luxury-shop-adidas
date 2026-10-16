import { readFileSync } from 'node:fs';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { Money } from '@/lib/utils/money';

const MONEY_NAMES = /(?:price|amount|total|subtotal|discount|balance|fee|tax|revenue|credit|debit)/i;
const LEGACY_STATUSES = ['PENDING', 'RETRY', 'PROCESSING'];

type CountRow = { count: bigint | number };
type ColumnRow = { tableName: string; columnName: string; dataType: string; columnType: string };
type CheckRow = { constraintName: string };

function count(value: bigint | number): number { return typeof value === 'bigint' ? Number(value) : value; }
function hasNumericMoney(value: unknown, key = ''): boolean {
  if (typeof value === 'number' && MONEY_NAMES.test(key)) return true;
  if (Array.isArray(value)) return value.some((item) => hasNumericMoney(item, key));
  if (value && typeof value === 'object') return Object.entries(value).some(([childKey, child]) => hasNumericMoney(child, childKey));
  return false;
}

async function main() {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const staticFloatFields = schema.split(/\r?\n/).filter((line) => MONEY_NAMES.test(line) && /\bFloat\b/.test(line));
  const unsafeDomain = [
    ['order', readFileSync('src/lib/services/order/order.service.ts', 'utf8')],
    ['payment', readFileSync('src/lib/services/payment/payment.service.ts', 'utf8')],
    ['late-refund', readFileSync('src/lib/services/payment/late-payment-refund.service.ts', 'utf8')],
    ['outbox-consumer', readFileSync('src/lib/services/outbox/outbox-consumers.ts', 'utf8')],
  ].flatMap(([name, source]) => /parseFloat|\.toNumber\(|Number\.EPSILON|\bamount\s*[+\-*/]|\btotal\s*[+\-*/]/.test(source) ? [name] : []);

  // Postgres information_schema uses lowercase unquoted names (table_name, …);
  // the aliases keep the TypeScript row types unchanged.
  const dbColumns = await prisma.$queryRaw<ColumnRow[]>(Prisma.sql`
    SELECT table_name "tableName", column_name "columnName", data_type "dataType", udt_name "columnType"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND LOWER(data_type) IN ('real','double precision')`);
  const floatingMoneyColumns = dbColumns.filter((column) => MONEY_NAMES.test(column.columnName) && column.columnName !== 'rating');
  const decimalColumns = await prisma.$queryRaw<ColumnRow[]>(Prisma.sql`
    SELECT table_name "tableName", column_name "columnName", data_type "dataType", udt_name "columnType"
    FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type = 'numeric' ORDER BY table_name, ordinal_position`);

  const [orderMismatch] = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*) count FROM ${Prisma.raw('"order"')}
    WHERE total <> ROUND(subtotal - "discountAmount" + "shippingFee" + "taxAmount", 4)`);
  const [paymentMismatch] = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*) count FROM payment p
    WHERE p."refundedAmount" <> COALESCE((SELECT SUM(r.amount) FROM refund r WHERE r."paymentId"=p.id AND r.status IN ('completed','SUCCEEDED')),0)
       OR p."refundedAmount" > p.amount`);
  const [ledgerMismatch] = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*) count FROM wallet_ledger WHERE "balanceAfter" <> "balanceBefore" + amount`);
  const [walletTailMismatch] = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*) count FROM "user" u JOIN wallet_ledger wl ON wl.id=(
      SELECT w2.id FROM wallet_ledger w2 WHERE w2."userId"=u.id ORDER BY w2."createdAt" DESC,w2.id DESC LIMIT 1
    ) WHERE u.balance <> wl."balanceAfter"`);

  const pending = await prisma.outboxEvent.findMany({ where: { status: { in: LEGACY_STATUSES } }, select: { id: true, payload: true } });
  const legacyPayloadIds = pending.flatMap((event) => {
    try { return hasNumericMoney(JSON.parse(event.payload) as unknown) ? [event.id] : []; } catch { return []; }
  });
  const checks = await prisma.$queryRaw<CheckRow[]>(Prisma.sql`
    SELECT constraint_name "constraintName" FROM information_schema.check_constraints
    WHERE constraint_schema = 'public' AND constraint_name LIKE 'ck\_%'`);

  const report = {
    staticFloatFields,
    unsafeDomain,
    floatingMoneyColumns,
    decimalColumns,
    anomalies: {
      orderTotalMismatch: count(orderMismatch?.count ?? 0),
      paymentRefundMismatch: count(paymentMismatch?.count ?? 0),
      ledgerEquationMismatch: count(ledgerMismatch?.count ?? 0),
      walletTailMismatch: count(walletTailMismatch?.count ?? 0),
      legacyNumericOutboxPayloads: legacyPayloadIds.length,
    },
    legacyNumericOutboxPayloadIds: legacyPayloadIds,
    checkConstraints: checks.map((row) => row.constraintName).sort(),
    exampleDecimalAggregate: Money.serialize((await prisma.order.aggregate({ _sum: { total: true } }))._sum.total ?? '0'),
  };
  console.log(JSON.stringify(report, null, 2));
  const anomalyCount = Object.values(report.anomalies).reduce((sum, value) => sum + value, 0);
  if (staticFloatFields.length || unsafeDomain.length || floatingMoneyColumns.length || anomalyCount) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
