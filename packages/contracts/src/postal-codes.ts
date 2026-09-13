import { isPostalCode } from '@petdots/domain';
import { z } from 'zod';

/** Path param of `GET /api/v1/postal-codes/{postalCode}`. Accepts `20720-000` or bare digits. */
export const findPostalCodeParamsSchema = z.object({
  postalCode: z.string().max(9).refine(isPostalCode, 'CEP deve ter 8 dígitos.'),
});

/**
 * What a CEP resolves to — the street and the neighbourhood, so a form can fill
 * itself in.
 *
 * 🔴 `street` and `neighborhood` can be **empty strings**, and that is not a
 * failure. A "CEP único" covers a whole small town and names no street; the
 * shape has to say so, because a client that assumes they are filled would show
 * a blank field it believes is populated.
 *
 * `city` and `state` are carried even though `tutors` stores neither: they are
 * what lets the screen — and, later, the delivery-area check — say "esse CEP
 * não é do Rio" instead of silently accepting an address the pilot will never
 * reach.
 */
export const postalCodeAddressSchema = z.object({
  postalCode: z.string().describe('Oito dígitos, sem hífen.'),
  street: z.string().describe('Vazio quando o CEP não identifica um logradouro.'),
  neighborhood: z.string().describe('Vazio quando o CEP não identifica um bairro.'),
  city: z.string(),
  state: z.string().length(2).describe('UF.'),
});

export type FindPostalCodeParams = z.infer<typeof findPostalCodeParamsSchema>;
export type PostalCodeAddress = z.infer<typeof postalCodeAddressSchema>;
