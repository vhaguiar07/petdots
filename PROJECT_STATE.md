---
title: PetDots — Project State
status: stable
version: 3.2
updated: 2026-06-27
scope: >
  Estado atual do projeto PetDots. Registra a fase, o backlog documental fiel
  ao disco, as decisões arquiteturais registradas e o próximo passo concreto.
  Deve ser o primeiro ponto de consulta antes de iniciar qualquer atividade.
relates_to:
  - docs/README.md
  - docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
  - docs/01-product/DOMAIN_MODEL.md
type: foundation
---

# PetDots — Project State

---

# Objetivo

Este documento representa o estado atual do projeto.

Ele deve ser atualizado continuamente durante toda a evolução do PetDots.

Seu objetivo é permitir que qualquer pessoa ou agente de IA saiba exatamente onde o projeto está e qual é o próximo passo.

---

# Situação Atual

**Fase do Projeto**

Fundação greenfield do ecossistema PetDots (ver [ADR-0001](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md)).

---

## Desenvolvimento

A fundação documental do ecossistema foi estabelecida: visão de produto, domínio, AI-first e decisões arquiteturais estão registrados.

A implementação não foi iniciada nesta nova fundação — nenhum código de produto foi escrito ainda.

O código legado (marketplace same-day em NestJS/Prisma) foi descontinuado e arquivado como referência histórica no Git, conforme decisão registrada em ADR-0001. Não representa o produto sendo construído.

A camada de arquitetura técnica (`docs/02-architecture/`) foi concluída — visão técnica, princípios, stack (ADR-0002), arquitetura de sistema e atributos de qualidade. A implementação do MVP pode iniciar, começando pelo spike-gate do cliente universal (gate do ADR-0002).

---

# Documentação Existente

> Para o índice canônico completo, consulte [docs/README.md](docs/README.md).

## Fundação (`docs/00-foundation/`)

* PRODUCT_VISION.md (stable)
* PRODUCT_PRINCIPLES.md (stable)
* BUSINESS_MODEL.md (stable)
* GLOSSARY.md (stable)
* NAMING_CONVENTIONS.md (stable)
* PRODUCT_ROADMAP.md (draft — roadmap real por fases)
* SUCCESS_METRICS.md (draft)

## Produto (`docs/01-product/`)

* PERSONAS.md (draft)
* DOMAIN_MODEL.md (draft — keystone do domínio)
* MVP_SCOPE.md (draft)

## Arquitetura (`docs/02-architecture/`)

* TECHNICAL_VISION.md (draft)
* ARCHITECTURAL_PRINCIPLES.md (draft)
* TECHNOLOGY_STACK.md (draft)
* SYSTEM_ARCHITECTURE.md (draft)
* QUALITY_ATTRIBUTES.md (draft)

## AI (`docs/05-ai/`)

* AI_CONTEXT.md (draft)
* AI_DOMAIN_KNOWLEDGE.md (draft)
* AI_ARCHITECTURE_RULES.md (draft)
* AI_CODING_RULES.md (draft)
* AI_DEVELOPMENT_GUIDE.md (draft)

## Decisões (`docs/06-decisions/`)

* ADR-0001: Re-fundação — PetDots como ecossistema AI-first (stable, Accepted)
* ADR-0002: Stack tecnológica de fundação (stable, Accepted)
* DECISION_LOG.md (stable)

## Documentação de Referência

* docs/README.md — Índice mestre e única fonte-da-verdade canônica (stable)
* PROJECT_CONTEXT.md (stable)
* PROJECT_STATE.md (este documento, stable)

---

# Documentação Planejada (ainda sem conteúdo)

## Fundação

* [ ] PROJECT_MANIFESTO.md (planned)

## Produto

* [ ] CAPABILITIES.md (planned)
* [ ] FEATURE_CATALOG.md (planned)
* [ ] USER_JOURNEYS.md (planned)

## Engenharia (`docs/03-engineering/`)

* [ ] DEVELOPMENT_GUIDE.md (planned)
* [ ] CODING_STANDARDS.md (planned)
* [ ] GIT_WORKFLOW.md (planned)
* [ ] TESTING_STRATEGY.md (planned)
* [ ] SECURITY.md (planned)
* [ ] OBSERVABILITY.md (planned)
* [ ] DEPLOYMENT.md (planned)

## API (`docs/04-api/`)

* [ ] API_GUIDELINES.md (planned)
* [ ] AUTHENTICATION.md (planned)
* [ ] ERROR_MODEL.md (planned)
* [ ] VERSIONING.md (planned)

---

# Próxima Atividade

A camada de **arquitetura técnica** (`docs/02-architecture/`) está **concluída**: TECHNICAL_VISION, ARCHITECTURAL_PRINCIPLES, TECHNOLOGY_STACK, SYSTEM_ARCHITECTURE e QUALITY_ATTRIBUTES, fundamentados na decisão de stack do [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md).

Próximo passo: **iniciar a implementação do MVP** a partir de [MVP_SCOPE](docs/01-product/MVP_SCOPE.md), começando pelo **spike-gate do cliente universal** (pré-requisito do ADR-0002). Os documentos de `docs/03-engineering/` e `docs/04-api/` são preenchidos conforme a implementação exigir.

---

# Decisões Arquiteturais

* **ADR-0001** — Re-fundação do PetDots como ecossistema AI-first, descontinuação do marketplace legado. Ver [docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).
* **ADR-0002** — Stack tecnológica de fundação (TypeScript · NestJS Modular Monolith · PostgreSQL · Prisma · REST+Zod→OpenAPI · auth próprio · cliente universal Expo/RN-Web com spike-gate). Ver [docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md).

---

# Stack Tecnológica

Decidida no [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md): TypeScript ponta a ponta · monorepo · NestJS (Modular Monolith) · PostgreSQL · Prisma · contrato REST + Zod → OpenAPI canônico · auth próprio (JWT/argon2/OAuth) · cliente universal Expo + React Native Web (condicionado a spike-gate, com fallback Expo + Next.js) · infraestrutura nova só mediante ADR.

O inventário vivo e o detalhamento serão materializados em `docs/02-architecture/TECHNOLOGY_STACK.md` (planned).

---

# Próximo Marco

A camada de arquitetura técnica foi concluída — encerrando a fase de definição.

O próximo marco é a **implementação do MVP** (Fase 1), iniciada pelo spike-gate do cliente universal e seguida pelas capacidades de [MVP_SCOPE](docs/01-product/MVP_SCOPE.md).

---

# Observações

Este documento deve ser atualizado sempre que:

* um documento for concluído;
* uma decisão importante for tomada;
* uma fase do roadmap for iniciada ou concluída;
* houver mudança significativa na direção do projeto.
