import { Inject, Injectable } from '@nestjs/common';
import type { StoreCommissionRateRule } from '@petdots/domain';

import {
  type IStoreCommissionRateRepository,
  STORE_COMMISSION_RATE_REPOSITORY,
} from '../domain/istore-commission-rate.repository.js';

/**
 * A store's commission exceptions in force, for `orders` to price with.
 *
 * Exported by `StoresModule` for the usual reason: `orders` must not read
 * `store_commission_rates` itself (CODING_STANDARDS). The use case answers with
 * the rules, not with a rate — **which** rule wins is a pure decision in
 * `packages/domain`, unit-tested there, and duplicating it here would be a
 * second place for the founder tariff to be got wrong.
 */
@Injectable()
export class FindStoreCommissionRatesUseCase {
  constructor(
    @Inject(STORE_COMMISSION_RATE_REPOSITORY)
    private readonly repository: IStoreCommissionRateRepository,
  ) {}

  async execute(storeId: string, at: Date): Promise<StoreCommissionRateRule[]> {
    return this.repository.findValidAt(storeId, at);
  }
}
