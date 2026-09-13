import {
  type CreatePet,
  petListSchema,
  petSchema,
  tutorProfileSchema,
  type UpdatePet,
  type UpsertTutorProfile,
} from '@petdots/contracts';

import { ApiError, type HttpClient } from './http';

/** Every call here is the caller's own data, so every one of them sends the token. */
const AUTHED = { auth: true } as const;

/**
 * The caller's profile, or `null` when they have not filled it in yet.
 *
 * 🔴 Only `TUTOR_NOT_FOUND` becomes `null`. Any other failure propagates: "no
 * profile yet" sends the person to the onboarding, while a 500 or an offline
 * network must reach a state that says something went wrong. Collapsing them
 * would show a brand-new-account screen to someone whose account is fine
 * (BUG-R01 is the same lesson).
 */
export function findMyProfile(http: HttpClient, signal?: AbortSignal) {
  return http
    .getJson('/tutors/me', undefined, { ...AUTHED, signal })
    .then((body) => tutorProfileSchema.parse(body))
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404 && error.code === 'TUTOR_NOT_FOUND') {
        return null;
      }

      throw error;
    });
}

/** Creates or replaces the profile — the route is an idempotent upsert. */
export function saveMyProfile(http: HttpClient, body: UpsertTutorProfile) {
  return http.putJson('/tutors/me', body, AUTHED).then((it) => tutorProfileSchema.parse(it));
}

export function listMyPets(http: HttpClient, signal?: AbortSignal) {
  return http
    .getJson('/tutors/me/pets', undefined, { ...AUTHED, signal })
    .then((body) => petListSchema.parse(body).items);
}

export function createPet(http: HttpClient, body: CreatePet) {
  return http.postJson('/tutors/me/pets', body, AUTHED).then((it) => petSchema.parse(it));
}

export function findPet(http: HttpClient, petId: string, signal?: AbortSignal) {
  return http
    .getJson(`/tutors/me/pets/${petId}`, undefined, { ...AUTHED, signal })
    .then((body) => petSchema.parse(body));
}

export function updatePet(http: HttpClient, petId: string, body: UpdatePet) {
  return http.patchJson(`/tutors/me/pets/${petId}`, body, AUTHED).then((it) => petSchema.parse(it));
}

/** `204`, so there is nothing to parse. */
export function removePet(http: HttpClient, petId: string): Promise<unknown> {
  return http.deleteJson(`/tutors/me/pets/${petId}`, AUTHED);
}
