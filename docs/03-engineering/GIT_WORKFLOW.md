---
title: Git Workflow
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Fluxo de trabalho com Git no PetDots: estratégia de branches, Conventional
  Commits em pt-BR, processo de Pull Request e revisão, e releases com SemVer.
  Define "como o trabalho flui pelo Git". Para os FORMATOS de nome (prefixos de
  branch, tipos de commit) referencia NAMING_CONVENTIONS; para o build/entrega
  do release, DEPLOYMENT; para os gates de qualidade, TESTING_STRATEGY.
relates_to:
  - 00-foundation/NAMING_CONVENTIONS.md
  - 03-engineering/DEVELOPMENT_GUIDE.md
  - 03-engineering/CODING_STANDARDS.md
  - 03-engineering/TESTING_STRATEGY.md
  - 03-engineering/DEPLOYMENT.md
type: engineering
---

# PetDots — Git Workflow

> Os **formatos de nome** (prefixos de branch, tipos de Conventional Commit) são
> definidos em [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md)
> (seções "Branches Git" e "Commits"). Este documento define **o fluxo** que os
> usa — não recopia a tabela de formatos.

---

## Objetivo

Descrever **como o trabalho flui pelo Git** no PetDots: branches, commits, PRs e
releases. Proporcional a um projeto **solo greenfield** — disciplina suficiente
para manter o histórico legível (por humanos e agentes) sem cerimônia
desnecessária (coerente com `AI_DEVELOPMENT_GUIDE`: a burocracia não é o objetivo).

**Não cobre:** os formatos de nome → [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md);
o build e a entrega de cada ambiente → [`DEPLOYMENT`](./DEPLOYMENT.md); os testes
que rodam como gate → [`TESTING_STRATEGY`](./TESTING_STRATEGY.md).

---

## Estratégia de branches

- **`master`** é a linha estável e integrável; o trabalho acontece em **branches
  curtas** criadas a partir dela.
- Branch por unidade de trabalho coesa, no formato `tipo/descricao-em-kebab-case`
  (`NAMING_CONVENTIONS`): `feat/`, `bugfix/`, `hotfix/`, `release/`, `docs/`,
  `refactor/`. Ex.: `feat/pet-timeline`, `docs/engineering-layer`.
- Branches são **integradas via Pull Request** e removidas após o merge.
- Preferir branches de vida curta e integração frequente; evitar divergência longa.

---

## Conventional Commits (pt-BR)

Mensagens seguem **Conventional Commits** (formato em
[`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md), seção "Commits"),
com a **descrição em Português (BR)** — coerente com a política de idioma do
projeto (documentação em pt-BR; código em inglês — `NAMING_CONVENTIONS`,
"Idiomas Oficiais"):

```text
<tipo>(<escopo opcional>): <descrição imperativa em pt-BR>

<corpo opcional: o porquê da mudança>

<rodapé opcional: breaking changes, refs>
```

- **Tipos** (de `NAMING_CONVENTIONS`): `feat`, `fix`, `refactor`, `docs`, `test`,
  `build`, `ci`, `perf`.
- **Escopo** opcional, ligado ao domínio/módulo: `feat(pets):`, `docs(api):`.
- Um commit = uma mudança coesa; a descrição diz **o que muda**, o corpo diz
  **por que**.
- **Breaking change:** `!` após o tipo/escopo (`feat(api)!:`) e/ou rodapé
  `BREAKING CHANGE:` — alimenta o SemVer (ver abaixo) e o
  [`VERSIONING`](../04-api/VERSIONING.md) quando afeta o contrato da API.

> Exemplos reais deste repositório: `docs: preenche camada 01-product (...)`,
> `docs: define QUALITY_ATTRIBUTES (metas direcionais do MVP)`.

---

## Pull Requests e revisão

Mesmo em projeto solo, o PR é o ponto de **revisão e rastreabilidade**:

- **Escopo enxuto:** um PR resolve uma coisa; evitar PRs que misturam refactor +
  feature + docs.
- **Descrição** liga o *quê* ao *porquê* e referencia o documento/decisão que o
  motiva (ADR, `PROJECT_STATE`, jornada).
- **Checklist antes de abrir/mergear:**
  - [ ] Alinhado aos `PRODUCT_PRINCIPLES` e à arquitetura (`ARCHITECTURAL_PRINCIPLES`).
  - [ ] Testes e lint passam localmente e no CI (`TESTING_STRATEGY`).
  - [ ] Contrato OpenAPI atualizado quando a API mudou (`API_GUIDELINES`).
  - [ ] Documentação afetada atualizada no mesmo PR (docs como fonte-da-verdade).
  - [ ] Decisão arquitetural relevante registrada como ADR **antes** do merge.
- **Auto-revisão** é a norma no MVP solo; o checklist substitui o revisor humano
  ausente. Não mesclar com gate vermelho.

---

## Releases e SemVer

Versionamento do **produto** em **SemVer** (`MAJOR.MINOR.PATCH`):

- **MAJOR** — mudança incompatível observável (inclui breaking change da API; ver
  política de breaking changes em [`VERSIONING`](../04-api/VERSIONING.md)).
- **MINOR** — capacidade nova retrocompatível.
- **PATCH** — correção retrocompatível.

- Releases são marcados com **tag Git** `vX.Y.Z` a partir de `master`.
- O **[`CHANGELOG.md`](../../CHANGELOG.md)** registra as mudanças por versão,
  derivado dos Conventional Commits.
- O **build e a entrega** de cada release são responsabilidade do
  [`DEPLOYMENT`](./DEPLOYMENT.md); aqui definimos apenas **como a versão é cunhada**.
- Distinção importante: o SemVer é do **produto**; a **versão da API**
  (`/api/v1`) e sua política de deprecação são tratadas em `VERSIONING`.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define a estratégia de branches a partir de `master`, com nomes do `NAMING_CONVENTIONS`.
- [x] Especifica Conventional Commits em pt-BR (tipos, escopo, breaking change).
- [x] Descreve o processo de PR/revisão proporcional ao projeto solo, com checklist.
- [x] Define releases com SemVer e tags, sem recopiar formatos nem invadir `DEPLOYMENT`/`VERSIONING`.
- [ ] Revisado quando o primeiro release real for cunhado.
