import { DomainError } from './domain-error.js';

/**
 * Length is the whole policy (ADR-0011, 3.5). Composition rules — one capital,
 * one symbol — buy almost nothing against a password hashed with argon2, and
 * they reliably push people to `Senha@123`, which is worse than the ten
 * characters they would have chosen on their own.
 */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * argon2 hashes the bytes, not the characters, and a very long input is a cheap
 * way to make the server do expensive work on every login attempt.
 */
export const MAX_PASSWORD_LENGTH = 128;

export class WeakPasswordError extends DomainError {}

/**
 * Accepts or refuses a password before it is hashed.
 *
 * Pure and free of I/O on purpose: this is the one rule about passwords that
 * has to hold identically at registration, at the seed and at any future
 * password change, and a rule that lives in a use case only holds where someone
 * remembered to call it.
 */
export function assertPasswordIsAcceptable(password: string): void {
  // The password itself never reaches the message — it is the secret this whole
  // module exists to protect, and errors travel to logs (SECURITY).
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError(
      `expected a password of at least ${String(MIN_PASSWORD_LENGTH)} characters`,
    );
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new WeakPasswordError(
      `expected a password of at most ${String(MAX_PASSWORD_LENGTH)} characters`,
    );
  }
}

/** Exception-free envelope, for the `.refine()` of the border contract. */
export function isAcceptablePassword(password: string): boolean {
  try {
    assertPasswordIsAcceptable(password);
    return true;
  } catch {
    return false;
  }
}
