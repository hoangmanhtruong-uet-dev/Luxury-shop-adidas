import { MetadataRoute } from 'next';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const revalidate = 3600;

/** Next.js caps a single sitemap at 50 000 URLs / 50 MB. */
const MAX_PRODUCT_URLS = 45_000;
const PRODUCT_PAGE_SIZE = 1_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Phase 4.2: `category.findMany()` had no filter, so categories that were
  // never approved leaked into the sitemap. `Category.approved` defaults to
  // false and /api/categories filters on it.
  const categories = await prisma.category.findMany({
    where: { approved: true },
    select: { slug: true, name: true, updatedAt: true },
  });

  // Phase 4.2: was an unbounded `findMany` over every product, materialising the
  // whole catalogue into memory on each crawl and producing a single oversized
  // XML blob. Now paged and capped under the Next.js limit.
  const products: Array<{ slug: string; updatedAt: Date }> = [];
  let cursor: string | undefined;
  while (products.length < MAX_PRODUCT_URLS) {
    const batch = await prisma.product.findMany({
      where: { deletedAt: null },
      select: { slug: true, updatedAt: true, id: true },
      orderBy: { id: 'asc' },
      take: Math.min(PRODUCT_PAGE_SIZE, MAX_PRODUCT_URLS - products.length),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (batch.length === 0) break;
    products.push(...batch.map(({ slug, updatedAt }) => ({ slug, updatedAt })));
    cursor = batch[batch.length - 1]?.id;
    if (batch.length < PRODUCT_PAGE_SIZE) break;
  }

  // Use the real /categories/[slug] route. The previous entry pointed at
  // `/products?category=NAME`, which is a query-string URL that wastes crawl
  // budget and is not the canonical category page.
  const categoryRoutes = categories.map((cat) => ({
    url: `${baseUrl}/categories/${encodeURIComponent(cat.slug || cat.name)}`,
    lastModified: cat.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const productRoutes = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  // A fixed reference date avoids telling Google "everything changed just now"
  // on every crawl, which causes unnecessary re-crawl churn.
  const buildDate = new Date();

  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: buildDate, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/products`, lastModified: buildDate, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/categories`, lastModified: buildDate, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/flash-sale`, lastModified: buildDate, changeFrequency: 'daily' as const, priority: 0.9 },
    // Phase 4.2: the legal pages exist but were missing from the sitemap.
    { url: `${baseUrl}/chinh-sach`, lastModified: buildDate, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: buildDate, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: buildDate, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/returns`, lastModified: buildDate, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/dispute`, lastModified: buildDate, changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}