import { Module } from '@nestjs/common';

import { FindDeliveryCoverageUseCase } from './application/find-delivery-coverage.use-case.js';
import { FindStoreCommissionRatesUseCase } from './application/find-store-commission-rates.use-case.js';
import { FindStoreUseCase } from './application/find-store.use-case.js';
import { DeliveryAreasController } from './delivery-areas.controller.js';
import { DELIVERY_AREA_REPOSITORY } from './domain/idelivery-area.repository.js';
import { STORE_COMMISSION_RATE_REPOSITORY } from './domain/istore-commission-rate.repository.js';
import { STORE_REPOSITORY } from './domain/istore.repository.js';
import { PrismaDeliveryAreaRepository } from './infra/prisma-delivery-area.repository.js';
import { PrismaStoreCommissionRateRepository } from './infra/prisma-store-commission-rate.repository.js';
import { PrismaStoreRepository } from './infra/prisma-store.repository.js';
import { StoresController } from './stores.controller.js';

@Module({
  // Two controllers, one module: `/delivery-areas` is a top-level resource of
  // the pilot's map and `/stores/{id}` is the store itself, but both read the
  // same aggregate and neither justifies a second module.
  controllers: [DeliveryAreasController, StoresController],
  providers: [
    FindDeliveryCoverageUseCase,
    FindStoreUseCase,
    FindStoreCommissionRatesUseCase,
    { provide: DELIVERY_AREA_REPOSITORY, useClass: PrismaDeliveryAreaRepository },
    { provide: STORE_REPOSITORY, useClass: PrismaStoreRepository },
    { provide: STORE_COMMISSION_RATE_REPOSITORY, useClass: PrismaStoreCommissionRateRepository },
  ],
  // `offers` needs to know who delivers to the address, and which store a
  // shopfront belongs to; it may not read `stores`/`delivery_areas` itself
  // (CODING_STANDARDS). Since pd-15, `orders` needs the same two — plus the
  // store's commission exceptions, which live in this module because the
  // exception belongs to the store (SYSTEM_ARCHITECTURE).
  exports: [FindDeliveryCoverageUseCase, FindStoreUseCase, FindStoreCommissionRatesUseCase],
})
export class StoresModule {}
