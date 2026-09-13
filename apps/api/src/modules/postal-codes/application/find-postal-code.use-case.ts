import { Inject, Injectable } from '@nestjs/common';
import type { PostalCodeAddress } from '@petdots/contracts';
import { normalizePostalCode } from '@petdots/domain';

import { type IPostalCodeGateway, POSTAL_CODE_GATEWAY } from '../domain/ipostal-code.gateway.js';
import { PostalCodeNotFoundError } from '../domain/postal-code-not-found.error.js';

/**
 * The street and the neighbourhood behind a CEP.
 *
 * Normalises before asking — the same rule as everywhere else: the border
 * validates, the use case normalises. It also means `20720-000` and `20720000`
 * hit the same cache entry instead of two.
 */
@Injectable()
export class FindPostalCodeUseCase {
  constructor(
    @Inject(POSTAL_CODE_GATEWAY)
    private readonly directory: IPostalCodeGateway,
  ) {}

  async execute(rawPostalCode: string): Promise<PostalCodeAddress> {
    const postalCode = normalizePostalCode(rawPostalCode);
    const address = await this.directory.findByPostalCode(postalCode);

    if (!address) {
      throw new PostalCodeNotFoundError(postalCode);
    }

    return address;
  }
}
