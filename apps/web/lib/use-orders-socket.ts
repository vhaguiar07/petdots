"use client";

import { useEffect, useRef } from "react";
import { createOrdersSocket, type Order } from "@petdots/shared";

const ACCESS_TOKEN_KEY = "petdots.accessToken";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface OrdersSocketHandlers {
  onOrderCreated?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
}

/**
 * Conecta ao gateway de WebSocket de pedidos enquanto o componente estiver
 * montado, usando o access token atual. Útil para refletir mudanças de status
 * em tempo real sem precisar recarregar a página.
 */
export function useOrdersSocket(handlers: OrdersSocketHandlers) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;

    const socket = createOrdersSocket(API_URL, token);
    socket.on("order:created", (order) => handlersRef.current.onOrderCreated?.(order));
    socket.on("order:updated", (order) => handlersRef.current.onOrderUpdated?.(order));

    return () => {
      socket.disconnect();
    };
  }, []);
}
