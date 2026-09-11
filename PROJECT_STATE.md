---
title: PetDots — Project State
status: stable
version: "4.6"
updated: 2026-09-11
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

> **v4.6 (2026-09-11).** O repositório passou a ter **duas linhas de
> integração** ([ADR-0009](docs/06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md)):
> `develop` recebe todas as tarefas, **`master` só avança a pedido explícito do
> Victor**. ⚠️ **Consequência:** este documento, o `BACKLOG` e os demais docs de
> estado descrevem a **`develop`** — `master` pode estar atrás, e quem clona cai
> nela. A `pd-09` já está integrada na `develop` (`37d4633`) e **não** em
> `master`.
>
> **v4.5 (2026-09-11).** Atualizado no encerramento da `pd-09` — **a
> implementação do produto começou**. Saíram juntos, numa entrega só: a
> **primeira migration** do projeto (`waitlist_entries`), o **primeiro módulo de
> domínio** da API (`waitlist`, nas quatro camadas do `CODING_STANDARDS`), o
> workspace **`apps/landing`** em Next.js 16 com a captura da lista de espera, e
> a camada de documentação **`docs/08-features/`**. A frase "ainda não há módulo
> de domínio", que valia desde o bootstrap, deixou de valer.
>
> **v4.4 (2026-09-11).** Atualizado no encerramento da `pd-08` — o **spike-gate
> do cliente universal foi executado e aprovado**
> ([ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)).
> Com isso o projeto deixa de ter bloqueador: a camada de cliente está definida e
> as capacidades do `MVP_SCOPE` podem ser implementadas.
>
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

E a `pd-08` (11/09/2026) executou o **spike-gate do cliente universal**, que era
o último bloqueador do projeto:

- nasceu **`apps/app`** — Expo 57 + React Native Web + `expo-router`, ESM como os
  demais workspaces, com `lint`, `typecheck` e um `build` (`expo export
  --platform web`) que já rodam no CI pelo Turborepo;
- as **três jornadas de maior risco** (J2 comparador, J3 checkout, J4 painel do
  lojista) foram construídas sobre fixtures locais, com 343 ofertas e 40 pedidos;
- o **Victor aprovou o gate** em 11/09/2026, após percorrer as telas no
  navegador: **zero violações `serious`/`critical`** do `axe-core`, **60 fps**
  rolando a lista densa, e semântica de DOM obtida com **8 componentes-envelope**
  e **nenhuma anotação por elemento**. Decisão, medições e versões pinadas no
  [ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md);
- ⚠️ as telas em `apps/app/src/spike/` são **descartáveis** — provaram a
  plataforma, não são a UI de produto. O que sobrevive é o workspace e o
  vocabulário de UI em `src/spike/ui/`.

**A implementação do produto começou em 11/09/2026, pela tarefa `pd-09`** — uma
branch com cinco entregas que atravessam a pilha inteira:

- **primeira migration** do projeto (`20260911155642_create_waitlist_entries`): a
  tabela `waitlist_entries`, com o telefone normalizado em E.164 e **único** — a
  constraint que faz o smoke test contar pessoas, não submissões;
- **primeiro módulo de domínio** da API: `apps/api/src/modules/waitlist/`, nas
  quatro camadas do [`CODING_STANDARDS`](docs/03-engineering/CODING_STANDARDS.md),
  servindo `POST /api/v1/waitlist-entries` (`201`/`409`/`422`). É o padrão que os
  dez módulos seguintes copiam;
- **`packages/domain`** ganhou as primeiras regras de negócio de verdade
  (normalização de telefone e CEP), e **`packages/contracts`** passou a usá-las
  para validar na borda — uma fonte só para "o que é um telefone válido";
- **`apps/landing`**: Next.js 16.3.4, a landing pública do smoke test
  ([`LISTA_DE_ESPERA`](docs/08-features/waitlist/LISTA_DE_ESPERA.md));
- nasceu **`docs/08-features/`**, a leitura transversal do que está implementado.

Os dez agregados restantes do [`DOMAIN_MODEL`](docs/01-product/DOMAIN_MODEL.md)
seguem **não modelados no banco**, por escolha: cada um entra com a feature que o
exercita. As decisões do bootstrap estão no
[ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md).

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
* USER_JOURNEYS.md (stable, v2.1 — 9 jornadas, dois lados; resultado do spike-gate)

## Arquitetura (`docs/02-architecture/`)

* TECHNICAL_VISION.md (stable, v2.0 — núcleo = transação recorrente)
* ARCHITECTURAL_PRINCIPLES.md (draft, v1.1)
* TECHNOLOGY_STACK.md (stable, v1.5 — versões exatas pinadas; cliente universal sem condicional)
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
* ADR-0008: Cliente universal Expo + React Native Web — resultado do spike-gate (Accepted)
* DECISION_LOG.md (stable, v1.5)

## Processo (`docs/07-process/`)

* DIRETRIZES_FLUXO_IA.md (stable — as três fases e os portões)
* BACKLOG.md (stable — **fonte das pendências**)
* BUGS.md (stable)
* IDEIAS.md (stable)
* relatorios-de-branch/ (um por branch encerrada)

## Features implementadas (`docs/08-features/`)

Camada nascida na `pd-09` — a leitura transversal (banco → API → cliente) do que
**existe no código**, em oposição ao produto pretendido das camadas 00–06.

* waitlist/LISTA_DE_ESPERA.md (stable — captura do smoke test)

## Documentação de Referência

* docs/README.md — Índice mestre e única fonte-da-verdade canônica (stable)
* PROJECT_CONTEXT.md (stable)
* PROJECT_STATE.md (este documento, stable)

---

# Próxima Atividade

**O eixo catálogo → oferta → comparador** (capacidades 3 e 5 do
[`MVP_SCOPE`](docs/01-product/MVP_SCOPE.md)) — a **Joia 2** e a jornada **J2**,
que é a que o spike da `pd-08` já desenhou e a que dá ao visitante um motivo para
voltar.

As duas frentes que a `pd-08` deixou abertas se resolveram: a `pd-09` entregou a
`apps/landing`, e com ela o primeiro agregado ponta a ponta — do schema Zod em
`packages/contracts` ao endpoint testado contra Postgres real. O caminho está
trilhado; o que falta agora é o produto que transaciona.

⚠️ **Antes de virar código, o ciclo do dinheiro pós-captura precisa de ADR:**
estorno, prazo de aceite e política de cancelamento — hoje rastreados no
[`BACKLOG`](docs/07-process/BACKLOG.md) §"Decisões pendentes (modelagem)", para
onde migraram na `pd-09`. O catálogo e o comparador **não** dependem desse ADR
(são leitura); `orders` e `payments` dependem. As demais pendências estão no
backlog — a fonte, que este documento não duplica.

---

# Decisões Arquiteturais

* **ADR-0001** — Re-fundação do PetDots como ecossistema AI-first, descontinuação do marketplace legado. Ver [ADR-0001](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).
* **ADR-0002** — Stack tecnológica de fundação (TypeScript · NestJS Modular Monolith · PostgreSQL · Prisma · REST+Zod→OpenAPI · auth próprio · cliente universal Expo/RN-Web com spike-gate). Ver [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md).
* **ADR-0003** — Monetização do piloto e pagamento via split (take rate, Pix primeiro, subconta por loja). Ver [ADR-0003](docs/06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md).
* **ADR-0004** — Arquitetura do MVP marketplace: módulos por agregado, dinheiro em centavos e percentuais em bps, regras puras em `packages/domain`. Ver [ADR-0004](docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md).
* **ADR-0005** — Bootstrap do monorepo: npm workspaces + Turborepo, Node 24, Nest 11/Prisma 6/TS 5.9 pinados, CommonJS, e o arquivamento do legado. Ver [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md).
* **ADR-0007** — Migração para ESM, NestJS 12 e Prisma 7: o Nest 12 é ESM-only, o que tornou a migração o mesmo movimento que destravava o Prisma; peer do `nestjs-zod` forçado por override; vulnerabilidades fechadas por `overrides`, não por upgrade. Revisa os pins do ADR-0005. Ver [ADR-0007](docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md).
* **ADR-0006** — Instrumentação OpenTelemetry da API: instrumentações escolhidas a dedo, SDK no primeiro import, desligado por padrão com motivo logado, coletor local em dev, span sem segredo nem PII — e a escolha do serviço gerenciado adiada até existir deploy. Ver [ADR-0006](docs/06-decisions/ADR/0006-instrumentacao-opentelemetry.md).
* **ADR-0009** — Duas linhas de integração: `develop` recebe todas as tarefas, `master` só avança a pedido explícito do Victor, e as tags de release saem só de `master`. Substitui o trunk único que vigorava desde o bootstrap. Decisão do Victor em 11/09/2026, depois de a IA recomendar o contrário — o valor buscado não é técnico, é ter uma linha que ele reconhece como aprovada por ele. Ver [ADR-0009](docs/06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md).
* **ADR-0008** — Cliente universal Expo + React Native Web **aprovado** no spike-gate: cumpre a condição que o ADR-0002 #12 deixou aberta, sem substituí-lo. O veredicto é do Victor, sustentado por medição — semântica de DOM obtida com 8 componentes-envelope e nenhuma anotação por elemento, zero violação `serious` do `axe-core`, 60 fps na lista densa. Pina o eixo Expo/React Native e mantém o fallback Expo + Next.js como saída preservada. Ver [ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md).

---

# Stack Tecnológica

Decidida no [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md), com as versões fixadas no [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md), revisadas no [ADR-0007](docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md) e ampliadas no [ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md): TypeScript ponta a ponta (**ESM**) · monorepo npm workspaces + Turborepo · NestJS 12 (Modular Monolith) · PostgreSQL 16 · Prisma 7 (driver adapter) · contrato REST + Zod 4 → OpenAPI canônico · auth próprio (JWT/argon2/OAuth) · **cliente universal Expo 57 + React Native Web 0.21 (spike-gate aprovado em 11/09/2026; fallback Expo + Next.js preservado como saída)** · `apps/landing` em Next.js para o que precisa de SEO · infraestrutura nova só mediante ADR.

O inventário vivo é [`docs/02-architecture/TECHNOLOGY_STACK.md`](docs/02-architecture/TECHNOLOGY_STACK.md) — fonte canônica em caso de divergência.

---

# Próximo Marco

**Primeira capacidade funcional do MVP marketplace em pé**, atravessando o
contrato: do schema Zod ao endpoint testado contra Postgres real, e daí à tela
em `apps/app`. O spike-gate (`pd-08`) já respondeu a pergunta que vinha antes —
a UI é o **cliente universal** —, e essa era a decisão que definia o formato de
tudo que vem depois.

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
