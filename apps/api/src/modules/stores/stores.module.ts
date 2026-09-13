import { Module } from '@nestjs/common';

import { StoreScopeGuard } from '../../common/guards/store-scope.guard.js';
import { FindDeliveryCoverageUseCase } from './application/find-delivery-coverage.use-case.js';
import { FindStoreMembershipUseCase } from './application/find-store-membership.use-case.js';
import { ListMyStoreMembershipsUseCase } from './application/list-my-store-memberships.use-case.js';
import { UpdateOpeningHoursUseCase } from './application/update-opening-hours.use-case.js';
import { FindStoreCommissionRatesUseCase } from './application/find-store-commission-rates.use-case.js';
import { FindStoreUseCase } from './application/find-store.use-case.js';
import { DeliveryAreasController } from './delivery-areas.controller.js';
import { DELIVERY_AREA_REPOSITORY } from './domain/idelivery-area.repository.js';
import { STORE_COMMISSION_RATE_REPOSITORY } from './domain/istore-commission-rate.repository.js';
import { STORE_MEMBER_REPOSITORY } from './domain/istore-member.repository.js';
import { STORE_REPOSITORY } from './domain/istore.repository.js';
import { PrismaDeliveryAreaRepository } from './infra/prisma-delivery-area.repository.js';
import { PrismaStoreCommissionRateRepository } from './infra/prisma-store-commission-rate.repository.js';
import { PrismaStoreMemberRepository } from './infra/prisma-store-member.repository.js';
import { PrismaStoreRepository } from './infra/prisma-store.repository.js';
import { StoreMembershipsController } from './store-memberships.controller.js';
import { StoreOpeningHoursController } from './store-opening-hours.controller.js';
import { StoresController } from './stores.controller.js';

@Module({
  // Four controllers, one module. `/delivery-areas` is a top-level resource of
  // the pilot's map and `/stores/{id}` is the store itself; both read the same
  // aggregate and neither justifies a second module. The two added in pd-16 are
  // split off for a different reason: the public ones are `@Public()` on the
  // class, and one decorator cannot be half-applied — the panel's routes are
  // closed and scoped.
  controllers: [
    DeliveryAreasController,
    StoresController,
    StoreMembershipsController,
    StoreOpeningHoursController,
  ],
  providers: [
    FindDeliveryCoverageUseCase,
    FindStoreUseCase,
    FindStoreCommissionRatesUseCase,
    FindStoreMembershipUseCase,
    ListMyStoreMembershipsUseCase,
    UpdateOpeningHoursUseCase,
    StoreScopeGuard,
    { provide: DELIVERY_AREA_REPOSITORY, useClass: PrismaDeliveryAreaRepository },
    { provide: STORE_REPOSITORY, useClass: PrismaStoreRepository },
    { provide: STORE_COMMISSION_RATE_REPOSITORY, useClass: PrismaStoreCommissionRateRepository },
    { provide: STORE_MEMBER_REPOSITORY, useClass: PrismaStoreMemberRepository },
  ],
  // `offers` needs to know who delivers to the address, and which store a
  // shopfront belongs to; it may not read `stores`/`delivery_areas` itself
  // (CODING_STANDARDS). Since pd-15, `orders` needs the same two — plus the
  // store's commission exceptions, which live in this module because the
  // exception belongs to the store (SYSTEM_ARCHITECTURE).
  // 🔴 `StoreScopeGuard` and the use case it injects are exported because
  // `orders` and `offers` apply the guard with `@UseGuards` — and Nest resolves
  // its dependencies in **their** module's context, not in this one. Without
  // both exports the application fails at boot and nowhere else, which is what
  // the boot smoke and `contract.spec.ts` exist to catch (ADR-0018, A3).
  exports: [
    FindDeliveryCoverageUseCase,
    FindStoreUseCase,
    FindStoreCommissionRatesUseCase,
    FindStoreMembershipUseCase,
    StoreScopeGuard,
  ],
})
export class StoresModule {}
