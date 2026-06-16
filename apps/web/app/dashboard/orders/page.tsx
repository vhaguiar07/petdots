"use client";

import { useEffect, useState } from "react";
import { ApiError, type Order, type OrderStatus, type Store } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/pricing";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, ORDER_STATUS_TRANSITIONS } from "@/lib/order-status";
import { useOrdersSocket } from "@/lib/use-orders-socket";

export default function DashboardOrdersPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getMyStore()
      .then((result) => setStore(result))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar sua loja."));
  }, []);

  const loadOrders = (storeId: string) => {
    apiClient
      .listOrders({ storeId })
      .then(setOrders)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar os pedidos."));
  };

  useEffect(() => {
    if (store) loadOrders(store.id);
  }, [store]);

  useOrdersSocket({
    onOrderCreated: (created) => {
      if (created.storeId !== store?.id) return;
      setOrders((current) => (current ? [created, ...current] : current));
    },
    onOrderUpdated: (updated) => {
      if (updated.storeId !== store?.id) return;
      setOrders((current) =>
        current?.map((order) => (order.id === updated.id ? updated : order)) ?? current,
      );
    },
  });

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    if (!store) return;
    setUpdatingId(orderId);
    setError(null);
    try {
      await apiClient.updateOrderStatus(orderId, { status });
      loadOrders(store.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!store) {
    return <p className="text-sm text-ink-muted">Carregando...</p>;
  }

  if (orders === null) {
    return <p className="text-sm text-ink-muted">Carregando pedidos...</p>;
  }

  if (orders.length === 0) {
    return <p className="text-sm text-ink-muted">Nenhum pedido recebido ainda.</p>;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status];
        return (
          <div
            key={order.id}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4 hover:shadow-md transition duration-200"
          >
            {/* Top row - Order Identification & Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 select-none">
              <div>
                <p className="text-sm font-bold text-ink">
                  Pedido #{order.id.slice(-8)}
                </p>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  {new Date(order.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>

              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${ORDER_STATUS_STYLES[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>

            {/* Middle row - Items list block */}
            <div className="bg-surface-muted border border-border/80 rounded-xl p-3.5 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ink">
                    {item.quantity}x {item.product?.name ?? "Produto"}
                  </span>
                  <span className="font-bold text-ink-muted">
                    {formatCurrency(Number(item.unitPrice) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom row - Total & Action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-border">
              <div className="flex items-baseline gap-1.5 select-none">
                <span className="text-xs text-ink-muted font-semibold">Valor Total:</span>
                <span className="text-base font-black text-primary-600">
                  {formatCurrency(Number(order.total))}
                </span>
              </div>

              {/* Transition Action Buttons */}
              {nextStatuses.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {nextStatuses.map((status) => {
                    let btnClass = "bg-zinc-800 hover:bg-zinc-900 text-white shadow-xs";
                    let label = ORDER_STATUS_LABELS[status];

                    if (status === "CONFIRMED") {
                      btnClass = "bg-primary-500 hover:bg-primary-600 text-white shadow-xs";
                      label = "Aceitar Pedido";
                    } else if (status === "PREPARING") {
                      btnClass = "bg-blue-600 hover:bg-blue-700 text-white shadow-xs";
                      label = "Iniciar Preparo";
                    } else if (status === "OUT_FOR_DELIVERY") {
                      btnClass = "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs";
                      label = "Despachar Pedido";
                    } else if (status === "DELIVERED") {
                      btnClass = "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs";
                      label = "Concluir Entrega";
                    } else if (status === "CANCELLED") {
                      btnClass = "border border-rose-200 text-rose-600 hover:bg-rose-50";
                      label = "Cancelar Pedido";
                    }

                    return (
                      <button
                        key={status}
                        disabled={updatingId === order.id}
                        onClick={() => handleStatusChange(order.id, status)}
                        className={`rounded-xl py-2 px-3 text-xs font-bold transition duration-150 cursor-pointer ${btnClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
