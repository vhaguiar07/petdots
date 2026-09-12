import { Module } from '@nestjs/common';

import { FindProductUseCase } from './application/find-product.use-case.js';
import { ListProductsByIdsUseCase } from './application/list-products-by-ids.use-case.js';
import { SearchProductsUseCase } from './application/search-products.use-case.js';
import { CatalogController } from './catalog.controller.js';
import { PRODUCT_REPOSITORY } from './domain/iproduct.repository.js';
import { PrismaProductRepository } from './infra/prisma-product.repository.js';

@Module({
  controllers: [CatalogController],
  providers: [
    SearchProductsUseCase,
    FindProductUseCase,
    ListProductsByIdsUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
  // `offers` compares prices of a product it must first resolve, and fills a
  // store's shelf with products it holds only the ids of; it may not read
  // `products` itself (CODING_STANDARDS).
  exports: [FindProductUseCase, ListProductsByIdsUseCase],
})
export class CatalogModule {}
