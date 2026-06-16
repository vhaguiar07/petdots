import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import type { Product } from '@petdots/shared';
import { getEffectiveUnitPrice } from './pricing';

const CART_STORAGE_KEY = 'petdots.cart';

export interface CartItem {
  productId: string;
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

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  subtotal: number;
  /** Retorna `false` se o usuário cancelou a troca de loja (carrinho não foi alterado). */
  addItem: (product: Product, store: { id: string; name: string }) => Promise<boolean>;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function confirmStoreSwitch(currentStoreName: string, nextStoreName: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Substituir carrinho?',
      `Seu carrinho contém itens de "${currentStoreName}". Ao adicionar um produto de "${nextStoreName}", o carrinho atual será substituído. Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Substituir', style: 'destructive', onPress: () => resolve(true) },
      ],
    );
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            setCart(JSON.parse(stored) as Cart);
          } catch {
            AsyncStorage.removeItem(CART_STORAGE_KEY);
          }
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (cart) {
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } else {
      AsyncStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [cart, isLoaded]);

  const addItem = useCallback(
    async (product: Product, store: { id: string; name: string }) => {
      if (cart && cart.storeId !== store.id) {
        const confirmed = await confirmStoreSwitch(cart.storeName, store.name);
        if (!confirmed) return false;
      }

      setCart((prev) => {
        const base: Cart =
          prev && prev.storeId === store.id
            ? prev
            : { storeId: store.id, storeName: store.name, items: [] };

        const existing = base.items.find((item) => item.productId === product.id);
        const unitPrice = getEffectiveUnitPrice(product);
        const imageUrl = product.images[0]?.url ?? null;

        let items: CartItem[];
        if (existing) {
          const nextQuantity = Math.min(existing.quantity + 1, product.stock);
          items = base.items.map((item) =>
            item.productId === product.id ? { ...item, quantity: nextQuantity } : item,
          );
        } else {
          items = [
            ...base.items,
            {
              productId: product.id,
              name: product.name,
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
    [cart],
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      if (!prev) return prev;
      if (quantity <= 0) {
        const items = prev.items.filter((item) => item.productId !== productId);
        return items.length > 0 ? { ...prev, items } : null;
      }
      const items = prev.items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.stock) }
          : item,
      );
      return { ...prev, items };
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items.filter((item) => item.productId !== productId);
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
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
}
