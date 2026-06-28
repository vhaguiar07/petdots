---
title: Deployment
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Como o PetDots é construído e entregue: ambientes, pipeline de CI/CD, build do
  monorepo (API + cliente universal via Expo/EAS) e a postura de infraestrutura
  (instância única; Postgres/S3 gerenciados; gatilhos de ADR para escalar).
  Materializa o ADR-0002 e o atributo de disponibilidade de QUALITY_ATTRIBUTES;
  não cunha versões (GIT_WORKFLOW) nem define a observabilidade (OBSERVABILITY).
relates_to:
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 02-architecture/QUALITY_ATTRIBUTES.md
  - 03-engineering/GIT_WORKFLOW.md
  - 03-engineering/OBSERVABILITY.md
  - 03-engineering/TESTING_STRATEGY.md
type: engineering
---

# PetDots — Deployment

> O **build e a entrega** vivem aqui; **como a versão é cunhada** (SemVer, tags)
> está em [`GIT_WORKFLOW`](./GIT_WORKFLOW.md); **o que é observado** após o deploy
> está em [`OBSERVABILITY`](./OBSERVABILITY.md). A postura de infra materializa o
> [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md).

---

## Objetivo

Descrever **como o PetDots vai do commit ao ambiente em execução**: ambientes,
pipeline de CI/CD, build do monorepo e a postura de infraestrutura. Proporcional
ao MVP de produto pessoal — **simplicidade > disponibilidade** (`QUALITY_ATTRIBUTES`
#7); nada de HA/multi-região agora.

**Não cobre:** versionamento de release → `GIT_WORKFLOW`; os sinais de
observabilidade/health → `OBSERVABILITY`; o inventário da stack → [`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md).

---

## Postura de infraestrutura

Coerente com "nunca otimizar prematuramente / não adicionar infraestrutura
antecipadamente" (P5) e com a disponibilidade proporcional de `QUALITY_ATTRIBUTES`:

- **Instância única** da API (sem HA, sem multi-região no MVP).
- **PostgreSQL gerenciado** (único datastore) + **backups automáticos** (PITR
  quando disponível — sustenta a integridade do atributo #2).
- **S3 (ou compatível) gerenciado** para documentos (presigned URLs — `SECURITY`).
- **Observabilidade** em **serviço gerenciado** via OTel (`OBSERVABILITY`).
- **Sem broker/fila/cache** — lembretes via scheduler in-process + advisory lock
  (ADR-0002).

> **Gatilhos de ADR para escalar** (de `QUALITY_ATTRIBUTES`/`TECHNICAL_VISION`):
> múltiplas réplicas (→ fila externa para os jobs), read-replicas, multi-região/HA,
> extração de serviço. Nenhum é adotado sem um ADR que registre o gatilho real.

---

## Ambientes

Proporcional ao MVP — o mínimo que separa desenvolvimento de produção:

| Ambiente | Papel |
|----------|-------|
| **Local** | Máquina do dev (Postgres em Docker) — ver [`DEVELOPMENT_GUIDE`](./DEVELOPMENT_GUIDE.md). |
| **Produção** | Instância única + Postgres/S3 gerenciados; alvo dos releases. |

Um ambiente de **staging/preview** pode ser adicionado quando houver necessidade
(ex.: validar o cliente universal antes de publicar) — decisão proporcional, não
antecipada.

---

## Pipeline de CI/CD

Acionado pelo fluxo de [`GIT_WORKFLOW`](./GIT_WORKFLOW.md) (PR → `master` → tag):

1. **CI em PR:** instalar, **lint**, **testes** (unidade + integração com Postgres
   efêmero) e **teste de contrato OpenAPI** — todos verdes são gate de merge
   (ver [`TESTING_STRATEGY`](./TESTING_STRATEGY.md)).
2. **Build do monorepo:** construir os artefatos afetados (Turborepo opcional como
   orquestrador — `TECHNOLOGY_STACK`).
3. **Release:** em tag `vX.Y.Z`, publicar/entregar os artefatos.
4. **Migrations:** aplicar migrations do Prisma de forma controlada antes/junto do
   deploy da API.
5. **Pós-deploy:** health checks verdes e sinais de `OBSERVABILITY` acompanhados.

---

## Build do monorepo

| Artefato | Build | Entrega |
|----------|-------|---------|
| **API (NestJS)** | build Node do workspace `api` | instância única (container) |
| **Cliente universal (Expo)** | **EAS** para iOS/Android; **RN Web** para a web | lojas (mobile) + hosting estático/SSR (web) |
| **Web (fallback Next.js)** | só se o **spike-gate** reprovar o cliente universal | hosting web |

O **spike-gate do cliente universal** (ADR-0002 / `TECHNOLOGY_STACK`) decide qual
caminho de build da camada de apresentação vale; os `packages/` de domínio e
contratos são compartilhados em qualquer dos caminhos.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define a postura de infra (instância única; Postgres/S3/observabilidade gerenciados) com gatilhos de ADR.
- [x] Lista os ambientes proporcionais ao MVP.
- [x] Descreve o pipeline de CI/CD com os gates de `TESTING_STRATEGY` e a aplicação de migrations.
- [x] Cobre o build do monorepo (API + Expo/EAS + RN Web; fallback Next.js) sem cunhar versão nem definir observabilidade.
- [ ] Provedor concreto de execução/hosting e passos de deploy fechados no bootstrap.
