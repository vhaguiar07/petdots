---
title: PetDots
status: stable
version: 1.2
updated: 2026-08-31
scope: >
  README raiz do repositório PetDots. Apresenta o ecossistema, a stack
  tecnológica, como executar a stack completa e encaminha o leitor para a
  documentação estruturada em docs/.
relates_to:
  - docs/README.md
  - docs/05-ai/AI_CONTEXT.md
  - docs/02-architecture/TECHNOLOGY_STACK.md
  - docs/03-engineering/DEVELOPMENT_GUIDE.md
  - docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
type: foundation
---

# PetDots

**Toda a vida do pet em um único lugar.**

O PetDots é uma plataforma digital AI-first que centraliza a jornada completa do animal de estimação — saúde, bem-estar, serviços, produtos e conexão com o ecossistema pet (tutores, clínicas, pet shops, prestadores e ONGs). O produto nasce com inteligência artificial como princípio de design, não como adição posterior, e é documentado em [`docs/`](docs/) como fonte canônica de decisões estratégicas, funcionais e técnicas.

Para entender o projeto em profundidade, comece por [`docs/README.md`](docs/README.md) (índice mestre) e [`docs/05-ai/AI_CONTEXT.md`](docs/05-ai/AI_CONTEXT.md) (contexto para agentes de IA e novos colaboradores).

---

## Documentação

A documentação vive em [`docs/`](docs/) e está organizada em clusters temáticos:

| Cluster | Conteúdo |
|---|---|
| [`00-foundation/`](docs/00-foundation/) | Visão, princípios, modelo de negócio, glossário |
| [`01-product/`](docs/01-product/) | Personas, domínio, jornadas, funcionalidades |
| [`02-architecture/`](docs/02-architecture/) | Arquitetura, stack tecnológica, atributos de qualidade |
| [`03-engineering/`](docs/03-engineering/) | Padrões de desenvolvimento, testes, segurança, deploy |
| [`04-api/`](docs/04-api/) | Contratos de API, autenticação, versionamento |
| [`05-ai/`](docs/05-ai/) | Contexto e guias específicos para agentes de IA |
| [`06-decisions/`](docs/06-decisions/) | Registro de decisões e ADRs |

Ponto de entrada recomendado: [`docs/README.md`](docs/README.md).

---

## Stack tecnológica

A stack está decidida no [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e inventariada em [`docs/02-architecture/TECHNOLOGY_STACK.md`](docs/02-architecture/TECHNOLOGY_STACK.md) (fonte canônica — em caso de divergência, o inventário prevalece sobre este resumo). **TypeScript ponta a ponta**, em monorepo com workspaces:

| Eixo | Tecnologia | Papel |
|------|-----------|-------|
| Linguagem | **TypeScript** | Única linguagem: backend, web, mobile e contratos. |
| Backend | **NestJS 11** | Modular Monolith; um módulo por agregado. |
| Banco | **PostgreSQL** | Datastore único (JSONB, full-text, `pgvector` quando necessário). |
| ORM | **Prisma 6** | `schema.prisma` derivado do `DOMAIN_MODEL`; PKs UUID. |
| Validação | **Zod** | Fonte única de validação na borda. |
| Contrato de API | **REST + OpenAPI** | OpenAPI gerado dos schemas Zod; teste de contrato no CI. |
| Auth | **JWT + argon2 + Google OAuth** | Identidade própria no Postgres; RBAC + ownership por instância. |
| Cliente | **Expo + React Native (+ RN Web)** | Cliente universal iOS/Android/Web — sujeito ao spike-gate. |
| Web (fallback) | **Next.js** | Só se o spike-gate reprovar o cliente universal. |
| Jobs | **Scheduler in-process (Nest) + advisory lock (Postgres)** | Lembretes; tabela de jobs/outbox. |
| Storage | **S3 (ou compatível) + presigned URLs** | Documentos da Carteira Digital. |
| Observabilidade | **OpenTelemetry** → serviço gerenciado | Logs estruturados, métricas, tracing. |
| Testes | **Jest + Supertest + Testcontainers** | Unit + integração com Postgres efêmero. |

Runtime: **Node.js LTS**. As versões exatas são pinadas no lockfile no bootstrap do repositório.

---

## Executando a stack completa

> ⚠️ **Estado atual:** o monorepo ainda **não foi bootstrapado** — não há `package.json` na raiz nem scripts operacionais. O que segue é o fluxo definido em [`docs/03-engineering/DEVELOPMENT_GUIDE.md`](docs/03-engineering/DEVELOPMENT_GUIDE.md), cujos scripts exatos serão pinados no bootstrap. O primeiro passo de implementação é o **spike-gate do cliente universal** (ver [`PROJECT_STATE.md`](PROJECT_STATE.md)).

### Pré-requisitos

| Ferramenta | Papel |
|------------|-------|
| **Node.js LTS** | Runtime de backend, web e tooling (versão pinada via `.nvmrc`/`engines`). |
| **npm/pnpm** (workspaces) | Instalar e ligar os pacotes do monorepo (pinado no bootstrap). |
| **Docker** | PostgreSQL local e Postgres efêmero dos testes (Testcontainers). |
| **Expo / EAS CLI** | Rodar e construir o cliente universal. |

### Subindo o ambiente local

1. **Clonar** o repositório e criar a branch de trabalho (ver [`GIT_WORKFLOW`](docs/03-engineering/GIT_WORKFLOW.md)).
2. **Instalar** as dependências — instalação única na raiz do workspace:
   `<gerenciador> install`
3. **Variáveis de ambiente:** copiar `.env.example` → `.env` e preencher
   (`DATABASE_URL`, `JWT_SECRET`, `S3_BUCKET`, `GOOGLE_OAUTH_CLIENT_ID`, …).
   Segredos nunca são commitados (ver [`SECURITY`](docs/03-engineering/SECURITY.md)).
4. **Banco:** subir um PostgreSQL local via Docker e aplicar as migrations:
   `prisma migrate dev` (seed opcional de dados de desenvolvimento).
5. **API:** subir o backend NestJS em modo dev — `<gerenciador> dev` no workspace `api`.
6. **Cliente:** subir o cliente universal Expo — `<gerenciador> dev` no workspace `client`
   (iOS/Android via Expo Go/simulador; web via React Native Web).

### Comandos do dia a dia (forma prevista)

| Intenção | Comando |
|----------|---------|
| Migrations do banco | `prisma migrate dev` |
| Inspecionar o banco | `prisma studio` |
| Lint | `<gerenciador> lint` |
| Testes (unit + integração) | `<gerenciador> test` |
| Validar frontmatter de docs | `bash scripts/check-frontmatter.sh <arquivo.md>` |

O ciclo de trabalho completo (contrato antes do handler, padrões de código,
fluxo de PR) está no [`DEVELOPMENT_GUIDE`](docs/03-engineering/DEVELOPMENT_GUIDE.md).

---

## Referência histórica (marketplace legado)

> Esta seção preserva contexto histórico. As instruções abaixo **não estão operacionais** no estado atual do repositório.

Antes da re-fundação (ADR-0001, 2026-06-27), o repositório continha um protótipo funcional de **marketplace de petshops** (entrega rápida, same-day delivery), implementado como monorepo Turborepo com os seguintes apps:

- `apps/api` — backend NestJS + Prisma (~20 migrations: auth, catálogo compartilhado, promoções, alertas de preço, raio de entrega)
- `apps/web` — frontend Next.js
- `apps/mobile` — app Expo

Esse protótipo foi descontinuado e o escopo redirecionado para o ecossistema AI-first descrito neste README. O código permanece recuperável no histórico Git (ver `git log` na branch antes do esvaziamento da branch `feat/ai-first`).

Decisão formal: [`docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md`](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).
