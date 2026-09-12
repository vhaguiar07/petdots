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

/**
 * One line of a store's shopfront (`GET /stores/{storeId}/offers`).
 *
 * The mirror image of `comparedOfferSchema`: there the store repeats on every
 * row and the product is fixed, here the store is the page and the product is
 * what varies. Only the fields the shelf shows — the category and the weight
 * belong to the product page, not to a price list.
 */
export const storeOfferSchema = z.object({
  offerId: z.uuid(),
  priceCents: z.number().int().positive(),
  priceUpdatedAt: z.iso.datetime(),
  product: z.object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    brand: z.string(),
    variant: z.string(),
  }),
});

/**
 * Not paginated: the universe is one pilot store's catalogue, at most dozens
 * (API_GUIDELINES, same rule as the comparator).
 */
export const storeOfferListSchema = z.object({
  items: z.array(storeOfferSchema),
});

export type ComparedOffer = z.infer<typeof comparedOfferSchema>;
export type ComparedOfferList = z.infer<typeof comparedOfferListSchema>;
export type CompareOffersQuery = z.infer<typeof compareOffersQuerySchema>;
export type StoreOffer = z.infer<typeof storeOfferSchema>;
export type StoreOfferList = z.infer<typeof storeOfferListSchema>;
