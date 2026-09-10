---
title: Development Guide
status: stable
version: 2.2
updated: 2026-09-10
scope: >
  Como desenvolver no repositório PetDots: pré-requisitos, estrutura do monorepo,
  configuração do ambiente local, comandos e fluxo de trabalho local. Responde
  "como rodar e evoluir o código nesta máquina". Não descreve o fluxo do agente
  de IA (05-ai/AI_DEVELOPMENT_GUIDE), o inventário de stack (TECHNOLOGY_STACK),
  os padrões de código (CODING_STANDARDS) nem o fluxo Git (GIT_WORKFLOW).
relates_to:
  - 02-architecture/TECHNOLOGY_STACK.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 03-engineering/CODING_STANDARDS.md
  - 03-engineering/GIT_WORKFLOW.md
  - 03-engineering/TESTING_STRATEGY.md
  - 05-ai/AI_DEVELOPMENT_GUIDE.md
  - 06-decisions/ADR/0005-bootstrap-monorepo.md
type: engineering
---

# PetDots — Development Guide

> **v2.0 (2026-09-07).** Reescrito no bootstrap do monorepo (`pd-01`): a v1.0
> descrevia a forma **prevista**, com `<gerenciador>` como placeholder e a árvore
> do produto "Vida do Pet". Agora descreve o repositório **real**. As decisões
> por trás dos comandos e versões estão no
> [ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md).

---

## Objetivo

Este guia descreve **como desenvolver no repositório PetDots**: o que instalar, a
forma do monorepo, como subir o ambiente local e o ciclo de trabalho diário.

**Não cobre** (aponta para o irmão, evitando sobreposição):

- A **forma de trabalho do agente de IA** (ler contexto, propor, validar) →
  [`AI_DEVELOPMENT_GUIDE`](../05-ai/AI_DEVELOPMENT_GUIDE.md).
- O **inventário de tecnologias** e versões → [`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md).
- Os **padrões de código** (estilo, estrutura de módulo) → [`CODING_STANDARDS`](./CODING_STANDARDS.md).
- O **fluxo de branches/commits/PR** → [`GIT_WORKFLOW`](./GIT_WORKFLOW.md).
- A **estratégia de testes** → [`TESTING_STRATEGY`](./TESTING_STRATEGY.md).

---

## Pré-requisitos

| Ferramenta | Versão | Papel |
|------------|--------|-------|
| **Node.js** | **24 LTS** (`.nvmrc`; `engines.node: >=24`) | Runtime de backend e tooling |
| **npm** | **11+** (workspaces; `packageManager` fixa `npm@11.16.0`) | Gerenciador do monorepo |
| **Docker** | Desktop ativo | PostgreSQL local **e** o Postgres efêmero dos testes (Testcontainers) |
| **Git** | 2.4x | Convenções em [`GIT_WORKFLOW`](./GIT_WORKFLOW.md) |

> **Expo / EAS CLI** entram quando `apps/app` nascer, no spike-gate (`pd-08`).
> Não são necessários hoje.

A stack completa e o porquê de cada escolha vivem no
[ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md), no
[ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md) e no
`TECHNOLOGY_STACK` — não os repetimos aqui.

---

## Estrutura do monorepo

Layout derivado do [`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md)
v2.0. O que **existe hoje**:

```text
petdots/
├── apps/
│   └── api/              # NestJS 12 (ESM) — Modular Monolith
│       ├── src/
│       │   ├── common/   # HttpExceptionFilter (ERROR_MODEL)
│       │   ├── config/   # validação Zod do ambiente
│       │   ├── health/   # GET /api/v1/health
│       │   ├── prisma/   # PrismaService (global)
│       │   └── openapi.ts
│       └── test/         # e2e (Testcontainers) + contrato OpenAPI
├── packages/
│   ├── config/           # tsconfig, eslint e prettier compartilhados
│   ├── domain/           # regras puras — sem framework, sem I/O
│   └── contracts/        # schemas Zod + openapi.json publicado
├── prisma/               # schema.prisma (sem models até o primeiro agregado)
├── docs/                 # documentação — fonte-da-verdade
└── scripts/              # utilitários do repo (check-frontmatter.sh)
```

O que **ainda não existe**, e quando nasce: `apps/app` (Expo + RN Web) no
spike-gate `pd-08`; `apps/landing` (Next.js) em tarefa própria;
`packages/ui` só se o spike-gate aprovar o cliente universal.
`apps/api/src/modules/<agregado>/` nasce com o primeiro módulo de domínio.

Regras estruturais (de [`ARCHITECTURAL_PRINCIPLES`](../02-architecture/ARCHITECTURAL_PRINCIPLES.md)):

- **`packages/domain` e `packages/contracts` não dependem de UI nem de framework**
  (P9 — preserva o fallback do spike-gate; P1 — domínio no centro).
- `apps/*` dependem de `packages/*`, **nunca o contrário**.
- Cada **módulo da API** corresponde a um agregado-raiz; um módulo só acessa as
  próprias tabelas (P2).
- A camada interna de um módulo segue `controller → application → domain → infra`
  (ver `SYSTEM_ARCHITECTURE` e [`CODING_STANDARDS`](./CODING_STANDARDS.md)).

> **Pacotes são consumidos compilados.** Cada `packages/*` publica `dist/` via
> `main`/`types`; o Turborepo garante que eles sejam construídos antes de
> `apps/api` (`dependsOn: ["^build"]`). Importar `.ts` de outro workspace não
> funciona — o Nest compila com o `rootDir` do próprio app.

---

## Configuração do ambiente local

```bash
nvm use                 # Node 24 (ou instale-o)
npm ci                  # instalação única, na raiz
cp .env.example .env    # ajuste se necessário
npm run db:up           # Postgres 16 em localhost:5437
npm run prisma:generate # gera o Prisma Client
npm run build
```

**Variáveis de ambiente** (nomes em `UPPER_SNAKE_CASE` —
[`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md)): o
`.env.example` traz as quatro que existem hoje — `DATABASE_URL`, `PORT`,
`NODE_ENV`, `LOG_LEVEL`. Chaves de JWT, OAuth e PSP entram junto com os módulos
`identity` e `payments`, não antes. A API **valida o ambiente com Zod no boot** e
falha imediatamente se algo faltar. Segredos **nunca** são commitados (ver
[`SECURITY`](./SECURITY.md)) — e o repositório é **público**.

> **A porta é 5437, não 5432.** O compose tem project name `petdots-mvp` e é
> deliberadamente distinto do compose do protótipo legado (`petdots`, porta
> 5436), para que um `docker compose down` aqui nunca derrube aquele
> (ADR-0005).

**Migrations:** `npm run prisma:migrate`. Hoje o `schema.prisma` **não tem
models** — eles derivam do [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md) e
nascem com o primeiro agregado implementado.

---

## Fluxo de trabalho local

O ciclo diário, alinhado ao **loop AI-first gerar → ler → corrigir**:

1. Sincronizar a branch e criar a branch de trabalho (`GIT_WORKFLOW`).
2. Entender o domínio afetado no `DOMAIN_MODEL` / `GLOSSARY` antes de codar.
3. Definir o contrato (Zod em `packages/contracts` → OpenAPI) **antes** do
   handler (P3 / [`API_GUIDELINES`](../04-api/API_GUIDELINES.md)).
4. Implementar seguindo [`CODING_STANDARDS`](./CODING_STANDARDS.md).
5. Rodar testes e lint localmente (ver `TESTING_STRATEGY`).
6. Commit + PR (ver `GIT_WORKFLOW`); atualizar a documentação afetada.

### Comandos

| Intenção | Comando |
|----------|---------|
| Instalar dependências | `npm ci` (na raiz) |
| Subir a API em dev (watch) | `npm run dev -w @petdots/api` |
| Build de tudo, na ordem certa | `npm run build` |
| Lint | `npm run lint` |
| Checagem de tipos | `npm run typecheck` |
| Testes (unidade + integração) | `npm test` |
| Teste de contrato OpenAPI | `npm run test:contract` |
| **Regenerar** o OpenAPI publicado | `npm run contract:write` |
| Formatar o código | `npm run format` |
| Subir / derrubar o Postgres local | `npm run db:up` / `npm run db:down` |
| Gerar o Prisma Client | `npm run prisma:generate` |
| Migrations do banco | `npm run prisma:migrate` |
| Validar frontmatter de docs | `bash scripts/check-frontmatter.sh <arquivo.md>` |

Endpoints locais: `http://localhost:3001/api/v1/health` e a documentação
navegável em `http://localhost:3001/api/docs`.

> **Mudou um schema Zod?** O teste de contrato vai falhar até que você regenere
> o snapshot com `npm run contract:write` e o commite. Isso é proposital: uma
> mudança de contrato é deliberada e visível no diff (`TESTING_STRATEGY`).

---

## Primeiro passo da implementação: o spike-gate

Antes de construir a UI de produto, o
[ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) exige um
**spike de validação do cliente universal** (Expo + React Native Web) — é a
tarefa `pd-08`. As telas de maior risco a validar são as do **MVP marketplace**
(ADR-0004), listadas no spike-gate de
[`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md): **lista/busca de
catálogo densa com comparador de preços**, **fluxo de checkout** e **painel de
pedidos do lojista**, sempre incluindo layout e usabilidade de **desktop** e
acessibilidade.

Se reprovar, aplica-se o fallback Expo + Next.js, e os `packages/` de
domínio/contratos permitem a separação sem reescrever a lógica — motivo pelo
qual eles nascem isolados da UI desde este bootstrap.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Lista os pré-requisitos e remete a stack ao `TECHNOLOGY_STACK`/ADR-0002.
- [x] Apresenta a estrutura do monorepo derivada do ADR-0002 (packages isolados da UI).
- [x] Descreve a configuração local e o ciclo de trabalho sem duplicar `CODING_STANDARDS`/`GIT_WORKFLOW`/`TESTING_STRATEGY`.
- [x] Remete a forma de trabalho do agente ao `AI_DEVELOPMENT_GUIDE`.
- [x] Scripts e versões exatas preenchidos no bootstrap do repositório.
