import type { OpeningInterval } from '@petdots/domain';

import type { StoreWithAreas } from './store.js';

/** Injection token for the port — the domain never names its adapter. */
export const STORE_REPOSITORY = Symbol('IStoreRepository');

export interface IStoreRepository {
  /**
   * One store with its **active** areas, or `null` when no row carries that id.
   *
   * The `PAUSED` rule is not here: the repository answers what the table holds,
   * and whether a paused store is visible is a policy the use case owns.
   */
  findById(id: string): Promise<StoreWithAreas | null>;

  /**
   * Rewrites the weekly schedule and reads the store back (ADR-0013, B4).
   *
   * The whole week at once, never one day: the overlap rule can only be decided
   * over the complete list, and `opening_hours` is one JSONB value. Which roles
   * may call this is the guard's question, not the repository's.
   *
   * ⚠️ It does **not** move the `acceptance_deadline_at` of orders already
   * placed. That deadline is a persisted column, computed once against the
   * schedule in force at the time (ADR-0017, A12) — a shop that shortens its
   * hours must not retroactively shorten the window it already promised.
   */
  updateOpeningHours(
    storeId: string,
    openingHours: readonly OpeningInterval[],
  ): Promise<StoreWithAreas | null>;
}
