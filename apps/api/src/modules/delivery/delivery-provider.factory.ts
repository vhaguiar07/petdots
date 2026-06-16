import { Injectable } from '@nestjs/common';
import { DeliveryProviderType } from '@prisma/client';
import { DeliveryProvider } from './delivery-provider.interface';
import { SelfDeliveryProvider } from './providers/self-delivery.provider';
import { ExternalDeliveryProvider } from './providers/external-delivery.provider';

@Injectable()
export class DeliveryProviderFactory {
  private readonly providers: Record<DeliveryProviderType, DeliveryProvider> = {
    [DeliveryProviderType.SELF]: new SelfDeliveryProvider(),
    [DeliveryProviderType.EXTERNAL]: new ExternalDeliveryProvider(),
  };

  resolve(type: DeliveryProviderType): DeliveryProvider {
    return this.providers[type];
  }
}
