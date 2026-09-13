import { Controller, Get, HttpStatus, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { StoreMembershipList } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import type { AuthenticatedRequest } from '../../common/guards/authenticated-request.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { callerOf } from '../../common/request-context.js';
import { ListMyStoreMembershipsUseCase } from './application/list-my-store-memberships.use-case.js';
import { StoreMembershipListDto } from './stores.dto.js';

/**
 * The panel's front door: which stores does the caller operate?
 *
 * ⚠️ **No `StoreScopeGuard` here**, and that is not an oversight: there is no
 * `storeId` in the path for it to scope to. This is the route that *tells* the
 * client which ids exist for it, and it is bounded by the caller's own id in
 * the `where` — the same ownership pattern as `/tutors/me/pets`.
 *
 * A top-level resource rather than `/stores/mine` or a field on `/auth/me`: it
 * is the caller's list, not a sub-collection of one store, and putting it on the
 * session would couple `identity` to `store_members` for a fact only the panel
 * reads (ADR-0018, A8).
 */
@ApiTags('stores')
@ApiBearerAuth()
@Roles('STORE_MEMBER')
@Controller('store-memberships')
export class StoreMembershipsController {
  constructor(private readonly listMemberships: ListMyStoreMembershipsUseCase) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: StoreMembershipListDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  async list(@Req() request: AuthenticatedRequest): Promise<StoreMembershipList> {
    return this.listMemberships.execute(callerOf(request));
  }
}
