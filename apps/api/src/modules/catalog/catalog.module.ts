import { Module } from '@nestjs/common';

import { FindProductUseCase } from './application/find-product.use-case.js';
import { SearchProductsUseCase } from './application/search-products.use-case.js';
import { CatalogController } from './catalog.controller.js';
import { PRODUCT_REPOSITORY } from './domain/iproduct.repository.js';
import { PrismaProductRepository } from './infra/prisma-product.repository.js';

@Module({
  controllers: [CatalogController],
  providers: [
    SearchProductsUseCase,
    FindProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
  // `offers` compares prices of a product it must first resolve, and it may not
  // read `products` itself (CODING_STANDARDS).
  exports: [FindProductUseCase],
})
export class CatalogModule {}
