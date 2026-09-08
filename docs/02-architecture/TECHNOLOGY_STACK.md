---
title: Technology Stack
status: stable
version: "1.3"
updated: 2026-09-08
scope: >
  Inventário vivo das tecnologias do PetDots por eixo (linguagem, backend, banco,
  ORM, contrato de API, auth, cliente, jobs, storage, observabilidade, testes),
  materializando a decisão registrada no ADR-0002. Cataloga e operacionaliza —
  não rejustifica a decisão (isso é o ADR-0002) nem repete princípios
  (ARCHITECTURAL_PRINCIPLES) ou componentes (SYSTEM_ARCHITECTURE).
relates_to:
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 02-architecture/ARCHITECTURAL_PRINCIPLES.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 03-engineering/DEVELOPMENT_GUIDE.md
type: architecture
---

# PetDots — Technology Stack

---

## Objetivo

Este é o **inventário vivo** das tecnologias do PetDots. Ele **materializa** a
decisão registrada no [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md):
o ADR *decide e justifica*; este documento *cataloga e operacionaliza*. A
justificativa de cada escolha e as alternativas preteridas vivem no ADR — aqui
não as repetimos.

> Mudar uma tecnologia deste inventário exige um novo ADR (ver
> [`ARCHITECTURAL_PRINCIPLES`](./ARCHITECTURAL_PRINCIPLES.md), princípio P5).

---

## Política de versionamento

- **Node.js LTS** como runtime.
- **Majors validadas no marketplace legado** (referência de capacidade, não código
  herdado — [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md)):
  **NestJS 11** e **Prisma 6**.
- Next.js, Expo (React Native) e React também integraram o legado; suas versões
  **não são fixadas aqui** — as majors são escolhidas e **pinadas no bootstrap**.
- **As versões exatas são pinadas no lockfile** no bootstrap do repositório.
- Atualização de major segue o processo normal de manutenção; **troca de
  tecnologia** (não de versão) exige ADR.

### Versões pinadas no bootstrap (pd-01, 07/09/2026)

Fixadas sem `^`, com a justificativa de cada uma no
[ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md):

| Eixo | Versão |
|---|---|
| Node.js | **24 LTS** (Krypton) |
| Gerenciador | **npm 11** workspaces |
| NestJS | **11.2.3** (`@nestjs/config` 4.0.4, `@nestjs/swagger` 11.4.7) |
| Prisma | **6.19.3** |
| TypeScript | **5.9.3** (CommonJS; `module`/`moduleResolution: node16`) |
| Zod | **4.5.4** |
| Jest | **30.5.1** + ts-jest 29.4.12 + Supertest 7 + `@testcontainers/postgresql` 12.1.0 |
| ESLint / Prettier | **10.10.0** (flat config) + typescript-eslint 8.70 + eslint-plugin-import-x 4.17.1 / **3.9.6** |
| Logging | **nestjs-pino 5.1.0** + pino 10 |

> A linha do ESLint subiu de 9.39.5 para 10.10.0 na **`pd-03`** (08/09/2026),
> junto com a regra `import-x/no-extraneous-dependencies`, que barra import de
> dependência não declarada no `package.json` do próprio workspace.

### Versões pinadas na instrumentação OTel (pd-04, 08/09/2026)

Justificadas no [ADR-0006](../06-decisions/ADR/0006-instrumentacao-opentelemetry.md):

| Pacote | Versão |
|---|---|
| `@opentelemetry/api` | **1.9.1** |
| `@opentelemetry/sdk-node` e exportadores OTLP/HTTP | **0.222.0** |
| `@opentelemetry/resources`, `sdk-metrics` | **2.11.0** |
| `@opentelemetry/semantic-conventions` | **1.43.0** |
| Instrumentações | HTTP **0.222.0** · Express **0.70.0** · pino **0.68.0** |
| `@prisma/instrumentation` | **6.19.3** — casada com a versão do Prisma; sobe junto no upgrade para o Prisma 7 |
| Coletor local (dev) | `otel/opentelemetry-collector` **0.160.0** |

**Cada upgrade adiado tem gatilho nomeado** no
[`BACKLOG`](../07-process/BACKLOG.md): Prisma 7 depende de o Nest migrar para
ESM; Nest 12 depende de `nestjs-zod` aceitar `^12`.

---

## Inventário por eixo

| Eixo | Tecnologia | Papel |
|------|-----------|-------|
| Linguagem | **TypeScript** | Única linguagem, ponta a ponta (backend, web, mobile, contratos). |
| Estrutura | **Monorepo** (npm workspaces) | Pacotes compartilhados de domínio e contratos. |
| Orquestrador | **Turborepo 2.10** | Ordena `packages/* → apps/*` (`dependsOn: ["^build"]`) e cacheia tarefas. Deixou de ser opcional no bootstrap: `npm -ws` roda em ordem alfabética e quebraria o build (ADR-0005). |
| Backend | **NestJS** | Modular Monolith; um módulo por agregado + módulos de suporte. |
| Banco | **PostgreSQL** | Datastore único; JSONB/full-text/`pgvector` quando necessário, antes de qualquer datastore novo. |
| ORM | **Prisma** | `schema.prisma` derivado do `DOMAIN_MODEL`; PKs UUID; `$queryRaw` como escape hatch. |
| Validação | **Zod** | Fonte única de validação na borda. |
| Contrato | **REST + OpenAPI** (via **nestjs-zod** + `@nestjs/swagger`) | OpenAPI gerado dos schemas Zod e publicado em `packages/contracts/openapi.json` (ver mecanismo abaixo). |
| Auth | **JWT + argon2 + Google OAuth** (próprio) | Identidade no nosso Postgres; RBAC + ownership por instância (`pet_tutors`). |
| Cliente | **Expo + React Native (+ React Native Web)** | Cliente universal iOS/Android/Web — sujeito ao spike-gate abaixo. |
| Web (fallback) | **Next.js** | Só se o spike-gate reprovar o cliente universal. |
| Jobs | **Scheduler in-process do Nest + advisory lock (Postgres)** | Lembretes de reposição, conciliação diária do PSP; tabela de jobs/outbox. BullMQ/Redis só com ADR. |
| Pagamentos | **PSP com split (Asaas ou Mercado Pago) — Pix primeiro** | Subconta por loja; comissão retida na liquidação; webhook assinado e idempotente ([ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md)). Fornecedor final pendente de due diligence (D9). |
| Storage | **Não usado no MVP** | Sem upload de documentos (Carteira Digital é fase 2). S3 + presigned URLs quando voltar. |
| Observabilidade | **OpenTelemetry (SDK instrumentado) → destino pendente** | Traces e métricas saindo por OTLP desde a `pd-04`; logs estruturados em stdout com `trace_id`. Instrumentações: HTTP, Express, pino, Prisma. Ligado por `OTEL_EXPORTER_OTLP_ENDPOINT`, desligado por padrão. Coletor local em dev (`npm run otel:up`). **Serviço gerenciado ainda não escolhido** — shortlist e critério no [ADR-0006](../06-decisions/ADR/0006-instrumentacao-opentelemetry.md), gatilho: existir ambiente de deploy. |
| Testes | **Jest + Supertest; Postgres efêmero (Testcontainers)** | Unit + integração; contrato OpenAPI testado. |

---

## Detalhes operacionais delegados pelo ADR-0002

### Mecanismo do contrato (Zod → OpenAPI)

Os **schemas Zod** são a fonte única; o **OpenAPI é gerado** a partir deles e
**publicado** como contrato canônico; os tipos do cliente derivam do OpenAPI. Um
**teste de contrato no CI** garante que o OpenAPI publicado não diverge do
código. A biblioteca concreta é escolha de implementação de baixa
reversibilidade (não exige ADR para troca, desde que o contrato permaneça
REST/recursos e o OpenAPI siga canônico).

**Escolhida no bootstrap:** [`nestjs-zod`](https://github.com/BenLorantfy/nestjs-zod)
5.5.0 com `@nestjs/swagger` 11.4.7, sobre o `z.toJSONSchema()` nativo do Zod 4.
Na prática: os schemas vivem em `packages/contracts`, viram DTO com
`createZodDto`, e o documento é gerado da tabela de rotas e gravado em
`packages/contracts/openapi.json` por `npm run contract:write`. O teste de
contrato compara o gerado com esse snapshot (ignorando `info.version`) e falha
em qualquer divergência.

### Spike-gate do cliente universal

Antes de construir a UI de produto, um **spike time-boxed (~2-3 dias)** valida o
React Native Web nas telas de maior risco:

- **O que validar** (telas de maior risco do MVP marketplace): lista/busca de
  catálogo densa com comparador de preços, fluxo de checkout, painel de pedidos
  do lojista, layout e usabilidade de **desktop**, acessibilidade.
- **Critério de aprovação:** qualidade de web logada aceitável (não "mobile
  esticada"), sem bloqueadores de a11y/usabilidade desktop, performance razoável.
- **Se aprovar:** segue o cliente universal Expo + RN-Web.
- **Se reprovar:** aciona o **fallback** — Expo (mobile) + Next.js (web)
  compartilhando os pacotes de domínio/contratos/lógica (não a UI). Os
  `packages/` nascem isolados da UI desde o início para preservar essa saída.

O resultado do spike é registrado (atualização deste inventário; ADR se mudar a
direção).

---

## Fora do MVP (somente mediante ADR)

Itens deliberadamente **não** adotados agora, cada um com gatilho próprio (ver
ADR-0002): message broker / fila, cache distribuído (Redis), datastore de
vetores dedicado (o Postgres+`pgvector` é a porta de entrada), multi-região / HA,
e a frente de **IA dedicada** (Fase 5).

---

## Critérios

Este documento é considerado pronto quando:

- [x] Lista a tecnologia de cada eixo, materializando o ADR-0002 sem rejustificá-lo.
- [x] Define a política de versionamento e o que exige ADR para mudar.
- [x] Operacionaliza os pontos que o ADR delegou (mecanismo do contrato; spike-gate).
- [x] Não duplica princípios (`ARCHITECTURAL_PRINCIPLES`) nem componentes (`SYSTEM_ARCHITECTURE`).
- [x] Versões exatas preenchidas no bootstrap do repositório (lockfile).
