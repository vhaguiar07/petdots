import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '../api/http';
import { findStore } from '../api/stores';
import { updateOpeningHours } from '../api/store-panel';
import {
  addSecondStretch,
  type DayDraft,
  fromDraft,
  openDay,
  OpeningHoursDraftError,
  toDraft,
  WEEKDAY_LABELS,
  type WeekDraft,
} from '../panel/opening-hours-draft';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Body, Button, Card, Field, Heading } from '../ui/primitives';
import { Colors, Spacing } from '../ui/theme';

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly draft: WeekDraft };

/**
 * The weekly schedule, edited by the `OWNER` (ADR-0013 B4, ADR-0017 A11).
 *
 * Until pd-16 the seed was the only writer, so a pilot store changing its
 * Saturday needed a commit. Seven rows, each closed or open, with an optional
 * second stretch for the lunch break — the shape a person thinks in, converted
 * to and from the flat contract by a pure function that is tested on its own.
 *
 * ⚠️ Saving an **empty** week is allowed and means the shop stops taking orders:
 * failing closed is the same choice the schema makes, and the screen says so out
 * loud rather than quietly refusing.
 *
 * ⚠️ It does **not** move the deadline of orders already placed. That is a
 * persisted column computed once against the schedule in force at the time
 * (ADR-0017, A12).
 */
export function OpeningHoursScreen() {
  const { http } = useSession();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [storeName, setStoreName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void findStore(http, storeId, controller.signal)
      .then((store) => {
        setStoreName(store.name);
        setLoad({ kind: 'ready', draft: toDraft(store.openingHours) });
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setLoad(
          failure instanceof ApiUnavailableError ? { kind: 'unavailable' } : { kind: 'denied' },
        );
      });

    return () => {
      controller.abort();
    };
  }, [http, storeId]);

  const update = (weekday: number, next: DayDraft) => {
    setLoad((current) =>
      current.kind === 'ready'
        ? {
            kind: 'ready',
            draft: current.draft.map((day, index) =>
              index === weekday ? next : day,
            ) as unknown as WeekDraft,
          }
        : current,
    );
    setSaved(false);
  };

  const onSave = () => {
    if (load.kind !== 'ready') {
      return;
    }

    setError(null);
    setSaved(false);

    let openingHours;

    try {
      openingHours = fromDraft(load.draft);
    } catch (failure: unknown) {
      // The draft error names the day, which a `422` on the whole week cannot.
      setError(
        failure instanceof OpeningHoursDraftError ? failure.message : 'Confira os horários.',
      );
      return;
    }

    setSaving(true);

    void updateOpeningHours(http, storeId, openingHours)
      .then((store) => {
        setLoad({ kind: 'ready', draft: toDraft(store.openingHours) });
        setSaved(true);
      })
      .catch((failure: unknown) => {
        setError(
          failure instanceof ApiError
            ? failure.message
            : 'Não conseguimos falar com o servidor. Tente de novo.',
        );
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const backToQueue = (
    <Link href={`/painel/${storeId}`} style={styles.link}>
      ← Voltar à fila
    </Link>
  );

  if (load.kind === 'loading') {
    return (
      <AppShell title="Horários">
        <Body muted>Carregando os horários…</Body>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable') {
    return (
      <AppShell title="Horários">
        <Body muted>Não conseguimos carregar os horários agora. Tente de novo em instantes.</Body>
        {backToQueue}
      </AppShell>
    );
  }

  if (load.kind === 'denied') {
    return (
      <AppShell title="Horários">
        <Body muted>Você não opera esta loja nesse papel.</Body>
        <Link href="/painel" style={styles.link}>
          ← Voltar às suas lojas
        </Link>
      </AppShell>
    );
  }

  const everyDayClosed = load.draft.every((day) => day.closed);

  return (
    <AppShell title="Horários" subtitle={storeName || undefined}>
      {backToQueue}

      {load.draft.map((day, weekday) => (
        <Card key={WEEKDAY_LABELS[weekday]}>
          <View style={styles.dayHeader}>
            <Heading level={3}>{WEEKDAY_LABELS[weekday]}</Heading>
            <Button
              label={day.closed ? 'Abrir neste dia' : 'Fechar neste dia'}
              compact
              onPress={() => {
                update(weekday, day.closed ? openDay(day) : { ...day, closed: true });
              }}
            />
          </View>

          {day.closed ? (
            <Body muted>Fechado</Body>
          ) : (
            <>
              <View style={styles.stretch}>
                <Field
                  label="Abre"
                  value={day.opens}
                  onChangeText={(opens) => {
                    update(weekday, { ...day, opens });
                  }}
                  placeholder="08:00"
                  maxLength={5}
                  style={styles.time}
                />
                <Field
                  label="Fecha"
                  value={day.closes}
                  onChangeText={(closes) => {
                    update(weekday, { ...day, closes });
                  }}
                  placeholder="18:00"
                  maxLength={5}
                  style={styles.time}
                />
              </View>

              {day.second ? (
                <SecondStretch
                  second={day.second}
                  onChange={(second) => {
                    update(weekday, { ...day, second });
                  }}
                  onRemove={() => {
                    update(weekday, { ...day, second: null });
                  }}
                />
              ) : (
                <Button
                  label="+ intervalo de almoço"
                  compact
                  onPress={() => {
                    update(weekday, addSecondStretch(day));
                  }}
                />
              )}
            </>
          )}
        </Card>
      ))}

      {everyDayClosed ? (
        <Body muted>
          Com todos os dias fechados, a loja para de receber pedidos até você abrir de novo.
        </Body>
      ) : null}

      {error ? <Body style={styles.error}>{error}</Body> : null}
      {saved ? <Body style={styles.saved}>Horários salvos.</Body> : null}

      <Button
        label={saving ? 'Salvando…' : 'Salvar horários'}
        tone="primary"
        disabled={saving}
        onPress={onSave}
      />
    </AppShell>
  );
}

/**
 * The afternoon half of a day split by lunch.
 *
 * A component of its own so the stretch is a value the handlers close over,
 * instead of a nullable field each one has to assert is still there.
 */
function SecondStretch({
  second,
  onChange,
  onRemove,
}: {
  second: { opens: string; closes: string };
  onChange: (next: { opens: string; closes: string }) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.stretch}>
      <Field
        label="Reabre"
        value={second.opens}
        onChangeText={(opens) => {
          onChange({ ...second, opens });
        }}
        placeholder="14:00"
        maxLength={5}
        style={styles.time}
      />
      <Field
        label="Fecha"
        value={second.closes}
        onChangeText={(closes) => {
          onChange({ ...second, closes });
        }}
        placeholder="19:00"
        maxLength={5}
        style={styles.time}
      />
      <Button label="Remover intervalo" compact onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  stretch: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', alignItems: 'flex-end' },
  time: { minWidth: 110 },
  error: { color: Colors.danger },
  saved: { color: Colors.accent },
});
