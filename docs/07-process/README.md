---
title: Camada de Processo
status: stable
version: 1.0
updated: 2026-09-06
scope: >
  Índice da camada 07-process: como o trabalho flui com agentes de IA no
  PetDots e onde fica cada registro (backlog, bugs, ideias, relatórios de
  encerramento). Complementa AGENTS.md, que define comportamento; esta
  camada define processo.
relates_to:
  - AGENTS.md
  - README.md
  - 07-process/DIRETRIZES_FLUXO_IA.md
type: process
---

# 07-process — Como o trabalho anda

`AGENTS.md` define **como o agente se comporta**. Esta camada define **como o
trabalho anda**: quem decide o quê, em que ordem, e o que fica registrado.

Modelo importado do ecossistema SOAC (oficina-app) em **06/09/2026** e adaptado
à estrutura em camadas do PetDots — lá os artefatos vivem por módulo
(`docs/<modulo>/BACKLOG.md`); aqui vivem nesta camada, porque o PetDots ainda
tem um produto só.

---

## Os arquivos

| Arquivo | O que é | Quando se mexe nele |
|---|---|---|
| [DIRETRIZES_FLUXO_IA.md](DIRETRIZES_FLUXO_IA.md) | As três fases, os portões de decisão, a recomendação de modelo, a numeração `pd-NN` e as obrigações de registro | Quando o **processo** muda — raramente |
| [BACKLOG.md](BACKLOG.md) | Estoque de **pendências reais**, de onde saem as tarefas | Toda entrega que gera ou resolve pendência |
| [BUGS.md](BUGS.md) | Registro detalhado de bugs (`BUG-NNN` / `BUG-VNN` / `BUG-RNN`) | Todo bug encontrado, a qualquer momento |
| [IDEIAS.md](IDEIAS.md) | O que foi imaginado **sem dono nem prazo** | Quando surge oportunidade que não é pendência |
| [relatorios-de-branch/](relatorios-de-branch/) | O que foi feito em cada tarefa encerrada | Ao encerrar cada branch `pd-NN` |

Template do relatório: [`_templates/relatorio-branch.md`](../_templates/relatorio-branch.md).

---

## As quatro regras que sustentam o resto

**1. Nada começa sem briefing, e nada é implementado sem portão.**
Todo trabalho novo abre com um briefing curto do usuário; a IA recomenda formato
(sozinha × time de agentes) e **modelo** — justificado, não como menu neutro — e
**aguarda a decisão**. Ao fim da análise, outro portão antes de qualquer código.

**2. O modelo se escolhe pela tarefa, nunca pela sessão.**
A pergunta é "qual modelo é o melhor para ESTA tarefa?", não "qual já está
carregado". O espaço é uma matriz: {IA sozinha × time} × {Fable, Opus, Sonnet,
Haiku}. Se o recomendado não é o da sessão, dizer isso e orientar a troca — ela
preserva o contexto.

**3. Severidade exige a medição que a sustenta.**
Item marcado como crítico só nasce assim com **como foi verificado, o resultado
e a data**. Suspeita fundamentada entra como item normal, dizendo o que falta
medir. Severidade alta sem evidência desloca atenção dos problemas reais.

**4. Bug tem duas paradas: o registro e a fila.**
`BUGS.md` guarda o detalhe; **uma linha** no `BACKLOG.md` guarda o ponteiro. Sem
a primeira o bug perde o detalhe; sem a segunda ele fica invisível para quem
escolhe a próxima tarefa.

---

## Onde esta camada NÃO manda

| Assunto | Onde vive |
|---|---|
| Comportamento e mentalidade do agente | [`AGENTS.md`](../../AGENTS.md) |
| Ordem de autoridade entre documentos | [`docs/README.md`](../README.md) § Fonte da Verdade |
| Fluxo de branches, PRs e releases | [`03-engineering/GIT_WORKFLOW.md`](../03-engineering/GIT_WORKFLOW.md) |
| Formato de nomes e Conventional Commits | [`00-foundation/NAMING_CONVENTIONS.md`](../00-foundation/NAMING_CONVENTIONS.md) |
| Decisões arquiteturais | [`06-decisions/ADR/`](../06-decisions/ADR/) |
| Estratégia de testes | [`03-engineering/TESTING_STRATEGY.md`](../03-engineering/TESTING_STRATEGY.md) |
