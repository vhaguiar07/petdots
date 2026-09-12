import { comparedOfferListSchema, storeOfferListSchema } from '@petdots/contracts';

import { type HttpClient } from './http';

export interface AddressQuery {
  neighborhood?: string;
  postalCode?: string;
}

/** The comparison itself: who sells this, delivered, and for how much (J2). */
export function compareOffers(
  http: HttpClient,
  productId: string,
  address: AddressQuery = {},
  signal?: AbortSignal,
) {
  return http
    .getJson(
      '/offers',
      { productId, neighborhood: address.neighborhood, postalCode: address.postalCode },
      { signal },
    )
    .then((body) => comparedOfferListSchema.parse(body).items);
}

/** One store's shelf. Raises `ApiError` with `STORE_NOT_FOUND` for a paused store. */
export function listStoreOffers(http: HttpClient, storeId: string, signal?: AbortSignal) {
  return http
    .getJson(`/stores/${storeId}/offers`, undefined, { signal })
    .then((body) => storeOfferListSchema.parse(body).items);
}
