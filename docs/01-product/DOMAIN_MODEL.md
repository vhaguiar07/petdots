---
title: PetDots — Domain Model
status: stable
version: "2.4"
updated: 2026-09-12
scope: >
  Define o modelo de domínio do MVP do PetDots — o marketplace hiperlocal de
  petshops de bairro com reposição inteligente e comparador de preços:
  entidades, agregados, relacionamentos, invariantes, ownership de dados e
  eventos de domínio. É a referência que ancora arquitetura, banco, APIs e a
  camada de conhecimento de IA.
relates_to:
  - 06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md
  - 00-foundation/GLOSSARY.md
  - 00-foundation/NAMING_CONVENTIONS.md
  - 00-foundation/BUSINESS_MODEL.md
  - 00-foundation/IDEACAO_FASE1.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
type: product
---

# PetDots — Domain Model

> **v2.4 (2026-09-12, `pd-12`).** `User` foi ao banco com a autenticação
> própria (ADR-0011), junto de `refresh_tokens` — tabela de suporte sem
> entidade de domínio própria. `Tutor` **não** veio junto: o cadastro cria
> identidade, não perfil de consumo. Duas check constraints acompanham `users`
> — e-mail em minúsculas e `roles` não vazio.

> **v2.3 (2026-09-11, `pd-11`).** `Product`, `Store`, `DeliveryArea` e `Offer`
> foram ao banco com o comparador público (ADR-0010), e a implementação
> acrescentou o que a especificação não previa: **`slug`** em `Product` e
> `Store` (URL pública indexável) e **`search_text`** em `Product` (busca sem
> acento). `Store` nasceu **mínima** — as colunas de onboarding e PSP entram com
> J6/`payments`. `DeliveryArea.postal_code_ranges` é JSONB, e `label` é único
> por loja. Entram também duas invariantes novas no agregado `Store`: quem
> aparece no comparador e como as ofertas são ordenadas. `CommissionRate` e
> `StoreCommissionRate` continuam **fora do banco** — quem as lê é `orders`.

> **v2.2 (2026-09-11, `pd-09`).** `WaitlistEntry` foi o primeiro model levado ao
> banco, e a implementação corrigiu o que estava aqui: os valores de `source`
> passam a `UPPER_SNAKE_CASE` em inglês (`NAMING_CONVENTIONS`), e entram
> `consent_at` (consentimento LGPD) e `updated_at`, além das invariantes de
> normalização e unicidade do telefone. Os demais agregados seguem como
> especificação — nenhum deles existe no `schema.prisma` ainda.

> **v2.0 (2026-09-03).** Reescrito para o MVP real: o marketplace hiperlocal.
> A v1.0 modelava o produto "Vida do Pet" (Timeline, Carteira Digital) e
> declarava o comércio como capacidade futura — premissa substituída pela
> decisão da Parte 4 da IDEACAO_FASE1 e pelo BUSINESS_MODEL v2.0. As entidades
> da v1.0 que saem do MVP (Timeline, Carteira Digital, Parceiro polimórfico,
> Serviço, Agendamento) estão preservadas na seção **Domínio das fases
> futuras**, com o caminho de reentrada.

---

## Objetivo

Definir **quais entidades existem** no MVP, **como se agrupam em agregados**,
**como se relacionam** (cardinalidade explícita), **quais invariantes** valem,
**quem é dono de cada dado** e **quais eventos de domínio** o sistema emite.

Terminologia conforme o [GLOSSARY](../00-foundation/GLOSSARY.md); nomenclatura
técnica conforme [NAMING_CONVENTIONS](../00-foundation/NAMING_CONVENTIONS.md).

> **Núcleo do domínio no MVP.** O coração é a **transação recorrente**: um Tutor
> compra de uma Loja do seu bairro, e a plataforma sabe **quando** ele precisa
> comprar de novo. O Pet permanece no domínio — mas enxuto, a serviço da
> reposição (peso, consumo), não da carteira de saúde.

---

## Convenção de nomes (PT ↔ código ↔ tabela)

| Domínio (PT) | Código (EN) | Tabela |
|---|---|---|
| Usuário (identidade) | `User` | `users` |
| Tutor | `Tutor` | `tutors` |
| Pet | `Pet` | `pets` |
| Loja (petshop) | `Store` | `stores` |
| Membro da Loja | `StoreMember` | `store_members` |
| Área de Entrega | `DeliveryArea` | `delivery_areas` |
| Produto (catálogo mestre) | `Product` | `products` |
| Oferta | `Offer` | `offers` |
| Taxa de Comissão | `CommissionRate` | `commission_rates` |
| Comissão Especial da Loja | `StoreCommissionRate` | `store_commission_rates` |
| Pedido | `Order` | `orders` |
| Item do Pedido | `OrderItem` | `order_items` |
| Pagamento | `Payment` | `payments` |
| Repasse | `Payout` | `payouts` |
| Entrega | `Delivery` | `deliveries` |
| Agenda de Reposição | `ReplenishmentSchedule` | `replenishment_schedules` |
| Lembrete | `Reminder` | `reminders` |
| Lista de Espera | `WaitlistEntry` | `waitlist_entries` |

> Toda PK é `id` UUID; toda FK segue `entidade_id`. Valores monetários são
> inteiros em centavos (`_cents`), nunca ponto flutuante. Percentuais são
> inteiros em pontos-base (`_bps`: 600 = 6,00%) — evita erro de arredondamento
> em comissão.

---

## Entidades

### Identidade e demanda

#### Usuário (`User`)

Identidade autenticável. Um mesmo humano pode ser Tutor e membro de Loja (o
dono de petshop que também tem pet) — a identidade é uma só, os papéis se
acumulam.

Atributos-chave: `id`, `email`, `phone`, `password_hash`, `roles`
(`UserRole[]`: `TUTOR`, `STORE_MEMBER`, `ADMIN`), `created_at`.

> **No banco desde a `pd-12`**, com todos os atributos acima (ADR-0011).
> `email` é único e **normalizado** (trim + minúsculas), com a check constraint
> `email = lower(email)` — é ela que faz o índice único significar "uma pessoa,
> uma conta" em vez de "uma grafia, uma conta". `roles` é `user_role[]` nativo,
> com check de lista não vazia: conjunto vazio nunca intersecta, e a linha
> autenticaria só para ser negada em todo lugar. `phone` é opcional e ninguém
> escreve nele ainda — entra com o perfil de Tutor.
>
> **Tabela irmã, sem entidade de domínio própria:** `refresh_tokens`
> (`user_id`, `token_hash` único, `expires_at`, `revoked_at`). É o que torna o
> logout capaz de revogar de verdade. Guarda o **SHA-256** do token, nunca o
> token: a coluna é um verificador de credencial, igual a `password_hash`.

#### Tutor (`Tutor`)

Perfil de consumo de um Usuário: seus pets, endereços e agendas de reposição.

Atributos-chave: `id`, `user_id`, `name`, `default_address` (logradouro,
número, complemento, bairro, CEP, referência), `neighborhood`, `created_at`.

> ⏳ **Ainda não está no banco.** O cadastro da `pd-12` cria **`User` e nada
> mais** (ADR-0011, A10): `Tutor` é a capacidade 2 do `MVP_SCOPE` e nasce com
> pets, endereços e agendas, não com a autenticação.

#### Pet (`Pet`)

Animal do Tutor. **No MVP existe para alimentar a reposição inteligente** — o
Pet ID permanece imutável e prepara a evolução para o histórico completo
(fase 2), mas Timeline e Carteira Digital não fazem parte deste escopo.

Atributos-chave: `id` (é o **Pet ID**, imutável), `tutor_id`, `name`, `species`
(`PetSpecies`: `DOG`, `CAT`), `birth_date`, `weight_grams`, `created_at`.

> `weight_grams` é o insumo da calculadora de consumo (Joia 1): peso + produto
> consumido → gramas/dia → data projetada de término.

### Oferta

#### Loja (`Store`)

Petshop de bairro participante. É agregado-raiz: dona das próprias ofertas,
áreas de entrega e membros.

Atributos-chave: `id`, `slug` (único — identificador público na URL),
`name`, `legal_name`, `document` (CNPJ), `address`, `neighborhood`,
`phone_whatsapp`, `status` (`StoreStatus`: `PROSPECT`, `ONBOARDING`, `ACTIVE`,
`PAUSED`), `psp_recipient_id` (identificador da subconta no PSP),
`referral_code` (código/QR da loja — base da comissão zero para cliente
próprio), `created_at`.

> **No banco desde a `pd-11`, mínima:** `id`, `slug`, `name`, `neighborhood`,
> `status` e auditoria. O comparador não lê nenhuma das demais, e coluna que
> ninguém escreve é especulação. `legal_name`, `document`, `address`,
> `phone_whatsapp`, `psp_recipient_id`, `referral_code` e `StoreMember` entram
> com o onboarding de loja (J6/`payments`) — ADR-0010.

#### Membro da Loja (`StoreMember`)

Vínculo entre Usuário e Loja, com papel.

Atributos-chave: `id`, `store_id`, `user_id`, `role` (`StoreRole`: `OWNER`,
`OPERATOR`), `created_at`.

#### Área de Entrega (`DeliveryArea`)

Onde a Loja entrega, e por quanto. Materializa o mapa de entrega (IDEACAO §34)
sem infraestrutura geoespacial: uma lista de bairros e faixas de CEP por faixa
de taxa.

Atributos-chave: `id`, `store_id`, `label`, `neighborhoods` (lista),
`postal_code_ranges` (lista de intervalos), `delivery_fee_cents`,
`estimated_minutes`, `active`.

> **No banco desde a `pd-11`:** `neighborhoods` é `TEXT[]` nativo;
> `postal_code_ranges` é **JSONB** no formato `[{ from, to }]`, oito dígitos
> cada, validado por Zod ao ler e ao semear. São **valores** da área, sempre
> lidos e escritos junto com ela — tabela filha seria normalizar um value
> object. `label` é **único por loja**. A pergunta "esta área cobre este
> endereço?" é resolvida em `packages/domain` (função pura, testada), nunca em
> SQL (ADR-0004 #12, ADR-0010).

#### Produto (`Product`)

Item do **catálogo mestre**, único na plataforma e curado por nós. A Loja não
cria produto: ela declara que tem e informa o preço (ver `Offer`).

Atributos-chave: `id`, `ean` (único quando existir), `slug` (único),
`name`, `brand`, `category` (`ProductCategory`), `variant` (ex.: "15 kg",
"500 g"), `net_weight_grams`, `image_url`, `requires_prescription` (booleano; se
verdadeiro, **fora do MVP** — ver invariantes), `active`, `search_text`,
`created_at`.

> **`slug` e `search_text` nasceram na `pd-11`** e não estavam na v2.2:
> - **`slug`** é o identificador público na URL (`/precos/golden-formula-caes-adultos-frango-e-arroz-15-kg`).
>   Derivado de `nome + variante`, nunca digitado. UUID na URL destruiria o SEO,
>   que é a razão de a página existir (ADR-0004 #13).
> - **`search_text`** guarda `marca + nome + variante` sem acento e em
>   minúsculas. O termo do visitante passa pela **mesma função**, então `racao`
>   acha "Ração" sem o banco saber português. Full-text (`tsvector`) é o próximo
>   passo, com gatilho no `SYSTEM_ARCHITECTURE`.
>
> Ambos são derivados: o seed nunca os recebe prontos.

`ProductCategory`: `FOOD_STANDARD`, `FOOD_PREMIUM`, `TREAT`, `HYGIENE`,
`HEALTH_OTC`, `ACCESSORY`. **A categoria é o que determina a comissão**
(ADR-0003) — por isso é atributo do domínio, não rótulo de vitrine.

#### Oferta (`Offer`)

O que uma Loja vende, por quanto, e se está disponível. É o cruzamento
Loja × Produto — e a fonte do comparador de preços (Joia 2).

Atributos-chave: `id`, `store_id`, `product_id`, `price_cents`, `available`
(booleano), `price_updated_at`, `created_at`.

#### Taxa de Comissão (`CommissionRate`)

Tabela vigente de take rate por categoria, historizada — porque a tabela vai
ser recalibrada com dados de campo (IDEACAO §30).

Atributos-chave: `id`, `category`, `rate_bps`, `valid_from`, `valid_to` (nulo =
vigente).

> **Não modelada no banco.** Entra com `orders`, que é quem a lê: o comparador
> não calcula comissão. O ADR-0003 registra que as faixas "são hipóteses, não
> tabela final" — congelá-las num seed antes de haver lojista real seria fingir
> uma decisão (ADR-0010). O mesmo vale para `StoreCommissionRate`.

#### Comissão Especial da Loja (`StoreCommissionRate`)

Exceção por Loja e categoria — materializa a **tarifa de fundador** (take
reduzido travado por prazo para as primeiras lojas).

Atributos-chave: `id`, `store_id`, `category`, `rate_bps`, `valid_from`,
`valid_to`.

### Transação

#### Pedido (`Order`)

Uma compra de um Tutor em **uma** Loja. É agregado-raiz e **registro contábil**:
carrega o retrato imutável de preços, taxas e comissão no momento da compra.

Atributos-chave: `id`, `code` (curto, legível — o número que o lojista diz no
telefone), `tutor_id`, `store_id`, `status` (`OrderStatus`), `acquisition_channel`
(`AcquisitionChannel`: `PLATFORM`, `STORE_REFERRAL`), `delivery_address`,
`items_total_cents`, `delivery_fee_cents`, `service_fee_cents`,
`total_cents`, `commission_total_cents`, `placed_at`, `accepted_at`,
`dispatched_at`, `delivered_at`, `cancelled_at`, `cancellation_reason`.

`OrderStatus`: `PLACED` → `ACCEPTED` → `DISPATCHED` → `DELIVERED`, com
`REJECTED` (loja recusou) e `CANCELLED` (cliente/plataforma) como saídas.

#### Item do Pedido (`OrderItem`)

Linha do pedido, com **snapshot** do produto, do preço e da comissão aplicada.

Atributos-chave: `id`, `order_id`, `product_id`, `product_name_snapshot`,
`category_snapshot`, `unit_price_cents`, `quantity`,
`commission_rate_bps_snapshot`, `commission_amount_cents`,
`fulfillment` (`ItemFulfillment`: `FULFILLED`, `SUBSTITUTED`, `UNAVAILABLE`),
`substituted_by_product_id`.

#### Pagamento (`Payment`)

O que o cliente pagou, e o rastro no PSP. Um Pedido tem um Pagamento vigente.

Atributos-chave: `id`, `order_id`, `method` (`PaymentMethod`: `PIX`, `CARD`,
`ON_DELIVERY`), `status` (`PaymentStatus`: `PENDING`, `CAPTURED`, `FAILED`,
`EXPIRED`, `REFUNDED`), `amount_cents`, `psp_provider`, `psp_payment_id`,
`psp_payload` (JSONB de auditoria), `captured_at`.

#### Repasse (`Payout`)

O que a Loja recebe do Pedido, após comissão — o resultado do split.

Atributos-chave: `id`, `order_id`, `store_id`, `gross_cents`,
`commission_cents`, `net_cents`, `status` (`PayoutStatus`: `PENDING`,
`SETTLED`, `FAILED`), `psp_transfer_id`, `settled_at`.

#### Entrega (`Delivery`)

Como o pedido chega ao cliente.

Atributos-chave: `id`, `order_id`, `mode` (`DeliveryMode`: `STORE_COURIER`,
`PARTNER_COURIER`), `courier_name`, `courier_phone`, `fee_cents` (o que o
cliente pagou), `cost_cents` (o custo real, quando conhecido — insumo da
economia por pedido), `status` (`DeliveryStatus`: `PENDING`, `IN_TRANSIT`,
`DELIVERED`, `FAILED`), `dispatched_at`, `delivered_at`.

### Recorrência

#### Agenda de Reposição (`ReplenishmentSchedule`)

O motor da Joia 1: para um Pet e um Produto, quando o estoque do tutor acaba.

Atributos-chave: `id`, `tutor_id`, `pet_id`, `product_id`,
`daily_grams_estimate`, `package_grams`, `last_purchase_at`,
`projected_depletion_at`, `interval_days` (para itens de intervalo fixo, como
antipulgas), `kind` (`ReplenishmentKind`: `CONSUMPTION_BASED`,
`INTERVAL_BASED`), `active`.

#### Lembrete (`Reminder`)

Disparo agendado de um aviso ao Tutor. Idempotente por natureza.

Atributos-chave: `id`, `tutor_id`, `replenishment_schedule_id`, `channel`
(`NotificationChannel`: `PUSH`, `WHATSAPP`, `EMAIL`), `scheduled_for`,
`sent_at`, `status` (`ReminderStatus`: `SCHEDULED`, `SENT`, `FAILED`,
`CANCELLED`), `dedupe_key` (único).

#### Lista de Espera (`WaitlistEntry`)

Capturas do smoke test e dos endereços fora da área de entrega — o dado que
escolhe o próximo bairro.

Atributos-chave: `id`, `name`, `phone`, `neighborhood`, `postal_code`,
`pet_food_declared`, `source` (`WaitlistSource`: `CAMPAIGN`, `OUT_OF_AREA`,
`STORE_QR`), `consent_at`, `created_at`, `updated_at`.

Invariantes:

- **`phone` é a identidade do lead**: normalizado para E.164 (`+55DDDNNNNNNNNN`)
  e **único** na tabela. O smoke test conta *pessoas* para escolher o próximo
  bairro; sem normalização, `(21) 99999-9999` e `21999999999` virariam duas.
  Repetir o telefone devolve `409 WAITLIST_ENTRY_ALREADY_EXISTS`.
- `postal_code` guarda **8 dígitos sem hífen**, pelo mesmo motivo.
- `consent_at` é o **carimbo do consentimento LGPD**, gravado pelo servidor
  quando a captura chega com o aceite — nunca enviado pelo cliente. É a prova da
  base legal para o contato posterior (`SECURITY` §LGPD).
- `source` nasce `CAMPAIGN` na landing; `OUT_OF_AREA` (checkout fora da área) e
  `STORE_QR` (QR na loja) entram com os fluxos que os produzem.

---

## Agregados

### Raiz: `Store` (Loja)

Engloba: **Ofertas** (1:N), **Áreas de Entrega** (1:N), **Membros** (1:N).

Invariantes:

- Uma Oferta pertence a exatamente uma Loja e referencia um Produto do catálogo
  mestre; **par (`store_id`, `product_id`) é único**.
- A Loja não cria nem edita `Product` — só `Offer` (preço e disponibilidade).
- Uma Loja só entra em `ACTIVE` com: ao menos uma Área de Entrega ativa, ao
  menos uma Oferta disponível e `psp_recipient_id` presente.
- `referral_code` é único e imutável após a criação.
- **Uma Loja aparece no comparador quando `status ≠ PAUSED`**, tem ao menos uma
  Área de Entrega ativa cobrindo o endereço consultado e uma Oferta disponível
  do produto. **`ACTIVE` governa o pedido (J3), não a listagem (J2)** — a
  invariante acima condiciona `ACTIVE` a `psp_recipient_id`, e exigi-la na
  listagem tornaria toda Loja invisível até existir PSP. `PAUSED` é o único
  status que significa "não me mostre" (ADR-0010).
- **O comparador ordena por preço entregue**: `price_cents + delivery_fee_cents`
  crescente, desempate por prazo crescente e nome da Loja em pt-BR. Sem endereço
  informado, por `price_cents` crescente, e o total não é exibido (ADR-0010).
- `slug` é único entre Lojas e é o identificador público na URL.

### Raiz: `Product` (Catálogo mestre)

Global, sem dono comercial. Curadoria da plataforma.

Invariantes:

- `ean` é único quando presente (produto sem EAN é admitido apenas com
  curadoria manual e marcação explícita).
- A `category` de um Produto só muda por operação administrativa auditada —
  ela determina a comissão.
- Produto com `requires_prescription = true` **não pode ter Oferta ativa** no
  MVP (IDEACAO §24). A regra cruza duas tabelas, o que o Postgres não expressa
  sem trigger; ela vive em `packages/domain`
  (`assertProductCanBeOffered`) e **todo** caminho que escreve Oferta passa por
  ela — hoje o seed, amanhã o painel do lojista (ADR-0010).
- `slug` é único entre Produtos e é o identificador público na URL.

### Raiz: `Order` (Pedido)

Engloba: **Itens** (1:N), **Pagamento** (1:1 vigente), **Entrega** (1:1),
**Repasse** (1:1).

Invariantes:

- Um Pedido pertence a **uma única Loja**. Não existe carrinho multi-loja no MVP
  (decisão registrada no ADR-0004).
- Todos os valores do Pedido e de seus Itens são **snapshot**: alteração
  posterior de preço, de categoria ou da tabela de comissão **nunca** altera um
  Pedido existente.
- `total_cents = items_total_cents + delivery_fee_cents + service_fee_cents`.
- `commission_total_cents` é a soma das comissões dos Itens; quando
  `acquisition_channel = STORE_REFERRAL`, é **zero** (regra de negócio do
  ADR-0003).
- Um Pedido só pode ser criado se: todas as Ofertas estiverem `available`, o
  endereço couber em uma Área de Entrega ativa da Loja, e a Loja estiver
  `ACTIVE`.
- Transições de status são unidirecionais; `DELIVERED` e `CANCELLED` são
  terminais.
- Não há repasse (`Payout`) sem Pagamento `CAPTURED`.

### Raiz: `Tutor`

Engloba: **Pets** (1:N), **Agendas de Reposição** (1:N), endereços.

Invariantes:

- Um Pet pertence a exatamente um Tutor no MVP (o compartilhamento N:N da v1.0
  volta na fase 2, quando a carteira do pet entrar).
- Uma Agenda de Reposição referencia um Pet do próprio Tutor.
- `Reminder` é idempotente por `dedupe_key` — reprocessamento não gera aviso
  duplicado.

---

## Relacionamentos (cardinalidade explícita)

| Relação | Cardinalidade | Observação |
|---|---|---|
| User → Tutor | 1:1 (opcional) | Papel de consumo da identidade. |
| User ↔ Store | N:N via `store_members` | Com papel (`OWNER`, `OPERATOR`). |
| Tutor → Pet | 1:N | No MVP; N:N volta na fase 2. |
| Store → Offer | 1:N | A vitrine da loja. |
| Product → Offer | 1:N | O mesmo produto ofertado por várias lojas — **é isso que faz o comparador de preços existir**. |
| Store → DeliveryArea | 1:N | Faixas de taxa/bairro. |
| Tutor → Order | 1:N | |
| Store → Order | 1:N | |
| Order → OrderItem | 1:N | |
| Order → Payment / Delivery / Payout | 1:1 | |
| Tutor → ReplenishmentSchedule | 1:N | |
| ReplenishmentSchedule → Reminder | 1:N | |
| Product ← ReplenishmentSchedule | N:1 | O que o pet consome. |

---

## Ownership de dados

> **Princípios: "o Tutor é dono dos dados do seu Pet" e "a Loja é dona do seu
> preço".**

- **Tutor:** dono de seus dados pessoais, endereços, pets e agendas. Pode
  exportar e solicitar exclusão (LGPD), respeitada a retenção fiscal dos
  Pedidos.
- **Loja:** dona de `Offer` (preço, disponibilidade) e de suas Áreas de
  Entrega. Não é dona do `Product` — nem do dado agregado de mercado.
- **Plataforma:** dona do catálogo mestre (`Product`), da tabela de comissão e
  do registro contábil dos Pedidos.
- **Dado sensível de negócio:** o preço de uma Loja é público na plataforma (é
  o produto); o **histórico de vendas de uma Loja não é visível a outra Loja**.
- **Pedido é imutável** após terminal: nem Tutor nem Loja alteram valores; a
  correção se faz por novo registro (estorno/ajuste), nunca por edição.

---

## Eventos de domínio

Formato `domain.action`, in-process no monolito.

| Evento | Quando é emitido |
|---|---|
| `tutor.created` | Um Tutor conclui o cadastro. |
| `pet.created` | Um Pet é cadastrado. |
| `store.onboarded` | Uma Loja passa a `ACTIVE`. |
| `product.created` | Um Produto entra no catálogo mestre. |
| `offer.price_changed` | Uma Loja altera preço (alimenta histórico do comparador). |
| `offer.availability_changed` | Uma Loja marca item disponível/indisponível. |
| `order.placed` | Pedido criado pelo Tutor. |
| `order.accepted` | Loja aceitou. |
| `order.rejected` | Loja recusou. |
| `order.dispatched` | Saiu para entrega. |
| `order.delivered` | Entregue — **dispara a atualização da Agenda de Reposição**. |
| `order.cancelled` | Cancelado. |
| `payment.captured` | PSP confirmou o pagamento (webhook). |
| `payment.failed` | Pagamento falhou ou expirou. |
| `payout.settled` | Repasse à Loja liquidado. |
| `replenishment.due` | A projeção indica que o item vai acabar. |
| `reminder.sent` | Lembrete entregue ao Tutor. |
| `waitlist.joined` | Alguém entrou na lista de espera. |

Encadeamento central da recorrência:
`order.delivered` → recalcula `projected_depletion_at` → agenda `Reminder` →
`replenishment.due` → `reminder.sent` → (o tutor volta a comprar).

---

## Domínio das fases futuras

Preservado da v1.0, **fora do MVP**, com o caminho de reentrada:

- **Timeline e Carteira Digital** (`timelines`, `events`, `digital_wallets`,
  `documents`): voltam na fase 2, como agregado sob `Pet` — que já nasce com
  `id` imutável exatamente para isso.
- **Parceiro polimórfico** (`Partner` e especializações Clínica, Veterinário,
  Prestador de Serviço, ONG, Laboratório): no MVP existe **um** tipo de
  parceiro, modelado concretamente como `Store`. A generalização entra quando o
  segundo tipo existir: cria-se `partners`, e `stores` passa a referenciá-lo
  (ADR-0004 registra o trade-off).
- **Serviço e Agendamento** (`services`, `appointments`): fase 2, referenciando
  `Store`/`Partner` e `Pet` por `id`.
- **Tutor ↔ Pet N:N com tutor primário:** a questão em aberto da v1.0 fica
  suspensa enquanto o MVP mantém 1:N; será decidida junto com a carteira do pet.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Cobre as entidades do MVP marketplace com atributos-chave e enums.
- [x] Define os agregados-raiz (`Store`, `Product`, `Order`, `Tutor`) com invariantes.
- [x] Expressa relacionamentos com cardinalidade explícita.
- [x] Documenta ownership de dados (tutor, loja, plataforma) e imutabilidade do Pedido.
- [x] Lista os eventos de domínio no formato `domain.action`, incluindo o ciclo da recorrência.
- [x] Preserva o domínio das fases futuras com caminho de reentrada.
- [x] Segue GLOSSARY e NAMING_CONVENTIONS (com as extensões monetárias `_cents`/`_bps`).
- [x] GLOSSARY atualizado com os termos novos (Loja, Oferta, Repasse, Agenda de Reposição) — feito na `pd-07`, `GLOSSARY` v2.0.
