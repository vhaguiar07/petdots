import { Inject, Injectable } from '@nestjs/common';
import type { CommissionRateRule } from '@petdots/domain';

import {
  COMMISSION_RATE_REPOSITORY,
  type ICommissionRateRepository,
} from '../domain/icommission-rate.repository.js';

/**
 * The commission table in force, for `orders` to price with.
 *
 * ⚠️ **No controller reaches this.** The take rate is a matter between the
 * platform and the store — the tutor's order response never carries it
 * (`SECURITY`), and there is no admin console yet. The use case exists so
 * `orders` can read the table without touching `commission_rates`
 * (CODING_STANDARDS).
 */
@Injectable()
export class FindCommissionRatesUseCase {
  constructor(
    @Inject(COMMISSION_RATE_REPOSITORY)
    private readonly repository: ICommissionRateRepository,
  ) {}

  async execute(at: Date): Promise<CommissionRateRule[]> {
    return this.repository.findValidAt(at);
  }
}
