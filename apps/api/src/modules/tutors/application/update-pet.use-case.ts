import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Pet, UpdatePet } from '@petdots/contracts';
import { assertPetWeightIsPlausible } from '@petdots/domain';

import { type IPetRepository, PET_REPOSITORY } from '../domain/ipet.repository.js';
import { PetNotFoundError } from '../domain/pet-not-found.error.js';
import { ResolveTutor } from './resolve-tutor.js';
import { toPetContract } from './tutor-profile.js';

@Injectable()
export class UpdatePetUseCase {
  private readonly logger = new Logger(UpdatePetUseCase.name);

  constructor(
    @Inject(PET_REPOSITORY)
    private readonly pets: IPetRepository,
    private readonly resolveTutor: ResolveTutor,
  ) {}

  async execute(userId: string, petId: string, changes: UpdatePet): Promise<Pet> {
    const tutorId = await this.resolveTutor.forUser(userId);

    if (changes.weightGrams !== undefined) {
      assertPetWeightIsPlausible(changes.weightGrams);
    }

    const pet = await this.pets.updateForTutor(petId, tutorId, changes);

    // `null` covers both "no such pet" and "not this tutor's" — one answer, on
    // purpose (see `PetNotFoundError`).
    if (!pet) {
      throw new PetNotFoundError(petId);
    }

    this.logger.log(`pet updated (petId=${pet.id}, tutorId=${tutorId})`);

    return toPetContract(pet);
  }
}
