import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findProfile(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: PROFILE_SELECT });
  }

  create(data: { email: string; passwordHash: string; name: string; phone?: string; role?: UserRole }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role ?? UserRole.CUSTOMER,
      },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
