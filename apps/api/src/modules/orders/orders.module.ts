import { Module } from '@nestjs/common';

import { AuditModule } from '../../audit/audit.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { OffersModule } from '../offers/offers.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { TutorsModule } from '../tutors/tutors.module.js';
import { AcceptOrderByStoreUseCase } from './application/accept-order-by-store.use-case.js';
import { CancelOrderByStoreUseCase } from './application/cancel-order-by-store.use-case.js';
import { CancelOrderByTutorUseCase } from './application/cancel-order-by-tutor.use-case.js';
import { ConfirmOrderDeliveryUseCase } from './application/confirm-order-delivery.use-case.js';
import { DispatchOrderUseCase } from './application/dispatch-order.use-case.js';
import { ExpireOverdueOrdersUseCase } from './application/expire-overdue-orders.use-case.js';
import { FindMyOrderUseCase } from './application/find-my-order.use-case.js';
import { FindStoreOrderUseCase } from './application/find-store-order.use-case.js';
import { MarkOrderItemUnavailableUseCase } from './application/mark-order-item-unavailable.use-case.js';
import { PlaceOrderUseCase } from './application/place-order.use-case.js';
import { PriceOrderUseCase } from './application/price-order.use-case.js';
import { QuoteOrderUseCase } from './application/quote-order.use-case.js';
import { RejectOrderByStoreUseCase } from './application/reject-order-by-store.use-case.js';
import { ResolveOrderTutor } from './application/resolve-order-tutor.js';
import { StoreOrderTransition } from './application/store-order-transition.js';
import { StoreSummaryOf } from './application/store-summary-of.js';
import { ORDER_REPOSITORY } from './domain/iorder.repository.js';
import { OrderExpirySweeper } from './infra/order-expiry.sweeper.js';
import { PrismaOrderRepository } from './infra/prisma-order.repository.js';
import { OrderQuotesController } from './order-quotes.controller.js';
import { OrdersController } from './orders.controller.js';
import { StoreOrdersController } from './store-orders.controller.js';

/**
 * The order: the cart priced, the order written, and the clock that refuses it
 * when nobody answers.
 *
 * ⚠️ **Six imports, and every one of them is a table this module may not
 * touch** (CODING_STANDARDS): the tutor behind the token and the contact
 * snapshot, the store and its schedule, the offers a cart names, the products
 * and the commission table, the refund every exit owes, and the audit trail.
 * A forgotten `exports` in any of them fails **only at boot**, which is why the
 * boot smoke test is part of the closing battery — and why `contract.spec.ts`,
 * which also builds the whole `AppModule`, catches it earlier.
 */
@Module({
  imports: [TutorsModule, StoresModule, CatalogModule, OffersModule, PaymentsModule, AuditModule],
  // Three controllers: the tutor's orders, the quote, and — since pd-16 — the
  // store's half, scoped by `StoreScopeGuard`. Both the guard and the use case
  // it injects come from the `exports` of `StoresModule`; without them this
  // module fails at boot and nowhere else.
  controllers: [OrdersController, OrderQuotesController, StoreOrdersController],
  providers: [
    PriceOrderUseCase,
    QuoteOrderUseCase,
    PlaceOrderUseCase,
    FindMyOrderUseCase,
    CancelOrderByTutorUseCase,
    ExpireOverdueOrdersUseCase,
    StoreSummaryOf,
    StoreOrderTransition,
    FindStoreOrderUseCase,
    AcceptOrderByStoreUseCase,
    RejectOrderByStoreUseCase,
    DispatchOrderUseCase,
    ConfirmOrderDeliveryUseCase,
    CancelOrderByStoreUseCase,
    MarkOrderItemUnavailableUseCase,
    ResolveOrderTutor,
    OrderExpirySweeper,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
  ],
})
export class OrdersModule {}
