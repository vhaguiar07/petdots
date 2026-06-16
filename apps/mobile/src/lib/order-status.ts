import type { OrderStatus } from '@petdots/shared';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparação',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#FEF3C7', fg: '#B45309' },
  CONFIRMED: { bg: '#DBEAFE', fg: '#1D4ED8' },
  PREPARING: { bg: '#DBEAFE', fg: '#1D4ED8' },
  OUT_FOR_DELIVERY: { bg: '#FFE4D1', fg: '#B34900' },
  DELIVERED: { bg: '#DCFCE7', fg: '#15803D' },
  CANCELLED: { bg: '#FEE2E2', fg: '#B91C1C' },
};
