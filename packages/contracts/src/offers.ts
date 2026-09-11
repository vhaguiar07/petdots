import { isPostalCode } from '@petdots/domain';
import { z } from 'zod';

import { storeSummarySchema } from './stores.js';

/**
 * Query of GET /api/v1/offers — the comparator itself (J2).
 *
 * The address is optional on purpose: without it the page still answers "who
 * sells this, and for how much", which is what a visitor arriving from a search
 * engine sees before typing anything.
 */
export const compareOffersQuerySchema = z.object({
  productId: z.uuid('Informe o produto.'),
  neighborhood: z.string().trim().max(80).optional(),
  postalCode: z.string().max(9).refine(isPostalCode, 'CEP deve ter 8 dígitos.').optional(),
});

export const comparedOfferSchema = z.object({
  offerId: z.uuid(),
  priceCents: z.number().int().positive(),
  priceUpdatedAt: z.iso.datetime(),
  store: storeSummarySchema,
  /** Null when no address was given: nobody knows which area would apply. */
  deliveryArea: z
    .object({
      label: z.string(),
      deliveryFeeCents: z.number().int().min(0),
      estimatedMinutes: z.number().int().positive(),
    })
    .nullable(),
  landedCents: z
    .number()
    .int()
    .nullable()
    .describe('Preço entregue (item + taxa). Nulo quando não há endereço.'),
});

export const comparedOfferListSchema = z.object({
  items: z.array(comparedOfferSchema),
});

export type ComparedOffer = z.infer<typeof comparedOfferSchema>;
export type ComparedOfferList = z.infer<typeof comparedOfferListSchema>;
export type CompareOffersQuery = z.infer<typeof compareOffersQuerySchema>;
