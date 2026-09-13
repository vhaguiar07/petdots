import { DomainError } from './domain-error.js';

/** A CEP is exactly eight digits; the hyphen before the last three is cosmetic. */
const POSTAL_CODE = /^\d{8}$/;

export class InvalidPostalCodeError extends DomainError {}

/**
 * Normalises a Brazilian CEP to its eight bare digits.
 *
 * Stored without the hyphen so `20720-000` and `20720000` are the same value:
 * the waitlist groups leads by region, and a formatting difference must not
 * split one street into two.
 */
export function normalizePostalCode(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  if (!POSTAL_CODE.test(digits)) {
    throw new InvalidPostalCodeError(`expected a CEP of 8 digits, got ${digits.length}`);
  }

  return digits;
}

/** Exception-free envelope, for the `.refine()` of the border contract. */
export function isPostalCode(raw: string): boolean {
  try {
    normalizePostalCode(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * The other direction: digits → `20720-000`, as a person reads and types them.
 *
 * The hyphen is cosmetic — the column stores eight bare digits — but it is how
 * a CEP is written everywhere else, and a field that refuses to show it makes
 * the person doubt they typed it right.
 *
 * **Progressive**: formats whatever it has so far, so it can drive an input
 * mask keystroke by keystroke, and never rejects. Refusing an incomplete CEP is
 * `isPostalCode`'s job, at submit time.
 */
export function formatPostalCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);

  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
