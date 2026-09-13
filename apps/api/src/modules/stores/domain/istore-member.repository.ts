import type { StoreMembership, StoreMembershipOfUser } from './store-member.js';

/** Injection token for the port — the domain never names its adapter. */
export const STORE_MEMBER_REPOSITORY = Symbol('IStoreMemberRepository');

export interface IStoreMemberRepository {
  /**
   * 🔴 The one query every scoped route pays, by the unique index
   * `(store_id, user_id)`.
   *
   * Both ids go in the `where`: there is no path where somebody else's
   * membership arrives and is then compared. `null` is "you do not operate this
   * store", and the guard turns it into `403 STORE_SCOPE_DENIED` without
   * distinguishing "no such store" from "not yours" — the existence of a store
   * is public anyway (the comparator lists them), so there is nothing to leak.
   */
  findMembership(storeId: string, userId: string): Promise<StoreMembership | null>;

  /**
   * Every store this person operates, for the panel's front door.
   *
   * ⚠️ Includes **paused** stores, which is why this does not go through
   * `FindStoreUseCase`: that one hides `PAUSED` so a visitor cannot reach a
   * shopfront the comparator omits, and applying the same rule here would lock
   * an owner out of the panel exactly when the shop is paused (ADR-0018, A8).
   *
   * The `include` of `stores` is allowed: this module owns both tables, and the
   * boundary `CODING_STANDARDS` draws is between modules, not inside one.
   */
  listByUser(userId: string): Promise<StoreMembershipOfUser[]>;
}
