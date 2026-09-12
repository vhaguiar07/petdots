import { deliveryAreaListSchema, storeSchema } from '@petdots/contracts';

import { type HttpClient } from './http';

/** One store's page. Raises `ApiError` with `STORE_NOT_FOUND` when it is paused. */
export function findStore(http: HttpClient, storeId: string, signal?: AbortSignal) {
  return http
    .getJson(`/stores/${storeId}`, undefined, { signal })
    .then((body) => storeSchema.parse(body));
}

/** Every active area of the pilot — what fills the neighbourhood chips. */
export function listDeliveryAreas(http: HttpClient, signal?: AbortSignal) {
  return http
    .getJson('/delivery-areas', undefined, { signal })
    .then((body) => deliveryAreaListSchema.parse(body).items);
}

/**
 * The neighbourhoods the pilot covers, deduplicated and sorted — the chips of
 * the comparison screen.
 */
export function distinctNeighborhoods(areas: { neighborhoods: string[] }[]): string[] {
  const all = new Set(areas.flatMap((area) => area.neighborhoods));

  return [...all].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
