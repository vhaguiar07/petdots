import type { ProductCategory, StoreStatus, UserRole } from '@petdots/contracts';
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

/**
 * A development account, written in plain text on purpose — it is a credential
 * nobody is supposed to protect, and the seed refuses to create it outside
 * development (ADR-0011, A8).
 */
export interface SeedUser {
  email: string;
  password: string;
  roles: UserRole[];
}

export interface SeedInput {
  products: readonly SeedProduct[];
  stores: readonly SeedStore[];
  offers: readonly SeedOffer[];
  /**
   * Optional, and ignored outright when `NODE_ENV=production` — the catalogue
   * has to be seeded in production, these accounts must never be (ADR-0011, A8).
   */
  devUsers?: readonly SeedUser[];
}

/** Read back from the database, so two runs can be compared for idempotency. */
export interface SeedSummary {
  products: number;
  stores: number;
  deliveryAreas: number;
  offers: number;
  /** Rows in `users`. Zero in production, always. */
  users: number;
}
