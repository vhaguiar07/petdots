"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Order } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/pricing";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/order-status";
import { useOrdersSocket } from "@/lib/use-orders-socket";

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiClient
      .listOrders()
      .then(setOrders)
      .catch(() => setError("Não foi possível carregar seus pedidos."));
  }, [user]);

  useOrdersSocket({
    onOrderUpdated: (updated) => {
      setOrders((current) =>
        current?.map((order) => (order.id === updated.id ? updated : order)) ?? current,
      );
    },
  });

  if (authLoading || !user) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Minhas compras</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {orders === null && !error && (
        <p className="mt-4 text-sm text-ink-muted">Carregando pedidos...</p>
      )}
      {orders?.length === 0 && (
        <p className="mt-4 text-sm text-ink-muted">Você ainda não fez nenhum pedido.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {orders?.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-primary-300 hover:shadow-md"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{order.store?.name ?? "Loja"}</p>
              <p className="text-xs text-ink-muted">
                {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-1 text-sm font-bold text-ink">{formatCurrency(Number(order.total))}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS_STYLES[order.status]}`}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
