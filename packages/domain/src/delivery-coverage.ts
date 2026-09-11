import { normalizePostalCode } from './postal-code.js';
import { normalizeSearchText } from './search-text.js';

/** An inclusive range of bare eight-digit CEPs. */
export interface PostalCodeRange {
  from: string;
  to: string;
}

export interface DeliveryCoverageArea {
  neighborhoods: readonly string[];
  postalCodeRanges: readonly PostalCodeRange[];
  active: boolean;
}

/** What the visitor told us about where they are. Both sides are optional. */
export interface AddressQuery {
  neighborhood?: string;
  postalCode?: string;
}

const POSTAL_CODE = /^\d{8}$/;

/**
 * A range is usable when both ends are bare eight-digit CEPs in order.
 *
 * Same length everywhere is what lets the comparison below be lexicographic:
 * `'20720000' <= '20725000' <= '20729999'` is true as strings exactly because
 * no CEP is shorter than another. Storing `20720-000` in one row would break
 * that silently, so the shape is checked before anything is compared.
 */
export function isPostalCodeRange(range: PostalCodeRange): boolean {
  return POSTAL_CODE.test(range.from) && POSTAL_CODE.test(range.to) && range.from <= range.to;
}

/**
 * Answers "does this store deliver to this address?" — the rule the comparator
 * is built on (ADR-0004 #9, #12).
 *
 * It lives here, pure and unit-tested, instead of in SQL over the JSONB column:
 * the pilot has dozens of areas, the use case loads them all and filters in
 * memory, and the trigger to move it to the database is recorded in
 * SYSTEM_ARCHITECTURE (~200 active areas).
 *
 * Neighbourhood and CEP are alternatives, not conditions: a visitor who typed
 * only the neighbourhood is covered if the neighbourhood matches. An address
 * with neither is not covered by anything — the caller decides what "no
 * address" means, because on the comparator it means "show every store".
 */
export function areaCoversAddress(area: DeliveryCoverageArea, address: AddressQuery): boolean {
  if (!area.active) {
    return false;
  }

  return (
    coversNeighborhood(area, address.neighborhood) || coversPostalCode(area, address.postalCode)
  );
}

function coversNeighborhood(area: DeliveryCoverageArea, neighborhood?: string): boolean {
  if (!neighborhood?.trim()) {
    return false;
  }

  // Both sides folded the same way, so `meier` matches "Méier".
  const wanted = normalizeSearchText(neighborhood);

  return area.neighborhoods.some((covered) => normalizeSearchText(covered) === wanted);
}

function coversPostalCode(area: DeliveryCoverageArea, postalCode?: string): boolean {
  if (!postalCode?.trim()) {
    return false;
  }

  let digits: string;

  try {
    digits = normalizePostalCode(postalCode);
  } catch {
    // A malformed CEP covers nothing; the border contract rejects it before
    // reaching here, and a lookup is not the place to raise on user input.
    return false;
  }

  return area.postalCodeRanges.some(
    (range) => isPostalCodeRange(range) && range.from <= digits && digits <= range.to,
  );
}
