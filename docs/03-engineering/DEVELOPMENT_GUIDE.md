---
title: Development Guide
status: draft
version: "1.0"
updated: 2026-06-27
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
type: engineering
---

# PetDots — Development Guide

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

> Coerente com o estado do projeto ([`PROJECT_STATE`](../../PROJECT_STATE.md)): a
> implementação do MVP ainda não começou. Este guia define a forma de trabalho
> **prevista**; os scripts e versões exatas são pinados no **bootstrap do
> repositório** (ver `TECHNOLOGY_STACK`, "Política de versionamento").

---

## Pré-requisitos

| Ferramenta | Papel | Observação |
|------------|-------|------------|
| **Node.js LTS** | Runtime de backend, web e tooling | Versão pinada no bootstrap (`.nvmrc`/`engines`). |
| **Gerenciador com workspaces** | Instalar e ligar os pacotes do monorepo | npm/pnpm — escolha de baixa reversibilidade pinada no bootstrap. |
| **Docker** | PostgreSQL local e Postgres efêmero dos testes | Ver [`TESTING_STRATEGY`](./TESTING_STRATEGY.md) (Testcontainers). |
| **Git** | Versionamento | Convenções em [`GIT_WORKFLOW`](./GIT_WORKFLOW.md). |
| **Expo / EAS CLI** | Rodar e construir o cliente universal | Necessário ao trabalhar no app (ver [`DEPLOYMENT`](./DEPLOYMENT.md)). |

A stack completa e o porquê de cada escolha vivem no
[ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e no
`TECHNOLOGY_STACK` — não os repetimos aqui.

---

## Estrutura do monorepo

Layout **derivado do [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md)**
(monorepo com workspaces; pacotes compartilhados de domínio e contratos
**isolados da UI desde o primeiro commit**) e dos módulos de
[`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md). É
materializado no bootstrap:

```text
petdots/
├── apps/
│   ├── api/          # NestJS — Modular Monolith
│   │   └── src/modules/   # auth · tutors · pets · notifications · partners(stub)
│   └── client/       # Expo + React Native (+ RN Web) — cliente universal
│                     #   (fallback: apps/web Next.js, se o spike-gate reprovar)
├── packages/
│   ├── domain/       # entidades + invariantes (sem framework, sem UI)
│   └── contracts/    # schemas Zod → OpenAPI (fonte do contrato)
├── docs/             # documentação — fonte-da-verdade (este diretório)
└── scripts/          # utilitários do repo (ex.: check-frontmatter.sh)
```

Regras estruturais (de [`ARCHITECTURAL_PRINCIPLES`](../02-architecture/ARCHITECTURAL_PRINCIPLES.md)):

- **`packages/domain` e `packages/contracts` não dependem de UI nem de framework**
  (P9 — preserva o fallback do spike-gate; P1 — domínio no centro).
- Cada **módulo da API** corresponde a um agregado-raiz; um módulo só acessa as
  próprias tabelas (P2).
- A camada interna de um módulo segue `controller → application → domain → infra`
  (ver `SYSTEM_ARCHITECTURE` e [`CODING_STANDARDS`](./CODING_STANDARDS.md)).

---

## Configuração do ambiente local

1. **Clonar** o repositório e entrar na branch de trabalho (ver `GIT_WORKFLOW`).
2. **Instalar** as dependências do workspace (instalação única na raiz).
3. **Variáveis de ambiente:** copiar `.env.example` → `.env` e preencher. Nomes em
   `UPPER_SNAKE_CASE` (ver [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md)),
   ex.: `DATABASE_URL`, `JWT_SECRET`, `S3_BUCKET`, `GOOGLE_OAUTH_CLIENT_ID`. Segredos
   **nunca** são commitados (ver [`SECURITY`](./SECURITY.md)).
4. **Banco:** subir um PostgreSQL local (Docker) e aplicar as migrations do Prisma
   (`schema.prisma` derivado do [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md)).
5. **Seed** opcional de dados de desenvolvimento.

---

## Fluxo de trabalho local

O ciclo diário, alinhado ao **loop AI-first gerar → ler → corrigir**:

1. Sincronizar a branch e criar a branch de trabalho (`GIT_WORKFLOW`).
2. Entender o domínio afetado no `DOMAIN_MODEL` / `GLOSSARY` antes de codar.
3. Definir o contrato (Zod → OpenAPI) **antes** do handler (P3 / [`API_GUIDELINES`](../04-api/API_GUIDELINES.md)).
4. Implementar seguindo [`CODING_STANDARDS`](./CODING_STANDARDS.md).
5. Rodar testes e lint localmente (ver `TESTING_STRATEGY`).
6. Commit + PR (ver `GIT_WORKFLOW`); atualizar a documentação afetada.

### Comandos (forma prevista)

Os scripts exatos são definidos no `package.json` no bootstrap; a forma esperada:

| Intenção | Comando (forma) |
|----------|-----------------|
| Instalar dependências | `<gerenciador> install` (na raiz) |
| Subir a API em dev | `<gerenciador> dev` (workspace `api`) |
| Subir o cliente universal | `<gerenciador> dev` (workspace `client`) |
| Migrations do banco | `prisma migrate dev` |
| Inspecionar o banco | `prisma studio` |
| Lint | `<gerenciador> lint` |
| Testes | `<gerenciador> test` (ver `TESTING_STRATEGY`) |
| Validar frontmatter de docs | `bash scripts/check-frontmatter.sh <arquivo.md>` |

---

## Primeiro passo da implementação: o spike-gate

Antes de construir a UI de produto, o
[ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) exige um
**spike de validação do cliente universal** (Expo + React Native Web). Ele valida
as jornadas de maior risco de UX — **J6** (Timeline densa / Histórico), **J3**
(viewer de documento) e **J2** (formulário de Evento) em layout **desktop** — ver
[`USER_JOURNEYS`](../01-product/USER_JOURNEYS.md) e o spike-gate em
[`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md). Se reprovar, aplica-se
o fallback Expo + Next.js, e os `packages/` de domínio/contratos permitem a
separação sem reescrever a lógica.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Lista os pré-requisitos e remete a stack ao `TECHNOLOGY_STACK`/ADR-0002.
- [x] Apresenta a estrutura do monorepo derivada do ADR-0002 (packages isolados da UI).
- [x] Descreve a configuração local e o ciclo de trabalho sem duplicar `CODING_STANDARDS`/`GIT_WORKFLOW`/`TESTING_STRATEGY`.
- [x] Remete a forma de trabalho do agente ao `AI_DEVELOPMENT_GUIDE`.
- [ ] Scripts e versões exatas preenchidos no bootstrap do repositório.
