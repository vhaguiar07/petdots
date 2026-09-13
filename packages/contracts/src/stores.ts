import { isOpeningIntervalList, isPostalCode, isPostalCodeRange } from '@petdots/domain';
import { z } from 'zod';

export const storeStatusSchema = z.enum(['PROSPECT', 'ONBOARDING', 'ACTIVE', 'PAUSED']);

/**
 * One stretch of a weekday during which the store takes orders (ADR-0014, C2).
 *
 * `weekday` follows `Date.getDay()` — 0 is Sunday. `closes` also accepts
 * `24:00`, meaning end of day, which is the only way to express a store that is
 * open around the clock without leaving the last minute of every day shut.
 */
export const openingIntervalSchema = z.object({
  weekday: z.int().min(0, 'Dia da semana inválido.').max(6, 'Dia da semana inválido.'),
  opens: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário no formato HH:MM.'),
  closes: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d|24:00$/, 'Horário no formato HH:MM.'),
});

/**
 * The weekly schedule, parsed on the way out of the JSONB column and never
 * cast — the same rule `postalCodeRanges` follows.
 *
 * 🔴 An **empty list means the store never opens**, and therefore takes no
 * orders. Failing closed is deliberate: ADR-0014 C2 refuses the order before
 * anyone is charged, and a store with no schedule accepting an order at 3am is
 * exactly the problem the ADR exists to prevent.
 */
export const openingHoursSchema = z
  .array(openingIntervalSchema)
  .refine(isOpeningIntervalList, 'Faixas de horário inválidas ou sobrepostas.');

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

/**
 * One store's own page (`GET /stores/{storeId}`), which the client universal
 * reaches from the comparator.
 *
 * It carries `status` because the shopfront says whether the store is taking
 * orders, and the areas because "where do you deliver, and for how much" is the
 * first question a visitor has — only the active ones, since a switched-off area
 * is not a promise the store is making (pd-13, A15).
 *
 * `openingHours` joins them in `pd-15`: the shopfront now says "Aberta agora" or
 * "Fechada · abre …", and the client answers that with the **same** pure
 * function the server uses to refuse an out-of-hours order.
 */
export const storeSchema = storeSummarySchema.extend({
  status: storeStatusSchema,
  deliveryAreas: z.array(deliveryAreaSchema),
  openingHours: openingHoursSchema,
});

/** Path params of GET /api/v1/stores/{storeId} and its sub-resources. */
export const findStoreParamsSchema = z.object({
  storeId: z.uuid('Loja inválida.'),
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
export type FindStoreParams = z.infer<typeof findStoreParamsSchema>;
export type ListDeliveryAreasQuery = z.infer<typeof listDeliveryAreasQuerySchema>;
export type OpeningHours = z.infer<typeof openingHoursSchema>;
export type OpeningIntervalContract = z.infer<typeof openingIntervalSchema>;
export type PostalCodeRangeContract = z.infer<typeof postalCodeRangeSchema>;
export type Store = z.infer<typeof storeSchema>;
export type StoreStatus = z.infer<typeof storeStatusSchema>;
export type StoreSummary = z.infer<typeof storeSummarySchema>;
