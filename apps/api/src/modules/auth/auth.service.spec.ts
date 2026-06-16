import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let prisma: { refreshToken: Record<string, jest.Mock> };

  const baseUser = {
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane Doe',
    role: UserRole.CUSTOMER,
    isActive: true,
    passwordHash: '',
  };

  beforeEach(async () => {
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: prisma },
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: string) => {
              const values: Record<string, string> = {
                JWT_ACCESS_SECRET: 'access-secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_SECRET: 'refresh-secret',
                JWT_REFRESH_EXPIRES_IN: '30d',
              };
              return values[key] ?? defaultValue;
            },
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    usersService = module.get(UsersService);
  });

  describe('register', () => {
    it('throws ConflictException if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(baseUser as never);

      await expect(
        authService.register({
          email: baseUser.email,
          password: 'StrongP@ssw0rd',
          passwordConfirmation: 'StrongP@ssw0rd',
          name: baseUser.name,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes the password and issues tokens for a new user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(baseUser as never);

      const result = await authService.register({
        email: baseUser.email,
        password: 'StrongP@ssw0rd',
        passwordConfirmation: 'StrongP@ssw0rd',
        name: baseUser.name,
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: baseUser.email, name: baseUser.name }),
      );
      const createdHash = usersService.create.mock.calls[0][0].passwordHash;
      await expect(argon2.verify(createdHash, 'StrongP@ssw0rd')).resolves.toBe(true);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(baseUser.email);
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'unknown@example.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const passwordHash = await argon2.hash('CorrectPassword1');
      usersService.findByEmail.mockResolvedValue({ ...baseUser, passwordHash } as never);

      await expect(
        authService.login({ email: baseUser.email, password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens for valid credentials', async () => {
      const passwordHash = await argon2.hash('CorrectPassword1');
      usersService.findByEmail.mockResolvedValue({ ...baseUser, passwordHash } as never);

      const result = await authService.login({
        email: baseUser.email,
        password: 'CorrectPassword1',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('changePassword', () => {
    it('throws NotFoundException if user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        authService.changePassword('user-1', {
          currentPassword: 'CorrectPassword1',
          newPassword: 'NewStrongP@ssw0rd',
          newPasswordConfirmation: 'NewStrongP@ssw0rd',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnauthorizedException if current password is wrong', async () => {
      const passwordHash = await argon2.hash('CorrectPassword1');
      usersService.findById.mockResolvedValue({ ...baseUser, passwordHash } as never);

      await expect(
        authService.changePassword('user-1', {
          currentPassword: 'WrongPassword',
          newPassword: 'NewStrongP@ssw0rd',
          newPasswordConfirmation: 'NewStrongP@ssw0rd',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates the password hash when current password is correct', async () => {
      const passwordHash = await argon2.hash('CorrectPassword1');
      usersService.findById.mockResolvedValue({ ...baseUser, passwordHash } as never);

      await authService.changePassword('user-1', {
        currentPassword: 'CorrectPassword1',
        newPassword: 'NewStrongP@ssw0rd',
        newPasswordConfirmation: 'NewStrongP@ssw0rd',
      });

      expect(usersService.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ passwordHash: expect.any(String) }));
      const updatedHash = usersService.update.mock.calls[0][1].passwordHash as string;
      await expect(argon2.verify(updatedHash, 'NewStrongP@ssw0rd')).resolves.toBe(true);
    });
  });
});
