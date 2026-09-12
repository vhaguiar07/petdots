import { Inject, Injectable } from '@nestjs/common';

import { type IProductRepository, PRODUCT_REPOSITORY } from '../domain/iproduct.repository.js';
import type { Product } from '../domain/product.js';

/**
 * Resolves a batch of products at once, for a caller that already holds the
 * ids — `offers` filling in a store's shelf.
 *
 * Exported by `CatalogModule` for the same reason `FindProductUseCase` is: a
 * module reads only its own tables (CODING_STANDARDS). The batch shape is the
 * point — calling `FindProductUseCase` in a loop would turn one shopfront into
 * one query per line.
 */
@Injectable()
export class ListProductsByIdsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repository: IProductRepository,
  ) {}

  async execute(ids: readonly string[]): Promise<Product[]> {
    return this.repository.findActiveByIds([...new Set(ids)]);
  }
}
