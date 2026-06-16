import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { TransportTargetOptions } from 'pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { StoresModule } from './modules/stores/stores.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const logTargets: TransportTargetOptions[] = [
  ...(process.env.NODE_ENV === 'production'
    ? []
    : [{ target: 'pino-pretty', options: { singleLine: true }, level: logLevel }]),
  ...(process.env.LOKI_URL
    ? [
        {
          target: 'pino-loki',
          options: {
            host: process.env.LOKI_URL,
            labels: { service: 'petdots-api', env: process.env.NODE_ENV ?? 'development' },
          },
          level: logLevel,
        },
      ]
    : []),
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: logLevel,
        transport: logTargets.length > 0 ? { targets: logTargets } : undefined,
        redact: ['req.headers.authorization'],
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    AuditLogModule,
    UsersModule,
    AuthModule,
    StoresModule,
    CategoriesModule,
    ProductsModule,
    PromotionsModule,
    AddressesModule,
    OrdersModule,
    AdminModule,
    UploadsModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
