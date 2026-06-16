import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { DeliveryModule } from '../delivery/delivery.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [JwtModule.register({}), DeliveryModule, PromotionsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersService],
})
export class OrdersModule {}
