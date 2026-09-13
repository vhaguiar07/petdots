import type { PetSpecies } from '@petdots/contracts';
import { kilogramsToGrams, parseBrazilianDate } from '@petdots/domain';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '../api/http';
import { createPet, findPet, removePet, updatePet } from '../api/tutors';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Body, Button, Card, ChoiceChips, Field, Heading } from '../ui/primitives';
import { Colors, Spacing } from '../ui/theme';

/** How each species reads to a person, rather than to the database. */
const SPECIES_OPTIONS: { value: PetSpecies; label: string }[] = [
  { value: 'DOG', label: 'Cão' },
  { value: 'CAT', label: 'Gato' },
];

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'ready' };

/**
 * Registering and editing a pet — one screen, because the two forms are the
 * same form; `petId` is what decides which.
 *
 * The weight is asked in kilograms, which is what a scale shows and what a
 * tutor knows, and converted to the integer grams the contract carries by
 * `kilogramsToGrams` — a domain function, so `12,5` and `12.5` cannot come to
 * mean different weights. The birth date is asked as `DD/MM/AAAA` and converted
 * by `parseBrazilianDate`, which is also what refuses 31/02.
 */
export function PetFormScreen() {
  const router = useRouter();
  const { http } = useSession();
  const { petId, onboarding } = useLocalSearchParams<{ petId?: string; onboarding?: string }>();

  const editing = typeof petId === 'string' && petId.length > 0;
  const isOnboarding = onboarding === '1';

  const [load, setLoad] = useState<Load>(editing ? { kind: 'loading' } : { kind: 'ready' });
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<PetSpecies | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editing) {
      return;
    }

    const controller = new AbortController();

    void findPet(http, petId, controller.signal)
      .then((pet) => {
        setName(pet.name);
        setSpecies(pet.species);
        setBirthDate(pet.birthDate ? toBrazilianDate(pet.birthDate) : '');
        setWeight(toKilograms(pet.weightGrams));
        setLoad({ kind: 'ready' });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        // A pet of somebody else's, or one already deleted, both answer 404 —
        // and to this screen they are the same thing. Everything else is a
        // failure to load, and neither may leave the screen hanging (BUG-R01).
        setLoad(
          error instanceof ApiError && error.status === 404
            ? { kind: 'missing' }
            : { kind: 'unavailable' },
        );
      });

    return () => {
      controller.abort();
    };
  }, [http, petId, editing]);

  async function submit(): Promise<void> {
    if (submitting) {
      return;
    }

    setFailure(null);

    const local: Record<string, string> = {};

    if (!species) {
      local.species = 'Escolha cão ou gato.';
    }

    // The domain refuses what the API would refuse, before a request happens.
    let weightGrams = 0;

    try {
      weightGrams = kilogramsToGrams(weight);
    } catch {
      local.weight = 'Informe um peso entre 0,1 kg e 120 kg.';
    }

    let isoBirthDate: string | null = null;

    if (birthDate.trim()) {
      try {
        isoBirthDate = parseBrazilianDate(birthDate);
      } catch {
        local.birthDate = 'Data inválida.';
      }
    }

    if (Object.keys(local).length > 0) {
      setFieldErrors(local);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const body = {
        name: name.trim(),
        // Settled above: `local.species` would have returned already.
        species: species as PetSpecies,
        birthDate: isoBirthDate,
        weightGrams,
      };

      if (editing) {
        await updatePet(http, petId, body);
      } else {
        await createPet(http, body);
      }

      // Both the onboarding and a plain edit end on the account page — it is
      // where the pet and the address are shown together.
      router.replace('/conta');
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
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

  async function remove(): Promise<void> {
    if (!editing || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await removePet(http, petId);
      router.replace('/conta');
    } catch {
      setFailure('Não conseguimos excluir o pet agora. Tente de novo.');
      setConfirmingRemoval(false);
    } finally {
      setSubmitting(false);
    }
  }

  const title = editing ? 'Editar pet' : 'Seu pet';

  if (load.kind === 'loading') {
    return (
      <AppShell title={title}>
        <Body muted>Carregando o pet…</Body>
      </AppShell>
    );
  }

  if (load.kind === 'missing' || load.kind === 'unavailable') {
    return (
      <AppShell title={title}>
        <Card>
          <Heading level={3}>
            {load.kind === 'missing'
              ? 'Pet não encontrado'
              : 'Não conseguimos falar com o servidor'}
          </Heading>
          <Body muted>
            {load.kind === 'missing'
              ? 'Esse pet não está na sua conta.'
              : 'Tente de novo em instantes.'}
          </Body>
        </Card>
        <Link href="/conta" style={styles.link}>
          ← Voltar para a conta
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title={title} subtitle="O peso é o que vai alimentar a reposição inteligente.">
      <Card style={styles.card}>
        <View style={styles.form}>
          <Field
            label="Nome"
            value={name}
            onChangeText={setName}
            placeholder="Thor"
            maxLength={60}
            error={fieldErrors.name}
          />

          <ChoiceChips
            label="Espécie"
            options={SPECIES_OPTIONS}
            value={species}
            onChange={setSpecies}
          />
          {fieldErrors.species ? (
            <Body style={styles.failure} role="alert">
              {fieldErrors.species}
            </Body>
          ) : null}

          <Field
            label="Nascimento (opcional)"
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="12/03/2021"
            hint="Se você não souber, pode deixar em branco."
            inputMode="numeric"
            maxLength={10}
            error={fieldErrors.birthDate}
          />

          <Field
            label="Peso (kg)"
            value={weight}
            onChangeText={setWeight}
            placeholder="12,5"
            inputMode="decimal"
            maxLength={6}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            error={fieldErrors.weight ?? fieldErrors.weightGrams}
          />

          {failure ? (
            <Body style={styles.failure} role="alert">
              {failure}
            </Body>
          ) : null}

          <Button
            label={submitting ? 'Salvando…' : 'Salvar'}
            tone="primary"
            disabled={submitting}
            onPress={() => void submit()}
          />

          {isOnboarding && !editing ? (
            <Link href="/conta" style={styles.link}>
              Fazer depois
            </Link>
          ) : null}
        </View>
      </Card>

      {/*
        Two steps on the page itself, never `Alert.alert`: on the web that
        becomes `window.confirm`, which a keyboard-only test cannot get past
        and which no styling reaches (R15).
      */}
      {editing ? (
        <View style={styles.danger}>
          {confirmingRemoval ? (
            <>
              <Body>Excluir {name || 'este pet'}? Isso não pode ser desfeito.</Body>
              <View style={styles.dangerActions}>
                <Button
                  label="Confirmar exclusão"
                  tone="danger"
                  disabled={submitting}
                  onPress={() => void remove()}
                />
                <Button
                  label="Cancelar"
                  onPress={() => {
                    setConfirmingRemoval(false);
                  }}
                />
              </View>
            </>
          ) : (
            <Button
              label="Excluir pet"
              tone="danger"
              onPress={() => {
                setConfirmingRemoval(true);
              }}
            />
          )}
        </View>
      ) : null}
    </AppShell>
  );
}

/** `YYYY-MM-DD` → `DD/MM/AAAA`, for the form. String surgery, never a `Date` (R1). */
function toBrazilianDate(iso: string): string {
  const [year, month, day] = iso.split('-');

  return `${day ?? ''}/${month ?? ''}/${year ?? ''}`;
}

/** Grams → the kilograms the field shows, with the comma a Brazilian expects. */
function toKilograms(grams: number): string {
  return (grams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

const styles = StyleSheet.create({
  card: { maxWidth: 480 },
  form: { gap: Spacing.lg },
  failure: { color: Colors.danger },
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  danger: { gap: Spacing.md, alignItems: 'flex-start' },
  dangerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
