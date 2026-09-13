import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Order, OrderList } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import type { AuthenticatedRequest } from '../../common/guards/authenticated-request.js';
import { membershipOf } from '../../common/guards/membership-of.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { StoreScopeGuard } from '../../common/guards/store-scope.guard.js';
import { callerOf, requestIdOf } from '../../common/request-context.js';
import { AcceptOrderByStoreUseCase } from './application/accept-order-by-store.use-case.js';
import { CancelOrderByStoreUseCase } from './application/cancel-order-by-store.use-case.js';
import { ConfirmOrderDeliveryUseCase } from './application/confirm-order-delivery.use-case.js';
import { DispatchOrderUseCase } from './application/dispatch-order.use-case.js';
import { FindStoreOrderUseCase } from './application/find-store-order.use-case.js';
import { MarkOrderItemUnavailableUseCase } from './application/mark-order-item-unavailable.use-case.js';
import type { StoreActor } from './application/store-order-transition.js';
import { RejectOrderByStoreUseCase } from './application/reject-order-by-store.use-case.js';
import {
  CancelOrderByStoreDto,
  ListStoreOrdersQueryDto,
  OrderDto,
  OrderListDto,
  StoreOrderItemParamsDto,
  StoreOrderParamsDto,
  UpdateOrderItemFulfillmentDto,
} from './orders.dto.js';
import { toHttpError } from './to-http-error.js';

/**
 * 🔴 The store's half of the order — the counterpart of `OrdersController`,
 * which owns the tutor's half.
 *
 * The whole state machine already lived in the domain, pure and tested, since
 * pd-15; what was missing was anything able to call it. Until this controller
 * existed, an order placed had no producer for `ACCEPTED`, so the sweeper
 * auto-rejected every one of them after fifteen working minutes.
 *
 * **Two guards, and they answer different questions.** `@Roles('STORE_MEMBER')`
 * (global `RolesGuard`) says the account is in the store half of the product at
 * all; `StoreScopeGuard` says it operates **this** store, because the token
 * cannot carry that (ADR-0013, B7). Shipping these routes under the role alone
 * would let store A accept store B's orders — exactly the hole the guard closes.
 *
 * **`403` and `404` are chosen, not incidental.** A caller who does not operate
 * the store in the path gets `403 STORE_SCOPE_DENIED`: the existence of a store
 * is public, so nothing leaks. A caller who *does* operate the store but names
 * an order of another gets `404 ORDER_NOT_FOUND`, because an order's existence
 * is not public — and the `storeId` in the repository's `where` is the mechanism,
 * not a check afterwards.
 *
 * Every action is a **noun sub-resource** answering `200` with the order in its
 * new state (`API_GUIDELINES`, precedent of `/cancellation`). No `Location`:
 * none of these sub-resources has a route to read back.
 *
 * ⚠️ No `@Public()` anywhere — the guards are global since pd-13, and the
 * absence is what keeps these routes closed.
 */
@ApiTags('orders')
@ApiBearerAuth()
@Roles('STORE_MEMBER')
@UseGuards(StoreScopeGuard)
@Controller('stores')
export class StoreOrdersController {
  constructor(
    private readonly findStoreOrder: FindStoreOrderUseCase,
    private readonly acceptOrder: AcceptOrderByStoreUseCase,
    private readonly rejectOrder: RejectOrderByStoreUseCase,
    private readonly dispatchOrder: DispatchOrderUseCase,
    private readonly confirmDelivery: ConfirmOrderDeliveryUseCase,
    private readonly cancelOrder: CancelOrderByStoreUseCase,
    private readonly markItemUnavailable: MarkOrderItemUnavailableUseCase,
  ) {}

  /**
   * The queue. `?status=PLACED,ACCEPTED` filters; absent means everything.
   *
   * Not paginated: a pilot store has dozens of orders. Trigger to paginate: the
   * first store past ~200.
   */
  @Get(':storeId/orders')
  @ApiParam({ name: 'storeId', format: 'uuid', description: 'A loja que o membro opera.' })
  @ZodResponse({ status: HttpStatus.OK, type: OrderListDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListStoreOrdersQueryDto,
  ): Promise<OrderList> {
    try {
      return await this.findStoreOrder.list(actorOf(request), query.status);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Get(':storeId/orders/:orderId')
  @ZodResponse({ status: HttpStatus.OK, type: OrderDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pedido não encontrado.' })
  async find(
    @Req() request: AuthenticatedRequest,
    @Param() params: StoreOrderParamsDto,
  ): Promise<Order> {
    try {
      return await this.findStoreOrder.execute(actorOf(request), params.orderId);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /** 🔴 The transition that stops the order from being auto-rejected. */
  @Post(':storeId/orders/:orderId/acceptance')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: OrderDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pedido não encontrado.' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Este pedido não está mais nesse estado.',
  })
  async accept(
    @Req() request: AuthenticatedRequest,
    @Param() params: StoreOrderParamsDto,
  ): Promise<Order> {
    try {
      return await this.acceptOrder.execute(actorOf(request), params.orderId);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Post(':storeId/orders/:orderId/rejection')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: OrderDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pedido não encontrado.' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Este pedido não está mais nesse estado.',
  })
  async reject(
    @Req() request: AuthenticatedRequest,
    @Param() params: StoreOrderParamsDto,
  ): Promise<Order> {
    try {
      return await this.rejectOrder.execute(actorOf(request), params.orderId);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Post(':storeId/orders/:orderId/dispatch')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: OrderDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pedido não encontrado.' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Este pedido não está mais nesse estado.',
  })
  async dispatch(
    @Req() request: AuthenticatedRequest,
    @Param() params: StoreOrderParamsDto,
  ): Promise<Order> {
    try {
      return await this.dispatchOrder.execute(actorOf(request), params.orderId);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /** `delivery-confirmation`, not `delivery`: `Delivery` is capability 8. */
  @Post(':storeId/orders/:orderId/delivery-confirmation')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: OrderDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pedido não encontrado.' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Este pedido não está mais nesse estado.',
  })
  async confirm(
    @Req() request: AuthenticatedRequest,
    @Param() params: StoreOrderParamsDto,
  ): Promise<Order> {
    try {
      return await this.confirmDelivery.execute(actorOf(request), params.orderId);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /** Only from `ACCEPTED` — from `PLACED` the shop refuses, it does not cancel. */
  @Post(':storeId/orders/:orderId/cancellation')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: OrderDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pedido não encontrado.' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Este pedido não está mais nesse estado.',
  })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async cancel(
    @Req() request: AuthenticatedRequest,
    @Param() params: StoreOrderParamsDto,
    @Body() body: CancelOrderByStoreDto,
  ): Promise<Order> {
    try {
      return await this.cancelOrder.execute(actorOf(request), params.orderId, body.reason);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /**
   * `PATCH` on the line, because `fulfillment` is a partial update of a real
   * sub-resource — the example `API_GUIDELINES` itself uses.
   */
  @Patch(':storeId/orders/:orderId/items/:orderItemId')
  @ZodResponse({ status: HttpStatus.OK, type: OrderDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pedido ou item não encontrado.' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Este pedido não está mais nesse estado.',
  })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async updateItem(
    @Req() request: AuthenticatedRequest,
    @Param() params: StoreOrderItemParamsDto,
    @Body() _body: UpdateOrderItemFulfillmentDto,
  ): Promise<Order> {
    try {
      // The body carries the one legal value, so parsing it **is** the decision:
      // anything else was already refused as a `422` by the DTO.
      return await this.markItemUnavailable.execute(
        actorOf(request),
        params.orderId,
        params.orderItemId,
      );
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

/**
 * Who is acting, and on which store.
 *
 * 🔴 The store comes from `membershipOf` — the membership `StoreScopeGuard`
 * matched — and never from `params.storeId`. A handler reading the params would
 * take an id the caller typed; this one raises if the guard did not run.
 */
function actorOf(request: AuthenticatedRequest): StoreActor {
  const { storeId, role } = membershipOf(request);

  return {
    userId: callerOf(request),
    storeId,
    storeRole: role,
    requestId: requestIdOf(request),
  };
}
