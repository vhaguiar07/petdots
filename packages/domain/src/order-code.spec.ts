import {
  generateOrderCode,
  isOrderCode,
  ORDER_CODE_ALPHABET,
  ORDER_CODE_LENGTH,
} from './order-code.js';

describe('ORDER_CODE_ALPHABET', () => {
  it('🔴 leaves out the characters that are misheard at a counter', () => {
    for (const ambiguous of ['0', 'O', '1', 'I']) {
      expect(ORDER_CODE_ALPHABET).not.toContain(ambiguous);
    }
  });

  it('has no repeated character', () => {
    expect(new Set(ORDER_CODE_ALPHABET).size).toBe(ORDER_CODE_ALPHABET.length);
  });
});

describe('generateOrderCode', () => {
  it('is six characters of the alphabet', () => {
    const code = generateOrderCode();

    expect(code).toHaveLength(ORDER_CODE_LENGTH);
    expect(isOrderCode(code)).toBe(true);
  });

  it('is deterministic given a fixed source of randomness', () => {
    expect(generateOrderCode(() => 0)).toBe('AAAAAA');
    expect(generateOrderCode(() => 0.999999)).toBe('999999');
  });

  it('never indexes past the alphabet, even when random() returns 1', () => {
    expect(isOrderCode(generateOrderCode(() => 1))).toBe(true);
  });

  it('walks the alphabet as the source advances', () => {
    let step = 0;
    const code = generateOrderCode(() => {
      const value = step / ORDER_CODE_ALPHABET.length;
      step += 1;
      return value;
    });

    expect(code).toBe(ORDER_CODE_ALPHABET.slice(0, ORDER_CODE_LENGTH));
  });

  it('produces varied codes over many draws', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateOrderCode()));

    // Not a statistical claim — just proof that the generator is not constant.
    expect(codes.size).toBeGreaterThan(150);
  });
});

describe('isOrderCode', () => {
  it('accepts a well-formed code', () => {
    expect(isOrderCode('AB2C34')).toBe(true);
  });

  it('refuses the wrong length, lowercase and the excluded characters', () => {
    expect(isOrderCode('AB2C3')).toBe(false);
    expect(isOrderCode('AB2C345')).toBe(false);
    expect(isOrderCode('ab2c34')).toBe(false);
    expect(isOrderCode('AB0C34')).toBe(false);
    expect(isOrderCode('ABIC34')).toBe(false);
    expect(isOrderCode('')).toBe(false);
  });
});
