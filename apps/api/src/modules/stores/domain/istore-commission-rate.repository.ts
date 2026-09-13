import type { StoreCommissionRateRule } from '@petdots/domain';

/** Injection token for the port — the domain never names its adapter. */
export const STORE_COMMISSION_RATE_REPOSITORY = Symbol('IStoreCommissionRateRepository');

export interface IStoreCommissionRateRepository {
  /**
   * One store's commission exceptions in force at an instant — the founder
   * tariff (DOMAIN_MODEL §Comissão Especial).
   *
   * The validity window is filtered in SQL rather than in memory because the
   * question is asked per order and the answer is at most a handful of rows;
   * which of them *wins* is decided by the pure function in `packages/domain`,
   * not here.
   */
  findValidAt(storeId: string, at: Date): Promise<StoreCommissionRateRule[]>;
}
