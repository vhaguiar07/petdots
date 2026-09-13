import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Pet as PetRow } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type { IPetRepository } from '../domain/ipet.repository.js';
import type { NewPet, Pet, PetChanges } from '../domain/pet.js';

/** Prisma's code for "no row matched the `where`". */
const RECORD_NOT_FOUND = 'P2025';

/**
 * 🔴 `tutorId` is in the `where` of **every** statement below, including the
 * ones that already have a primary key.
 *
 * `{ id: petId }` alone would be correct SQL and a broken rule: it would find
 * any tutor's pet, and the guard against returning it would live in whichever
 * use case remembered. With the owner in the predicate, a pet that is not the
 * caller's simply does not match — which is also why the answer is `null`
 * rather than a row plus a permission error (ADR-0015, A5).
 */
@Injectable()
export class PrismaPetRepository implements IPetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(pet: NewPet): Promise<Pet> {
    return toPet(
      await this.prisma.pet.create({
        data: {
          tutorId: pet.tutorId,
          name: pet.name,
          species: pet.species,
          birthDate: toDateColumn(pet.birthDate),
          weightGrams: pet.weightGrams,
        },
      }),
    );
  }

  async listByTutor(tutorId: string): Promise<Pet[]> {
    const rows = await this.prisma.pet.findMany({
      where: { tutorId },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map(toPet);
  }

  async findByIdForTutor(petId: string, tutorId: string): Promise<Pet | null> {
    const row = await this.prisma.pet.findFirst({ where: { id: petId, tutorId } });

    return row ? toPet(row) : null;
  }

  async updateForTutor(petId: string, tutorId: string, changes: PetChanges): Promise<Pet | null> {
    try {
      // `updateMany` would answer a count and not the row; `update` with a
      // compound `where` is what keeps the ownership in the statement *and*
      // gives the updated pet back in one round trip.
      return toPet(
        await this.prisma.pet.update({
          where: { id: petId, tutorId },
          data: {
            ...(changes.name === undefined ? {} : { name: changes.name }),
            ...(changes.species === undefined ? {} : { species: changes.species }),
            ...(changes.birthDate === undefined
              ? {}
              : { birthDate: toDateColumn(changes.birthDate) }),
            ...(changes.weightGrams === undefined ? {} : { weightGrams: changes.weightGrams }),
          },
        }),
      );
    } catch (error) {
      if (isRecordNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async deleteForTutor(petId: string, tutorId: string): Promise<boolean> {
    try {
      await this.prisma.pet.delete({ where: { id: petId, tutorId } });

      return true;
    } catch (error) {
      if (isRecordNotFound(error)) {
        return false;
      }

      throw error;
    }
  }
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND;
}

/**
 * `YYYY-MM-DD` → the `@db.Date` column, pinned at **UTC** midnight.
 *
 * `new Date('2021-03-12')` already parses as UTC, but writing the time out
 * makes the intent unmissable: building the date any way that involves the
 * local zone would store 11/03 for every developer west of Greenwich (R1).
 */
function toDateColumn(iso: string | null): Date | null {
  return iso === null ? null : new Date(`${iso}T00:00:00.000Z`);
}

function toPet(row: PetRow): Pet {
  return {
    id: row.id,
    tutorId: row.tutorId,
    name: row.name,
    species: row.species,
    // 🔴 `toISOString().slice(0, 10)` and never `toLocaleDateString` or
    // `getDate()`: the column arrives as midnight UTC, and reading its parts in
    // UTC−3 gives the day before.
    birthDate: row.birthDate ? row.birthDate.toISOString().slice(0, 10) : null,
    weightGrams: row.weightGrams,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
