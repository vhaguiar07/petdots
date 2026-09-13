import {
  formatBrazilianPhone,
  formatPostalCode,
  isBrazilianMobilePhone,
  isPostalCode,
} from '@petdots/domain';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '../api/http';
import { findAddressByPostalCode } from '../api/postal-codes';
import { findMyProfile, saveMyProfile } from '../api/tutors';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { applyMask } from '../ui/masks';
import { Body, Button, Card, Field, Heading } from '../ui/primitives';
import { Colors, Spacing } from '../ui/theme';

type Load =
  { readonly kind: 'loading' } | { readonly kind: 'unavailable' } | { readonly kind: 'ready' };

/** Empty strings and not `undefined`: a controlled input needs a value from the first render. */
const EMPTY = {
  name: '',
  phone: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  postalCode: '',
  reference: '',
};

type Form = typeof EMPTY;

/**
 * The tutor's profile and default address — step one of the onboarding, and the
 * screen that makes the comparator personal (the CEP saved here pre-fills it).
 *
 * The same screen creates and edits, because `PUT /tutors/me` is an idempotent
 * upsert: there is no second state to show. What `?onboarding=1` changes is only
 * where "Salvar" goes and whether "Fazer depois" is offered.
 */
export function TutorProfileScreen() {
  const router = useRouter();
  const { http } = useSession();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === '1';

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lookup, setLookup] = useState<{ kind: 'idle' | 'searching' }>({ kind: 'idle' });
  const latestLookup = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    void findMyProfile(http, controller.signal)
      .then((profile) => {
        if (profile) {
          setForm({
            name: profile.name,
            phone: formatBrazilianPhone(profile.phone ?? ''),
            street: profile.address.street,
            number: profile.address.number,
            complement: profile.address.complement ?? '',
            neighborhood: profile.address.neighborhood,
            postalCode: formatPostalCode(profile.address.postalCode),
            reference: profile.address.reference ?? '',
          });
        }

        // No profile yet is the normal case here, not a failure: the form opens
        // empty and the person fills it in.
        setLoad({ kind: 'ready' });
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        // 🔴 **Every** failure lands on a drawn state (BUG-R01). A screen that
        // can sit on "Carregando…" forever is worse than one that says the
        // wrong thing: the person cannot tell waiting from broken.
        setLoad({ kind: 'unavailable' });
      });

    return () => {
      controller.abort();
    };
  }, [http]);

  const set = (field: keyof Form) => (next: string) => {
    setForm((current) => ({ ...current, [field]: next }));
  };

  /**
   * The two fields that carry a shape a Brazilian already has in their head.
   * The mask runs on every keystroke, so the field shows `(21) 99999-0001` and
   * `20720-000` while it is being typed — and the value that goes to the API is
   * this same formatted string, which the contract accepts and the use case
   * normalises (`isPostalCode`/`isBrazilianMobilePhone` ignore punctuation).
   */
  const setMasked = (field: keyof Form, format: (raw: string) => string) => (next: string) => {
    setForm((current) => ({ ...current, [field]: applyMask(current[field], next, format) }));
  };

  /**
   * O CEP é o campo que **identifica** a rua e o bairro, por isso vem primeiro e
   * por isso busca sozinho: assim que oito dígitos estão lá, a tela pergunta ao
   * `GET /postal-codes/{cep}` e preenche o resto.
   *
   * 🔴 **A busca nunca bloqueia nem falha para a pessoa.** `findAddressByPostalCode`
   * engole toda falha e devolve `null` — CEP inexistente, diretório fora do ar,
   * rede caída. O formulário continua digitável e salvável exatamente como
   * antes; a busca é conveniência, e conveniência que impede de salvar deixou de
   * ser conveniência.
   *
   * Rua e bairro são **sobrescritos** quando a busca acerta, e é o correto: o
   * CEP define os dois, então um CEP novo torna os valores antigos errados. Os
   * campos seguem editáveis — um logradouro que o diretório não conhece se
   * digita por cima.
   */
  const onPostalCodeChange = (next: string) => {
    const masked = applyMask(form.postalCode, next, formatPostalCode);

    setForm((current) => ({ ...current, postalCode: masked }));

    if (!isPostalCode(masked)) {
      setLookup({ kind: 'idle' });
      return;
    }

    // Carimbo de requisição, como no comparador: uma resposta atrasada de um CEP
    // já apagado não pode sobrescrever o que a pessoa está digitando agora.
    const stamp = ++latestLookup.current;
    setLookup({ kind: 'searching' });

    void findAddressByPostalCode(http, masked).then((address) => {
      if (stamp !== latestLookup.current) {
        return;
      }

      if (!address) {
        setLookup({ kind: 'idle' });
        return;
      }

      setForm((current) => ({
        ...current,
        // Um "CEP único" cobre uma cidade inteira e não nomeia logradouro: o
        // contrato devolve string vazia, e sobrescrever com ela apagaria o que a
        // pessoa digitou. Só preenche o que o diretório de fato sabe.
        street: address.street || current.street,
        neighborhood: address.neighborhood || current.neighborhood,
      }));
      setLookup({ kind: 'idle' });
    });
  };

  async function submit(): Promise<void> {
    if (submitting) {
      return;
    }

    setFailure(null);

    // The same domain functions the API would refuse it with run here first, so
    // a malformed CEP never becomes a request (the rule fixed in ADR-0010, A24).
    const local: Record<string, string> = {};

    if (!isPostalCode(form.postalCode.trim())) {
      local.postalCode = 'CEP deve ter 8 dígitos.';
    }

    if (!isBrazilianMobilePhone(form.phone.trim())) {
      local.phone = 'Informe um celular brasileiro com DDD.';
    }

    if (Object.keys(local).length > 0) {
      setFieldErrors(local);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      await saveMyProfile(http, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: {
          street: form.street.trim(),
          number: form.number.trim(),
          // Blank means "there is none", which the contract spells as absent.
          complement: form.complement.trim() || undefined,
          neighborhood: form.neighborhood.trim(),
          postalCode: form.postalCode.trim(),
          reference: form.reference.trim() || undefined,
        },
      });

      router.replace(isOnboarding ? '/conta/pets/novo?onboarding=1' : '/conta');
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        // `details[].field` arrives as the full path (`address.postalCode`), so
        // the map is indexed by path and the fields below read it that way.
        setFieldErrors(
          Object.fromEntries(error.details.map((detail) => [detail.field, detail.message])),
        );
      } else if (error instanceof ApiError) {
        setFailure(error.message);
      } else {
        setFailure('Não conseguimos falar com o servidor. Tente de novo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (load.kind === 'loading') {
    return (
      <AppShell title="Seu endereço">
        <Body muted>Carregando seus dados…</Body>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable') {
    return (
      <AppShell title="Seu endereço">
        <Card>
          <Heading level={3}>Não conseguimos falar com o servidor</Heading>
          <Body muted>Tente de novo em instantes.</Body>
        </Card>
        <Link href="/conta" style={styles.link}>
          ← Voltar para a conta
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title="Seu endereço" subtitle="É para onde as lojas entregam o seu pedido.">
      <Card style={styles.card}>
        <View style={styles.form}>
          <Field
            label="Nome"
            value={form.name}
            onChangeText={set('name')}
            placeholder="Como podemos te chamar"
            autoComplete="name"
            maxLength={120}
            error={fieldErrors.name}
          />

          <Field
            label="Celular"
            value={form.phone}
            onChangeText={setMasked('phone', formatBrazilianPhone)}
            placeholder="(21) 99999-0001"
            inputMode="tel"
            autoComplete="tel"
            maxLength={15}
            error={fieldErrors.phone}
          />

          <Field
            label="CEP"
            value={form.postalCode}
            onChangeText={onPostalCodeChange}
            placeholder="20720-000"
            hint={
              lookup.kind === 'searching'
                ? 'Buscando o endereço…'
                : 'A gente preenche a rua e o bairro para você.'
            }
            inputMode="numeric"
            maxLength={9}
            style={styles.rowNarrow}
            error={fieldErrors['address.postalCode']}
          />

          <Field
            label="Rua"
            value={form.street}
            onChangeText={set('street')}
            placeholder="Rua Dias da Cruz"
            maxLength={160}
            error={fieldErrors['address.street']}
          />

          <View style={styles.row}>
            <Field
              label="Número"
              value={form.number}
              onChangeText={set('number')}
              placeholder="100"
              maxLength={20}
              style={styles.rowNarrow}
              error={fieldErrors['address.number']}
            />

            <Field
              label="Complemento (opcional)"
              value={form.complement}
              onChangeText={set('complement')}
              placeholder="Apto 201"
              maxLength={80}
              style={styles.rowWide}
              error={fieldErrors['address.complement']}
            />
          </View>

          <Field
            label="Bairro"
            value={form.neighborhood}
            onChangeText={set('neighborhood')}
            placeholder="Méier"
            maxLength={80}
            error={fieldErrors['address.neighborhood']}
          />

          <Field
            label="Ponto de referência (opcional)"
            value={form.reference}
            onChangeText={set('reference')}
            placeholder="Perto da praça"
            maxLength={160}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            error={fieldErrors['address.reference']}
          />

          {failure ? (
            <Body style={styles.failure} role="alert">
              {failure}
            </Body>
          ) : null}

          <Button
            label={submitting ? 'Salvando…' : isOnboarding ? 'Salvar e continuar' : 'Salvar'}
            tone="primary"
            disabled={submitting}
            onPress={() => void submit()}
          />

          {/* Never blocking: the account is usable with none of this filled in. */}
          {isOnboarding ? (
            <Link href="/conta" style={styles.link}>
              Fazer depois
            </Link>
          ) : null}
        </View>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: { maxWidth: 560 },
  form: { gap: Spacing.lg },
  // `flexWrap` is what keeps the pairs from overflowing at 390px.
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  rowNarrow: { flexGrow: 1, flexBasis: 120 },
  rowWide: { flexGrow: 3, flexBasis: 200 },
  failure: { color: Colors.danger },
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
});
