import type { Order, OrderStatus } from '@petdots/contracts';
import { isOpenAt, nextOpeningAt, type OpeningInterval, zonedPartsOf } from '@petdots/domain';

import type { BadgeTone } from '../ui/primitives';

/**
 * How each state reads to a person, rather than to the database.
 *
 * ⚠️ The copy is the Victor's decision (the rule since pd-09); these are the
 * placeholders the screens ship with until he rewrites them.
 */
const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Aguardando a loja',
  ACCEPTED: 'Aceito',
  DISPATCHED: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
};

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PLACED: 'warning',
  ACCEPTED: 'accent',
  DISPATCHED: 'accent',
  DELIVERED: 'positive',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

/**
 * The label of an order, with the reason spelled out.
 *
 * "Recusado" alone would let the tutor believe the shop looked at their order
 * and said no, when in fact nobody answered — a different thing to know, and
 * the reason ADR-0014 C2 keeps the two reasons apart in the first place.
 *
 * ⚠️ A `cancellationReason` means the **store** cancelled: the tutor's own
 * cancellation carries none, because nobody owes an explanation for cancelling
 * something nobody has touched yet (ADR-0014, C4). The one exception is
 * `'all items unavailable'`, which the domain writes when the last line goes —
 * and "cancelado pela loja" is exactly right for that too.
 */
export function orderStatusLabel(
  order: Pick<Order, 'status' | 'rejectionReason' | 'cancellationReason'>,
): string {
  if (order.status === 'REJECTED' && order.rejectionReason === 'ACCEPTANCE_EXPIRED') {
    return 'Recusado — a loja não respondeu a tempo';
  }

  // pd-16: until now nothing could produce either of these, because the store
  // had no way to refuse or to cancel. Both need to read differently from the
  // expiry above — "a loja olhou e disse não" is a different fact from "ninguém
  // respondeu", and it is the distinction ADR-0014 C2 exists for.
  if (order.status === 'REJECTED' && order.rejectionReason === 'STORE_REJECTED') {
    return 'Recusado pela loja';
  }

  if (order.status === 'CANCELLED' && order.cancellationReason) {
    return 'Cancelado pela loja';
  }

  return STATUS_LABEL[order.status];
}

export function orderStatusTone(status: OrderStatus): BadgeTone {
  return STATUS_TONE[status];
}

const WEEKDAY_LABEL = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
] as const;

/** `HH:MM` in the store's timezone, never the device's. */
export function storeClock(instant: Date): string {
  const parts = zonedPartsOf(instant);

  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

/**
 * "Aberta agora" or "Fechada · abre segunda às 08:00".
 *
 * 🔴 Computed from the **same pure functions the server uses** to refuse an
 * out-of-hours order (`packages/domain`). A second implementation in the client
 * would eventually disagree with the API, and the tutor would be told the shop
 * is open by the page that is about to be told it is not.
 */
export function openingLabel(
  openingHours: readonly OpeningInterval[],
  now: Date = new Date(),
): string {
  if (isOpenAt(openingHours, now)) {
    return 'Aberta agora';
  }

  const opensAt = nextOpeningAt(openingHours, now);

  if (!opensAt) {
    return 'Fechada · sem horário cadastrado';
  }

  const parts = zonedPartsOf(opensAt);
  const weekday = WEEKDAY_LABEL[parts.weekday] ?? '';
  const today = zonedPartsOf(now);
  const when = parts.day === today.day && parts.month === today.month ? 'hoje' : weekday;

  return `Fechada · abre ${when} às ${storeClock(opensAt)}`;
}

export function isStoreOpen(
  openingHours: readonly OpeningInterval[],
  now: Date = new Date(),
): boolean {
  return isOpenAt(openingHours, now);
}

/**
 * "abre segunda às 08:00" — só a parte que interessa quando a loja está
 * fechada, sem repetir a palavra "Fechada" que o selo ao lado já diz.
 *
 * `null` quando a loja está aberta (não há o que dizer) ou quando não há agenda
 * cadastrada — nesse caso a tela mostra só o selo, porque "abre nunca" seria
 * uma frase pior do que o silêncio.
 *
 * 🔴 Computada no **cliente**, contra o relógio de quem lê. Um booleano
 * resolvido no servidor envelheceria: diria "aberta" às 3h numa página aberta
 * há uma hora. E usa as mesmas funções puras de `packages/domain` que o
 * servidor usa para recusar um pedido fora de hora — uma segunda implementação
 * acabaria discordando da API que está prestes a recusar o pedido.
 */
export function reopeningLabel(
  openingHours: readonly OpeningInterval[],
  now: Date = new Date(),
): string | null {
  if (isOpenAt(openingHours, now)) {
    return null;
  }

  const opensAt = nextOpeningAt(openingHours, now);

  if (!opensAt) {
    return null;
  }

  const parts = zonedPartsOf(opensAt);
  const today = zonedPartsOf(now);
  const sameDay = parts.day === today.day && parts.month === today.month;
  const when = sameDay ? 'hoje' : (WEEKDAY_LABEL[parts.weekday] ?? '');

  return `abre ${when} às ${storeClock(opensAt)}`;
}
