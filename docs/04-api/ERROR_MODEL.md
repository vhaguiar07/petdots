---
title: Error Model
status: draft
version: "1.6"
updated: 2026-09-12
scope: >
  Formato padrão de erro da API do PetDots: estrutura única da resposta de falha,
  códigos de erro estáveis, mapeamento para status HTTP e o detalhe de erros de
  validação do Zod. Define "como uma falha é comunicada". Os status codes e
  convenções gerais vivem em API_GUIDELINES; os de auth em AUTHENTICATION; o que é
  logado/rastreado em OBSERVABILITY.
relates_to:
  - 04-api/API_GUIDELINES.md
  - 04-api/AUTHENTICATION.md
  - 04-api/VERSIONING.md
  - 03-engineering/OBSERVABILITY.md
type: api
---

# PetDots — Error Model

> O **catálogo de status codes** e as convenções gerais estão em
> [`API_GUIDELINES`](./API_GUIDELINES.md); aqui definimos o **formato do corpo**
> de uma resposta de falha e os **códigos de erro** estáveis.

---

## Objetivo

Garantir que **toda falha da API seja comunicada no mesmo formato**, previsível e
legível por humanos e por agentes — para que clientes e o cliente universal tratem
erros de forma uniforme.

**Não cobre:** a tabela de status HTTP por situação → [`API_GUIDELINES`](./API_GUIDELINES.md);
a semântica de `401`/`403` → [`AUTHENTICATION`](./AUTHENTICATION.md); como erros
são logados/rastreados → [`OBSERVABILITY`](../03-engineering/OBSERVABILITY.md).

---

## Formato padrão da resposta de erro

Toda falha retorna um corpo JSON único, com campos em `camelCase`
([`API_GUIDELINES`](./API_GUIDELINES.md)), sob a chave `error`:

```json
{
  "error": {
    "code": "STORE_NOT_FOUND",
    "message": "Loja não encontrada.",
    "details": [],
    "requestId": "..."
  }
}
```

- **`code`** — código de erro estável em `UPPER_SNAKE_CASE`, independente do idioma
  e da mensagem; é o que o cliente programa contra.
- **`message`** — descrição legível (a mensagem ao usuário final é
  responsabilidade do cliente; aqui é orientação).
- **`details`** — lista opcional para erros compostos (ex.: validação por campo).
- **`requestId`** — correlaciona com os logs/traces (`correlationId`/`requestId` —
  ver [`OBSERVABILITY`](../03-engineering/OBSERVABILITY.md) e `NAMING_CONVENTIONS`).

Nunca incluir dado sensível, stack trace ou segredo no corpo de erro (`SECURITY`).

---

## Códigos de erro

- Códigos são **estáveis** (parte do contrato): adicionar é não-disruptivo;
  remover/renomear segue a política de [`VERSIONING`](./VERSIONING.md).
- Convenção: `RECURSO_CONDICAO` — ex.: `STORE_NOT_FOUND`, `TUTOR_ALREADY_EXISTS`,
  `STORE_SCOPE_DENIED`, `VALIDATION_FAILED`, `TOKEN_EXPIRED`.

### Mapeamento código → status (exemplos)

| `code` | Status HTTP |
|--------|-------------|
| `VALIDATION_FAILED` | `422` |
| `UNAUTHENTICATED` / `TOKEN_EXPIRED` | `401` |
| `STORE_SCOPE_DENIED` | `403` |
| `STORE_NOT_FOUND` | `404` |
| `PRODUCT_NOT_FOUND` | `404` |
| `TUTOR_NOT_FOUND` | `404` |
| `PET_NOT_FOUND` | `404` |
| `POSTAL_CODE_NOT_FOUND` | `404` |
| `POSTAL_CODE_LOOKUP_UNAVAILABLE` | `503` |
| `TUTOR_ALREADY_EXISTS` | `409` |
| `WAITLIST_ENTRY_ALREADY_EXISTS` | `409` |
| `ADDRESS_OUT_OF_DELIVERY_AREA` | `422` |
| `OFFER_UNAVAILABLE` | `409` |
| `STORE_NOT_ACTIVE` | `409` |
| `ORDER_INVALID_TRANSITION` | `409` |
| `INTERNAL_ERROR` | `500` |

> **Por que `422` para endereço fora de área:** a requisição está bem formada e
> o cliente está autorizado; o que falha é uma **regra de negócio** sobre o dado
> enviado — o mesmo critério que põe a falha de validação Zod em `422`.
> Conflitos de **estado** (oferta indisponível, loja inativa, transição inválida)
> são `409`.

> **`STORE_NOT_FOUND` também responde por loja `PAUSED`** em
> `GET /stores/{storeId}` e `GET /stores/{storeId}/offers` (`pd-13`). Não são
> duas condições com um código só por descuido: uma loja pausada é invisível no
> comparador (ADR-0010), e devolvê-la na página dela criaria uma vitrine que a
> prateleira se recusa a preencher. Para quem chega por um link velho, "essa
> loja não existe no piloto" é a resposta verdadeira.

> **`TUTOR_NOT_FOUND` não é um erro excepcional** (`pd-14`). O cadastro cria
> `User` e mais nada (ADR-0011, A10), então **toda conta começa assim**: é o que
> diz ao app "perfil incompleto → onboarding". Por isso o cliente trata esse
> código — e só esse — como "não há perfil ainda"; qualquer outra falha continua
> sendo falha.

> **`TUTOR_ALREADY_EXISTS` está na tabela mas não é produzido por nada.** O
> exemplo é anterior à implementação: `PUT /tutors/me` é upsert idempotente e
> nunca conflita (ADR-0015, D6). Fica listado como código reservado.

> **Por que `404 PET_NOT_FOUND` e não `403` para pet de outro tutor**
> (`pd-14`): `403` diria "existe, e não é seu" — confirmando ao mesmo tempo que
> o id é real e que tem dono, que é o que um estranho sondaria. `404` é também
> a resposta **verdadeira** do ponto de vista de quem pergunta: no conjunto que
> essa pessoa pode enxergar, o pet não está lá. A posse é imposta no `where` da
> própria consulta, então não existe caminho em que a linha alheia chega à mão e
> só depois é escondida.

> 🔴 **`POSTAL_CODE_NOT_FOUND` (404) × `POSTAL_CODE_LOOKUP_UNAVAILABLE` (503)**
> (`pd-14`, ADR-0016). Mesma tela, fatos opostos: o `404` diz "esse CEP não
> existe" — a pessoa digitou errado; o `503` diz "**não conseguimos
> perguntar**" — o diretório de terceiro não respondeu, e o CEP pode estar
> perfeitamente certo. Colapsar os dois faria a aplicação acusar o usuário de um
> erro que é nosso. É o único `503` do catálogo, e existe por isso.

> **Por que `PRODUCT_NOT_FOUND` e não lista vazia** em
> `GET /offers?productId=…`: as duas respostas dizem coisas diferentes. Lista
> vazia significa "**ninguém entrega este produto aqui**", que é informação útil
> e leva o visitante à lista de espera; `404` significa "**este produto não
> existe**", que é um link quebrado. Confundir as duas esconderia um erro de URL
> atrás de uma tela legítima (ADR-0010).

A tabela completa de situação → status canônico vive em `API_GUIDELINES`; aqui
ligamos cada **código** ao status correspondente.

### Código específico × genérico do status

Um status serve a muitas condições, então o código **não** se deduz do status:

- Quando o handler sabe qual regra falhou, ele **diz o código** — foi assim que
  `WAITLIST_ENTRY_ALREADY_EXISTS` chegou ao `409` na `pd-09`, em vez do genérico
  `CONFLICT`. Na prática, a exceção carrega `code` no corpo e o
  `HttpExceptionFilter` o honra.
- Quando não sabe, cai no **genérico do status**. O genérico do `403` é
  **`FORBIDDEN`** — deliberadamente neutro: quem nomeia a regra é o código
  específico (`STORE_SCOPE_DENIED`, para escopo de loja). Até a `pd-09` o
  genérico era `OWNERSHIP_DENIED`, resquício do produto v1.0, que dizia mais do
  que o filtro podia saber.

---

## Erros de validação (Zod)

Como o **Zod é a fonte única de validação na borda** (ADR-0002 / `API_GUIDELINES`),
falhas de schema retornam **`422`** com `code: "VALIDATION_FAILED"` e o detalhe por
campo em `details`:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Falha de validação.",
    "details": [
      { "field": "birthDate", "message": "Data inválida." },
      { "field": "species", "message": "Valor fora do enum PetSpecies." }
    ]
  }
}
```

O `field` usa o caminho do campo no payload (`camelCase`), espelhando o erro do Zod.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define o formato único da resposta de erro (`error.code/message/details/requestId`).
- [x] Estabelece códigos estáveis em `UPPER_SNAKE_CASE` e o mapeamento para status HTTP.
- [x] Especifica o detalhe de erros de validação do Zod (`422` + `details` por campo).
- [x] Remete status canônicos a `API_GUIDELINES`, auth a `AUTHENTICATION` e correlação a `OBSERVABILITY`.
- [ ] Catálogo de códigos consolidado conforme os endpoints reais forem implementados.
      *(Aberto: **nove** códigos reais até aqui — `WAITLIST_ENTRY_ALREADY_EXISTS`
      (`pd-09`), `PRODUCT_NOT_FOUND` (`pd-11`), `EMAIL_ALREADY_REGISTERED` e
      `UNAUTHENTICATED` (`pd-12`), `STORE_NOT_FOUND` (`pd-13`) e
      `TUTOR_NOT_FOUND`, `PET_NOT_FOUND`, `POSTAL_CODE_NOT_FOUND` e
      `POSTAL_CODE_LOOKUP_UNAVAILABLE` (`pd-14`). O consolidado
      depende do ciclo do dinheiro, onde nasce a maioria dos códigos de conflito
      de estado.)*
