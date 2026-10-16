import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { productSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth/auth';
import { generateNextProductId } from '@/lib/idGenerator';
import { serializeMoneyFields } from '@/lib/utils/money';
import { getCategoryProductImage } from '@/lib/upload/product-image';
import { claimProductUploads, normalizeProductImageUrls, UploadAssetAuthorizationError, UploadAssetValidationError } from '@/lib/services/upload/upload-asset.service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const direction: Prisma.SortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // Phase 3.2 (Critical #15): this endpoint previously hard-coded `take: 20`
    // with no `skip`/cursor and never read a page parameter, so the storefront
    // could only ever reach the first 20 products — 1 980 of the seeded 2 000
    // catalogue was unreachable. `limit` is capped so a caller cannot request an
    // unbounded page and force the server to serialise the whole table.
    const page = Math.max(1, toPositiveInt(searchParams.get('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, toPositiveInt(searchParams.get('limit'), 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (category && category !== 'Tất cả') where.categoryRef = { name: category };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
        { code: { contains: search } },
      ];
    }
    const validSortFields = new Set(['price', 'rating', 'name', 'createdAt']);
    const sortField = validSortFields.has(sortBy) ? sortBy : 'createdAt';
    const orderBy = { [sortField]: direction } as Prisma.ProductOrderByWithRelationInput;

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        orderBy,
        include: { categoryRef: true, images: true },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const normalizedProducts = products.map(product => ({
      ...product,
      category: product.categoryRef?.name ?? '',
      image: product.image || product.images[0]?.url || getCategoryProductImage(product.categoryRef?.name),
    }));

    return NextResponse.json(serializeMoneyFields({
      products: normalizedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: skip + products.length < total,
      },
    }));
  } catch (error) {
    console.error('[GET /api/products]', error);
    return NextResponse.json({ error: 'Lỗi khi lấy danh sách sản phẩm' }, { status: 500 });
  }
}

const MAX_PAGE_SIZE = 50;

function toPositiveInt(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const parsed = productSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    const input = parsed.data;
    const code = await generateNextProductId();
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const imageUrls = normalizeProductImageUrls(
      typeof input.image === 'string' && input.image.trim() ? [input.image] : [],
    );
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: {
      code, sku: input.sku ?? `SKU-${code}`, slug, name: input.name, price: input.price, originalPrice: input.originalPrice ?? null,
      currency: input.currency, description: input.description, categoryId: input.categoryId,
      image: input.image ?? null, emoji: '📦', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        rating: 0, reviews: 0, inStock: true,
      } });
      await claimProductUploads(tx, session.userId, created.id, imageUrls);
      return created;
    });
    return NextResponse.json(serializeMoneyFields(product), { status: 201 });
  } catch (error) {
    if (error instanceof UploadAssetAuthorizationError || error instanceof UploadAssetValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[POST /api/products]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
