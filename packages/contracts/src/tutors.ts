import {
  isBrazilianMobilePhone,
  isNotAfterToday,
  isPlausiblePetWeight,
  isPostalCode,
} from '@petdots/domain';
import { z } from 'zod';

/**
 * The two species the pilot serves (DOMAIN_MODEL §Pet). The message is in
 * Portuguese because it travels to `details[].message` and the screen shows it
 * next to the chips.
 */
export const petSpeciesSchema = z.enum(['DOG', 'CAT'], { error: 'Escolha cão ou gato.' });

/**
 * The tutor's default address, as typed.
 *
 * Flat fields rather than a child table or JSONB: the MVP has **one** address
 * per tutor (`MVP_SCOPE` #2), and `neighborhood`/`postalCode` are queried — the
 * comparator pre-fills from them today and delivery eligibility will read them
 * in `orders`. The order placed later stores its own snapshot, so address
 * history never needs a table (ADR-0015).
 *
 * Street and number are required alongside neighbourhood and CEP: "endereço
 * padrão" is where a delivery goes, and an address without a street delivers
 * nothing. Complement and reference are optional because plenty of addresses
 * have neither.
 */
export const addressInputSchema = z.object({
  street: z.string().trim().min(2, 'Informe a rua.').max(160),
  number: z.string().trim().min(1, 'Informe o número.').max(20).describe('Aceita "s/n".'),
  complement: z.string().trim().max(80).optional(),
  neighborhood: z.string().trim().min(2, 'Informe seu bairro.').max(80),
  postalCode: z.string().max(9).refine(isPostalCode, 'CEP deve ter 8 dígitos.'),
  reference: z.string().trim().max(160).optional(),
});

/**
 * Body of `PUT /api/v1/tutors/me`. Validation only — normalisation (eight bare
 * digits for the CEP, E.164 for the phone) is the use case's job, as everywhere
 * else since `pd-09`.
 */
export const upsertTutorProfileSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120),
  phone: z
    .string()
    .max(20)
    .refine(isBrazilianMobilePhone, 'Informe um celular brasileiro com DDD.')
    .describe('Celular com DDD; normalizado para E.164.'),
  address: addressInputSchema,
});

/** The address as the API gives it back: normalised, with the optionals settled. */
export const addressSchema = z.object({
  street: z.string(),
  number: z.string(),
  complement: z.string().nullable(),
  neighborhood: z.string(),
  postalCode: z.string().describe('Oito dígitos, sem hífen.'),
  reference: z.string().nullable(),
});

/**
 * The tutor profile. `phone` is read from `users` — it is the identity's, not
 * the profile's — and is `null` until someone saves the profile for the first
 * time.
 */
export const tutorProfileSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  address: addressSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/**
 * Body of `POST /api/v1/tutors/me/pets`.
 *
 * `birthDate` is optional because plenty of tutors do not know it — an adopted
 * adult dog arrives without papers — and refusing the pet over it would
 * contradict "poucas telas, pouco esforço" (`PERSONAS`). Capacidade 9 decides
 * whether the calculator requires it.
 *
 * `weightGrams` is an integer: money and weights are integers in this contract,
 * and the screen converts from the kilograms a scale shows
 * (`kilogramsToGrams`).
 */
export const createPetSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do pet.').max(60),
  species: petSpeciesSchema,
  birthDate: z.iso
    .date('Data inválida.')
    .refine((date) => isNotAfterToday(date), 'A data de nascimento não pode ser no futuro.')
    .nullable()
    .optional(),
  weightGrams: z
    .int('Informe o peso em gramas inteiros.')
    .refine(isPlausiblePetWeight, 'Informe um peso entre 0,1 kg e 120 kg.'),
});

/**
 * Body of `PATCH /api/v1/tutors/me/pets/{petId}`. Every field optional, but not
 * *all* of them at once: an empty body is a request that asks for nothing, and
 * answering `200` to it would hide a client that forgot to send the changes.
 */
export const updatePetSchema = createPetSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Informe ao menos um campo.');

export const petSchema = z.object({
  id: z.uuid().describe('O Pet ID, imutável (DOMAIN_MODEL §Pet).'),
  name: z.string(),
  species: petSpeciesSchema,
  birthDate: z.iso.date().nullable(),
  weightGrams: z.int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/**
 * Not paginated: one tutor has a handful of pets, and the limit is natural
 * (`API_GUIDELINES`, same reasoning as `/delivery-areas`).
 */
export const petListSchema = z.object({ items: z.array(petSchema) });

/** Path params of the pet sub-resource. */
export const findPetParamsSchema = z.object({
  petId: z.uuid('Pet inválido.'),
});

export type Address = z.infer<typeof addressSchema>;
export type AddressInput = z.infer<typeof addressInputSchema>;
export type CreatePet = z.infer<typeof createPetSchema>;
export type FindPetParams = z.infer<typeof findPetParamsSchema>;
export type Pet = z.infer<typeof petSchema>;
export type PetList = z.infer<typeof petListSchema>;
export type PetSpecies = z.infer<typeof petSpeciesSchema>;
export type TutorProfile = z.infer<typeof tutorProfileSchema>;
export type UpdatePet = z.infer<typeof updatePetSchema>;
export type UpsertTutorProfile = z.infer<typeof upsertTutorProfileSchema>;
