---
title: "ADR-0014: O ciclo do dinheiro no pedido — captura, prazo de aceite, ajuste e cancelamento"
status: stable
version: "1.0"
updated: 2026-09-12
scope: >
  Fecha as quatro pendências de modelagem que bloqueavam orders e payments: o
  momento da captura do Pix, o prazo de aceite com auto-recusa, o ajuste do
  pedido quando falta item, a política de cancelamento e o horário de
  funcionamento da loja que o prazo pressupõe. Registra a entidade Refund, a
  regra de que o repasse é calculado sobre o que foi entregue, e o que
  deliberadamente fica de fora do MVP. É decisão de produto e de modelagem,
  tomada pelo Victor; não implementa nada — orders é a pd-15 e payments a pd-17.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 01-product/USER_JOURNEYS.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 07-process/BACKLOG.md
type: decision
---

# ADR-0014: O ciclo do dinheiro no pedido — captura, prazo de aceite, ajuste e cancelamento

## Contexto

O [`BACKLOG`](../../07-process/BACKLOG.md) §"Decisões pendentes (modelagem)"
listava nove decisões que o MVP assume e nunca modelou. **Quatro delas travavam
`orders` e `payments`** e são resolvidas aqui:

| Pendência | Por que o MVP não opera sem ela |
|---|---|
| Estorno e ajuste de pedido | O Pix é capturado antes do aceite; recusa ou item em falta deixam o cliente pago a mais, sem caminho de volta |
| Prazo de aceite e auto-recusa | Pedido pago que ninguém aceita é o pior caso possível: dinheiro do cliente parado sem saída |
| Política de cancelamento | `CANCELLED` existe no enum; quem pode, até quando e o que acontece com o dinheiro, não |
| Horário de funcionamento da loja | Sem agenda semanal, o pedido das 22h entra numa loja fechada — e nenhum prazo de aceite faz sentido |

**Um ADR e não quatro, deliberadamente.** As quatro são a mesma pergunta vista
de ângulos diferentes: *o dinheiro entra antes de a loja confirmar, e o que
acontece quando a confirmação não vem como se esperava*. Escritas em separado,
cada uma precisaria citar as outras três para ser compreensível, e a primeira a
ser implementada arrastaria as demais de qualquer jeito. O `BACKLOG` pedia "ADR
próprio antes da implementação correspondente"; a implementação correspondente é
a mesma — `orders` (`pd-15`) e `payments` (`pd-17`).

### A escolha que produz as quatro pendências

O fluxo 1 do [`SYSTEM_ARCHITECTURE`](../../02-architecture/SYSTEM_ARCHITECTURE.md)
captura o dinheiro **antes** de a loja aceitar:

```
orders.place() → payments.createIntent() → [webhook] payment.captured
   → order.status = PLACED → notifica a loja → loja aceita (ACCEPTED)
```

O tutor paga antes de alguém confirmar que o produto existe e que a loja vai
atender. As quatro pendências são sintomas disso, e por isso a primeira decisão
é sobre o momento da captura: mudá-lo faria duas delas evaporarem.

### Dois fatos do desenho atual que decidem o resto

**(a) O repasse só acontece em `DELIVERED`.** É o que o fluxo 1 já diz —
`payouts.settle()` depois da entrega — e o `SECURITY` reforça com "sem
`payment.captured`, sem repasse". A consequência importa: **entre a captura e a
entrega o dinheiro está retido na plataforma**, não na subconta da loja.
Devolver ao cliente nessa janela não exige puxar dinheiro de volta de ninguém.

**(b) O Pix tem devolução nativa.** Total ou parcial, pela API do PSP, sem
chargeback e sem disputa — foi por isso que o
[ADR-0003](0003-monetizacao-piloto-e-split-pagamento.md) o escolheu. O estorno é
trabalho de integração, não um buraco tecnológico.

## Decisão

### C1 — A captura continua **antes** do aceite, com devolução automática

Nada muda no fluxo 1. O que nasce é o caminho de volta, e ele é **automático**:
nenhuma devolução do MVP depende de alguém lembrar de apertar um botão.

**Por quê:** o ADR-0003 escolheu Pix por liquidação instantânea, e "paga e
pronto" é o que o tutor de bairro espera. Capturar depois do aceite criaria um
estado novo e frágil — pedido aceito e não pago, com a loja já tendo separado —
que penaliza justamente o **lado frágil do marketplace**, a persona da oferta. E
o fato (a) acima torna a devolução barata: o dinheiro ainda está conosco.

### C2 — Agenda semanal da loja, e 15 minutos para aceitar dentro dela

- **`Store` ganha horário de funcionamento**: faixas por dia da semana, com
  intervalo permitido (a loja que fecha para almoço). Fuso `America/Sao_Paulo`,
  fixo no MVP — o piloto é um eixo de bairros do Rio.
- **Fora do horário, o pedido não é criado.** O checkout recusa antes de cobrar,
  dizendo quando a loja abre. Cobrar para depois auto-recusar seria criar o
  problema que este ADR existe para evitar.
- **Dentro do horário, a loja tem 15 minutos** para aceitar. O relógio **só
  corre em horário de funcionamento**: um pedido às 18h55 de uma loja que fecha
  às 19h não é auto-recusado às 19h10, ele retoma a contagem na abertura
  seguinte.
- **Vencido o prazo: auto-recusa com devolução total automática.** O pedido vai
  a `REJECTED`, com motivo distinguindo recusa da loja de expiração do prazo.

**Por quê 15 minutos:** é o número que equilibra o tutor esperando com o dinheiro
debitado e a dona que está atendendo no balcão. É **default reversível** por
configuração, e a calibração é de campo, como as faixas de take rate do
ADR-0003.

### C3 — Item em falta: devolução parcial automática, pedido segue

A loja marca o item como `UNAVAILABLE` (o valor já existe em `ItemFulfillment`).
Então:

1. o item sai do que será entregue, **sem edição do `OrderItem`** — o snapshot é
   imutável; o que muda é o `fulfillment` da linha;
2. nasce um registro de **`Refund`** com o valor daquele item;
3. o pedido **continua** com o restante;
4. se **nenhum** item sobrar, o pedido vai a `CANCELLED` com devolução total.

🔴 **Não existe reversão de comissão, e é aqui que o desenho se paga.** Como o
repasse só é calculado em `DELIVERED`, o `Payout` nasce **sobre os itens
efetivamente entregues** — os `FULFILLED`. Não há nada a estornar, porque nada
foi repassado ainda. O `commission_total_cents` do pedido permanece como
snapshot histórico do que foi comprado; quem paga a loja é o cálculo do repasse,
e ele olha o que saiu da prateleira.

**Substituição assistida fica para depois.** O `ItemFulfillment.SUBSTITUTED`
continua no modelo e **sem produtor** no MVP: substituir exige um canal de
conversa dentro do pedido para o tutor aceitar ou recusar, e esse canal não
existe — é lacuna registrada em `IDEIAS`. Gatilho para voltar: **existir canal
de atendimento no pedido**.

### C4 — Cancelamento: livre até o aceite, negociado depois

| Momento | Quem pode | Dinheiro |
|---|---|---|
| Antes do aceite | **Tutor**, por botão | Devolução **total**, automática |
| Depois do aceite | **A loja**, a pedido do tutor pelo telefone dela | Devolução total, registrada como `CANCELLED` com motivo |
| Depois do despacho | Ninguém cancela | O caso vira problema de entrega, fora deste ADR |

**Por quê:** antes do aceite ninguém separou nada, e segurar o dinheiro de quem
se arrependeu não protege ninguém. Depois do aceite a loja já gastou trabalho, e
um botão unilateral transferiria esse custo para o lado que o piloto não pode
perder.

⚠️ **O "pelo telefone dela" é uma consequência assumida**, não um desenho: não
há canal de atendimento dentro do pedido no MVP. Está registrado em `IDEIAS`
como lacuna, e é o mesmo gatilho da substituição assistida.

### C5 — A entidade que materializa tudo isso: `Refund`

Devolução é **registro novo**, nunca edição — é o que o `DOMAIN_MODEL` manda
para dado sob retenção fiscal, e é o que mantém o pedido sendo registro
contábil.

`Refund`: `id`, `payment_id`, `order_id`, `reason` (`RefundReason`:
`STORE_REJECTED`, `ACCEPTANCE_EXPIRED`, `TUTOR_CANCELLED`, `STORE_CANCELLED`,
`ITEM_UNAVAILABLE`), `amount_cents`, `status` (`RefundStatus`: `PENDING`,
`COMPLETED`, `FAILED`), `psp_refund_id`, `created_at`, `completed_at`.

Três regras que nascem com ela:

- **Um pedido pode ter mais de um `Refund`** (dois itens em falta, dois
  registros). A soma nunca ultrapassa o `amount_cents` do `Payment` — invariante
  verificada na raiz do agregado.
- **A devolução é idempotente**, por `psp_refund_id` e por `UPDATE … WHERE
  status = 'PENDING'`, no precedente da rotação do refresh token (ADR-0011): a
  condição vive no próprio comando, para que duas execuções do job não devolvam
  duas vezes.
- **`PaymentStatus.REFUNDED`** passa a significar "devolvido integralmente".
  Devolução parcial deixa o `Payment` em `CAPTURED` e vive nos `Refund`.

### C6 — O que a devolução parcial **não** devolve

Num ajuste por item em falta, voltam **apenas os itens**. A **taxa de entrega**
e a **taxa de serviço** ficam: a entrega acontece do mesmo jeito e o serviço foi
prestado. Na devolução **total** (recusa, expiração, cancelamento) volta
**tudo**, taxas incluídas.

⚠️ **É a decisão mais contestável deste ADR, e fica registrada como tal.** O
caso ruim é concreto: pedido de cinco itens em que sobra um de R$ 5, com R$ 8 de
entrega — o tutor paga R$ 14,99 por R$ 5 de produto. **Default reversível**, com
gatilho nomeado: *primeira reclamação real de proporção*. A correção provável é
oferecer o cancelamento total quando o ajuste derrubar o pedido abaixo de um
piso, e ela não se desenha bem sem um caso de verdade na mão.

### C7 — A auto-recusa é um job, e ele já tem casa

Varredura periódica dos pedidos em `PLACED` com prazo vencido, no **scheduler
in-process com advisory lock no Postgres** que o `TECHNOLOGY_STACK` já prevê
para os lembretes de reposição. Sem BullMQ, sem Redis, sem infraestrutura nova
(ADR-0002). O job é reentrante por construção: a transição `PLACED → REJECTED` é
condicional ao status atual, então duas execuções simultâneas produzem uma
recusa só.

### O que este ADR **não** decide

- **Cupom de aquisição, extrato de repasse, notificação transacional,
  obrigações fiscais do split e console de administração** continuam pendentes,
  cada um no `BACKLOG`. Nenhum deles bloqueia `orders`.
- **Chargeback** segue fora: o ADR-0003 escolheu Pix-first justamente por não
  haver, e o gatilho continua sendo *cartão de crédito entrar*.
- **Canal de atendimento no pedido** não nasce aqui, e duas decisões acima
  apontam para a falta dele (C3 e C4).
- **Nada é implementado.** `orders` é a `pd-15`; `payments`, a `pd-17`.

## Alternativas consideradas

- **Capturar o Pix depois do aceite da loja** — descartada pelo Victor. Mataria
  a recusa com dinheiro preso e a auto-recusa com estorno, que é ganho real. Foi
  preterida por dois custos: o tutor precisaria voltar ao app para pagar, e a
  janela entre "pedi" e "paguei" é onde o pedido de delivery evapora; e a loja
  passaria a separar pedido que pode nunca ser pago, penalizando o lado frágil
  do marketplace. Fica registrada como a saída se a devolução automática se
  mostrar cara ou frágil na operação real.
- **Devolução manual no painel do PSP durante o piloto** — descartada. Era a mais
  barata de construir, e põe o único fundador de rua no caminho crítico do
  dinheiro de terceiros, num trabalho que não perdoa esquecimento.
- **Prazo de aceite de 30 a 60 minutos** — descartada. Daria folga à dona que
  está no balcão, ao custo de o tutor esperar com o dinheiro debitado sem saber
  se o pedido vale.
- **Horário comercial fixo, igual para todas as lojas, em vez de agenda por
  loja** — descartada. Evitaria construir a agenda agora, mas erra para quem
  abre sábado à tarde ou fecha segunda, que é comum em petshop de bairro.
- **Substituição assistida no lugar da devolução parcial** — descartada por C3,
  com gatilho nomeado. É melhor para a margem da loja e para o tutor que precisa
  do produto, e exige um canal de conversa no pedido que o MVP não tem.
- **Recusa integral quando falta um item** — descartada. A regra mais simples de
  todas, e joga fora a venda inteira por causa de uma lata de ração.
- **Cancelamento livre até o despacho** — descartada por C4: transfere para a
  loja o custo de ter separado o pedido à toa.
- **Sem cancelamento pelo tutor no MVP** — descartada: deixaria o `CANCELLED` do
  modelo sem ninguém que o produza, e todo arrependimento viraria conversa com o
  Victor.

## Consequências

**Positivas**

- **Quatro pendências de modelagem saem do `BACKLOG` de uma vez**, e com elas o
  que bloqueava a `pd-15`. A trinca que o `IDEIAS` chamava de "pior pedido do
  piloto" — sem estorno, sem prazo, sem horário — deixa de existir.
- **Nenhum dinheiro fica preso sem saída.** Todo caminho que não termina em
  entrega termina em devolução automática.
- **A reversão de comissão simplesmente não precisa existir**, porque o repasse
  é calculado sobre o entregue. É a consequência de o `payout` sair só em
  `DELIVERED`, que já estava decidido — este ADR apenas a torna explícita.
- `PaymentStatus.REFUNDED` e `ItemFulfillment.UNAVAILABLE`, que estavam no
  modelo sem nada que os produzisse, ganham produtor.

**Negativas, aceitas**

- **A devolução parcial não devolve as taxas** (C6), e existe um caso
  desproporcional conhecido. Default reversível, com gatilho registrado.
- **Cancelar depois do aceite passa pelo telefone da loja**, porque não há canal
  de atendimento no pedido. É a desintermediação que o `IDEIAS` já alertava:
  quando dá problema, o tutor aprende a resolver direto com a dona.
- **A agenda semanal é trabalho novo de onboarding** para o lojista, e mais um
  campo que pode ficar errado. Sem ela, porém, o prazo de aceite não existe.
- **`SUBSTITUTED` continua sem produtor.** O enum permanece no modelo apontando
  para um caminho que o MVP não percorre, com o gatilho nomeado.
- **O relógio que pausa fora do horário é mais difícil de testar** do que um
  prazo corrido. É onde o teste de `orders` precisa de cuidado: fuso, virada de
  dia e loja fechada.

## Status

`accepted` — 12/09/2026. Decisão do **Victor**, sobre recomendação da IA, em
conversa própria fora de branch de tarefa. Nenhuma linha de código foi escrita:
`orders` é a `pd-15` e `payments` a `pd-17`.
