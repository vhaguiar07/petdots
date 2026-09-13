import { isPostalCode } from '@petdots/domain';
import { z } from 'zod';

import { findStoreParamsSchema, openingHoursSchema, storeSummarySchema } from './stores.js';

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
  /**
   * A loja da linha, **com a agenda semanal**.
   *
   * 🔴 `openingHours` entra aqui na pd-16 para a tela poder dizer "Fechada ·
   * abre segunda às 08:00" sem uma segunda requisição por loja. O que vai é a
   * **agenda crua**, e não um `openNow` já resolvido, por uma razão concreta:
   * um booleano calculado no servidor envelhece — diria "aberta" às 3h numa
   * página aberta há uma hora, e na landing, que é renderizada no servidor,
   * ficaria errado já no HTML. O cliente avalia contra o relógio dele, com as
   * **mesmas funções puras** de `packages/domain` que o servidor usa para
   * recusar um pedido fora de hora.
   *
   * ⚠️ Isto **não** esconde loja fechada da listagem: horário governa o
   * **pedido**, nunca a vitrine (ADR-0010, A12). O que esconde continua sendo
   * só `PAUSED`.
   */
  store: storeSummarySchema.extend({ openingHours: openingHoursSchema }),
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
  /**
   * Whether it is on the shelf today.
   *
   * Added in pd-16 for the store panel, which needs to show what the shop has
   * switched off. On the public shopfront it is always `true` — that route
   * lists available offers and nothing else — so the field is additive there,
   * and the comparator keeps filtering before it ranks.
   */
  available: z.boolean(),
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

/**
 * Query of `GET /stores/{storeId}/offers`.
 *
 * `?unavailable=true` asks for the **whole** shelf, switched-off rows included
 * — which is what the store panel lists. The parameter is on the public route on
 * purpose: an unavailable offer is not a secret, it is the shop saying "não
 * tenho". Without the parameter nothing changes, so the shopfront and the
 * comparator are untouched.
 *
 * A literal rather than a boolean coercion: the query string of the OpenAPI
 * document stays a string, the input and output types stay identical (the rule
 * pd-09 A11 fixed for `/delivery-areas`), and `?unavailable=0` is a `422`
 * instead of a silent `false`.
 */
export const listStoreOffersQuerySchema = z.object({
  unavailable: z.literal('true').optional(),
});

/** Path params of one offer of one store — `/stores/{storeId}/offers/{offerId}`. */
export const storeOfferParamsSchema = findStoreParamsSchema.extend({
  offerId: z.uuid('Oferta inválida.'),
});

/**
 * Body of `PUT /stores/{storeId}/offers/{offerId}/price` — the `OWNER`'s
 * decision, and the one the comparator ranks on (ADR-0013 §permissões).
 *
 * Positive, never zero: a free product is not a price, it is a bug in a form,
 * and the `offers_price_cents_check` would refuse the row anyway with an error
 * nobody can read.
 */
export const updateOfferPriceSchema = z.object({
  priceCents: z.int().positive('Informe um preço em centavos.'),
});

/**
 * Body of `PUT /stores/{storeId}/offers/{offerId}/availability` — "tenho" and
 * "não tenho", which **either** role may say (ADR-0013 §permissões: stock is the
 * counter's business, price is the owner's).
 */
export const updateOfferAvailabilitySchema = z.object({
  available: z.boolean(),
});

/**
 * Body of `POST /stores/{storeId}/offers` — the store putting a catalogue
 * product on its shelf for the first time.
 *
 * The product comes from the shared catalogue by id: a store never invents a
 * product, which is what keeps the comparator comparing the same bag of food
 * across shops (DOMAIN_MODEL §Produto). A second offer over the same product is
 * a `409` — the unique pair `(store, product)` **is** the invariant "one price
 * per store per product".
 */
export const createStoreOfferSchema = z.object({
  productId: z.uuid('Produto inválido.'),
  priceCents: z.int().positive('Informe um preço em centavos.'),
  available: z.boolean().default(true),
});

export type ComparedOffer = z.infer<typeof comparedOfferSchema>;
export type ComparedOfferList = z.infer<typeof comparedOfferListSchema>;
export type CompareOffersQuery = z.infer<typeof compareOffersQuerySchema>;
export type CreateStoreOffer = z.infer<typeof createStoreOfferSchema>;
export type ListStoreOffersQuery = z.infer<typeof listStoreOffersQuerySchema>;
export type StoreOffer = z.infer<typeof storeOfferSchema>;
export type StoreOfferList = z.infer<typeof storeOfferListSchema>;
export type StoreOfferParams = z.infer<typeof storeOfferParamsSchema>;
export type UpdateOfferAvailability = z.infer<typeof updateOfferAvailabilitySchema>;
export type UpdateOfferPrice = z.infer<typeof updateOfferPriceSchema>;
