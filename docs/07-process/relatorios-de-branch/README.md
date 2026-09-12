---
title: Relatórios de Encerramento de Branch
status: stable
version: "1.3"
updated: 2026-09-12
scope: >
  Convenções dos relatórios de encerramento: onde ficam, como se chamam e
  por que existem. Um relatório por branch pd-NN encerrada, agrupado em
  pastas semanais.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - _templates/relatorio-branch.md
type: process
---

# Relatórios de Encerramento de Branch

Um relatório por branch `pd-NN` encerrada. É a **documentação permanente do que
aconteceu** — os planos em `PLANS/` são descartados depois de implementados; o
relatório fica.

## Onde e como se chama

```
docs/07-process/relatorios-de-branch/semana-<AAAA-MM-DD>/<branch-com-hifens>.md
```

- A data da pasta é a **segunda-feira** que abre a semana do **encerramento**
  (não a do início do trabalho).
- No nome do arquivo, `/` vira `-`.

Exemplo: `pd-01/feat/spike-cliente-universal`, encerrada em 09/09/2026 (terça),
vira:

```
docs/07-process/relatorios-de-branch/semana-2026-09-07/pd-01-feat-spike-cliente-universal.md
```

Ao criar um relatório, conferir se a pasta da semana já existe; criar se não
existir.

## Como escrever

Copiar [`_templates/relatorio-branch.md`](../../_templates/relatorio-branch.md)
e preencher. As três seções que fazem o relatório valer alguma coisa:

- **Diagnóstico** — com a coluna "como se sabe". Comando rodado, valor medido,
  linha lida. Sem ela é opinião.
- **Decisões tomadas** — com **quem decidiu** (IA × usuário). Decisão da IA que o
  usuário não viu é dívida escondida.
- **Validações** — com números reais. O que não rodou se declara como não
  rodado.

## Por que agrupar por semana

Uma pasta por relatório seria excesso; um diretório plano vira uma lista
ilegível depois de algumas dezenas de tarefas. A pasta semanal dá ordem
cronológica navegável sem índice, e é o recorte em que se pergunta "o que
aconteceu por aqui recentemente?".

## Também servem para escolher o próximo número

`pd-NN` se escolhe conferindo **três fontes** e ficando com a maior: as branches
(`git branch -a`), estes relatórios e os PRs mergeados
(`gh pr list --state merged`). As três divergem — branch deletada após o merge
some do Git, mas o relatório dela fica; e **o relatório pode faltar**, como
faltou o da `pd-10` até a `pd-11` escrevê-lo retroativamente. O comando completo
está no [`DIRETRIZES_FLUXO_IA`](../DIRETRIZES_FLUXO_IA.md) §2.

---

## Relatórios

> O índice estava com uma linha só até a `pd-11`, apesar de nove relatórios
> escritos. Completado em 11/09/2026 — um índice que não indexa é pior que
> nenhum, porque promete uma busca que não entrega.

| Semana | Tarefa | O que entregou |
|---|---|---|
| [2026-09-07](semana-2026-09-07/) | [`pd-01/chore/bootstrap-monorepo`](semana-2026-09-07/pd-01-chore-bootstrap-monorepo.md) | Workspace, `packages/{config,domain,contracts}`, API NestJS com health, OpenAPI publicado e o primeiro CI |
| [2026-09-07](semana-2026-09-07/) | [`pd-03/chore/eslint-10-e-dep-check`](semana-2026-09-07/pd-03-chore-eslint-10-e-dep-check.md) | ESLint 10 e checagem de dependências |
| [2026-09-07](semana-2026-09-07/) | [`pd-04/feat/instrumenta-opentelemetry`](semana-2026-09-07/pd-04-feat-instrumenta-opentelemetry.md) | OpenTelemetry na API (ADR-0006) |
| [2026-09-07](semana-2026-09-07/) | [`pd-05/chore/resolve-debitos-de-dependencia`](semana-2026-09-07/pd-05-chore-resolve-debitos-de-dependencia.md) | Migração para ESM, NestJS 12 e Prisma 7 (ADR-0007) |
| [2026-09-07](semana-2026-09-07/) | [`pd-06/docs/criterio-de-debito-e-backlog-em-duas-filas`](semana-2026-09-07/pd-06-docs-criterio-de-debito-e-backlog-em-duas-filas.md) | Critério de débito e o backlog em fila + vigilância |
| [2026-09-07](semana-2026-09-07/) | [`pd-07/docs/resincroniza-produto-sob-adr-0004`](semana-2026-09-07/pd-07-docs-resincroniza-produto-sob-adr-0004.md) | Camada de produto resincronizada com o MVP marketplace |
| [2026-09-07](semana-2026-09-07/) | [`pd-08/feat/spike-cliente-universal`](semana-2026-09-07/pd-08-feat-spike-cliente-universal.md) | Spike-gate do cliente universal — Expo + React Native Web aprovados (ADR-0008) |
| [2026-09-07](semana-2026-09-07/) | [`pd-09/feat/landing-e-lista-de-espera`](semana-2026-09-07/pd-09-feat-landing-e-lista-de-espera.md) | Primeira feature: landing pública, `waitlist_entries` e a primeira migration |
| [2026-09-07](semana-2026-09-07/) | [`pd-10/docs/duas-linhas-de-integracao`](semana-2026-09-07/pd-10-docs-duas-linhas-de-integracao.md) | `develop` e `master` como linhas de integração (ADR-0009) — relatório escrito retroativamente na `pd-11` |
| [2026-09-07](semana-2026-09-07/) | [`pd-11/feat/catalogo-ofertas-e-comparador`](semana-2026-09-07/pd-11-feat-catalogo-ofertas-e-comparador.md) | O comparador público de preços: segunda migration, três módulos na API, seed versionado e as páginas `/precos` (ADR-0010) |
| [2026-09-07](semana-2026-09-07/) | [`pd-12/feat/identidade-e-acesso`](semana-2026-09-07/pd-12-feat-identidade-e-acesso.md) | Autenticação própria: `users` e `refresh_tokens`, argon2, JWT com refresh rotacionado, `AuthGuard` e `RolesGuard` (ADR-0011) — linha acrescentada retroativamente na `pd-13` |
| [2026-09-07](semana-2026-09-07/) | [`pd-13/feat/login-e-comparador-no-app`](semana-2026-09-07/pd-13-feat-login-e-comparador-no-app.md) | Login por interface, `GET /auth/me`, guards globais, endpoints de loja, e o `apps/app` lendo a API de verdade — o spike saiu por inteiro (ADR-0012) |
