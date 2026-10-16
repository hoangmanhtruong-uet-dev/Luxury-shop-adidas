import { createHash } from 'node:crypto';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { createNotificationProvider, type NotificationProvider } from './notification-provider';
import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function recipientHash(recipient: string): string {
  return createHash('sha256').update(recipient).digest('hex').slice(0, 12);
}

/** Phase 3.4 (Warning W10): bound every outbound email call. */
const EMAIL_TIMEOUT_MS = 10_000;

export class EmailService {
  static provider: NotificationProvider = createNotificationProvider();
  // Phase 3.4 (Warning W10): the Resend SDK has no timeout option, so the call is
  // bounded explicitly. Note this legacy direct-SDK branch bypasses the provider's
  // X-Idempotency-Key path; the outbox route uses `provider` instead.
  static resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  static fromEmail = env.RESEND_FROM_ADDRESS || 'Acme <onboarding@resend.dev>';

  /** Bound any provider call so a hung socket cannot hold the request open. */
  private static async withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label}-timeout`)), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.resend) {
        const { data, error } = await this.withTimeout(
          this.resend.emails.send({
            from: this.fromEmail,
            to: [options.to],
            subject: options.subject,
            text: options.text,
            html: options.html,
          }),
          EMAIL_TIMEOUT_MS,
          'resend-send',
        );

        if (error) {
          // Phase 3.4: the raw `console.error('Resend Error:', error)` dumped the
          // SDK error object (which can echo request bodies and key prefixes) to
          // stdout. Structured logging only, with the recipient hashed.
          logger.error('resend.email.failed', undefined, {
            recipientHash: recipientHash(options.to),
            reason: error.message,
          });
          return false;
        }

        logger.info('resend.email.sent', { recipientHash: recipientHash(options.to), id: data?.id });
        return true;
      }

      await this.withTimeout(
        this.provider.send({
          channel: 'email',
          recipient: options.to,
          template: 'generic-email',
          idempotencyKey: createHash('sha256').update(`generic-email:${options.to}:${options.subject}:${options.text}`).digest('hex'),
          data: {
            subject: options.subject,
            text: options.text,
            ...(options.html ? { html: options.html } : {}),
          },
        }),
        EMAIL_TIMEOUT_MS,
        'notification-provider',
      );
      logger.info('email.accepted', { recipientHash: recipientHash(options.to), template: 'generic-email' });
      return true;
    } catch (error) {
      logger.error('email.failed', error, { recipientHash: recipientHash(options.to) });
      return false;
    }
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Khôi phục mật khẩu</h2>
        <p>Bạn đã yêu cầu khôi phục mật khẩu. Vui lòng bấm vào nút bên dưới để đổi mật khẩu mới:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">Đổi mật khẩu</a>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Link sẽ hết hạn sau 60 phút.</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Yêu cầu khôi phục mật khẩu - Cún-shop',
      text: `Vui lòng truy cập link sau để khôi phục mật khẩu: ${resetUrl}`,
      html,
    });
  }

  static async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xác thực địa chỉ Email</h2>
        <p>Chào mừng bạn đến với Cún-shop! Vui lòng xác thực email bằng cách bấm vào nút bên dưới:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">Xác thực Email</a>
        <p>Nếu bạn không tạo tài khoản, vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Link sẽ hết hạn sau 60 phút.</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Xác thực tài khoản của bạn - Cún-shop',
      text: `Vui lòng truy cập link sau để xác thực email: ${verifyUrl}`,
      html,
    });
  }
}