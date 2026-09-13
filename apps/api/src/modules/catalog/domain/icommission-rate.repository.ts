import type { CommissionRateRule } from '@petdots/domain';

/** Injection token for the port — the domain never names its adapter. */
export const COMMISSION_RATE_REPOSITORY = Symbol('ICommissionRateRepository');

export interface ICommissionRateRepository {
  /**
   * The commission table in force at an instant (DOMAIN_MODEL §Taxa de
   * Comissão).
   *
   * It lives in `catalog` because the **category** is what carries the rate
   * (ADR-0004 #4), and the category is the catalogue's. Six rows at most, so
   * the whole table is read at once and the choice is made in memory by the
   * pure function.
   */
  findValidAt(at: Date): Promise<CommissionRateRule[]>;
}
