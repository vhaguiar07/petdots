import {
  assertPasswordIsAcceptable,
  isAcceptablePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  WeakPasswordError,
} from './password-policy.js';

describe('assertPasswordIsAcceptable', () => {
  it('accepts a password of exactly the minimum length', () => {
    expect(() => {
      assertPasswordIsAcceptable('a'.repeat(MIN_PASSWORD_LENGTH));
    }).not.toThrow();
  });

  it('rejects one character short of the minimum', () => {
    expect(() => {
      assertPasswordIsAcceptable('a'.repeat(MIN_PASSWORD_LENGTH - 1));
    }).toThrow(WeakPasswordError);
  });

  it('accepts a long passphrase with no symbols or capitals', () => {
    // Length is the whole policy: a composition rule here would refuse this and
    // wave through `Senha@123` (ADR-0011, 3.5).
    expect(() => {
      assertPasswordIsAcceptable('cavalo bateria grampo correto');
    }).not.toThrow();
  });

  it('accepts the seeded development password', () => {
    // Guards the credential the whole manual test script depends on (P2).
    expect(isAcceptablePassword('petdots-dev-2026')).toBe(true);
  });

  it('rejects a password longer than the maximum', () => {
    // argon2 hashes bytes: an unbounded input is free work for an attacker.
    expect(() => {
      assertPasswordIsAcceptable('a'.repeat(MAX_PASSWORD_LENGTH + 1));
    }).toThrow(WeakPasswordError);
  });

  it('never echoes the rejected password', () => {
    // It is the secret this module exists to protect, and errors reach the logs.
    expect.assertions(1);

    try {
      assertPasswordIsAcceptable('curta');
    } catch (error) {
      expect((error as Error).message).not.toContain('curta');
    }
  });
});

describe('isAcceptablePassword', () => {
  it('answers without throwing', () => {
    expect(isAcceptablePassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBe(true);
    expect(isAcceptablePassword('curta')).toBe(false);
  });
});
