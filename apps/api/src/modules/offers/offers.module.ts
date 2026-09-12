import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CompareOffersUseCase } from './application/compare-offers.use-case.js';
import { ListStoreOffersUseCase } from './application/list-store-offers.use-case.js';
import { OFFER_REPOSITORY } from './domain/ioffer.repository.js';
import { PrismaOfferRepository } from './infra/prisma-offer.repository.js';
import { OffersController } from './offers.controller.js';
import { StoreOffersController } from './store-offers.controller.js';

@Module({
  // The comparator orchestrates the other two aggregates through their use
  // cases; forgetting an `exports` here only fails at boot, which is why the
  // boot smoke test is part of the closing battery.
  imports: [CatalogModule, StoresModule],
  controllers: [OffersController, StoreOffersController],
  providers: [
    CompareOffersUseCase,
    ListStoreOffersUseCase,
    { provide: OFFER_REPOSITORY, useClass: PrismaOfferRepository },
  ],
})
export class OffersModule {}
