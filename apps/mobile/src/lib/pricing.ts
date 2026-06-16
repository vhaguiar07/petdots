import type { Product } from '@petdots/shared';

/**
 * Calcula o preço unitário considerando a melhor promoção ativa do produto,
 * espelhando a lógica de `OrdersService.bestDiscountPerUnit` no backend.
 * O valor final só é confirmado no checkout (cálculo feito pela API).
 */
export function getEffectiveUnitPrice(product: Product): number {
  const originalPrice = Number(product.price);
  const now = new Date();

  const promotions = product.promotions ?? [];
  let bestDiscount = 0;

  for (const promo of promotions) {
    if (!promo.isActive) continue;
    if (promo.productId !== null && promo.productId !== product.id) continue;
    if (new Date(promo.startsAt) > now || new Date(promo.endsAt) < now) continue;

    const discount =
      promo.discountType === 'PERCENTAGE'
        ? originalPrice * (Number(promo.value) / 100)
        : Number(promo.value);

    if (discount > bestDiscount) {
      bestDiscount = discount;
    }
  }

  return Math.max(originalPrice - Math.min(bestDiscount, originalPrice), 0);
}

export function hasActiveDiscount(product: Product): boolean {
  return getEffectiveUnitPrice(product) < Number(product.price);
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
