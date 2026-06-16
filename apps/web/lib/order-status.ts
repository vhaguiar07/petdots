import type { OrderStatus } from "@petdots/shared";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparação",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-blue-100 text-blue-700",
  OUT_FOR_DELIVERY: "bg-primary-100 text-primary-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

/** Cores hexadecimais correspondentes a `ORDER_STATUS_STYLES`, para uso em gráficos (ex: recharts). */
export const ORDER_STATUS_CHART_COLORS: Record<OrderStatus, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  PREPARING: "#3b82f6",
  OUT_FOR_DELIVERY: "#ff8a33",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
};

const CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING"];

export function isOrderCancellable(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

/** Espelha `ALLOWED_TRANSITIONS` de `OrdersService` no backend. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
