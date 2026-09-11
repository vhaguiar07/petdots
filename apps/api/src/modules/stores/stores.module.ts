import { Module } from '@nestjs/common';

import { FindDeliveryCoverageUseCase } from './application/find-delivery-coverage.use-case.js';
import { DELIVERY_AREA_REPOSITORY } from './domain/idelivery-area.repository.js';
import { PrismaDeliveryAreaRepository } from './infra/prisma-delivery-area.repository.js';
import { StoresController } from './stores.controller.js';

@Module({
  controllers: [StoresController],
  providers: [
    FindDeliveryCoverageUseCase,
    { provide: DELIVERY_AREA_REPOSITORY, useClass: PrismaDeliveryAreaRepository },
  ],
  // `offers` needs to know who delivers to the address, and may not read
  // `stores`/`delivery_areas` itself (CODING_STANDARDS).
  exports: [FindDeliveryCoverageUseCase],
})
export class StoresModule {}
