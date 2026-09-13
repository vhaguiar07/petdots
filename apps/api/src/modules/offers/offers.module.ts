import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CompareOffersUseCase } from './application/compare-offers.use-case.js';
import { CreateStoreOfferUseCase } from './application/create-store-offer.use-case.js';
import { FindOffersForOrderUseCase } from './application/find-offers-for-order.use-case.js';
import { ListStoreOffersUseCase } from './application/list-store-offers.use-case.js';
import { UpdateOfferAvailabilityUseCase } from './application/update-offer-availability.use-case.js';
import { UpdateOfferPriceUseCase } from './application/update-offer-price.use-case.js';
import { OFFER_REPOSITORY } from './domain/ioffer.repository.js';
import { PrismaOfferRepository } from './infra/prisma-offer.repository.js';
import { OffersController } from './offers.controller.js';
import { StoreOfferManagementController } from './store-offer-management.controller.js';
import { StoreOffersController } from './store-offers.controller.js';

@Module({
  // The comparator orchestrates the other two aggregates through their use
  // cases; forgetting an `exports` here only fails at boot, which is why the
  // boot smoke test is part of the closing battery.
  // `AuditModule` joins in pd-16: changing a price is one of the four mutations
  // `SECURITY` §Auditoria requires a trail for, and it is the first thing in
  // this project to write an audit row about something that is not an order.
  imports: [CatalogModule, StoresModule, AuditModule],
  controllers: [OffersController, StoreOffersController, StoreOfferManagementController],
  providers: [
    CompareOffersUseCase,
    ListStoreOffersUseCase,
    FindOffersForOrderUseCase,
    UpdateOfferPriceUseCase,
    UpdateOfferAvailabilityUseCase,
    CreateStoreOfferUseCase,
    { provide: OFFER_REPOSITORY, useClass: PrismaOfferRepository },
  ],
  // The first export this module has: `orders` prices a cart made of offer ids
  // and may not read `offers` itself (CODING_STANDARDS).
  exports: [FindOffersForOrderUseCase],
})
export class OffersModule {}
