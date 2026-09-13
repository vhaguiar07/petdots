import { DomainError } from './domain-error.js';

/**
 * Sanity bounds, **not** a business rule.
 *
 * 0,1 kg to 120 kg spans a newborn kitten and a great dane, so no real pet is
 * refused; what they catch is the typo — a weight typed in grams into a field
 * that asks for kilograms, or a stray zero. The consumption calculator that
 * will read `weight_grams` (capacidade 9) is the thing with an actual rule, and
 * it does not exist yet: inventing one here would be inventing domain
 * (AGENTS.md). Widening or narrowing these two numbers is therefore reversible
 * and costs nothing but a test.
 */
export const MIN_PET_WEIGHT_GRAMS = 100;
export const MAX_PET_WEIGHT_GRAMS = 120_000;

export class ImplausiblePetWeightError extends DomainError {}

/**
 * Accepts or refuses a weight already expressed in whole grams.
 *
 * Re-checked in the use case even though the contract refuses the same values
 * on the border, for the same reason the password policy is: a rule that only
 * runs where someone remembered to call it is not a rule (`register` does the
 * same with `assertPasswordIsAcceptable`).
 */
export function assertPetWeightIsPlausible(grams: number): void {
  if (!Number.isInteger(grams)) {
    throw new ImplausiblePetWeightError('expected a whole number of grams');
  }

  if (grams < MIN_PET_WEIGHT_GRAMS || grams > MAX_PET_WEIGHT_GRAMS) {
    throw new ImplausiblePetWeightError(
      `expected a weight between ${String(MIN_PET_WEIGHT_GRAMS)} and ${String(
        MAX_PET_WEIGHT_GRAMS,
      )} grams, got ${String(grams)}`,
    );
  }
}

/** Exception-free envelope, for the `.refine()` of the border contract. */
export function isPlausiblePetWeight(grams: number): boolean {
  try {
    assertPetWeightIsPlausible(grams);
    return true;
  } catch {
    return false;
  }
}

/**
 * Turns what a person types into the integer the column stores.
 *
 * Kilograms are what a scale shows and what a tutor knows; grams are what the
 * calculator will divide. Doing the conversion here — rather than in the screen
 * that happens to need it today — is what lets capacidade 9 reuse it, and what
 * makes `12,5` and `12.5` the same weight: a Brazilian keyboard types the
 * comma, and a decimal separator must not decide whether a pet weighs 12 kg or
 * 125 kg.
 *
 * Rounds to whole grams: a scale's third decimal is noise, and `weight_grams`
 * is an `INT`.
 */
export function kilogramsToGrams(input: string): number {
  const normalized = input.trim().replace(',', '.');

  if (normalized === '' || !/^\d+(\.\d+)?$/.test(normalized)) {
    throw new ImplausiblePetWeightError('expected a weight in kilograms');
  }

  const grams = Math.round(Number(normalized) * 1000);

  assertPetWeightIsPlausible(grams);

  return grams;
}
