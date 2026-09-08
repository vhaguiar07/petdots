---
title: "Template — Relatório de Encerramento de Branch"
status: stable
version: 1.1
updated: 2026-09-08
scope: >
  Modelo do relatório de encerramento de branch. Copiar para
  07-process/relatorios-de-branch/semana-<AAAA-MM-DD>/<branch>.md ao encerrar
  uma tarefa pd-NN, substituindo / por - no nome do arquivo.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
type: process
---

> ⚠️ **Os links relativos deste template partem do DESTINO**
> (`07-process/relatorios-de-branch/semana-<AAAA-MM-DD>/`), não desta pasta —
> por isso não resolvem enquanto o arquivo estiver em `_templates/`. Está
> correto: eles passam a funcionar assim que o arquivo é copiado para o lugar.

# pd-NN/categoria/nome-da-tarefa

**Encerrada em:** DD/MM/AAAA
**Merge:** `<sha>` em `<branch base>`
**ADR:** [NNNN — Título](../../../06-decisions/ADR/NNNN-slug.md) — ou "nenhum"

---

## Objetivo

O que o usuário pediu, **nas palavras dele** quando possível, e o contexto que
tornou a tarefa necessária. Uma citação curta do pedido original vale mais que
um resumo — é o que permite julgar, meses depois, se a entrega respondeu à
pergunta certa.

## Diagnóstico

> Seção obrigatória em fix; opcional em feature.

| # | O que estava errado | Como se sabe |
|---|---|---|
| 1 | | |

A coluna **"Como se sabe"** é a que importa: comando rodado, valor medido, linha
lida. Sem ela o diagnóstico é opinião.

## O que foi feito

Por arquivo ou por frente, com os commits principais. Descrever a **mudança de
comportamento**, não o diff — o diff está no Git.

- **`caminho/arquivo.ts`** — o que mudou e por quê.
- **Docs** — quais documentos foram atualizados na mesma entrega, e por quê.
  Documento que descrevia o comportamento antigo **como correto** é o mais
  importante de corrigir: quem o ler restaura o bug.

## Migrations

| Migration | O que muda | Aplicada em |
|---|---|---|

Ou: **nenhuma**.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| | IA / **Usuário** |

Registrar **quem decidiu** é o ponto desta tabela. Decisão da IA que o usuário
não viu é dívida escondida; decisão do usuário sem registro vira retrabalho na
próxima discussão.

## Validações

| O quê | Resultado |
|---|---|
| Checagem de tipos | |
| Build | |
| Testes | **N suítes, N testes** |
| Smoke de boot | |

**Números reais, nunca "passou".** Se algo não rodou, dizer que não rodou — a
regra troca tempo por risco assumido, e esconder isso transformaria em risco
invisível.

### Prova de vermelho

> Obrigatória quando a entrega cria testes-sentinela.

| # | Mutação aplicada | Testes que caíram |
|---|---|---|

Sentinela que nunca foi visto falhar não protege nada.

## Saldo do backlog

> Seção obrigatória (`DIRETRIZES_FLUXO_IA` §7). O que se conta é a **fila**, não
> o total de linhas.

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | | |
| Vigilância (com gatilho) | | |

**Saíram da fila:** …

**Entraram, e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|

Item novo **sem gatilho nomeado não é exceção válida** (§3.2): ou foi resolvido
aqui, ou o gatilho está faltando neste relatório.

## Pendências geradas

Onde cada uma foi registrada — linha no [`BACKLOG.md`](../../BACKLOG.md), id em
[`BUGS.md`](../../BUGS.md), entrada em [`IDEIAS.md`](../../IDEIAS.md). Pendência
citada aqui e em lugar nenhum mais desaparece com este arquivo.

Ou: **nenhuma**.
