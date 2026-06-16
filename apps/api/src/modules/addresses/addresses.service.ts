import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { GeocodingService } from '../../common/geocoding/geocoding.service';

const ADDRESS_FIELDS = ['street', 'number', 'neighborhood', 'city', 'state', 'zipCode'] as const;

@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    let coordinates: { latitude: number; longitude: number } | null = null;
    if (dto.latitude === undefined || dto.longitude === undefined) {
      coordinates = await this.geocodingService.geocodeAddress({
        street: dto.street,
        number: dto.number,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
      });
    }

    return this.prisma.address.create({
      data: {
        ...dto,
        userId,
        latitude: dto.latitude ?? coordinates?.latitude,
        longitude: dto.longitude ?? coordinates?.longitude,
      },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOwned(id: string, userId: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) {
      throw new NotFoundException('Endereço não encontrado');
    }
    if (address.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar este endereço');
    }
    return address;
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    const address = await this.findOwned(id, userId);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const addressChanged = ADDRESS_FIELDS.some((field) => dto[field] !== undefined);
    let coordinates: { latitude: number; longitude: number } | null = null;
    if (addressChanged && dto.latitude === undefined && dto.longitude === undefined) {
      coordinates = await this.geocodingService.geocodeAddress({
        street: dto.street ?? address.street,
        number: dto.number ?? address.number,
        neighborhood: dto.neighborhood ?? address.neighborhood,
        city: dto.city ?? address.city,
        state: dto.state ?? address.state,
        zipCode: dto.zipCode ?? address.zipCode,
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: {
        ...dto,
        ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOwned(id, userId);
    await this.prisma.address.delete({ where: { id } });
  }
}
