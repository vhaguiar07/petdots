import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Body, Button, Card, Heading } from '../ui/primitives';
import { Colors, formatCents, Spacing } from '../ui/theme';
import { useCart } from './cart-context';
import { cartItemCount, cartSubtotalCents, type CartLine, type CartStore } from './cart-state';

/**
 * "Adicionar", the store-conflict question and the cart bar, in one place.
 *
 * They live here rather than in a screen because **two** screens put an item in
 * the cart: the shopfront (`/loja/{id}`) and the comparator
 * (`/precos/{slug}`). The rule that a cart holds one store is the same in both,
 * and so is the question it has to ask — duplicating it would be duplicating a
 * decision the person gets to make (`DIRETRIZES` Fase 2: reaproveitar ao
 * máximo).
 */
export interface PendingSwitch {
  currentStoreName: string;
  store: CartStore;
  line: CartLine;
}

/**
 * Wires "add" to the two things it can produce besides success: a conflict to
 * resolve, and a full cart.
 *
 * The hook owns the state because the answer to the conflict must outlive the
 * tap that caused it — the person is asked, and answers later.
 */
export function useAddToCart() {
  const { add, switchStore } = useCart();
  const [pending, setPending] = useState<PendingSwitch | null>(null);
  const [full, setFull] = useState(false);

  const addLine = (store: CartStore, line: CartLine) => {
    setFull(false);

    const result = add(store, line);

    if (result.kind === 'conflict') {
      // Nothing changed in the cart: deciding here would throw away what the
      // person already picked somewhere else.
      setPending({ currentStoreName: result.currentStoreName, store, line });
    }

    if (result.kind === 'full') {
      setFull(true);
    }
  };

  const confirmSwitch = () => {
    if (pending) {
      switchStore(pending.store, pending.line);
      setPending(null);
    }
  };

  const keepCurrent = () => {
    setPending(null);
  };

  return { addLine, pending, confirmSwitch, keepCurrent, full };
}

/**
 * The question, in two steps: nothing is thrown away until the person says so.
 *
 * Same shape as the pet deletion (`pd-14`) and the order cancellation: an
 * action that cannot be undone asks once, plainly, with both ways out visible.
 */
export function StoreConflictCard({
  pending,
  onConfirm,
  onKeep,
}: {
  pending: PendingSwitch;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  return (
    <Card style={styles.conflictCard}>
      <Heading level={3}>Seu carrinho tem itens de {pending.currentStoreName}</Heading>
      <Body muted>Um pedido é de uma loja só. Trocar de loja apaga o que você já escolheu.</Body>
      <View style={styles.conflictActions}>
        <Button label="Trocar de loja e adicionar" tone="danger" onPress={onConfirm} />
        <Button label="Manter" onPress={onKeep} />
      </View>
    </Card>
  );
}

export function CartFullNotice() {
  return <Body muted>Seu carrinho já está cheio. Remova um item antes de adicionar outro.</Body>;
}

/**
 * How much is in the cart, and the way to it.
 *
 * In the flow rather than fixed to the viewport: a floating bar on a 390px
 * screen covers the last row of the table, which is the row somebody is usually
 * reaching for.
 *
 * It names the store when the cart belongs to a **different** one than the
 * screen is showing — otherwise the person could add here and not understand
 * why the total looks like someone else's.
 */
export function CartBar({ currentStoreId }: { currentStoreId?: string }) {
  const router = useRouter();
  const { cart } = useCart();

  if (!cart || cart.lines.length === 0) {
    return null;
  }

  const count = cartItemCount(cart);
  const elsewhere = currentStoreId !== undefined && cart.storeId !== currentStoreId;

  return (
    <View style={styles.cartBar}>
      <Body>
        {count === 1 ? '1 item' : `${String(count)} itens`} · {formatCents(cartSubtotalCents(cart))}
        {elsewhere ? ` · em ${cart.storeName}` : ''}
      </Body>
      <Button
        label="Ver carrinho"
        tone="primary"
        onPress={() => {
          router.push('/carrinho');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  conflictCard: { borderColor: Colors.warning, gap: Spacing.sm },
  conflictActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
});
