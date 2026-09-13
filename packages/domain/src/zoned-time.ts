/**
 * The store's timezone, fixed for the MVP: the pilot is one axis of
 * neighbourhoods in Rio (ADR-0014, C2).
 */
export const STORE_TIME_ZONE = 'America/Sao_Paulo';

/** An instant seen from a timezone. `weekday` is 0 = Sunday, as `Date.getDay()`. */
export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
}

/** The parts to rebuild an instant from. No weekday: it is derived, not given. */
export interface ZonedDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const MINUTE_MS = 60_000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatterCache.set(timeZone, formatter);
  }

  return formatter;
}

/**
 * What the wall clock in that timezone reads at that instant.
 *
 * Every question about a day or an hour in this codebase goes through here.
 * `getDay()`, `getHours()` and `toLocaleTimeString()` without `timeZone` all
 * answer for the machine, and the CI machine runs in UTC: at
 * `2026-09-14T01:00Z` a store in São Paulo is still on Sunday evening, while
 * `getDay()` would already say Monday — and a Sunday-closed shop would start
 * taking orders three hours early.
 */
export function zonedPartsOf(instant: Date, timeZone: string = STORE_TIME_ZONE): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    weekday: WEEKDAYS[read('weekday')] ?? 0,
    hour: Number(read('hour')),
    minute: Number(read('minute')),
  };
}

/**
 * How far ahead of UTC that timezone was at that instant, in minutes
 * (São Paulo today: −180).
 *
 * Detected, never hardcoded to `-03:00`: Brazil abolished daylight saving by
 * decree in 2019 and can bring it back the same way. When it does, the ICU data
 * that ships with Node knows, and this function keeps answering correctly
 * without a line changing here.
 */
export function zonedOffsetMinutes(instant: Date, timeZone: string = STORE_TIME_ZONE): number {
  const parts = zonedPartsOf(instant, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);

  // The seconds and milliseconds of the instant are not in `parts`, so they are
  // removed from both sides before the subtraction.
  const truncated = Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS;

  return (asUtc - truncated) / MINUTE_MS;
}

/**
 * The instant at which that timezone's wall clock reads those parts.
 *
 * The inverse of `zonedPartsOf`, and it needs two passes because the offset
 * depends on the very instant being computed. The first guess treats the parts
 * as UTC; subtracting the offset *at that guess* lands within an hour of the
 * answer, and one correction with the offset *there* settles it. This is the
 * standard fixed-point trick, and it is exact everywhere except inside a DST
 * transition — which Brazil does not currently have, and which no opening hour
 * of a neighbourhood petshop would fall in anyway.
 */
export function instantOf(parts: ZonedDateTime, timeZone: string = STORE_TIME_ZONE): Date {
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const firstOffset = zonedOffsetMinutes(new Date(guess), timeZone);
  const corrected = new Date(guess - firstOffset * MINUTE_MS);
  const secondOffset = zonedOffsetMinutes(corrected, timeZone);

  return secondOffset === firstOffset ? corrected : new Date(guess - secondOffset * MINUTE_MS);
}

/** Minutes since local midnight — the form opening hours are compared in. */
export function minutesOfDay(parts: Pick<ZonedParts, 'hour' | 'minute'>): number {
  return parts.hour * 60 + parts.minute;
}

/** Local midnight of the day `instant` falls on, as an instant. */
export function startOfZonedDay(instant: Date, timeZone: string = STORE_TIME_ZONE): Date {
  const parts = zonedPartsOf(instant, timeZone);

  return instantOf({ ...parts, hour: 0, minute: 0 }, timeZone);
}

/** The same wall-clock time, `days` later. Goes through the calendar, not `+86400000`. */
export function addZonedDays(
  instant: Date,
  days: number,
  timeZone: string = STORE_TIME_ZONE,
): Date {
  const parts = zonedPartsOf(instant, timeZone);

  return instantOf({ ...parts, day: parts.day + days }, timeZone);
}
