---
title: Technology Stack
status: draft
version: "1.0"
updated: 2026-06-27
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

---

## Inventário por eixo

| Eixo | Tecnologia | Papel |
|------|-----------|-------|
| Linguagem | **TypeScript** | Única linguagem, ponta a ponta (backend, web, mobile, contratos). |
| Estrutura | **Monorepo** (workspaces; Turborepo opcional) | Pacotes compartilhados de domínio e contratos. |
| Backend | **NestJS** | Modular Monolith; um módulo por agregado + módulos de suporte. |
| Banco | **PostgreSQL** | Datastore único; JSONB/full-text/`pgvector` quando necessário, antes de qualquer datastore novo. |
| ORM | **Prisma** | `schema.prisma` derivado do `DOMAIN_MODEL`; PKs UUID; `$queryRaw` como escape hatch. |
| Validação | **Zod** | Fonte única de validação na borda. |
| Contrato | **REST + OpenAPI** | OpenAPI publicado como contrato canônico de fronteira (ver mecanismo abaixo). |
| Auth | **JWT + argon2 + Google OAuth** (próprio) | Identidade no nosso Postgres; RBAC + ownership por instância (`pet_tutors`). |
| Cliente | **Expo + React Native (+ React Native Web)** | Cliente universal iOS/Android/Web — sujeito ao spike-gate abaixo. |
| Web (fallback) | **Next.js** | Só se o spike-gate reprovar o cliente universal. |
| Jobs | **Scheduler in-process do Nest + advisory lock (Postgres)** | Lembretes; tabela de jobs/outbox. BullMQ/Redis só com ADR. |
| Storage | **S3 (ou compatível) + presigned URLs** | Documentos da Carteira Digital. |
| Observabilidade | **OpenTelemetry → serviço gerenciado** | Logs estruturados, métricas, tracing. |
| Testes | **Jest + Supertest; Postgres efêmero (Testcontainers)** | Unit + integração; contrato OpenAPI testado. |

---

## Detalhes operacionais delegados pelo ADR-0002

### Mecanismo do contrato (Zod → OpenAPI)

Os **schemas Zod** são a fonte única; o **OpenAPI é gerado** a partir deles (via
biblioteca de zod-para-OpenAPI integrada ao Nest) e **publicado** como contrato
canônico; os tipos do cliente derivam do OpenAPI. Um **teste de contrato no CI**
garante que o OpenAPI publicado não diverge do código. A biblioteca concreta é
escolha de implementação de baixa reversibilidade (não exige ADR para troca,
desde que o contrato permaneça REST/recursos e o OpenAPI siga canônico).

### Spike-gate do cliente universal

Antes de construir a UI de produto, um **spike time-boxed (~2-3 dias)** valida o
React Native Web nas telas de maior risco:

- **O que validar:** Timeline densa, viewer de documento, layout e usabilidade de
  **desktop**, acessibilidade.
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
- [ ] Versões exatas preenchidas no bootstrap do repositório (lockfile).
