import { InvalidEmailError, isEmail, normalizeEmail } from './email.js';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Victor@PetDots.com.br  ')).toBe('victor@petdots.com.br');
  });

  it('collapses spellings of the same mailbox into one value', () => {
    // The sentinel of "one person, one account": without this the unique index
    // on `users.email` would guard the spelling instead of the person.
    expect(normalizeEmail('VICTOR@dev.petdots.local')).toBe(
      normalizeEmail(' victor@Dev.PetDots.Local '),
    );
  });

  it('keeps addresses their owner considers distinct apart', () => {
    // No `+tag` stripping and no dot removal: those are provider-specific
    // aliasing rules, and applying them would merge two accounts on purpose.
    expect(normalizeEmail('victor+loja@petdots.com.br')).not.toBe(
      normalizeEmail('victor@petdots.com.br'),
    );
    expect(normalizeEmail('vi.ctor@petdots.com.br')).not.toBe(
      normalizeEmail('victor@petdots.com.br'),
    );
  });

  it('accepts the .local development domain', () => {
    // The seeded development users live there on purpose (P2): `.local` is not
    // routable, so no real mailbox can ever collide with them.
    expect(normalizeEmail('lojista@dev.petdots.local')).toBe('lojista@dev.petdots.local');
  });

  it('rejects an address with no domain', () => {
    expect(() => normalizeEmail('victor')).toThrow(InvalidEmailError);
    expect(() => normalizeEmail('victor@')).toThrow(InvalidEmailError);
  });

  it('rejects a domain without a dot', () => {
    expect(() => normalizeEmail('victor@localhost')).toThrow(InvalidEmailError);
  });

  it('rejects two at-signs and inner whitespace', () => {
    expect(() => normalizeEmail('victor@@petdots.com.br')).toThrow(InvalidEmailError);
    expect(() => normalizeEmail('vic tor@petdots.com.br')).toThrow(InvalidEmailError);
  });

  it('rejects an address longer than the column', () => {
    const local = 'a'.repeat(250);

    expect(() => normalizeEmail(`${local}@petdots.com.br`)).toThrow(InvalidEmailError);
  });

  it('never echoes the rejected address', () => {
    // It is personal data, and this message travels to logs (SECURITY, LGPD).
    expect.assertions(1);

    try {
      normalizeEmail('vitima@exemplo.com.br extra');
    } catch (error) {
      expect((error as Error).message).not.toContain('vitima');
    }
  });
});

describe('isEmail', () => {
  it('answers without throwing', () => {
    expect(isEmail('victor@petdots.com.br')).toBe(true);
    expect(isEmail('victor')).toBe(false);
  });
});
