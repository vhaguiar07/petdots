import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ProductNotOfferableError } from '@petdots/domain';

import { ProductNotFoundError } from '../catalog/domain/product-not-found.error.js';
import { StoreNotFoundError } from '../stores/domain/store-not-found.error.js';
import { OfferAlreadyExistsError, OfferNotFoundError } from './domain/offer-errors.js';

/**
 * Domain failure → HTTP, with the **specific** code in the body so the filter
 * honours it instead of falling back to the generic one (ERROR_MODEL).
 *
 * The `409`/`422` split is the one the error model already fixed: a conflict of
 * **state** is `409` (the shop already sells this product) and a business rule
 * about the **data sent** is `422` (a product that may not be offered at all).
 * Both are well-formed requests from an authorised caller.
 */
export function toHttpError(error: unknown): unknown {
  if (error instanceof OfferNotFoundError) {
    // `404` and never `403`, including for another store's offer: the `storeId`
    // in the `where` makes the two the same empty result.
    return new NotFoundException({
      code: 'OFFER_NOT_FOUND',
      message: 'Oferta não encontrada nesta loja.',
    });
  }

  if (error instanceof ProductNotFoundError) {
    return new NotFoundException({
      code: 'PRODUCT_NOT_FOUND',
      message: 'Produto não encontrado.',
    });
  }

  if (error instanceof StoreNotFoundError) {
    return new NotFoundException({ code: 'STORE_NOT_FOUND', message: 'Loja não encontrada.' });
  }

  if (error instanceof OfferAlreadyExistsError) {
    return new ConflictException({
      code: 'OFFER_ALREADY_EXISTS',
      message: 'Esta loja já tem este produto na prateleira.',
    });
  }

  if (error instanceof ProductNotOfferableError) {
    // The cross-table invariant Postgres cannot express: a prescription product
    // has no offer in the MVP, and a withdrawn one has none either.
    return new UnprocessableEntityException({
      code: 'PRODUCT_NOT_OFFERABLE',
      message: 'Este produto não pode ser vendido pela plataforma.',
    });
  }

  return error;
}
