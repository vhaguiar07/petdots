import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiResponse, ApiTags } from '@nestjs/swagger';
import { idempotencyKeySchema, type Order, type OrderList } from '@petdots/contracts';
import type { Request, Response } from 'express';
import { ZodResponse, ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';

import type { AuthenticatedRequest } from '../../common/guards/authenticated-request.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { API_PREFIX } from '../../openapi.js';
import { callerOf } from '../tutors/tutors.controller.js';
import { CancelOrderByTutorUseCase } from './application/cancel-order-by-tutor.use-case.js';
import { FindMyOrderUseCase } from './application/find-my-order.use-case.js';
import { PlaceOrderUseCase } from './application/place-order.use-case.js';
import { CreateOrderDto, FindOrderParamsDto, OrderDto, OrderListDto } from './orders.dto.js';
import { toHttpError } from './to-http-error.js';

const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/**
 * The tutor's own orders.
 *
 * 🔴 **Only the tutor's half of the order lives here.** Accepting, refusing,
 * dispatching, delivering and marking an item unavailable are the store's, and
 * they are pd-16 — not because they are hard, but because authorising them
 * needs to answer "**which** store is this person operating?", and the token
 * does not carry that (ADR-0013, B7). Shipping them under `@Roles('STORE_MEMBER')`
 * alone would let store A accept store B's order, which is exactly the hole the
 * `StoreScopeGuard` exists to close. The whole state machine is already in the
 * domain, tested; pd-16 wires controllers to it.
 *
 * ⚠️ No `@Public()` anywhere in this module — the guards are global since
 * pd-13, and the absence is what keeps these routes closed.
 */
@ApiTags('orders')
@ApiBearerAuth()
@Roles('TUTOR')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly placeOrder: PlaceOrderUseCase,
    private readonly findMyOrder: FindMyOrderUseCase,
    private readonly cancelOrder: CancelOrderByTutorUseCase,
  ) {}

  /**
   * Creates the order. `201` with `Location`, because there **is** a route to
   * read it back — the condition `API_GUIDELINES` puts on the header.
   *
   * 🔴 `Idempotency-Key` is **required**. This is the one route in the API where
   * a repeated request means a second charge, and an optional idempotency key
   * is an idempotency key nobody sends. A replay answers `201` with the *same*
   * order: the client that retried on a bad connection cannot tell whether its
   * first attempt landed, and must not have to.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({ status: HttpStatus.CREATED, type: OrderDto })
  @ApiHeader({
    name: IDEMPOTENCY_KEY_HEADER,
    required: true,
    description: 'UUID gerado pelo cliente ao abrir o checkout. Repetir devolve o mesmo pedido.',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Loja fechada, inativa ou item indisponível.',
  })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateOrderDto,
    @Headers(IDEMPOTENCY_KEY_HEADER) idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Order> {
    const key = parseIdempotencyKey(idempotencyKey);

    try {
      const order = await this.placeOrder.execute(callerOf(request), body, key);

      response.setHeader('Location', `/${API_PREFIX}/orders/${order.id}`);

      return order;
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: OrderListDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  async list(@Req() request: AuthenticatedRequest): Promise<OrderList> {
    try {
      return await this.findMyOrder.list(callerOf(request));
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Get(':orderId')
  @ZodResponse({ status: HttpStatus.OK, type: OrderDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pedido não encontrado.' })
  async find(
    @Req() request: AuthenticatedRequest,
    @Param() params: FindOrderParamsDto,
  ): Promise<Order> {
    try {
      return await this.findMyOrder.execute(callerOf(request), params.orderId);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /**
   * The tutor cancels, up to the moment the store accepts (ADR-0014, C4).
   *
   * A sub-resource and a noun rather than `POST /orders/{id}/cancel`:
   * `API_GUIDELINES` forbids verbs in URLs, and a cancellation is a thing that
   * comes into existence. `200` and not `201`, because what the client wants
   * back is the order in its new state — the cancellation itself has no route
   * to read.
   */
  @Post(':orderId/cancellation')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: OrderDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pedido não encontrado.' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'O pedido não está mais aguardando a loja.',
  })
  async cancel(
    @Req() request: AuthenticatedRequest,
    @Param() params: FindOrderParamsDto,
  ): Promise<Order> {
    try {
      return await this.cancelOrder.execute(
        callerOf(request),
        params.orderId,
        requestIdOf(request),
      );
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

/**
 * Validates the header and fails as a `422` that names the header as the field.
 *
 * Built as a `ZodValidationException` rather than a hand-made `422` because the
 * filter already turns that into the exact envelope, with `details[].field`
 * from the issue path — the same shape a bad body produces. A client that can
 * read one validation failure reads this one too, and `Idempotency-Key` is what
 * it sees in `field` (ERROR_MODEL).
 */
function parseIdempotencyKey(value: string | undefined): string {
  const parsed = idempotencyKeySchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  throw new ZodValidationException(
    new z.ZodError(
      parsed.error.issues.map((issue) => ({
        ...issue,
        path: [IDEMPOTENCY_KEY_HEADER, ...issue.path],
      })),
    ),
  );
}

/** The correlation id `nestjs-pino` put on the request, for the audit line. */
function requestIdOf(request: Request): string | null {
  const id: unknown = (request as { id?: unknown }).id;

  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}
