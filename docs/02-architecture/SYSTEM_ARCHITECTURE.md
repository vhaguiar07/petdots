---
title: System Architecture
status: stable
version: "2.1"
updated: 2026-09-11
scope: >
  Visão de componentes do PetDots e suas interações no MVP marketplace: a
  topologia do Modular Monolith (módulos por agregado), a estrutura do
  monorepo, os clientes, a camada de contrato, dados, pagamentos, jobs e
  observabilidade, e os fluxos principais. Descreve a forma do sistema; não
  decide a stack (ADR-0002/TECHNOLOGY_STACK), os princípios
  (ARCHITECTURAL_PRINCIPLES) nem as metas (QUALITY_ATTRIBUTES).
relates_to:
  - 02-architecture/TECHNICAL_VISION.md
  - 02-architecture/ARCHITECTURAL_PRINCIPLES.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 01-product/DOMAIN_MODEL.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md
type: architecture
---

# PetDots — System Architecture

> **v2.1 (2026-09-11, `pd-11`).** O **Fluxo 2 (comparador)** passa a descrever o
> caminho implementado, que não faz JOIN cruzando módulo; a seção **Dados**
> ganha os índices e as constraints que existem de fato, e a busca de produto
> passa de "full-text `tsvector`" para "coluna normalizada + `LIKE`", com o
> gatilho nomeado para o `tsvector` (ADR-0010). O critério do spike-gate foi
> revisado e fechado.

> **v2.0 (2026-09-03).** Reescrita para o MVP marketplace. A v1.0 desenhava os
> módulos do produto "Vida do Pet" (`pets`, `notifications`, `partners` stub);
> a stack do [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md)
> **permanece integralmente válida** — o que muda são os módulos, os dados e os
> fluxos. Decisões desta reescrita: [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md).

---

## Visão de alto nível

```
  ┌────────────────────────┐   ┌────────────────────────┐   ┌──────────────────┐
  │  App do Tutor           │   │  Painel do Lojista     │   │  Landing pública │
  │  Expo + RN (+ RN Web)   │   │  (mesmo app, papel     │   │  Next.js (SEO,   │
  │  iOS · Android · Web    │   │   STORE_MEMBER)        │   │  smoke test)     │
  └───────────┬────────────┘   └───────────┬────────────┘   └────────┬─────────┘
              │                            │                          │
              └────────────┬───────────────┴──────────────────────────┘
                           │  HTTPS · REST/OpenAPI (tipos derivados de Zod)
                           ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │                      API — NestJS (Modular Monolith)                       │
  │  transversais: AuthGuard · RolesGuard · StoreScopeGuard · Zod ·            │
  │                Audit · Idempotency · OpenTelemetry                         │
  │                                                                            │
  │  identity │ tutors │ catalog │ stores │ offers │ orders │ payments │       │
  │  delivery │ replenishment │ notifications │ waitlist                       │
  └───┬───────────────┬──────────────────┬─────────────────┬──────────────────┘
      │ Prisma        │ webhooks/API     │ mensagens       │ OTLP
      ▼               ▼                  ▼                 ▼
 ┌───────────┐  ┌──────────────┐  ┌────────────────┐  ┌───────────────┐
 │PostgreSQL │  │ PSP (split)  │  │ WhatsApp/Push  │  │ Observabilidade│
 │  (único)  │  │ Asaas/MP     │  │  (provedor)    │  │  (gerenciado)  │
 └───────────┘  └──────────────┘  └────────────────┘  └───────────────┘
```

Nenhum cliente acessa banco ou PSP diretamente: tudo passa pelo contrato da
API. O dinheiro **nunca** é movimentado pela API — ela orquestra o PSP, que
executa o split e confirma por webhook.

---

## Estrutura de módulos (MVP)

Um módulo por agregado-raiz do [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md),
mais suporte. Cada módulo é dono exclusivo das suas tabelas (princípio P2).

| Módulo | Responsabilidade | Tabelas próprias |
|---|---|---|
| **identity** | Cadastro, login, JWT/refresh, Google OAuth, papéis | `users` |
| **tutors** | Perfil do tutor, endereços, pets | `tutors`, `pets` |
| **catalog** | Catálogo mestre por EAN, categorias, tabela de comissão | `products`, `commission_rates` |
| **stores** | Loja, membros, áreas de entrega, onboarding, código de indicação | `stores`, `store_members`, `delivery_areas`, `store_commission_rates` |
| **offers** | Preço e disponibilidade por loja; **busca e comparador** | `offers` |
| **orders** | Carrinho→pedido, máquina de estados, cálculo de comissão, substituição | `orders`, `order_items` |
| **payments** | Intenção de pagamento no PSP, split, webhooks, repasses | `payments`, `payouts` |
| **delivery** | Elegibilidade de endereço, taxa, despacho, status | `deliveries` |
| **replenishment** | Calculadora de consumo, agendas, projeção de término | `replenishment_schedules` |
| **notifications** | Lembretes e avisos transacionais (push/WhatsApp), idempotência | `reminders` |
| **waitlist** | Captura da landing e de endereços fora de área | `waitlist_entries` |

> **Por que `offers` é módulo separado de `catalog`:** são dois donos
> diferentes. O catálogo é da plataforma (curadoria); a oferta é da loja
> (preço). Separar torna o comparador (Joia 2) uma consulta natural sobre
> `offers` e mantém a regra "a loja nunca edita o produto" como fronteira de
> código, não como disciplina.

### Camadas internas de um módulo

`controller` (HTTP + Zod/OpenAPI) → `application` (casos de uso) → `domain`
(entidades e invariantes, sem framework) → `infra` (repositório Prisma).
Dependências apontam para o domínio (P1). Clean Architecture aplicada onde paga.

---

## Estrutura do monorepo

```
petdots/
├── apps/
│   ├── api/                  # NestJS — o monolito modular
│   │   └── src/modules/{identity,tutors,catalog,stores,offers,
│   │                     orders,payments,delivery,replenishment,
│   │                     notifications,waitlist}/
│   │       └── <módulo>/{controller,application,domain,infra}/
│   ├── app/                  # Expo + React Native (+ RN Web) — tutor e lojista
│   └── landing/              # Next.js — landing pública/SEO e smoke test
├── packages/
│   ├── contracts/            # schemas Zod + OpenAPI gerado + tipos do cliente
│   ├── domain/               # tipos e regras puras compartilháveis (cálculo de
│   │                         # comissão, calculadora de consumo)
│   ├── config/               # eslint, tsconfig, prettier compartilhados
│   └── ui/                   # componentes compartilhados (se o spike-gate aprovar RN-Web)
├── prisma/                   # schema.prisma + migrations
└── docs/
```

Regras de fronteira: `apps/*` dependem de `packages/*`, nunca o contrário; nada
em `packages/domain` importa framework (é onde vivem as regras que precisam de
teste unitário puro — comissão e consumo à frente).

---

## Fluxos principais

### 1. Pedido ponta a ponta (o caminho crítico)

```
Tutor escolhe loja e itens
   └─ delivery.checkAddress(endereço, loja) → área ativa? taxa?
      └─ orders.place()  ─ valida ofertas disponíveis, loja ACTIVE
                         ─ calcula comissão por item (categoria → commission_rates,
                           com override de store_commission_rates; zero se
                           acquisition_channel = STORE_REFERRAL)
                         ─ grava SNAPSHOT de preço, categoria e comissão
         └─ payments.createIntent() → PSP (Pix + regra de split)
            └─ [webhook] payment.captured
               └─ order.status = PLACED → notifica a Loja (WhatsApp + push)
                  └─ Loja aceita (ACCEPTED) ─ pode marcar item indisponível
                     │                        → substituição assistida
                     └─ despacha (DISPATCHED) → entrega (DELIVERED)
                        ├─ payouts.settle()  (repasse à loja)
                        └─ replenishment.update()  ← alimenta a recorrência
```

Pontos não negociáveis: **snapshot** de valores no pedido; **idempotência** por
chave na criação do pedido e no webhook do PSP; **nenhum repasse sem
`payment.captured`**.

### 2. Comparador de preços (Joia 2)

> **Implementado na `pd-11`** (ADR-0010). O caminho real, abaixo, substitui o
> "junta `offers` × `stores`" que esta seção descrevia: **não há JOIN cruzando
> fronteira de módulo**.

`GET /api/v1/offers?productId=&neighborhood=&postalCode=` →
`offers.CompareOffersUseCase`:

1. chama `catalog.FindProductUseCase` (404 `PRODUCT_NOT_FOUND` se não existir);
2. chama `stores.FindDeliveryCoverageUseCase`, que carrega **todas** as áreas
   ativas de lojas com `status ≠ PAUSED` e filtra com `areaCoversAddress` — em
   memória, não em SQL;
3. consulta a **própria** tabela `offers` pelos `store_id` que sobraram;
4. junta em memória e ordena por **preço entregue** (item + taxa), desempatando
   por prazo e nome da loja.

Cada módulo só acessa as próprias tabelas e integra com o outro por caso de uso
(`CODING_STANDARDS`). O custo é duas consultas pequenas a mais por comparação.

**Gatilho para levar a cobertura ao SQL:** mais de ~200 áreas de entrega ativas.
Enquanto o piloto tem dezenas, a regra fica onde o ADR-0004 #12 a quer — função
pura em `packages/domain`, com teste unitário.

Renderizado na `landing` em `/precos` (busca) e `/precos/[productSlug]`
(comparação), server components com formulário `GET` puro — SEO: "ração X 15kg
preço no Méier".

### 3. Reposição inteligente (Joia 1)

Cadastro do pet (peso) + produto consumido → `packages/domain` calcula
gramas/dia → `projected_depletion_at`. O scheduler in-process (advisory lock no
Postgres, já previsto no TECHNOLOGY_STACK) varre as agendas vencendo, cria
`Reminder` idempotente (`dedupe_key`) e o módulo `notifications` entrega. Cada
`order.delivered` recalcula a projeção.

### 4. Onboarding de loja

`stores.create` (status `PROSPECT` → `ONBOARDING`) → subconta no PSP
(`psp_recipient_id`) → áreas de entrega → ofertas semeadas a partir do catálogo
mestre → `ACTIVE` (só com as três condições da invariante). O `referral_code`
nasce aqui: é o QR do balcão.

---

## Dados e armazenamento

- **PostgreSQL único.** Tabelas conforme o `DOMAIN_MODEL`; `snake_case` plural,
  PK `id` UUID, FK `entidade_id`, `created_at`/`updated_at`.
- **Dinheiro em inteiros** (`*_cents`); **percentuais em pontos-base**
  (`*_bps`). Nunca float.
- **Índices que o MVP exige desde o dia 1:** `offers (product_id, available)` e
  `offers (store_id, product_id)` únicos/compostos para o comparador;
  `products (ean)` único; `orders (store_id, status, placed_at)` para o painel
  do lojista; `replenishment_schedules (projected_depletion_at)` para o
  scheduler; `reminders (dedupe_key)` único.
- **Índices que existem hoje** (migration `create_catalog_stores_and_offers`,
  `pd-11`): `offers (store_id, product_id)` único, `offers (product_id,
  available)`, `products (ean)` único, `products (slug)` único, `stores (slug)`
  único, `delivery_areas (store_id, label)` único, `delivery_areas (active)`.
  Os de `orders`, `replenishment_schedules` e `reminders` entram com as tabelas
  que os exigem.
- **Constraints de invariante** escritas à mão na migration, porque o Prisma não
  modela `CHECK`: `offers.price_cents > 0`,
  `delivery_areas.delivery_fee_cents >= 0`,
  `delivery_areas.estimated_minutes > 0`, `products.net_weight_grams > 0`.
  Dinheiro em centavos inteiros positivos é invariante do ADR-0004 #11, e é o
  banco quem a sustenta.
- **Busca de produto (implementada na `pd-11`):** coluna `products.search_text`
  com `marca + nome + variante` **normalizados** (sem acento, minúsculas), e
  `LIKE` por token AND-ado. O termo do visitante passa pela mesma função de
  `packages/domain`, então acento e caixa somem dos dois lados.
  **Full-text (`tsvector`/`pg_trgm`) é o próximo passo, não este** — para
  dezenas de SKUs seria infraestrutura antecipada, e `unaccent` não é
  `IMMUTABLE` (exigiria função wrapper para a coluna gerada).
  **Gatilho:** catálogo acima de ~500 SKUs **ou** qualidade de busca ruim
  medida. Sem datastore novo em nenhum dos cenários (ADR-0010).
- **Sem S3 no MVP:** não há upload de documento (a Carteira Digital saiu do
  escopo). Imagens de produto são URLs do catálogo. O storage volta na fase 2.

---

## Pagamentos e dinheiro (fronteira crítica)

- A API cria **intenção de pagamento** no PSP com a regra de split (loja recebe
  líquido, plataforma retém comissão + taxa de serviço) e **espera o webhook**.
  Nunca confia no retorno do cliente para dar pedido como pago.
- **Webhook:** endpoint público, assinatura verificada, **idempotente** por
  `psp_payment_id`, e sempre persistindo `psp_payload` para auditoria.
- **Conciliação:** `payments` e `payouts` são a verdade contábil interna; um job
  diário compara com o extrato do PSP e sinaliza divergência.
- **Antifragilidade do MVP:** se o PSP estiver fora, o pedido não é criado
  (falha explícita) — nunca "pedido pago" otimista.

---

## Transversais

- **AuthGuard** (JWT), **RolesGuard** (`TUTOR`/`STORE_MEMBER`/`ADMIN`) e
  **StoreScopeGuard**: todo acesso a dado de loja valida o vínculo em
  `store_members` — o equivalente ao OwnershipGuard da v1.0, aplicado ao
  agregado `Store`. Um lojista jamais lê pedido ou preço de outra loja.
- **Idempotency interceptor:** header `Idempotency-Key` em `POST /orders` e nos
  webhooks.
- **Audit interceptor:** registra quem mudou preço, aceitou/recusou pedido e
  alterou comissão.
- **Validação Zod** na borda; **OpenTelemetry** em toda a API.

---

## O que está deliberadamente fora do MVP

Estoque em tempo real; cartão de crédito no dia 1 (Pix primeiro, ADR-0003);
carrinho multi-loja; roteirização de entrega; gráficos no painel do lojista;
mensageria/fila externa; Redis; S3; PostGIS (áreas de entrega são bairro/CEP —
o gatilho para geoespacial é precisar de distância real); Timeline, Carteira
Digital, serviços e agendamento (fase 2).

---

## Critérios

Este documento é considerado pronto quando:

- [x] Apresenta a topologia (clientes, API, dados, PSP, notificações, observabilidade).
- [x] Lista os módulos do MVP com responsabilidade e tabelas próprias, um por agregado.
- [x] Define a estrutura do monorepo e as regras de fronteira entre pacotes.
- [x] Cobre os fluxos principais (pedido, comparador, reposição, onboarding de loja).
- [x] Trata a fronteira de dinheiro (split, webhook, idempotência, conciliação).
- [x] Não decide stack (ADR-0002/TECHNOLOGY_STACK) nem repete princípios/metas.
- [x] Revisado após o spike-gate do cliente universal (TECHNOLOGY_STACK) — a
      `pd-08` aprovou Expo + React Native Web (ADR-0008) e **nada nesta
      topologia mudou por causa disso**: o cliente universal continua sendo um
      consumidor da mesma API. Conferido na `pd-11`, 11/09/2026.
