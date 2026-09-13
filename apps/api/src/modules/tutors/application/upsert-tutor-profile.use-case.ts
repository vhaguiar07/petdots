import { Inject, Injectable, Logger } from '@nestjs/common';
import type { TutorProfile, UpsertTutorProfile } from '@petdots/contracts';
import { normalizePostalCode } from '@petdots/domain';

import { UpdateUserPhoneUseCase } from '../../identity/application/update-user-phone.use-case.js';
import { type ITutorRepository, TUTOR_REPOSITORY } from '../domain/itutor.repository.js';
import { toTutorProfile } from './tutor-profile.js';

/**
 * Saves the tutor's profile — creating it the first time, replacing it after.
 *
 * One use case for both because a singleton has no second state: the screen is
 * the same form whether it opens empty or filled, and a `POST` repeated on a
 * phone with bad signal would answer `409` where a `PUT` simply answers the
 * same thing twice (ADR-0015, A9).
 *
 * ⚠️ **Two tables of two modules, and no shared transaction.** The profile goes
 * to `tutors` and the phone to `users`, through `identity` — this module may not
 * write that table itself (CODING_STANDARDS). If the second write fails, the
 * profile is saved and the phone is the old one. That is accepted rather than
 * solved: the operation is idempotent, so repeating it corrects the state, and a
 * distributed transaction across two modules would buy consistency at the price
 * of the boundary that keeps them apart (ADR-0015, R2). The tutor is written
 * first because it is the row the rest of the profile hangs off.
 *
 * **No domain event is emitted.** `tutor.created` is in the DOMAIN_MODEL and
 * has no bus and no consumer; publishing into nothing is infrastructure written
 * ahead of its use (same call as pd-09 and pd-12).
 */
@Injectable()
export class UpsertTutorProfileUseCase {
  private readonly logger = new Logger(UpsertTutorProfileUseCase.name);

  constructor(
    @Inject(TUTOR_REPOSITORY)
    private readonly tutors: ITutorRepository,
    private readonly updateUserPhone: UpdateUserPhoneUseCase,
  ) {}

  async execute(userId: string, input: UpsertTutorProfile): Promise<TutorProfile> {
    const tutor = await this.tutors.upsertByUserId(userId, {
      name: input.name,
      address: {
        street: input.address.street,
        number: input.address.number,
        // `null` and not `undefined`: the column is nullable, and the contract
        // gives the field back as `string | null`.
        complement: input.address.complement ?? null,
        neighborhood: input.address.neighborhood,
        // Eight bare digits, so `20720-000` and `20720000` are one address —
        // the same normalisation the delivery areas are matched against.
        postalCode: normalizePostalCode(input.address.postalCode),
        reference: input.address.reference ?? null,
      },
    });

    const phone = await this.updateUserPhone.execute(userId, input.phone);

    // 🔴 Ids only. This is the first time the API writes the personal data of a
    // person outside the team, and the name, the phone and the street are
    // exactly what NAMING_CONVENTIONS §Logs forbids here.
    this.logger.log(`tutor profile saved (tutorId=${tutor.id}, userId=${userId})`);

    return toTutorProfile(tutor, phone);
  }
}
