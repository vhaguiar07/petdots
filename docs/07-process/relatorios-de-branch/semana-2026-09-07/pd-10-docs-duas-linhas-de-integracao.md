---
title: "Relatório — pd-10/docs/duas-linhas-de-integracao"
status: stable
version: "1.0"
updated: 2026-09-11
scope: >
  Relatório de encerramento da branch pd-10/docs/duas-linhas-de-integracao,
  que adotou develop e master como as duas linhas de integração do PetDots
  (ADR-0009). Escrito retroativamente durante a pd-11, por ter faltado no
  encerramento da própria pd-10.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 03-engineering/GIT_WORKFLOW.md
  - 06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md
type: process
---

# pd-10/docs/duas-linhas-de-integracao

**Encerrada em:** 11/09/2026
**Merge:** `0cbce5a` em `develop` (PR [#9](https://github.com/vhaguiar07/petdots/pull/9))
**ADR:** [0009 — Duas linhas de integração: `develop` e `master`](../../../06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md)

> ⚠️ **Este relatório foi escrito retroativamente na `pd-11`** (11/09/2026), a
> partir do PR #9, do ADR-0009 e do histórico do Git. Ele **faltou** no
> encerramento da `pd-10`, que é obrigação do `DIRETRIZES_FLUXO_IA` §7.
>
> A ausência teve consequência prática: com a branch já apagada, as duas fontes
> de numeração do §2 (branches + relatórios) devolveriam `pd-10` como próximo
> número, e a `pd-11` quase reusou um número já gasto. Foi isso que motivou a
> **terceira fonte** de numeração (`gh pr list --state merged`), acrescentada ao
> `DIRETRIZES_FLUXO_IA` v1.3 na `pd-11`.

---

## Objetivo

Pedido do Victor no encerramento da `pd-09`: adotar **duas linhas de
integração** em vez de mergear tudo direto na branch principal — uma linha de
desenvolvimento contínuo e uma linha estável de promoção.

A decisão foi **do Victor**, e **contra a recomendação da IA**, que defendia
manter uma linha só enquanto o time é de uma pessoa. O ADR-0009 registra a
divergência: ele quis a separação para ter um ponto de corte explícito antes de
qualquer deploy, e para que `master` pudesse ser lida como "o que está (ou
estaria) em produção".

## O que foi feito

Sete arquivos, **+224 / −57**, todos de documentação — nenhuma linha de código.

- **`docs/06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md`**
  (novo) — a decisão, as alternativas descartadas (trunk-based puro; GitFlow
  completo com `release/*` e `hotfix/*`) e as consequências, incluindo o custo
  assumido: todo PR precisa de `--base develop` explícito, porque a branch
  default do GitHub continua sendo `master`.
- **`docs/03-engineering/GIT_WORKFLOW.md`** → v1.3 — o fluxo real: tarefa
  `pd-NN/*` sai de `develop` e volta para `develop` por squash merge;
  `develop` → `master` é promoção, não merge de tarefa.
- **`docs/06-decisions/ADR/README.md`** e **`DECISION_LOG.md`** — índice e log.
- **`PROJECT_STATE.md`** → v4.6 — estado e próxima atividade.
- **`docs/07-process/BACKLOG.md`** → v1.10.
- **`docs/07-process/relatorios-de-branch/semana-2026-09-07/pd-09-feat-landing-e-lista-de-espera.md`**
  — ajuste no relatório da `pd-09`.

## Migrations

**Nenhuma.** A entrega é inteiramente documental.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| Adotar `develop` (integração) e `master` (promoção) | **Usuário** — contra a recomendação da IA |
| Manter `master` como branch default do GitHub, exigindo `--base develop` em todo PR | **Usuário** |
| Não adotar `release/*` nem `hotfix/*` (GitFlow completo) | IA, aceita pelo usuário |

## Validações

| O quê | Resultado |
|---|---|
| Checagem de tipos | Não se aplica — nenhuma linha de código alterada |
| Build | Não se aplica |
| Testes | Não se aplica |
| CI do PR #9 | **`ci` pass** (2m11s) e **`ci` pass** (2m34s) — conferido em 11/09/2026 com `gh pr checks 9` |
| Smoke de boot | Não se aplica |

### Prova de vermelho

**Não se aplica** — a entrega não criou teste-sentinela.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | — | — |
| Vigilância (com gatilho) | — | — |

**Saldo: zero.** A `pd-10` não fechou nem abriu item de fila; ela alterou o
`BACKLOG.md` apenas para refletir o fluxo novo de branches.

**Entraram, e por que não couberam nesta tarefa:** nenhum.

## Pendências geradas

**Uma, descoberta depois:** o próprio relatório que faltou. Registrada e
resolvida na `pd-11` — este arquivo é a resolução, e a correção estrutural
(terceira fonte de numeração) está no `DIRETRIZES_FLUXO_IA` v1.3.
