import type { OpeningInterval } from '@petdots/domain';

import { isStoreOpen, openingLabel, orderStatusLabel, reopeningLabel } from './order-labels';

/**
 * Os instantes são escolhidos em UTC, mas as funções raciocinam no fuso da loja
 * (`America/Sao_Paulo`, UTC−3, fixo por `SYSTEM_ARCHITECTURE`). Então
 * `12:00Z` é **09:00** no balcão — e é por isso que cada constante abaixo diz a
 * hora local junto.
 */
const SEGUNDA_09H = new Date('2026-09-14T12:00:00.000Z'); // segunda, 09:00 local
const SEGUNDA_21H = new Date('2026-09-15T00:00:00.000Z'); // segunda, 21:00 local
const DOMINGO_10H = new Date('2026-09-13T13:00:00.000Z'); // domingo, 10:00 local

/** Seg–sáb, 08:00–19:00 — a agenda fictícia do piloto. */
const COMERCIAL: OpeningInterval[] = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: '08:00',
  closes: '19:00',
}));

describe('isStoreOpen', () => {
  it('diz aberta dentro da faixa', () => {
    expect(isStoreOpen(COMERCIAL, SEGUNDA_09H)).toBe(true);
  });

  it('diz fechada fora da faixa', () => {
    expect(isStoreOpen(COMERCIAL, SEGUNDA_21H)).toBe(false);
    expect(isStoreOpen(COMERCIAL, DOMINGO_10H)).toBe(false);
  });

  it('🔴 agenda vazia é sempre fechada — falha fechada', () => {
    expect(isStoreOpen([], SEGUNDA_09H)).toBe(false);
  });
});

describe('reopeningLabel', () => {
  it('🔴 não diz nada quando a loja está aberta: o selo só existe para a exceção', () => {
    expect(reopeningLabel(COMERCIAL, SEGUNDA_09H)).toBeNull();
  });

  it('diz o dia da semana quando a reabertura é em outro dia', () => {
    // Segunda 21:00 → abre terça às 08:00.
    expect(reopeningLabel(COMERCIAL, SEGUNDA_21H)).toBe('abre terça às 08:00');
  });

  it('diz "hoje" quando a loja ainda abre no mesmo dia', () => {
    // Segunda 06:00 local, antes de abrir às 08:00.
    const segundaCedo = new Date('2026-09-14T09:00:00.000Z');

    expect(reopeningLabel(COMERCIAL, segundaCedo)).toBe('abre hoje às 08:00');
  });

  it('atravessa o domingo, em que a loja não abre', () => {
    expect(reopeningLabel(COMERCIAL, DOMINGO_10H)).toBe('abre segunda às 08:00');
  });

  it('🔴 fica em silêncio sem agenda cadastrada, em vez de dizer "abre nunca"', () => {
    expect(reopeningLabel([], SEGUNDA_09H)).toBeNull();
  });

  it('respeita o intervalo de almoço', () => {
    const comAlmoco: OpeningInterval[] = [
      { weekday: 1, opens: '08:00', closes: '12:00' },
      { weekday: 1, opens: '14:00', closes: '19:00' },
    ];
    // Segunda, 13:00 local — dentro do almoço.
    const almoco = new Date('2026-09-14T16:00:00.000Z');

    expect(isStoreOpen(comAlmoco, almoco)).toBe(false);
    expect(reopeningLabel(comAlmoco, almoco)).toBe('abre hoje às 14:00');
  });
});

describe('openingLabel', () => {
  it('continua sendo a frase inteira, para a vitrine da loja', () => {
    expect(openingLabel(COMERCIAL, SEGUNDA_09H)).toBe('Aberta agora');
    expect(openingLabel(COMERCIAL, SEGUNDA_21H)).toBe('Fechada · abre terça às 08:00');
    expect(openingLabel([], SEGUNDA_09H)).toBe('Fechada · sem horário cadastrado');
  });
});

describe('orderStatusLabel', () => {
  it('🔴 separa "a loja disse não" de "ninguém respondeu"', () => {
    expect(
      orderStatusLabel({
        status: 'REJECTED',
        rejectionReason: 'STORE_REJECTED',
        cancellationReason: null,
      }),
    ).toBe('Recusado pela loja');

    expect(
      orderStatusLabel({
        status: 'REJECTED',
        rejectionReason: 'ACCEPTANCE_EXPIRED',
        cancellationReason: null,
      }),
    ).toBe('Recusado — a loja não respondeu a tempo');
  });

  it('distingue o cancelamento da loja do cancelamento do tutor pelo motivo', () => {
    expect(
      orderStatusLabel({
        status: 'CANCELLED',
        rejectionReason: null,
        cancellationReason: 'cliente ligou',
      }),
    ).toBe('Cancelado pela loja');

    expect(
      orderStatusLabel({ status: 'CANCELLED', rejectionReason: null, cancellationReason: null }),
    ).toBe('Cancelado');
  });
});
