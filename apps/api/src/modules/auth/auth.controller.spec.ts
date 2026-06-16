import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let usersService: jest.Mocked<UsersService>;

  const currentUser = { id: 'user-1', email: 'jane@example.com', role: UserRole.CUSTOMER };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: UsersService, useValue: { findProfile: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AuthController);
    usersService = module.get(UsersService);
  });

  describe('me', () => {
    it('returns the authenticated user profile', async () => {
      const profile = { id: 'user-1', email: 'jane@example.com', name: 'Jane Doe' };
      usersService.findProfile.mockResolvedValue(profile as never);

      await expect(controller.me(currentUser)).resolves.toEqual(profile);
      expect(usersService.findProfile).toHaveBeenCalledWith('user-1');
    });

    it('throws NotFoundException if the user no longer exists', async () => {
      usersService.findProfile.mockResolvedValue(null);

      await expect(controller.me(currentUser)).rejects.toThrow(NotFoundException);
    });
  });
});
