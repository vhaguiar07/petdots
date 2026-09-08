import { DomainError } from './domain-error.js';

/** Basis points in a whole unit: 10000 bps = 100%. */
const BPS_DENOMINATOR = 10_000;

export class InvalidMoneyOperationError extends DomainError {}

/**
 * Applies a rate expressed in basis points to an amount in cents.
 *
 * Money is always integer cents and rates are always integer basis points
 * (ADR-0004 #11) — floating point never touches a monetary value. The
 * multiplication happens in integer space and only the final division rounds.
 *
 * Rounding is half-up away from zero: 0.5 cent becomes 1 cent, -0.5 becomes -1.
 * The choice is explicit because the alternatives (bankers' rounding, truncation)
 * shift cents systematically, and a marketplace splits every order between two
 * parties — a systematic bias would always favour the same side.
 */
export function applyBasisPoints(amountCents: number, bps: number): number {
  assertInteger(amountCents, 'amountCents');
  assertInteger(bps, 'bps');

  if (bps < 0) {
    throw new InvalidMoneyOperationError(`bps must not be negative, got ${bps}`);
  }

  const scaled = amountCents * bps;

  if (!Number.isSafeInteger(scaled)) {
    throw new InvalidMoneyOperationError(
      `amountCents * bps exceeds the safe integer range (${amountCents} * ${bps})`,
    );
  }

  const sign = scaled < 0 ? -1 : 1;
  const rounded = Math.floor((Math.abs(scaled) + BPS_DENOMINATOR / 2) / BPS_DENOMINATOR);

  // Normalises -0, which would otherwise leak through Object.is comparisons.
  return rounded === 0 ? 0 : sign * rounded;
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new InvalidMoneyOperationError(`${label} must be an integer, got ${value}`);
  }
}
