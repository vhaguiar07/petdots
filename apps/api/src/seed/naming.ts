import { normalizeSearchText, slugify } from '@petdots/domain';

import type { SeedProduct, SeedStore } from './types.js';

/**
 * The derivations that turn seed data into database columns.
 *
 * They live in one file because two callers need the exact same answer: the
 * seed writer, which stores the slug, and the offer generator, which references
 * a product by it. Two copies of `slugify(name + variant)` would eventually
 * disagree and the offers would point at nothing.
 */
export function productSlugOf(product: Pick<SeedProduct, 'name' | 'variant'>): string {
  return slugify(`${product.name} ${product.variant}`);
}

/** Brand is included so `?q=golden 15` finds the bag by brand and size. */
export function productSearchTextOf(
  product: Pick<SeedProduct, 'brand' | 'name' | 'variant'>,
): string {
  return normalizeSearchText(`${product.brand} ${product.name} ${product.variant}`);
}

export function storeSlugOf(store: Pick<SeedStore, 'name'>): string {
  return slugify(store.name);
}
