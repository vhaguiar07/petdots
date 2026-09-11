/** What a store sells and for how much (DOMAIN_MODEL §Oferta). */
export interface Offer {
  id: string;
  storeId: string;
  productId: string;
  priceCents: number;
  available: boolean;
  priceUpdatedAt: Date;
}
