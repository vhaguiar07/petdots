import { Module } from '@nestjs/common';

import { FindCommissionRatesUseCase } from './application/find-commission-rates.use-case.js';
import { FindProductUseCase } from './application/find-product.use-case.js';
import { ListProductsByIdsUseCase } from './application/list-products-by-ids.use-case.js';
import { SearchProductsUseCase } from './application/search-products.use-case.js';
import { CatalogController } from './catalog.controller.js';
import { COMMISSION_RATE_REPOSITORY } from './domain/icommission-rate.repository.js';
import { PRODUCT_REPOSITORY } from './domain/iproduct.repository.js';
import { PrismaCommissionRateRepository } from './infra/prisma-commission-rate.repository.js';
import { PrismaProductRepository } from './infra/prisma-product.repository.js';

@Module({
  controllers: [CatalogController],
  providers: [
    SearchProductsUseCase,
    FindProductUseCase,
    ListProductsByIdsUseCase,
    FindCommissionRatesUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: COMMISSION_RATE_REPOSITORY, useClass: PrismaCommissionRateRepository },
  ],
  // `offers` compares prices of a product it must first resolve, and fills a
  // store's shelf with products it holds only the ids of; it may not read
  // `products` itself (CODING_STANDARDS). Since pd-15, `orders` reads the same
  // products for its snapshot and the commission table for its pricing — the
  // table lives here because the category is what carries the rate (ADR-0004 #4).
  exports: [FindProductUseCase, ListProductsByIdsUseCase, FindCommissionRatesUseCase],
})
export class CatalogModule {}
