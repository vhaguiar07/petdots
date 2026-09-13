import {
  formatPostalCode,
  InvalidPostalCodeError,
  isPostalCode,
  normalizePostalCode,
} from './postal-code.js';

describe('normalizePostalCode', () => {
  it('accepts the hyphenated and the bare spelling alike', () => {
    expect(normalizePostalCode('20720-000')).toBe('20720000');
    expect(normalizePostalCode('20720000')).toBe('20720000');
  });

  it('collapses both spellings into one value', () => {
    expect(normalizePostalCode('20720-000')).toBe(normalizePostalCode(' 20720000 '));
  });

  it('keeps a leading zero', () => {
    expect(normalizePostalCode('01310-100')).toBe('01310100');
  });

  it('rejects a CEP with seven digits', () => {
    expect(() => normalizePostalCode('2072000')).toThrow(InvalidPostalCodeError);
  });

  it('rejects a CEP with nine digits', () => {
    expect(() => normalizePostalCode('207200000')).toThrow(InvalidPostalCodeError);
  });

  it('rejects letters', () => {
    expect(() => normalizePostalCode('CEP')).toThrow(InvalidPostalCodeError);
  });
});

describe('isPostalCode', () => {
  it('answers without throwing', () => {
    expect(isPostalCode('20720-000')).toBe(true);
    expect(isPostalCode('2072000')).toBe(false);
  });
});

describe('formatPostalCode', () => {
  it('formats a complete CEP', () => {
    expect(formatPostalCode('20720000')).toBe('20720-000');
  });

  it('is progressive — it formats what it has, keystroke by keystroke', () => {
    // The whole point of the mask: never refuse while the person is typing.
    expect(formatPostalCode('2')).toBe('2');
    expect(formatPostalCode('20720')).toBe('20720');
    expect(formatPostalCode('207200')).toBe('20720-0');
    expect(formatPostalCode('2072000')).toBe('20720-00');
  });

  it('is idempotent — re-masking an already formatted value changes nothing', () => {
    expect(formatPostalCode('20720-000')).toBe('20720-000');
  });

  it('throws away anything that is not a digit', () => {
    expect(formatPostalCode('20.720-000')).toBe('20720-000');
    expect(formatPostalCode('abc')).toBe('');
  });

  it('stops at eight digits, so the field cannot overflow', () => {
    expect(formatPostalCode('207200001234')).toBe('20720-000');
  });

  it('agrees with the normaliser: what it prints, normalises back', () => {
    expect(normalizePostalCode(formatPostalCode('20720000'))).toBe('20720000');
  });
});
