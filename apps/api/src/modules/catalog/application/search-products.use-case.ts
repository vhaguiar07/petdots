import { Inject, Injectable } from '@nestjs/common';
import type { ListProductsQuery } from '@petdots/contracts';
import { searchTokens } from '@petdots/domain';

import {
  type IProductRepository,
  PRODUCT_REPOSITORY,
  type ProductPage,
} from '../domain/iproduct.repository.js';

export type ProductSearchResult = ProductPage & { page: number; pageSize: number };

@Injectable()
export class SearchProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly repository: IProductRepository,
  ) {}

  /**
   * Normalising here — not in the contract — keeps the OpenAPI input and output
   * types identical (pd-09, A11). The same `searchTokens` folded the
   * `search_text` column at seed time, so both sides of the comparison went
   * through one function.
   */
  async execute(query: ListProductsQuery): Promise<ProductSearchResult> {
    const { items, total } = await this.repository.search({
      tokens: query.q ? searchTokens(query.q) : [],
      slug: query.slug,
      page: query.page,
      pageSize: query.pageSize,
    });

    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
