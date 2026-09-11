import { DomainError } from './domain-error.js';

/** Brazilian country calling code, the only one the platform serves today. */
const COUNTRY_CODE = '55';

/** DDD + 9-digit mobile, which always starts with 9 (ANATEL numbering plan). */
const NATIONAL_NUMBER = /^([1-9][1-9])(9\d{8})$/;

export class InvalidPhoneNumberError extends DomainError {}

/**
 * Normalises a Brazilian mobile number to E.164 (`+55DDDNNNNNNNNN`).
 *
 * The phone is the lead's identity in the waitlist (pd-09): the smoke test
 * counts *people* to choose the next neighbourhood, so `(21) 99999-9999` and
 * `21999999999` must collapse into one row. Normalising here — and storing the
 * result under a unique index — is what makes that true, rather than
 * de-duplicating later by hand.
 *
 * Accepted on input: any punctuation, an optional `+55`/`55` country prefix and
 * an optional `0` trunk prefix. Landlines are rejected on purpose: the capture
 * exists to send a message, and the campaign's channel is mobile.
 */
export function normalizeBrazilianMobilePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const national = stripPrefixes(digits);
  const match = NATIONAL_NUMBER.exec(national);

  if (!match) {
    // The rejected value never reaches the message: a phone is personal data,
    // and this error travels to logs (SECURITY, LGPD).
    throw new InvalidPhoneNumberError(
      `expected a Brazilian mobile number with area code, got ${digits.length} digits`,
    );
  }

  const [, areaCode, subscriber] = match;

  return `+${COUNTRY_CODE}${areaCode}${subscriber}`;
}

/** Exception-free envelope, for the `.refine()` of the border contract. */
export function isBrazilianMobilePhone(raw: string): boolean {
  try {
    normalizeBrazilianMobilePhone(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Drops the country code and the trunk `0` a caller may have typed. Order
 * matters: `021999999999` carries the trunk prefix without the country code,
 * while `5521999999999` carries the country code without the trunk.
 */
function stripPrefixes(digits: string): string {
  const withoutCountry =
    digits.length > 11 && digits.startsWith(COUNTRY_CODE)
      ? digits.slice(COUNTRY_CODE.length)
      : digits;

  return withoutCountry.length > 11 && withoutCountry.startsWith('0')
    ? withoutCountry.slice(1)
    : withoutCountry;
}
