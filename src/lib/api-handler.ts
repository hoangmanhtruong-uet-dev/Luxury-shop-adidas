import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { logger } from './logger';
import { serializeMoneyFields } from './utils/money';

type Handler<P> = (req: NextRequest, params?: P) => Promise<unknown>;

interface MappedError {
  status: number;
  code: string;
  message: string;
  metadata?: unknown;
}

export function apiHandler<P = unknown>(handler: Handler<P>) {
  return async (req: NextRequest, params?: P) => {
    const requestId = crypto.randomUUID();
    try {
      const result = await handler(req, params);
      if (result instanceof NextResponse) return result;
      return NextResponse.json(serializeMoneyFields(result));
    } catch (error: unknown) {
      const { status, code, message, metadata } = mapError(error);
      if (status >= 500) logger.error(`[API_ERROR] ${req.method} ${req.url}`, error, { requestId });
      else logger.warn(`[API_WARN] ${req.method} ${req.url}`, { requestId, code, message });

      return NextResponse.json({
        error: {
          code, message, requestId,
          ...(process.env.NODE_ENV === 'development'
            ? { metadata, stack: error instanceof Error ? error.stack : undefined }
            : {}),
        },
      }, { status });
    }
  };
}

export const createHandler = apiHandler;

/**
 * Prisma codes that mean "the database is unreachable / overloaded / deadlocked",
 * not "the client sent something invalid".
 *
 * Phase 3.4 (Warning W5): these were previously mapped to HTTP 400. A 30-second
 * database outage therefore surfaced as a client error, so clients, CDNs and
 * retry policies all refused to retry and every in-flight order was silently
 * lost. They must be 503 with a retryable status.
 */
const DATABASE_UNAVAILABLE_CODES = new Set([
  'P1000', // authentication failed
  'P1001', // can't reach database server
  'P1002', // database server timed out
  'P1008', // operation timed out
  'P1017', // server has closed the connection
  'P2024', // timed out fetching a connection from the pool
  'P2034', // write conflict / deadlock
]);

function mapError(error: unknown): MappedError {
  if (error instanceof AppError) {
    // `metadata` may carry provider payloads; keep it off the wire entirely.
    return { status: error.statusCode, code: error.code, message: error.message, metadata: error.metadata };
  }
  if (error instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: error.errors[0]?.message || 'Dữ liệu không hợp lệ',
      metadata: error.errors,
    };
  }
  // Only a real Prisma error should be classified by code. The previous check was
  // `'code' in error && error.code.startsWith('P')`, which matched ANY object with
  // a string `code` beginning with "P" — including unrelated thrown values.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (DATABASE_UNAVAILABLE_CODES.has(error.code)) {
      return {
        status: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Dịch vụ tạm thời không ổn định. Vui lòng thử lại sau.',
      };
    }
    return { status: 400, code: 'DATABASE_ERROR', message: 'Lỗi truy vấn dữ liệu' };
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Dịch vụ tạm thời không ổn định. Vui lòng thử lại sau.',
    };
  }
  return { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Đã có lỗi xảy ra, vui lòng thử lại sau' };
}
