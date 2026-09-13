import type { PersistenceContext } from '../prisma/persistence-context.js';

/** Injection token for the port — the application never names its adapter. */
export const AUDIT_TRAIL = Symbol('IAuditTrail');

/** Who did it. `SYSTEM` is a job: there is no human and no request behind it. */
export type AuditActorKind = 'USER' | 'SYSTEM';

/**
 * 🔴 What a payload may carry: ids, states, reasons and amounts. **Never a
 * name, a phone number or an address.**
 *
 * The type is what enforces it as far as a type can — the rest is the rule
 * stated here and checked by the e2e sweep. `NAMING_CONVENTIONS` §Logs forbids
 * personal data by name, and an audit table is the one place where a leak would
 * be permanent: logs rotate, this does not.
 */
export type AuditPayload = Record<string, string | number | boolean | null>;

export interface AuditEntry {
  actorKind: AuditActorKind;
  /** Null when the actor is the system. */
  actorUserId: string | null;
  /** `domain.action`, e.g. `order.cancelled` (NAMING_CONVENTIONS). */
  action: string;
  entityType: 'order';
  entityId: string;
  storeId: string | null;
  payload: AuditPayload;
  /** Null when there is no request — which is exactly the job's case. */
  requestId: string | null;
}

/**
 * The audit trail, written by the **application** rather than by an HTTP
 * interceptor (ADR-0017).
 *
 * The `SYSTEM_ARCHITECTURE` called for an "Audit interceptor na borda", and
 * this contradicts it on purpose. The first audited refusal this project
 * produces is the **auto-rejection by deadline**: performed by a job, with no
 * route and no status code, carrying a fact an interceptor cannot see — "from
 * `PLACED` to `REJECTED`, because the window expired". A border interceptor
 * would miss it entirely and would never know the previous state.
 *
 * `context` is how the line lands in the **same transaction** as the transition
 * that produced it. Omitting it writes outside any transaction, which is
 * correct only where there is nothing to be atomic with.
 */
export interface IAuditTrail {
  record(entry: AuditEntry, context?: PersistenceContext): Promise<void>;
}
