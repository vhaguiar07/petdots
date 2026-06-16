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

  listProductReviews(productId: string) {
    return this.prisma.productReview.findMany({
      where: { productId },
      include: REVIEW_CUSTOMER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertProductReview(productId: string, customerId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    const eligibleOrder = await this.prisma.order.findFirst({
      where: {
        customerId,
        status: OrderStatus.DELIVERED,
        items: { some: { productId } },
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
        where: { productId_customerId: { productId, customerId } },
        create: {
          productId,
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

      await this.recomputeProductRating(tx, productId);

      return review;
    });
  }

  async deleteProductReview(productId: string, customerId: string) {
    const review = await this.prisma.productReview.findUnique({
      where: { productId_customerId: { productId, customerId } },
    });
    if (!review) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productReview.delete({ where: { id: review.id } });
      await this.recomputeProductRating(tx, productId);
    });
  }

  async replyToProductReview(
    productId: string,
    reviewId: string,
    requesterId: string,
    requesterRole: UserRole,
    dto: ReplyReviewDto,
  ) {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
      include: { product: { include: { store: true } } },
    });
    if (!review || review.productId !== productId) {
      throw new NotFoundException('Avaliação não encontrada');
    }
    this.assertStoreOwnership(review.product.store.ownerId, requesterId, requesterRole);

    return this.prisma.productReview.update({
      where: { id: reviewId },
      data: { ownerReply: dto.reply, ownerRepliedAt: new Date() },
      include: REVIEW_CUSTOMER_SELECT,
    });
  }

  private async recomputeProductRating(tx: Prisma.TransactionClient, productId: string) {
    const agg = await tx.productReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });

    await tx.product.update({
      where: { id: productId },
      data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count },
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
      data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });
  }

  private assertStoreOwnership(storeOwnerId: string, requesterId: string, requesterRole: UserRole) {
    if (storeOwnerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Você não tem permissão para responder a esta avaliação');
    }
  }
}
