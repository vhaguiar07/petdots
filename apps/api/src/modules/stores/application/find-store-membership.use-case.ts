import { Inject, Injectable } from '@nestjs/common';

import {
  type IStoreMemberRepository,
  STORE_MEMBER_REPOSITORY,
} from '../domain/istore-member.repository.js';
import type { StoreMembership } from '../domain/store-member.js';

/**
 * Does this person operate this store, and in what capacity?
 *
 * 🔴 **Exported by `StoresModule` because `StoreScopeGuard` injects it**, and
 * the guard is applied inside `orders` and `offers` — where Nest resolves its
 * dependencies in *that* module's context. A missing `exports` fails only at
 * boot, which is why the boot smoke and `contract.spec.ts` are part of the
 * closing battery (ADR-0018, A3).
 *
 * It answers `null` rather than raising: "not a member" is the ordinary case on
 * a route that is about to say `403`, not an exception.
 */
@Injectable()
export class FindStoreMembershipUseCase {
  constructor(
    @Inject(STORE_MEMBER_REPOSITORY)
    private readonly repository: IStoreMemberRepository,
  ) {}

  async execute(storeId: string, userId: string): Promise<StoreMembership | null> {
    return this.repository.findMembership(storeId, userId);
  }
}
