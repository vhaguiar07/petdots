import { Injectable } from '@nestjs/common';
import type { OrderStatus } from '@petdots/contracts';
import { Prisma } from '@prisma/client';
import type {
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  Prisma as PrismaTypes,
} from '@prisma/client';

import {
  asPrismaTransaction,
  type PersistenceContext,
  toPersistenceContext,
} from '../../../prisma/persistence-context.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { IOrderRepository, OrderSideEffects } from '../domain/iorder.repository.js';
import type { DeliveryAddressSnapshot, Order, OrderExit, OrderItem } from '../domain/order.js';
import { DuplicateIdempotencyKeyError, OrderCodeCollisionError } from '../domain/order-errors.js';

const UNIQUE_VIOLATION = 'P2002';

type OrderRow = PrismaOrder & { items: PrismaOrderItem[] };

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(order: Order, idempotencyKey: string): Promise<Order> {
    try {
      const row = await this.prisma.order.create({
        data: {
          // The ids come from the aggregate rather than from the column default,
          // so the object the domain validated and the row on disk are the same
          // order — which is what lets `transition` address a line by its id.
          id: order.id,
          code: order.code,
          tutorId: order.tutorId,
          storeId: order.storeId,
          status: order.status,
          acquisitionChannel: order.acquisitionChannel,
          idempotencyKey,
          contactName: order.contactName,
          contactPhone: order.contactPhone,
          // Rebuilt as a plain literal: an interface never satisfies Prisma's
          // `InputJsonValue`, the same reason the postal ranges are rebuilt.
          deliveryAddress: { ...order.deliveryAddress },
          itemsTotalCents: order.itemsTotalCents,
          deliveryFeeCents: order.deliveryFeeCents,
          serviceFeeCents: order.serviceFeeCents,
          totalCents: order.totalCents,
          commissionTotalCents: order.commissionTotalCents,
          placedAt: order.placedAt,
          acceptanceDeadlineAt: order.acceptanceDeadlineAt,
          items: {
            create: order.items.map((item) => ({
              id: item.id,
              productId: item.productId,
              offerId: item.offerId,
              productNameSnapshot: item.productNameSnapshot,
              productVariantSnapshot: item.productVariantSnapshot,
              categorySnapshot: item.categorySnapshot,
              unitPriceCents: item.unitPriceCents,
              quantity: item.quantity,
              commissionRateBpsSnapshot: item.commissionRateBpsSnapshot,
              commissionAmountCents: item.commissionAmountCents,
              fulfillment: item.fulfillment,
            })),
          },
        },
        include: { items: true },
      });

      return toOrder(row);
    } catch (error) {
      throw toCreationError(error, order.code, idempotencyKey);
    }
  }

  async findByIdempotencyKey(tutorId: string, idempotencyKey: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({
      where: { tutorId_idempotencyKey: { tutorId, idempotencyKey } },
      include: { items: true },
    });

    return row ? toOrder(row) : null;
  }

  async findByIdForTutor(orderId: string, tutorId: string): Promise<Order | null> {
    // 🔴 `tutorId` is part of the query, not a check afterwards. Removing it
    // here is what the red proof of the ownership test mutates.
    const row = await this.prisma.order.findFirst({
      where: { id: orderId, tutorId },
      include: { items: true },
    });

    return row ? toOrder(row) : null;
  }

  async listByTutor(tutorId: string): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { tutorId },
      include: { items: true },
      orderBy: { placedAt: 'desc' },
    });

    return rows.map(toOrder);
  }

  async findOverdue(now: Date, limit: number, context?: PersistenceContext): Promise<Order[]> {
    const client = context ? asPrismaTransaction(context) : this.prisma;

    const rows = await client.order.findMany({
      where: { status: 'PLACED', acceptanceDeadlineAt: { lte: now } },
      include: { items: true },
      orderBy: { acceptanceDeadlineAt: 'asc' },
      take: limit,
    });

    return rows.map(toOrder);
  }

  async transition(
    exit: OrderExit,
    expectedStatus: OrderStatus,
    sideEffects: OrderSideEffects,
    context?: PersistenceContext,
  ): Promise<Order | null> {
    if (context) {
      return applyTransition(asPrismaTransaction(context), exit, expectedStatus, sideEffects);
    }

    return this.prisma.$transaction(async (tx) =>
      applyTransition(tx, exit, expectedStatus, sideEffects),
    );
  }

  async withAdvisoryLock<T>(
    key: number,
    fn: (context: PersistenceContext) => Promise<T>,
  ): Promise<T | null> {
    return this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${key}::bigint) AS locked
      `;

      // Another process is sweeping. Answering null rather than waiting is the
      // point: a second sweeper adds nothing, and blocking would pile up
      // connections on a job that runs every minute.
      if (!row?.locked) {
        return null;
      }

      return fn(toPersistenceContext(tx));
    });
  }
}

/**
 * The compare-and-set, and the side effects that must share its fate.
 *
 * The `updateMany` carries the expected status in its `where`: two concurrent
 * callers issue the same statement and exactly one of them affects a row. The
 * loser gets `count === 0`, returns `null`, and — crucially — **never runs the
 * side effects**, so there is no second refund and no second audit line.
 */
async function applyTransition(
  tx: PrismaTypes.TransactionClient,
  exit: OrderExit,
  expectedStatus: OrderStatus,
  sideEffects: OrderSideEffects,
): Promise<Order | null> {
  const { order } = exit;

  const { count } = await tx.order.updateMany({
    where: { id: order.id, status: expectedStatus },
    data: {
      status: order.status,
      acceptedAt: order.acceptedAt,
      dispatchedAt: order.dispatchedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      rejectedAt: order.rejectedAt,
      rejectionReason: order.rejectionReason,
      cancellationReason: order.cancellationReason,
    },
  });

  if (count === 0) {
    return null;
  }

  // Only the lines whose fulfillment actually moved. The snapshot columns are
  // never in this update — the order is an accounting record (ADR-0014, C3).
  for (const item of order.items) {
    if (item.fulfillment !== 'FULFILLED') {
      await tx.orderItem.updateMany({
        where: { id: item.id, orderId: order.id },
        data: { fulfillment: item.fulfillment },
      });
    }
  }

  await sideEffects(toPersistenceContext(tx));

  const row = await tx.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true },
  });

  return toOrder(row);
}

/**
 * Tells the two unique violations apart.
 *
 * A clash on `code` is a one-in-a-billion draw that a retry fixes; a clash on
 * `(tutor_id, idempotency_key)` is two requests racing on the same key, where
 * the right answer is to read back the order the winner created. Collapsing
 * them into one error would turn the second into a retry that creates nothing
 * and reports a failure.
 */
function toCreationError(error: unknown, code: string, idempotencyKey: string): unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== UNIQUE_VIOLATION) {
    return error;
  }

  // ⚠️ The constraint is read from `meta.target` **and** from the message.
  // Under the Prisma 7 driver adapter `meta.target` does not always carry the
  // index name, and the only place it appears is the message — which is how a
  // duplicate key reached the client as a 500 until the concurrency sentinel
  // caught it.
  const target = `${JSON.stringify(error.meta?.target ?? '')} ${error.message}`;

  if (target.includes('idempotency')) {
    return new DuplicateIdempotencyKeyError(idempotencyKey);
  }

  if (target.includes('code')) {
    return new OrderCodeCollisionError(code);
  }

  return error;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    code: row.code,
    tutorId: row.tutorId,
    storeId: row.storeId,
    status: row.status,
    acquisitionChannel: row.acquisitionChannel,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    deliveryAddress: row.deliveryAddress as unknown as DeliveryAddressSnapshot,
    items: row.items.map(toOrderItem),
    itemsTotalCents: row.itemsTotalCents,
    deliveryFeeCents: row.deliveryFeeCents,
    serviceFeeCents: row.serviceFeeCents,
    totalCents: row.totalCents,
    commissionTotalCents: row.commissionTotalCents,
    placedAt: row.placedAt,
    acceptanceDeadlineAt: row.acceptanceDeadlineAt,
    acceptedAt: row.acceptedAt,
    dispatchedAt: row.dispatchedAt,
    deliveredAt: row.deliveredAt,
    cancelledAt: row.cancelledAt,
    rejectedAt: row.rejectedAt,
    rejectionReason: row.rejectionReason,
    cancellationReason: row.cancellationReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toOrderItem(row: PrismaOrderItem): OrderItem {
  return {
    id: row.id,
    productId: row.productId,
    offerId: row.offerId,
    productNameSnapshot: row.productNameSnapshot,
    productVariantSnapshot: row.productVariantSnapshot,
    categorySnapshot: row.categorySnapshot,
    unitPriceCents: row.unitPriceCents,
    quantity: row.quantity,
    commissionRateBpsSnapshot: row.commissionRateBpsSnapshot,
    commissionAmountCents: row.commissionAmountCents,
    fulfillment: row.fulfillment,
    substitutedByProductId: row.substitutedByProductId,
  };
}
