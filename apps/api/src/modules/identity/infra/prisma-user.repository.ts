import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User as UserRow } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service.js';
import { EmailAlreadyRegisteredError } from '../domain/email-already-registered.error.js';
import type { IUserRepository } from '../domain/iuser.repository.js';
import type { NewUser, User } from '../domain/user.js';

/** Prisma's code for a unique constraint violation. */
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lets the unique index decide, instead of reading before writing: two people
   * registering the same address at the same instant would both pass a prior
   * read, and only the constraint is atomic — the same reasoning as the
   * waitlist (pd-09).
   */
  async create(user: NewUser): Promise<User> {
    try {
      return toUser(await this.prisma.user.create({ data: user }));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new EmailAlreadyRegisteredError();
      }

      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });

    return row ? toUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });

    return row ? toUser(row) : null;
  }
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    passwordHash: row.passwordHash,
    roles: row.roles,
    createdAt: row.createdAt,
  };
}
