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
