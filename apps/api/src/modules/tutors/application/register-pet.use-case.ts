import { Inject, Injectable, Logger } from '@nestjs/common';
import type { CreatePet, Pet } from '@petdots/contracts';
import { assertPetWeightIsPlausible } from '@petdots/domain';

import { type IPetRepository, PET_REPOSITORY } from '../domain/ipet.repository.js';
import { ResolveTutor } from './resolve-tutor.js';
import { toPetContract } from './tutor-profile.js';

/**
 * Registers a pet under the caller's profile.
 *
 * The pet hangs off the `Tutor`, not the `User`, so a caller with no profile
 * gets `TutorProfileNotFoundError` — the onboarding asks for the address first
 * for exactly this reason.
 *
 * **No domain event is emitted** (`pet.created`), same call and same reason as
 * `tutor.created`: no bus, no consumer.
 */
@Injectable()
export class RegisterPetUseCase {
  private readonly logger = new Logger(RegisterPetUseCase.name);

  constructor(
    @Inject(PET_REPOSITORY)
    private readonly pets: IPetRepository,
    private readonly resolveTutor: ResolveTutor,
  ) {}

  async execute(userId: string, input: CreatePet): Promise<Pet> {
    const tutorId = await this.resolveTutor.forUser(userId);

    // Re-checked here even though the contract already refused it at the
    // border, exactly as `register` re-checks the password policy: a rule that
    // only runs where somebody remembered to call it is not a rule.
    assertPetWeightIsPlausible(input.weightGrams);

    const pet = await this.pets.create({
      tutorId,
      name: input.name,
      species: input.species,
      birthDate: input.birthDate ?? null,
      weightGrams: input.weightGrams,
    });

    // 🔴 Ids only — the pet's name is the tutor's personal data too.
    this.logger.log(`pet registered (petId=${pet.id}, tutorId=${tutorId})`);

    return toPetContract(pet);
  }
}
