import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import prisma from '@/lib/db';
import { PasswordService } from '@/lib/services/auth/password.service';
import { SessionService } from '@/lib/services/auth/session.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit/rate-limit';
import { getRateLimitIdentity } from '@/lib/network/client-ip';
import { z } from 'zod';

const bodySchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
});

/**
 * POST /api/auth/2fa/disable
 *
 * Phase 2.4 (Warning W3): this endpoint previously required NOTHING but a valid
 * session cookie. A hijacked cookie or an XSS could permanently strip a user's
 * second factor. Turning 2FA off is now a step-up operation requiring the current
 * password, it is rate limited, and every existing session is revoked so the
 * attacker holding the stolen cookie is evicted.
 */
export async function POST(request: Request) {
  try {
    const limiter = await rateLimit(getRateLimitIdentity(request, '2fa-disable'), {
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    if (!limiter.success) return getRateLimitResponse(limiter);

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, password: true, isTwoFactorEnabled: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const matches = await PasswordService.verify(parsed.data.currentPassword, user.password);
    if (!matches) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 403 });
    }

    if (!user.isTwoFactorEnabled) {
      return NextResponse.json({ success: true, message: '2FA đã được tắt' });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null },
    });

    // Evict every other session so a stolen cookie loses access immediately.
    await SessionService.revokeAllUserSessions(session.userId);

    return NextResponse.json({ success: true, message: 'Đã tắt 2FA thành công' });
  } catch (error) {
    console.error('[2FA_DISABLE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}