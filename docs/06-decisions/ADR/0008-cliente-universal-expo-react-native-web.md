---
title: "ADR-0008: Cliente universal Expo + React Native Web — resultado do spike-gate"
status: stable
version: 1.0
updated: 2026-09-11
scope: >
  Registra o resultado do spike-gate que o ADR-0002 #12 exigia como
  pré-requisito do cliente do MVP: o cliente universal Expo + React Native Web
  foi APROVADO, e o fallback Expo + Next.js não é acionado. Traz as medições que
  sustentam o veredicto (semântica de DOM, acessibilidade, teclado, performance,
  custo de fundação), as versões pinadas do eixo Expo/React Native e as decisões
  de forma do workspace apps/app. Cumpre a condição do ADR-0002 #12 sem
  substituí-lo.
relates_to:
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 06-decisions/ADR/0005-bootstrap-monorepo.md
  - 06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 01-product/USER_JOURNEYS.md
  - 07-process/BACKLOG.md
type: decision
---

# ADR-0008: Cliente universal Expo + React Native Web — resultado do spike-gate

## Contexto

O [ADR-0002](0002-stack-tecnologica-fundacao.md) #12 escolheu um **cliente
universal Expo + React Native (+ React Native Web)** servindo iOS, Android e Web
de um só código, mas **condicionou a escolha a um spike de validação
obrigatório**, com **fallback nomeado**: Expo (mobile) + Next.js (web),
compartilhando os pacotes de domínio e contratos, nunca a UI.

A condição não era formalidade. O próprio ADR-0002 nomeia esse eixo como **a
decisão de menor reversibilidade do projeto**: o React Native Web pode entregar
uma web "funcional, não excelente", e voltar atrás significaria reescrever a
árvore de UI inteira. O marketplace legado, que serve de referência de
capacidade, usava **Next.js separado** para a web — ou seja, **um cliente
universal mobile+web nunca foi validado** neste contexto.

A `pd-08` executou o gate. Duas forças moldaram como ele foi conduzido:

**(a) Tooling não podia decidir o gate.** A `pd-05`
([ADR-0007](0007-esm-nest-12-e-prisma-7.md)) migrou o monorepo para ESM
(`"type": "module"`, `moduleResolution: node16`, imports relativos com `.js`), e
havia risco real de o Metro do Expo não resolver os pacotes do workspace. Mas o
fallback **também** usa Expo e Metro no mobile, sobre os mesmos pacotes: falha de
tooling é **modo comum às duas alternativas** e, por isso, não é evidência a
favor de nenhuma. A regra foi fixada antes de medir — só **qualidade de
UX/web/a11y** poderia reprovar.

**(b) SEO ficou fora do gate.** O [ADR-0004](0004-arquitetura-mvp-marketplace.md)
#13 já decidiu `apps/landing` em Next.js desde já, separada do cliente universal,
e diz explicitamente que essa necessidade é independente deste spike.

O risco de tooling foi medido antes de qualquer código, em monorepos descartáveis
fora do repositório, e **retirado da mesa**: o Metro resolve pacote de workspace
com `"type": "module"` e dist ESM, na web e no Android, **com zero
configuração**; `metro.config.js` em sintaxe CJS sobrevive a `"type": "module"`
no `package.json` do app; e o TypeScript 6.0.3 que o template do Expo pede
**coexiste** com o 5.9.3 da raiz, aninhado em `apps/app/node_modules`.

## Decisão

**O cliente universal Expo + React Native Web está APROVADO.** O fallback do
ADR-0002 #12 **não é acionado**, e o eixo "Cliente" do
[`TECHNOLOGY_STACK`](../../02-architecture/TECHNOLOGY_STACK.md) deixa de ser
condicional.

Veredicto do **Victor**, em 11/09/2026, após percorrer as três telas em navegador
desktop. A IA entregou telas, medições e recomendação; o julgamento — *"isto
parece web de verdade ou mobile esticada?"* — é humano por construção, e a
separação existe para conter o falso positivo de aprovar porque compilou.

### O que sustenta o veredicto

**A medição decisiva foi o custo da semântica de DOM.** O React Native Web
renderiza tudo como `<div>`: o template padrão do Expo 57, exportado, produz 43
`<div>`, zero tag de cabeçalho e um único `role` na página inteira. A pergunta do
gate nunca foi se isso pode ser corrigido — pode —, mas **onde a correção vive**:
se generaliza em poucos primitivos, é custo de fundação; se exige anotação
elemento a elemento, é imposto perpétuo sobre todas as telas do MVP.

Comparador com 343 ofertas renderizadas, DOM vivo, antes e depois de aplicar a
semântica:

| | antes | depois |
|---|---|---|
| `<div>` | 10.106 | 9.749 |
| `<button>` nativo | **0** | **350** |
| Cabeçalhos (`h1`/`h2`/`h3`) | **0** | 4 |
| Landmarks (`header`/`nav`/`main`) | **0** | 3 |
| `aria-label` | 0 | 695 |
| Violações `serious` do `axe-core` (3 telas) | **3** | **0** |

**O custo total: 8 componentes-envelope** (`Heading`, `Landmark`, `Button`,
`Field`, `Table`, `TableHeader`, `TableRow`, `Cell`) **e 3 arquivos de
fundação** (`primitives.tsx`, `app-shell.tsx`, `+html.tsx`). **Anotações de
acessibilidade por elemento nas telas: zero** — as 31 ocorrências de
`role`/`aria-*`/`nativeID`/`userSelect` vivem inteiramente nesses três arquivos e
cobrem 11.208 elementos renderizados.

Um achado reforça o resultado: **o RN-Web promove `role` a tag HTML nativa**.
`role="button"` sai como `<button>`, `role="heading"` + `aria-level` sai como
`<h1>`/`<h2>`/`<h3>`, `role="main"` sai como `<main>`. A semântica declarada por
props não fica presa na árvore de acessibilidade — vira HTML de verdade.

**Bloqueadores (§7.2 do plano), todos verificados por comando** em 1920×1080:

| # | Critério | Resultado |
|---|---|---|
| B1 | Usa a largura da tela | Tabela em 1476px de 1920 (77%); com o painel de comparação, o conteúdo ocupa a janela. **Zero rolagem horizontal** |
| B2 | Seleção nativa de texto | `user-select: auto`; a seleção de um preço devolveu `R$ 7,10` |
| B3 | Ctrl+F encontra | 343 linhas no DOM, **sem virtualização**; a última linha está no texto da página |
| B4 | Voltar/avançar | Comparador → loja → Voltar retorna a `/` |
| B5 | Recarregar em URL interna | F5 em `/checkout` restaura `/checkout` |
| B6 | Abrir em nova aba | 342 `<a href="/loja/…">` reais |
| B7 | Navegação por teclado | 40 Tabs alcançaram 40 controles, com foco visível |
| B8 | `axe-core` | **0 violações `serious` ou `critical` nas três telas** |

**Medições (§7.3), julgadas em conjunto:**

| # | Número |
|---|---|
| A1 | **60 fps mediano** (p95 59) rolando 20.570px com 343 linhas |
| A2 | Bundle web inicial **1.714.810 bytes** (1,64 MB); `dist` inteiro 1,82 MB |
| A3 | A 400 kbps / 400 ms RTT: primeira tabela em **1,4 s**, lista densa em **36,7 s** |
| A4 | `expo export --clear` **67 s** a frio, **14 s** incremental; 5,7 s no CI com cache do Turborepo |
| A5 | **8 envelopes + 3 arquivos de fundação; zero anotação por elemento** |

**O único número ruim é o A3**, e ele **não discrimina**: 36,7 s decorrem de um
bundle de 1,6 MB somado a 343 linhas sem paginação. Um app Next.js renderizando a
mesma lista pagaria o mesmo. Entra no backlog como débito de UI, não como
reprovação (regra do falso negativo).

### Decisões de forma que acompanham o veredicto

1. **`apps/app` é workspace permanente**, não código descartável. Só as telas do
   spike (`src/spike/`) são temporárias.
2. **`apps/app` declara `"type": "module"`**, coerente com o ADR-0007. Medido:
   funciona, inclusive com `metro.config.js` em CJS.
3. **`apps/app/tsconfig.json` estende `expo/tsconfig.base`, não
   `packages/config/tsconfig.base.json`.** A resolução de módulos do app é a do
   Metro (`bundler`), não `node16`, e o app precisa de `jsx`. **O
   compartilhamento que importa é de código (`packages/*`), não de tsconfig** — e
   ele está provado: o bundle web contém código de `@petdots/domain` e de
   `@petdots/contracts`.
4. **`apps/app` entra no CI** com `lint`, `typecheck` e um `build` que roda
   `expo export --platform web`. O export é o smoke que protege a resolução dos
   pacotes ESM pelo Metro — a regressão que o ADR-0007 tornou possível. Entrou
   sem editar o workflow: os passos já eram `turbo run`.
5. **O lint do app não usa a base comum** (`@petdots/config`), que é type-checked
   sobre `node16`. Usa `eslint-config-expo`, com `settings.react.version` fixado
   — sem isso o `eslint-plugin-react` embutido tenta autodetectar a versão do
   React por um caminho que o ESLint 10 removeu e o lint morre. Ver backlog.
6. **`web.output: "static"` mantido.** Não é busca de SEO (que o ADR-0004 #13
   tirou do gate): é que o HTML pré-renderizado torna a semântica do DOM
   auditável por comando.
7. **O título da página é definido por `expo-router/head` no `AppShell`**, não no
   `+html.tsx`: o `expo-router` injeta um `<title data-rh>` vazio antes de
   qualquer coisa que aquele arquivo escreva, e o vazio vence.
8. **A API ganhou `CORS_ORIGINS`**, desligado quando a variável não existe. O
   cliente universal roda em origem própria (`:8081` no `expo start`), e sem isso
   o navegador bloqueia toda chamada à API. Um default permissivo seria decisão
   de segurança tomada por omissão. O contrato OpenAPI não mudou.
9. **Nada nasceu em `packages/contracts`.** Contrato nasce com o endpoint; criar
   schemas de marketplace agora congelaria o desenho da API antes do ADR das
   pendências de modelagem, e o teste de contrato do CI passaria a policiar um
   `openapi.json` inventado. As telas do spike usam fixtures locais.

### Versões pinadas do eixo Expo/React Native

Exatas, sem `^`/`~`, conforme o [ADR-0005](0005-bootstrap-monorepo.md).
**Autoridade final: `npx expo install --check`**, que conhece a matriz de
compatibilidade do SDK — ele corrigiu `@types/react` de 19.2.2 para **19.2.4** e
aceitou todo o resto em pin exato, sem exigir range em nenhum pacote.

| Pacote | Versão |
|---|---|
| `expo` | **57.0.21** (SDK 57; a 58 está em `preview`/`canary`) |
| `react-native` | **0.86.3** |
| `react` / `react-dom` | **19.2.3** (o `latest` do React é 19.3.0; o SDK casa com a 19.2.3) |
| `react-native-web` | **0.21.2** |
| `expo-router` | **57.0.20** |
| `react-native-reanimated` / `-worklets` | **4.5.1** / **0.10.1** |
| `react-native-screens` / `-gesture-handler` / `-safe-area-context` | **4.26.0** / **2.32.0** / **5.7.0** |
| `typescript` (só em `apps/app`) | **6.0.3** — aninhada; a raiz segue em 5.9.3 |
| `@types/react` | **19.2.4** |
| `eslint-config-expo` | **57.0.2** |

## Alternativas consideradas

### (a) Fallback do ADR-0002 — Expo (mobile) + Next.js (web)

**Por que preterida:** o gate mediu que o custo que ela existia para evitar —
semântica de DOM inalcançável sem anotação perpétua — **não se materializou**.
Manter dois clientes duplicaria a camada de apresentação inteira para um time
solo, contra a premissa travada "mobile+web juntos + simplicidade".

**Custo real medido, caso tivesse sido acionada:** `apps/app` viraria mobile-only
e nasceria um `apps/web` em Next.js, com a UI do marketplace escrita duas vezes —
as telas do spike somam **1.343 linhas** de TSX para três das nove jornadas, e
elas não incluem o vocabulário de UI (mais 604 linhas em `src/spike/ui/`).
Os `packages/domain` e `packages/contracts` continuariam compartilhados de
qualquer modo; a duplicação seria exclusivamente de UI.

**Fica registrada como saída permanente**, não descartada por impossibilidade: os
`packages/` seguem isolados da camada de UI, que é a condição que preserva a
reversão.

### (b) Aprovar com base no template do Expo, sem construir telas densas

**Por que preterida:** o template exportado renderiza 43 `<div>` e três telas
vazias. Aprovar ali seria medir "compila", que já se sabia. O gate foi construído
sobre as **três jornadas de maior risco** (J2, J3, J4), com volume não
negociável — 343 ofertas, 40 pedidos —, porque fixture confortável esconde
exatamente o problema de lista densa que o veredicto precisava enfrentar.

### (c) Implementar endpoints reais em vez de fixtures

**Por que preterida:** a API expõe só `/api/v1/health`, e os endpoints do
marketplace dependem de pendências de modelagem em aberto (estorno, prazo de
aceite — `MVP_SCOPE` §"Pendências"). Transformaria um spike de 2-3 dias em
semanas sem mudar o que o gate mede, que é renderização. Um mock server (MSW)
foi igualmente descartado: adiciona dependência e configuração pelo mesmo
resultado. Uma chamada real ficou de pé — `GET /api/v1/health`, consumindo o
schema que já existe em `packages/contracts` —, e é ela que prova o eixo que as
fixtures não cobrem: o cliente alcança o Nest pela rede e consome o pacote de
contratos ponta a ponta.

### (d) Escrever este ADR apenas se o gate reprovasse

É o que a letra do `TECHNOLOGY_STACK` pediria — ADR só "se mudar a direção", e
aprovar seria mera atualização de inventário. **Preterida deliberadamente**, por
decisão do Victor no portão: confirmar o cliente universal **trava a arquitetura
de UI**, que o ADR-0002 nomeia como a decisão de menor reversibilidade do
projeto, e "por que RN-Web e não Next.js?" é dúvida recorrente garantida. São os
dois gatilhos de ADR do `DIRETRIZES_FLUXO_IA` §6.

## Consequências

**Positivas:**

- A condição aberta do ADR-0002 #12 está **fechada**, e o bloqueador que
  impedia construir qualquer UI de produto sai do backlog. As capacidades do
  `MVP_SCOPE` podem ser implementadas.
- Uma árvore de UI serve iOS, Android e Web — o que a premissa travada do
  ADR-0002 pedia para um time solo.
- O repositório ganha um vocabulário de UI **acessível por construção**: os 8
  envelopes já entregam heading, landmark, botão, campo rotulado e tabela
  semântica, e as telas de produto nascem sobre eles.
- O `expo export --platform web` no CI vira **sentinela permanente** da
  resolução dos pacotes ESM pelo Metro.

**Negativas / riscos:**

- **A reversibilidade continua sendo a menor do projeto.** O gate reduziu a
  incerteza, não o custo de voltar atrás: reverter ainda significa reescrever a
  UI. O que muda é que a decisão agora está apoiada em medição, não em aposta.
- **O bundle inicial é de 1,64 MB** e a lista densa leva 36,7 s em rede de
  400 kbps. Enquanto o comparador não paginar ou virtualizar, esse é o piso.
  Débito registrado.
- **O `apps/app` acrescentou 14 vulnerabilidades `moderate`** ao `npm audit`,
  todas da cadeia de build do Expo (`decode-uri-component` ← `query-string` ←
  `expo-router`; `uuid` ← `xcode` ← `@expo/config-plugins`). Nenhuma é código de
  runtime do cliente. Registradas na vigilância do backlog, com gatilho.
- **O tooling de lint do Expo está atrasado em relação ao ESLint 10** do
  repositório, contornado por uma linha de configuração. O contorno é frágil a
  upgrades do `eslint-config-expo`.
- **Duas linhas de TypeScript convivem** no monorepo: 5.9.3 na raiz e 6.0.3
  aninhada em `apps/app`. Medido e funcional, mas é uma divergência a vigiar.

**Neutras:**

- `apps/landing` em Next.js (ADR-0004 #13) **segue de pé**, inalterada por este
  ADR. A aprovação do cliente universal não a dispensa: a necessidade dela é SEO,
  que sempre esteve fora deste gate.

## Status

`accepted` — 11/09/2026.

> **Este ADR não substitui o [ADR-0002](0002-stack-tecnologica-fundacao.md)**, que
> permanece `Accepted` e sem edição. Não há decisão revogada: o ADR-0002 #12
> decidiu "cliente universal **condicionado a spike**", e este ADR **cumpre a
> condição**. É a mesma decisão, agora sem condicional.
