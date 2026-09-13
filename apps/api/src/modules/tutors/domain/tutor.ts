/**
 * The tutor's default address — a value object of the `Tutor` (DOMAIN_MODEL
 * §Tutor), stored as flat columns and never shared with another row.
 *
 * The two optional fields are `null` and not `undefined`: the column is
 * nullable, and "the tutor left it blank" is a fact worth being able to read
 * back, rather than a key that may or may not be on the object.
 */
export interface Address {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  postalCode: string;
  reference: string | null;
}

/**
 * The consumption profile of a `User`. One per identity — `userId` is unique,
 * which is what lets the profile route be a singleton (`/tutors/me`).
 *
 * `phone` is deliberately absent: it belongs to the identity, and this module
 * never reads the `users` table (ADR-0015, A4).
 */
export interface Tutor {
  id: string;
  userId: string;
  name: string;
  address: Address;
  createdAt: Date;
  updatedAt: Date;
}

/** What the use case hands the repository: everything but what the database owns. */
export type TutorProfileInput = Pick<Tutor, 'name' | 'address'>;
