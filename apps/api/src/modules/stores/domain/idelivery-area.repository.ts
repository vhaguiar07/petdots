import type { DeliveryArea } from './delivery-area.js';
import type { StoreSummaryWithHours } from './store.js';

/** Injection token for the port — the domain never names its adapter. */
export const DELIVERY_AREA_REPOSITORY = Symbol('IDeliveryAreaRepository');

export interface DeliveryAreaOfStore {
  area: DeliveryArea;
  /**
   * Com a agenda: o comparador mostra "Fechada · abre …" por linha, e sem ela
   * seria uma consulta por loja só para responder "está aberta agora?".
   *
   * ⚠️ A rota `/delivery-areas` responde pelo `deliveryAreaWithStoreSchema`,
   * que usa o `storeSummarySchema` puro — o Zod descarta o campo a mais, então
   * a agenda não vaza para lá.
   */
  store: StoreSummaryWithHours;
}

export interface IDeliveryAreaRepository {
  /**
   * Every active area of every listable store — that is, every store whose
   * status is not `PAUSED`.
   *
   * `ACTIVE` governs placing an order (J3), not appearing in the comparator
   * (J2): the DOMAIN_MODEL invariant ties `ACTIVE` to a `psp_recipient_id`, so
   * requiring it would make every store invisible until the PSP exists, and
   * there would be no comparator before the checkout (ADR-0010, A12/P1).
   */
  findActiveOfListableStores(): Promise<DeliveryAreaOfStore[]>;
}
