import { DomainError } from './domain-error.js';
import {
  addZonedDays,
  instantOf,
  minutesOfDay,
  startOfZonedDay,
  STORE_TIME_ZONE,
  zonedPartsOf,
} from './zoned-time.js';

/**
 * One stretch of a weekday during which the store takes orders.
 *
 * `weekday` is 0 = Sunday … 6 = Saturday, the convention of `Date.getDay()`.
 * `opens` is inclusive and `closes` is exclusive, both `'HH:MM'`: a store that
 * closes at `19:00` is shut at 19:00 sharp.
 */
export interface OpeningInterval {
  weekday: number;
  opens: string;
  closes: string;
}

/**
 * The store is closed, and this says when it opens again (`null` when it never
 * does — an empty schedule).
 *
 * It lives here rather than in `orders` because it is the pure function that
 * knows the fact: a module that asks "can this order be placed now?" should not
 * have to re-derive the answer to "then when?".
 */
export class StoreClosedError extends DomainError {
  constructor(readonly nextOpeningAt: Date | null) {
    super('the store is closed at that instant');
  }
}

const MINUTE_MS = 60_000;
const MINUTES_IN_DAY = 24 * 60;

/** `HH:MM` from 00:00 to 23:59. */
const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * How far `nextOpeningAt` looks ahead. A weekly schedule repeats within seven
 * days, so anything beyond that means the list is empty; fourteen is the same
 * answer with room to spare.
 */
const SEARCH_DAYS = 14;

/**
 * `'HH:MM'` → minutes since midnight, or `null` when unreadable.
 *
 * `'24:00'` is accepted **only as a closing time**, and means the end of the
 * day. Without it a store open around the clock would have to be written
 * `00:00`–`23:59` and would be shut for the last minute of every day — a minute
 * in which a test running at the wrong moment fails and nobody knows why.
 */
function toMinutes(value: string, allowEndOfDay: boolean): number | null {
  if (allowEndOfDay && value === '24:00') {
    return MINUTES_IN_DAY;
  }

  const match = TIME_OF_DAY.exec(value);

  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function openingMinutes(interval: OpeningInterval): number | null {
  return toMinutes(interval.opens, false);
}

function closingMinutes(interval: OpeningInterval): number | null {
  return toMinutes(interval.closes, true);
}

/**
 * Whether a schedule is usable: readable times, each interval a real stretch of
 * one day, and no two intervals of the same weekday overlapping.
 *
 * No interval may cross midnight — a neighbourhood petshop does not open
 * through the night, and allowing it would make every "which interval am I in?"
 * question span two weekdays. Reversible if a 24-hour store ever joins the
 * pilot; until then the schema refuses it and the rule below stays one line.
 */
export function isOpeningIntervalList(value: readonly OpeningInterval[]): boolean {
  const byWeekday = new Map<number, [number, number][]>();

  for (const interval of value) {
    if (!Number.isInteger(interval.weekday) || interval.weekday < 0 || interval.weekday > 6) {
      return false;
    }

    const opens = openingMinutes(interval);
    const closes = closingMinutes(interval);

    if (opens === null || closes === null || opens >= closes) {
      return false;
    }

    const sameDay = byWeekday.get(interval.weekday) ?? [];

    if (sameDay.some(([otherOpens, otherCloses]) => opens < otherCloses && otherOpens < closes)) {
      return false;
    }

    sameDay.push([opens, closes]);
    byWeekday.set(interval.weekday, sameDay);
  }

  return true;
}

/** The intervals of one weekday, earliest first. */
function intervalsOf(
  hours: readonly OpeningInterval[],
  weekday: number,
): { opens: number; closes: number }[] {
  return hours
    .filter((interval) => interval.weekday === weekday)
    .flatMap((interval) => {
      const opens = openingMinutes(interval);
      const closes = closingMinutes(interval);

      return opens === null || closes === null ? [] : [{ opens, closes }];
    })
    .sort((a, b) => a.opens - b.opens);
}

/** Local midnight plus `minutes`, as an instant. Handles `24:00` as the next day. */
function instantAtMinute(dayStart: Date, minutes: number, timeZone: string): Date {
  const parts = zonedPartsOf(dayStart, timeZone);

  return instantOf(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
    },
    timeZone,
  );
}

/** Whether the store takes orders at that instant. */
export function isOpenAt(
  hours: readonly OpeningInterval[],
  instant: Date,
  timeZone: string = STORE_TIME_ZONE,
): boolean {
  const parts = zonedPartsOf(instant, timeZone);
  const minute = minutesOfDay(parts);

  return intervalsOf(hours, parts.weekday).some(
    (interval) => interval.opens <= minute && minute < interval.closes,
  );
}

/**
 * When the stretch the store is currently in ends, or `null` when it is closed.
 *
 * This is what makes the acceptance clock pause: the deadline consumes minutes
 * until here, then jumps to the next opening.
 */
export function currentIntervalEnd(
  hours: readonly OpeningInterval[],
  instant: Date,
  timeZone: string = STORE_TIME_ZONE,
): Date | null {
  const parts = zonedPartsOf(instant, timeZone);
  const minute = minutesOfDay(parts);
  const current = intervalsOf(hours, parts.weekday).find(
    (interval) => interval.opens <= minute && minute < interval.closes,
  );

  if (!current) {
    return null;
  }

  return instantAtMinute(startOfZonedDay(instant, timeZone), current.closes, timeZone);
}

/**
 * The start of the next stretch beginning at or after `instant`, or `null` when
 * the schedule is empty.
 *
 * "At or after" rather than "strictly after" is what lets the deadline hop from
 * a closing time straight into an adjoining interval — a store that shuts for
 * lunch at 12:00 and reopens at 14:00 resumes the clock at 14:00 exactly.
 */
export function nextOpeningAt(
  hours: readonly OpeningInterval[],
  instant: Date,
  timeZone: string = STORE_TIME_ZONE,
): Date | null {
  for (let offset = 0; offset < SEARCH_DAYS; offset += 1) {
    const dayStart = startOfZonedDay(
      offset === 0 ? instant : addZonedDays(instant, offset, timeZone),
      timeZone,
    );
    const weekday = zonedPartsOf(dayStart, timeZone).weekday;

    for (const interval of intervalsOf(hours, weekday)) {
      const opensAt = instantAtMinute(dayStart, interval.opens, timeZone);

      if (opensAt.getTime() >= instant.getTime()) {
        return opensAt;
      }
    }
  }

  return null;
}

/**
 * 🔴 The instant by which the store must have accepted the order.
 *
 * The clock **only runs while the store is open** (ADR-0014, C2): an order at
 * 18:55 in a shop that closes at 19:00 is not auto-rejected at 19:10 — it
 * spends five minutes today and picks up the remaining ten at the next
 * opening. That is the whole reason this is a pure, unit-tested function rather
 * than `placedAt + 15 min`, and the reason the result is **persisted** on the
 * order: changing the schedule afterwards must not move the deadline of an
 * order already placed.
 *
 * Raises `StoreClosedError` when the store is shut at `placedAt` — outside
 * opening hours the order is refused before anyone is charged, which is the
 * problem the ADR exists to prevent.
 */
export function acceptanceDeadline(
  hours: readonly OpeningInterval[],
  placedAt: Date,
  windowMinutes: number,
  timeZone: string = STORE_TIME_ZONE,
): Date {
  if (!Number.isInteger(windowMinutes) || windowMinutes <= 0) {
    throw new DomainError(`windowMinutes must be a positive integer, got ${String(windowMinutes)}`);
  }

  if (!isOpenAt(hours, placedAt, timeZone)) {
    throw new StoreClosedError(nextOpeningAt(hours, placedAt, timeZone));
  }

  let remaining = windowMinutes;
  let cursor = placedAt;

  // Bounded by construction: every pass either returns or consumes at least one
  // whole interval, and a weekly schedule has at most a handful of them. The
  // guard is there so a schedule nobody foresaw cannot spin forever.
  for (let pass = 0; pass < SEARCH_DAYS * 7; pass += 1) {
    const end = currentIntervalEnd(hours, cursor, timeZone);

    if (!end) {
      throw new StoreClosedError(nextOpeningAt(hours, cursor, timeZone));
    }

    const availableMinutes = (end.getTime() - cursor.getTime()) / MINUTE_MS;

    if (availableMinutes >= remaining) {
      return new Date(cursor.getTime() + remaining * MINUTE_MS);
    }

    remaining -= availableMinutes;

    const resumesAt = nextOpeningAt(hours, end, timeZone);

    if (!resumesAt) {
      throw new StoreClosedError(null);
    }

    cursor = resumesAt;
  }

  throw new DomainError('could not settle an acceptance deadline within the searched horizon');
}
