import { DomainError } from './domain-error.js';

/**
 * Deliberately permissive: one `@`, something before it, and a dotted domain
 * after it. The exhaustive RFC 5322 grammar rejects addresses that real mail
 * servers accept, and the only proof that an address works is a message
 * arriving at it — which the MVP cannot send yet (ADR-0011, A4).
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** The column is `VARCHAR(255)`; refusing here keeps the truncation from the database. */
const MAX_LENGTH = 255;

export class InvalidEmailError extends DomainError {}

/**
 * Normalises an e-mail to the single spelling that gets stored and compared.
 *
 * Trim and lowercase, nothing else. The domain part is case-insensitive by
 * standard and every mailbox provider the platform will meet treats the local
 * part that way too, so `Victor@Gmail.com` and `victor@gmail.com` must collapse
 * into one account — otherwise the unique index guards the spelling instead of
 * the person, and the same human registers twice.
 *
 * What is *not* done here is as deliberate: no dot-stripping, no `+tag`
 * removal. Those are provider-specific aliasing rules, and applying them would
 * merge two addresses their owner considers distinct.
 */
export function normalizeEmail(raw: string): string {
  const normalized = raw.trim().toLowerCase();

  if (normalized.length > MAX_LENGTH || !EMAIL.test(normalized)) {
    // The rejected value never reaches the message: an e-mail is personal data
    // and this error travels to logs (SECURITY, LGPD) — the same rule that
    // keeps the phone out of `InvalidPhoneNumberError`.
    throw new InvalidEmailError('expected an e-mail address with a local part and a domain');
  }

  return normalized;
}

/** Exception-free envelope, for the `.refine()` of the border contract. */
export function isEmail(raw: string): boolean {
  try {
    normalizeEmail(raw);
    return true;
  } catch {
    return false;
  }
}
