import {
  acceptanceDeadline,
  currentIntervalEnd,
  isOpenAt,
  isOpeningIntervalList,
  nextOpeningAt,
  type OpeningInterval,
  StoreClosedError,
} from './opening-hours.js';

/** Monday to Saturday, 08:00–19:00 — the pilot's default shape. */
const WEEKDAYS: OpeningInterval[] = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: '08:00',
  closes: '19:00',
}));

/** The same week, but closed for lunch. */
const WITH_LUNCH: OpeningInterval[] = [1, 2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, opens: '08:00', closes: '12:00' },
  { weekday, opens: '14:00', closes: '19:00' },
]);

/** Seven days, around the clock — what the e2e fixture uses. */
const ALWAYS: OpeningInterval[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: '00:00',
  closes: '24:00',
}));

/** São Paulo local time as an instant. 14:00 local is 17:00 UTC. */
const local = (day: number, time: string): Date =>
  new Date(`2026-09-${String(day).padStart(2, '0')}T${time}:00.000-03:00`);

// 2026-09-13 is a Sunday, so 14 is Monday … 19 Saturday.

describe('isOpeningIntervalList', () => {
  it('accepts the shapes the pilot writes', () => {
    expect(isOpeningIntervalList([])).toBe(true);
    expect(isOpeningIntervalList(WEEKDAYS)).toBe(true);
    expect(isOpeningIntervalList(WITH_LUNCH)).toBe(true);
    expect(isOpeningIntervalList(ALWAYS)).toBe(true);
  });

  it('refuses a weekday outside 0–6', () => {
    expect(isOpeningIntervalList([{ weekday: 7, opens: '08:00', closes: '19:00' }])).toBe(false);
    expect(isOpeningIntervalList([{ weekday: -1, opens: '08:00', closes: '19:00' }])).toBe(false);
  });

  it('refuses a closing time that is not after the opening one', () => {
    expect(isOpeningIntervalList([{ weekday: 1, opens: '19:00', closes: '08:00' }])).toBe(false);
    expect(isOpeningIntervalList([{ weekday: 1, opens: '08:00', closes: '08:00' }])).toBe(false);
  });

  it('refuses an unreadable time', () => {
    expect(isOpeningIntervalList([{ weekday: 1, opens: '8:00', closes: '19:00' }])).toBe(false);
    expect(isOpeningIntervalList([{ weekday: 1, opens: '08:60', closes: '19:00' }])).toBe(false);
    expect(isOpeningIntervalList([{ weekday: 1, opens: '25:00', closes: '26:00' }])).toBe(false);
  });

  it('refuses two intervals of the same weekday that overlap', () => {
    expect(
      isOpeningIntervalList([
        { weekday: 1, opens: '08:00', closes: '13:00' },
        { weekday: 1, opens: '12:00', closes: '19:00' },
      ]),
    ).toBe(false);
  });

  it('allows two intervals of the same weekday that merely touch', () => {
    expect(
      isOpeningIntervalList([
        { weekday: 1, opens: '08:00', closes: '12:00' },
        { weekday: 1, opens: '12:00', closes: '19:00' },
      ]),
    ).toBe(true);
  });

  it('allows the same clock times on different weekdays', () => {
    expect(
      isOpeningIntervalList([
        { weekday: 1, opens: '08:00', closes: '19:00' },
        { weekday: 2, opens: '08:00', closes: '19:00' },
      ]),
    ).toBe(true);
  });

  it('accepts 24:00 as a closing time and refuses it as an opening one', () => {
    expect(isOpeningIntervalList([{ weekday: 1, opens: '00:00', closes: '24:00' }])).toBe(true);
    expect(isOpeningIntervalList([{ weekday: 1, opens: '24:00', closes: '24:00' }])).toBe(false);
  });
});

describe('isOpenAt', () => {
  it('opens inclusively and closes exclusively', () => {
    expect(isOpenAt(WEEKDAYS, local(14, '07:59'))).toBe(false);
    expect(isOpenAt(WEEKDAYS, local(14, '08:00'))).toBe(true);
    expect(isOpenAt(WEEKDAYS, local(14, '18:59'))).toBe(true);
    expect(isOpenAt(WEEKDAYS, local(14, '19:00'))).toBe(false);
  });

  it('is closed during lunch and open on both sides of it', () => {
    expect(isOpenAt(WITH_LUNCH, local(14, '11:59'))).toBe(true);
    expect(isOpenAt(WITH_LUNCH, local(14, '12:00'))).toBe(false);
    expect(isOpenAt(WITH_LUNCH, local(14, '13:59'))).toBe(false);
    expect(isOpenAt(WITH_LUNCH, local(14, '14:00'))).toBe(true);
  });

  it('is closed on a weekday with no interval', () => {
    // 13 September 2026 is a Sunday, and the schedule has no Sunday.
    expect(isOpenAt(WEEKDAYS, local(13, '10:00'))).toBe(false);
  });

  it('an empty schedule is never open — it fails closed', () => {
    expect(isOpenAt([], local(14, '10:00'))).toBe(false);
  });

  it('🔴 reads the day in São Paulo, not in UTC', () => {
    // Monday 00:30 UTC is still Sunday 21:30 in São Paulo, and the store is
    // closed on Sundays. A machine reading `getDay()` would say Monday and
    // answer "open" three hours early.
    expect(isOpenAt(ALWAYS, new Date('2026-09-14T00:30:00.000Z'))).toBe(true);
    expect(
      isOpenAt(
        [{ weekday: 1, opens: '00:00', closes: '24:00' }],
        new Date('2026-09-14T00:30:00.000Z'),
      ),
    ).toBe(false);
  });

  it('a 24:00 schedule is open at every minute, including 23:59', () => {
    expect(isOpenAt(ALWAYS, local(14, '23:59'))).toBe(true);
    expect(isOpenAt(ALWAYS, local(14, '00:00'))).toBe(true);
  });
});

describe('currentIntervalEnd', () => {
  it('is the closing instant of the stretch in progress', () => {
    expect(currentIntervalEnd(WEEKDAYS, local(14, '10:00'))?.toISOString()).toBe(
      local(14, '19:00').toISOString(),
    );
  });

  it('is the start of lunch when lunch is next', () => {
    expect(currentIntervalEnd(WITH_LUNCH, local(14, '10:00'))?.toISOString()).toBe(
      local(14, '12:00').toISOString(),
    );
  });

  it('is null while the store is closed', () => {
    expect(currentIntervalEnd(WEEKDAYS, local(14, '20:00'))).toBeNull();
  });
});

describe('nextOpeningAt', () => {
  it('is later the same day when the store has not opened yet', () => {
    expect(nextOpeningAt(WEEKDAYS, local(14, '06:00'))?.toISOString()).toBe(
      local(14, '08:00').toISOString(),
    );
  });

  it('is the next morning after closing time', () => {
    expect(nextOpeningAt(WEEKDAYS, local(14, '19:00'))?.toISOString()).toBe(
      local(15, '08:00').toISOString(),
    );
  });

  it('is the end of lunch when lunch is on', () => {
    expect(nextOpeningAt(WITH_LUNCH, local(14, '12:30'))?.toISOString()).toBe(
      local(14, '14:00').toISOString(),
    );
  });

  it('skips Sunday for a Monday-to-Saturday store', () => {
    // Saturday 19:00 → the next opening is Monday, not Sunday.
    expect(nextOpeningAt(WEEKDAYS, local(19, '19:00'))?.toISOString()).toBe(
      local(21, '08:00').toISOString(),
    );
  });

  it('is null for an empty schedule', () => {
    expect(nextOpeningAt([], local(14, '10:00'))).toBeNull();
  });
});

describe('acceptanceDeadline', () => {
  it('is placedAt plus the window while the store stays open', () => {
    expect(acceptanceDeadline(WEEKDAYS, local(14, '10:00'), 15).toISOString()).toBe(
      local(14, '10:15').toISOString(),
    );
  });

  it('🔴 pauses at closing time and resumes at the next opening', () => {
    // The case ADR-0014 C2 names: 18:55 in a store that closes at 19:00 spends
    // five minutes today and the remaining ten at tomorrow's opening.
    expect(acceptanceDeadline(WEEKDAYS, local(14, '18:55'), 15).toISOString()).toBe(
      local(15, '08:10').toISOString(),
    );
  });

  it('🔴 crosses the weekend for an order placed on Saturday evening', () => {
    // Saturday 18:50, closes 19:00 → 10 minutes on Saturday, 5 on Monday.
    expect(acceptanceDeadline(WEEKDAYS, local(19, '18:50'), 15).toISOString()).toBe(
      local(21, '08:05').toISOString(),
    );
  });

  it('pauses over lunch', () => {
    // 11:55, closes for lunch at 12:00 → 5 minutes before, 10 after 14:00.
    expect(acceptanceDeadline(WITH_LUNCH, local(14, '11:55'), 15).toISOString()).toBe(
      local(14, '14:10').toISOString(),
    );
  });

  it('consumes a whole interval and part of the next when the window is long', () => {
    // 18:00 Monday with a 120-minute window: 60 minutes until 19:00, then 60
    // more from 08:00 Tuesday.
    expect(acceptanceDeadline(WEEKDAYS, local(14, '18:00'), 120).toISOString()).toBe(
      local(15, '09:00').toISOString(),
    );
  });

  it('never pauses in a store that is always open', () => {
    expect(acceptanceDeadline(ALWAYS, local(14, '23:55'), 15).toISOString()).toBe(
      local(15, '00:10').toISOString(),
    );
  });

  it('🔴 raises when the store is closed, carrying when it opens again', () => {
    expect.assertions(2);

    try {
      acceptanceDeadline(WEEKDAYS, local(14, '20:00'), 15);
    } catch (error) {
      expect(error).toBeInstanceOf(StoreClosedError);
      expect((error as StoreClosedError).nextOpeningAt?.toISOString()).toBe(
        local(15, '08:00').toISOString(),
      );
    }
  });

  it('raises with a null opening for an empty schedule — a store that never opens', () => {
    expect.assertions(2);

    try {
      acceptanceDeadline([], local(14, '10:00'), 15);
    } catch (error) {
      expect(error).toBeInstanceOf(StoreClosedError);
      expect((error as StoreClosedError).nextOpeningAt).toBeNull();
    }
  });

  it('refuses a window that is not a positive whole number of minutes', () => {
    expect(() => acceptanceDeadline(WEEKDAYS, local(14, '10:00'), 0)).toThrow();
    expect(() => acceptanceDeadline(WEEKDAYS, local(14, '10:00'), -5)).toThrow();
    expect(() => acceptanceDeadline(WEEKDAYS, local(14, '10:00'), 1.5)).toThrow();
  });
});
