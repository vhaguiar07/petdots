import type { OrderStatus } from '@petdots/contracts';

import type { PersistenceContext } from '../../../prisma/persistence-context.js';
import type { Order, OrderExit } from './order.js';

/** Injection token for the port — the domain never names its adapter. */
export const ORDER_REPOSITORY = Symbol('IOrderRepository');

/** What the caller wants done inside the transition's transaction. */
export type OrderSideEffects = (context: PersistenceContext) => Promise<void>;

export interface IOrderRepository {
  /**
   * Writes a new order and its lines.
   *
   * Raises `OrderCodeCollisionError` when the readable code is taken (the
   * caller retries once) and `DuplicateIdempotencyKeyError` when two requests
   * raced on the same key (the caller re-reads and answers with the winner).
   * Telling the two unique violations apart matters: one is bad luck, the other
   * is the feature working.
   */
  create(order: Order, idempotencyKey: string): Promise<Order>;

  /** The order this key already produced, if any — the replay path. */
  findByIdempotencyKey(tutorId: string, idempotencyKey: string): Promise<Order | null>;

  /**
   * One order **of this tutor**, or `null`.
   *
   * 🔴 The `tutorId` goes in the `where` of the query, never into a check
   * afterwards. That is what makes "orders of the caller" the only reachable
   * set: there is no path where somebody else's row arrives and is then hidden
   * (the pattern pd-14 fixed for pets, TESTING_STRATEGY).
   */
  findByIdForTutor(orderId: string, tutorId: string): Promise<Order | null>;

  listByTutor(tutorId: string): Promise<Order[]>;

  /** Orders still `PLACED` whose acceptance window has run out. */
  findOverdue(now: Date, limit: number, context?: PersistenceContext): Promise<Order[]>;

  /**
   * 🔴 Applies a transition **conditionally on the current status**, and does
   * the side effects in the same transaction.
   *
   * The write is `UPDATE … WHERE id = ? AND status = ?` — a compare-and-set, in
   * the precedent of the refresh-token rotation (ADR-0011, A7). Zero rows
   * affected means somebody moved the order first, and the answer is `null`:
   * the side effects **do not run**, so a second sweeper pass cannot produce a
   * second refund. That is what makes the job reentrant by construction
   * (ADR-0014, C7) rather than by a lock nobody can test.
   *
   * ⚠️ `sideEffects` must never swallow an error. It runs inside the
   * transaction, so a failure rolls the transition back — which is exactly
   * right — but a `catch` in there would leave a `REJECTED` with no refund.
   *
   * `context` lets the caller hand in a transaction it already opened, which is
   * what the sweeper does: the advisory lock only holds inside the transaction
   * that took it, so the lock and every transition it guards have to share one.
   */
  transition(
    exit: OrderExit,
    expectedStatus: OrderStatus,
    sideEffects: OrderSideEffects,
    context?: PersistenceContext,
  ): Promise<Order | null>;

  /**
   * Runs `fn` inside one transaction holding a Postgres advisory lock, or
   * answers `null` when another process already holds it.
   *
   * `pg_try_advisory_xact_lock` is released when the transaction ends, which is
   * the whole reason the lock and the work must be the same transaction — a
   * lock taken outside one protects nothing (SYSTEM_ARCHITECTURE, ADR-0014 C7).
   */
  withAdvisoryLock<T>(
    key: number,
    fn: (context: PersistenceContext) => Promise<T>,
  ): Promise<T | null>;
}
