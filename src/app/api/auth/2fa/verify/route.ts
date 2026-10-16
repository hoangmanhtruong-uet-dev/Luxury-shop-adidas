import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import prisma from '@/lib/db';
import speakeasy from 'speakeasy';
import { SessionService } from '@/lib/services/auth/session.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit/rate-limit';
import { getRateLimitIdentity } from '@/lib/network/client-ip';

export async function POST(request: Request) {
  try {
    // Phase 2.4 (Warning W3): the 2FA routes were the only auth-adjacent
    // endpoints with no rate limiting at all.
    const limiter = await rateLimit(getRateLimitIdentity(request, '2fa-verify'), {
      windowMs: 15 * 60 * 1000,
      max: 10,
    });
    if (!limiter.success) return getRateLimitResponse(limiter);

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Mã token không hợp lệ' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { twoFactorSecret: true, isTwoFactorEnabled: true },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu cấu hình 2FA' }, { status: 400 });
    }

    if (user.isTwoFactorEnabled) {
      return NextResponse.json({ error: '2FA đã được bật từ trước' }, { status: 400 });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      // Phase 2.4: was `window: 1`, which accepted the same code for 90 seconds.
      window: 0,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Mã xác thực không chính xác' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { isTwoFactorEnabled: true },
    });

    // Enabling 2FA is a security-relevant change: evict other sessions.
    await SessionService.revokeAllUserSessions(session.userId);

    return NextResponse.json({ success: true, message: 'Đã bật 2FA thành công' });
  } catch (error) {
    console.error('[2FA_VERIFY]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
