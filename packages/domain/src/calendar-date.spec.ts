import {
  InvalidCalendarDateError,
  isCalendarDate,
  isNotAfterToday,
  parseBrazilianDate,
} from './calendar-date.js';

describe('parseBrazilianDate', () => {
  it('converts the spelling the form collects into the one the contract carries', () => {
    expect(parseBrazilianDate('12/03/2021')).toBe('2021-03-12');
  });

  it('keeps day and month apart — 03/12 is not 12/03', () => {
    expect(parseBrazilianDate('03/12/2021')).toBe('2021-12-03');
  });

  it('ignores surrounding spaces', () => {
    expect(parseBrazilianDate(' 01/01/2020 ')).toBe('2020-01-01');
  });

  it('accepts 29 February in a leap year', () => {
    expect(parseBrazilianDate('29/02/2020')).toBe('2020-02-29');
  });

  it('rejects 29 February in a common year', () => {
    expect(() => parseBrazilianDate('29/02/2021')).toThrow(InvalidCalendarDateError);
  });

  it('rejects a day that does not exist in the calendar', () => {
    expect(() => parseBrazilianDate('31/02/2021')).toThrow(InvalidCalendarDateError);
    expect(() => parseBrazilianDate('31/04/2021')).toThrow(InvalidCalendarDateError);
    expect(() => parseBrazilianDate('00/01/2021')).toThrow(InvalidCalendarDateError);
    expect(() => parseBrazilianDate('12/13/2021')).toThrow(InvalidCalendarDateError);
  });

  it('rejects a two-digit year — 21 is ambiguous, 2021 is not', () => {
    expect(() => parseBrazilianDate('12/03/21')).toThrow(InvalidCalendarDateError);
  });

  it('rejects the ISO spelling and anything that is not a date', () => {
    expect(() => parseBrazilianDate('2021-03-12')).toThrow(InvalidCalendarDateError);
    expect(() => parseBrazilianDate('ontem')).toThrow(InvalidCalendarDateError);
    expect(() => parseBrazilianDate('')).toThrow(InvalidCalendarDateError);
  });
});

describe('isCalendarDate', () => {
  it('accepts a real ISO date', () => {
    expect(isCalendarDate('2021-03-12')).toBe(true);
    expect(isCalendarDate('2020-02-29')).toBe(true);
  });

  it('refuses a date that matches the shape but not the calendar', () => {
    expect(isCalendarDate('2021-02-31')).toBe(false);
    expect(isCalendarDate('2021-02-29')).toBe(false);
    expect(isCalendarDate('2021-13-01')).toBe(false);
  });

  it('refuses anything that is not the ISO shape', () => {
    expect(isCalendarDate('12/03/2021')).toBe(false);
    expect(isCalendarDate('2021-3-12')).toBe(false);
    expect(isCalendarDate('2021-03-12T00:00:00Z')).toBe(false);
  });
});

describe('isNotAfterToday', () => {
  const today = new Date('2026-09-12T23:30:00.000Z');

  it('accepts today itself', () => {
    expect(isNotAfterToday('2026-09-12', today)).toBe(true);
  });

  it('accepts the past', () => {
    expect(isNotAfterToday('2021-03-12', today)).toBe(true);
  });

  it('refuses tomorrow', () => {
    expect(isNotAfterToday('2026-09-13', today)).toBe(false);
  });

  it('refuses a date that is not a date', () => {
    expect(isNotAfterToday('2021-02-31', today)).toBe(false);
  });

  it('compares date parts, not instants', () => {
    // The first second of the day and its last are the same day. Comparing
    // `new Date(iso)` against `today` would make everything after 00:00 UTC
    // "in the future" and refuse the date a tutor typed this morning.
    expect(isNotAfterToday('2026-09-12', new Date('2026-09-12T00:00:00.000Z'))).toBe(true);
    expect(isNotAfterToday('2026-09-12', new Date('2026-09-12T23:59:59.999Z'))).toBe(true);
  });
});
