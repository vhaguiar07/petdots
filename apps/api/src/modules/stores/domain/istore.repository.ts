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
}
