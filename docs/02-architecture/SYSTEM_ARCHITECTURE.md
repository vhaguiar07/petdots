---
title: System Architecture
status: stable
version: "2.6"
updated: 2026-09-13
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

> **v2.5 (2026-09-13, `pd-15`).** O pedido foi implementado **sem pagamento**
> ([ADR-0017](../06-decisions/ADR/0017-pedido-antes-do-pagamento.md)), e três
> frases desta página **descreviam um desenho que a implementação não seguiu**.
> Elas foram corrigidas, com o motivo:
>
> - 🔴 **"Audit interceptor" → porta chamada pela aplicação.** A primeira recusa
>   auditável do projeto é a **auto-recusa por prazo vencido**: um job, sem rota
>   e sem requisição. Um interceptor de borda não a veria, e não conhece o
>   estado anterior. Ver §Transversais.
> - 🔴 **"Idempotency interceptor" → coluna única**, para a única rota que
>   precisa dela hoje. Ver §Transversais.
> - **O fluxo 1 põe `PLACED` depois do webhook** — é o destino, e vale a partir
>   da `pd-17`. Na `pd-15` o pedido nasce `PLACED` na criação.
>
> Além disso: a tabela de módulos ganha `orders`, `payments` (mínimo) e o
> suporte `audit`; §Dados ganha os índices e os `CHECK` da quinta migration; e
> §Jobs passa a descrever um runner que existe.

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
| **tutors** | Perfil do tutor, endereço padrão, pets — ✅ **existe desde a `pd-14`** (ADR-0015) | `tutors`, `pets` |
| **postal-codes** | Busca de endereço por CEP — ✅ **existe desde a `pd-14`** (ADR-0016). ⚠️ **O único módulo sem tabela:** não é dono de dado, é dono da **fronteira** com o diretório de CEPs de terceiro | **nenhuma** |
| **catalog** | Catálogo mestre por EAN, categorias, tabela de comissão | `products`, `commission_rates` |
| **stores** | Loja, membros, áreas de entrega, onboarding, código de indicação — ✅ **`store_members` existe desde a `pd-16`** (ADR-0018), com a agenda semanal escrita pelo `OWNER`. É este módulo que exporta o `StoreScopeGuard` e o caso de uso que ele injeta, porque `orders` e `offers` aplicam o guard nos próprios controllers | `stores`, **`store_members`** ✅, `delivery_areas`, `store_commission_rates` |
| **offers** | Preço e disponibilidade por loja; **busca e comparador** — ✅ **escrita pelo lojista desde a `pd-16`** (ADR-0018, P4): preço (`OWNER`), disponibilidade (ambos os papéis) e "tenho isso" sobre um produto do catálogo | `offers` |
| **orders** | Pedido, máquina de estados, cotação e cálculo de comissão — ✅ **existe desde a `pd-15`** (ADR-0017). ⚠️ **O carrinho não está aqui**: ele vive no cliente, e o servidor vê só a cotação e o pedido | `orders`, `order_items` |
| **payments** | Intenção de pagamento no PSP, split, webhooks, repasses e **devoluções** — ⏳ **mínimo desde a `pd-15`**: só `refunds`, um caso de uso e **nenhum controller**. O PSP é a `pd-17` | `payments`, `payouts`, **`refunds`** ✅ |
| **audit** (suporte) | O rastro das mutações sensíveis — ✅ **existe desde a `pd-15`**. Como `prisma` e `health`, é dono de tabela sem agregado próprio; **sem controller e sem leitura** | `audit_log` |
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

> ⚠️ **O que está implementado deste fluxo, e o que não está** (`pd-15`,
> ADR-0017). O desenho acima continua sendo o destino; o presente é mais curto:
>
> ```
> Tutor monta o carrinho no app (o servidor não o vê)
>    └─ POST /order-quotes  ─ loja ACTIVE? aberta? endereço coberto?
>       │                   ─ área ativa MAIS BARATA que cobre → taxa
>       │                   ─ comissão por item (categoria → tabela, com
>       │                     override da loja; zero em STORE_REFERRAL)
>       └─ POST /orders     ─ mesma conta, agora gravando o SNAPSHOT
>          └─ status = PLACED   ⚠️ AQUI, na criação — não há Payment
>             └─ (ninguém notifica a loja: capacidade 10)
>                └─ ⏳ a loja não tem endpoint até a pd-16
>                   └─ o prazo vence → REJECTED + Refund  ← o único desfecho hoje
> ```
>
> Na `pd-17`, `payments.createIntent()` entra **entre** a cotação e a criação, e
> o `→ PLACED` migra para o handler do webhook.

#### Os caminhos que não terminam em entrega

Decididos em 12/09/2026 pelo
[ADR-0014](../06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md), que fechou
as quatro pendências de modelagem que bloqueavam `orders`:

```
orders.place()  ─ loja fechada? → recusa ANTES de cobrar
                └─ [pago] PLACED ── 15 min de prazo, contados só com a loja aberta
                     ├─ loja aceita (ACCEPTED)
                     │    └─ item em falta → OrderItem.fulfillment = UNAVAILABLE
                     │         └─ refunds.create(ITEM_UNAVAILABLE)  ← parcial, pedido segue
                     ├─ loja recusa (REJECTED)        → refunds.create(STORE_REJECTED)
                     ├─ prazo vence (REJECTED)        → refunds.create(ACCEPTANCE_EXPIRED)
                     └─ tutor cancela (CANCELLED)     → refunds.create(TUTOR_CANCELLED)
```

Três consequências de arquitetura:

- **`Refund` é entidade nova**, com devolução idempotente por `psp_refund_id`.
  Nenhuma devolução do MVP depende de alguém apertar um botão.
- **O `Payout` é calculado sobre os itens `FULFILLED`**, e como ele só liquida
  em `DELIVERED`, **não existe reversão de comissão**: o que foi devolvido nunca
  chegou a ser repassado.
- **A auto-recusa é um job** no scheduler in-process com advisory lock que já
  serve os lembretes — sem fila nova, sem Redis. A transição `PLACED →
  REJECTED` é condicional ao status atual, então duas execuções produzem uma
  recusa só.

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

⏳ **Metade existe.** O **cadastro do pet com peso existe desde a `pd-14`**; o
cálculo, não — a regra "peso + embalagem → gramas/dia" não está definida em
documento nenhum do repositório e exige ADR próprio (capacidade 9). O resto
deste fluxo é projeto, não código.

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
- **Índices que existem hoje:** da migration `create_catalog_stores_and_offers`
  (`pd-11`) — `offers (store_id, product_id)` único, `offers (product_id,
  available)`, `products (ean)` único, `products (slug)` único, `stores (slug)`
  único, `delivery_areas (store_id, label)` único, `delivery_areas (active)`;
  da `create_users_and_refresh_tokens` (`pd-12`) — `users (email)` único,
  `refresh_tokens (token_hash)` único, `refresh_tokens (user_id)`; e da
  `create_tutors_and_pets` (`pd-14`) — **`tutors (user_id)` único**, que é o que
  faz o perfil ser 1:1 com a identidade e o que torna `PUT /tutors/me` um upsert
  sem nada a reconciliar, e `pets (tutor_id)`, porque **toda** consulta de pet
  filtra por dono.
  e da `create_orders_refunds_commission_and_audit_log` (`pd-15`) —
  **`orders (store_id, status, placed_at)`**, que é o índice que esta página
  exigia "desde o dia 1" para o painel do lojista e que agora existe;
  `orders (tutor_id, placed_at DESC)` para a lista do tutor;
  `orders (status, acceptance_deadline_at)` para a varredura do job;
  `orders (code)` único (o número que se dita ao telefone);
  **`orders (tutor_id, idempotency_key)` único**, que É a idempotência da
  criação; `order_items (order_id)`; `refunds (order_id)`;
  `commission_rates (category, valid_from)` único;
  `store_commission_rates (store_id, category, valid_from)` único; e
  `audit_log (entity_type, entity_id)` + `audit_log (created_at)`.
  Os de `replenishment_schedules` e `reminders` entram com as tabelas que os
  exigem.
- **Constraints de invariante** escritas à mão na migration, porque o Prisma não
  modela `CHECK`: `offers.price_cents > 0`,
  `delivery_areas.delivery_fee_cents >= 0`,
  `delivery_areas.estimated_minutes > 0`, `products.net_weight_grams > 0`,
  `users.email = lower(email)`, `array_length(users.roles, 1) >= 1` e, desde a
  `pd-14`, **`pets.weight_grams > 0`** — o insumo que a capacidade 9 vai
  dividir — e **`tutors.postal_code` conferido contra oito dígitos**: `CHAR(8)`
  sozinho aceitaria `2072-000`, e é o `CHECK` que faz a coluna significar "um
  CEP" em vez de "oito caracteres".
  Dinheiro em centavos inteiros positivos é invariante do ADR-0004 #11, e é o
  banco quem a sustenta.
  **Desde a `pd-15`, mais quinze**, e a primeira é a invariante mais citada do
  `DOMAIN_MODEL`:
  `orders.total_cents = items_total_cents + delivery_fee_cents + service_fee_cents`
  — exata, porque nada arredonda. Mais: os quatro valores de `orders` não
  negativos; `order_items.quantity > 0` e `unit_price_cents > 0`;
  `refunds.amount_cents > 0` (um estorno de zero é um bug que ficou quieto);
  `rate_bps BETWEEN 0 AND 10000` nas duas tabelas de comissão; vigência que não
  termina antes de começar; e `jsonb_typeof(stores.opening_hours) = 'array'` —
  o que faz a coluna significar "uma lista de faixas" em vez de "algum JSON",
  mesmo raciocínio do `CHECK` de `tutors.postal_code`.
  ⚠️ **`orders.tutor_id` e `orders.store_id` são `ON DELETE RESTRICT`**, não
  `CASCADE`: o pedido é registro fiscal. A consequência — apagar uma conta que
  já pediu falha no banco — é desejada e está na vigilância do `BACKLOG`.
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

- **AuthGuard** (JWT) e **RolesGuard** (`TUTOR`/`STORE_MEMBER`/`ADMIN`) são
  **globais** desde a `pd-13` (`APP_GUARD`): toda rota nasce fechada.
- ✅ **StoreScopeGuard — de pé desde a `pd-16`** (ADR-0018): todo acesso a dado
  de loja valida o vínculo em `store_members` — o equivalente ao OwnershipGuard
  da v1.0, aplicado ao agregado `Store`. Um lojista jamais lê pedido ou preço de
  outra loja, e isso passou a ser coberto por teste.

  🔴 **Aplicado por rota, não global**, e a distinção é arquitetural: cada
  requisição escopada paga **uma** consulta pelo índice único
  `(store_id, user_id)`, e nenhuma rota fora do painel toca a tabela. Um guard
  global lendo metadata teria o mesmo custo e o mesmo modo de falha — "esqueci o
  decorator" — com a consulta escondida em toda requisição.

  O `storeId` vem sempre do **path** (ADR-0013 B8: uma pessoa opera mais de uma
  loja) e o handler só o obtém do vínculo que o guard casou, nunca de `params`
  — o que faz um `@UseGuards` esquecido falhar fechando.
- 🔴 **Idempotência de `POST /orders`: uma coluna única, não um interceptor**
  (corrigido na `pd-15`, ADR-0017 A7). O header `Idempotency-Key` é
  **obrigatório**, e a unicidade é `(tutor_id, idempotency_key)` na própria
  tabela: replay devolve o mesmo pedido com `201`. Um interceptor genérico que
  guarda respostas seria infraestrutura antecipada para **uma** rota, e a
  coluna é verificável por constraint. O webhook do PSP (`pd-17`) traz a sua
  própria idempotência, por `psp_payment_id` — também não um interceptor.
- 🔴 **Auditoria: uma porta chamada pela aplicação, dentro da transação da
  transição — não um interceptor HTTP** (corrigido na `pd-15`, ADR-0017 A8).
  Esta página dizia "Audit interceptor na borda", e a implementação
  deliberadamente não seguiu, por um motivo concreto: a **primeira mutação
  auditável que o projeto produziu** é a auto-recusa por prazo vencido, feita
  por um **job, sem rota, sem status e sem requisição**. Um interceptor de borda
  não a veria, e nem saberia o estado anterior ("de `PLACED` para `REJECTED`,
  motivo expiração"). A porta `IAuditTrail` é chamada pelo caso de uso e recebe
  a transação aberta, para que a linha nasça ou role para trás junto com a
  transição. A `pd-16` e a escrita de ofertas herdam o caminho pronto.
- **Validação Zod** na borda; **OpenTelemetry** em toda a API.
- **Transação atravessando módulos:** `PersistenceContext`, um tipo **opaco**
  que não existe em runtime e que só os adapters `infra/` sabem desembrulhar. É
  o que permite `orders` gravar `refunds` e `audit_log` na mesma transação sem
  que `application/` importe Prisma (ADR-0017 A10).

### Jobs in-process

✅ **Existe um desde a `pd-15`:** o `OrderExpirySweeper`, que auto-recusa
pedidos com prazo vencido. É um `setInterval(...).unref()` — **sem
`@nestjs/schedule`** (ADR-0017 A13) —, desligável por
`ORDER_EXPIRY_SWEEP_INTERVAL_MS=0` e desligado sob `NODE_ENV=test`.

A varredura roda **dentro de uma transação** com `pg_try_advisory_xact_lock`,
porque o lock é liberado quando a transação termina: um lock tomado fora dela
não protege nada. Debaixo dele, cada transição ainda é um compare-and-set no
status — então mesmo sem o lock duas varreduras produziriam **uma** recusa.

A escolha de uma biblioteca de scheduling fica para o **segundo** job (a
conciliação diária da `pd-17`), quando houver duas necessidades reais para
decidir contra.

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
