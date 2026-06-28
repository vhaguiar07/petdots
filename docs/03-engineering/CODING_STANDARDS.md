---
title: Coding Standards
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Fonte canônica dos padrões de código do PetDots: idioma do código, estilo
  TypeScript, estrutura interna de um módulo (controller/application/domain/infra)
  e padrões de NestJS/Prisma/Zod. Define "como o código é escrito e organizado".
  Para os NOMES, referencia NAMING_CONVENTIONS (não recopia a tabela); para a
  topologia de módulos, SYSTEM_ARCHITECTURE; para o contrato HTTP, API_GUIDELINES.
relates_to:
  - 00-foundation/NAMING_CONVENTIONS.md
  - 02-architecture/ARCHITECTURAL_PRINCIPLES.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 03-engineering/DEVELOPMENT_GUIDE.md
  - 03-engineering/TESTING_STRATEGY.md
  - 04-api/API_GUIDELINES.md
  - 05-ai/AI_CODING_RULES.md
type: engineering
---

# PetDots — Coding Standards

> **Fonte canônica dos padrões de código.** O eco operacional para a IA vive em
> [`AI_CODING_RULES`](../05-ai/AI_CODING_RULES.md), que **deriva deste documento**
> (não o contrário). Para os **nomes**, a fonte é
> [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md) — aqui não a
> recopiamos.

---

## Objetivo

Definir **como o código do PetDots é escrito e organizado** para que seja
pequeno, legível, testável e orientado ao domínio — por humanos e por agentes
(princípio P6 de [`ARCHITECTURAL_PRINCIPLES`](../02-architecture/ARCHITECTURAL_PRINCIPLES.md)).

**Não cobre** (aponta para o irmão): os **nomes** (casing de classes, tabelas,
eventos, branches) → [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md);
a **topologia de módulos e fluxos** → [`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md);
o **contrato HTTP** (status, paginação, recursos) → [`API_GUIDELINES`](../04-api/API_GUIDELINES.md);
o **formato de erro** → [`ERROR_MODEL`](../04-api/ERROR_MODEL.md).

---

## Idioma do código

Conforme [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md)
("Idiomas Oficiais"), que é a fonte:

- **Código-fonte, comentários e mensagens de log: Inglês.**
- **Documentação funcional: Português (BR).**
- Nunca misturar idiomas dentro do mesmo artefato técnico.

Os nomes refletem a **linguagem ubíqua** do [`GLOSSARY`](../00-foundation/GLOSSARY.md)
e o mapeamento PT↔EN do [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md) — nunca a
implementação técnica.

---

## Estilo TypeScript

- **TypeScript estrito.** `strict: true`; proibido `any` implícito; preferir tipos
  e `unknown` a `any`.
- **Imutabilidade por padrão:** `const`; evitar mutação de parâmetros.
- **Funções pequenas, responsabilidade única**; favorecer funções puras no domínio.
- **Sem "magia" no ponto de uso** (P6): nada de metaprogramação opaca; comportamento
  previsível e explícito.
- **Comentários** só quando o *porquê* não é óbvio (`AGENTS.md`); o código deve ser
  autoexplicativo. Sem código morto/comentado.
- **Formatação e lint automáticos** (formatter + linter pinados no bootstrap — ver
  [`DEVELOPMENT_GUIDE`](./DEVELOPMENT_GUIDE.md)); o estilo não é debatido em PR.
- **Erros explícitos:** lançar erros de domínio tipados; não engolir exceções nem
  usar `catch` vazio. O mapeamento HTTP do erro pertence ao [`ERROR_MODEL`](../04-api/ERROR_MODEL.md).

---

## Estrutura interna de um módulo

Cada módulo da API corresponde a um agregado e segue as quatro camadas de
[`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md), com a regra
firme de **dependências apontando para o domínio** (P1):

```text
modules/<agregado>/
├── <agregado>.controller.ts   # HTTP: valida (Zod), chama o caso de uso, devolve o contrato
├── application/               # casos de uso (orquestração); sem HTTP, sem SQL
├── domain/                    # entidades + invariantes; sem framework, sem Prisma
│   └── i<agregado>.repository.ts   # porta (interface) do repositório
└── infra/                     # adapters: repositório Prisma, integrações
```

Regras por camada:

| Camada | Pode depender de | Nunca contém |
|--------|------------------|--------------|
| `controller` | `application`, contratos (Zod) | regra de negócio, acesso a banco |
| `application` | `domain`, portas (interfaces) | HTTP, Prisma, detalhes de framework |
| `domain` | nada externo (TS puro) | NestJS, Prisma, Express, Zod de borda |
| `infra` | `domain` (implementa as portas) | regra de negócio |

- **Invariantes vivem na raiz do agregado** (P4), não em `if`s espalhados nem só em
  testes (ex.: Pet ID imutável; Pet sempre com ≥1 Tutor).
- Um módulo **só acessa as próprias tabelas**; integra com outro por caso de uso ou
  evento de domínio `domain.action` (P2) — nunca por JOIN cruzando fronteira.

---

## Padrões NestJS / Prisma / Zod

- **NestJS:** um módulo Nest por agregado; injeção de dependência para tudo
  (repositórios via interface/token), nunca instanciação manual. Transversais
  (AuthGuard, OwnershipGuard, Audit, validação) como guards/interceptors na borda
  (ver `SYSTEM_ARCHITECTURE`).
- **Prisma:** repositórios na camada `infra` implementam as portas do `domain`; o
  `schema.prisma` deriva do [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md); PK `id`
  UUID, FK `entidade_id`, `created_at`/`updated_at` (`NAMING_CONVENTIONS`). SQL fino
  via `$queryRaw` — sem trocar de ORM (ADR-0002).
- **Zod:** schema é a **fonte única de validação na borda**; vive em
  `packages/contracts` e gera o OpenAPI (ver [`API_GUIDELINES`](../04-api/API_GUIDELINES.md)).
  A validação acontece no `controller`, antes do caso de uso.
- **Nada de `Manager`/`Helper`/`Utils` genéricos** sem substantivo de domínio
  (`NAMING_CONVENTIONS`).

---

## Critérios

Este documento é considerado pronto quando:

- [x] É a fonte canônica de estilo e estrutura de código, com o `AI_CODING_RULES` derivando dele.
- [x] Define a estrutura de módulo (controller/application/domain/infra) e a direção de dependência (P1).
- [x] Cobre os padrões de TS, NestJS, Prisma e Zod sem recopiar `NAMING_CONVENTIONS`.
- [x] Remete nomes, contrato HTTP e formato de erro aos docs irmãos (sem sobreposição).
- [ ] Revisado contra o primeiro módulo real implementado (ex.: `pets`).
