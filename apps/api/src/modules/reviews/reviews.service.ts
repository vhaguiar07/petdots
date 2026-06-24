import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

const REVIEW_CUSTOMER_SELECT = {
  customer: { select: { id: true, name: true } },
} satisfies Prisma.ProductReviewInclude & Prisma.StoreReviewInclude;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Product reviews
  // ---------------------------------------------------------------------

  listProductReviews(storeProductId: string) {
    return this.prisma.productReview.findMany({
      where: { storeProductId },
      include: REVIEW_CUSTOMER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertProductReview(storeProductId: string, customerId: string, dto: CreateReviewDto) {
    const storeProduct = await this.prisma.storeProduct.findUnique({ where: { id: storeProductId } });
    if (!storeProduct) {
      throw new NotFoundException('Produto não encontrado');
    }

    const eligibleOrder = await this.prisma.order.findFirst({
      where: {
        customerId,
        status: OrderStatus.DELIVERED,
        items: { some: { storeProductId } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!eligibleOrder) {
      throw new ForbiddenException(
        'Você precisa ter recebido um pedido com este produto para avaliá-lo',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.productReview.upsert({
        where: { storeProductId_customerId: { storeProductId, customerId } },
        create: {
          storeProductId,
          customerId,
          orderId: eligibleOrder.id,
          rating: dto.rating,
          comment: dto.comment,
        },
        update: {
          rating: dto.rating,
          comment: dto.comment,
        },
        include: REVIEW_CUSTOMER_SELECT,
      });

      await this.recomputeProductRating(tx, storeProductId);

      return review;
    });
  }

  async deleteProductReview(storeProductId: string, customerId: string) {
    const review = await this.prisma.productReview.findUnique({
      where: { storeProductId_customerId: { storeProductId, customerId } },
    });
    if (!review) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productReview.delete({ where: { id: review.id } });
      await this.recomputeProductRating(tx, storeProductId);
    });
  }

  async replyToProductReview(
    storeProductId: string,
    reviewId: string,
    requesterId: string,
    requesterRole: UserRole,
    dto: ReplyReviewDto,
  ) {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
      include: { storeProduct: { include: { store: true } } },
    });
    if (!review || review.storeProductId !== storeProductId) {
      throw new NotFoundException('Avaliação não encontrada');
    }
    this.assertStoreOwnership(review.storeProduct.store.ownerId, requesterId, requesterRole);

    return this.prisma.productReview.update({
      where: { id: reviewId },
      data: { ownerReply: dto.reply, ownerRepliedAt: new Date() },
      include: REVIEW_CUSTOMER_SELECT,
    });
  }

  private async recomputeProductRating(tx: Prisma.TransactionClient, storeProductId: string) {
    const agg = await tx.productReview.aggregate({
      where: { storeProductId },
      _avg: { rating: true },
      _count: true,
    });

    await tx.storeProduct.update({
      where: { id: storeProductId },
      data: { avgRating: agg._avg?.rating ?? 0, reviewCount: agg._count },
    });
  }

  // ---------------------------------------------------------------------
  // Store reviews
  // ---------------------------------------------------------------------

  listStoreReviews(storeId: string) {
    return this.prisma.storeReview.findMany({
      where: { storeId },
      include: REVIEW_CUSTOMER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertStoreReview(storeId: string, customerId: string, dto: CreateReviewDto) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }

    const eligibleOrder = await this.prisma.order.findFirst({
      where: {
        customerId,
        storeId,
        status: OrderStatus.DELIVERED,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!eligibleOrder) {
      throw new ForbiddenException(
        'Você precisa ter recebido um pedido desta loja para avaliá-la',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.storeReview.upsert({
        where: { storeId_customerId: { storeId, customerId } },
        create: {
          storeId,
          customerId,
          orderId: eligibleOrder.id,
          rating: dto.rating,
          comment: dto.comment,
        },
        update: {
          rating: dto.rating,
          comment: dto.comment,
        },
        include: REVIEW_CUSTOMER_SELECT,
      });

      await this.recomputeStoreRating(tx, storeId);

      return review;
    });
  }

  async deleteStoreReview(storeId: string, customerId: string) {
    const review = await this.prisma.storeReview.findUnique({
      where: { storeId_customerId: { storeId, customerId } },
    });
    if (!review) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.storeReview.delete({ where: { id: review.id } });
      await this.recomputeStoreRating(tx, storeId);
    });
  }

  async replyToStoreReview(
    storeId: string,
    reviewId: string,
    requesterId: string,
    requesterRole: UserRole,
    dto: ReplyReviewDto,
  ) {
    const review = await this.prisma.storeReview.findUnique({
      where: { id: reviewId },
      include: { store: true },
    });
    if (!review || review.storeId !== storeId) {
      throw new NotFoundException('Avaliação não encontrada');
    }
    this.assertStoreOwnership(review.store.ownerId, requesterId, requesterRole);

    return this.prisma.storeReview.update({
      where: { id: reviewId },
      data: { ownerReply: dto.reply, ownerRepliedAt: new Date() },
      include: REVIEW_CUSTOMER_SELECT,
    });
  }

  private async recomputeStoreRating(tx: Prisma.TransactionClient, storeId: string) {
    const agg = await tx.storeReview.aggregate({
      where: { storeId },
      _avg: { rating: true },
      _count: true,
    });

    await tx.store.update({
      where: { id: storeId },
      data: { avgRating: agg._avg?.rating ?? 0, reviewCount: agg._count },
    });
  }

  private assertStoreOwnership(storeOwnerId: string, requesterId: string, requesterRole: UserRole) {
    if (storeOwnerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Você não tem permissão para responder a esta avaliação');
    }
  }
}
