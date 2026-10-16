import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import prisma from '@/lib/db';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { PasswordService } from '@/lib/services/auth/password.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit/rate-limit';
import { getRateLimitIdentity } from '@/lib/network/client-ip';
import { z } from 'zod';

const bodySchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
});

/**
 * POST /api/auth/2fa/generate
 *
 * Phase 2.4 (Warning W3): this used to overwrite `twoFactorSecret` for any
 * session holder, letting an attacker silently replace a user's authenticator.
 * Re-enrolment is now a step-up operation requiring the current password.
 */
export async function POST(request: Request) {
  try {
    const limiter = await rateLimit(getRateLimitIdentity(request, '2fa-generate'), {
      windowMs: 15 * 60 * 1000,
      max: 5,
    });
    if (!limiter.success) return getRateLimitResponse(limiter);

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, password: true, isTwoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 });
    }

    if (user.isTwoFactorEnabled) {
      return NextResponse.json({ error: '2FA đã được bật' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const matches = await PasswordService.verify(parsed.data.currentPassword, user.password);
    if (!matches) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 403 });
    }

    const secret = speakeasy.generateSecret({ name: `Cún shop (${user.email})` });
    const qrUrl = await QRCode.toDataURL(secret.otpauth_url!);

    await prisma.user.update({
      where: { id: session.userId },
      data: { twoFactorSecret: secret.base32 },
    });

    return NextResponse.json({ qrUrl, secret: secret.base32 });
  } catch (error) {
    console.error('[2FA_GENERATE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}