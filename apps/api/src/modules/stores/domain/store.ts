import type { StoreStatus } from '@petdots/contracts';
import type { OpeningInterval } from '@petdots/domain';

import type { DeliveryArea } from './delivery-area.js';

/** What the public comparator knows about a store (DOMAIN_MODEL §Loja). */
export interface StoreSummary {
  id: string;
  slug: string;
  name: string;
  neighborhood: string;
}

/**
 * The summary plus the weekly schedule — what the **comparator** needs in order
 * to say "Fechada · abre segunda às 08:00" on each row (pd-16).
 *
 * A type of its own rather than a field on `StoreSummary`: the panel's list of
 * memberships also carries a `StoreSummary`, and it has no use for the schedule.
 * Widening the base type would make every producer of a summary fetch and parse
 * a JSONB column nobody reads.
 */
export interface StoreSummaryWithHours extends StoreSummary {
  /** Empty means **never open** — failing closed, as everywhere else. */
  openingHours: OpeningInterval[];
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
  /**
   * The weekly schedule (ADR-0014, C2). An **empty list means never open**, so
   * a store that has not been given hours takes no orders — failing closed.
   */
  openingHours: OpeningInterval[];
}
