---
title: Feature — Comparador de Preços
status: stable
version: "1.0"
updated: 2026-09-11
scope: >
  Visão transversal do comparador público de preços do PetDots — banco, API e
  landing numa leitura só: as tabelas products, stores, delivery_areas e offers
  com as constraints que carregam regra, os quatro endpoints GET públicos, as
  páginas indexáveis /precos e /precos/{slug}, as regras de listagem, ranking e
  busca, o que a feature deliberadamente ainda não faz, e como o Victor opera o
  catálogo hoje. Materializa a jornada J2 e as capacidades 3, 4, 5 e 6 do
  MVP_SCOPE.
relates_to:
  - 01-product/USER_JOURNEYS.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 04-api/API_GUIDELINES.md
  - 04-api/ERROR_MODEL.md
  - 03-engineering/SECURITY.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md
type: product
---

# Feature — Comparador de Preços

> **Segunda feature implementada** (`pd-11`, 11/09/2026). Todas as decisões que
> a viabilizaram antes de existir checkout estão no
> [ADR-0010](../../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md).

---

## O que é

Uma pessoa busca a ração do pet, informa o bairro ou o CEP, e vê **quais
petshops do Grande Méier entregam nela, por quanto, com quanto de entrega e em
quanto tempo** — ordenadas pelo que ela vai pagar de fato. É a jornada **J2** do
[`USER_JOURNEYS`](../../01-product/USER_JOURNEYS.md) e fatias das capacidades
**3, 4, 5 e 6** do [`MVP_SCOPE`](../../01-product/MVP_SCOPE.md).

**Para que serve, na prática:** é o **único ativo de aquisição orgânica do
MVP**. Quem busca "preço de ração Golden 15 kg no Méier" precisa cair numa
página nossa; sem ela a landing é só um formulário, e o smoke test não tem
produto para mostrar. É também a primeira coisa que se pode mostrar a um lojista
sem ter nada construído do lado do dinheiro.

**Tudo aqui é leitura.** Não há um único endpoint de escrita, nem autenticação —
e isso não é omissão: `identity` não existe, e escrita pública seria buraco.
Preço é público por desenho: é o produto (`SECURITY`, `DOMAIN_MODEL`
§Ownership).

---

## Banco

Migration `prisma/migrations/20260911200208_create_catalog_stores_and_offers/`
— a **segunda** do projeto. Quatro tabelas e dois enums.

### `products` — o catálogo mestre

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | `UUID` | PK, `DEFAULT gen_random_uuid()` |
| `ean` | `VARCHAR(14)` | **`UNIQUE`**, nulo permitido — hoje **todos** são nulos |
| `slug` | `VARCHAR(160)` | **`UNIQUE`** — o identificador na URL pública |
| `name`, `brand`, `variant` | `VARCHAR` | "Golden Fórmula…", "Golden", "15 kg" |
| `category` | `product_category` | `FOOD_STANDARD`, `FOOD_PREMIUM`, `TREAT`, `HYGIENE`, `HEALTH_OTC`, `ACCESSORY` |
| `net_weight_grams` | `INTEGER` | `CHECK > 0` |
| `image_url` | `VARCHAR(500)` | Nulo permitido |
| `requires_prescription` | `BOOLEAN` | Default `false` |
| `active` | `BOOLEAN` | Default `true`; inativo some da busca |
| `search_text` | `VARCHAR(320)` | `marca + nome + variante`, sem acento, minúsculas |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Auditoria padrão |

### `stores` — mínima de propósito

`id`, `slug` (**`UNIQUE`**), `name`, `neighborhood`, `status`
(`store_status`: `PROSPECT`, `ONBOARDING`, `ACTIVE`, `PAUSED`, default
`PROSPECT`), auditoria. **Nada de `legal_name`, `document`, `address`,
`psp_recipient_id` ou `referral_code`** — o comparador não lê nenhum deles, e
coluna que ninguém escreve é especulação. Entram com o onboarding
(J6/`payments`).

### `delivery_areas` — onde a loja entrega, e por quanto

`id`, `store_id` (FK, `ON DELETE CASCADE`), `label`, `neighborhoods` (`TEXT[]`
nativo), `postal_code_ranges` (**`JSONB`**, `[{ from, to }]` de oito dígitos),
`delivery_fee_cents` (`CHECK >= 0`), `estimated_minutes` (`CHECK > 0`),
`active`. **`UNIQUE (store_id, label)`** e índice em `active`.

### `offers` — o cruzamento loja × produto

`id`, `store_id`, `product_id` (FKs), `price_cents` (`CHECK > 0`), `available`,
`price_updated_at`, auditoria.

### As constraints que carregam regra

Não são detalhe de banco — são as invariantes, e cada uma tem um teste-sentinela
que **foi provado em vermelho**:

| Constraint | A regra que ela é |
|---|---|
| `UNIQUE (store_id, product_id)` em `offers` | "Uma loja tem **um** preço por produto". Sem ela o comparador mostraria a mesma loja duas vezes, com dois preços |
| `CHECK price_cents > 0` | Dinheiro é centavo inteiro positivo (ADR-0004 #11). Oferta a zero é erro de dado, não promoção |
| `CHECK delivery_fee_cents >= 0` | Entrega grátis é legítima; taxa negativa não |
| `CHECK estimated_minutes > 0` / `net_weight_grams > 0` | Prazo e peso zerados quebram prazo e preço por quilo |

Os `CHECK` foram escritos **à mão no SQL da migration**: o Prisma não os modela.
Por isso a prova de vermelho muta o **SQL da migration**, nunca o
`schema.prisma` — mutar o schema não prova nada (lição da `pd-09`).

A regra **"produto que exige receita não tem oferta"** não está no banco: ela
cruza duas tabelas, o que o Postgres não expressa sem trigger, e trigger é magia
invisível (`CODING_STANDARDS`). Ela vive em `packages/domain`
(`assertProductCanBeOffered`), e todo caminho que escreve oferta passa por lá.

---

## API

Quatro endpoints, **todos `GET`, todos públicos, nenhum de escrita**.

| Endpoint | Devolve | Erros |
|---|---|---|
| `GET /api/v1/products` | `{ items, page, pageSize, total }` | `422 VALIDATION_FAILED` |
| `GET /api/v1/products/{productId}` | O produto | `404 PRODUCT_NOT_FOUND`, `422` |
| `GET /api/v1/delivery-areas` | `{ items }` (área + loja) | `422` |
| `GET /api/v1/offers?productId=` | `{ items }` (oferta comparada) | `404 PRODUCT_NOT_FOUND`, `422` |

- **Paginação** só em `/products`: `?page=` (≥ 1, default 1) e `?pageSize=`
  (1..50, default 20). Os outros dois não paginam — o universo é o número de
  lojas do piloto (`API_GUIDELINES` v1.3).
- **`?slug=`** em `/products` é o lookup por identificador público: é assim que
  a landing resolve `/precos/{slug}` sem uma rota dedicada.
- **`404` e não lista vazia** para produto desconhecido: lista vazia significa
  "ninguém entrega aqui", que é outra resposta — e útil.

Três módulos novos em `apps/api/src/modules/`, nas quatro camadas do
[`CODING_STANDARDS`](../../03-engineering/CODING_STANDARDS.md): **`catalog`**,
**`stores`** e **`offers`**.

**Nenhum módulo lê tabela alheia.** `offers.CompareOffersUseCase` chama
`catalog.FindProductUseCase` e `stores.FindDeliveryCoverageUseCase` — exportados
pelos módulos Nest — e só então consulta a própria tabela `offers`. O JOIN que
uma query só resolveria acontece em memória, sobre dezenas de linhas. É a regra
de fronteira do `CODING_STANDARDS`, e o custo é duas consultas pequenas.

---

## Landing

`apps/landing`, Next.js 16.3.4 (App Router), em `localhost:3002`.

| Rota | O que é |
|---|---|
| `/precos` | Busca do catálogo, paginada |
| `/precos/{productSlug}` | Comparação de um produto, filtrada por bairro ou CEP |
| `/sitemap.xml` | `/`, `/precos` e uma URL por produto ativo (ISR de 5 min) |
| `/robots.txt` | Libera tudo e aponta o sitemap |

- **Server components, com a API chamada pelo servidor** (`src/lib/api.ts`, com
  `import 'server-only'`) — mesmo padrão da `pd-09`: sem CORS, e a URL interna
  não vai ao cliente. As respostas são **parseadas com os schemas dos
  contratos**, nunca aceitas por confiança.
- **Formulários `GET` puros.** Sem Server Action, sem `useState`, sem JavaScript
  de cliente. A URL que sai deles — `/precos?q=golden`,
  `/precos/x?bairro=Méier` — é compartilhável, indexável e funciona com o JS
  desligado, que é o que uma página de aquisição orgânica precisa ser.
- **CEP inválido não vira requisição:** a página valida com `isPostalCode` de
  `packages/domain` — a **mesma** função que a API usaria para recusá-lo — e
  mostra "CEP deve ter 8 dígitos." junto ao campo.
- **A tabela vira cartões abaixo de 640px**, por CSS, sem rolagem horizontal e
  sem uma segunda marcação. O cabeçalho some visualmente mas continua no
  documento; cada célula recupera seu rótulo por `::before`.
- **Cache:** catálogo e áreas com ISR de 5 min; **a comparação é `no-store`** —
  preço é o produto, e um valor de cinco minutos atrás é informação errada na
  tela de quem vai decidir onde comprar.
- **Falha da API** vira mensagem genérica de indisponibilidade: nenhuma URL
  interna, nenhum stack trace (`SECURITY`).
- A home ganhou o link **"Comparar preços"** na topbar, e o item "Preço
  comparado no seu bairro" virou link.

---

## Regras

**Quem aparece.** Toda loja com `status ≠ PAUSED`, com área ativa cobrindo o
endereço e oferta disponível. `ACTIVE` governa o **pedido**, não a **listagem** —
a invariante do `DOMAIN_MODEL` condiciona `ACTIVE` a `psp_recipient_id`, e
exigi-la aqui tornaria toda loja invisível até o PSP existir.

**Como ordena.** Com endereço: `price_cents + delivery_fee_cents` crescente,
desempate por prazo e depois por nome da loja em pt-BR. Sem endereço:
`price_cents` crescente, com `deliveryArea` e `landedCents` nulos e a tela
dizendo que o total depende do endereço. Os desempates existem para a ordem ser
**total**: uma lista que se reordena sozinha entre dois refreshes parece
quebrada.

**Cobertura de entrega.** Bairro **ou** CEP — são alternativas, não condições.
Bairro compara sem acento e sem caixa; CEP compara como string de oito dígitos
dentro da faixa. A regra é função pura em `packages/domain`, e o caso de uso
carrega todas as áreas ativas e filtra **em memória**. Gatilho para levar ao
SQL: mais de ~200 áreas ativas.

**Busca.** O termo é normalizado (sem acento, minúsculas), quebrado em tokens, e
cada token precisa aparecer em `search_text` — `golden 15` acha a Golden de
15 kg e não todas as Golden. Gatilho para `tsvector`/`pg_trgm`: catálogo acima
de ~500 SKUs ou busca ruim medida.

---

## O que esta feature **não** faz ainda

Tudo abaixo é ausência deliberada, não esquecimento:

| Não faz | Por quê |
|---|---|
| Escrita de oferta pelo lojista | Depende de `identity` e do `StoreScopeGuard`, que não existem. Enquanto isso, o seed |
| Página pública da loja (`/lojas/{slug}`) | Nada ainda leva a ela; está no `IDEIAS` |
| "A partir de R$ X" na lista de busca | Exigiria o menor preço por produto na listagem — uma consulta a mais por linha. Está no `IDEIAS` |
| Levar a algum lugar ao escolher a loja | J3 não existe: sem carrinho, sem checkout, sem pagamento |
| Busca full-text (`tsvector`) | Infraestrutura antecipada para dezenas de SKUs; gatilho registrado |
| Paginar a comparação | O universo é o número de lojas do piloto |
| Auditoria de alteração de preço | Não há mutação pela API; o Git é o rastro do seed. O interceptor nasce com o primeiro endpoint de escrita |
| EANs reais | Todos `null`. EAN inventado violaria a invariante de forma disfarçada; `null` é honesto |
| Teste automatizado de UI | As páginas são server components sem estado de cliente; a verificação é o roteiro manual. Gatilho registrado no backlog |
| A mesma jornada em `apps/app` | O app tem só as telas do spike; ele herda estes endpoints quando construir a J2 dele |
| Renderizar o **corpo do 404** no servidor | `/precos/{slug-inexistente}` devolve **status 404** e o `<title>` certo, mas o corpo de `not-found.tsx` só chega no payload do React — com JavaScript desligado a página fica em branco. **Medido na `pd-11`, com causa provada por reprodução mínima:** é como o Next implementa `notFound()` (sinaliza lançando exceção, e o React não renderiza fronteira de erro no SSR), não algo do nosso código. **Não afeta SEO** — o Next injeta `noindex` sozinho, e `title`/`description`/`canonical`/`og:` estão no `<head>` servido de todas as páginas reais. **Decisão do Victor:** manter o 404 verdadeiro em vez de trocá-lo por um *soft 404* de status 200. No backlog, com gatilho |

---

## Como o Victor opera o catálogo hoje

> ⚠️ **As oito lojas do seed são fictícias**, herdadas do spike da `pd-08`, e
> estão marcadas como `PLACEHOLDER` no topo de
> `apps/api/src/seed/data/pilot.ts`. **Elas não podem ir a um deploy público** —
> o item está na lista de intervenção manual do `BACKLOG`.

Não há tela de curadoria: o catálogo é **arquivo versionado**, e o Git é o rastro
de quem mudou qual preço. Com o Postgres local de pé (`npm run db:up`), na raiz:

```bash
# 1. Editar os dados
#    apps/api/src/seed/data/products.ts  → catálogo (marcas, variantes, EANs)
#    apps/api/src/seed/data/pilot.ts     → lojas, áreas de entrega e ofertas

# 2. O seed roda compilado, como tudo em apps/api — build primeiro
npm run build
npm run db:seed

# 3. Conferir
npx prisma studio
```

O seed é **idempotente**: rodar duas vezes imprime as mesmas contagens e não
duplica linha nenhuma (upsert por chave natural — produto por `slug`, loja por
`slug`, área por `(loja, label)`, oferta por `(loja, produto)`).

Ele também **valida tudo antes de escrever qualquer linha**, com as mesmas
funções do domínio e dos contratos que a API usa: slug derivado e sem colisão,
faixas de CEP bem formadas, preço inteiro positivo, e produto que exige receita
sem oferta. Um arquivo inválido aborta o run inteiro — não existe estado
parcial.
