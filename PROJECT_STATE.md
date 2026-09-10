---
title: PetDots — Project State
status: stable
version: 4.3
updated: 2026-09-10
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

> **v4.3 (2026-09-10).** Atualizado no encerramento da `pd-07`
> (re-sincronização documental sob o [ADR-0004](docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md)).
> Registra também a `pd-06` (critério de débito e backlog em duas filas),
> encerrada em 08/09/2026. **A numeração do spike-gate mudou:** era chamado de
> `pd-02` desde junho, mas a sequência já está em `pd-07` — o spike é a `pd-08`.
>
> **v4.2 (2026-09-08).** Atualizado no encerramento da `pd-05` (migração ESM,
> NestJS 12 e Prisma 7 — [ADR-0007](docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md)).
>
> **v4.1 (2026-09-08).** Atualizado no encerramento da `pd-04` (instrumentação
> OpenTelemetry). Registra também a `pd-03` (ESLint 10 + checagem de dependência
> não declarada), encerrada no mesmo dia.
>
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
- `apps/api` em NestJS 12 (ESM) com `GET /api/v1/health` (processo + Postgres), logs JSON com `requestId`/`correlationId`, validação Zod na borda e o formato de erro do [`ERROR_MODEL`](docs/04-api/ERROR_MODEL.md);
- testes de unidade, de integração com Postgres efêmero (Testcontainers) e de contrato OpenAPI, todos gate no CI do GitHub.

Duas tarefas de manutenção da fundação foram entregues em 08/09/2026, ambas
antes do primeiro módulo de domínio, de propósito:

- **`pd-03`** — ESLint 10 em todos os workspaces e uma regra que barra import de
  dependência não declarada no `package.json` do próprio workspace (fechando o
  furo do hoisting do npm).
- **`pd-04`** — **OpenTelemetry instrumentado** na API: traces e métricas por
  OTLP, spans de HTTP/Express/Prisma no mesmo trace e `trace_id` na linha de log.
  Desligado por padrão, ligado por `OTEL_EXPORTER_OTLP_ENDPOINT`; coletor local
  em dev (`npm run otel:up`). O **serviço gerenciado de destino ainda não foi
  escolhido** — shortlist, critério e gatilho no
  [ADR-0006](docs/06-decisions/ADR/0006-instrumentacao-opentelemetry.md).

Duas tarefas de processo e documentação fecharam a fundação:

- **`pd-06`** (08/09/2026) — critério para abrir tarefa só de débito, obrigação
  de resolver na própria tarefa o débito encontrado nela, e divisão do débito
  técnico do backlog em **fila** (acionável) e **vigilância** (esperando
  gatilho). Origem: "matar débito não é avanço; avanço é produto andando".
- **`pd-07`** (10/09/2026) — **re-sincronização documental sob o ADR-0004.**
  Vinte e nove documentos deixaram de descrever o produto anterior ("Vida do
  Pet"): `PRODUCT_ROADMAP`, `MVP_SCOPE`, `PERSONAS`, `CAPABILITIES`,
  `FEATURE_CATALOG`, `USER_JOURNEYS`, `SUCCESS_METRICS`, `GLOSSARY`,
  `TECHNICAL_VISION`, `AI_CONTEXT` e `AI_DOMAIN_KNOWLEDGE` foram reescritos;
  `PRODUCT_VISION` e `PRODUCT_PRINCIPLES` receberam emenda cirúrgica (o §8
  passou de "Marketplace é uma Consequência" para "A Cunha Vence Primeiro"); e
  os **exemplos** das camadas 02, 03, 04 e 05 passaram do domínio antigo para
  loja, oferta, pedido e split, preservando as regras.

**Ainda não há módulo de domínio.** O `prisma/schema.prisma` existe sem models: eles derivam do [`DOMAIN_MODEL`](docs/01-product/DOMAIN_MODEL.md) e nascem com o primeiro agregado implementado. As decisões do bootstrap estão no [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md).

O protótipo legado (marketplace same-day em NestJS/Prisma) foi **arquivado na tag `legacy-marketplace`** (commit `8a9625b`) e as branches que o carregavam foram removidas. Ele é referência de capacidade, **nunca fonte de código** (anti-contaminação, ADR-0001/0002).

---

# Documentação Existente

> Para o índice canônico completo, consulte [docs/README.md](docs/README.md).

> Status e versão conforme o frontmatter de cada arquivo em 10/09/2026.

## Fundação (`docs/00-foundation/`)

* PRODUCT_VISION.md (stable, v1.1 — dois níveis de posicionamento)
* PRODUCT_PRINCIPLES.md (stable, v1.1 — §8 "A Cunha Vence Primeiro")
* PROJECT_MANIFESTO.md (draft — carta de fundação)
* BUSINESS_MODEL.md (stable, v2.0)
* GLOSSARY.md (stable, v2.0 — termos do marketplace)
* NAMING_CONVENTIONS.md (stable, v1.2)
* PRODUCT_ROADMAP.md (stable, v2.0 — seis fases, F1 = cunha)
* SUCCESS_METRICS.md (draft, v2.0 — North Star de recorrência)
* IDEACAO_FASE1.md (documento vivo de brainstorm, sem frontmatter)

## Produto (`docs/01-product/`)

* PERSONAS.md (stable, v2.0 — Tutor e Lojista em P1)
* DOMAIN_MODEL.md (stable, v2.1 — keystone do domínio)
* MVP_SCOPE.md (stable, v2.0 — **fonte autoritativa do escopo da Fase 1**)
* CAPABILITIES.md (stable, v2.0)
* FEATURE_CATALOG.md (stable, v2.0)
* USER_JOURNEYS.md (stable, v2.0 — 9 jornadas, dois lados)

## Arquitetura (`docs/02-architecture/`)

* TECHNICAL_VISION.md (stable, v2.0 — núcleo = transação recorrente)
* ARCHITECTURAL_PRINCIPLES.md (draft, v1.1)
* TECHNOLOGY_STACK.md (stable, v1.4 — versões exatas pinadas)
* SYSTEM_ARCHITECTURE.md (stable, v2.0 — MVP marketplace)
* QUALITY_ATTRIBUTES.md (draft, v1.1)

## Engenharia (`docs/03-engineering/`)

* DEVELOPMENT_GUIDE.md (stable, v2.2 — repositório real)
* CODING_STANDARDS.md (draft, v1.2 — fonte canônica de padrões de código)
* GIT_WORKFLOW.md (draft, v1.2)
* TESTING_STRATEGY.md (draft, v1.1)
* SECURITY.md (draft, v1.1 — fonte canônica de segurança)
* OBSERVABILITY.md (draft, v1.2)
* DEPLOYMENT.md (draft, v1.1)

## API (`docs/04-api/`)

* API_GUIDELINES.md (draft, v1.1 — fonte canônica de convenções REST)
* AUTHENTICATION.md (draft, v1.1)
* ERROR_MODEL.md (draft, v1.1)
* VERSIONING.md (draft, v1.1)

## AI (`docs/05-ai/`)

* AI_CONTEXT.md (stable, v3.0 — **primeiro documento que um agente lê**)
* AI_DOMAIN_KNOWLEDGE.md (stable, v2.0 — domínio destilado para gerar código)
* AI_ARCHITECTURE_RULES.md (draft, v1.1)
* AI_CODING_RULES.md (draft, v1.1)
* AI_DEVELOPMENT_GUIDE.md (draft, v1.1)

## Decisões (`docs/06-decisions/`)

* ADR-0001: Re-fundação — PetDots como ecossistema AI-first (Accepted)
* ADR-0002: Stack tecnológica de fundação (Accepted)
* ADR-0003: Monetização do piloto e pagamento via split (Accepted)
* ADR-0004: Arquitetura do MVP marketplace (Accepted)
* ADR-0005: Bootstrap do monorepo — gerenciador, orquestrador e versões pinadas (Accepted)
* ADR-0006: Instrumentação OpenTelemetry da API (Accepted)
* ADR-0007: Migração para ESM, NestJS 12 e Prisma 7 (Accepted)
* DECISION_LOG.md (stable, v1.4)

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

**`pd-08` — spike-gate do cliente universal**, pré-requisito do
[ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md) antes de
construir qualquer UI de produto. Ele nasce em `apps/app` (Expo + React Native
Web) e valida as telas de maior risco do MVP marketplace — **catálogo/busca com
comparador de preços, checkout e painel de pedidos do lojista** —, sempre com
layout e usabilidade de **desktop** e acessibilidade. Critérios e fallback em
[`TECHNOLOGY_STACK`](docs/02-architecture/TECHNOLOGY_STACK.md), seção
"Spike-gate do cliente universal"; as jornadas correspondentes (J2, J3, J4) em
[`USER_JOURNEYS`](docs/01-product/USER_JOURNEYS.md).

> ⚠️ **O spike era chamado de `pd-02`** em todo o repositório até 10/09/2026.
> Rótulo defasado: ele não foi executado enquanto as `pd-03` a `pd-07`
> aconteceram, e a numeração é sequencial. **É a `pd-08`.**

A contradição entre `MVP_SCOPE` e o ADR-0004, que bloqueava a implementação de
escopo funcional, **foi resolvida na `pd-07`**. As demais pendências estão em
[`docs/07-process/BACKLOG.md`](docs/07-process/BACKLOG.md) — a fonte, que este
documento não duplica.

---

# Decisões Arquiteturais

* **ADR-0001** — Re-fundação do PetDots como ecossistema AI-first, descontinuação do marketplace legado. Ver [ADR-0001](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).
* **ADR-0002** — Stack tecnológica de fundação (TypeScript · NestJS Modular Monolith · PostgreSQL · Prisma · REST+Zod→OpenAPI · auth próprio · cliente universal Expo/RN-Web com spike-gate). Ver [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md).
* **ADR-0003** — Monetização do piloto e pagamento via split (take rate, Pix primeiro, subconta por loja). Ver [ADR-0003](docs/06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md).
* **ADR-0004** — Arquitetura do MVP marketplace: módulos por agregado, dinheiro em centavos e percentuais em bps, regras puras em `packages/domain`. Ver [ADR-0004](docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md).
* **ADR-0005** — Bootstrap do monorepo: npm workspaces + Turborepo, Node 24, Nest 11/Prisma 6/TS 5.9 pinados, CommonJS, e o arquivamento do legado. Ver [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md).
* **ADR-0007** — Migração para ESM, NestJS 12 e Prisma 7: o Nest 12 é ESM-only, o que tornou a migração o mesmo movimento que destravava o Prisma; peer do `nestjs-zod` forçado por override; vulnerabilidades fechadas por `overrides`, não por upgrade. Revisa os pins do ADR-0005. Ver [ADR-0007](docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md).
* **ADR-0006** — Instrumentação OpenTelemetry da API: instrumentações escolhidas a dedo, SDK no primeiro import, desligado por padrão com motivo logado, coletor local em dev, span sem segredo nem PII — e a escolha do serviço gerenciado adiada até existir deploy. Ver [ADR-0006](docs/06-decisions/ADR/0006-instrumentacao-opentelemetry.md).

---

# Stack Tecnológica

Decidida no [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e com as versões fixadas no [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md) e revisadas no [ADR-0007](docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md): TypeScript ponta a ponta (**ESM**) · monorepo npm workspaces + Turborepo · NestJS 12 (Modular Monolith) · PostgreSQL 16 · Prisma 7 (driver adapter) · contrato REST + Zod 4 → OpenAPI canônico · auth próprio (JWT/argon2/OAuth) · cliente universal Expo + React Native Web (condicionado a spike-gate, com fallback Expo + Next.js) · infraestrutura nova só mediante ADR.

O inventário vivo é [`docs/02-architecture/TECHNOLOGY_STACK.md`](docs/02-architecture/TECHNOLOGY_STACK.md) — fonte canônica em caso de divergência.

---

# Próximo Marco

**Primeira capacidade funcional do MVP marketplace em pé**, atravessando o
contrato: do schema Zod ao endpoint testado contra Postgres real. O spike-gate
(`pd-08`) decide antes se a UI será cliente universal ou o fallback — decisão que
muda o formato de tudo que vem depois, e por isso vem primeiro.

O escopo funcional a implementar está em
[`MVP_SCOPE`](docs/01-product/MVP_SCOPE.md) (v2.0), que agora é confiável — e
cuja seção "Pendências de modelagem que o escopo assume" lista o que precisa de
ADR antes de virar código, começando pelo ciclo do dinheiro pós-captura
(estorno, prazo de aceite, cancelamento).

---

# Observações

Este documento deve ser atualizado sempre que:

* um documento for concluído;
* uma decisão importante for tomada;
* uma fase do roadmap for iniciada ou concluída;
* houver mudança significativa na direção do projeto.
