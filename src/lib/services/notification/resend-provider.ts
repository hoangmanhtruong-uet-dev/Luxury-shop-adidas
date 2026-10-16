import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import type { NotificationInput, NotificationProvider, NotificationResult } from './notification-provider';

function recipientHash(recipient: string): string {
  return createHash('sha256').update(recipient).digest('hex').slice(0, 12);
}

/**
 * ResendNotificationProvider — gửi email thật qua Resend.com API.
 * Requires RESEND_API_KEY env variable.
 * Resend free tier: 3,000 emails/tháng, 100/ngày.
 */
export class ResendNotificationProvider implements NotificationProvider {
  private readonly client: Resend;
  private readonly fromAddress: string;

  constructor(apiKey: string, fromAddress = 'Cún-shop <noreply@cun-shop.vn>') {
    this.client = new Resend(apiKey);
    this.fromAddress = fromAddress;
  }

  async send(input: NotificationInput): Promise<NotificationResult> {
    if (input.channel !== 'email') {
      throw new Error(`ResendNotificationProvider: unsupported channel "${input.channel}"`);
    }

    const subject = input.data.subject ?? this.getDefaultSubject(input.template);
    const html = input.data.html ?? this.buildHtml(input.template, input.data);
    const text = input.data.text ?? this.buildText(input.template, input.data);

    const { data, error } = await this.client.emails.send({
      from: this.fromAddress,
      to: input.recipient,
      subject,
      html,
      text,
      headers: {
        'X-Idempotency-Key': input.idempotencyKey,
      },
    });

    if (error || !data) {
      logger.error('resend.send_failed', error, { recipientHash: recipientHash(input.recipient), template: input.template });
      throw new Error(`Resend error: ${error?.message ?? 'unknown'}`);
    }

    logger.info('resend.send_accepted', {
      messageId: data.id,
      recipientHash: recipientHash(input.recipient),
      template: input.template,
    });

    return { messageId: data.id };
  }

  private getDefaultSubject(template: string): string {
    const subjects: Record<string, string> = {
      'password-reset': '[Cún-shop] Đặt lại mật khẩu của bạn',
      'order-confirmed': '[Cún-shop] Xác nhận đơn hàng',
      'order-paid': '[Cún-shop] Thanh toán đơn hàng thành công 🎉',
      'order-shipped': '[Cún-shop] Đơn hàng đang được giao',
      'order-delivered': '[Cún-shop] Đơn hàng đã giao thành công',
      'order-cancelled': '[Cún-shop] Đơn hàng đã bị hủy',
      'refund-completed': '[Cún-shop] Hoàn tiền thành công',
      'generic-email': '[Cún-shop] Thông báo',
    };
    return subjects[template] ?? '[Cún-shop] Thông báo';
  }

  private buildHtml(template: string, data: Record<string, string>): string {
    const BASE_STYLE = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0B1120; color: #e2e8f0; max-width: 600px; margin: 0 auto;
    `;
    const BRAND_HEADER = `
      <div style="background: linear-gradient(135deg, #f97316 0%, #e11d48 100%); padding: 28px 32px; border-radius: 16px 16px 0 0;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: white; letter-spacing: -0.5px;">
          🛍️ Cún-shop
        </h1>
      </div>
    `;
    const FOOTER = `
      <div style="background: #1e293b; padding: 20px 32px; border-radius: 0 0 16px 16px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #64748b;">
          © 2026 Cún-shop. Mọi thắc mắc liên hệ
          <a href="mailto:support@cun-shop.vn" style="color: #f97316;">support@cun-shop.vn</a>
        </p>
      </div>
    `;

    if (template === 'order-paid') {
      return `
        <div style="${BASE_STYLE}">
          ${BRAND_HEADER}
          <div style="background: #1e293b; padding: 36px 32px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #10b981;">🎉 Thanh toán đơn hàng thành công!</h2>
            <p style="color: #94a3b8; line-height: 1.6; margin: 0 0 16px;">
              Đơn hàng <strong style="color: #f97316;">#${data.orderId ?? ''}</strong> của bạn đã được đối soát thanh toán thành công qua PayOS/VietQR.
            </p>
            <div style="background: #0f172a; border-radius: 12px; padding: 16px 20px; margin: 16px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">Số tiền đã nhận</p>
              <p style="margin: 4px 0 0; font-size: 22px; font-weight: 800; color: #10b981;">${data.amount ? Number(data.amount).toLocaleString('vi-VN') + ' ₫' : (data.total ?? '')}</p>
            </div>
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              Nhà bán hàng (Seller) đang được thông báo để tiến hành đóng gói và giao hàng cho bạn trong thời gian sớm nhất.
            </p>
          </div>
          ${FOOTER}
        </div>
      `;
    }

    if (template === 'password-reset') {
      const resetUrl = data.resetUrl ?? '#';
      return `
        <div style="${BASE_STYLE}">
          ${BRAND_HEADER}
          <div style="background: #1e293b; padding: 36px 32px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #f1f5f9;">Đặt lại mật khẩu</h2>
            <p style="color: #94a3b8; line-height: 1.6; margin: 0 0 24px;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
              Nhấn vào nút bên dưới để tiếp tục:
            </p>
            <a href="${resetUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #f97316, #e11d48);
                      color: white; padding: 14px 32px; border-radius: 50px; font-weight: 700;
                      text-decoration: none; font-size: 15px;">
              Đặt lại mật khẩu
            </a>
            <p style="margin: 24px 0 0; font-size: 13px; color: #64748b;">
              Liên kết có hiệu lực trong <strong style="color: #f97316;">1 giờ</strong>.
              Nếu bạn không yêu cầu, hãy bỏ qua email này.
            </p>
          </div>
          ${FOOTER}
        </div>
      `;
    }

    if (template === 'order-confirmed') {
      return `
        <div style="${BASE_STYLE}">
          ${BRAND_HEADER}
          <div style="background: #1e293b; padding: 36px 32px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; color: #f1f5f9;">✅ Đơn hàng đã được xác nhận!</h2>
            <p style="color: #94a3b8; line-height: 1.6; margin: 0 0 16px;">
              Xin chào <strong style="color: #f1f5f9;">${data.customerName ?? 'bạn'}</strong>,
              đơn hàng <strong style="color: #f97316;">#${data.orderId ?? ''}</strong> của bạn đã được xác nhận.
            </p>
            <div style="background: #0f172a; border-radius: 12px; padding: 16px 20px; margin: 16px 0;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">Tổng thanh toán</p>
              <p style="margin: 4px 0 0; font-size: 22px; font-weight: 800; color: #f97316;">${data.total ?? ''}</p>
            </div>
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              Chúng tôi sẽ thông báo khi đơn hàng được đóng gói và vận chuyển.
            </p>
          </div>
          ${FOOTER}
        </div>
      `;
    }

    // Generic fallback
    return `
      <div style="${BASE_STYLE}">
        ${BRAND_HEADER}
        <div style="background: #1e293b; padding: 36px 32px;">
          <p style="color: #94a3b8; line-height: 1.6; margin: 0;">${data.text ?? 'Bạn có một thông báo mới từ Cún-shop.'}</p>
        </div>
        ${FOOTER}
      </div>
    `;
  }

  private buildText(template: string, data: Record<string, string>): string {
    if (template === 'password-reset') {
      return `Đặt lại mật khẩu Cún-shop\n\nNhấn vào liên kết sau để đặt lại mật khẩu:\n${data.resetUrl}\n\nLiên kết có hiệu lực trong 1 giờ.`;
    }
    if (template === 'order-confirmed') {
      return `Đơn hàng #${data.orderId} đã được xác nhận!\nTổng thanh toán: ${data.total}`;
    }
    return data.text ?? 'Bạn có thông báo mới từ Cún-shop.';
  }
}

export function createResendProvider(): ResendNotificationProvider | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.RESEND_FROM_ADDRESS?.trim();
  if (!apiKey) return null;
  return new ResendNotificationProvider(apiKey, fromAddress);
}
