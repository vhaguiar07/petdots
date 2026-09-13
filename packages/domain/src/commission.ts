import { DomainError } from './domain-error.js';
import { applyBasisPoints } from './money.js';

/**
 * How the platform got this order (ADR-0004 #7). A customer the store brought
 * in through its own link or counter QR costs no commission — it is the pitch
 * that makes the take rate defensible to a shop owner (ADR-0003 #4).
 */
export type AcquisitionChannel = 'PLATFORM' | 'STORE_REFERRAL';

/**
 * One line of the commission table, valid for a stretch of time.
 *
 * `category` is a plain string rather than the `ProductCategory` of
 * `@petdots/contracts`: the contracts package imports this one, and naming it
 * here would close the circle. The call site keeps the type honest.
 */
export interface CommissionRateRule {
  category: string;
  rateBps: number;
  validFrom: Date;
  /** `null` means still in force. */
  validTo: Date | null;
}

/** The founder's tariff: one store's exception to the table. */
export interface StoreCommissionRateRule extends CommissionRateRule {
  storeId: string;
}

export class CommissionRateNotFoundError extends DomainError {
  constructor(readonly category: string) {
    super(`no commission rate in force for category ${category}`);
  }
}

export interface ResolveCommissionInput {
  category: string;
  acquisitionChannel: AcquisitionChannel;
  /** Overrides of the store placing the order. May be empty. */
  storeRates: readonly StoreCommissionRateRule[];
  tableRates: readonly CommissionRateRule[];
  at: Date;
}

/**
 * Whether a rule was in force at that instant.
 *
 * `validFrom` is inclusive and `validTo` exclusive, so a rule that ends exactly
 * when the next one begins leaves no gap and no overlap.
 */
export function isRuleValidAt(rule: CommissionRateRule, at: Date): boolean {
  if (rule.validFrom.getTime() > at.getTime()) {
    return false;
  }

  return rule.validTo === null || rule.validTo.getTime() > at.getTime();
}

/** The one in force with the most recent `validFrom`, or `null`. */
function mostRecent<T extends CommissionRateRule>(rules: readonly T[], at: Date): T | null {
  let best: T | null = null;

  for (const rule of rules) {
    if (!isRuleValidAt(rule, at)) {
      continue;
    }

    if (!best || rule.validFrom.getTime() > best.validFrom.getTime()) {
      best = rule;
    }
  }

  return best;
}

/**
 * 🔴 The take rate that applies to one line, in basis points.
 *
 * The order of the three branches *is* the business rule (ADR-0003, ADR-0004
 * #4):
 *
 * 1. a customer the store brought in pays the platform nothing — **zero, even
 *    when the store has a negotiated override**, because the override is a
 *    discount on a commission that is not being charged at all;
 * 2. otherwise the store's own exception wins, which is how the founder tariff
 *    is expressed;
 * 3. otherwise the table for that category.
 *
 * Raises rather than defaulting when nothing is in force: a silent `0` would
 * hand the platform's revenue away on a seeding mistake, and a silent fallback
 * rate would charge a partner something nobody decided.
 */
export function resolveCommissionRateBps(input: ResolveCommissionInput): number {
  if (input.acquisitionChannel === 'STORE_REFERRAL') {
    return 0;
  }

  const override = mostRecent(
    input.storeRates.filter((rule) => rule.category === input.category),
    input.at,
  );

  if (override) {
    return override.rateBps;
  }

  const table = mostRecent(
    input.tableRates.filter((rule) => rule.category === input.category),
    input.at,
  );

  if (!table) {
    throw new CommissionRateNotFoundError(input.category);
  }

  return table.rateBps;
}

/**
 * The platform's cut of one line, in cents.
 *
 * Delegates to `applyBasisPoints`, which already decided the rounding (half-up)
 * and already refuses floating point. Reimplementing it here would be a second
 * rounding rule in the same codebase, and the two would disagree on a half
 * cent — every time, on the same side.
 */
export function commissionAmountCents(lineTotalCents: number, rateBps: number): number {
  return applyBasisPoints(lineTotalCents, rateBps);
}
