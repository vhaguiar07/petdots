import { Body, ConflictException, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { WaitlistEntry } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '../../common/guards/public.decorator.js';
import { JoinWaitlistUseCase } from './application/join-waitlist.use-case.js';
import { WaitlistEntryAlreadyExistsError } from './domain/waitlist-entry-already-exists.error.js';
import { CreateWaitlistEntryDto, WaitlistEntryDto } from './waitlist.dto.js';

// The lead capture is the campaign's front door: the person filling it in has
// no account yet, and by design never needs one (J9).
@Public()
@ApiTags('waitlist')
@Controller('waitlist-entries')
export class WaitlistController {
  constructor(private readonly joinWaitlist: JoinWaitlistUseCase) {}

  /**
   * Captures a lead for the smoke test (J9). There is no `GET` counterpart and
   * therefore no `Location` header: the list is personal data with no public
   * read, and a header pointing at a route that does not exist would be worse
   * than its absence (pd-09, A8 — the exception is recorded in API_GUIDELINES).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({ status: HttpStatus.CREATED, type: WaitlistEntryDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Telefone já está na lista de espera.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async create(@Body() body: CreateWaitlistEntryDto): Promise<WaitlistEntry> {
    try {
      const entry = await this.joinWaitlist.execute(body);

      return {
        ...entry,
        consentAt: entry.consentAt.toISOString(),
        createdAt: entry.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof WaitlistEntryAlreadyExistsError) {
        // The body carries the specific code; the exception filter honours it
        // instead of falling back to the generic one for 409 (pd-09, A16).
        throw new ConflictException({
          code: 'WAITLIST_ENTRY_ALREADY_EXISTS',
          message: 'Este telefone já está na lista de espera.',
        });
      }

      throw error;
    }
  }
}
