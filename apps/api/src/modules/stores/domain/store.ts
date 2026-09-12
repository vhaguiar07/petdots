import type { StoreStatus } from '@petdots/contracts';

import type { DeliveryArea } from './delivery-area.js';

/** What the public comparator knows about a store (DOMAIN_MODEL §Loja). */
export interface StoreSummary {
  id: string;
  slug: string;
  name: string;
  neighborhood: string;
}

/**
 * The store's own page: the summary plus what it is willing to promise.
 *
 * `status` is here and not in `StoreSummary` because the comparator has no use
 * for it — it only ever lists stores that are already listable.
 */
export interface StoreWithAreas extends StoreSummary {
  status: StoreStatus;
  /** Only the active ones: a switched-off area is not a promise being made. */
  deliveryAreas: DeliveryArea[];
}
