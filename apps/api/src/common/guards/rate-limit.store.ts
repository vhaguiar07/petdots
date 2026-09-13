import { Injectable, Logger } from '@nestjs/common';

import type { RateLimitPolicy } from './rate-limit.decorator.js';

/** What the guard needs to know, and nothing the caller should learn. */
export interface RateLimitVerdict {
  readonly allowed: boolean;
  /** Milliseconds until the current window resets. Zero when allowed. */
  readonly retryAfterMs: number;
}

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Above this many tracked keys the store is being used as a bucket for someone
 * else's flood rather than as a counter. Ten thousand distinct IPs inside one
 * window is far past any traffic a neighbourhood pilot produces.
 */
const MAX_TRACKED_KEYS = 10_000;

/** How often expired windows are swept out, at most. */
const SWEEP_INTERVAL_MS = 60_000;

/**
 * Fixed-window counters, in the process's own memory.
 *
 * 🔴 **In memory, and that is a decision, not an omission.** The API runs as a
 * single instance (`DEPLOYMENT` §"Postura de infraestrutura"), so one process
 * sees every request and a shared store would buy nothing at the cost of Redis
 * — infrastructure the ADR-0002 forbids adding before it is needed. Two
 * consequences are accepted and named: the counters **reset on every deploy**,
 * and they would **not add up across replicas**. The trigger for a shared store
 * is the second replica, which already carries an ADR trigger of its own.
 *
 * **Fixed window, not sliding.** A sliding window costs a list of timestamps
 * per key to smooth a burst at the boundary — at worst an abuser gets a double
 * budget for one instant, which changes nothing about the flood the window is
 * there to stop.
 *
 * The clock arrives as an argument instead of being read here, so the tests
 * move time without fake timers and this class stays free of any I/O.
 */
@Injectable()
export class RateLimitStore {
  private readonly logger = new Logger(RateLimitStore.name);
  private readonly windows = new Map<string, Window>();
  private lastSweepAt = 0;

  hit(key: string, policy: RateLimitPolicy, now: number): RateLimitVerdict {
    this.sweep(now);

    const current = this.windows.get(key);

    // No window, or one that has run out: a fresh window starts on this
    // request. An expired entry left lying around is harmless, which is why the
    // sweep below is allowed to be lazy.
    if (!current || current.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + policy.windowMs });
      return { allowed: true, retryAfterMs: 0 };
    }

    if (current.count >= policy.limit) {
      return { allowed: false, retryAfterMs: current.resetAt - now };
    }

    current.count += 1;

    return { allowed: true, retryAfterMs: 0 };
  }

  /** Only for tests and for the boot of a fresh process. */
  reset(): void {
    this.windows.clear();
    this.lastSweepAt = 0;
  }

  /** How many windows are being tracked. Exposed for the tests, not for logic. */
  get size(): number {
    return this.windows.size;
  }

  /**
   * Drops expired windows, at most once a minute — or immediately when the map
   * is over its cap.
   *
   * Sweeping on **every** request would be O(n) per request to reclaim memory
   * nobody is waiting on: a stale entry is overwritten the next time its key
   * appears, and the only invariant that matters is that the map stays bounded.
   */
  private sweep(now: number): void {
    const overCap = this.windows.size > MAX_TRACKED_KEYS;

    if (!overCap && now - this.lastSweepAt < SWEEP_INTERVAL_MS) {
      return;
    }

    this.lastSweepAt = now;

    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) {
        this.windows.delete(key);
      }
    }

    // Still over the cap with nothing expired: this is a flood of distinct
    // sources, and holding their counters is how the flood would exhaust the
    // process's memory. Dropping them forgives the in-flight offenders — the
    // cheaper of the two failures, and loud enough to find in the logs.
    if (this.windows.size > MAX_TRACKED_KEYS) {
      this.logger.warn(
        `rate limit store over capacity (${String(this.windows.size)} keys); dropping all counters`,
      );
      this.windows.clear();
    }
  }
}

export { MAX_TRACKED_KEYS, SWEEP_INTERVAL_MS };
