import {
  addZonedDays,
  instantOf,
  minutesOfDay,
  startOfZonedDay,
  STORE_TIME_ZONE,
  zonedOffsetMinutes,
  zonedPartsOf,
} from './zoned-time.js';

describe('zonedPartsOf', () => {
  it('reads the wall clock in São Paulo, not on the machine', () => {
    // 21:30 UTC on a Sunday is 18:30 the same Sunday in São Paulo.
    expect(zonedPartsOf(new Date('2026-09-13T21:30:00.000Z'))).toEqual({
      year: 2026,
      month: 9,
      day: 13,
      weekday: 0,
      hour: 18,
      minute: 30,
    });
  });

  it('🔴 crosses the day backwards — the case a CI machine in UTC gets wrong', () => {
    // Monday 00:00 UTC is still Sunday 21:00 in São Paulo. `getDay()` on a UTC
    // machine would answer Monday, and a shop closed on Sundays would start
    // taking orders three hours early.
    const parts = zonedPartsOf(new Date('2026-09-14T00:00:00.000Z'));

    expect(parts.day).toBe(13);
    expect(parts.weekday).toBe(0);
    expect(parts.hour).toBe(21);
  });

  it('reads midnight and noon under hourCycle h23, never 24 or 12 AM', () => {
    expect(zonedPartsOf(new Date('2026-09-14T03:00:00.000Z')).hour).toBe(0);
    expect(zonedPartsOf(new Date('2026-09-14T15:00:00.000Z')).hour).toBe(12);
  });

  it('names every weekday of one week', () => {
    const weekdays = [0, 1, 2, 3, 4, 5, 6].map(
      (offset) => zonedPartsOf(new Date(`2026-09-${String(13 + offset)}T15:00:00.000Z`)).weekday,
    );

    expect(weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('zonedOffsetMinutes', () => {
  it('detects −180 for São Paulo instead of assuming it', () => {
    expect(zonedOffsetMinutes(new Date('2026-09-13T21:30:00.000Z'))).toBe(-180);
    expect(zonedOffsetMinutes(new Date('2026-01-15T12:00:00.000Z'))).toBe(-180);
  });

  it('answers 0 for UTC', () => {
    expect(zonedOffsetMinutes(new Date('2026-09-13T21:30:00.000Z'), 'UTC')).toBe(0);
  });

  it('ignores the seconds of the instant', () => {
    expect(zonedOffsetMinutes(new Date('2026-09-13T21:30:59.999Z'))).toBe(-180);
  });
});

describe('instantOf', () => {
  it('is the exact inverse of zonedPartsOf', () => {
    const instant = new Date('2026-09-13T21:30:00.000Z');
    const parts = zonedPartsOf(instant);

    expect(instantOf(parts).toISOString()).toBe(instant.toISOString());
  });

  it('turns a local wall clock into the right instant', () => {
    // Monday 08:00 in São Paulo is 11:00 UTC.
    expect(instantOf({ year: 2026, month: 9, day: 14, hour: 8, minute: 0 }).toISOString()).toBe(
      '2026-09-14T11:00:00.000Z',
    );
  });

  it('rolls a day overflow through the calendar', () => {
    // 31 September does not exist: it is 1 October.
    expect(zonedPartsOf(instantOf({ year: 2026, month: 9, day: 31, hour: 9, minute: 0 }))).toEqual(
      expect.objectContaining({ month: 10, day: 1, hour: 9 }),
    );
  });

  it('round-trips every hour of a day', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const parts = { year: 2026, month: 9, day: 14, hour, minute: 0 };
      const back = zonedPartsOf(instantOf(parts, STORE_TIME_ZONE), STORE_TIME_ZONE);

      expect({ hour: back.hour, day: back.day }).toEqual({ hour, day: 14 });
    }
  });
});

describe('minutesOfDay', () => {
  it('counts minutes since local midnight', () => {
    expect(minutesOfDay({ hour: 0, minute: 0 })).toBe(0);
    expect(minutesOfDay({ hour: 8, minute: 30 })).toBe(510);
    expect(minutesOfDay({ hour: 23, minute: 59 })).toBe(1439);
  });
});

describe('startOfZonedDay', () => {
  it('is local midnight, not UTC midnight', () => {
    // Sunday 21:00 São Paulo → the day started at 00:00 São Paulo = 03:00 UTC.
    expect(startOfZonedDay(new Date('2026-09-14T00:00:00.000Z')).toISOString()).toBe(
      '2026-09-13T03:00:00.000Z',
    );
  });
});

describe('addZonedDays', () => {
  it('keeps the wall-clock time and moves the calendar day', () => {
    const parts = zonedPartsOf(addZonedDays(new Date('2026-09-13T21:30:00.000Z'), 2));

    expect({ day: parts.day, hour: parts.hour, minute: parts.minute }).toEqual({
      day: 15,
      hour: 18,
      minute: 30,
    });
  });

  it('crosses the month boundary', () => {
    const parts = zonedPartsOf(addZonedDays(new Date('2026-09-30T15:00:00.000Z'), 1));

    expect({ month: parts.month, day: parts.day }).toEqual({ month: 10, day: 1 });
  });
});
