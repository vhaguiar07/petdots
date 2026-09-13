import { Injectable, Logger } from '@nestjs/common';
import type { PostalCodeAddress } from '@petdots/contracts';
import { z } from 'zod';

import type { IPostalCodeGateway } from '../domain/ipostal-code.gateway.js';
import { PostalCodeLookupFailedError } from '../domain/postal-code-lookup-failed.error.js';

const VIACEP_URL = 'https://viacep.com.br/ws';

/**
 * 🔴 A timeout is not optional here. Without it, a directory that hangs holds
 * one of our request handlers for as long as it likes, and the failure mode of
 * a *convenience* becomes the failure mode of the API. Three seconds is far
 * longer than the service's normal response and far shorter than a person's
 * patience with a form field.
 */
const TIMEOUT_MS = 3_000;

/**
 * What ViaCEP actually answers. Parsed, never cast — this is a third party, and
 * the one thing we cannot do is assume its shape holds because it held
 * yesterday.
 *
 * ⚠️ It answers **`200` with `{ "erro": "true" }`** for a CEP that does not
 * exist, rather than a `404`. Reading the status alone would turn "não existe"
 * into a success with every field undefined.
 */
const viaCepResponseSchema = z.union([
  z.object({ erro: z.union([z.literal('true'), z.literal(true)]) }),
  z.object({
    cep: z.string(),
    // Empty for a "CEP único", which covers a whole town and names no street.
    logradouro: z.string(),
    bairro: z.string(),
    localidade: z.string(),
    uf: z.string(),
  }),
]);

/**
 * The only place in the PetDots that talks to somebody else's server
 * (ADR-0016). Everything above it speaks `IPostalCodeGateway`.
 */
@Injectable()
export class ViaCepPostalCodeGateway implements IPostalCodeGateway {
  private readonly logger = new Logger(ViaCepPostalCodeGateway.name);

  /**
   * A CEP resolves to the same street for years, so the same handful of
   * neighbourhood CEPs would otherwise be asked over and over.
   *
   * **Bounded on purpose:** an unbounded map fed by a path parameter is a
   * memory leak with a public name. At the cap it is cleared whole rather than
   * evicted one by one — for a cache this small, the bookkeeping of an LRU
   * costs more than the misses it would save.
   */
  private readonly cache = new Map<string, PostalCodeAddress>();
  private static readonly CACHE_LIMIT = 500;

  async findByPostalCode(postalCode: string): Promise<PostalCodeAddress | null> {
    const cached = this.cache.get(postalCode);

    if (cached) {
      return cached;
    }

    const body = await this.ask(postalCode);
    const parsed = viaCepResponseSchema.safeParse(body);

    if (!parsed.success) {
      // The directory answered something that is not what it promises. That is
      // a failure to look up, not a missing CEP.
      this.logger.warn(`postal code directory answered an unexpected shape (cep=${postalCode})`);
      throw new PostalCodeLookupFailedError('the directory answered an unexpected shape');
    }

    if ('erro' in parsed.data) {
      return null;
    }

    const address: PostalCodeAddress = {
      // Ours, normalised — never the directory's spelling, which carries a hyphen.
      postalCode,
      street: parsed.data.logradouro,
      neighborhood: parsed.data.bairro,
      city: parsed.data.localidade,
      state: parsed.data.uf,
    };

    this.remember(postalCode, address);

    return address;
  }

  private async ask(postalCode: string): Promise<unknown> {
    let response: Response;

    try {
      response = await fetch(`${VIACEP_URL}/${postalCode}/json/`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Offline, DNS, TLS, or the timeout above. The CEP is not at fault.
      this.logger.warn(`postal code directory unreachable (cep=${postalCode})`);
      throw new PostalCodeLookupFailedError('the directory could not be reached');
    }

    if (!response.ok) {
      this.logger.warn(
        `postal code directory refused (cep=${postalCode}, status=${String(response.status)})`,
      );
      throw new PostalCodeLookupFailedError(`the directory answered ${String(response.status)}`);
    }

    try {
      return await response.json();
    } catch {
      throw new PostalCodeLookupFailedError('the directory answered something that is not JSON');
    }
  }

  private remember(postalCode: string, address: PostalCodeAddress): void {
    if (this.cache.size >= ViaCepPostalCodeGateway.CACHE_LIMIT) {
      this.cache.clear();
    }

    this.cache.set(postalCode, address);
  }
}
