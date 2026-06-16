import { io, type Socket } from 'socket.io-client';
import { Order } from './types/entities';

export interface OrdersServerToClientEvents {
  'order:created': (order: Order) => void;
  'order:updated': (order: Order) => void;
}

export type OrdersSocket = Socket<OrdersServerToClientEvents>;

/**
 * Conecta ao namespace `/orders` do gateway de WebSocket da API, autenticando
 * com o mesmo access token usado nas chamadas REST.
 */
export function createOrdersSocket(baseUrl: string, accessToken: string): OrdersSocket {
  return io(`${baseUrl.replace(/\/$/, '')}/orders`, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });
}
