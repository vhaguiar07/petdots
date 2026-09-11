---
title: Git Workflow
status: draft
version: "1.3"
updated: 2026-09-11
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

> **Revisão de 11/09/2026 ([ADR-0009](../06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md)).**
> Até a `pd-08` o repositório operava em **trunk único**, com `master` recebendo
> tudo. Desde a `pd-09` são **duas linhas**. A `develop` que existiu antes de
> 06/09/2026 era do protótipo legado e não tem relação com esta.

**Duas linhas permanentes:**

| Branch | Papel | Quem a atualiza |
|---|---|---|
| **`develop`** | **Linha de integração** — base de toda branch de tarefa, e destino do merge no encerramento | A IA, ao encerrar a tarefa, com CI verde |
| **`master`** | **Linha estável** — recebe `develop` em blocos; é de onde saem as tags de release | **Só a pedido explícito do Victor**, a cada vez |

- Branch de trabalho **nasce de `develop`**: `git checkout -b pd-NN/... develop`.
- Branch por unidade de trabalho coesa, no formato `tipo/descricao-em-kebab-case`
  (`NAMING_CONVENTIONS`): `feat/`, `bugfix/`, `hotfix/`, `release/`, `docs/`,
  `refactor/`. Ex.: `feat/comparador-de-precos`, `docs/engineering-layer`.
- Branches são **integradas via Pull Request** — `--base develop` — e removidas
  após o merge. **CI verde é gate em qualquer merge**, inclusive na `develop`:
  o que a segunda linha acrescenta é uma porta, não uma tranca mais frouxa.
- Preferir branches de vida curta e integração frequente; evitar divergência longa.

> ⚠️ **O default branch do GitHub continua sendo `master`** — é a face pública do
> repositório. Por isso o PR de tarefa precisa apontar a base **explicitamente**
> (`gh pr create --base develop`), senão o GitHub mira `master` por omissão.
>
> ⚠️ **`master` pode estar atrás do estado real do projeto** enquanto o Victor
> não promover. Quem clona cai nela: para ver o trabalho integrado, usar
> `develop`. A documentação de estado (`PROJECT_STATE`, `BACKLOG`) descreve a
> `develop`.

### Branch de tarefa: o prefixo `pd-NN`

> Convenção adotada em **06/09/2026**, junto com a camada
> [`07-process`](../07-process/DIRETRIZES_FLUXO_IA.md). Branches criadas antes
> disso mantêm seus nomes.

Branch que executa uma **tarefa** — a unidade que passa pelos portões das três
fases e termina em relatório de encerramento — carrega o número da tarefa:

```
pd-{número}/{categoria}/{nome-em-kebab-case}
```

Ex.: `pd-01/feat/spike-cliente-universal`, `pd-07/fix/split-pagamento`.

As categorias são as mesmas de sempre (`feat`, `fix`, `refactor`, `chore`,
`docs`); o que muda é o número na frente, que amarra branch, relatório de
encerramento, ADR e item de backlog à mesma chave.

**Como escolher o número** e o que fazer quando o projeto tiver módulos:
[`07-process/DIRETRIZES_FLUXO_IA.md`](../07-process/DIRETRIZES_FLUXO_IA.md) §2.

Branch que **não** é tarefa — experimento descartável, correção trivial de
digitação em documento — continua no formato `tipo/descricao-kebab-case`, sem
número.

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

- Releases são marcados com **tag Git** `vX.Y.Z` a partir de `master`, **e só
  dela** — é o que mantém `master` significando "o que se pode publicar"
  (ADR-0009). Tag não sai da `develop`.
- O **[`CHANGELOG.md`](../../CHANGELOG.md)** registra as mudanças por versão,
  derivado dos Conventional Commits.
- O **build e a entrega** de cada release são responsabilidade do
  [`DEPLOYMENT`](./DEPLOYMENT.md); aqui definimos apenas **como a versão é cunhada**.
- Distinção importante: o SemVer é do **produto**; a **versão da API**
  (`/api/v1`) e sua política de deprecação são tratadas em `VERSIONING`.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define a estratégia de branches a partir de `develop`, com nomes do `NAMING_CONVENTIONS` (ADR-0009).
- [x] Especifica Conventional Commits em pt-BR (tipos, escopo, breaking change).
- [x] Descreve o processo de PR/revisão proporcional ao projeto solo, com checklist.
- [x] Define releases com SemVer e tags, sem recopiar formatos nem invadir `DEPLOYMENT`/`VERSIONING`.
- [ ] Revisado quando o primeiro release real for cunhado.
