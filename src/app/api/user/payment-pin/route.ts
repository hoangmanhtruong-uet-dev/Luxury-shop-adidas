import { z } from 'zod';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, AuthorizationError } from '@/lib/errors';
import { PasswordService } from '@/lib/services/auth/password.service';
import { SessionService } from '@/lib/services/auth/session.service';
import { rateLimit } from '@/lib/rate-limit/rate-limit';
import { getRateLimitIdentity } from '@/lib/network/client-ip';

const pinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'Mã PIN phải gồm đúng 6 chữ số'),
  // Phase 2.4 (Warning W3): setting the payment PIN is now a step-up operation.
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
});

export const PUT = createHandler(async (req) => {
  const limiter = await rateLimit(getRateLimitIdentity(req, 'payment-pin'), {
    windowMs: 15 * 60 * 1000,
    max: 5,
  });
  if (!limiter.success) {
    return new Response(JSON.stringify({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await getSession();
  if (!session) throw new AuthenticationError();

  const parsed = pinSchema.parse(await req.json());

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, password: true },
  });
  if (!user) throw new AuthorizationError('Không tìm thấy người dùng');

  const matches = await PasswordService.verify(parsed.currentPassword, user.password);
  if (!matches) throw new AuthorizationError('Mật khẩu hiện tại không chính xác');

  const paymentPinHash = await PasswordService.hash(parsed.pin);
  await prisma.user.update({ where: { id: session.userId }, data: { paymentPinHash } });

  // A changed payment PIN invalidates every outstanding session, since the old
  // PIN may have been the compromised factor.
  await SessionService.revokeAllUserSessions(session.userId);

  return { success: true, hasPaymentPin: true };
});