import { isPostalCode, isPostalCodeRange } from '@petdots/domain';
import { z } from 'zod';

export const storeStatusSchema = z.enum(['PROSPECT', 'ONBOARDING', 'ACTIVE', 'PAUSED']);

/**
 * What the comparator shows about a store. The onboarding and PSP columns are
 * not here because they are not modelled yet — they arrive with J6/`payments`
 * (ADR-0010, A3).
 */
export const storeSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  neighborhood: z.string(),
});

/**
 * Stored as JSONB and parsed on the way out, never cast: a malformed range in
 * the database must raise, because silently dropping it would quietly shrink a
 * store's delivery area.
 */
export const postalCodeRangeSchema = z
  .object({
    from: z.string().regex(/^\d{8}$/, 'A faixa usa CEP de 8 dígitos, sem hífen.'),
    to: z.string().regex(/^\d{8}$/, 'A faixa usa CEP de 8 dígitos, sem hífen.'),
  })
  .refine(isPostalCodeRange, 'O início da faixa de CEP deve vir antes do fim.');

export const deliveryAreaSchema = z.object({
  id: z.uuid(),
  storeId: z.uuid(),
  label: z.string(),
  neighborhoods: z.array(z.string()).min(1),
  postalCodeRanges: z.array(postalCodeRangeSchema),
  deliveryFeeCents: z.number().int().min(0),
  estimatedMinutes: z.number().int().positive(),
  active: z.boolean(),
});

export const listDeliveryAreasQuerySchema = z.object({
  neighborhood: z.string().trim().max(80).optional(),
  postalCode: z.string().max(9).refine(isPostalCode, 'CEP deve ter 8 dígitos.').optional(),
});

export const deliveryAreaWithStoreSchema = deliveryAreaSchema.extend({
  store: storeSummarySchema,
});

/**
 * Not paginated: the universe is the number of pilot stores (dozens), and the
 * landing reads this once to fill the neighbourhood picker (ADR-0010, A10).
 */
export const deliveryAreaListSchema = z.object({
  items: z.array(deliveryAreaWithStoreSchema),
});

export type DeliveryArea = z.infer<typeof deliveryAreaSchema>;
export type DeliveryAreaList = z.infer<typeof deliveryAreaListSchema>;
export type DeliveryAreaWithStore = z.infer<typeof deliveryAreaWithStoreSchema>;
export type ListDeliveryAreasQuery = z.infer<typeof listDeliveryAreasQuerySchema>;
export type PostalCodeRangeContract = z.infer<typeof postalCodeRangeSchema>;
export type StoreStatus = z.infer<typeof storeStatusSchema>;
export type StoreSummary = z.infer<typeof storeSummarySchema>;
