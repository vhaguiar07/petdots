import { Inject, Injectable } from '@nestjs/common';
import type { Pet } from '@petdots/contracts';

import { type IPetRepository, PET_REPOSITORY } from '../domain/ipet.repository.js';
import { PetNotFoundError } from '../domain/pet-not-found.error.js';
import { ResolveTutor } from './resolve-tutor.js';
import { toPetContract } from './tutor-profile.js';

@Injectable()
export class FindPetUseCase {
  constructor(
    @Inject(PET_REPOSITORY)
    private readonly pets: IPetRepository,
    private readonly resolveTutor: ResolveTutor,
  ) {}

  async execute(userId: string, petId: string): Promise<Pet> {
    const tutorId = await this.resolveTutor.forUser(userId);
    const pet = await this.pets.findByIdForTutor(petId, tutorId);

    if (!pet) {
      throw new PetNotFoundError(petId);
    }

    return toPetContract(pet);
  }
}
