import { Inject, Injectable } from '@nestjs/common';
import type { TutorProfile } from '@petdots/contracts';

import { FindAuthenticatedUserUseCase } from '../../identity/application/find-authenticated-user.use-case.js';
import { type ITutorRepository, TUTOR_REPOSITORY } from '../domain/itutor.repository.js';
import { TutorProfileNotFoundError } from '../domain/tutor-profile-not-found.error.js';
import { toTutorProfile } from './tutor-profile.js';

/**
 * The caller's own profile, or `TutorProfileNotFoundError`.
 *
 * The phone is read through `identity` rather than from a column here: it
 * belongs to the identity, and this module never touches the `users` table
 * (ADR-0015, A4).
 */
@Injectable()
export class FindTutorProfileUseCase {
  constructor(
    @Inject(TUTOR_REPOSITORY)
    private readonly tutors: ITutorRepository,
    private readonly findAuthenticatedUser: FindAuthenticatedUserUseCase,
  ) {}

  async execute(userId: string): Promise<TutorProfile> {
    const tutor = await this.tutors.findByUserId(userId);

    if (!tutor) {
      throw new TutorProfileNotFoundError(userId);
    }

    const user = await this.findAuthenticatedUser.execute(userId);

    return toTutorProfile(tutor, user.phone);
  }
}
