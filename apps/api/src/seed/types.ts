import type { ProductCategory, StoreStatus } from '@petdots/contracts';
import type { PostalCodeRange } from '@petdots/domain';

/**
 * The seed's input shape. `slug` and `search_text` are absent on purpose: they
 * are *derived* (see `naming.ts`), never typed by hand, so the URL of a product
 * and the text it is found by can never drift from its name.
 */
export interface SeedProduct {
  name: string;
  brand: string;
  category: ProductCategory;
  variant: string;
  netWeightGrams: number;
  ean: string | null;
  imageUrl: string | null;
  requiresPrescription: boolean;
  active: boolean;
}

export interface SeedDeliveryArea {
  label: string;
  neighborhoods: string[];
  postalCodeRanges: PostalCodeRange[];
  deliveryFeeCents: number;
  estimatedMinutes: number;
  active: boolean;
}

export interface SeedStore {
  name: string;
  neighborhood: string;
  status: StoreStatus;
  areas: SeedDeliveryArea[];
}

/** Offers point at the natural keys, which is what makes the seed re-runnable. */
export interface SeedOffer {
  storeSlug: string;
  productSlug: string;
  priceCents: number;
  available: boolean;
  priceUpdatedAt: Date;
}

export interface SeedInput {
  products: readonly SeedProduct[];
  stores: readonly SeedStore[];
  offers: readonly SeedOffer[];
}

/** Read back from the database, so two runs can be compared for idempotency. */
export interface SeedSummary {
  products: number;
  stores: number;
  deliveryAreas: number;
  offers: number;
}
