import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Put,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { TutorProfile } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import type { AuthenticatedRequest } from '../../common/guards/authenticated-request.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { FindTutorProfileUseCase } from './application/find-tutor-profile.use-case.js';
import { UpsertTutorProfileUseCase } from './application/upsert-tutor-profile.use-case.js';
import { TutorProfileNotFoundError } from './domain/tutor-profile-not-found.error.js';
import { TutorProfileDto, UpsertTutorProfileDto } from './tutors.dto.js';

/** The 404 of the profile singleton, in one place so the two handlers agree. */
const TUTOR_NOT_FOUND = {
  code: 'TUTOR_NOT_FOUND',
  message: 'Perfil do tutor não encontrado.',
} as const;

/**
 * The caller's own tutor profile — a **singleton** under `/me`, not a
 * collection with an id in the URL. There is nothing to address: the profile is
 * whoever is holding the token, and an id in the path would be an id somebody
 * can change.
 *
 * 🔴 **The first real route with `@Roles()`.** The decorator is on the class:
 * the profile and the pets are the demand side of the marketplace, and an
 * `ADMIN` with no `TUTOR` role has no profile to read. The shop owner who also
 * has a pet carries both roles and passes, because the guard is an intersection
 * (ADR-0011, R4).
 *
 * ⚠️ **No `@Public()` anywhere in this module.** The guards are global since
 * pd-13; the absence is what keeps these routes closed.
 */
@ApiTags('tutors')
@ApiBearerAuth()
@Roles('TUTOR')
@Controller('tutors')
export class TutorsController {
  constructor(
    private readonly findTutorProfile: FindTutorProfileUseCase,
    private readonly upsertTutorProfile: UpsertTutorProfileUseCase,
  ) {}

  /**
   * `404` while the profile does not exist, and that is the useful answer: it
   * is what tells the app "perfil incompleto → onboarding". Registering creates
   * a `User` and nothing else (ADR-0011, A10), so every account starts here.
   */
  @Get('me')
  @ZodResponse({ status: HttpStatus.OK, type: TutorProfileDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Perfil do tutor não encontrado.' })
  async find(@Req() request: AuthenticatedRequest): Promise<TutorProfile> {
    try {
      return await this.findTutorProfile.execute(callerOf(request));
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /**
   * Creates or replaces the profile, and answers `200` either way.
   *
   * `PUT` rather than `POST` because a singleton has no second state to
   * distinguish, and repeating the request on a bad connection must not turn
   * into a `409`. `200` and not a status that varies with what happened: the
   * client cannot act on the difference — by design it does not know whether it
   * is creating or editing — and no `Location`, since the resource it would
   * point at is the very route being called (ADR-0015, A9).
   */
  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: TutorProfileDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async save(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpsertTutorProfileDto,
  ): Promise<TutorProfile> {
    return this.upsertTutorProfile.execute(callerOf(request), body);
  }
}

/**
 * The caller's id. `AuthGuard` is global and this controller is not `@Public()`,
 * so a caller is always present — answering `401` rather than trusting the
 * optional keeps the day somebody unmarks the route from becoming a `500`, the
 * same guard clause `/auth/me` uses.
 */
export function callerOf(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new UnauthorizedException({
      code: 'UNAUTHENTICATED',
      message: 'Autenticação necessária.',
    });
  }

  return request.user.id;
}

export function toHttpError(error: unknown): unknown {
  return error instanceof TutorProfileNotFoundError
    ? // The body carries the specific code; the exception filter honours it
      // instead of falling back to the generic `NOT_FOUND` (ERROR_MODEL).
      new NotFoundException(TUTOR_NOT_FOUND)
    : error;
}
