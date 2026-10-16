import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cacheService } from '@/lib/services/cache.service';

interface Testimonial {
  id: string;
  name: string;
  comment: string;
  productName: string;
  verified: boolean;
  createdAt: Date;
}

/**
 * Phase 2 — real testimonials. Latest 5★ reviews with a comment; the
 * "Đã mua hàng" badge is only set when a DELIVERED order containing the
 * reviewed product exists for that user — never assigned blindly.
 */
export async function GET() {
  try {
    const testimonials = await cacheService.getOrSet<Testimonial[]>(
      'home:testimonials',
      600_000,
      async () => {
        const candidates = await prisma.review.findMany({
          where: { rating: 5, comment: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 12,
          include: {
            user: { select: { name: true } },
            product: { select: { id: true, name: true } },
          },
        });

        const out: Testimonial[] = [];
        for (const review of candidates) {
          if (out.length >= 3) break;
          const comment = review.comment?.trim();
          if (!comment) continue;
          const deliveredOrderIds = (
            await prisma.order.findMany({
              where: { userId: review.userId, status: 'delivered' },
              select: { id: true },
            })
          ).map((o) => o.id);
          const purchased =
            deliveredOrderIds.length > 0 &&
            (await prisma.orderItem.findFirst({
              where: { orderId: { in: deliveredOrderIds }, productId: review.productId },
              select: { id: true },
            })) !== null;
          out.push({
            id: review.id,
            name: review.user.name || 'Khách hàng',
            comment,
            productName: review.product.name,
            verified: purchased,
            createdAt: review.createdAt,
          });
        }
        return out;
      },
    );
    return NextResponse.json(testimonials);
  } catch (error) {
    console.error('[GET /api/testimonials]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
