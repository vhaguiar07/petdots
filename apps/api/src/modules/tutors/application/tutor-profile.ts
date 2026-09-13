import type { Pet as PetContract, TutorProfile } from '@petdots/contracts';

import type { Pet } from '../domain/pet.js';
import type { Tutor } from '../domain/tutor.js';

/**
 * Domain row → contract, field by field.
 *
 * Never a spread: the same rule the session issuer follows (ADR-0011, C6). A
 * spread would carry `userId` into every profile response the day the shape
 * changes, and the tutor's response has no business naming the identity behind
 * it.
 */
export function toTutorProfile(tutor: Tutor, phone: string | null): TutorProfile {
  return {
    id: tutor.id,
    name: tutor.name,
    phone,
    address: {
      street: tutor.address.street,
      number: tutor.address.number,
      complement: tutor.address.complement,
      neighborhood: tutor.address.neighborhood,
      postalCode: tutor.address.postalCode,
      reference: tutor.address.reference,
    },
    createdAt: tutor.createdAt.toISOString(),
    updatedAt: tutor.updatedAt.toISOString(),
  };
}

/** Same rule: `tutorId` is the module's business, not the client's. */
export function toPetContract(pet: Pet): PetContract {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    birthDate: pet.birthDate,
    weightGrams: pet.weightGrams,
    createdAt: pet.createdAt.toISOString(),
    updatedAt: pet.updatedAt.toISOString(),
  };
}
