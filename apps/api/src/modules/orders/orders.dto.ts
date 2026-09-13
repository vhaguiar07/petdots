import {
  createOrderSchema,
  findOrderParamsSchema,
  orderListSchema,
  orderQuoteSchema,
  orderSchema,
  quoteOrderSchema,
} from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class QuoteOrderDto extends createZodDto(quoteOrderSchema) {}
export class CreateOrderDto extends createZodDto(createOrderSchema) {}
export class OrderQuoteDto extends createZodDto(orderQuoteSchema) {}
export class OrderDto extends createZodDto(orderSchema) {}
export class OrderListDto extends createZodDto(orderListSchema) {}
export class FindOrderParamsDto extends createZodDto(findOrderParamsSchema) {}
