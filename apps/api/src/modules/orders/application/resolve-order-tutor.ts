import { Injectable } from '@nestjs/common';

import { FindTutorProfileUseCase } from '../../tutors/application/find-tutor-profile.use-case.js';
import { TutorProfileNotFoundError } from '../../tutors/domain/tutor-profile-not-found.error.js';

/**
 * The `tutors.id` behind the caller, or `null` when they have no profile.
 *
 * Every read of an order starts here, and none of them takes a tutor id from
 * the request: the caller only ever proves who they are. That is what makes
 * "orders of the tutor making the request" the only reachable set — an id in
 * the URL would be an id somebody can change (the pattern `ResolveTutor` fixed
 * in pd-14).
 *
 * `null` rather than raising, because the two readers want different things
 * from the same fact: a listing answers with an empty list, a lookup answers
 * `404`.
 */
@Injectable()
export class ResolveOrderTutor {
  constructor(private readonly findTutorProfile: FindTutorProfileUseCase) {}

  async forUser(userId: string): Promise<string | null> {
    try {
      return (await this.findTutorProfile.execute(userId)).id;
    } catch (error) {
      if (error instanceof TutorProfileNotFoundError) {
        return null;
      }

      throw error;
    }
  }
}
