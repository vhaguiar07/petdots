import { Injectable } from '@nestjs/common';
import type { Tutor as TutorRow } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type { ITutorRepository } from '../domain/itutor.repository.js';
import type { Tutor, TutorProfileInput } from '../domain/tutor.js';

@Injectable()
export class PrismaTutorRepository implements ITutorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Tutor | null> {
    const row = await this.prisma.tutor.findUnique({ where: { userId } });

    return row ? toTutor(row) : null;
  }

  /**
   * One statement, not a read followed by a write: the unique index on
   * `user_id` is what decides, and two requests arriving together would both
   * pass a prior read and only one could win at the constraint — the same
   * reasoning the user repository follows.
   */
  async upsertByUserId(userId: string, input: TutorProfileInput): Promise<Tutor> {
    const columns = {
      name: input.name,
      street: input.address.street,
      streetNumber: input.address.number,
      complement: input.address.complement,
      neighborhood: input.address.neighborhood,
      postalCode: input.address.postalCode,
      reference: input.address.reference,
    };

    return toTutor(
      await this.prisma.tutor.upsert({
        where: { userId },
        create: { userId, ...columns },
        update: columns,
      }),
    );
  }
}

function toTutor(row: TutorRow): Tutor {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    address: {
      street: row.street,
      number: row.streetNumber,
      complement: row.complement,
      neighborhood: row.neighborhood,
      // `CHAR(8)` pads with spaces if anything ever writes fewer; the check
      // constraint refuses those rows, and trimming keeps a stored value from
      // silently failing a comparison against a normalised CEP.
      postalCode: row.postalCode.trim(),
      reference: row.reference,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
