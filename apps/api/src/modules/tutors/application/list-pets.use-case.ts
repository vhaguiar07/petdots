import { Inject, Injectable } from '@nestjs/common';
import type { PetList } from '@petdots/contracts';

import { type IPetRepository, PET_REPOSITORY } from '../domain/ipet.repository.js';
import { ResolveTutor } from './resolve-tutor.js';
import { toPetContract } from './tutor-profile.js';

@Injectable()
export class ListPetsUseCase {
  constructor(
    @Inject(PET_REPOSITORY)
    private readonly pets: IPetRepository,
    private readonly resolveTutor: ResolveTutor,
  ) {}

  async execute(userId: string): Promise<PetList> {
    const tutorId = await this.resolveTutor.forUser(userId);

    return { items: (await this.pets.listByTutor(tutorId)).map(toPetContract) };
  }
}
