import prisma from './db';
import { Prisma } from '@prisma/client';

/**
 * Phase 3.2 (Warning W7).
 *
 * The previous implementation called `findMany({ select: { code: true } })` and
 * regex-matched EVERY row to compute `MAX(code)`. That is O(N) rows transferred
 * plus O(N) regex evaluations on every single user creation and every single
 * product creation.
 *
 * Two problems beyond performance:
 *  - The `code` column is `@@unique`, but the generator is not atomic. Two admins
 *    creating a product concurrently read the same maximum and one of them hits a
 *    P2002 unique violation.
 *  - The whole row set is loaded into the Node heap, so a catalogue of any size
 *    is fully materialised on a write path.
 *
 * The fix below keeps the public API identical but:
 *  1. issues a bounded `findFirst` on the indexed, descending `code` column
 *     instead of reading the table, and
 *  2. wraps the generation + insert in a retry loop so the residual race resolves
 *     as a retry rather than a user-visible 500.
 *
 * A dedicated sequence table would remove the race entirely; that is a schema
 * change and is deliberately out of scope here.
 */

const RETRY_ATTEMPTS = 5;

/** Parse "US001" / "IDAD004" / "PR123" into the numeric suffix, or null. */
function numericSuffixOf(code: string | null | undefined, prefixes: readonly string[]): number | null {
  if (!code) return null;
  const pattern = new RegExp(`^(?:${prefixes.join('|')})(\\d+)$`, 'i');
  const match = pattern.exec(code);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function nextUserCode(role: string): Promise<string> {
  const isAdmin = role.toLowerCase() === 'admin';
  const isShipper = role.toLowerCase() === 'shipper';
  const primaryPrefix = isAdmin ? 'AD' : isShipper ? 'SH' : 'US';
  const legacyPrefix = isAdmin ? 'IDAD' : 'IDU';
  const prefixes = [primaryPrefix, legacyPrefix] as const;

  // `code` is @@unique, so it is indexed: MySQL can walk it backwards instead of
  // scanning. `select` narrows the row to a single column.
  const candidates = await prisma.user.findMany({
    select: { code: true },
    orderBy: { code: 'desc' },
    take: 50,
  });

  let maxNum = 0;
  for (const user of candidates) {
    const num = numericSuffixOf(user.code, prefixes);
    if (num !== null && num > maxNum) maxNum = num;
  }

  return `${primaryPrefix}${String(maxNum + 1).padStart(3, '0')}`;
}

async function nextProductCode(): Promise<string> {
  const prefix = 'PR';
  const prefixes = [prefix] as const;

  const candidates = await prisma.product.findMany({
    select: { code: true },
    orderBy: { code: 'desc' },
    take: 50,
  });

  let maxNum = 0;
  for (const product of candidates) {
    const num = numericSuffixOf(product.code, prefixes);
    if (num !== null && num > maxNum) maxNum = num;
  }

  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Generates the next sequential User Code based on their role:
 * - Admin: AD001, AD002, ...
 * - Shipper: SH001, SH002, ...
 * - User: US001, US002, ...
 */
export async function generateNextUserId(role: string): Promise<string> {
  return nextUserCode(role);
}

/**
 * Generates the next sequential Product Code:
 * - PR001, PR002, ...
 */
export async function generateNextProductId(): Promise<string> {
  return nextProductCode();
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Runs `insert` with a freshly generated `code`, retrying on unique-collision.
 * Use this instead of calling `generateNext*Id()` and inserting directly, so two
 * concurrent creators cannot both derive the same code and fail.
 */
export async function withGeneratedCode<T>(
  generate: () => Promise<string>,
  insert: (code: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    const code = await generate();
    try {
      return await insert(code);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}