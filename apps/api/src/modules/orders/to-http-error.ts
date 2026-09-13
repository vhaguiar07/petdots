import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { StoreClosedError } from '@petdots/domain';

import { StoreNotFoundError } from '../stores/domain/store-not-found.error.js';
import { InvalidOrderTransitionError } from './domain/invalid-order-transition.error.js';
import {
  AddressOutOfDeliveryAreaError,
  OfferUnavailableError,
  OrderItemNotFoundError,
  OrderItemsInvalidError,
  OrderNotFoundError,
  StoreNotActiveError,
  TutorProfileRequiredError,
} from './domain/order-errors.js';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;

/**
 * Domain failure → HTTP, with the **specific** code in the body so the filter
 * honours it instead of falling back to the generic one (ERROR_MODEL).
 *
 * The `409`/`422` split follows the rule the error model already fixed: a
 * conflict of **state** is `409` (the store is shut, is not active, the offer is
 * off the shelf, the order already moved), and a business rule about the **data
 * sent** is `422` (an offer that does not exist or is repeated, an address no
 * area covers). Both are well-formed requests from an authorised caller.
 */
export function toHttpError(error: unknown): unknown {
  if (error instanceof OrderNotFoundError) {
    // 🔴 `404` and never `403`, including for somebody else's order. `403`
    // would confirm that the id is real and has an owner — the one fact a
    // stranger must not be able to probe for (the rule pd-14 fixed for pets).
    return new NotFoundException({
      code: 'ORDER_NOT_FOUND',
      message: 'Pedido não encontrado.',
    });
  }

  if (error instanceof OrderItemNotFoundError) {
    // `404` rather than the `409` the domain alone would give: the line is not
    // in this order, which is a different fact from a line that cannot move.
    // Without the distinction the panel could not tell a stale id from an item
    // that was already marked (ADR-0018, A6).
    return new NotFoundException({
      code: 'ORDER_ITEM_NOT_FOUND',
      message: 'Item não encontrado neste pedido.',
    });
  }

  if (error instanceof StoreNotFoundError) {
    return new NotFoundException({ code: 'STORE_NOT_FOUND', message: 'Loja não encontrada.' });
  }

  if (error instanceof StoreNotActiveError) {
    return new ConflictException({
      code: 'STORE_NOT_ACTIVE',
      message: 'Esta loja ainda não está recebendo pedidos.',
    });
  }

  if (error instanceof StoreClosedError) {
    return new ConflictException({
      code: 'STORE_CLOSED',
      message: closedMessage(error.nextOpeningAt),
    });
  }

  if (error instanceof OfferUnavailableError) {
    return new ConflictException({
      code: 'OFFER_UNAVAILABLE',
      message: 'Um dos itens do seu carrinho não está mais disponível.',
    });
  }

  if (error instanceof OrderItemsInvalidError) {
    return new UnprocessableEntityException({
      code: 'ORDER_ITEMS_INVALID',
      message: 'Há itens inválidos no seu carrinho.',
      details: error.items.map((item) => ({
        field: `items.${String(item.index)}.offerId`,
        message: reasonMessage(item.reason),
      })),
    });
  }

  if (error instanceof AddressOutOfDeliveryAreaError) {
    return new UnprocessableEntityException({
      code: 'ADDRESS_OUT_OF_DELIVERY_AREA',
      message: 'Esta loja não entrega no seu endereço.',
    });
  }

  if (error instanceof TutorProfileRequiredError) {
    return new ConflictException({
      code: 'TUTOR_PROFILE_REQUIRED',
      message: 'Complete seu cadastro com telefone e endereço antes de pedir.',
    });
  }

  if (error instanceof InvalidOrderTransitionError) {
    return new ConflictException({
      code: 'ORDER_INVALID_TRANSITION',
      message: 'Este pedido não está mais nesse estado.',
    });
  }

  return error;
}

/**
 * The refusal says **when the store opens**, because "está fechada" alone sends
 * the person back to guess. The screen has `nextOpeningAt` from the quote and
 * writes its own sentence; this one is the orientation the API owes a caller
 * that is not the app.
 */
function closedMessage(nextOpeningAt: Date | null): string {
  if (!nextOpeningAt) {
    return 'Esta loja está fechada e não tem horário de funcionamento cadastrado.';
  }

  // Formatted in the store's timezone, never the server's: a server in UTC
  // would tell the tutor the shop opens at 11:00 (SYSTEM_ARCHITECTURE fixes the
  // fuso as America/Sao_Paulo).
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(nextOpeningAt);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  const weekday = read('weekday') || WEEKDAYS[nextOpeningAt.getDay()] || '';

  return `A loja está fechada agora. Abre ${weekday} às ${read('hour')}:${read('minute')}.`;
}

function reasonMessage(reason: OrderItemsInvalidError['items'][number]['reason']): string {
  switch (reason) {
    case 'DUPLICATED':
      return 'Este item aparece duas vezes no carrinho.';
    case 'OTHER_STORE':
      return 'Este item não é desta loja.';
    case 'INACTIVE_PRODUCT':
      return 'Este produto saiu do catálogo.';
    default:
      return 'Esta oferta não existe nesta loja.';
  }
}
