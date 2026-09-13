// PLACEHOLDER — hipóteses do ADR-0003, calibrar em campo ANTES de cobrar de
// uma loja real. O próprio ADR registra que "as faixas de take rate são
// hipóteses, não tabela final", e que a calibração com lojistas reais (as
// margens verdadeiras deles) precede o congelamento da tabela.

import type { SeedCommissionRate } from '../types.js';

/**
 * When the seeded table came into force. A fixed past date, not `new Date()`:
 * the seed is idempotent by `(category, valid_from)`, and a moving instant
 * would write a second row on every run.
 */
const VALID_FROM = new Date('2026-09-01T00:00:00.000Z');

/**
 * The commission table as the pilot seeds it, in basis points (600 = 6,00%).
 *
 * Every number is a **hypothesis** approved by the Victor on 13/09/2026 as
 * seed data, derived from the ranges of ADR-0003 under the "regra do ⅓" — the
 * commission never eats more than a third of the shop's gross margin in the
 * category:
 *
 * | Categoria | bps | De onde vem |
 * |---|---|---|
 * | `FOOD_STANDARD` | 600 | Faixa 5–6%; o cenário "ração pura" da IDEACAO §26 usa 6% |
 * | `FOOD_PREMIUM` | 900 | Meio da faixa 8–10% |
 * | `HYGIENE` | 800 | Fixo no ADR-0003 |
 * | `HEALTH_OTC` | 1200 | Piso da faixa 12–15%, conservador |
 * | `ACCESSORY` | 1200 | Piso da mesma faixa |
 * | `TREAT` | 1000 | ⚠️ **Não está no ADR-0003.** IDEACAO §26 põe "categorias de margem média" em 10–12% |
 *
 * ⚠️ The whole table is the cheapest thing in this repository to change, and
 * the one most likely to be wrong: it was set before a single shop owner was
 * asked. Changing a number here and re-running the seed is the whole procedure.
 */
export const PILOT_COMMISSION_RATES: readonly SeedCommissionRate[] = [
  { category: 'FOOD_STANDARD', rateBps: 600, validFrom: VALID_FROM },
  { category: 'FOOD_PREMIUM', rateBps: 900, validFrom: VALID_FROM },
  { category: 'HYGIENE', rateBps: 800, validFrom: VALID_FROM },
  { category: 'HEALTH_OTC', rateBps: 1200, validFrom: VALID_FROM },
  { category: 'ACCESSORY', rateBps: 1200, validFrom: VALID_FROM },
  { category: 'TREAT', rateBps: 1000, validFrom: VALID_FROM },
];
