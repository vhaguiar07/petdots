import { type Product, productListSchema } from '@petdots/contracts';

import { type HttpClient } from './http';

export interface ProductSearch {
  q?: string;
  page?: number;
  signal?: AbortSignal;
}

/**
 * The paginated catalogue search (J2, first screen).
 *
 * 🔴 Paginated, always. The spike's flat list of 343 offers is the one shape
 * this screen may not take — it is what produced 36.7 s on a 400 kbps
 * connection (ADR-0012, A9).
 */
export function searchProducts(http: HttpClient, search: ProductSearch = {}) {
  return http
    .getJson('/products', { q: search.q, page: search.page }, { signal: search.signal })
    .then((body) => productListSchema.parse(body));
}

/**
 * Resolves `/precos/{slug}` to a product, or `null` when the slug matches
 * nothing — the list endpoint answers an empty page, not a 404.
 */
export function findProductBySlug(
  http: HttpClient,
  slug: string,
  signal?: AbortSignal,
): Promise<Product | null> {
  return http
    .getJson('/products', { slug }, { signal })
    .then((body) => productListSchema.parse(body).items[0] ?? null);
}
