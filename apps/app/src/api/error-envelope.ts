import { z } from 'zod';

/**
 * The error envelope every failure of the API produces (ERROR_MODEL).
 *
 * It lives here and not in `@petdots/contracts` on purpose: the published
 * OpenAPI does not declare error bodies, so putting this schema in `contracts`
 * would create a contract the contract test does not police — a promise with no
 * enforcement is worse than a local schema (ADR-0012, A16). It moves to
 * `contracts` the day the landing starts reading `code` too.
 */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ field: z.string(), message: z.string() })).default([]),
    requestId: z.string().optional(),
  }),
});

export type ErrorDetail = { field: string; message: string };

/** The envelope, or `null` when the body is not one — a proxy's HTML 502, say. */
export function parseErrorEnvelope(body: unknown): z.infer<typeof errorEnvelopeSchema> | null {
  const parsed = errorEnvelopeSchema.safeParse(body);

  return parsed.success ? parsed.data : null;
}
