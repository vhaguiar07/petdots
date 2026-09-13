import type { PetSpecies } from '@petdots/contracts';

/**
 * A tutor's animal (DOMAIN_MODEL §Pet).
 *
 * `birthDate` is a `YYYY-MM-DD` string, not a `Date`: a birth date is a
 * calendar day and not an instant, and the moment it becomes a `Date` somebody
 * reads it in local time and gets the day before (R1). Only the Prisma
 * repository converts, once, at UTC midnight.
 */
export interface Pet {
  /** The **Pet ID**, immutable (DOMAIN_MODEL §Pet). */
  id: string;
  tutorId: string;
  name: string;
  species: PetSpecies;
  birthDate: string | null;
  weightGrams: number;
  createdAt: Date;
  updatedAt: Date;
}

export type NewPet = Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>;

export type PetChanges = Partial<Pick<Pet, 'name' | 'species' | 'birthDate' | 'weightGrams'>>;
