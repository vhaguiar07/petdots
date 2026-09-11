---
title: PetDots
status: stable
version: 1.4
updated: 2026-09-10
scope: >
  README raiz do repositório PetDots. Apresenta o ecossistema e a cunha da
  fase 1, a stack tecnológica, como executar a stack completa e encaminha o
  leitor para a documentação estruturada em docs/.
relates_to:
  - docs/README.md
  - docs/05-ai/AI_CONTEXT.md
  - docs/02-architecture/TECHNOLOGY_STACK.md
  - docs/03-engineering/DEVELOPMENT_GUIDE.md
  - docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
  - docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - docs/06-decisions/ADR/0005-bootstrap-monorepo.md
  - docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md
type: foundation
---

# PetDots

**Toda a vida do pet em um único lugar.**

O PetDots é uma plataforma digital AI-first que centraliza a jornada completa do animal de estimação — saúde, bem-estar, serviços, produtos e conexão com o ecossistema pet (tutores, clínicas, pet shops, prestadores e ONGs). O produto nasce com inteligência artificial como princípio de design, não como adição posterior, e é documentado em [`docs/`](docs/) como fonte canônica de decisões estratégicas, funcionais e técnicas.

**A fase 1 começa por uma cunha:** um **marketplace hiperlocal de petshops de bairro**, com **reposição inteligente** (o app sabe quando a ração do pet vai acabar) e **comparador de preços do bairro** — decisão do [ADR-0004](docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md). *"Saiba quando a ração acaba e onde comprar mais barato no seu bairro."* O ecossistema completo é a consequência da densidade que a cunha cria; o faseamento está em [`PRODUCT_ROADMAP`](docs/00-foundation/PRODUCT_ROADMAP.md) e o recorte exato em [`MVP_SCOPE`](docs/01-product/MVP_SCOPE.md).

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
| [`07-process/`](docs/07-process/) | Fluxo de trabalho com IA, backlog, bugs, relatórios de branch |

Ponto de entrada recomendado: [`docs/README.md`](docs/README.md).

---

## Stack tecnológica

A stack está decidida no [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e inventariada em [`docs/02-architecture/TECHNOLOGY_STACK.md`](docs/02-architecture/TECHNOLOGY_STACK.md) (fonte canônica — em caso de divergência, o inventário prevalece sobre este resumo). **TypeScript ponta a ponta**, em monorepo com workspaces:

| Eixo | Tecnologia | Papel |
|------|-----------|-------|
| Linguagem | **TypeScript** | Única linguagem: backend, web, mobile e contratos. |
| Estrutura | **npm workspaces + Turborepo 2.10** | Monorepo; ordena `packages/* → apps/*` e cacheia tarefas. |
| Backend | **NestJS 12** (ESM) | Modular Monolith; um módulo por agregado. |
| Banco | **PostgreSQL 16** | Datastore único (JSONB, full-text, `pgvector` quando necessário). |
| ORM | **Prisma 7** (driver adapter) | `schema.prisma` derivado do `DOMAIN_MODEL`; PKs UUID. |
| Validação | **Zod** | Fonte única de validação na borda. |
| Contrato de API | **REST + OpenAPI** | OpenAPI gerado dos schemas Zod; teste de contrato no CI. |
| Auth | **JWT + argon2 + Google OAuth** | Identidade própria no Postgres; RBAC + escopo de loja por instância (`StoreScopeGuard`). |
| Pagamentos | **PSP com split (Pix primeiro)** | Comissão retida na liquidação; webhook assinado e idempotente ([ADR-0003](docs/06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md)). |
| Cliente | **Expo 57 + React Native (+ RN Web)** | Cliente universal iOS/Android/Web — spike-gate **aprovado** em 11/09/2026 ([ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)). |
| Landing pública | **Next.js 16** (`apps/landing`) | Landing do smoke test e páginas públicas do comparador, que precisam de SEO (ADR-0004 #13). |
| Jobs | **Scheduler in-process (Nest) + advisory lock (Postgres)** | Lembretes; tabela de jobs/outbox. |
| Storage | **Não usado no MVP** | A Carteira Digital é fase 2; S3 + presigned URLs voltam com ela. |
| Observabilidade | **OpenTelemetry** → serviço gerenciado | Logs estruturados, métricas, tracing. |
| Testes | **Jest + Supertest + Testcontainers** | Unit + integração com Postgres efêmero. |

Runtime: **Node.js 24 LTS**. As versões exatas estão pinadas no lockfile e listadas em [`TECHNOLOGY_STACK`](docs/02-architecture/TECHNOLOGY_STACK.md) ("Versões pinadas no bootstrap"); o porquê de cada uma está no [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md) e, para a migração a ESM/Nest 12/Prisma 7, no [ADR-0007](docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md).

---

## Executando a stack completa

> **Estado atual:** a implementação do produto começou. Além da fundação (workspaces, `packages/{config,domain,contracts}`, `apps/api` em NestJS com `GET /api/v1/health`, OpenAPI publicado, OpenTelemetry e CI), o repositório tem hoje: `apps/app` (cliente universal Expo + RN Web, [ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)), **`apps/landing`** (Next.js — a landing pública da lista de espera) e o primeiro módulo de domínio da API, `waitlist`, com a **primeira migration** do projeto. Próximo passo: o eixo **catálogo → oferta → comparador** (ver [`PROJECT_STATE.md`](PROJECT_STATE.md)).

### Pré-requisitos

| Ferramenta | Versão | Papel |
|------------|--------|-------|
| **Node.js** | 24 LTS (`.nvmrc`) | Runtime de backend e tooling |
| **npm** | 11+ | Workspaces do monorepo |
| **Docker** | Desktop ativo | PostgreSQL local e o Postgres efêmero dos testes (Testcontainers) |

### Subindo o ambiente local

```bash
nvm use                  # Node 24
npm ci                   # instalação única, na raiz
cp .env.example .env
npm run db:up            # Postgres 16 em localhost:5437
npm run prisma:migrate   # aplica as migrations no banco local
npm run prisma:generate
npm run build
npm run dev -w @petdots/api      # API em 3001
npm run dev -w @petdots/landing  # landing em 3002 (outro terminal)
```

- `http://localhost:3001/api/v1/health` → `{"status":"ok","database":"up",…}`
- `http://localhost:3001/api/docs` → documentação navegável (OpenAPI)
- `http://localhost:3002` → landing pública da lista de espera

Segredos nunca são commitados (ver [`SECURITY`](docs/03-engineering/SECURITY.md)) — **este repositório é público**.

### Comandos do dia a dia

| Intenção | Comando |
|----------|---------|
| Build de tudo, na ordem certa | `npm run build` |
| Lint / tipos | `npm run lint` · `npm run typecheck` |
| Testes (unidade + integração) | `npm test` |
| Teste de contrato OpenAPI | `npm run test:contract` |
| Regenerar o OpenAPI publicado | `npm run contract:write` |
| Postgres local | `npm run db:up` · `npm run db:down` |
| Migrations do banco | `npm run prisma:migrate` |
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

Esse protótipo foi descontinuado e o escopo redirecionado para o ecossistema AI-first descrito neste README. Em 06/09/2026 ele foi **arquivado na tag anotada [`legacy-marketplace`](../../tree/legacy-marketplace)** (commit `8a9625b`) e as branches que o carregavam (`develop`, `feat/ai-first`) foram removidas — a tag é o único caminho até ele.

⚠️ **O legado é referência de capacidade, não fonte de código.** O compromisso anti-contaminação do [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md) proíbe portar schema, enums ou interceptors de lá; tudo é re-derivado do [`DOMAIN_MODEL`](docs/01-product/DOMAIN_MODEL.md). Reabrir isso exigiria um ADR que substitua o 0002 (ver [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md), alternativa (f)).

Decisão formal: [`docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md`](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).
