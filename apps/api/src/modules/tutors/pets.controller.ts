import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Pet, PetList } from '@petdots/contracts';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';

import type { AuthenticatedRequest } from '../../common/guards/authenticated-request.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { API_PREFIX } from '../../openapi.js';
import { FindPetUseCase } from './application/find-pet.use-case.js';
import { ListPetsUseCase } from './application/list-pets.use-case.js';
import { RegisterPetUseCase } from './application/register-pet.use-case.js';
import { RemovePetUseCase } from './application/remove-pet.use-case.js';
import { UpdatePetUseCase } from './application/update-pet.use-case.js';
import { PetNotFoundError } from './domain/pet-not-found.error.js';
import { CreatePetDto, FindPetParamsDto, PetDto, PetListDto, UpdatePetDto } from './tutors.dto.js';
import { callerOf, toHttpError } from './tutors.controller.js';

const PET_NOT_FOUND = { code: 'PET_NOT_FOUND', message: 'Pet não encontrado.' } as const;

/**
 * The caller's pets — a sub-resource under the tutor that owns them
 * (`API_GUIDELINES`: sub-recursos sob o agregado), addressed as `me` for the
 * same reason the profile is.
 *
 * 🔴 A pet belonging to another tutor answers **`404`, never `403`**. `403`
 * would confirm that the id is real and has an owner, which is exactly what a
 * stranger must not be able to probe for. The ownership is enforced in the
 * repository's `where`, not by a check here, so there is no path that reaches a
 * row it should not.
 *
 * ⚠️ No `@Public()` — the guards are global and the absence is what closes
 * these routes.
 */
@ApiTags('tutors')
@ApiBearerAuth()
@Roles('TUTOR')
@Controller('tutors/me/pets')
export class PetsController {
  constructor(
    private readonly registerPet: RegisterPetUseCase,
    private readonly listPets: ListPetsUseCase,
    private readonly findPet: FindPetUseCase,
    private readonly updatePet: UpdatePetUseCase,
    private readonly removePet: RemovePetUseCase,
  ) {}

  /**
   * `201` with `Location`, because there **is** a route to read the pet back —
   * which is the condition `API_GUIDELINES` puts on the header (the waitlist
   * omits it precisely because there is no such route).
   *
   * `@Res({ passthrough: true })` sets the header and leaves the response to
   * Nest, so `@ZodResponse` still validates and serialises the body. The value
   * is dynamic, so `@Header()` could not carry it.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({ status: HttpStatus.CREATED, type: PetDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Perfil do tutor não encontrado.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreatePetDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Pet> {
    try {
      const pet = await this.registerPet.execute(callerOf(request), body);

      response.setHeader('Location', `/${API_PREFIX}/tutors/me/pets/${pet.id}`);

      return pet;
    } catch (error) {
      throw toPetHttpError(error);
    }
  }

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: PetListDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Perfil do tutor não encontrado.' })
  async list(@Req() request: AuthenticatedRequest): Promise<PetList> {
    try {
      return await this.listPets.execute(callerOf(request));
    } catch (error) {
      throw toPetHttpError(error);
    }
  }

  @Get(':petId')
  @ZodResponse({ status: HttpStatus.OK, type: PetDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pet não encontrado.' })
  async find(
    @Req() request: AuthenticatedRequest,
    @Param() params: FindPetParamsDto,
  ): Promise<Pet> {
    try {
      return await this.findPet.execute(callerOf(request), params.petId);
    } catch (error) {
      throw toPetHttpError(error);
    }
  }

  @Patch(':petId')
  @ZodResponse({ status: HttpStatus.OK, type: PetDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pet não encontrado.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param() params: FindPetParamsDto,
    @Body() body: UpdatePetDto,
  ): Promise<Pet> {
    try {
      return await this.updatePet.execute(callerOf(request), params.petId, body);
    } catch (error) {
      throw toPetHttpError(error);
    }
  }

  @Delete(':petId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Pet excluído.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Papel sem permissão.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pet não encontrado.' })
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param() params: FindPetParamsDto,
  ): Promise<void> {
    try {
      await this.removePet.execute(callerOf(request), params.petId);
    } catch (error) {
      throw toPetHttpError(error);
    }
  }
}

/**
 * Both 404s of this controller. `TutorProfileNotFoundError` keeps its own code:
 * "you have no profile yet" and "that pet is not there" send the app to
 * different places — the first to the onboarding, the second back to the list.
 */
function toPetHttpError(error: unknown): unknown {
  return error instanceof PetNotFoundError
    ? new NotFoundException(PET_NOT_FOUND)
    : toHttpError(error);
}
