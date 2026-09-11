---
title: "Relatório — pd-08/feat/spike-cliente-universal"
status: stable
version: 1.0
updated: 2026-09-11
scope: >
  Encerramento da pd-08: execução do spike-gate que o ADR-0002 #12 exigia como
  pré-requisito do cliente do MVP. Registra o nascimento de apps/app (Expo 57 +
  React Native Web), as três telas de maior risco construídas para o gate, as
  medições que sustentaram o veredicto do Victor, as versões pinadas do eixo
  Expo/React Native e o saldo do backlog — incluindo a premissa refutada sobre
  o TypeScript e as vulnerabilidades medidas.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 07-process/BACKLOG.md
  - 06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - _templates/relatorio-branch.md
type: process
---

# pd-08/feat/spike-cliente-universal

**Encerrada em:** 11/09/2026
**Merge:** `5ec24e4` em `master` — squash do [PR #7](https://github.com/vhaguiar07/petdots/pull/7), CI verde em `22126b2`; branch removida do remoto e do clone local
**ADR:** [0008 — Cliente universal Expo + React Native Web](../../../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)

---

## Objetivo

Executar o **spike-gate do cliente universal** — a única condição que o
[ADR-0002](../../../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) #12
deixou aberta, e o **último bloqueador** do backlog. Pedido do Victor, nas
palavras dele (10/09/2026):

> "Fase 1 (análise) da pd-08 — o spike-gate do cliente universal. (…) Briefing:
> executa o spike-gate do cliente universal como o TECHNOLOGY_STACK descreve —
> validar React Native Web nas telas de maior risco do MVP marketplace e
> registrar a decisão."

Ele passou três achados prontos, que moldaram o plano: **(a)** SEO está **fora**
do gate (o ADR-0004 #13 já decidiu `apps/landing` em Next.js, separada e
independente); **(b)** o risco técnico principal é a `pd-05` ter migrado o
monorepo para ESM contra o Metro do Expo, e o plano precisava de critério para
**não confundir falha de tooling com reprovação de UX** — que seria falso
negativo; **(c)** a API só expõe `/api/v1/health`, então as telas precisavam
decidir de onde vêm os dados.

**Por que importava:** o ADR-0002 nomeia este eixo como a **decisão de menor
reversibilidade do projeto** — voltar atrás significa reescrever a árvore de UI
inteira. E o marketplace legado, referência de capacidade, usava **Next.js
separado** para a web: um cliente universal mobile+web nunca tinha sido validado
neste contexto.

A tarefa rodou em dois chats, conforme a diretriz de handoff: **Fase 1 (análise)
em Fable, 10/09**; **Fase 2 (implementação) em Opus, 11/09**, a partir de
`PLANS/plan-a.md` — descartado neste encerramento, como manda o processo.

## Diagnóstico

> Seção opcional em feature. Entra aqui porque a tarefa **refutou duas premissas
> registradas** do repositório, e premissa refutada se corrige na hora
> (`DIRETRIZES_FLUXO_IA` §3).

| # | O que se acreditava | O que foi medido (11/09/2026) |
|---|---|---|
| 1 | O tooling do Nest está travado porque subir exigiria **duas majors** de TypeScript — "a `latest` é 7.0.2 e a 6 saiu apenas em beta" (backlog, 08/09/2026) | **Falso.** As versões **6.0.2 e 6.0.3 estão publicadas e estáveis**; o que enganou a leitura original é que a tag `latest` pulou para a linha 7 e as tags `beta`/`rc` do TypeScript estão desatualizadas. O caminho é **um único major** (5.9 → 6), sem o compilador nativo da 7 |
| 2 | `npm audit` está **em zero** (`TECHNOLOGY_STACK` e o item dos `overrides`, 08/09/2026) | **Já não é verdade, e não é culpa da `pd-08`:** medido num worktree limpo de `d18bc0e`, **sem `apps/app`**, o audit acusa **7 `high`** da cadeia `multer` ← `@nestjs/platform-express`. Surgiram entre 08/09 e 11/09 |
| 3 | O risco de o Metro não resolver os pacotes ESM do workspace poderia reprovar o gate | **Retirado da mesa antes de qualquer código**, em monorepos descartáveis fora do repositório: o Metro resolve pacote de workspace com `"type": "module"` e dist ESM, na web e no Android, **com zero configuração**. E falha de tooling seria **modo comum às duas alternativas** — o fallback também usa Expo e Metro no mobile —, logo não é evidência a favor de nenhuma |

Os três estão corrigidos no [`BACKLOG`](../../BACKLOG.md) e no
[ADR-0008](../../../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md).

## O que foi feito

Commit único: `22126b2`, squashado em `5ec24e4`. **44 arquivos.**

- **Nasceu `apps/app`** — Expo **57.0.21** + React Native **0.86.3** + React
  Native Web **0.21.2** + `expo-router` **57.0.20**, com `"type": "module"`
  como os demais workspaces (ADR-0007), `metro.config.js` em sintaxe CJS
  (deliberado — o Metro usa carregador próprio) e `web.output: "static"`, que é
  o que torna a semântica do DOM **auditável por comando**.
- **Três telas de maior risco**, sobre fixtures locais: **J2 comparador**
  (`comparator-screen.tsx`, 454 linhas, 343 ofertas), **J3 checkout**
  (`checkout-screen.tsx`, 427 linhas) e **J4 painel do lojista**
  (`store-panel-screen.tsx`, 420 linhas, 40 pedidos). Mais `store-screen.tsx`
  (146). Volume não negociável por desenho: fixture confortável esconderia
  exatamente o problema de lista densa que o veredicto precisava enfrentar.
- **O vocabulário de UI que sobrevive ao spike** — `src/spike/ui/`: 8
  componentes-envelope (`Heading`, `Landmark`, `Button`, `Field`, `Table`,
  `TableHeader`, `TableRow`, `Cell`) em `primitives.tsx` (425 linhas), mais
  `app-shell.tsx` (160) e `+html.tsx` (42). **É aqui que vive toda a
  acessibilidade**: as 31 ocorrências de `role`/`aria-*`/`nativeID`/`userSelect`
  estão nesses três arquivos e cobrem 11.208 elementos renderizados.
- **Uma chamada real de rede** — `use-api-health.ts` consome
  `GET /api/v1/health` pelo schema já publicado em `packages/contracts`. É o
  eixo que as fixtures não cobrem: o cliente alcança o Nest pela rede e consome
  o pacote de contratos ponta a ponta.
- **`apps/api` ganhou `CORS_ORIGINS`** (`env.schema.ts`, `main.ts`), **desligado
  quando a variável não existe**. O cliente universal roda em origem própria
  (`:8081` no `expo start`) e sem isso o navegador bloqueia toda chamada; um
  default permissivo seria decisão de segurança tomada por omissão. **O contrato
  OpenAPI não mudou.**
- **`apps/app` entrou no CI sem editar o workflow** — os passos já eram
  `turbo run`, então `lint`, `typecheck` e `build` (`expo export --platform
  web`) passaram a alcançá-lo sozinhos.
- **Docs** — [ADR-0008](../../../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)
  (287 linhas, novo), [`TECHNOLOGY_STACK`](../../../02-architecture/TECHNOLOGY_STACK.md)
  v1.5 (eixo "Cliente" deixa de ser condicional; versões pinadas da `pd-08`),
  [`USER_JOURNEYS`](../../../01-product/USER_JOURNEYS.md) v2.1 (a seção do
  spike passa a registrar o **resultado**), `DECISION_LOG` v1.5,
  [`BACKLOG`](../../BACKLOG.md) v1.7 e `PROJECT_STATE` v4.4.

## Migrations

**Nenhuma.** A entrega é camada de cliente; o `prisma/schema.prisma` continua
sem models.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| **Aprovar o cliente universal** — o fallback Expo + Next.js não é acionado | **Usuário** (11/09/2026, após percorrer as três telas no navegador desktop) |
| **Escrever ADR mesmo aprovando**, contra a letra do `TECHNOLOGY_STACK` (que pediria ADR só "se mudar a direção") | **Usuário** (no portão) — confirmar o cliente universal **trava a arquitetura de UI**, e "por que RN-Web e não Next.js?" é dúvida recorrente garantida: os dois gatilhos de ADR do `DIRETRIZES_FLUXO_IA` §6 |
| **Formato e modelo:** IA sozinha, análise em Fable e implementação em Opus | **Usuário** (10/09/2026) |
| **Só qualidade de UX/web/a11y pode reprovar** — falha de tooling é modo comum às duas alternativas. Regra fixada **antes** de medir | IA (Fase 1), aceita no portão |
| **O julgamento final é humano** — a IA entrega telas, medições e recomendação; *"isto parece web de verdade ou mobile esticada?"* é do Victor | IA, confirmado pelo usuário |
| `apps/app` é **workspace permanente**; só `src/spike/` é descartável | IA |
| `apps/app/tsconfig.json` estende `expo/tsconfig.base`, **não** `@petdots/config` — a resolução é a do Metro (`bundler`), não `node16`, e o app precisa de `jsx`. O compartilhamento que importa é de **código** | IA |
| O lint do app **não** usa a base comum: `eslint-config-expo` com `settings.react.version` fixado | IA (com o débito registrado na vigilância) |
| **Nada nasceu em `packages/contracts`** — contrato nasce com o endpoint; criar schemas de marketplace agora congelaria a API antes do ADR das pendências de modelagem | IA |
| **Fixtures locais em vez de endpoints reais ou mock server (MSW)** | IA — endpoints reais transformariam um spike de 2-3 dias em semanas sem mudar o que o gate mede, que é renderização |

## Validações

> Fonte das medições de UX/a11y/performance: ADR-0008, medidas durante a Fase 2
> em 11/09/2026. Fonte dos números de CI: run
> [34608989449](https://github.com/vhaguiar07/petdots/actions/runs/34608989449)
> sobre `22126b2`.

| O quê | Resultado |
|---|---|
| Lint | **6 tarefas** verdes, 8,7 s |
| Checagem de tipos | **6 tarefas** verdes, 4,0 s |
| Build | **4 tarefas** verdes, 33,7 s (inclui `expo export --platform web`) |
| Testes | **6 suítes, 34 testes** — 1 suíte / 8 testes em `@petdots/domain`, 5 suítes / 26 testes em `@petdots/api` |
| Teste de contrato | **1 suíte, 1 teste** — OpenAPI **inalterado** pela entrega |
| Smoke de boot | `Nest application successfully started`; health respondeu **503** (sem banco no runner, como esperado) |
| Acessibilidade (`axe-core`, 3 telas) | **0 violações `serious` ou `critical`** — eram 3 `serious` antes da camada de semântica |
| Semântica de DOM (comparador, 343 ofertas) | `<button>` nativo **0 → 350**; cabeçalhos **0 → 4**; landmarks **0 → 3**; `aria-label` 0 → 695; `<div>` 10.106 → 9.749 |
| Custo da semântica | **8 componentes-envelope + 3 arquivos de fundação**; **zero** anotação por elemento em 11.208 elementos |
| Desktop (1920×1080) | Tabela em **1476px de 1920** (77%), **zero rolagem horizontal**; seleção de texto devolveu `R$ 7,10`; Ctrl+F alcança a 343ª linha (sem virtualização); voltar/avançar, F5 em `/checkout` e 342 `<a href>` reais para nova aba |
| Teclado | **40 Tabs → 40 controles**, com foco visível |
| Performance de rolagem | **60 fps mediano** (p95 59) rolando 20.570px |
| Bundle web inicial | **1.714.810 bytes** (1,64 MB); `dist` inteiro 1,82 MB |
| Rede limitada (400 kbps / 400 ms RTT) | Primeira tabela em **1,4 s**; lista densa utilizável em **36,7 s** — o único número ruim, e **não discrimina** (um Next.js pagaria o mesmo) |
| `expo export --clear` | **67 s** a frio, **14 s** incremental, **5,7 s** no CI com cache do Turborepo |
| Mobile 390px (reconferência do BUG-001) | **3 de 3 campos de busca visíveis**, sem rolagem horizontal — a armadilha do legado não se repetiu |
| `npm audit` | **14 `moderate` novas** (cadeia de build do Expo) + **7 `high` pré-existentes** (cadeia `multer`, presentes já em `d18bc0e`) — os dois registrados na vigilância |

### Prova de vermelho

**Não se aplica no sentido do template, e o que existe fica declarado:** a
entrega **não criou teste-sentinela novo em código**. O `expo export --platform
web` no CI passa a funcionar como sentinela permanente da resolução dos pacotes
ESM pelo Metro (ADR-0008 #4), mas **não há registro de uma prova de vermelho
executada sobre ele** — ele não foi visto falhar de propósito.

O que **foi** provado por inversão, durante a Fase 1, com o mesmo espírito: o
`metro.config.js` em CJS sob `"type": "module"` foi validado **fazendo o arquivo
lançar exceção e vendo a exceção aparecer** — sem isso, "funcionou" seria
indistinguível de "o arquivo nem foi lido".

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| **Bloqueadores** | 1 | **0** |
| Fila (acionável) | 1 | **1** |
| Vigilância (com gatilho) | 8 | **12** |
| Features planejadas | 2 | **3** |

**Saíram:**

1. 🔴 **Spike-gate do cliente universal ainda não executado** — era o **único
   bloqueador** do projeto. Executado e aprovado; a camada de cliente do MVP
   deixou de ser indefinida.

**Permanece na fila (1):** revogação do OAuth client do protótipo legado no
console do Google Cloud. **Depende de acesso que a IA não tem** e não bloqueia
trabalho de produto.

**Entraram, e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| **14 vulnerabilidades `moderate` da cadeia de build do Expo** (`decode-uri-component` ← `query-string` ← `expo-router`; `uuid` ← `xcode` ← `@expo/config-plugins`) | `expo-router` e `@expo/config-plugins` atualizarem suas transitivas | **Upstream do Expo.** São transitivas de pacotes do SDK 57, e forçar `override` arriscaria o bundler **no meio do gate** — o ADR-0008 fixou o SDK 57 justamente para não invalidar a medição. Nenhuma é código de runtime do cliente |
| **7 vulnerabilidades `high` da cadeia `multer`/NestJS** | `@nestjs/platform-express` depender de `multer` corrigido | **Upstream do NestJS.** **Pré-existentes** — medidas num worktree de `d18bc0e` sem `apps/app`. O `multer` só é exercido em upload multipart, e o MVP não tem upload |
| **Comparador sem paginação nem virtualização** (36,7 s em 400 kbps) | Implementar a J2 de produto | **Trabalho de produto.** As telas do spike são descartáveis, e paginar a tela que existe para medir densidade **enfraqueceria a própria medição**. Não é débito do RN-Web: é desenho de tela |
| **`eslint-config-expo` atrasado em relação ao ESLint 10** (contornado por `settings.react.version`) | `eslint-plugin-react` publicar suporte estável ao ESLint 10 | **Upstream.** A única versão que declara peer para o ESLint 10 é a `7.8.0-rc.0`, pré-release |

**Reescrito (premissa refutada, não item novo):** "Tooling do Nest travado na
linha 11" — o gatilho passou de "TypeScript ≥ 6" para "**decidir subir a raiz
para TypeScript 6**", porque a 6 está estável e a coexistência das duas linhas
(5.9.3 na raiz, 6.0.3 aninhada em `apps/app`) **está medida e funcionando**.

**Acrescentado às features:** "**Bootstrapar `apps/landing` em Next.js**" —
tornado explícito porque o ADR-0008 **reafirma** que a aprovação do cliente
universal **não a dispensa**: a necessidade dela é SEO, que sempre esteve fora
deste gate.

## Pendências geradas

- **Quatro itens de vigilância**, todos com gatilho nomeado, na tabela acima e
  em [`BACKLOG.md`](../../BACKLOG.md).
- **Duas premissas do repositório corrigidas** no `BACKLOG` (TypeScript 6
  estável; `npm audit` já não está em zero) — a segunda deixa
  [`TECHNOLOGY_STACK`](../../../02-architecture/TECHNOLOGY_STACK.md) com uma nota
  de que a frase "audit em zero" vale só para 08/09/2026.
- **`packages/ui` não nasceu**, e é decisão consciente: o vocabulário de UI vive
  em `apps/app/src/spike/ui/` e migra para um pacote **quando houver um segundo
  consumidor**. Hoje não há — e o ADR-0005 já condicionava `packages/ui` ao
  resultado do gate.
- **As telas de `apps/app/src/spike/` são descartáveis** e continuam no
  repositório de propósito, como referência do vocabulário de UI que as telas de
  produto herdam. Saem quando a primeira tela de produto nascer.
- **Nada mais.** O bloqueador que saiu está resolvido, não transferido.

## Avaliações obrigatórias da Fase 1

| Eixo | Decisão e porquê |
|---|---|
| **Auditoria** | **Não se aplica.** A entrega é camada de apresentação sobre fixtures locais: não cria nem altera nenhuma ação de sistema rastreável, não há ator autenticado e nenhum dado é persistido. A única mudança no backend é `CORS_ORIGINS`, que é configuração de borda |
| **Documentação de domínio** | Nenhum documento de domínio foi contradito — o spike não modela entidade nenhuma. Foram atualizados os documentos de **arquitetura e decisão**: `TECHNOLOGY_STACK` v1.5 (o eixo "Cliente" deixa de ser condicional), `USER_JOURNEYS` v2.1 (a seção do spike passa a registrar resultado em vez de critério), `DECISION_LOG` v1.5, `PROJECT_STATE` v4.4 e o ADR-0008 novo. ⚠️ Fica aberto o critério do `SYSTEM_ARCHITECTURE` "revisado após o spike-gate" — o documento não precisou mudar, mas o checkbox segue desmarcado |
| **Testes** | **Nenhum teste novo**, e é deliberado: o produto do gate é uma **decisão**, não código de produção — as telas são descartáveis, e cobrir com teste a UI que se vai jogar fora seria custo sem retorno. O que protege a entrega é o CI: `lint`, `typecheck` e o `expo export --platform web`, que sentinela a resolução dos pacotes ESM pelo Metro. A suíte existente (34 testes) seguiu verde, e o teste de contrato provou que o OpenAPI não mudou |
