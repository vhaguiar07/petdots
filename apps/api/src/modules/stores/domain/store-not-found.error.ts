import { DomainError } from '@petdots/domain';

/**
 * No store answers under this id — either because none ever did, or because the
 * one that does is `PAUSED`.
 *
 * The two cases are deliberately one error. A paused store is invisible to the
 * comparator (ADR-0010): showing it on its own page would be two rules for one
 * thing, and a visitor following a stale link would see a shopfront that the
 * price list refuses to fill (pd-13, A15).
 */
export class StoreNotFoundError extends DomainError {
  constructor(storeId: string) {
    super(`store ${storeId} not found`);
  }
}
