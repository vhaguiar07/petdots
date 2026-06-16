import { Module } from '@nestjs/common';
import { DeliveryProviderFactory } from './delivery-provider.factory';

@Module({
  providers: [DeliveryProviderFactory],
  exports: [DeliveryProviderFactory],
})
export class DeliveryModule {}
