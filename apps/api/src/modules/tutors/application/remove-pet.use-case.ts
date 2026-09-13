import { Inject, Injectable, Logger } from '@nestjs/common';

import { type IPetRepository, PET_REPOSITORY } from '../domain/ipet.repository.js';
import { PetNotFoundError } from '../domain/pet-not-found.error.js';
import { ResolveTutor } from './resolve-tutor.js';

/**
 * Deletes the pet, for real.
 *
 * Physical deletion because nothing references `pets` yet. When
 * `replenishment_schedules` arrives (capacidade 9) the choice between cascade
 * and soft-delete has to be made with a schedule in hand — soft-deleting today
 * would mean carrying a `deleted_at` through every query for a case that does
 * not exist (ADR-0015, A5; watched in the backlog).
 */
@Injectable()
export class RemovePetUseCase {
  private readonly logger = new Logger(RemovePetUseCase.name);

  constructor(
    @Inject(PET_REPOSITORY)
    private readonly pets: IPetRepository,
    private readonly resolveTutor: ResolveTutor,
  ) {}

  async execute(userId: string, petId: string): Promise<void> {
    const tutorId = await this.resolveTutor.forUser(userId);

    if (!(await this.pets.deleteForTutor(petId, tutorId))) {
      // Deleting twice answers 404 the second time. Unlike the logout case,
      // there is nothing to hide from the owner: they know they deleted it.
      throw new PetNotFoundError(petId);
    }

    this.logger.log(`pet removed (petId=${petId}, tutorId=${tutorId})`);
  }
}
