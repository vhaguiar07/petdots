import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/types/authenticated-user';

interface OrderForEvent {
  id: string;
  customerId: string;
  storeId: string;
}

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000', 'http://localhost:8081'],
    credentials: true,
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      await client.join(`user:${payload.sub}`);

      if (payload.role === UserRole.STORE_OWNER) {
        const store = await this.prisma.store.findFirst({ where: { ownerId: payload.sub } });
        if (store) {
          await client.join(`store:${store.id}`);
        }
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {
    // Nada a fazer: o socket.io já remove o client de todas as rooms.
  }

  private extractToken(client: Socket): string {
    const token = client.handshake.auth?.token as string | undefined;
    if (token) return token;

    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length);

    throw new Error('Token não informado');
  }

  emitOrderCreated(order: OrderForEvent) {
    this.server.to(`store:${order.storeId}`).emit('order:created', order);
  }

  emitOrderUpdated(order: OrderForEvent) {
    this.server.to(`user:${order.customerId}`).emit('order:updated', order);
    this.server.to(`store:${order.storeId}`).emit('order:updated', order);
  }
}
