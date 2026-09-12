import type { AuthenticatedUser, UserRole } from '@petdots/contracts';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { me } from '../api/identity';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Heading } from '../ui/primitives';
import { Spacing } from '../ui/theme';

/** How each role reads to a person, rather than to the database. */
const ROLE_LABEL: Record<UserRole, string> = {
  TUTOR: 'Tutor',
  STORE_MEMBER: 'Lojista',
  ADMIN: 'Administração',
};

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly user: AuthenticatedUser };

/**
 * The account page — and the reason `GET /auth/me` exists.
 *
 * It re-reads the identity from the API on mount instead of rendering the user
 * already in the stored session. That is the point: it is what actually
 * exercises `Authorization: Bearer`, the proactive renewal and the reactive
 * retry end to end. Reading the local copy would make the whole session
 * machinery untested by the app that depends on it (ADR-0012, P1).
 */
export function AccountScreen() {
  const router = useRouter();
  const { http, signOut } = useSession();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void me(http, controller.signal)
      .then((user) => {
        setLoad({ kind: 'ready', user });
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        // 🔴 **Every** failure lands on a drawn state, and that is the point.
        // An earlier version only handled `ApiUnavailableError`, on the theory
        // that a 401 would have signed the person out and the private layout
        // would redirect before this mattered. Anything else — a 500 from the
        // refresh, a body that fails the schema — set no state at all, and the
        // screen sat on "Carregando sua sessão…" forever. A screen that can
        // hang is worse than one that says the wrong thing: the person has no
        // way to tell waiting from broken.
        //
        // "Unavailable" is the honest label for all of them: the account could
        // not be read, and the session stays on the device either way.
        setLoad({ kind: 'unavailable' });
      });

    return () => {
      controller.abort();
    };
  }, [http]);

  return (
    <AppShell title="Minha conta">
      {load.kind === 'loading' ? <Body muted>Carregando sua sessão…</Body> : null}

      {load.kind === 'unavailable' ? (
        <Card>
          <Heading level={3}>Não conseguimos falar com o servidor</Heading>
          <Body muted>Sua sessão continua ativa neste aparelho. Tente de novo em instantes.</Body>
        </Card>
      ) : null}

      {load.kind === 'ready' ? (
        <Card style={styles.card}>
          <Body>{`Você está logado como ${load.user.email}`}</Body>

          <View style={styles.roles}>
            {load.user.roles.map((role) => (
              <Badge key={role} label={ROLE_LABEL[role]} tone="accent" />
            ))}
          </View>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={signingOut ? 'Saindo…' : 'Sair'}
          tone="danger"
          disabled={signingOut}
          onPress={() => {
            setSigningOut(true);
            // Navigate **first**: the moment the state turns `signedOut`, the
            // private layout would redirect to `/entrar`, and someone who just
            // pressed "Sair" should land on the comparator, not on a login
            // form (ADR-0012, A18).
            router.replace('/');
            void signOut();
          }}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: { maxWidth: 520, gap: Spacing.md },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { alignItems: 'flex-start' },
});
