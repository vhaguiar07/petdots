import { DeliveryProviderType, DeliveryStatus, OrderStatus, Prisma } from '@prisma/client';
import { DeliveryProvider } from '../delivery-provider.interface';

const ORDER_STATUS_TO_DELIVERY_STATUS: Record<OrderStatus, DeliveryStatus> = {
  [OrderStatus.PENDING]: DeliveryStatus.WAITING,
  [OrderStatus.CONFIRMED]: DeliveryStatus.WAITING,
  [OrderStatus.PREPARING]: DeliveryStatus.WAITING,
  [OrderStatus.OUT_FOR_DELIVERY]: DeliveryStatus.IN_TRANSIT,
  [OrderStatus.DELIVERED]: DeliveryStatus.DELIVERED,
  [OrderStatus.CANCELLED]: DeliveryStatus.FAILED,
};

/**
 * Entrega feita pela própria loja: o lojista gerencia tudo manualmente através
 * do status do pedido (PENDING → ... → DELIVERED/CANCELLED), e o status da
 * entrega é mantido em sincronia automaticamente.
 */
export class SelfDeliveryProvider implements DeliveryProvider {
  createDelivery(client: Prisma.TransactionClient, orderId: string) {
    return client.delivery.create({
      data: {
        orderId,
        provider: DeliveryProviderType.SELF,
        status: DeliveryStatus.WAITING,
      },
    });
  }

  syncStatus(client: Prisma.TransactionClient, orderId: string, orderStatus: OrderStatus) {
    return client.delivery.update({
      where: { orderId },
      data: { status: ORDER_STATUS_TO_DELIVERY_STATUS[orderStatus] },
    });
  }
}
