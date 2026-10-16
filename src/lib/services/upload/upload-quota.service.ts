import { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import prisma from '@/lib/db';

const RESERVATION_TTL_MS = 15 * 60 * 1000;
const BUCKET_RETENTION_MS = 24 * 60 * 60 * 1000;

export interface UploadQuotaLimits {
  filesPerDay: number;
  bytesPerDay: number;
}

export interface UploadQuotaReservation {
  id: string;
  userId: string;
  periodStart: Date;
  expiresAt: Date;
  quotaResetAt: Date;
}

export interface PersistedUploadAsset {
  storageKey: string;
  url: string;
  purpose: 'avatar' | 'product';
  resourceId?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export class UploadQuotaExceededError extends Error {
  readonly code = 'UPLOAD_QUOTA_EXCEEDED';
  readonly status = 429;

  constructor(public readonly resetAt: Date) {
    super('Daily upload quota exceeded');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UploadQuotaBackendError extends Error {
  readonly code = 'UPLOAD_QUOTA_BACKEND_UNAVAILABLE';
  readonly status = 503;

  constructor(cause?: unknown) {
    super('Upload quota backend is unavailable', { cause });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function quotaLimits(): UploadQuotaLimits {
  return {
    filesPerDay: env.UPLOAD_DAILY_FILE_LIMIT,
    bytesPerDay: env.UPLOAD_DAILY_BYTE_LIMIT,
  };
}

export function utcQuotaWindow(now: Date): { periodStart: Date; resetAt: Date; retentionUntil: Date } {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const resetAt = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
  return { periodStart, resetAt, retentionUntil: new Date(resetAt.getTime() + BUCKET_RETENTION_MS) };
}

function validateReservationInput(
  fileSizes: readonly number[],
  limits: UploadQuotaLimits,
  resetAt: Date,
): bigint {
  if (fileSizes.length < 1) throw new TypeError('At least one file is required');
  let total = 0n;
  for (const size of fileSizes) {
    if (!Number.isSafeInteger(size) || size <= 0) throw new TypeError('Upload size must be a positive safe integer');
    total += BigInt(size);
  }
  if (fileSizes.length > limits.filesPerDay || total > BigInt(limits.bytesPerDay)) {
    throw new UploadQuotaExceededError(resetAt);
  }
  return total;
}

export async function reserveUploadQuota(
  userId: string,
  fileSizes: readonly number[],
  now: Date = new Date(),
  limits: UploadQuotaLimits = quotaLimits(),
): Promise<UploadQuotaReservation> {
  const { periodStart, resetAt, retentionUntil } = utcQuotaWindow(now);
  const bytesReserved = validateReservationInput(fileSizes, limits, resetAt);
  const reservationExpiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);

  try {
    return await prisma.$transaction(async (tx) => {
      // Postgres equivalent of ON DUPLICATE KEY UPDATE. The composite PK
      // (userId, periodStart) is the conflict target; a conflicting row means the
      // bucket already exists for this window, so only the timestamp advances.
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO upload_quota_bucket
          ("userId", "periodStart", "requestCount", "fileCount", "bytesUsed", "expiresAt", "createdAt", "updatedAt")
        VALUES
          (${userId}, ${periodStart}, 0, 0, 0, ${retentionUntil}, ${now}, ${now})
        ON CONFLICT ("userId", "periodStart") DO UPDATE SET "updatedAt" = ${now}
      `);

      const rows = await tx.$queryRaw<Array<{ fileCount: number; bytesUsed: bigint }>>(Prisma.sql`
        SELECT "fileCount", "bytesUsed"
        FROM upload_quota_bucket
        WHERE "userId" = ${userId} AND "periodStart" = ${periodStart}
        FOR UPDATE
      `);

      const bucket = rows[0];
      if (!bucket) throw new UploadQuotaExceededError(resetAt);

      if (
        bucket.fileCount + fileSizes.length > limits.filesPerDay ||
        bucket.bytesUsed + bytesReserved > BigInt(limits.bytesPerDay)
      ) {
        throw new UploadQuotaExceededError(resetAt);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE upload_quota_bucket
        SET "requestCount" = "requestCount" + 1,
            "fileCount" = "fileCount" + ${fileSizes.length},
            "bytesUsed" = "bytesUsed" + ${bytesReserved},
            "updatedAt" = ${now}
        WHERE "userId" = ${userId} AND "periodStart" = ${periodStart}
      `);

      const reservation = await tx.uploadReservation.create({
        data: {
          userId,
          quotaPeriodStart: periodStart,
          fileCount: fileSizes.length,
          bytesReserved,
          expiresAt: reservationExpiresAt,
        },
        select: { id: true },
      });
      return { id: reservation.id, userId, periodStart, expiresAt: reservationExpiresAt, quotaResetAt: resetAt };
    });
  } catch (error) {
    if (error instanceof UploadQuotaExceededError) throw error;
    throw new UploadQuotaBackendError(error);
  }
}

export async function recordReservationStorageKeys(reservationId: string, keys: readonly string[]): Promise<void> {
  try {
    const result = await prisma.uploadReservation.updateMany({
      where: { id: reservationId, status: 'RESERVED' },
      data: { storageKeys: JSON.stringify(keys) },
    });
    if (result.count !== 1) throw new Error('Upload reservation is no longer active');
  } catch (error) {
    throw new UploadQuotaBackendError(error);
  }
}

export async function finalizeUploadReservation(
  reservation: UploadQuotaReservation,
  assets: readonly PersistedUploadAsset[],
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.uploadReservation.updateMany({
        where: { id: reservation.id, userId: reservation.userId, status: 'RESERVED' },
        data: { status: 'COMPLETED', storageKeys: JSON.stringify(assets.map((asset) => asset.storageKey)) },
      });
      if (claimed.count !== 1) throw new Error('Upload reservation is no longer active');

      await tx.uploadAsset.createMany({
        data: assets.map((asset) => ({
          userId: reservation.userId,
          storageKey: asset.storageKey,
          url: asset.url,
          purpose: asset.purpose,
          resourceId: asset.resourceId,
          originalName: asset.originalName,
          mimeType: asset.mimeType,
          sizeBytes: BigInt(asset.sizeBytes),
        })),
      });
    });
  } catch (error) {
    throw new UploadQuotaBackendError(error);
  }
}

function parseStorageKeys(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

export async function releaseUploadReservation(reservationId: string, now: Date = new Date()): Promise<string[]> {
  try {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        userId: string;
        quotaPeriodStart: Date;
        fileCount: number;
        bytesReserved: bigint;
        storageKeys: string | null;
        status: string;
      }>>(Prisma.sql`
        SELECT "userId", "quotaPeriodStart", "fileCount", "bytesReserved", "storageKeys", status
        FROM upload_reservation
        WHERE id = ${reservationId}
        FOR UPDATE
      `);
      const reservation = rows[0];
      if (!reservation || reservation.status !== 'RESERVED') return [];

      await tx.uploadReservation.update({
        where: { id: reservationId },
        data: { status: 'RELEASED', expiresAt: now },
      });
      await tx.$executeRaw(Prisma.sql`
        UPDATE upload_quota_bucket
        SET "requestCount" = GREATEST(0, "requestCount" - 1),
            "fileCount" = GREATEST(0, "fileCount" - ${reservation.fileCount}),
            "bytesUsed" = GREATEST(0, "bytesUsed" - ${reservation.bytesReserved}),
            "updatedAt" = ${now}
        WHERE "userId" = ${reservation.userId}
          AND "periodStart" = ${reservation.quotaPeriodStart}
      `);
      return parseStorageKeys(reservation.storageKeys);
    });
  } catch (error) {
    throw new UploadQuotaBackendError(error);
  }
}

export async function findExpiredUploadReservationIds(now: Date = new Date(), take = 100): Promise<string[]> {
  const rows = await prisma.uploadReservation.findMany({
    where: { status: 'RESERVED', expiresAt: { lt: now } },
    orderBy: { expiresAt: 'asc' },
    take,
    select: { id: true },
  });
  return rows.map((row) => row.id);
}
