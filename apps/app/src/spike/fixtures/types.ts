/**
 * Types local to the spike, derived from `docs/01-product/DOMAIN_MODEL.md`.
 *
 * They deliberately do NOT live in `packages/contracts`: a contract is born
 * with its endpoint, and the marketplace endpoints do not exist yet (ADR-0008).
 * Everything here is thrown away with `src/spike/`.
 *
 * Money is integer cents and rates are integer basis points — the invariant the
 * fixtures are not allowed to break (MVP_SCOPE §"Invariantes de domínio").
 */

export type ProductCategory =
  | 'FOOD_STANDARD'
  | 'FOOD_PREMIUM'
  | 'TREAT'
  | 'HYGIENE'
  | 'HEALTH_OTC'
  | 'ACCESSORY';

export type PostalCodeRange = { readonly from: string; readonly to: string };

export type DeliveryArea = {
  readonly id: string;
  readonly storeId: string;
  readonly label: string;
  readonly neighborhoods: readonly string[];
  readonly postalCodeRanges: readonly PostalCodeRange[];
  readonly deliveryFeeCents: number;
  readonly estimatedMinutes: number;
  readonly active: boolean;
};

export type Store = {
  readonly id: string;
  readonly name: string;
  readonly neighborhood: string;
  readonly deliveryAreas: readonly DeliveryArea[];
};

export type Product = {
  readonly id: string;
  readonly ean: string;
  readonly name: string;
  readonly brand: string;
  readonly category: ProductCategory;
  readonly variant: string;
  readonly netWeightGrams: number;
};

export type Offer = {
  readonly id: string;
  readonly storeId: string;
  readonly productId: string;
  readonly priceCents: number;
  readonly available: boolean;
};

/** One row of the comparator: an offer already joined with what it needs. */
export type ComparedOffer = {
  readonly offer: Offer;
  readonly product: Product;
  readonly store: Store;
  readonly deliveryFeeCents: number;
  readonly estimatedMinutes: number;
  /** priceCents + deliveryFeeCents — what the tutor actually compares. */
  readonly landedCents: number;
};

export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'DISPATCHED' | 'DELIVERED' | 'REJECTED';

export type ItemFulfillment = 'FULFILLED' | 'SUBSTITUTED' | 'UNAVAILABLE';

export type OrderItem = {
  readonly id: string;
  readonly productNameSnapshot: string;
  readonly categorySnapshot: ProductCategory;
  readonly unitPriceCents: number;
  readonly quantity: number;
  readonly commissionRateBpsSnapshot: number;
  readonly commissionAmountCents: number;
  readonly fulfillment: ItemFulfillment;
};

export type Order = {
  readonly id: string;
  readonly code: string;
  readonly storeId: string;
  readonly tutorName: string;
  readonly neighborhood: string;
  readonly status: OrderStatus;
  readonly acquisitionChannel: 'PLATFORM' | 'STORE_REFERRAL';
  readonly items: readonly OrderItem[];
  readonly itemsTotalCents: number;
  readonly deliveryFeeCents: number;
  readonly serviceFeeCents: number;
  readonly totalCents: number;
  readonly commissionTotalCents: number;
  readonly placedAt: string;
  readonly rejectionReason?: string;
};

export type CartLine = {
  readonly productId: string;
  readonly offerId: string;
  readonly quantity: number;
};

export type Cart = {
  readonly storeId: string | null;
  readonly lines: readonly CartLine[];
};
