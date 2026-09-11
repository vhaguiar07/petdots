import type { DeliveryAreaWithStore } from '@petdots/contracts';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Centavos inteiros viram reais só na tela — nunca no cálculo (ADR-0004 #11). */
export function formatCents(cents: number): string {
  return BRL.format(cents / 100);
}

/**
 * Prazo aproximado, porque é isso que ele é: "≈ 45 min", "≈ 1 h 10". Escrever
 * "45 minutos" sugere uma precisão que a entrega de bairro não tem.
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `≈ ${String(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (rest === 0) {
    return `≈ ${String(hours)} h`;
  }

  return `≈ ${String(hours)} h ${String(rest).padStart(2, '0')}`;
}

/** Os bairros atendidos pelo piloto, sem repetição, em ordem de pt-BR. */
export function distinctNeighborhoods(areas: DeliveryAreaWithStore[]): string[] {
  const neighborhoods = new Set(areas.flatMap((area) => area.neighborhoods));

  return [...neighborhoods].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
