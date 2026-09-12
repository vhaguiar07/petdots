import { Inject, Injectable } from '@nestjs/common';

import { type IStoreRepository, STORE_REPOSITORY } from '../domain/istore.repository.js';
import type { StoreWithAreas } from '../domain/store.js';
import { StoreNotFoundError } from '../domain/store-not-found.error.js';

@Injectable()
export class FindStoreUseCase {
  constructor(
    @Inject(STORE_REPOSITORY)
    private readonly repository: IStoreRepository,
  ) {}

  /**
   * One store's shopfront, or `StoreNotFoundError`.
   *
   * A `PAUSED` store raises exactly as a missing one does. The listing already
   * hides it (ADR-0010), and answering here would make the platform contradict
   * itself: a store nobody can find in the comparator, with a page that says it
   * exists and a price list that comes back empty (pd-13, A15).
   */
  async execute(storeId: string): Promise<StoreWithAreas> {
    const store = await this.repository.findById(storeId);

    if (!store || store.status === 'PAUSED') {
      throw new StoreNotFoundError(storeId);
    }

    return store;
  }
}
