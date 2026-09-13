import {
  cancelOrderByStoreSchema,
  createOrderSchema,
  findOrderParamsSchema,
  listStoreOrdersQuerySchema,
  orderListSchema,
  orderQuoteSchema,
  orderSchema,
  quoteOrderSchema,
  storeOrderItemParamsSchema,
  storeOrderParamsSchema,
  updateOrderItemFulfillmentSchema,
} from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class QuoteOrderDto extends createZodDto(quoteOrderSchema) {}
export class CreateOrderDto extends createZodDto(createOrderSchema) {}
export class OrderQuoteDto extends createZodDto(orderQuoteSchema) {}
export class OrderDto extends createZodDto(orderSchema) {}
export class OrderListDto extends createZodDto(orderListSchema) {}
export class FindOrderParamsDto extends createZodDto(findOrderParamsSchema) {}
export class StoreOrderParamsDto extends createZodDto(storeOrderParamsSchema) {}
export class StoreOrderItemParamsDto extends createZodDto(storeOrderItemParamsSchema) {}
export class ListStoreOrdersQueryDto extends createZodDto(listStoreOrdersQuerySchema) {}
export class CancelOrderByStoreDto extends createZodDto(cancelOrderByStoreSchema) {}
export class UpdateOrderItemFulfillmentDto extends createZodDto(updateOrderItemFulfillmentSchema) {}
