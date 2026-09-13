import { openingHoursSchema } from '@petdots/contracts';

import {
  addSecondStretch,
  fromDraft,
  openDay,
  OpeningHoursDraftError,
  toDraft,
  type WeekDraft,
} from './opening-hours-draft';

const CLOSED = { closed: true, opens: '08:00', closes: '18:00', second: null } as const;

const week = (overrides: Record<number, WeekDraft[number]>): WeekDraft =>
  [0, 1, 2, 3, 4, 5, 6].map(
    (weekday) => overrides[weekday] ?? { ...CLOSED },
  ) as unknown as WeekDraft;

describe('toDraft', () => {
  it('turns a flat list of stretches into seven rows', () => {
    const draft = toDraft([{ weekday: 1, opens: '08:00', closes: '18:00' }]);

    expect(draft).toHaveLength(7);
    expect(draft[1]).toEqual({ closed: false, opens: '08:00', closes: '18:00', second: null });
    expect(draft[0]?.closed).toBe(true);
  });

  it('reads a lunch break as the second stretch of the day', () => {
    const draft = toDraft([
      { weekday: 2, opens: '14:00', closes: '19:00' },
      { weekday: 2, opens: '08:00', closes: '12:00' },
    ]);

    // Sorted by opening time, whatever order the API sent them in.
    expect(draft[2]).toEqual({
      closed: false,
      opens: '08:00',
      closes: '12:00',
      second: { opens: '14:00', closes: '19:00' },
    });
  });

  it('🔴 reads an empty schedule as a week that is closed every day', () => {
    // An empty list means "never open", and the editor has to show that as
    // seven closed days rather than as seven blank ones.
    expect(toDraft([]).every((day) => day.closed)).toBe(true);
  });
});

describe('fromDraft', () => {
  it('drops the closed days and keeps the open ones', () => {
    const intervals = fromDraft(
      week({ 1: { closed: false, opens: '09:00', closes: '19:00', second: null } }),
    );

    expect(intervals).toEqual([{ weekday: 1, opens: '09:00', closes: '19:00' }]);
  });

  it('emits both stretches of a day split by lunch', () => {
    const intervals = fromDraft(
      week({
        2: {
          closed: false,
          opens: '08:00',
          closes: '12:00',
          second: { opens: '14:00', closes: '19:00' },
        },
      }),
    );

    expect(intervals).toEqual([
      { weekday: 2, opens: '08:00', closes: '12:00' },
      { weekday: 2, opens: '14:00', closes: '19:00' },
    ]);
  });

  it('🔴 names the day when the closing time comes first', () => {
    // The server refuses it too, but "Terça: …" is something a person can act
    // on, and a 422 on the whole week is not.
    expect(() =>
      fromDraft(week({ 2: { closed: false, opens: '19:00', closes: '08:00', second: null } })),
    ).toThrow(OpeningHoursDraftError);

    expect(() =>
      fromDraft(week({ 2: { closed: false, opens: '19:00', closes: '08:00', second: null } })),
    ).toThrow(/Terça/);
  });

  it('refuses a time that is not HH:MM', () => {
    expect(() =>
      fromDraft(week({ 3: { closed: false, opens: '8h', closes: '18:00', second: null } })),
    ).toThrow(OpeningHoursDraftError);
  });

  it('🔴 produces a week the contract accepts', () => {
    const intervals = fromDraft(
      week({
        1: { closed: false, opens: '08:00', closes: '18:00', second: null },
        2: {
          closed: false,
          opens: '08:00',
          closes: '12:00',
          second: { opens: '14:00', closes: '19:00' },
        },
      }),
    );

    expect(openingHoursSchema.safeParse(intervals).success).toBe(true);
  });

  it('🔴 an all-closed week is an empty list, which the shop is allowed to save', () => {
    const intervals = fromDraft(week({}));

    expect(intervals).toEqual([]);
    expect(openingHoursSchema.safeParse(intervals).success).toBe(true);
  });

  it('leaves the overlap rule to the domain, which catches it', () => {
    // Two stretches of one day that overlap are legal as a *draft* and refused
    // by the schema — one place for the rule, not two.
    const intervals = fromDraft(
      week({
        2: {
          closed: false,
          opens: '08:00',
          closes: '15:00',
          second: { opens: '14:00', closes: '19:00' },
        },
      }),
    );

    expect(openingHoursSchema.safeParse(intervals).success).toBe(false);
  });

  it('round-trips a schedule unchanged', () => {
    const original = [
      { weekday: 1, opens: '08:00', closes: '18:00' },
      { weekday: 2, opens: '08:00', closes: '12:00' },
      { weekday: 2, opens: '14:00', closes: '19:00' },
    ];

    expect(fromDraft(toDraft(original))).toEqual(original);
  });
});

describe('openDay and addSecondStretch', () => {
  it('switching a day on gives it business hours, not blank fields', () => {
    expect(openDay({ ...CLOSED })).toEqual({
      closed: false,
      opens: '08:00',
      closes: '18:00',
      second: null,
    });
  });

  it('adding lunch splits the day instead of appending to it', () => {
    const day = addSecondStretch({ closed: false, opens: '08:00', closes: '18:00', second: null });

    expect(day.closes).toBe('12:00');
    expect(day.second).toEqual({ opens: '14:00', closes: '18:00' });
  });

  it('adding lunch twice changes nothing', () => {
    const once = addSecondStretch({ closed: false, opens: '08:00', closes: '18:00', second: null });

    expect(addSecondStretch(once)).toEqual(once);
  });
});
