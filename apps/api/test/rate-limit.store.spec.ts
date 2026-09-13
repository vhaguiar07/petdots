import {
  MAX_TRACKED_KEYS,
  RateLimitStore,
  SWEEP_INTERVAL_MS,
} from '../src/common/guards/rate-limit.store.js';

const POLICY = { limit: 3, windowMs: 60_000 } as const;

const T0 = 1_000_000;

describe('RateLimitStore', () => {
  let store: RateLimitStore;

  beforeEach(() => {
    store = new RateLimitStore();
  });

  it('allows exactly the budget and refuses the next request', () => {
    for (let attempt = 1; attempt <= POLICY.limit; attempt += 1) {
      expect(store.hit('caller', POLICY, T0).allowed).toBe(true);
    }

    expect(store.hit('caller', POLICY, T0)).toEqual({ allowed: false, retryAfterMs: 60_000 });
  });

  it('counts down the wait as the window drains', () => {
    for (let attempt = 1; attempt <= POLICY.limit; attempt += 1) {
      store.hit('caller', POLICY, T0);
    }

    expect(store.hit('caller', POLICY, T0 + 45_000).retryAfterMs).toBe(15_000);
  });

  it('opens a fresh window once the old one expires', () => {
    for (let attempt = 1; attempt <= POLICY.limit; attempt += 1) {
      store.hit('caller', POLICY, T0);
    }

    expect(store.hit('caller', POLICY, T0 + 1).allowed).toBe(false);
    expect(store.hit('caller', POLICY, T0 + POLICY.windowMs).allowed).toBe(true);
  });

  it('a refused request does not extend the window', () => {
    for (let attempt = 1; attempt <= POLICY.limit; attempt += 1) {
      store.hit('caller', POLICY, T0);
    }

    // Hammering while blocked is the likeliest behaviour of both a robot and an
    // impatient human. If each refusal pushed `resetAt` forward, the caller
    // would never be let back in.
    store.hit('caller', POLICY, T0 + 30_000);
    store.hit('caller', POLICY, T0 + 50_000);

    expect(store.hit('caller', POLICY, T0 + POLICY.windowMs).allowed).toBe(true);
  });

  it('keeps one budget per key', () => {
    for (let attempt = 1; attempt <= POLICY.limit; attempt += 1) {
      store.hit('one', POLICY, T0);
    }

    expect(store.hit('one', POLICY, T0).allowed).toBe(false);
    expect(store.hit('two', POLICY, T0).allowed).toBe(true);
  });

  it('sweeps expired windows out, but not before the sweep interval', () => {
    store.hit('a', POLICY, T0);
    store.hit('b', POLICY, T0);
    expect(store.size).toBe(2);

    // Still inside the interval: the expired entries are harmless and stay.
    store.hit('c', POLICY, T0 + SWEEP_INTERVAL_MS - 1);
    expect(store.size).toBe(3);

    // Past it, and past `windowMs`, so `a` and `b` are gone and only the key of
    // this very call survives.
    store.hit('c', POLICY, T0 + POLICY.windowMs + SWEEP_INTERVAL_MS);
    expect(store.size).toBe(1);
  });

  it('drops every counter when a flood pushes it past its cap', () => {
    for (let index = 0; index <= MAX_TRACKED_KEYS; index += 1) {
      store.hit(`caller-${String(index)}`, POLICY, T0);
    }

    expect(store.size).toBeGreaterThan(MAX_TRACKED_KEYS);

    // Nothing has expired, so the sweep cannot reclaim anything and clears the
    // map instead: forgiving the offenders is cheaper than running the process
    // out of memory on their behalf.
    store.hit('one-too-many', POLICY, T0);

    expect(store.size).toBe(1);
  });

  it('forgets everything on reset', () => {
    store.hit('caller', POLICY, T0);
    store.reset();

    expect(store.size).toBe(0);
  });
});
