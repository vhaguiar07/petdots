import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddressesService } from './addresses.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GeocodingService } from '../../common/geocoding/geocoding.service';

describe('AddressesService', () => {
  let service: AddressesService;
  let prisma: { address: Record<string, jest.Mock> };
  let geocodingService: { geocodeAddress: jest.Mock };

  const baseAddress = {
    street: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01001-000',
  };

  beforeEach(async () => {
    prisma = {
      address: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };
    geocodingService = { geocodeAddress: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeocodingService, useValue: geocodingService },
      ],
    }).compile();

    service = module.get(AddressesService);
  });

  describe('create', () => {
    it('geocodes the address when latitude/longitude are not provided', async () => {
      geocodingService.geocodeAddress.mockResolvedValue({ latitude: -23.55, longitude: -46.63 });
      prisma.address.create.mockResolvedValue({ id: 'addr-1', userId: 'user-1', ...baseAddress });

      const result = await service.create('user-1', baseAddress);

      expect(geocodingService.geocodeAddress).toHaveBeenCalledWith(baseAddress);
      expect(result).toEqual({ id: 'addr-1', userId: 'user-1', ...baseAddress });
      expect(prisma.address.create).toHaveBeenCalledWith({
        data: { ...baseAddress, userId: 'user-1', latitude: -23.55, longitude: -46.63 },
      });
    });

    it('does not geocode when latitude/longitude are already provided', async () => {
      prisma.address.create.mockResolvedValue({ id: 'addr-1' });

      await service.create('user-1', { ...baseAddress, latitude: 1, longitude: 2 });

      expect(geocodingService.geocodeAddress).not.toHaveBeenCalled();
      expect(prisma.address.create).toHaveBeenCalledWith({
        data: { ...baseAddress, latitude: 1, longitude: 2, userId: 'user-1' },
      });
    });

    it('unsets previous default address when isDefault is true', async () => {
      prisma.address.create.mockResolvedValue({ id: 'addr-1' });
      geocodingService.geocodeAddress.mockResolvedValue(null);

      await service.create('user-1', { ...baseAddress, isDefault: true });

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('update', () => {
    it('re-geocodes when an address field changes and no coordinates are provided', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', userId: 'user-1', ...baseAddress });
      geocodingService.geocodeAddress.mockResolvedValue({ latitude: 1, longitude: 2 });
      prisma.address.update.mockResolvedValue({ id: 'addr-1' });

      await service.update('addr-1', 'user-1', { number: '456' });

      expect(geocodingService.geocodeAddress).toHaveBeenCalledWith({ ...baseAddress, number: '456' });
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: { number: '456', latitude: 1, longitude: 2 },
      });
    });

    it('does not re-geocode when coordinates are explicitly provided', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', userId: 'user-1', ...baseAddress });
      prisma.address.update.mockResolvedValue({ id: 'addr-1' });

      await service.update('addr-1', 'user-1', { number: '456', latitude: 9, longitude: 8 });

      expect(geocodingService.geocodeAddress).not.toHaveBeenCalled();
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: { number: '456', latitude: 9, longitude: 8 },
      });
    });

    it('does not re-geocode when no address field changes', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', userId: 'user-1', ...baseAddress });
      prisma.address.update.mockResolvedValue({ id: 'addr-1' });

      await service.update('addr-1', 'user-1', { label: 'Casa' });

      expect(geocodingService.geocodeAddress).not.toHaveBeenCalled();
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: { label: 'Casa' },
      });
    });
  });

  describe('findOwned', () => {
    it('throws NotFoundException if address does not exist', async () => {
      prisma.address.findUnique.mockResolvedValue(null);

      await expect(service.findOwned('addr-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if address belongs to another user', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', userId: 'user-2' });

      await expect(service.findOwned('addr-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('returns the address when owned by the requester', async () => {
      const address = { id: 'addr-1', userId: 'user-1', ...baseAddress };
      prisma.address.findUnique.mockResolvedValue(address);

      await expect(service.findOwned('addr-1', 'user-1')).resolves.toEqual(address);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException if address belongs to another user', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', userId: 'user-2' });

      await expect(service.remove('addr-1', 'user-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.address.delete).not.toHaveBeenCalled();
    });

    it('deletes the address when owned by the requester', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', userId: 'user-1' });

      await service.remove('addr-1', 'user-1');

      expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: 'addr-1' } });
    });
  });
});
