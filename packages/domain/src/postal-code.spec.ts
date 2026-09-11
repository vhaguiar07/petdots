import { InvalidPostalCodeError, isPostalCode, normalizePostalCode } from './postal-code.js';

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
