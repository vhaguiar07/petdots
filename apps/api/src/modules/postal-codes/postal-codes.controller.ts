import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { PostalCodeAddress } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import { FindPostalCodeUseCase } from './application/find-postal-code.use-case.js';
import { PostalCodeLookupFailedError } from './domain/postal-code-lookup-failed.error.js';
import { PostalCodeNotFoundError } from './domain/postal-code-not-found.error.js';
import { FindPostalCodeParamsDto, PostalCodeAddressDto } from './postal-codes.dto.js';

/**
 * The CEP directory, behind our own door.
 *
 * ⚠️ **Deliberately authenticated** — no `@Public()`. The guards are global, so
 * the absence is what closes it, and closed is right: an open endpoint that
 * forwards a path parameter to a third party is a proxy anyone can point at
 * that third party, on our IP and our reputation. The only caller today is the
 * address form, and whoever is filling it in is signed in.
 *
 * **No `@Roles()`**, though: any authenticated person may need to resolve a CEP
 * — the lojista registering a store address will, and they are not a `TUTOR`.
 */
@ApiTags('postal-codes')
@ApiBearerAuth()
@Controller('postal-codes')
export class PostalCodesController {
  constructor(private readonly findPostalCode: FindPostalCodeUseCase) {}

  @Get(':postalCode')
  @ZodResponse({ status: HttpStatus.OK, type: PostalCodeAddressDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'CEP não encontrado.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Não foi possível consultar o diretório de CEPs.',
  })
  async find(@Param() params: FindPostalCodeParamsDto): Promise<PostalCodeAddress> {
    try {
      return await this.findPostalCode.execute(params.postalCode);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

/**
 * 🔴 The two failures answer differently, and that is the whole point of having
 * two errors. `404` means "esse CEP não existe" — the person mistyped. `503`
 * means "não conseguimos perguntar" — the CEP may be perfectly fine, and the
 * client must not tell them otherwise; it just leaves the form alone.
 */
function toHttpError(error: unknown): unknown {
  if (error instanceof PostalCodeNotFoundError) {
    return new NotFoundException({
      code: 'POSTAL_CODE_NOT_FOUND',
      message: 'CEP não encontrado.',
    });
  }

  if (error instanceof PostalCodeLookupFailedError) {
    return new ServiceUnavailableException({
      code: 'POSTAL_CODE_LOOKUP_UNAVAILABLE',
      message: 'Não foi possível consultar o CEP agora.',
    });
  }

  return error;
}
