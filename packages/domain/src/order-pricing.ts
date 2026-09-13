import { DomainError } from './domain-error.js';

/**
 * What the platform charges the customer per order — R$ 1,99 in the pilot,
 * with a ceiling of R$ 2,99 (ADR-0003 #2).
 *
 * A constant and not an environment variable: it is a product decision recorded
 * in an ADR, not a deployment setting. Changing it should be an edit somebody
 * reviews, not a value that differs between two machines.
 */
export const SERVICE_FEE_CENTS = 199;

/** Sanity bounds on a cart. Not business rules — guards against absurd input. */
export const MAX_ORDER_LINES = 30;
export const MAX_LINE_QUANTITY = 20;

export class InvalidOrderPricingError extends DomainError {}

export interface PricedLine {
  unitPriceCents: number;
  quantity: number;
  commissionAmountCents: number;
}

export interface OrderTotalsInput {
  lines: readonly PricedLine[];
  deliveryFeeCents: number;
  serviceFeeCents: number;
}

export interface OrderTotals {
  itemsTotalCents: number;
  totalCents: number;
  commissionTotalCents: number;
}

/** What one line costs. Integer cents times an integer quantity — no rounding. */
export function lineTotalCents(unitPriceCents: number, quantity: number): number {
  assertPositiveInteger(unitPriceCents, 'unitPriceCents');
  assertPositiveInteger(quantity, 'quantity');

  return unitPriceCents * quantity;
}

/**
 * The three sums the order carries.
 *
 * `total_cents = items + delivery + service` is the most-cited invariant of the
 * `DOMAIN_MODEL`, and it is computed here once so that the use case, the
 * quote and the `CHECK` in the migration cannot drift apart. Nothing rounds:
 * every term is already an integer number of cents, which is why the database
 * constraint can be an exact equality.
 */
export function orderTotals(input: OrderTotalsInput): OrderTotals {
  assertNonNegativeInteger(input.deliveryFeeCents, 'deliveryFeeCents');
  assertNonNegativeInteger(input.serviceFeeCents, 'serviceFeeCents');

  if (input.lines.length === 0) {
    throw new InvalidOrderPricingError('an order has at least one line');
  }

  if (input.lines.length > MAX_ORDER_LINES) {
    throw new InvalidOrderPricingError(
      `an order carries at most ${String(MAX_ORDER_LINES)} lines, got ${String(input.lines.length)}`,
    );
  }

  let itemsTotalCents = 0;
  let commissionTotalCents = 0;

  for (const line of input.lines) {
    if (line.quantity > MAX_LINE_QUANTITY) {
      throw new InvalidOrderPricingError(
        `a line carries at most ${String(MAX_LINE_QUANTITY)} units, got ${String(line.quantity)}`,
      );
    }

    assertNonNegativeInteger(line.commissionAmountCents, 'commissionAmountCents');

    itemsTotalCents += lineTotalCents(line.unitPriceCents, line.quantity);
    commissionTotalCents += line.commissionAmountCents;
  }

  return {
    itemsTotalCents,
    totalCents: itemsTotalCents + input.deliveryFeeCents + input.serviceFeeCents,
    commissionTotalCents,
  };
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new InvalidOrderPricingError(`${label} must be a positive integer, got ${String(value)}`);
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidOrderPricingError(
      `${label} must be a non-negative integer, got ${String(value)}`,
    );
  }
}
