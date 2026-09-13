import { Injectable, Inject } from '@nestjs/common';

import { type ITutorRepository, TUTOR_REPOSITORY } from '../domain/itutor.repository.js';
import { TutorProfileNotFoundError } from '../domain/tutor-profile-not-found.error.js';

/**
 * The `tutors.id` behind a `users.id`, or `TutorProfileNotFoundError`.
 *
 * Every pet use case starts here, and none of them takes a `tutorId` from the
 * request: the caller only ever proves who they are, and the tutor is derived
 * server-side. That is what makes "pets of the tutor making the request" the
 * only reachable set — an id in the URL would be an id somebody can change
 * (AUTHENTICATION: ownership "deriva em tempo de requisição").
 */
@Injectable()
export class ResolveTutor {
  constructor(
    @Inject(TUTOR_REPOSITORY)
    private readonly tutors: ITutorRepository,
  ) {}

  async forUser(userId: string): Promise<string> {
    const tutor = await this.tutors.findByUserId(userId);

    if (!tutor) {
      throw new TutorProfileNotFoundError(userId);
    }

    return tutor.id;
  }
}
