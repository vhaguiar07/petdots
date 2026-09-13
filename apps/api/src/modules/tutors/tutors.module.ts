import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module.js';
import { FindPetUseCase } from './application/find-pet.use-case.js';
import { FindTutorProfileUseCase } from './application/find-tutor-profile.use-case.js';
import { ListPetsUseCase } from './application/list-pets.use-case.js';
import { RegisterPetUseCase } from './application/register-pet.use-case.js';
import { RemovePetUseCase } from './application/remove-pet.use-case.js';
import { ResolveTutor } from './application/resolve-tutor.js';
import { UpdatePetUseCase } from './application/update-pet.use-case.js';
import { UpsertTutorProfileUseCase } from './application/upsert-tutor-profile.use-case.js';
import { PET_REPOSITORY } from './domain/ipet.repository.js';
import { TUTOR_REPOSITORY } from './domain/itutor.repository.js';
import { PrismaPetRepository } from './infra/prisma-pet.repository.js';
import { PrismaTutorRepository } from './infra/prisma-tutor.repository.js';
import { PetsController } from './pets.controller.js';
import { TutorsController } from './tutors.controller.js';

/**
 * Two controllers, one module: the profile and the pets are one aggregate
 * (DOMAIN_MODEL §Raiz `Tutor`), and a pet only exists under a tutor.
 *
 * `IdentityModule` is imported for the two use cases it exports — the phone
 * lives on `users`, and this module may not read or write that table itself
 * (CODING_STANDARDS; ADR-0015, A4).
 */
@Module({
  imports: [IdentityModule],
  controllers: [TutorsController, PetsController],
  providers: [
    FindTutorProfileUseCase,
    UpsertTutorProfileUseCase,
    RegisterPetUseCase,
    ListPetsUseCase,
    FindPetUseCase,
    UpdatePetUseCase,
    RemovePetUseCase,
    ResolveTutor,
    { provide: TUTOR_REPOSITORY, useClass: PrismaTutorRepository },
    { provide: PET_REPOSITORY, useClass: PrismaPetRepository },
  ],
})
export class TutorsModule {}
