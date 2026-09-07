---
title: Relatórios de Encerramento de Branch
status: stable
version: 1.1
updated: 2026-09-07
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

`pd-NN` se escolhe conferindo **duas fontes** e ficando com a maior: as branches
(`git branch -a`) e estes relatórios. As duas divergem — branch deletada após o
merge some do Git, mas o relatório dela fica. Considerar só as branches
reaproveitaria um número já usado.

---

## Relatórios

| Semana | Tarefa | O que entregou |
|---|---|---|
| [2026-09-07](semana-2026-09-07/) | [`pd-01/chore/bootstrap-monorepo`](semana-2026-09-07/pd-01-chore-bootstrap-monorepo.md) | Workspace, `packages/{config,domain,contracts}`, API NestJS com health, OpenAPI publicado e o primeiro CI |
