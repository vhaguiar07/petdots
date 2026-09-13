import { Inject, Injectable } from '@nestjs/common';
import type { StoreMembershipList } from '@petdots/contracts';

import {
  type IStoreMemberRepository,
  STORE_MEMBER_REPOSITORY,
} from '../domain/istore-member.repository.js';

/**
 * The panel's front door: which stores does the caller operate?
 *
 * 🔴 It reads the membership repository directly and **not** `FindStoreUseCase`,
 * which hides `PAUSED` stores. That rule is right for the public side — a shop
 * the comparator omits must not have a reachable page — and wrong here: pausing
 * the shop is done from the panel, so an owner locked out of the panel by the
 * pause could never undo it (ADR-0018, A8).
 *
 * The list does not come from `/auth/me` either. `identity` would have to read
 * `store_members` to fill it, coupling the token issuer to this module for a
 * fact only the panel uses.
 */
@Injectable()
export class ListMyStoreMembershipsUseCase {
  constructor(
    @Inject(STORE_MEMBER_REPOSITORY)
    private readonly repository: IStoreMemberRepository,
  ) {}

  async execute(userId: string): Promise<StoreMembershipList> {
    const memberships = await this.repository.listByUser(userId);

    return {
      items: memberships.map((membership) => ({
        store: {
          id: membership.store.id,
          slug: membership.store.slug,
          name: membership.store.name,
          neighborhood: membership.store.neighborhood,
        },
        role: membership.role,
      })),
    };
  }
}
