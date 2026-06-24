import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertPriceAlertDto } from './dto/upsert-price-alert.dto';

@Injectable()
export class PriceAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: UpsertPriceAlertDto) {
    return this.prisma.priceAlert.upsert({
      where: { userId_catalogProductId: { userId, catalogProductId: dto.catalogProductId } },
      create: { userId, catalogProductId: dto.catalogProductId, targetPrice: dto.targetPrice },
      update: { targetPrice: dto.targetPrice, isActive: true, notifiedAt: null },
      include: { catalogProduct: { select: { id: true, name: true } } },
    });
  }

  listMine(userId: string) {
    return this.prisma.priceAlert.findMany({
      where: { userId, isActive: true },
      include: { catalogProduct: { include: { images: true, brand: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const alert = await this.prisma.priceAlert.findUnique({ where: { id } });
    if (!alert || alert.userId !== userId) throw new NotFoundException('Alerta não encontrado');
    await this.prisma.priceAlert.delete({ where: { id } });
  }

  /**
   * Called after a StoreProduct price update.
   * Marks alerts as notified when any store now sells below the target price.
   */
  async checkAlerts(catalogProductId: string, newPrice: number) {
    const triggered = await this.prisma.priceAlert.findMany({
      where: {
        catalogProductId,
        isActive: true,
        notifiedAt: null,
        targetPrice: { gte: newPrice },
      },
    });

    if (triggered.length === 0) return;

    await this.prisma.priceAlert.updateMany({
      where: { id: { in: triggered.map((a) => a.id) } },
      data: { notifiedAt: new Date() },
    });

    return triggered;
  }
}
