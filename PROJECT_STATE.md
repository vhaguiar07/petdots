---
title: PetDots — Project State
status: stable
version: 4.0
updated: 2026-09-07
scope: >
  Estado atual do projeto PetDots. Registra a fase, o inventário documental fiel
  ao disco, as decisões arquiteturais registradas e o próximo passo concreto.
  Deve ser o primeiro ponto de consulta antes de iniciar qualquer atividade.
  Pendências detalhadas vivem em docs/07-process/BACKLOG.md, não aqui.
relates_to:
  - docs/README.md
  - docs/07-process/BACKLOG.md
  - docs/06-decisions/ADR/0005-bootstrap-monorepo.md
  - docs/01-product/DOMAIN_MODEL.md
type: foundation
---

# PetDots — Project State

> **v4.0 (2026-09-07).** Atualizado no encerramento da `pd-01` (bootstrap do
> monorepo). A v3.4 era de 27/06 e havia envelhecido em três pontos: listava as
> camadas 03/04 como "planejadas" quando já existiam, não conhecia os ADRs
> 0003/0004/0005 nem a camada `07-process`, e dizia que não havia código.

---

# Objetivo

Este documento representa o estado atual do projeto.

Ele deve ser atualizado continuamente durante toda a evolução do PetDots.

Seu objetivo é permitir que qualquer pessoa ou agente de IA saiba exatamente onde o projeto está e qual é o próximo passo.

---

# Situação Atual

**Fase do Projeto**

Início da implementação do **MVP marketplace** ([ADR-0004](docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md)), sobre a fundação greenfield do [ADR-0001](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).

---

## Desenvolvimento

A fundação documental está completa (camadas 00–07) e o **monorepo foi bootstrapado** em 07/09/2026 pela tarefa `pd-01`:

- raiz com npm workspaces + Turborepo, Node 24, versões pinadas no lockfile;
- `packages/config` (tsconfig/eslint/prettier), `packages/domain` (regras puras) e `packages/contracts` (schemas Zod + OpenAPI publicado);
- `apps/api` em NestJS 11 com `GET /api/v1/health` (processo + Postgres), logs JSON com `requestId`/`correlationId`, validação Zod na borda e o formato de erro do [`ERROR_MODEL`](docs/04-api/ERROR_MODEL.md);
- testes de unidade, de integração com Postgres efêmero (Testcontainers) e de contrato OpenAPI, todos gate no CI do GitHub.

**Ainda não há módulo de domínio.** O `prisma/schema.prisma` existe sem models: eles derivam do [`DOMAIN_MODEL`](docs/01-product/DOMAIN_MODEL.md) e nascem com o primeiro agregado implementado. As decisões do bootstrap estão no [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md).

O protótipo legado (marketplace same-day em NestJS/Prisma) foi **arquivado na tag `legacy-marketplace`** (commit `8a9625b`) e as branches que o carregavam foram removidas. Ele é referência de capacidade, **nunca fonte de código** (anti-contaminação, ADR-0001/0002).

---

# Documentação Existente

> Para o índice canônico completo, consulte [docs/README.md](docs/README.md).

## Fundação (`docs/00-foundation/`)

* PRODUCT_VISION.md (stable)
* PRODUCT_PRINCIPLES.md (stable)
* PROJECT_MANIFESTO.md (draft — carta de fundação)
* BUSINESS_MODEL.md (stable)
* GLOSSARY.md (stable)
* NAMING_CONVENTIONS.md (stable)
* PRODUCT_ROADMAP.md (outdated — ver backlog)
* SUCCESS_METRICS.md (draft)

## Produto (`docs/01-product/`)

* PERSONAS.md (draft)
* DOMAIN_MODEL.md (draft — keystone do domínio)
* MVP_SCOPE.md (outdated — contradiz o ADR-0004; ver backlog)
* CAPABILITIES.md (draft)
* FEATURE_CATALOG.md (draft)
* USER_JOURNEYS.md (draft)

## Arquitetura (`docs/02-architecture/`)

* TECHNICAL_VISION.md (draft)
* ARCHITECTURAL_PRINCIPLES.md (draft)
* TECHNOLOGY_STACK.md (stable, v1.2 — versões exatas pinadas)
* SYSTEM_ARCHITECTURE.md (stable, v2.0 — MVP marketplace)
* QUALITY_ATTRIBUTES.md (draft)

## Engenharia (`docs/03-engineering/`)

* DEVELOPMENT_GUIDE.md (stable, v2.0 — repositório real)
* CODING_STANDARDS.md (draft — fonte canônica de padrões de código)
* GIT_WORKFLOW.md (draft)
* TESTING_STRATEGY.md (draft)
* SECURITY.md (draft — fonte canônica de segurança)
* OBSERVABILITY.md (draft)
* DEPLOYMENT.md (draft)

## API (`docs/04-api/`)

* API_GUIDELINES.md (draft — fonte canônica de convenções REST)
* AUTHENTICATION.md (draft)
* ERROR_MODEL.md (draft)
* VERSIONING.md (draft)

> ⚠️ As camadas 03 e 04 foram escritas para o produto **"Vida do Pet"** e ainda
> carregam exemplos daquele domínio (`pet_tutors`, Timeline, upload S3). As
> regras seguem válidas; os exemplos, não. Item registrado no backlog.

## AI (`docs/05-ai/`)

* AI_CONTEXT.md (draft)
* AI_DOMAIN_KNOWLEDGE.md (draft)
* AI_ARCHITECTURE_RULES.md (draft)
* AI_CODING_RULES.md (draft)
* AI_DEVELOPMENT_GUIDE.md (draft)

## Decisões (`docs/06-decisions/`)

* ADR-0001: Re-fundação — PetDots como ecossistema AI-first (Accepted)
* ADR-0002: Stack tecnológica de fundação (Accepted)
* ADR-0003: Monetização do piloto e pagamento via split (Accepted)
* ADR-0004: Arquitetura do MVP marketplace (Accepted)
* ADR-0005: Bootstrap do monorepo — gerenciador, orquestrador e versões pinadas (Accepted)
* DECISION_LOG.md (stable)

## Processo (`docs/07-process/`)

* DIRETRIZES_FLUXO_IA.md (stable — as três fases e os portões)
* BACKLOG.md (stable — **fonte das pendências**)
* BUGS.md (stable)
* IDEIAS.md (stable)
* relatorios-de-branch/ (um por branch encerrada)

## Documentação de Referência

* docs/README.md — Índice mestre e única fonte-da-verdade canônica (stable)
* PROJECT_CONTEXT.md (stable)
* PROJECT_STATE.md (este documento, stable)

---

# Próxima Atividade

**`pd-02` — spike-gate do cliente universal**, pré-requisito do
[ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md) antes de
construir qualquer UI de produto. Ele nasce em `apps/app` (Expo + React Native
Web) e valida as telas de maior risco do MVP marketplace — **catálogo/busca com
comparador de preços, checkout e painel de pedidos do lojista** —, sempre com
layout e usabilidade de **desktop** e acessibilidade. Critérios e fallback em
[`TECHNOLOGY_STACK`](docs/02-architecture/TECHNOLOGY_STACK.md), seção
"Spike-gate do cliente universal".

As demais pendências (incluindo a contradição entre `MVP_SCOPE` e o ADR-0004,
que precisa ser resolvida antes de implementar escopo funcional) estão em
[`docs/07-process/BACKLOG.md`](docs/07-process/BACKLOG.md) — a fonte, que este
documento não duplica.

---

# Decisões Arquiteturais

* **ADR-0001** — Re-fundação do PetDots como ecossistema AI-first, descontinuação do marketplace legado. Ver [ADR-0001](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).
* **ADR-0002** — Stack tecnológica de fundação (TypeScript · NestJS Modular Monolith · PostgreSQL · Prisma · REST+Zod→OpenAPI · auth próprio · cliente universal Expo/RN-Web com spike-gate). Ver [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md).
* **ADR-0003** — Monetização do piloto e pagamento via split (take rate, Pix primeiro, subconta por loja). Ver [ADR-0003](docs/06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md).
* **ADR-0004** — Arquitetura do MVP marketplace: módulos por agregado, dinheiro em centavos e percentuais em bps, regras puras em `packages/domain`. Ver [ADR-0004](docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md).
* **ADR-0005** — Bootstrap do monorepo: npm workspaces + Turborepo, Node 24, Nest 11/Prisma 6/TS 5.9 pinados, CommonJS, e o arquivamento do legado. Ver [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md).

---

# Stack Tecnológica

Decidida no [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e com as versões fixadas no [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md): TypeScript ponta a ponta · monorepo npm workspaces + Turborepo · NestJS 11 (Modular Monolith) · PostgreSQL 16 · Prisma 6 · contrato REST + Zod 4 → OpenAPI canônico · auth próprio (JWT/argon2/OAuth) · cliente universal Expo + React Native Web (condicionado a spike-gate, com fallback Expo + Next.js) · infraestrutura nova só mediante ADR.

O inventário vivo é [`docs/02-architecture/TECHNOLOGY_STACK.md`](docs/02-architecture/TECHNOLOGY_STACK.md) — fonte canônica em caso de divergência.

---

# Próximo Marco

**Primeira capacidade funcional do MVP marketplace em pé**, atravessando o
contrato: do schema Zod ao endpoint testado contra Postgres real. O spike-gate
(`pd-02`) decide antes se a UI será cliente universal ou o fallback — decisão que
muda o formato de tudo que vem depois, e por isso vem primeiro.

---

# Observações

Este documento deve ser atualizado sempre que:

* um documento for concluído;
* uma decisão importante for tomada;
* uma fase do roadmap for iniciada ou concluída;
* houver mudança significativa na direção do projeto.
