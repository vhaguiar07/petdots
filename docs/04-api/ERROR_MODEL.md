---
title: Error Model
status: draft
version: "1.0"
updated: 2026-06-27
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
    "code": "PET_NOT_FOUND",
    "message": "Pet não encontrado.",
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
- Convenção: `RECURSO_CONDICAO` — ex.: `PET_NOT_FOUND`, `TUTOR_ALREADY_EXISTS`,
  `OWNERSHIP_DENIED`, `VALIDATION_FAILED`, `TOKEN_EXPIRED`.

### Mapeamento código → status (exemplos)

| `code` | Status HTTP |
|--------|-------------|
| `VALIDATION_FAILED` | `422` |
| `UNAUTHENTICATED` / `TOKEN_EXPIRED` | `401` |
| `OWNERSHIP_DENIED` | `403` |
| `PET_NOT_FOUND` | `404` |
| `TUTOR_ALREADY_EXISTS` | `409` |
| `INTERNAL_ERROR` | `500` |

A tabela completa de situação → status canônico vive em `API_GUIDELINES`; aqui
ligamos cada **código** ao status correspondente.

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
