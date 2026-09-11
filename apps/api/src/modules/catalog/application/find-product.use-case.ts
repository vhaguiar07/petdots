import { Inject, Injectable } from '@nestjs/common';

import { type IProductRepository, PRODUCT_REPOSITORY } from '../domain/iproduct.repository.js';
import type { Product } from '../domain/product.js';
import { ProductNotFoundError } from '../domain/product-not-found.error.js';

/**
 * Exported by `CatalogModule` because `offers` needs it: a module only reads
 * its own tables and integrates with another through a use case, never a JOIN
 * across the boundary (CODING_STANDARDS, ADR-0010 A13).
 */
@Injectable()
export class FindProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repository: IProductRepository,
  ) {}

  async execute(id: string): Promise<Product> {
    const product = await this.repository.findById(id);

    if (!product) {
      throw new ProductNotFoundError();
    }

    return product;
  }
}
