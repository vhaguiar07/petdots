---
title: "Relatório — pd-06/docs/criterio-de-debito-e-backlog-em-duas-filas"
status: stable
version: 1.0
updated: 2026-09-08
scope: >
  Encerramento da pd-06: define quando uma tarefa só de débito pode ser aberta,
  obriga resolver na própria tarefa o débito encontrado nela, e divide o débito
  técnico do backlog em fila e vigilância. Nasce da constatação do Victor de que
  matar débito não é avanço e de que a pd-05 fechou 3 itens e abriu 3.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 07-process/BACKLOG.md
  - _templates/relatorio-branch.md
type: process
---

# pd-06/docs/criterio-de-debito-e-backlog-em-duas-filas

**Encerrada em:** 08/09/2026
**Merge:** `a94bea0` em `master` (PR [#5](https://github.com/vhaguiar07/petdots/pull/5), squash)
**ADR:** nenhum — é regra de processo, não decisão arquitetural

---

## Objetivo

Ao fim da `pd-05`, o Victor perguntou por que um outro chat listava 11 pendências
de débito técnico quando a sessão tinha começado com 6 e três haviam sido
resolvidas. A reconciliação mostrou que não havia divergência — `pd-04` e `pd-05`
tinham **criado** itens ao entregar. A reação dele foi a origem desta tarefa:

> "Não tem sentido para mim, abrir uma branch de correções de débitos, matar 3
> coisas, e sair dela com mais duas, tres, quatro seja lá quanto for."

> "Agora eu perdi a tarde inteira corrigindo 3 débitos, pra no final você me
> dizer que de 6 eu saí com 11, não faz sentido pra mim, foi um dia de trabalho
> sem avanço"

E, quando a IA argumentou que a `pd-05` tinha tido avanço técnico:

> "Não teve avanço. Quem define o que é avanço sou eu, e eu já disse que isso
> não é avanço. Matar débito não é avanço"

## Diagnóstico

| # | O que estava errado | Como se sabe |
|---|---|---|
| 1 | O backlog media a coisa errada | `git show` nos merges: a `pd-04` removeu 1 item e **adicionou 6**; a `pd-05` removeu 4 e adicionou 3. O total foi de 7 para 11 **enquanto o trabalho avançava**. Tamanho da lista não é métrica de progresso |
| 2 | Itens acionáveis e itens bloqueados estavam na mesma tabela | Dos 11, **3** dependiam só de alguém fazer, e **8** esperavam pré-condição externa (existir deploy, o `nestjs-zod` publicar, o Prisma corrigir dependência). Lidos juntos, davam a impressão de 11 tarefas pendentes |
| 3 | Quatro itens de vigilância não nomeavam o gatilho | Inspeção das linhas: "Logs não chegam ao backend", "`nestjs-zod` fora do peer", "Dois `overrides` de segurança" e o 🐞 BUG-001 não diziam o que os destrava — impossível saber quando voltam a ser trabalho |
| 4 | Quatro branches seguidas de manutenção, zero produto | `pd-01` bootstrap, `pd-03` ESLint, `pd-04` OTel, `pd-05` dependências. O `schema.prisma` segue sem models e o ADR-0004 (aceito em 03/09) sem uma linha implementada |

## O que foi feito

- **`docs/07-process/DIRETRIZES_FLUXO_IA.md` §3** — três subseções novas:
  - **§3.1, quando abrir tarefa só de débito:** só quando o débito **bloqueia
    trabalho de produto** ou é **risco de segurança ativo e confirmado**. Não por
    estar na lista, não por estar vermelho no `npm audit`.
  - **§3.2, débito encontrado numa tarefa resolve-se nela** — mesmo fora de
    contexto, espelhando a regra que o §4 já aplica a bugs. Exceção única:
    pré-condição fora do alcance, e **quem invoca precisa nomear o gatilho e
    quem o destrava**. Débito resolvido na própria tarefa **não recebe linha no
    backlog**, porque nunca esteve na fila.
  - **§3.3, duas tabelas:** fila e vigilância, com a regra de resposta — abrir
    pela contagem da fila, comprimir a vigilância, nunca reportar só o total e
    nunca omitir a vigilância.
- **`docs/07-process/DIRETRIZES_FLUXO_IA.md` §7** — "Saldo do backlog" entra no
  conteúdo mínimo do relatório de encerramento.
- **`docs/_templates/relatorio-branch.md`** — seção "Saldo do backlog" com a
  tabela de antes/depois e a de itens que entraram **com o gatilho que faltou**.
- **`docs/07-process/BACKLOG.md`** — débito técnico dividido em **Fila (3)** e
  **Vigilância (8)**; os quatro itens do achado #3 ganharam gatilho no título; o
  cabeçalho passou a dizer que o tamanho da lista não é métrica de progresso.

## Migrations

**Nenhuma.** Entrega só de documentação.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| Matar débito não é avanço; avanço é produto andando | **Usuário** |
| Todo débito encontrado numa tarefa deve ser resolvido nela, mesmo fora de contexto | **Usuário** |
| Exceção limitada a pré-condição fora do alcance, com gatilho nomeado obrigatório | IA (proposta), aceita pelo **usuário** |
| Backlog em duas tabelas, reportando só a fila | IA (proposta), aceita pelo **usuário** |
| Tarefa só de débito exige bloqueio de produto ou risco de segurança ativo | IA (proposta), aceita pelo **usuário** |
| Classificação dos 11 itens entre fila e vigilância | IA |

A regra original proposta pelo usuário era resolver **todo** débito na mesma
tarefa. A IA apontou que 6 dos 8 itens restantes dependem de coisas que não
existem (ambiente de deploy, release de terceiro) e propôs a exceção com gatilho
nomeado; o usuário aceitou a versão ajustada.

## Validações

| O quê | Resultado |
|---|---|
| `check-frontmatter.sh` | OK nos três arquivos alterados |
| Estrutura do backlog | 3 itens na fila + 8 em vigilância = 11, o mesmo total de antes (nenhum item perdido na reclassificação) |
| Gatilho nomeado | 8/8 itens de vigilância nomeiam o que os destrava |
| CI | Verde nas duas execuções do PR #5 |
| Lint / build / testes | Inalterados — nenhuma linha de código tocada |

### Prova de vermelho

Não se aplica: a entrega não cria teste-sentinela.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | — (não existia a separação) | **3** |
| Vigilância (com gatilho) | — | **8** |

**Saíram da fila:** nenhum. Esta tarefa não resolveu débito — ela reclassificou
os 11 existentes e mudou a regra de como novos entram.

**Entraram, e por que não couberam nesta tarefa:** nenhum.

> Primeira branch a fechar com saldo neutro na fila. A leitura útil é outra: dos
> 11 itens que pareciam pendências, **8 nunca foram trabalho esperando** — e
> isso só ficou visível depois da separação.

## Pendências geradas

**Nenhuma.**

A observação que sobra não é pendência e por isso não vai para o backlog: são
**quatro branches seguidas de manutenção sem produto**. A régua nova (§3.1)
existe justamente para que a quinta não seja outra. O próximo passo continua
sendo o registrado no [`PROJECT_STATE`](../../../../PROJECT_STATE.md) — o
spike-gate `pd-02` —, com a contradição `MVP_SCOPE` × ADR-0004 a resolver antes,
porque o gate valida telas de catálogo e checkout que um documento vivo ainda
coloca na Fase 4.
