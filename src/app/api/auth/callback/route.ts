import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import prisma from '@/lib/db';
import { AuthService } from '@/lib/services/auth/auth.service';
import { SessionService } from '@/lib/services/auth/session.service';
import { logger } from '@/lib/logger';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

/**
 * Only allow same-origin, absolute-path redirects.
 * Mirrors the guard used by the login page. Prevents `?next=//evil.tld` or
 * `?next=https://evil.tld` from turning the OAuth callback into an open redirect.
 */
function safeNextPath(candidate: string | null): string {
  if (!candidate) return '/';
  if (!candidate.startsWith('/')) return '/';
  if (candidate.startsWith('//')) return '/';
  if (candidate.startsWith('/\\')) return '/';
  return candidate;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  // Phase 2.2: never log the full URL — it carries the OAuth authorization `code`.
  logger.debug('auth.callback.invoked');

  const code = requestUrl.searchParams.get('code');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = safeNextPath(requestUrl.searchParams.get('next'));

  if (!code) {
    logger.warn('auth.callback.missing_code', { errorDescription: errorDescription ?? undefined });
    return NextResponse.redirect(`${origin}/login`);
  }

  // 1. Trao đổi Auth Code lấy Session từ Supabase
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    logger.warn('auth.callback.exchange_failed', { message: error?.message });
    return NextResponse.redirect(`${origin}/login?error=GoogleAuthFailed`);
  }

  const email = data.session.user.email;
  const name =
    (data.session.user.user_metadata?.name as string | undefined) ??
    (data.session.user.user_metadata?.full_name as string | undefined) ??
    'Người dùng Google';

  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=EmailRequired`);
  }

  try {
    // 2. Kiểm tra xem người dùng đã tồn tại trong DB Prisma chưa
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Vì đăng nhập bằng Google nên mật khẩu tạo ngẫu nhiên, không quan trọng
      const randomPassword = randomBytes(32).toString('hex');
      const password = await bcrypt.hash(randomPassword, 10);
      const uniqueCode = `US-${randomBytes(4).toString('hex').toUpperCase()}`;

      user = await prisma.user.create({
        data: {
          email,
          name,
          password,
          code: uniqueCode,
          role: 'user',
        },
      });
    }

    // Phase 2.2 (Critical #10): an admin-locked account must not be able to sign
    // in through the OAuth path. `login` and `google-verify` both enforced this;
    // this callback did not, so `isActive = false` was trivially bypassable.
    if (!user.isActive) {
      logger.warn('auth.callback.account_disabled', { userId: user.id });
      return NextResponse.redirect(`${origin}/login?error=AccountDisabled`);
    }

    // 3. Khởi tạo Token cho hệ thống
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
    const isSeller = sellerProfile?.status === 'APPROVED';

    const accessToken = await AuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      isSeller: !!isSeller,
      name: user.name,
    });

    // Phase 2.2: the previous code generated the refresh token with
    // `Math.random()` and never persisted it, so the session could not be revoked
    // by logout or by an admin. Route it through SessionService like every other
    // login path — 40 random bytes, SHA-256 at rest, revocable.
    const { refreshToken, expiresAt: refreshExpiresAt } = await SessionService.createSession(
      user.id,
      request.headers.get('user-agent') ?? undefined,
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    );

    // 4. Lưu JWT vào Cookie và chuyển hướng
    await AuthService.setAuthCookiesInStore(accessToken, refreshToken, refreshExpiresAt);

    return NextResponse.redirect(`${origin}${next}`);
  } catch (error) {
    logger.error('auth.callback.database_error', error);
    return NextResponse.redirect(`${origin}/login?error=ServerError`);
  }
}