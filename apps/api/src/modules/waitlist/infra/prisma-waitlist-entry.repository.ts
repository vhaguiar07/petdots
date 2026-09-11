import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type { IWaitlistEntryRepository } from '../domain/iwaitlist-entry.repository.js';
import { WaitlistEntryAlreadyExistsError } from '../domain/waitlist-entry-already-exists.error.js';
import type { NewWaitlistEntry, WaitlistEntry } from '../domain/waitlist-entry.js';

/** Prisma's code for a unique constraint violation. */
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class PrismaWaitlistEntryRepository implements IWaitlistEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lets the unique index decide, instead of reading before writing: two
   * visitors submitting the same phone at the same instant would both pass a
   * prior read, and only the constraint is atomic.
   */
  async create(entry: NewWaitlistEntry): Promise<WaitlistEntry> {
    try {
      const created = await this.prisma.waitlistEntry.create({ data: entry });

      return {
        id: created.id,
        name: created.name,
        phone: created.phone,
        neighborhood: created.neighborhood,
        postalCode: created.postalCode,
        petFoodDeclared: created.petFoodDeclared,
        source: created.source,
        consentAt: created.consentAt,
        createdAt: created.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new WaitlistEntryAlreadyExistsError();
      }

      throw error;
    }
  }
}
