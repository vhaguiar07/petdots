import { Module } from '@nestjs/common';

import { FindDeliveryCoverageUseCase } from './application/find-delivery-coverage.use-case.js';
import { FindStoreUseCase } from './application/find-store.use-case.js';
import { DeliveryAreasController } from './delivery-areas.controller.js';
import { DELIVERY_AREA_REPOSITORY } from './domain/idelivery-area.repository.js';
import { STORE_REPOSITORY } from './domain/istore.repository.js';
import { PrismaDeliveryAreaRepository } from './infra/prisma-delivery-area.repository.js';
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
    { provide: DELIVERY_AREA_REPOSITORY, useClass: PrismaDeliveryAreaRepository },
    { provide: STORE_REPOSITORY, useClass: PrismaStoreRepository },
  ],
  // `offers` needs to know who delivers to the address, and which store a
  // shopfront belongs to; it may not read `stores`/`delivery_areas` itself
  // (CODING_STANDARDS).
  exports: [FindDeliveryCoverageUseCase, FindStoreUseCase],
})
export class StoresModule {}
