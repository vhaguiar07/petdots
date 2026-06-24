"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StoreProduct, Address } from "@petdots/shared";
import { getEffectiveUnitPrice } from "./pricing";
import { useAuth } from "./auth-context";
import { apiClient } from "./api-client";

const CART_STORAGE_KEY = "petdots.cart";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface CartItem {
  storeProductId: string;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
  stock: number;
}

export interface Cart {
  storeId: string;
  storeName: string;
  items: CartItem[];
}

export interface AddItemStoreInfo {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  deliveryRadiusKm?: number | null;
}

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  subtotal: number;
  /** Retorna `false` se o usuário cancelou a troca de loja (carrinho não foi alterado) ou se excedeu o raio de entrega. */
  addItem: (product: StoreProduct, store: AddItemStoreInfo) => boolean;
  updateQuantity: (storeProductId: string, quantity: number) => void;
  removeItem: (storeProductId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        setCart(JSON.parse(stored) as Cart);
      } catch {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (cart) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [cart, isLoaded]);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      return;
    }
    apiClient
      .listAddresses()
      .then(setAddresses)
      .catch(() => {});
  }, [user]);

  const showToast = useCallback((message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const addItem = useCallback(
    (product: StoreProduct, store: AddItemStoreInfo) => {
      // 1. Validar raio de entrega se o lojista e o cliente possuírem geolocalização configurada
      if (
        user &&
        store.latitude != null &&
        store.longitude != null &&
        store.deliveryRadiusKm != null
      ) {
        const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
        if (
          defaultAddress &&
          defaultAddress.latitude != null &&
          defaultAddress.longitude != null
        ) {
          const dist = haversineKm(
            defaultAddress.latitude,
            defaultAddress.longitude,
            store.latitude,
            store.longitude
          );
          if (dist > store.deliveryRadiusKm) {
            showToast(
              `Esta loja não realiza entregas no seu endereço padrão (distância: ${dist.toFixed(1)} km, raio máximo: ${store.deliveryRadiusKm} km)`,
              "error"
            );
            return false;
          }
        }
      }

      // 2. Confirmação de troca de carrinho entre lojas diferentes
      if (cart && cart.storeId !== store.id) {
        const confirmed = window.confirm(
          `Seu carrinho contém itens de "${cart.storeName}". Ao adicionar um produto de "${store.name}", o carrinho atual será substituído. Deseja continuar?`,
        );
        if (!confirmed) return false;
      }

      setCart((prev) => {
        const base: Cart =
          prev && prev.storeId === store.id
            ? prev
            : { storeId: store.id, storeName: store.name, items: [] };

        const existing = base.items.find((item) => item.storeProductId === product.id);
        const unitPrice = getEffectiveUnitPrice(product);
        const imageUrl = product.catalogProduct.images[0]?.url ?? null;

        let items: CartItem[];
        if (existing) {
          const nextQuantity = Math.min(existing.quantity + 1, product.stock);
          items = base.items.map((item) =>
            item.storeProductId === product.id ? { ...item, quantity: nextQuantity } : item,
          );
        } else {
          items = [
            ...base.items,
            {
              storeProductId: product.id,
              name: product.catalogProduct.name,
              unitPrice,
              imageUrl,
              quantity: Math.min(1, product.stock),
              stock: product.stock,
            },
          ];
        }

        return { ...base, items };
      });

      return true;
    },
    [cart, user, addresses, showToast],
  );

  const updateQuantity = useCallback((storeProductId: string, quantity: number) => {
    setCart((prev) => {
      if (!prev) return prev;
      if (quantity <= 0) {
        const items = prev.items.filter((item) => item.storeProductId !== storeProductId);
        return items.length > 0 ? { ...prev, items } : null;
      }
      const items = prev.items.map((item) =>
        item.storeProductId === storeProductId
          ? { ...item, quantity: Math.min(quantity, item.stock) }
          : item,
      );
      return { ...prev, items };
    });
  }, []);

  const removeItem = useCallback((storeProductId: string) => {
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items.filter((item) => item.storeProductId !== storeProductId);
      return items.length > 0 ? { ...prev, items } : null;
    });
  }, []);

  const clear = useCallback(() => {
    setCart(null);
  }, []);

  const itemCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart],
  );

  const subtotal = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) ?? 0,
    [cart],
  );

  return (
    <CartContext.Provider
      value={{ cart, itemCount, subtotal, addItem, updateQuantity, removeItem, clear }}
    >
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900/95 backdrop-blur-md text-white px-4.5 py-4 rounded-2xl shadow-2xl border border-zinc-800/80 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${toast.type === "error" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
            {toast.type === "error" ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              {toast.type === "error" ? "Entrega Indisponível" : "Sucesso"}
            </p>
            <p className="text-sm font-medium text-zinc-200 mt-0.5 leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart deve ser usado dentro de um CartProvider");
  }
  return context;
}
