---
title: API Guidelines
status: draft
version: "1.6"
updated: 2026-09-13
scope: >
  Fonte canônica das convenções REST do PetDots: recursos (substantivos, plural),
  base /api/v1, JSON camelCase, métodos e status codes, paginação, filtros e
  ordenação, e o OpenAPI como contrato canônico de fronteira (Zod → OpenAPI).
  Deriva do ADR-0002 e de AI_CODING_RULES ("Padrões de API"). Para os FORMATOS de
  nome referencia NAMING_CONVENTIONS; erro, auth e versionamento vivem nos irmãos.
relates_to:
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 00-foundation/NAMING_CONVENTIONS.md
  - 04-api/AUTHENTICATION.md
  - 04-api/ERROR_MODEL.md
  - 04-api/VERSIONING.md
  - 05-ai/AI_CODING_RULES.md
type: api
---

# PetDots — API Guidelines

> **Fonte canônica das convenções REST.** O eco operacional para a IA é a seção
> "Padrões de API" de [`AI_CODING_RULES`](../05-ai/AI_CODING_RULES.md), que
> **deriva deste documento**. Os **formatos de nome** (URLs, métodos HTTP, JSON)
> são definidos em [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md) —
> aqui não os recopiamos; ampliamos com status, paginação, filtros e o contrato.

---

## Objetivo

Definir **como as APIs do PetDots são desenhadas** — previsíveis, consistentes e
portáveis, servindo aplicação, Portal Empresas e parceiros futuros (API-first, P3).
Deriva do [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md)
(REST + Zod → OpenAPI canônico).

**Não cobre:** o **formato de erro** → [`ERROR_MODEL`](./ERROR_MODEL.md); o **fluxo
de autenticação** → [`AUTHENTICATION`](./AUTHENTICATION.md); a **política de
versão/deprecação** → [`VERSIONING`](./VERSIONING.md).

---

## Recursos e URLs

Conforme `NAMING_CONVENTIONS` (a fonte dos formatos: minúsculas, substantivos,
plural):

- **Recursos são substantivos, no plural, em minúsculas**, nunca verbos:
  `/api/v1/products`, `/api/v1/stores`, `/api/v1/orders`. Nomes compostos
  usam **`kebab-case`** — ampliação deste guia, coerente com o `kebab-case` de
  diretórios do `NAMING_CONVENTIONS` (que, hoje, só normatiza minúsculas/plural
  para URLs).
- **Base versionada** `/api/v1` (política em [`VERSIONING`](./VERSIONING.md)).
- **Hierarquia** reflete o domínio (`DOMAIN_MODEL`): subrecursos sob o agregado —
  ex.: `/api/v1/stores/{storeId}/offers`,
  `/api/v1/stores/{storeId}/delivery-areas`, `/api/v1/orders/{orderId}/items`.
- **Identificadores** nas URLs e no JSON em `camelCase` (`storeId`, `orderId`),
  correspondendo ao `id` UUID da entidade.

---

## Métodos e status codes

Métodos HTTP semânticos (`NAMING_CONVENTIONS`): `GET` consultar, `POST` criar,
`PUT` substituir, `PATCH` atualizar parcial, `DELETE` remover. Status codes
canônicos:

| Situação | Status |
|----------|--------|
| Sucesso (consulta/atualização) | `200 OK` |
| Recurso criado | `201 Created` (com `Location`, **quando existe rota de leitura** — ver abaixo) |
| Sucesso sem corpo (ex.: delete) | `204 No Content` |
| Requisição malformada | `400 Bad Request` |
| Falha de validação (Zod) | `422 Unprocessable Entity` |
| Não autenticado | `401 Unauthorized` |
| Autenticado, sem permissão (escopo de loja) | `403 Forbidden` |
| Recurso inexistente | `404 Not Found` |
| Conflito de estado / regra | `409 Conflict` |
| Erro interno | `500 Internal Server Error` |

O **corpo de erro** segue o [`ERROR_MODEL`](./ERROR_MODEL.md) (formato único). A
distinção `401`/`403` e a semântica de escopo de loja estão em [`AUTHENTICATION`](./AUTHENTICATION.md)
e [`SECURITY`](../03-engineering/SECURITY.md).

### `Location` no `201`: quando se omite

O header `Location` aponta para **onde ler o recurso criado**. Recurso **sem
rota de leitura** não ganha o header — apontar para uma rota inexistente é pior
que a ausência, porque promete ao cliente algo que responderia `404`.

O caso real é `POST /api/v1/waitlist-entries` (`pd-09`): a lista de espera é PII
sem leitura pública, então não existe `GET /waitlist-entries/{id}` e o `201`
**omite o `Location`** — devolvendo, em compensação, a representação completa da
entrada no corpo. A regra geral segue valendo: **havendo rota de leitura, o
`Location` é obrigatório.**

### Recurso que não cria nada: `POST` com `200`

`POST /api/v1/order-quotes` → **`200`**, não `201` (`pd-15`). A cotação
precifica um carrinho e **não persiste nada**, então não há recurso criado nem
`Location` para apontar. O `POST` está ali pelo corpo que a operação precisa
receber, não porque algo passe a existir — e o recurso é um substantivo no
plural (`order-quotes`), não `/orders/quote`, que seria um verbo disfarçado.

### O singleton do usuário corrente — `/me`

Fixado na `pd-14` (ADR-0015), com `/tutors/me`:

| Item | Valor |
|---|---|
| Leitura | `GET /tutors/me` — `404` com código específico enquanto o recurso não existe |
| Escrita | `PUT /tutors/me` — **upsert idempotente**, responde `200` **sempre** |
| `Location` | **Omitido**: o recurso criado é a própria rota chamada |
| Sub-recurso | `/tutors/me/pets`, com `201` + `Location` normal (há rota de leitura) |
| Posse | Recurso de outro dono responde **`404`**, nunca `403` |

**Por que `PUT` e não `POST`:** um singleton não tem segundo estado a
distinguir. Uma tela só — o formulário, vazio ou preenchido — serve criar e
editar, e um `POST` repetido num celular com rede ruim daria `409` onde o `PUT`
repetido dá o mesmo resultado.

**Por que `200` sempre, e não `201`/`200` conforme o caso:** o cliente **não
distingue** criar de atualizar num singleton, por desenho — não há nada que ele
faria diferente. Um status dinâmico ainda exigiria contornar o `@ZodResponse`,
que declara um status por rota.

**Por que `me` e não o id:** o recurso é quem está com o token. Um id no
caminho seria um id que alguém pode trocar, e transformaria toda rota numa
verificação de posse a mais.

**Por que a posse responde `404`:** `403` confirma que o id existe e pertence a
alguém — exatamente o fato que um estranho não pode sondar. Ver
[`ERROR_MODEL`](./ERROR_MODEL.md).

**Escrita que move dinheiro exige idempotência.** `POST /api/v1/orders` e o
endpoint de webhook do PSP aceitam/exigem chave de idempotência
(`Idempotency-Key` no primeiro; `psp_payment_id` no segundo): repetir a mesma
requisição não cria segundo pedido nem segundo repasse.

### `Idempotency-Key`: obrigatório, e por coluna

Fixado na `pd-15` ([ADR-0017](../06-decisions/ADR/0017-pedido-antes-do-pagamento.md)),
com `POST /api/v1/orders` — a primeira e, por ora, única rota que o exige:

| Item | Valor |
|---|---|
| Header | `Idempotency-Key`, **obrigatório**, UUID |
| Ausente ou inválido | `422 VALIDATION_FAILED`, com `details[].field = 'Idempotency-Key'` |
| Replay | **`201` com o mesmo pedido**, não `200` nem `409` |
| Onde vive | Coluna, com índice único `(tutor_id, idempotency_key)` |
| Quem gera | O cliente, ao abrir o checkout; troca após o sucesso |

**Por que obrigatório e não opcional:** idempotência que o cliente pode pular é
idempotência que ninguém usa, e esta é a única rota onde repetir significa
cobrar duas vezes.

**Por que `201` no replay:** o cliente que tentou de novo numa rede ruim **não
sabe** se a primeira tentativa chegou — e não precisa saber. Um status
diferente vazaria essa distinção e o obrigaria a tratá-la.

**Por que coluna e não interceptor:** o `SYSTEM_ARCHITECTURE` previa um
"Idempotency interceptor". Um interceptor genérico que guarda respostas é
infraestrutura antecipada para uma rota; a coluna faz o mesmo trabalho, é
verificável por constraint, e a corrida entre duas requisições simultâneas cai
na violação de unicidade — que o caso de uso trata relendo o pedido vencedor.

### Ação como sub-recurso substantivo

`POST /api/v1/orders/{orderId}/cancellation` → **`200`**, com o pedido no novo
estado (`pd-15`).

Um substantivo, e não `/orders/{id}/cancel`: este guia proíbe verbos em URL, e
um cancelamento é uma coisa que passa a existir. `200` e não `201` porque o
que o cliente quer de volta é **o pedido**, e o cancelamento em si não tem rota
de leitura — a mesma razão pela qual a lista de espera omite o `Location`. O
precedente de forma é `/auth/*`.

A `pd-16` estendeu o precedente ao lado da loja, com **cinco substantivos
novos** sob `/stores/{storeId}/orders/{orderId}`, todos `200` com o pedido no
novo estado:

| Sub-recurso | Transição |
|---|---|
| `/acceptance` | `PLACED` → `ACCEPTED` |
| `/rejection` | `PLACED` → `REJECTED` |
| `/dispatch` | `ACCEPTED` → `DISPATCHED` |
| `/delivery-confirmation` | `DISPATCHED` → `DELIVERED` |
| `/cancellation` | `ACCEPTED` → `CANCELLED` |

⚠️ **`delivery-confirmation` e não `delivery`**: `Delivery` é uma entidade da
capacidade 8, e usar a palavra aqui colidiria com ela no dia em que um
entregador for modelado. `dispatch` é substantivo em inglês ("o despacho"), e
foi escolhido por isso.

#### `PATCH` quando o sub-recurso é uma linha de verdade

`PATCH /api/v1/stores/{storeId}/orders/{orderId}/items/{orderItemId}`
→ **`200`**, corpo `{ "fulfillment": "UNAVAILABLE" }` (`pd-16`).

Aqui não é ação, é **atualização parcial de um recurso que existe** — o exemplo
que este guia já usava para `/orders/{id}/items`. O corpo aceita um literal e
não o enum inteiro: `SUBSTITUTED` não tem produtor no domínio, e aceitá-lo
seria uma API prometendo uma transição que não existe.

#### Sub-recursos que separam **permissão**, não estado

`PUT /stores/{storeId}/offers/{offerId}/price` e
`.../availability` (`pd-16`) são dois sub-recursos da mesma oferta porque
carregam permissões diferentes: o preço é do `OWNER`, a disponibilidade é dos
dois papéis (ADR-0013). Um `PATCH` único sobre a oferta teria de autorizar
campo a campo dentro do handler — que é exatamente o tipo de regra que não se
enxerga lendo a rota.

---

## Corpo, validação e JSON

- **JSON com campos em `camelCase`** (`storeId`, `placedAt`, `unitPriceCents`) —
  `NAMING_CONVENTIONS`.
- **Dinheiro e percentual são inteiros** no contrato: `*Cents` e `*Bps`. Nunca
  ponto flutuante em corpo de requisição ou resposta (`DOMAIN_MODEL`).
- **Zod é a fonte única de validação na borda** (ADR-0002): o schema valida a
  entrada no `controller`; falha → `422` com detalhes de campo (ver `ERROR_MODEL`).
- Datas em **ISO 8601 (UTC)**; identificadores em **UUID**.
- Requisições e respostas correspondem exatamente ao **OpenAPI publicado**.

---

## Coleções: paginação, filtros e ordenação

Para endpoints de coleção que podem crescer — busca do catálogo, ofertas de um
produto, fila de pedidos da loja:

- **Paginação** por query params previsíveis (ex.: `?page=&pageSize=` ou cursor),
  com metadados de paginação na resposta. A `DEFAULT_PAGE_SIZE` é constante
  (`NAMING_CONVENTIONS`).
- **Filtros** por campos do recurso, em `camelCase`. ✅ Implementado na
  `pd-16` na fila da loja: `GET /stores/{storeId}/orders?status=PLACED,ACCEPTED`
  — **lista separada por vírgula**, ausente significa tudo. Um valor
  desconhecido é `422` nomeando a entrada que falhou (`status.0`), e não uma
  lista vazia, que o cliente leria como "nenhum pedido".
- **Um parâmetro pode ampliar o que uma rota pública devolve**, quando o que
  ele revela não é sensível: `GET /stores/{storeId}/offers?unavailable=true`
  (`pd-16`) acrescenta as ofertas indisponíveis, que é o que o painel da loja
  lista. Sem o parâmetro nada muda, então vitrine e comparador ficam intactos.
- **Ordenação** explícita (ex.: `?sort=placedAt:desc`); default estável e
  documentado no contrato.

### A forma está fixada: **offset**, `?page=&pageSize=`

O primeiro endpoint de coleção foi `GET /api/v1/products` (`pd-11`), e com ele a
forma ficou decidida (ADR-0010):

| Item | Valor |
|---|---|
| Query | `?page=&pageSize=` |
| `page` | inteiro ≥ 1, default **1** |
| `pageSize` | inteiro de 1 a **50** (`MAX_PAGE_SIZE`), default **20** (`DEFAULT_PAGE_SIZE`) |
| Resposta | `{ items, page, pageSize, total }` |
| Fora da faixa | `422 VALIDATION_FAILED`, com `details[].field` apontando o parâmetro |

**Por que offset e não cursor:** cursor resolve feed infinito, que o PetDots não
tem. A página pública de busca do comparador tem links numerados e precisa
saltar para a página 4 — e `total` é o que permite desenhar esses links. A
escolha é reversível para frente: uma forma por cursor pode ser acrescentada
sem quebrar esta, porque a resposta já é um envelope.

**Coleção pequena e limitada não pagina.** `GET /api/v1/offers?productId=`,
`GET /api/v1/delivery-areas`, `GET /api/v1/tutors/me/pets` e — desde a `pd-15` —
`GET /api/v1/orders` devolvem `{ items }` sem metadados: o universo é o número
de lojas do piloto, ou o punhado de pets e pedidos de um tutor, e paginar seria
cerimônia. O critério é haver um limite natural conhecido — se ele cair, o
endpoint passa a paginar sob `VERSIONING`. **Gatilho nomeado para `/orders`:
o primeiro tutor com mais de ~50 pedidos.**

**Filtro como lookup por identificador público.** `GET /products?slug=` resolve
a URL `/precos/{slug}` sem uma rota dedicada: é o mesmo recurso, filtrado. Uma
rota `/products/by-slug/{slug}` seria um verbo disfarçado de recurso.

Uma vez publicada, a forma muda sob `VERSIONING`.

---

## OpenAPI como contrato canônico

- O **OpenAPI é o contrato canônico de fronteira** (ADR-0002): artefato de primeira
  classe, **gerado a partir dos schemas Zod** e **publicado**; os tipos do cliente
  derivam dele (`TECHNOLOGY_STACK`).
- Um **teste de contrato no CI** impede *drift* entre o OpenAPI publicado e o
  código (ver [`TESTING_STRATEGY`](../03-engineering/TESTING_STRATEGY.md)).
- O contrato é a superfície estável para a **API pública de parceiros (Fase 4)** —
  desenhar pensando em terceiros, não só na aplicação.

---

## Critérios

Este documento é considerado pronto quando:

- [x] É a fonte canônica das convenções REST, com o `AI_CODING_RULES` derivando dele.
- [x] Define recursos/URLs, métodos e status codes, remetendo formatos ao `NAMING_CONVENTIONS`.
- [x] Cobre validação Zod, JSON camelCase, paginação, filtros e ordenação.
- [x] Estabelece o OpenAPI canônico (Zod → OpenAPI) com teste de contrato, sem invadir erro/auth/versão.
- [x] Convenção de paginação (page vs cursor) fixada ao implementar o primeiro
      endpoint de coleção — `GET /api/v1/products` (`pd-11`, 11/09/2026):
      **offset**, `?page=&pageSize=`, envelope `{ items, page, pageSize, total }`
      (ADR-0010).
