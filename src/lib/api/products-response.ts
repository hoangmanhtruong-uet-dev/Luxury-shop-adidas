import type { Product } from '@/types/product';

/**
 * Envelope returned by `GET /api/products` since Phase 3.2.
 *
 * The endpoint previously returned a bare array with a hard-coded `take: 20` and
 * no cursor, so the storefront could only reach the first 20 of 2 000 products.
 * It now returns pagination metadata alongside the rows.
 */
export interface PaginatedProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export function isPaginatedProductsResponse(value: unknown): value is PaginatedProductsResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PaginatedProductsResponse).products)
  );
}

/**
 * Normalises the products payload into an array regardless of whether the caller
 * received the new envelope or a legacy bare array (e.g. from a stale CDN/edge
 * response during a rolling deploy). Never throws.
 */
export function extractProducts(value: unknown): Product[] {
  if (Array.isArray(value)) return value as Product[];
  if (isPaginatedProductsResponse(value)) return value.products;
  return [];
}