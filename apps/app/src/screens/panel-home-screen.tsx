import type { StoreMembership } from '@petdots/contracts';
import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '../api/http';
import { listMyStoreMemberships } from '../api/store-panel';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Card, Heading } from '../ui/primitives';
import { Colors, Spacing } from '../ui/theme';

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly memberships: StoreMembership[] };

const ROLE_LABEL: Record<StoreMembership['role'], string> = {
  OWNER: 'Dona',
  OPERATOR: 'Operador',
};

/**
 * The panel's front door.
 *
 * 🔴 One membership **redirects straight through**, which is the common case and
 * the whole reason this screen is not a list: a shopkeeper with one shop should
 * never have to choose it. The list exists because ADR-0013 B8 made the link
 * N:N — one person may own the shop on one corner and work the counter of
 * another — and the store is in the URL precisely because "the store of this
 * user" has no single answer.
 */
export function PanelHomeScreen() {
  const { http } = useSession();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    void listMyStoreMemberships(http, controller.signal)
      .then((memberships) => {
        setLoad({ kind: 'ready', memberships });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setLoad(
          error instanceof ApiError && error.status === 403
            ? { kind: 'denied' }
            : error instanceof ApiUnavailableError
              ? { kind: 'unavailable' }
              : { kind: 'unavailable' },
        );
      });

    return () => {
      controller.abort();
    };
  }, [http]);

  if (load.kind === 'loading') {
    return (
      <AppShell title="Painel da loja">
        <Body muted>Carregando suas lojas…</Body>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable') {
    return (
      <AppShell title="Painel da loja">
        <Body muted>Não conseguimos carregar suas lojas agora. Tente de novo em instantes.</Body>
      </AppShell>
    );
  }

  // What a tutor sees if they type the URL: the coarse guard already refused
  // the request, and this is the same answer in words.
  if (load.kind === 'denied' || load.memberships.length === 0) {
    return (
      <AppShell title="Painel da loja">
        <Body muted>Sua conta não opera nenhuma loja.</Body>
        <Link href="/" style={styles.link}>
          ← Voltar ao comparador
        </Link>
      </AppShell>
    );
  }

  const [only] = load.memberships;

  if (load.memberships.length === 1 && only) {
    return <Redirect href={`/painel/${only.store.id}`} />;
  }

  return (
    <AppShell title="Painel da loja" subtitle="Escolha a loja que você quer operar">
      {load.memberships.map((membership) => (
        <Card key={membership.store.id}>
          <View style={styles.cardHeader}>
            <Heading level={3}>{membership.store.name}</Heading>
            <Badge label={ROLE_LABEL[membership.role]} tone="accent" />
          </View>
          <Body muted>{membership.store.neighborhood}</Body>
          {/* A real `<a href>` rather than a pressable card: back, reload and
              open-in-new-tab all need something to act on (the rule the rest of
              the app already follows). */}
          <Link href={`/painel/${membership.store.id}`} style={styles.link}>
            Abrir o painel →
          </Link>
        </Card>
      ))}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
});
