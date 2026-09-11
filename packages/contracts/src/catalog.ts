import { z } from 'zod';

import { pageQuerySchema, paginatedSchema } from './pagination.js';

/**
 * The category drives the commission (ADR-0003), so it is a domain attribute
 * and not a shelf label — which is why it is a closed enum here.
 */
export const productCategorySchema = z.enum([
  'FOOD_STANDARD',
  'FOOD_PREMIUM',
  'TREAT',
  'HYGIENE',
  'HEALTH_OTC',
  'ACCESSORY',
]);

export const productSchema = z.object({
  id: z.uuid(),
  slug: z.string().describe('Identificador público na URL: /precos/{slug}.'),
  ean: z
    .string()
    .nullable()
    .describe('Único quando existir; nulo é produto de curadoria manual (DOMAIN_MODEL).'),
  name: z.string(),
  brand: z.string(),
  category: productCategorySchema,
  variant: z.string().describe('Apresentação: "15 kg", "500 g", "30 unidades".'),
  netWeightGrams: z.number().int().positive(),
  imageUrl: z.url().nullable(),
  requiresPrescription: z.boolean(),
  active: z.boolean(),
});

/**
 * Query of GET /api/v1/products. `q` is the free search; `slug` is the lookup
 * by public identifier, which is how the landing resolves `/precos/{slug}`
 * without a second route.
 */
export const listProductsQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(80, 'A busca aceita até 80 caracteres.').optional(),
  slug: z.string().max(160).optional(),
});

/** Path params of GET /api/v1/products/{productId}. */
export const findProductParamsSchema = z.object({
  productId: z.uuid('Produto inválido.'),
});

export const productListSchema = paginatedSchema(productSchema);

export type FindProductParams = z.infer<typeof findProductParamsSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductCategory = z.infer<typeof productCategorySchema>;
export type ProductList = z.infer<typeof productListSchema>;
