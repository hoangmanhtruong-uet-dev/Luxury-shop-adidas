import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cacheService } from '@/lib/services/cache.service';

/**
 * Phase 2 — real hero stats. Aggregates are cached for 1 hour; the homepage
 * shows "—" while loading and hides nothing on error (stats are decorative,
 * the page must render regardless).
 */
export async function GET() {
  try {
    const stats = await cacheService.getOrSet('home:stats', 3_600_000, async () => {
      const [products, orders, reviews, ratingAgg] = await Promise.all([
        prisma.product.count({ where: { deletedAt: null } }),
        prisma.order.count({ where: { status: 'delivered' } }),
        prisma.review.count(),
        prisma.product.aggregate({ _avg: { rating: true }, where: { deletedAt: null } }),
      ]);
      return {
        products,
        orders,
        reviews,
        avgRating: ratingAgg._avg.rating ?? 0,
      };
    });
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[GET /api/home/stats]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
