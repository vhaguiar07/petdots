import type { Tutor, TutorProfileInput } from './tutor.js';

/** Injection token for the port — the domain never names its adapter. */
export const TUTOR_REPOSITORY = Symbol('ITutorRepository');

export interface ITutorRepository {
  /** `null` while this identity has no profile. */
  findByUserId(userId: string): Promise<Tutor | null>;
  /**
   * Creates the profile or replaces its fields. Idempotent by `userId`, which
   * the unique index enforces — the repository does not read before writing.
   */
  upsertByUserId(userId: string, input: TutorProfileInput): Promise<Tutor>;
}
