import type { Prisma } from '@prisma/client';

declare const brand: unique symbol;

/**
 * An open transaction, passed between modules **without either of them naming
 * Prisma**.
 *
 * 🔴 Why this exists. A state transition of an order has to write three things
 * or none: the new status, the `Refund` it produces, and the audit line
 * (ADR-0014 C5/C7). Two of those belong to other modules, so the port each of
 * them exposes has to accept "do this inside the transaction I already opened"
 * — and a `Prisma.TransactionClient` in that signature would drag Prisma into
 * `application/`, which the layering forbids (CODING_STANDARDS: `domain` and
 * `application` carry no Prisma).
 *
 * So the type is **opaque**: the branded field does not exist at runtime and
 * cannot be constructed outside this file, which means only the two functions
 * below can turn it into something usable — and only `infra/` calls them. The
 * use case passes a token it cannot open.
 *
 * The pd-14 got away with two writes and no transaction because the `PUT` was
 * idempotent and repeating it fixed the gap. Here repeating fixes nothing: a
 * `REJECTED` without its `Refund` is money that stopped existing.
 */
export type PersistenceContext = { readonly [brand]: 'PersistenceContext' };

/** Wraps an open transaction. Called by the repository that opened it. */
export function toPersistenceContext(tx: Prisma.TransactionClient): PersistenceContext {
  return tx as unknown as PersistenceContext;
}

/** Unwraps it. Only a Prisma adapter may call this. */
export function asPrismaTransaction(context: PersistenceContext): Prisma.TransactionClient {
  return context as unknown as Prisma.TransactionClient;
}
