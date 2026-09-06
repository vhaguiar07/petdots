---
title: "ADR-0004: Arquitetura do MVP marketplace"
status: accepted
version: 1.0
updated: 2026-09-03
scope: >
  Registra as decisões arquiteturais que materializam o MVP marketplace
  (módulos, agregados e fronteiras), substituindo o desenho da v1.0 do
  SYSTEM_ARCHITECTURE, que servia ao produto "Vida do Pet". A stack do
  ADR-0002 permanece válida e não é reaberta aqui.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
type: decision
---

# ADR-0004: Arquitetura do MVP marketplace

## Contexto

A estratégia alinhada entre os sócios (IDEACAO_FASE1, Parte 4) e a monetização
decidida no ADR-0003 tornaram o marketplace hiperlocal o produto inicial. O
`DOMAIN_MODEL` v1.0 e o `SYSTEM_ARCHITECTURE` v1.0 descreviam outro produto
(Pet, Timeline, Carteira Digital, Parceiro polimórfico) e declaravam o comércio
como capacidade futura. Faltava, portanto, a arquitetura do que será
efetivamente construído — sem o que qualquer implementação (humana ou assistida
por IA) partiria dos documentos errados.

A stack (TypeScript, monorepo, NestJS, PostgreSQL, Prisma, Zod, REST/OpenAPI,
Expo/RN, jobs in-process, OpenTelemetry) foi reavaliada e **serve ao
marketplace sem alteração** — o ADR-0002 não é reaberto.

## Decisão

Materializada em `DOMAIN_MODEL` v2.0 e `SYSTEM_ARCHITECTURE` v2.0. As decisões
com impacto arquitetural, uma a uma:

1. **Onze módulos, um por agregado:** `identity`, `tutors`, `catalog`,
   `stores`, `offers`, `orders`, `payments`, `delivery`, `replenishment`,
   `notifications`, `waitlist`.
2. **`Store` concreta em vez de `Partner` polimórfico.** No MVP existe um único
   tipo de parceiro (petshop). A generalização entra quando o segundo tipo
   existir.
3. **Catálogo mestre (`Product`, da plataforma) separado de oferta (`Offer`, da
   loja)** — módulos distintos, porque os donos do dado são distintos. A loja
   nunca edita produto; só preço e disponibilidade.
4. **A categoria do produto carrega a comissão.** `commission_rates` por
   categoria, historizada, com `store_commission_rates` como override por loja
   (materializa a tarifa de fundador).
5. **Pedido é registro contábil imutável, com snapshot** de preço, categoria e
   taxa de comissão por item. Mudança futura de preço ou de tabela nunca altera
   pedido existente.
6. **Um pedido, uma loja** — não há carrinho multi-loja no MVP.
7. **Comissão zero para cliente próprio via `acquisition_channel`**
   (`PLATFORM` | `STORE_REFERRAL`), derivado do `referral_code` da loja.
8. **O dinheiro não passa pela API:** ela cria intenção no PSP com regra de
   split e só considera pago no **webhook** (assinado, idempotente por
   `psp_payment_id`, com payload persistido). Sem `payment.captured`, sem
   repasse.
9. **Área de entrega por bairro/faixa de CEP** (`delivery_areas`), sem
   PostGIS.
10. **Pet enxuto, a serviço da reposição** (peso, consumo); `Pet.id` imutável
    preserva a evolução para a carteira do pet. Timeline e Carteira Digital
    ficam fora do MVP.
11. **Dinheiro em centavos inteiros (`*_cents`) e percentuais em pontos-base
    (`*_bps`)**, nunca ponto flutuante.
12. **Regras puras em `packages/domain`** (cálculo de comissão e calculadora de
    consumo), livres de framework e cobertas por teste unitário.
13. **`apps/landing` em Next.js** desde já, separada do cliente universal: a
    landing do smoke test e as páginas públicas do comparador precisam de SEO,
    e essa necessidade é independente do spike-gate do RN-Web.

## Alternativas consideradas

- **Manter `Partner` polimórfico desde o MVP** (herança ou papéis): descartado —
  paga hoje a complexidade de um problema da fase 2, sem nenhum segundo tipo de
  parceiro para justificá-la. *Custo aceito:* uma migração quando `partners`
  nascer.
- **Produto por loja (cada loja cadastra o seu):** descartado — destrói o
  comparador de preços (sem produto comum não há comparação), inviabiliza take
  rate por categoria e joga sobre o lojista o trabalho de cadastrar milhares de
  SKUs, que é justamente o atrito que o catálogo mestre existe para remover.
- **Calcular comissão na leitura (sem snapshot):** descartado — tornaria o
  histórico financeiro instável a cada recalibração da tabela, que sabemos que
  vai acontecer.
- **Carrinho multi-loja:** descartado no MVP — multiplicaria entregas, splits e
  estados de pedido por loja; ganho de conveniência pequeno num piloto de
  bairro.
- **PostGIS para área de entrega:** descartado agora — bairro/CEP resolve o
  piloto e não adiciona infraestrutura. *Gatilho de reversão:* necessidade de
  distância/rota real.
- **Confiar no retorno do cliente para dar pedido como pago:** descartado —
  risco de fraude e de inconsistência contábil.
- **Manter o desenho da v1.0 e "adaptar depois":** descartado — é a origem do
  problema que este ADR corrige.

## Consequências

**Positivas:** o que será codificado está descrito com precisão suficiente para
implementação assistida por IA; as regras de negócio do ADR-0003 (take rate por
categoria, tarifa de fundador, comissão zero) têm lugar explícito no modelo;
fronteiras de dono de dado viram fronteiras de código (`StoreScopeGuard`,
catálogo vs. oferta); a stack não muda, então nada do ADR-0002 é desperdiçado.

**Negativas / custos aceitos:** a curadoria centralizada do catálogo é gargalo
operacional da plataforma no piloto (mitigação futura: sugestão de produto pelo
lojista com aprovação); a migração `stores` → `partners` virá na fase 2; o
snapshot duplica dados por desenho; a área de entrega por bairro/CEP é
aproximação grosseira de um polígono real.

**Impacto documental:** `DOMAIN_MODEL` v2.0 e `SYSTEM_ARCHITECTURE` v2.0
reescritos. `MVP_SCOPE`, `PRODUCT_ROADMAP` e `PERSONAS` seguem marcados como
defasados até a re-sincronização (item A3 da fila estratégica); `GLOSSARY`
precisa receber os termos novos (Loja, Oferta, Repasse, Agenda de Reposição).

## Status

`accepted`
