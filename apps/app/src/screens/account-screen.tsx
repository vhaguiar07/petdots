import type { AuthenticatedUser, Pet, TutorProfile, UserRole } from '@petdots/contracts';
import { formatBrazilianPhone, formatPostalCode } from '@petdots/domain';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '../api/http';
import { me } from '../api/identity';
import { findMyProfile, listMyPets } from '../api/tutors';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Heading } from '../ui/primitives';
import { Colors, Spacing } from '../ui/theme';

/** How each role reads to a person, rather than to the database. */
const ROLE_LABEL: Record<UserRole, string> = {
  TUTOR: 'Tutor',
  STORE_MEMBER: 'Lojista',
  ADMIN: 'Administração',
};

const SPECIES_LABEL: Record<Pet['species'], string> = { DOG: 'Cão', CAT: 'Gato' };

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly user: AuthenticatedUser };

/** The tutor half of the page, loaded separately so a failure here is contained. */
type TutorLoad =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly profile: TutorProfile | null; readonly pets: Pet[] };

/**
 * The account page — and the reason `GET /auth/me` exists.
 *
 * It re-reads the identity from the API on mount instead of rendering the user
 * already in the stored session. That is the point: it is what actually
 * exercises `Authorization: Bearer`, the proactive renewal and the reactive
 * retry end to end. Reading the local copy would make the whole session
 * machinery untested by the app that depends on it (ADR-0012, P1).
 *
 * Since pd-14 it is also the tutor's home: the address, the pets, and the way
 * back into the comparator. That half only exists for someone who holds the
 * `TUTOR` role — `admin@` has no profile to complete, and offering one would be
 * an invitation to a `403`.
 */
export function AccountScreen() {
  const router = useRouter();
  const { http, signOut } = useSession();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [tutor, setTutor] = useState<TutorLoad>({ kind: 'loading' });
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

  const isTutor = load.kind === 'ready' && load.user.roles.includes('TUTOR');

  useEffect(() => {
    if (!isTutor) {
      return;
    }

    const controller = new AbortController();

    // In parallel: neither answer depends on the other, and the page shows them
    // in one card.
    void Promise.all([
      findMyProfile(http, controller.signal),
      listMyPets(http, controller.signal).catch((error: unknown) => {
        // An account with no profile has no pets either, and the route says so
        // with `TUTOR_NOT_FOUND`. An empty list is the honest reading of that,
        // and it keeps the "complete your profile" card from being hidden
        // behind a failure state. Anything else still propagates.
        if (error instanceof ApiError && error.status === 404) {
          return [] as Pet[];
        }

        throw error;
      }),
    ])
      .then(([profile, pets]) => {
        setTutor({ kind: 'ready', profile, pets });
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        // Contained on purpose: the account page still shows the e-mail, the
        // roles and "Sair" when the tutor half cannot be read.
        setTutor({ kind: 'unavailable' });
      });

    return () => {
      controller.abort();
    };
  }, [http, isTutor]);

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

      {isTutor ? <TutorSection load={tutor} /> : null}

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

function TutorSection({ load }: { load: TutorLoad }) {
  if (load.kind === 'loading') {
    return <Body muted>Carregando seus dados…</Body>;
  }

  if (load.kind === 'unavailable') {
    return (
      <Card>
        <Heading level={3}>Não conseguimos carregar seu cadastro</Heading>
        <Body muted>Tente de novo em instantes.</Body>
      </Card>
    );
  }

  // No profile yet: one call to action, and nothing that looks like an error —
  // this is what every account looks like right after it is created.
  if (!load.profile) {
    return (
      <Card style={styles.card}>
        <Heading level={3}>Complete seu cadastro</Heading>
        <Body muted>Com seu endereço a gente já mostra quem entrega na sua casa e por quanto.</Body>
        <View style={styles.actions}>
          <Link href="/conta/endereco?onboarding=1" style={styles.buttonLink}>
            Informar endereço
          </Link>
        </View>
      </Card>
    );
  }

  const { profile, pets } = load;

  return (
    <>
      <Card style={styles.card}>
        <Heading level={3}>Seu endereço</Heading>
        <Body>{profile.name}</Body>
        <Body muted>
          {`${profile.address.street}, ${profile.address.number}`}
          {profile.address.complement ? ` · ${profile.address.complement}` : ''}
        </Body>
        <Body
          muted
        >{`${profile.address.neighborhood} · ${formatPostalCode(profile.address.postalCode)}`}</Body>
        {profile.phone ? <Body muted>{formatBrazilianPhone(profile.phone)}</Body> : null}

        <View style={styles.actions}>
          <Link href="/conta/endereco" style={styles.buttonLink}>
            Editar endereço
          </Link>
        </View>
      </Card>

      <Card style={styles.card}>
        <Heading level={3}>Seus pets</Heading>

        {pets.length === 0 ? (
          <Body muted>Você ainda não cadastrou um pet.</Body>
        ) : (
          <View style={styles.pets}>
            {pets.map((pet) => (
              <Link key={pet.id} href={`/conta/pets/${pet.id}`} style={styles.petLink}>
                {`${pet.name} · ${SPECIES_LABEL[pet.species]} · ${formatWeight(pet.weightGrams)}`}
              </Link>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <Link href="/conta/pets/novo" style={styles.buttonLink}>
            Adicionar pet
          </Link>
        </View>
      </Card>

      {/* The payoff of having an address at all: the comparator now knows where
          the person lives (ADR-0015, A10). */}
      <Link href="/" style={styles.link}>
        Comparar preços no seu bairro →
      </Link>
    </>
  );
}

/** Grams are the contract; kilograms with one decimal are what a person reads. */
function formatWeight(grams: number): string {
  return `${(grams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
}

const styles = StyleSheet.create({
  card: { maxWidth: 520, gap: Spacing.md },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { alignItems: 'flex-start' },
  pets: { gap: Spacing.sm },
  petLink: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  // A link styled as a button: it keeps a real `<a href>`, so back/forward and
  // open-in-new-tab still work — the same reason the nav uses links.
  buttonLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
