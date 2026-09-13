import type { NewPet, Pet, PetChanges } from './pet.js';

/** Injection token for the port — the domain never names its adapter. */
export const PET_REPOSITORY = Symbol('IPetRepository');

/**
 * 🔴 **Every read and every write carries `tutorId`.** Ownership is not a check
 * the use case performs before calling the repository — it is part of the query,
 * so there is no window in which a row belonging to somebody else is in hand and
 * merely not returned yet (SECURITY §Autorização; ADR-0015, A5).
 *
 * The methods that could touch another tutor's row answer `null`/`false`
 * instead of raising, and the use case turns that into `PET_NOT_FOUND` — the
 * same answer a pet that never existed gets.
 */
export interface IPetRepository {
  create(pet: NewPet): Promise<Pet>;
  /** Oldest first: the order the tutor registered them in is the one they expect. */
  listByTutor(tutorId: string): Promise<Pet[]>;
  findByIdForTutor(petId: string, tutorId: string): Promise<Pet | null>;
  /** `null` when the pet does not exist **or** is not this tutor's. */
  updateForTutor(petId: string, tutorId: string, changes: PetChanges): Promise<Pet | null>;
  /** `false` when the pet does not exist **or** is not this tutor's. */
  deleteForTutor(petId: string, tutorId: string): Promise<boolean>;
}
