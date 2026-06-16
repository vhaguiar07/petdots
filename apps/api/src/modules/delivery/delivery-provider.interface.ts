import { Delivery, OrderStatus, Prisma } from '@prisma/client';

/**
 * Abstrai como a entrega de um pedido é gerenciada, permitindo que o
 * `OrdersService` não precise saber se a loja entrega por conta própria (SELF)
 * ou via um parceiro externo (EXTERNAL).
 */
export interface DeliveryProvider {
  /** Cria o registro de `Delivery` para um pedido recém-criado. */
  createDelivery(client: Prisma.TransactionClient, orderId: string): Promise<Delivery>;

  /**
   * Sincroniza o status da entrega quando o status do pedido muda.
   * Retorna `null` quando o provedor não atualiza a entrega a partir do
   * status do pedido (ex.: EXTERNAL, que depende de webhook do parceiro).
   */
  syncStatus(
    client: Prisma.TransactionClient,
    orderId: string,
    orderStatus: OrderStatus,
  ): Promise<Delivery | null>;
}
