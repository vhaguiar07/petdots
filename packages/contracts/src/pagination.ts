import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/**
 * The pagination of every collection endpoint (API_GUIDELINES v1.3).
 *
 * Offset, not cursor: the first collection the PetDots publishes is the product
 * search of the public comparator, and a search page with numbered links needs
 * to jump to page 4. Cursor solves the infinite feed, which does not exist
 * here — and the choice is reversible by adding a cursor form later, because
 * the response shape already carries `total`.
 *
 * `z.coerce` because query strings arrive as text: `?page=2` is `'2'`.
 */
export const pageQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('A página deve ser um número inteiro.')
    .min(1, 'A página começa em 1.')
    .default(1),
  pageSize: z.coerce
    .number()
    .int('O tamanho da página deve ser um número inteiro.')
    .min(1, 'O tamanho da página começa em 1.')
    .max(MAX_PAGE_SIZE, `O tamanho da página vai até ${String(MAX_PAGE_SIZE)}.`)
    .default(DEFAULT_PAGE_SIZE),
});

/** Envelope of a paginated collection: the items plus where the caller is. */
export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int().describe('Total de registros que atendem ao filtro.'),
  });

export type PageQuery = z.infer<typeof pageQuerySchema>;
