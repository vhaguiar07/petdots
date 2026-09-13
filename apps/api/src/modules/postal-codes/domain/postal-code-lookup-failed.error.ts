import { DomainError } from '@petdots/domain';

/**
 * We could not ask the directory — it timed out, refused, or answered something
 * that is not what it promises.
 *
 * Deliberately distinct from `PostalCodeNotFoundError`: "esse CEP não existe" e
 * "não consegui perguntar" levam a telas diferentes, e tratar as duas como a
 * mesma coisa faria o app dizer que o CEP está errado quando ele está certo.
 */
export class PostalCodeLookupFailedError extends DomainError {}
