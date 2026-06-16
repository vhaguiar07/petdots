import { DeliveryProviderType, DeliveryStatus, Prisma } from '@prisma/client';
import { DeliveryProvider } from '../delivery-provider.interface';

/**
 * Entrega via parceiro externo (ex.: Uber Direct, Loggi). Ainda não há
 * integração real: o registro de `Delivery` é criado para deixar o pedido
 * pronto para rastreamento, mas o status só será atualizado quando uma
 * integração futura passar a chamar a API do parceiro e/ou receber webhooks.
 */
export class ExternalDeliveryProvider implements DeliveryProvider {
  createDelivery(client: Prisma.TransactionClient, orderId: string) {
    return client.delivery.create({
      data: {
        orderId,
        provider: DeliveryProviderType.EXTERNAL,
        status: DeliveryStatus.WAITING,
      },
    });
  }

  async syncStatus() {
    // O status da entrega externa não é derivado do status do pedido — virá
    // da integração com o parceiro (chamada de API e/ou webhook), ainda não
    // implementada.
    return null;
  }
}
