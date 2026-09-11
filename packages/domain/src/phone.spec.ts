import {
  InvalidPhoneNumberError,
  isBrazilianMobilePhone,
  normalizeBrazilianMobilePhone,
} from './phone.js';

/** Every spelling a person might type for the same Rio mobile number. */
const SAME_NUMBER = [
  '(21) 99999-9999',
  '21999999999',
  '+55 21 99999-9999',
  '5521999999999',
  '021999999999',
  ' 21 9 9999 9999 ',
];

describe('normalizeBrazilianMobilePhone', () => {
  it('accepts every spelling of the same number', () => {
    for (const raw of SAME_NUMBER) {
      expect(normalizeBrazilianMobilePhone(raw)).toBe('+5521999999999');
    }
  });

  it('collapses every accepted spelling into one identity', () => {
    const normalised = new Set(SAME_NUMBER.map(normalizeBrazilianMobilePhone));

    // This is the rule the unique index enforces in the database: without it
    // the smoke test would count the same person more than once (pd-09, A9).
    expect(normalised.size).toBe(1);
  });

  it('keeps an area code that repeats the country code', () => {
    expect(normalizeBrazilianMobilePhone('55999999999')).toBe('+5555999999999');
  });

  it('rejects a landline', () => {
    expect(() => normalizeBrazilianMobilePhone('2122223333')).toThrow(InvalidPhoneNumberError);
  });

  it('rejects an eight-digit local number without an area code', () => {
    expect(() => normalizeBrazilianMobilePhone('99999999')).toThrow(InvalidPhoneNumberError);
  });

  it('rejects an invalid area code', () => {
    expect(() => normalizeBrazilianMobilePhone('00999999999')).toThrow(InvalidPhoneNumberError);
    expect(() => normalizeBrazilianMobilePhone('01999999999')).toThrow(InvalidPhoneNumberError);
  });

  it('rejects a number with too many digits', () => {
    expect(() => normalizeBrazilianMobilePhone('219999999999')).toThrow(InvalidPhoneNumberError);
  });

  it('rejects letters', () => {
    expect(() => normalizeBrazilianMobilePhone('vinte e um')).toThrow(InvalidPhoneNumberError);
  });

  it('never leaks the rejected number into the error message', () => {
    expect(() => normalizeBrazilianMobilePhone('2122223333')).toThrow(/10 digits/);
    expect(() => normalizeBrazilianMobilePhone('2122223333')).not.toThrow(/2122223333/);
  });
});

describe('isBrazilianMobilePhone', () => {
  it('answers without throwing', () => {
    expect(isBrazilianMobilePhone('(21) 99999-9999')).toBe(true);
    expect(isBrazilianMobilePhone('2122223333')).toBe(false);
  });
});
