---
title: Diretrizes de Fluxo com IA
status: stable
version: 1.2
updated: 2026-09-08
scope: >
  Define como o trabalho flui com agentes de IA no PetDots: as três fases
  (análise, implementação, testes), os portões de decisão do usuário, a
  recomendação obrigatória de formato e modelo, a numeração de tarefas
  pd-NN, e as obrigações de registro (backlog, bugs, ADR, relatório de
  encerramento). Complementa AGENTS.md, que define o comportamento; este
  documento define o processo.
relates_to:
  - AGENTS.md
  - 07-process/BACKLOG.md
  - 07-process/BUGS.md
  - 07-process/IDEIAS.md
  - 03-engineering/GIT_WORKFLOW.md
  - 06-decisions/ADR/README.md
type: process
---

# Diretrizes de Fluxo com IA

> `AGENTS.md` diz **como o agente se comporta**. Este documento diz **como o
> trabalho anda**: quem decide o quê, em que ordem, e o que fica registrado.
> Modelo importado do ecossistema SOAC (oficina-app) em 06/09/2026 e adaptado
> à estrutura em camadas do PetDots.

---

## 1. As três fases: análise → implementação → testes

Todo trabalho novo tem três fases. Nenhuma começa sem que a anterior tenha
passado pelo seu portão.

### Fase 1 — Análise (estudo e planejamento)

**Briefing curto primeiro.** Todo trabalho novo começa com um briefing curto do
usuário — feature, fix, patch, documentação, o que for. Se ele não vier
espontaneamente, a IA **pede o briefing** antes de iniciar qualquer análise. Se
faltar contexto essencial, perguntar; mas a ideia é o briefing ser curto — o
detalhe sai da própria análise.

**Recomendação de formato + modelo (obrigatória).** Recebido o briefing e
**antes de iniciar a análise**, a IA recomenda e **aguarda a decisão do
usuário** sobre:

- **Formato:** uma IA sozinha analisa, **ou** spawnar um **time de agentes**;
- **Modelo:** qual modelo executa a análise — **Fable, Opus, Sonnet ou Haiku** —
  escolhido pela capacidade que a tarefa exige.

A recomendação **não é um menu neutro**: vem justificada pelo briefing
(complexidade, frentes tocadas, risco, paralelizabilidade), dizendo qual
combinação parece melhor para *aquela* tarefa e **por quê**. A decisão final é
do usuário, **a cada trabalho novo** — nunca inferir de trabalhos anteriores.

#### Escolha de modelo pela capacidade, não pela sessão

A pergunta é sempre **"qual modelo é o melhor para ESTA tarefa?"**, nunca "qual
modelo já está carregado". A IA da sessão é uma circunstância, não uma opção do
menu; e "time de agentes" não implica um modelo fixo.

**O espaço de opções é uma matriz:** {IA sozinha × time de agentes} × {qualquer
modelo}. Recomendar a célula certa, não apenas os dois cantos habituais.

| Perfil | Modelo | Para quê |
|---|---|---|
| Topo | **Fable** | Análise complexa, arquitetura, debugging não-óbvio, segurança, decisões onde errar custa caro |
| Execução forte | **Opus** | Implementar código bem especificado, refactors, trabalho agêntico longo com a análise fechada |
| Intermediário | **Sonnet** | Código rotineiro, fixes pequenos e delimitados, documentação |
| Leve | **Haiku** | Volume mecânico puro — renomeações, varreduras simples, formatação |

O critério é **ajuste, não potência máxima**: potência de menos gera retrabalho;
potência de mais desperdiça custo e limites. Fases diferentes do mesmo trabalho
costumam pedir modelos diferentes — análise em Fable, implementação em Opus é o
caso comum.

**Se o modelo recomendado não é o da sessão, dizer isso explicitamente** e
orientar a troca (`/model` no Claude Code), lembrando que trocar o modelo
**preserva todo o contexto da conversa**. A troca é barata; a recomendação
enviesada pelo modelo corrente é que custa.

**Re-sugestão no meio da fase.** A escolha inicial não é imutável. Se durante a
análise ficar claro que ela foi ruim — recomendou-se Sonnet e o problema se
revelou mais complexo, ou o inverso —, a IA **re-sugere na hora**, com o motivo,
e aguarda a nova decisão.

#### O que a análise precisa avaliar explicitamente

Três avaliações são obrigatórias na Fase 1, e **a decisão fica registrada mesmo
quando é "não se aplica"**, com o porquê:

| Eixo | Pergunta |
|---|---|
| **Auditoria** | A mudança cria ou altera ações que faz sentido rastrear (quem fez, quando, o quê mudou)? |
| **Documentação de domínio** | Que documento de `docs/` a mudança contradiz ou desatualiza? |
| **Testes** | Que teste novo a mudança exige? (ver `03-engineering/TESTING_STRATEGY.md`) |

O produto da Fase 1 são as decisões tomadas e o plano — a fase termina no portão
abaixo.

### Portão Fase 1 → Fase 2 (obrigatório)

Ao terminar a análise e **antes de escrever qualquer código**, a IA apresenta a
recomendação e **aguarda a decisão do usuário**. Nunca sai implementando
sozinha.

> 🔴 **Nunca iniciar tarefa nova com outra branch aberta.** Antes de criar a
> branch da Fase 2, conferir `git status` e `git rev-parse --abbrev-ref HEAD`:
> se houver trabalho não commitado, ou se o checkout estiver numa branch de
> tarefa em vez da base, **parar e reportar** — a decisão de commitar, encerrar
> ou guardar é do usuário, nunca da IA.
>
> **Por quê:** branch criada sobre working tree suja carrega o trabalho da outra
> tarefa para dentro da nova, misturando duas entregas num commit só; e
> `checkout`/`stash` sobre arquivos ainda não versionados arrisca trabalho que
> não existe em lugar nenhum.

#### Quem implementa (motor de execução)

- O planejamento vira **arquivo(s) de plano** em `PLANS/` na raiz do repositório
  — um por frente de trabalho (`PLANS/plan-a.md`, `PLANS/plan-b.md`; ou um só,
  se não houver divisão). Template: [`_templates/plano-fase1.md`](../_templates/plano-fase1.md).
- **O plano é o handoff entre dois chats — e é o único.** A Fase 1 acontece em
  um chat; a Fase 2 é iniciada em **outro chat, sem nenhum contexto da
  conversa anterior** (decisão do Victor, 06/09/2026: economia de tokens — a
  análise carrega leituras longas que a implementação não precisa). Logo, o
  plano é escrito para um leitor que **não viu nada**: nunca "como conversado",
  nunca "conforme decidido acima" sem o conteúdo da decisão ali mesmo. Um plano
  que exige o chat de origem para ser executado é um plano incompleto.
- **Conteúdo mínimo de todo plano** (é o que o template garante):
  1. **Como iniciar a Fase 2 no chat novo** — o que ler primeiro (em ordem), o
     modelo e formato decididos com a instrução de `/model`, e a primeira
     mensagem pronta para colar;
  2. **Briefing original**, nas palavras do usuário;
  3. **Estado exato do repositório** no momento do handoff — branch, commit,
     árvore limpa ou não, o que da transição **já foi executado** e o que **não
     deve ser refeito**;
  4. **Todas as decisões**, com quem decidiu (IA × usuário) e o porquê — as
     tomadas pela análise e as tomadas no portão;
  5. Fontes que o plano materializa (documentos a ler antes de codar);
  6. Pré-condições verificáveis; passos numerados; critérios de aceitação
     provados por comando; roteiro de testes manuais; riscos conhecidos;
  7. **Obrigações de encerramento com caminhos** — relatório, itens de backlog a
     remover e adicionar, documentos a atualizar.
- Planos são **temporários e descartáveis** — implementados, podem ser
  removidos. Documentação permanente é o **relatório de encerramento**, os
  **ADRs** e os documentos de `docs/`, nunca os planos. ⚠️ `PLANS/` é ignorado
  pelo Git: o handoff vive **no disco deste clone**. Os dois chats precisam
  rodar sobre a mesma cópia do repositório.
- Recomendar entre **(a)** uma IA sozinha implementa, no modelo adequado à
  implementação (que pode diferir do que fez a análise), ou **(b)** spawnar um
  time de agentes, delegando cada plano — planos independentes vão em paralelo,
  e o modelo do time também se escolhe pela tarefa.

### Fase 2 — Implementação

Código, migrations e documentação **da mesma entrega**, no motor decidido no
portão, seguindo `03-engineering/CODING_STANDARDS.md` e `04-api/API_GUIDELINES.md`.

Regras que valem em toda alteração:

- **Reaproveitar ao máximo** componentes e estilos existentes; criar do zero só
  quando não houver nada aproveitável.
- **Responsividade obrigatória** — desktop, tablet e celular.
- **Documentação na mesma entrega.** Alteração que bate em algo documentado
  atualiza o documento correspondente junto. Documentação defasada é pior que
  ausente: a IA confia nela.

| Mudança | Documento a atualizar |
|---|---|
| Regra de negócio nova ou alterada | `01-product/` (DOMAIN_MODEL, FEATURE_CATALOG) |
| Migration, campo ou enum novo | `01-product/DOMAIN_MODEL.md` |
| Rota nova, contrato alterado | `04-api/` |
| Decisão arquitetural com custo de reversão | ADR novo em `06-decisions/ADR/` |
| Papel ou permissão alterada | `03-engineering/SECURITY.md` |
| Termo novo do domínio | `00-foundation/GLOSSARY.md` |

### Fase 3 — Testes

**Testes da IA:** suíte rodando, build validado no padrão do CI, smoke de boot
quando a mudança tocar fiação de módulos (o que `tsc` e os testes unitários não
pegam).

**Testes manuais do usuário:** a IA entrega avisando que está pronto **com um
roteiro de testes sugerido** e **aguarda a aprovação explícita**. Nenhum commit
ou encerramento antes disso.

O roteiro traz cenários de sucesso, bloqueios esperados e regressões, com
**passos concretos de UI** — tela, rótulo real do botão, dados de exemplo — e o
resultado observável. O usuário deve conseguir executar sem descobrir onde
clicar. Ao montar o roteiro, conferir os rótulos reais no código: isso também
flagra itens de UI esquecidos.

#### A bateria completa é do encerramento, não de cada alteração

Rodar suíte inteira e build a cada edição pequena cobra minutos do usuário sem
comprar nada.

| Mudança | Durante o trabalho | Encerramento |
|---|---|---|
| Texto visível, rótulo, comentário, doc, estilo | **nada** | bateria completa |
| Código pequeno (prop, import, lógica local) | checagem de tipos, **só** se mexeu em tipo ou import | completa |
| Regra de negócio, autorização, contrato, tratamento de erro | **só o teste do arquivo tocado** | completa |
| Migration, fiação de módulo, variável de ambiente | smoke de boot | completa |

Fora dessa conta, porque **não são verificação**: (a) **build e reinício** do
serviço que o usuário vai olhar na tela — sem isso ele testa o código antigo;
(b) **prova de vermelho** ao criar um teste-sentinela — sem ela o sentinela não
protege nada.

Duas consequências inseparáveis:

- **Não anunciar como "validado" o que não rodou.** Entrega parcial sem
  verificação se declara como tal. A regra troca tempo por risco assumido;
  esconder isso a transformaria em risco invisível.
- **Escrever o teste continua obrigatório no mesmo commit.** O que se adia é
  *rodar tudo*, nunca *ter* o teste.

---

## 2. Numeração de tarefas: `pd-NN`

Formato da branch: `pd-{número}/{categoria}/{nome-em-kebab-case}`

| Parte | Descrição | Exemplo |
|---|---|---|
| `pd` | Prefixo fixo — PetDots | `pd` |
| `{número}` | Próximo da ordem incremental, com dois dígitos | `01`, `17` |
| `{categoria}` | `feat`, `fix`, `refactor`, `chore`, `docs` | `feat` |
| `{nome}` | Nome curto da tarefa, kebab-case | `spike-cliente-universal` |

Exemplos válidos: `pd-01/feat/spike-cliente-universal`,
`pd-02/feat/catalogo-loja`, `pd-07/fix/split-pagamento`.

**Como escolher o número:** o próximo da sequência. Conferir **duas fontes** e
ficar com a maior — as branches e os relatórios de encerramento:

```bash
# maior pd-NN entre branches locais e remotas
git branch -a --format='%(refname:short)' \
  | grep -oE 'pd-[0-9]+' | sort -u | sort -t- -k2 -n | tail -1

# maior pd-NN entre os relatórios já escritos
ls docs/07-process/relatorios-de-branch/semana-*/ 2>/dev/null \
  | grep -oE 'pd-[0-9]+' | sort -u | sort -t- -k2 -n | tail -1
```

⚠️ As duas fontes divergem na prática: branch deletada após o merge some de
`git branch -a`, mas o relatório dela fica. Ficar só com as branches
reaproveitaria um número já usado.

**Quando o PetDots tiver módulos**, a numeração passa a ser **por módulo**, com
o módulo antes do número — `marketplace/pd-01/...`, `carteira/pd-01/...` — e as
sequências passam a coexistir. Enquanto houver um produto só, a sequência é
única. Trabalho que corta vários módulos usa `transversal`.

O fluxo de branches, PRs e releases continua em
[`03-engineering/GIT_WORKFLOW.md`](../03-engineering/GIT_WORKFLOW.md).

---

## 3. Backlog: severidade exige evidência

O [`BACKLOG.md`](BACKLOG.md) é o **estoque de pendências conhecidas** — débito
técnico, decisões pendentes, features planejadas, documentação faltando —, de
onde saem as próximas tarefas.

> **Matar débito não é avanço.** Avanço é produto andando — decisão do Victor,
> 08/09/2026. O backlog é caderno de tudo que se descobriu, **não** fila de
> trabalho, e cresce em função do trabalho feito: instrumentar OTel faz nascer
> "para qual serviço exportar?", usar um override faz nascer "remover quando o
> upstream corrigir". Por isso o tamanho da lista **não é métrica de progresso**,
> e as três regras abaixo existem para o backlog não consumir dias de produto.

### 3.1 Quando abrir uma tarefa só de débito

**Só quando o débito bloqueia trabalho de produto** — ou quando é **risco de
segurança ativo e confirmado** (credencial válida exposta, por exemplo).

Não abrir tarefa de débito porque o item está na lista, porque está vermelho no
`npm audit` ou porque a lista está grande. Débito que não bloqueia nada fica
anotado e espera o dia em que bloquear — nesse dia, ele entra na tarefa que ele
bloqueou, pela regra 3.2.

**Origem:** 08/09/2026, depois de quatro branches seguidas de manutenção
(`pd-01`, `pd-03`, `pd-04`, `pd-05`) sem uma linha de produto implementada.

### 3.2 Débito encontrado durante uma tarefa resolve-se nela

Mesma regra que o §4 já aplica a bugs, e pelo mesmo motivo: o custo de resolver
é menor agora, com o contexto carregado, do que numa tarefa futura.

- **Vale mesmo fora de contexto.** O critério é *quando* foi encontrado, não *se
  tem relação* com a tarefa. Se a correção for grande a ponto de mudar o tamanho
  da entrega, dizer isso e deixar o usuário decidir — mas o default é resolver.
- **Exceção única: pré-condição fora do alcance da tarefa.** Quem invocar a
  exceção **precisa nomear a pré-condição e o que a destrava** — "gatilho:
  existir ambiente de deploy", "gatilho: `nestjs-zod` publicar suporte a `^12`".
  Item sem gatilho nomeado **não é exceção**: é trabalho adiado, e volta para a
  tarefa.
- Débito resolvido na própria tarefa **não recebe linha no backlog** — nunca
  esteve na fila. O registro vai para o relatório da branch.

### 3.3 Duas tabelas: fila e vigilância

A seção de débito técnico do backlog é dividida em duas, e **o número que se
reporta é o da fila**:

| Tabela | O que entra | Como se lê |
|---|---|---|
| **Fila** | Acionável hoje: nada externo falta | É trabalho de verdade esperando |
| **Vigilância** | Bloqueado por pré-condição, com **gatilho nomeado** | Não é trabalho; é anotação para não esquecer |

Item sai da vigilância para a fila **quando o gatilho dispara**, e nesse momento
já entra pela regra 3.2 na tarefa que o destravou.

**Ao responder qualquer pergunta sobre o backlog:** abrir pela contagem da
**fila**, depois comprimir a vigilância em uma linha. Nunca reportar só o total
de linhas — e nunca omitir a vigilância, porque o objetivo é enquadrar, não
esconder.

- **Entrega que gera pendência nova** → adicionar ao backlog **na mesma
  entrega**, **na tabela certa** (3.3) e, se for vigilância, **com o gatilho
  nomeado**.
- **Todo possível problema vai para o backlog:** qualquer risco, brecha ou
  armadilha **verificado** durante qualquer trabalho entra na hora, mesmo sem
  decisão de resolver, com o detalhe e a origem. Documentar em `docs/` não
  substitui o item de backlog: o documento explica o estado, o backlog garante
  que o problema não se perde.
- **Entrega que resolve um item** → removê-lo na mesma entrega. O histórico fica
  no relatório da branch que resolveu.
- **Não inventar itens:** só entra o que foi verificado no código ou decidido
  com o usuário, sempre com a origem e a data.

**Item grave nasce com a medição.** Marcar como crítico (🔴, "bug ativo",
"vazamento") só se o registro trouxer **como foi verificado, o resultado
observado e a data**. Suspeita fundamentada entra como item **normal**, dizendo
o que **falta medir**; nunca como crítico "por precaução" — severidade alta
desloca atenção dos problemas reais.

**Medir antes de dimensionar.** Ao atacar qualquer item, verificar o estado real
**antes** de planejar o trabalho. Premissas envelhecem: o código muda, o
problema é corrigido de passagem, ou a leitura original estava errada.

**Premissa refutada se corrige na hora.** Item cuja premissa não se confirma é
**removido** (ou reescrito com o diagnóstico novo e a data), nunca silenciosamente
reaproveitado para outra coisa. O inverso vale igual: item subestimado que se
revela grave sobe de severidade com a mesma exigência de evidência. Corrigir as
referências cruzadas de outros itens que apontavam para ele.

**Em risco de segurança, separar confirmado de hipótese.** "A credencial está no
histórico do Git" **não é** o mesmo que "a credencial é válida". Registrar as
duas coisas em separado e dizer qual verificação fecharia a dúvida. Numa
credencial exposta, a pergunta decisiva é se ela **ainda abre algo** — e a
resposta muda completamente a ação.

---

## 4. Bug encontrado: duas paradas obrigatórias

Vale para bug encontrado **a qualquer momento** — análise, implementação,
deploy, exploração, revisão, ou de passagem enquanto se fazia outra coisa. Não
depende de haver decisão de corrigir, nem de o bug ter relação com a tarefa.

Todo bug encontrado tem **duas paradas, na mesma entrega**:

1. **[`BUGS.md`](BUGS.md)** — o registro detalhado, com id próprio.
2. **[`BACKLOG.md`](BACKLOG.md)** — **uma linha** dizendo que existe bug
   pendente, apontando para o id.

Sem a parada 1 o bug perde o detalhe; sem a parada 2 ele perde a fila — o
backlog é o que se consulta ao planejar trabalho.

### Em qual seção do `BUGS.md`

| Situação | Seção | Id |
|---|---|---|
| Reproduzido na aplicação (abriu a tela, viu acontecer) | **Abertos** | `BUG-NNN` |
| Só lido no código, não reproduzido | **A validar** | `BUG-VNN` |
| Corrigido | **Resolvidos** (mover, com data) | `BUG-RNN` |

**Conteúdo mínimo:** o que acontece; onde (`arquivo:linha` e/ou tela e passos);
**como foi encontrado** (leitura de código × reproduzido) e **quando**; impacto
para o usuário; e, quando não reproduzido, **o que falta medir** para confirmar.

**Formato da linha no backlog** — o backlog carrega o ponteiro, o `BUGS.md`
carrega o detalhe:

```
| Bug pendente: <resumo curto> | Ver `BUG-VNN` em `07-process/BUGS.md` — <impacto em uma frase>. <O que falta para confirmar> | <origem e data> |
```

### Quem conserta e quando — decide o momento em que foi encontrado

Registrar é sempre obrigatório. O que a tabela define é a correção:

| Onde o bug apareceu | O que fazer |
|---|---|
| **Fase 2 de uma tarefa** | **Corrigir na mesma tarefa.** Não vira item de backlog nem tarefa futura |
| **Fase 1 de uma tarefa** | **Corrigir na Fase 2 da mesma tarefa** — entra no escopo apresentado no portão |
| **Análise periódica, sem tarefa nem branch** | Vai para o `BUGS.md` e a linha no backlog, para virar tarefa própria |

- **Bug corrigido na própria tarefa nasce direto em "Resolvidos"**, com data e
  commit — e **não** recebe linha no backlog, porque nunca esteve na fila.
- **Bug fora de escopo continua sendo corrigido** se apareceu durante a tarefa.
  O critério é *quando* foi encontrado, não *se tem relação*. Se a correção for
  grande a ponto de mudar o tamanho da entrega, dizer isso e deixar o usuário
  decidir — mas o default é corrigir.
- **Achado por um teste que você acabou de escrever conta como Fase 2**: teste
  novo que reprova por defeito **pré-existente** é bug encontrado na
  implementação ⇒ corrige ali.
- **Análise periódica não vira implementação por conta própria.** Sem tarefa e
  sem branch, o achado é registrado, não consertado.
- **Achado que veio de um plano em `PLANS/` precisa migrar para cá** — planos
  são descartáveis, e bug registrado só no plano desaparece com ele.

**Ao refutar:** remover o item com o diagnóstico e a data, **dos dois lugares**.

---

## 5. Ideias ficam fora do backlog

O [`IDEIAS.md`](IDEIAS.md) guarda o que **não é pendência**: melhorias
imaginadas, evoluções previstas de features entregues, oportunidades sem dono
nem prazo.

A separação é deliberada. **Backlog é só pendência real** — coisa que alguém
precisa resolver. Ideia misturada com pendência infla o backlog e faz a fila de
trabalho parecer maior do que é. Item de ideia que ganha dono e urgência
**migra** para o backlog; item de backlog que se revela desejo sem necessidade
migra para cá.

---

## 6. ADRs

Decisão com custo de reversão, ou que gera dúvida recorrente ("por que não
fizemos X?"), vira ADR em [`06-decisions/ADR/`](../06-decisions/ADR/) na mesma
entrega, pelo [template](../_templates/adr.md).

- **Antes de propor solução que contrarie um ADR aceito**, ler o ADR e apontar o
  conflito ao usuário.
- ADR aceito **nunca é editado**. Decisão nova que muda uma antiga vira **ADR
  novo que a substitui**; no antigo, só o Status muda.
- **"Alternativas consideradas" é o campo mais valioso** — é o que nem o código
  nem a documentação de feature registram, e evita re-propor solução já
  descartada.

Convenções completas em [`06-decisions/ADR/README.md`](../06-decisions/ADR/README.md).

---

## 7. Encerramento de branch

Ordem obrigatória:

1. **Testes manuais do usuário** — avisar que está pronto, com o roteiro
   sugerido, e **aguardar a aprovação explícita**. Nunca iniciar o encerramento
   sem ela.
2. **Push da branch + conferir o CI verde + merge**. Vermelho: investigar e
   corrigir na própria branch — nunca mergear em cima, nem deixar para depois.
   Validação local não substitui o CI.
3. **Trocar o checkout local para a branch base** — não permanecer na branch de
   trabalho após o encerramento. É essa troca que faz a conferência do portão
   Fase 1 → Fase 2 da próxima tarefa dar limpa.
4. **Registrar o que ficou pendente** no backlog (deploy, migration, ação
   manual).
5. **Criar o relatório de encerramento.**

### Relatório de encerramento

**Local:** `docs/07-process/relatorios-de-branch/semana-<AAAA-MM-DD>/<branch>.md`,
com `/` substituído por `-` no nome do arquivo. A data da pasta é a
**segunda-feira** que abre a semana do encerramento.

Ex.: `pd-01/feat/spike-cliente-universal` encerrada em 09/09/2026 ⇒
`docs/07-process/relatorios-de-branch/semana-2026-09-07/pd-01-feat-spike-cliente-universal.md`.

**Conteúdo mínimo** (template em [`_templates/relatorio-branch.md`](../_templates/relatorio-branch.md)):

- Objetivo da tarefa e contexto — o que o usuário pediu, nas palavras dele;
- O que foi feito, com os commits principais;
- Migrations criadas e aplicadas;
- **Decisões tomadas durante o trabalho e quem decidiu** (IA × usuário);
- Validações executadas e **seus resultados** — números reais, não "passou";
- **Saldo do backlog** — quantos itens saíram da **fila**, quantos entraram, e,
  para cada um que entrou, **por que não pôde ser resolvido na própria tarefa**
  (o gatilho que falta, pela regra 3.2). Sem essa prestação de contas, uma
  branch pode fechar itens e abrir outros sem que ninguém perceba o saldo.

O relatório é a documentação permanente do que aconteceu. Os planos em `PLANS/`
são descartados; o relatório fica.

---

## 8. Quem levanta os serviços é o usuário

**Não subir servidor de aplicação fora de teste.** O usuário inicia os próprios
processos e precisa saber, a qualquer momento, se o que está na tela é o código
novo ou o antigo. IA que sobe serviço por conta própria destrói essa certeza.

| Situação | Como fazer |
|---|---|
| **Teste que exige o app de pé** (smoke, probe de rota, e2e) | Subir, medir, **derrubar na mesma resposta** |
| Precisa encerrar processo do usuário | **Avisar na mesma resposta**, dizendo qual e por quê, e que ele precisa reiniciar |
| Entrega de backend que ele vai olhar na tela | **Rodar o build** e **dizer que ele precisa reiniciar** — nunca reiniciar por conta |

**Todo processo iniciado ou encerrado pela IA aparece na resposta** — nome,
porta e motivo. O silêncio aqui é o que faz o usuário testar por um bom tempo um
processo anterior à correção.

**Antes de concluir que "o código novo não funciona", conferir se o processo em
execução É o código novo.** A prova é barata e evita gastar diagnósticos com um
processo velho ainda na porta.

---

## 9. Segredo nunca aparece em saída de comando

Antes de rodar qualquer comando que leia configuração de ambiente real
(`docker inspect`, `env`, ler `.env`, descrever serviço em nuvem): projetar
**nomes** quando a pergunta é "o que existe", e mandar o **valor** direto para
variável de shell quando é preciso usá-lo.

**Nunca despejar o payload para mascarar depois** — máscara falha aberta, e a
saída fica no transcrito para sempre. Se vazar, **parar e avisar na hora**,
dizendo quais credenciais apareceram e que precisam de rotação.

---

## 10. Commits

- Mensagens **curtas** — uma linha, sem texto adicional.
- **Sem `Co-Authored-By` de IA**, sem menção a ferramenta de IA.
- **Sem emoji.**
- **Nunca commitar automaticamente após alterações de código.** Todo commit
  espera os testes manuais e a validação explícita do usuário.

Formato e tipos em [`00-foundation/NAMING_CONVENTIONS.md`](../00-foundation/NAMING_CONVENTIONS.md).
