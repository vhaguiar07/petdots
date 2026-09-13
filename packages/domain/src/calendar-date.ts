import { DomainError } from './domain-error.js';

/** `YYYY-MM-DD` — the shape, before anyone asks whether the day exists. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `DD/MM/AAAA`, the only spelling a Brazilian form offers. */
const BRAZILIAN_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export class InvalidCalendarDateError extends DomainError {}

/**
 * A calendar date, with no time and no timezone.
 *
 * A birth date is not an instant: a pet born on 12/03/2021 was born on that day
 * everywhere, and turning it into a `Date` at local midnight is what makes it
 * arrive at the database as the 11th in UTC−3. The domain therefore speaks
 * `YYYY-MM-DD` strings end to end, and only the Prisma repository converts —
 * once, explicitly, at UTC midnight.
 */
export function isCalendarDate(iso: string): boolean {
  const match = ISO_DATE.exec(iso);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;

  return existsInCalendar(Number(year), Number(month), Number(day));
}

/**
 * `DD/MM/AAAA` → `YYYY-MM-DD`.
 *
 * The screen collects the Brazilian spelling; the contract carries the ISO one.
 * The conversion is here rather than in the screen so that "31/02/2021 is not a
 * date" is decided by a tested function and not by whichever form remembered to
 * check — `new Date('2021-02-31')` silently rolls over to March.
 */
export function parseBrazilianDate(input: string): string {
  const match = BRAZILIAN_DATE.exec(input.trim());

  if (!match) {
    throw new InvalidCalendarDateError('expected a date as DD/MM/AAAA');
  }

  const [, day, month, year] = match;

  if (!existsInCalendar(Number(year), Number(month), Number(day))) {
    throw new InvalidCalendarDateError('the date does not exist in the calendar');
  }

  return `${year}-${month}-${day}`;
}

/**
 * Whether a calendar date is today or earlier.
 *
 * Compared as UTC date parts, never as instants: `new Date()` on a machine in
 * UTC−3 is already tomorrow for three hours of every day, and a tutor typing
 * today's date at 22h would otherwise be told their pet was born in the future.
 */
export function isNotAfterToday(iso: string, today: Date = new Date()): boolean {
  if (!isCalendarDate(iso)) {
    return false;
  }

  return iso <= today.toISOString().slice(0, 10);
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Whether the day exists in that month of that year — the leap-year rule
 * included. Written out rather than delegated to `Date`, which accepts
 * 31/02 and answers with 03/03, and which maps a two-digit year onto 19xx.
 */
function existsInCalendar(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  // The guard above already bounds `month`; the fallback is what the compiler
  // needs to see under `noUncheckedIndexedAccess`.
  const lastDay = month === 2 && isLeapYear ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0);

  return day <= lastDay;
}
