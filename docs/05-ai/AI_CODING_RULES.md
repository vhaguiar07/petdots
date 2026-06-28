---
title: PetDots — AI Coding Rules
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Eco operacional para a IA das regras de código: idioma, resumo de nomenclatura,
  qualidade e padrões de API aplicados automaticamente em todo código gerado.
  Deriva das fontes canônicas — NAMING_CONVENTIONS.md (nomes), CODING_STANDARDS.md
  (padrões de código) e API_GUIDELINES.md (convenções de API) — sem substituí-las.
relates_to:
  - 00-foundation/NAMING_CONVENTIONS.md
  - 03-engineering/CODING_STANDARDS.md
  - 04-api/API_GUIDELINES.md
  - AGENTS.md
  - 05-ai/AI_DOMAIN_KNOWLEDGE.md
type: ai
---

# PetDots — AI Coding Rules

> **Fontes canônicas** (este documento é o **eco operacional** para a IA, derivado
> delas — não as redefine nem recopia):
> - **Nomes** → [`NAMING_CONVENTIONS.md`](../00-foundation/NAMING_CONVENTIONS.md).
> - **Padrões de código** (estilo, estrutura de módulo, TS/NestJS/Prisma/Zod) →
>   [`CODING_STANDARDS.md`](../03-engineering/CODING_STANDARDS.md).
> - **Convenções de API** (recursos, status, paginação, OpenAPI canônico) →
>   [`API_GUIDELINES.md`](../04-api/API_GUIDELINES.md).
>
> As tabelas e listas abaixo são **referência rápida operacional** para a IA
> aplicar automaticamente — não substituem nem têm precedência sobre as fontes
> canônicas; em caso de divergência, prevalece a fonte.

---

## Idioma do código

| Contexto                  | Idioma               |
| ------------------------- | -------------------- |
| Código-fonte (todo)       | **Inglês**           |
| Documentação funcional    | **Português (BR)**   |
| Comentários de código     | Inglês               |
| Mensagens de log          | Inglês               |
| Commits                   | Português (BR) — Conventional Commits |

Nunca misture idiomas dentro do mesmo artefato técnico.

---

## Convenções de nomenclatura (resumo operacional)

A tabela completa vive em
[`NAMING_CONVENTIONS.md`](../00-foundation/NAMING_CONVENTIONS.md). Aplique
automaticamente:

| Artefato           | Formato          | Exemplos                                        |
| ------------------ | ---------------- | ----------------------------------------------- |
| Classes / Tipos    | `PascalCase`     | `Pet`, `Tutor`, `TimelineEvent`, `DigitalWallet`|
| Interfaces         | `IPascalCase`    | `IPetRepository`, `IAppointmentScheduler`       |
| Métodos            | `camelCase`      | `createPet()`, `findPetById()`, `scheduleAppointment()` |
| Variáveis          | `camelCase`      | `petName`, `birthDate`, `nextVaccination`       |
| Constantes         | `UPPER_SNAKE_CASE`| `MAX_UPLOAD_SIZE`, `JWT_EXPIRATION_TIME`        |
| Enums (tipo)       | `PascalCase`     | `PetSpecies`, `AppointmentStatus`               |
| Enums (valores)    | `UPPER_SNAKE_CASE`| `DOG`, `CAT`, `SCHEDULED`, `COMPLETED`         |
| Diretórios         | `kebab-case`     | `pet-health`, `appointments`, `user-management`|
| Tabelas (BD)       | `snake_case` plural | `pets`, `tutors`, `appointments`, `timeline_events` |
| Colunas (BD)       | `snake_case`     | `birth_date`, `pet_id`, `created_at`            |
| Chave primária     | `id` (UUID)      | Sempre `id`, tipo UUID.                         |
| Chaves estrangeiras| `entidade_id`    | `pet_id`, `tutor_id`, `appointment_id`          |
| URLs de API        | `kebab-case` plural | `/api/v1/pets`, `/api/v1/appointments`        |
| JSON (campos)      | `camelCase`      | `petId`, `birthDate`, `medicalHistory`          |
| Eventos de domínio | `domain.action`  | `pet.created`, `appointment.completed`          |
| Branches Git       | `tipo/descricao` | `feat/pet-timeline`, `bugfix/login`             |

---

## Qualidade de código

> Fonte canônica de padrões de código: [`CODING_STANDARDS.md`](../03-engineering/CODING_STANDARDS.md).
> O resumo abaixo é a referência rápida operacional.

Todo código gerado deve ser (derivado de `AGENTS.md`, seção "Código"):

- **Pequeno** — funções e métodos com responsabilidade única.
- **Legível** — autoexplicativo; comentários só quando o "porquê" não é óbvio.
- **Bem organizado** — estrutura de diretórios segue o domínio.
- **Facilmente testável** — sem dependências ocultas; injeção de dependência.
- **Orientado ao domínio** — nomes refletem o GLOSSARY, não a implementação técnica.

---

## Padrões de API

> Fonte canônica: [`API_GUIDELINES.md`](../04-api/API_GUIDELINES.md). O resumo
> abaixo é a referência rápida operacional.

Ao gerar endpoints REST:

- Usar substantivos (recursos), nunca verbos na URL.
- Plural para coleções: `/pets`, `/tutors`, `/appointments`.
- Métodos HTTP semânticos: `GET` = consultar, `POST` = criar, `PUT` = substituir,
  `PATCH` = atualizar parcialmente, `DELETE` = remover.
- Campos de resposta JSON em `camelCase`.
- Incluir `petId` nos logs quando o contexto envolver um Pet.

---

## Padrões de banco de dados

- Toda PK é `id` do tipo UUID.
- Toda FK segue `entidade_id` (ex.: `pet_id`, `tutor_id`).
- Tabelas em `snake_case` plural.
- Colunas de auditoria padrão: `created_at`, `updated_at`.
- O modelo físico deve refletir o domínio definido em
  [`DOMAIN_MODEL.md`](../01-product/DOMAIN_MODEL.md) — o `DOMAIN_MODEL.md`
  precede a modelagem de dados.

---

## O que a IA NÃO deve fazer ao codificar

- Usar nomes em Português no código-fonte.
- Inventar nomes para entidades ou eventos não listados em
  [`AI_DOMAIN_KNOWLEDGE.md`](./AI_DOMAIN_KNOWLEDGE.md).
- Usar abreviações (exceto as já canônicas: `id`, `url`, `api`).
- Criar nomes genéricos (`Manager`, `Helper`, `Utils`) sem substantivo de domínio.
- Alterar convenções já estabelecidas sem ADR — mudanças impactam código, banco,
  APIs e histórico do projeto simultaneamente.
