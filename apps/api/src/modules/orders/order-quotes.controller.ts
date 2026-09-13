import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { OrderQuote } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import type { AuthenticatedRequest } from '../../common/guards/authenticated-request.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { callerOf } from '../tutors/tutors.controller.js';
import { QuoteOrderUseCase } from './application/quote-order.use-case.js';
import { OrderQuoteDto, QuoteOrderDto } from './orders.dto.js';
import { toHttpError } from './to-http-error.js';

/**
 * Prices a cart without creating anything.
 *
 * `200` and not `201`, because nothing came into existence — the quote is not
 * stored anywhere. A noun (`order-quotes`) and not a verb (`/orders/quote`),
 * because `API_GUIDELINES` fixes resources as plural nouns; the fact that it is
 * reached by `POST` is about the body it needs, not about creation.
 *
 * Authenticated and `@Roles('TUTOR')` like the order itself: the answer
 * contains the tutor's own delivery address and phone, and it is priced against
 * *their* address. There is nothing here a stranger could usefully ask for.
 */
@ApiTags('orders')
@ApiBearerAuth()
@Roles('TUTOR')
@Controller('order-quotes')
export class OrderQuotesController {
  constructor(private readonly quoteOrder: QuoteOrderUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: OrderQuoteDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Loja inativa ou item indisponível.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async quote(
    @Req() request: AuthenticatedRequest,
    @Body() body: QuoteOrderDto,
  ): Promise<OrderQuote> {
    try {
      return await this.quoteOrder.execute(callerOf(request), body);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}
