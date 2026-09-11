---
title: "ADR-0009: Duas linhas de integração — develop e master"
status: accepted
version: "1.0"
updated: 2026-09-11
scope: >
  Registra a adoção de uma segunda linha no Git: develop passa a receber todas as
  branches de tarefa, e master passa a ser a linha estável, atualizada só a pedido
  explícito do Victor. Substitui o trunk único que vigorava desde o bootstrap e
  revisa a Estratégia de branches do GIT_WORKFLOW.
relates_to:
  - 03-engineering/GIT_WORKFLOW.md
  - 03-engineering/DEPLOYMENT.md
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 06-decisions/ADR/0005-bootstrap-monorepo.md
type: decision
---

# ADR-0009: Duas linhas de integração — `develop` e `master`

## Contexto

Desde o bootstrap (`pd-01`, 07/09/2026) o repositório opera em **trunk único**: o
[`GIT_WORKFLOW`](../../03-engineering/GIT_WORKFLOW.md) declara que *"`master` é a
linha estável e integrável; o trabalho acontece em branches curtas criadas a
partir dela"*, e foi assim que as `pd-01` a `pd-08` foram integradas — sempre por
PR, sempre com CI verde como gate, sempre por squash.

Existiu uma `develop` neste repositório, mas do **protótipo legado**: ela foi
apagada em 06/09/2026 junto com `feat/ai-first`, quando o protótipo foi arquivado
na tag `legacy-marketplace` (ADR-0001). Nenhuma ref com esse nome sobreviveu.

Em **11/09/2026**, no encerramento da `pd-09`, o Victor instruiu que "finalizar a
tarefa" passa a significar **mergear na `develop`**, e que `master` só recebe
código mediante pedido explícito dele. A IA apontou que a branch não existia e
que criá-la mudaria o modelo de branches do repositório; **o Victor reafirmou a
decisão**, e é ela que este ADR registra.

A força por trás do pedido é de **controle**, não de escala de time: o Victor
quer um lugar onde o trabalho se acumula e é visto antes de tocar a linha que ele
considera estável — em especial porque o roteiro de testes manuais nem sempre é
percorrido no mesmo dia em que a tarefa termina.

## Decisão

**Duas linhas de integração permanentes:**

| Branch | Papel | Quem a atualiza |
|---|---|---|
| **`develop`** | Linha de integração. **Todas** as branches de tarefa (`pd-NN/...`) são mergeadas aqui | A IA, ao encerrar a tarefa, com CI verde |
| **`master`** | Linha estável. Recebe `develop` em blocos | **Só a pedido explícito do Victor**, a cada vez |

Consequências operacionais que fazem parte da decisão:

1. **`develop` nasce de `master`** em `9161c7d` (11/09/2026) e é a base de toda
   branch de tarefa nova. `git checkout -b pd-NN/... develop`.
2. **O gate de merge não muda:** CI verde continua obrigatório para entrar na
   `develop`. Não há gate mais fraco na linha de integração — o que mudou foi
   *quantas* portas existem, não a tranca de cada uma.
3. **Encerramento de tarefa** (`DIRETRIZES_FLUXO_IA` §7, passo 3) passa a devolver
   o checkout para **`develop`**, não `master`.
4. **Tags de release `vX.Y.Z` continuam saindo de `master`**, e só dela. É o que
   mantém `master` significando "o que se pode publicar".
5. **A migration entra na `develop` junto com o código**, como sempre; o que se
   adia ao segurar `master` é a promoção, nunca a migration isolada do código que
   a acompanha.
6. **O default branch do GitHub permanece `master`** — é a face pública do
   repositório e a linha estável. PRs de tarefa apontam `--base develop`
   explicitamente.

## Alternativas consideradas

**(a) Manter o trunk único — foi a recomendação da IA, recusada pelo Victor.**
O argumento: com um só desenvolvedor e CI verde exigido em toda branch, a
`develop` acrescenta uma etapa de integração sem acrescentar segurança. O que ela
normalmente protege — a estabilidade da linha de release contra merges
concorrentes de um time — já estava protegido pelo gate de PR, e não há merges
concorrentes com um desenvolvedor. Recusada porque o valor que o Victor busca não
é técnico: é ter uma linha que ele reconhece como "aprovada por mim", e essa
distinção não existe no trunk único.

**(b) Usar tags em vez de uma segunda branch.** `master` continuaria recebendo
tudo, e o "aprovado pelo Victor" seria uma tag móvel ou uma release. Mais barato
em topologia e sem divergência possível. Descartada porque tag não impede que
`master` avance: o Victor quer poder olhar para `master` e saber que **nada
entrou ali sem ele**, o que uma tag não garante.

**(c) Branch de release por versão** (`release/vX.Y`). É o padrão quando existem
versões mantidas em paralelo — que não é o caso de um produto sem deploy e sem
usuários. Complexidade sem problema correspondente.

## Consequências

**Positivas**

- `master` passa a ter significado explícito: **nada entra sem decisão do
  Victor.** Antes, "aprovado por ele" e "integrado" eram indistinguíveis.
- O trabalho pode acumular na `develop` sem forçar a decisão de promoção — o que
  casa com o fato de que o roteiro manual às vezes fica para depois do
  encerramento.
- O encerramento de tarefa deixa de depender de uma decisão do Victor para
  terminar; ele decide a promoção, não a integração.

**Negativas, assumidas**

- **Divergência entre as duas linhas é agora possível**, e cresce enquanto o
  Victor não promover. Quanto maior a divergência, mais caro o merge em `master`
  e menos `master` descreve o projeto — a documentação (`PROJECT_STATE`,
  `BACKLOG`) passa a descrever a `develop`, não a linha padrão do repositório.
- **Quem clona o repositório cai em `master`**, que pode estar atrás do estado
  real. Mitigação: o `README` e o `GIT_WORKFLOW` dizem qual é a linha de
  integração.
- **Uma etapa a mais por tarefa**, sem ganho técnico mensurável com um
  desenvolvedor só. É custo aceito em troca do controle descrito acima.
- **Gatilho de revisão:** se a divergência entre `develop` e `master` passar a
  ser medida em semanas, ou se `master` deixar de receber promoção por tempo
  suficiente para a documentação mentir sobre ela, este ADR deve ser reaberto —
  possivelmente voltando ao trunk único com tags (alternativa b).

## Status

`accepted` — decidido pelo Victor em 11/09/2026, após a IA recomendar o contrário
e ele reafirmar. Implementado na mesma data: `develop` criada a partir de
`master` em `9161c7d`, e a `pd-09` mergeada nela pelo PR #8.
