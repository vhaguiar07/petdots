import type { OpeningHours, OpeningIntervalContract } from '@petdots/contracts';

/**
 * The weekly schedule as a **form**, which is a different shape from the one the
 * API stores.
 *
 * The contract is a flat list of stretches; a person editing it thinks in seven
 * rows, each either closed or open, and possibly split by lunch. Converting
 * between the two is pure and tested here, so the screen never has to reason
 * about ordering or overlap while somebody is typing.
 *
 * ⚠️ The draft offers **two** stretches per day — the day and, optionally, the
 * hours after a lunch break. The schema accepts more; nothing in the pilot has
 * needed a third, and a form with an unbounded list of rows is a form nobody
 * fills in on a phone. A shop that needs one says so, and the editor grows.
 */
export interface DayDraft {
  closed: boolean;
  opens: string;
  closes: string;
  /** The stretch after lunch. Absent when the shop does not close for it. */
  second: { opens: string; closes: string } | null;
}

export type WeekDraft = readonly [
  DayDraft,
  DayDraft,
  DayDraft,
  DayDraft,
  DayDraft,
  DayDraft,
  DayDraft,
];

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

/** What a day starts as when somebody switches it on. */
const DEFAULT_DAY: DayDraft = { closed: true, opens: '08:00', closes: '18:00', second: null };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

/** Minutes since midnight, so `24:00` compares after `23:59`. */
function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':');

  return Number(hours) * 60 + Number(minutes);
}

export function toDraft(openingHours: readonly OpeningIntervalContract[]): WeekDraft {
  const week = WEEKDAY_LABELS.map((): DayDraft => ({ ...DEFAULT_DAY }));

  for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
    const stretches = openingHours
      .filter((interval) => interval.weekday === weekday)
      .sort((a, b) => minutesOf(a.opens) - minutesOf(b.opens));

    const [first, second] = stretches;

    if (!first) {
      continue;
    }

    week[weekday] = {
      closed: false,
      opens: first.opens,
      closes: first.closes,
      // A third stretch, if the database somehow holds one, is dropped by the
      // editor rather than silently rewritten — the day simply shows the two it
      // can represent, and saving replaces the week with what is on screen.
      second: second ? { opens: second.opens, closes: second.closes } : null,
    };
  }

  return week as unknown as WeekDraft;
}

export class OpeningHoursDraftError extends Error {}

/**
 * The draft back into the contract, ordered and validated.
 *
 * It raises on a stretch that closes before it opens, with the day named: the
 * server refuses it too, but "Terça: o fechamento vem antes da abertura" is
 * something the person can act on, and `422 VALIDATION_FAILED` on a whole week
 * is not.
 *
 * Overlap between the two stretches of a day is left to `openingHoursSchema` —
 * the rule belongs to the domain, and duplicating it here would be a second
 * place for it to drift.
 */
export function fromDraft(week: WeekDraft): OpeningHours {
  const intervals: OpeningIntervalContract[] = [];

  week.forEach((day, weekday) => {
    if (day.closed) {
      return;
    }

    for (const stretch of [{ opens: day.opens, closes: day.closes }, day.second]) {
      if (!stretch) {
        continue;
      }

      if (!HHMM.test(stretch.opens) || !HHMM.test(stretch.closes)) {
        throw new OpeningHoursDraftError(`${WEEKDAY_LABELS[weekday] ?? ''}: use o formato HH:MM.`);
      }

      if (minutesOf(stretch.closes) <= minutesOf(stretch.opens)) {
        throw new OpeningHoursDraftError(
          `${WEEKDAY_LABELS[weekday] ?? ''}: o fechamento tem que vir depois da abertura.`,
        );
      }

      intervals.push({ weekday, opens: stretch.opens, closes: stretch.closes });
    }
  });

  return intervals;
}

/** Switching a day on gives it business hours, not an empty pair of fields. */
export function openDay(day: DayDraft): DayDraft {
  return { ...day, closed: false, opens: day.opens, closes: day.closes };
}

/** The lunch break: the afternoon starts where the morning is set to end. */
export function addSecondStretch(day: DayDraft): DayDraft {
  return day.second
    ? day
    : { ...day, closes: '12:00', second: { opens: '14:00', closes: '18:00' } };
}
