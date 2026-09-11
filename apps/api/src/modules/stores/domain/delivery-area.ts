import type { PostalCodeRange } from '@petdots/domain';

/**
 * A delivery area with its postal ranges already parsed — the JSONB column is
 * validated at the repository boundary, so nothing downstream handles a
 * `JsonValue`.
 */
export interface DeliveryArea {
  id: string;
  storeId: string;
  label: string;
  neighborhoods: string[];
  postalCodeRanges: PostalCodeRange[];
  deliveryFeeCents: number;
  estimatedMinutes: number;
  active: boolean;
}
