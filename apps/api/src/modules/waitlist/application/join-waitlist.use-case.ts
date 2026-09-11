import { Inject, Injectable } from '@nestjs/common';
import type { CreateWaitlistEntry } from '@petdots/contracts';
import { normalizeBrazilianMobilePhone, normalizePostalCode } from '@petdots/domain';

import {
  type IWaitlistEntryRepository,
  WAITLIST_ENTRY_REPOSITORY,
} from '../domain/iwaitlist-entry.repository.js';
import type { WaitlistEntry } from '../domain/waitlist-entry.js';

@Injectable()
export class JoinWaitlistUseCase {
  constructor(
    @Inject(WAITLIST_ENTRY_REPOSITORY)
    private readonly repository: IWaitlistEntryRepository,
  ) {}

  /**
   * Normalises the lead and stores it. The contract validated the shape at the
   * border; normalising here — not there — keeps the OpenAPI input and output
   * types identical (pd-09, A11).
   *
   * `consentAt` is stamped by the server, never sent by the client: it is the
   * proof of the legal basis for contacting this person later (LGPD, P2), and
   * proof the caller can choose is not proof.
   */
  async execute(input: CreateWaitlistEntry): Promise<WaitlistEntry> {
    const petFoodDeclared = input.petFoodDeclared?.trim();

    // `waitlist.joined` is not emitted yet: there is no in-process event bus
    // and no consumer, and infrastructure without a user is premature
    // (AGENTS.md). Tracked in BACKLOG under surveillance, trigger "first
    // in-process event consumer".
    return this.repository.create({
      name: input.name.trim(),
      phone: normalizeBrazilianMobilePhone(input.phone),
      neighborhood: input.neighborhood.trim(),
      postalCode: normalizePostalCode(input.postalCode),
      petFoodDeclared: petFoodDeclared ? petFoodDeclared : null,
      source: input.source,
      consentAt: new Date(),
    });
  }
}
