---
title: API Guidelines
status: draft
version: "1.0"
updated: 2026-06-27
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
  `/api/v1/pets`, `/api/v1/tutors`, `/api/v1/pets/{petId}/events`. Nomes compostos
  usam **`kebab-case`** — ampliação deste guia, coerente com o `kebab-case` de
  diretórios do `NAMING_CONVENTIONS` (que, hoje, só normatiza minúsculas/plural
  para URLs).
- **Base versionada** `/api/v1` (política em [`VERSIONING`](./VERSIONING.md)).
- **Hierarquia** reflete o domínio (`DOMAIN_MODEL`): subrecursos sob o agregado —
  ex.: `/api/v1/pets/{petId}/events`, `/api/v1/pets/{petId}/documents`.
- **Identificadores** nas URLs e no JSON em `camelCase` (`petId`), correspondendo
  ao `id` UUID da entidade.

---

## Métodos e status codes

Métodos HTTP semânticos (`NAMING_CONVENTIONS`): `GET` consultar, `POST` criar,
`PUT` substituir, `PATCH` atualizar parcial, `DELETE` remover. Status codes
canônicos:

| Situação | Status |
|----------|--------|
| Sucesso (consulta/atualização) | `200 OK` |
| Recurso criado | `201 Created` (com `Location`) |
| Sucesso sem corpo (ex.: delete) | `204 No Content` |
| Requisição malformada | `400 Bad Request` |
| Falha de validação (Zod) | `422 Unprocessable Entity` |
| Não autenticado | `401 Unauthorized` |
| Autenticado, sem permissão (ownership) | `403 Forbidden` |
| Recurso inexistente | `404 Not Found` |
| Conflito de estado / regra | `409 Conflict` |
| Erro interno | `500 Internal Server Error` |

O **corpo de erro** segue o [`ERROR_MODEL`](./ERROR_MODEL.md) (formato único). A
distinção `401`/`403` e a semântica de ownership estão em [`AUTHENTICATION`](./AUTHENTICATION.md)
e [`SECURITY`](../03-engineering/SECURITY.md).

---

## Corpo, validação e JSON

- **JSON com campos em `camelCase`** (`petId`, `birthDate`, `occurredAt`) —
  `NAMING_CONVENTIONS`.
- **Zod é a fonte única de validação na borda** (ADR-0002): o schema valida a
  entrada no `controller`; falha → `422` com detalhes de campo (ver `ERROR_MODEL`).
- Datas em **ISO 8601 (UTC)**; identificadores em **UUID**.
- Requisições e respostas correspondem exatamente ao **OpenAPI publicado**.

---

## Coleções: paginação, filtros e ordenação

Para endpoints de coleção (ex.: Timeline/Eventos, que podem crescer — jornada J6):

- **Paginação** por query params previsíveis (ex.: `?page=&pageSize=` ou cursor),
  com metadados de paginação na resposta. A `DEFAULT_PAGE_SIZE` é constante
  (`NAMING_CONVENTIONS`).
- **Filtros** por campos do recurso (ex.: `?type=VACCINE&from=&to=` ao listar
  Eventos), em `camelCase`.
- **Ordenação** explícita (ex.: `?sort=occurredAt:desc`); default estável e
  documentado no contrato.

A forma exata (page vs cursor) é decisão de implementação de baixa
reversibilidade, fixada no contrato OpenAPI ao implementar o primeiro endpoint de
coleção; uma vez publicada, muda sob `VERSIONING`.

---

## OpenAPI como contrato canônico

- O **OpenAPI é o contrato canônico de fronteira** (ADR-0002): artefato de primeira
  classe, **gerado a partir dos schemas Zod** e **publicado**; os tipos do cliente
  derivam dele (`TECHNOLOGY_STACK`).
- Um **teste de contrato no CI** impede *drift* entre o OpenAPI publicado e o
  código (ver [`TESTING_STRATEGY`](../03-engineering/TESTING_STRATEGY.md)).
- O contrato é a superfície estável para parceiros (Fase 3) — desenhar pensando
  em terceiros, não só na aplicação.

---

## Critérios

Este documento é considerado pronto quando:

- [x] É a fonte canônica das convenções REST, com o `AI_CODING_RULES` derivando dele.
- [x] Define recursos/URLs, métodos e status codes, remetendo formatos ao `NAMING_CONVENTIONS`.
- [x] Cobre validação Zod, JSON camelCase, paginação, filtros e ordenação.
- [x] Estabelece o OpenAPI canônico (Zod → OpenAPI) com teste de contrato, sem invadir erro/auth/versão.
- [ ] Convenção de paginação (page vs cursor) fixada ao implementar o primeiro endpoint de coleção.
