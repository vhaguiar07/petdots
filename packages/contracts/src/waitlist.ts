import { isBrazilianMobilePhone, isPostalCode } from '@petdots/domain';
import { z } from 'zod';

/**
 * Where the lead came from. The landing always sends `CAMPAIGN`;
 * `OUT_OF_AREA` (checkout outside the delivery area) and `STORE_QR` exist in
 * the model so the column never has to change when those flows arrive.
 */
export const waitlistSourceSchema = z.enum(['CAMPAIGN', 'OUT_OF_AREA', 'STORE_QR']);

/**
 * Body of POST /api/v1/waitlist-entries. Validation only — normalisation
 * (trim, digits, E.164) is the use case's job, so the OpenAPI input and output
 * types stay identical (pd-09, A11).
 *
 * The messages are in Portuguese on purpose: they travel to `details[].message`
 * of the ERROR_MODEL and the landing shows them to the visitor. Identifiers and
 * comments stay in English (NAMING_CONVENTIONS).
 */
export const createWaitlistEntrySchema = z.object({
  name: z.string().min(2, 'Informe seu nome.').max(120),
  phone: z
    .string()
    .max(20)
    .refine(isBrazilianMobilePhone, 'Informe um celular brasileiro com DDD.')
    .describe('Celular brasileiro com DDD; normalizado para E.164.'),
  neighborhood: z.string().min(2, 'Informe seu bairro.').max(80),
  postalCode: z
    .string()
    .max(9)
    .refine(isPostalCode, 'CEP deve ter 8 dígitos.')
    .describe('CEP de 8 dígitos, com ou sem hífen.'),
  petFoodDeclared: z.string().max(120).optional(),
  source: waitlistSourceSchema,
  consent: z.literal(true, 'É preciso aceitar o aviso de privacidade.'),
});

export const waitlistEntrySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string().describe('E.164, sempre +55 seguido de DDD e nove dígitos.'),
  neighborhood: z.string(),
  postalCode: z.string().describe('Oito dígitos, sem hífen.'),
  petFoodDeclared: z.string().nullable(),
  source: waitlistSourceSchema,
  consentAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

export type CreateWaitlistEntry = z.infer<typeof createWaitlistEntrySchema>;
export type WaitlistEntry = z.infer<typeof waitlistEntrySchema>;
export type WaitlistSource = z.infer<typeof waitlistSourceSchema>;
