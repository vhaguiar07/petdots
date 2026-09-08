---
title: "ADR-0005: Bootstrap do monorepo — gerenciador, orquestrador e versões pinadas"
status: stable
version: 1.0
updated: 2026-09-07
scope: >
  Decisões do bootstrap do workspace PetDots: gerenciador de pacotes (npm
  workspaces), orquestrador (Turborepo), runtime (Node 24), o conjunto de
  versões pinadas do núcleo (NestJS 11, Prisma 6, TypeScript 5.9, Zod 4,
  ESLint 9), o formato de módulo (CommonJS), a biblioteca Zod→OpenAPI, o
  ambiente Postgres local e o destino do protótipo legado. Materializa a
  estrutura de monorepo do SYSTEM_ARCHITECTURE v2.0 sem decidir domínio nem
  módulos de produto.
relates_to:
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 03-engineering/DEVELOPMENT_GUIDE.md
type: decision
---

# ADR-0005: Bootstrap do monorepo — gerenciador, orquestrador e versões pinadas

## Contexto

O [ADR-0002](./0002-stack-tecnologica-fundacao.md) fixou a stack de fundação
(TypeScript, monorepo, NestJS, PostgreSQL, Prisma, Zod, REST+OpenAPI) mas
delegou explicitamente ao bootstrap três coisas: o **gerenciador de pacotes**,
as **versões exatas no lockfile** e a **biblioteca concreta de Zod→OpenAPI**. O
[`TECHNOLOGY_STACK`](../../02-architecture/TECHNOLOGY_STACK.md) v1.1 registrava
esses pontos como critério em aberto, e o `BACKLOG` classificava "monorepo não
bootstrapado" como o **bloqueador** do qual todo item de implementação dependia:
a linha AI-first rastreava 54 arquivos, todos de documentação — sem
`package.json`, sem `src/`.

Forças em jogo na escolha das versões, medidas com `npm view` em 06–07/09/2026:

- O ecossistema tinha acabado de virar de major em vários eixos ao mesmo tempo
  (NestJS 12, Prisma 7/8-rc, TypeScript 6/7, ESLint 10, npm 12), **sem que as
  bibliotecas de integração tivessem acompanhado**.
- O `TECHNOLOGY_STACK` já pinava como "majors validadas" **NestJS 11** e
  **Prisma 6** — validadas no marketplace legado, que serve como referência de
  capacidade e **nunca como fonte de código** (compromisso anti-contaminação do
  ADR-0002/ADR-0001).
- A máquina de desenvolvimento tinha as portas 5432–5436 ocupadas por outros
  projetos, e um compose do protótipo legado (`petdots`) rodando com quatro
  containers que **não podiam ser derrubados**.

## Decisão

### Gerenciador, orquestrador e runtime

1. **npm 11 workspaces** como gerenciador. O lockfile e os workspaces são do
   npm; não há `.npmrc` de linker exótico.
2. **Turborepo 2.10** como orquestrador de tarefas, com `dependsOn: ["^build"]`.
   Não é opcional na prática: `npm -ws` executa os workspaces em ordem
   alfabética, o que colocaria `apps/` antes de `packages/` e quebraria o build.
3. **Node 24 (LTS Krypton)**, fixado em `.nvmrc` e em `engines.node: ">=24"`.

### Versões pinadas do núcleo

Todas exatas (sem `^`), no lockfile e nos `package.json`:

| Eixo | Versão | Razão de não ir para a major seguinte |
|---|---|---|
| NestJS | **11.2.3** | `nestjs-zod@5.5.0` aceita `@nestjs/common ^10 \|\| ^11`; o Nest 12 saíra dias antes e o ecossistema de integração não o acompanhava |
| Prisma | **6.19.3** | Prisma 7 é **ESM-only** e exige driver adapter + `prisma.config.ts`; Nest 11 com `emitDecoratorMetadata` e ts-jest é um mundo CommonJS. Misturar os dois era o maior risco de integração do bootstrap |
| TypeScript | **5.9.3** | `typescript-eslint@8.69` aceita `<6.1` e `ts-jest@29.4` aceita `<7`; o TS 7 (compilador nativo) não emite metadata de decorator como o Nest precisa |
| Zod | **4.5.4** | Base do `z.toJSONSchema()` usado pela geração de OpenAPI |
| ESLint | **9.39.5** (flat config) | O ESLint 10 saíra; `typescript-eslint` aceita os dois, mas a cadeia de config-prettier ainda não estava confirmada em 10 |
| Jest | **30.5.1** + ts-jest 29.4.12 | ts-jest 29.4 declara peer `^29 \|\| ^30` |
| `@nestjs/config` | **4.0.4** | A linha do pacote é independente da do Nest: **não existe `@nestjs/config@11`**. A 4.0.4 é a última que declara peer `@nestjs/common ^10 \|\| ^11`; a 12.0.0 já mira o Nest 12 |

4. **CommonJS em tudo** — nenhum `"type": "module"`. É consequência direta de
   Prisma 6 + Nest 11 + ts-jest. Os `tsconfig` usam `module`/`moduleResolution`
   **`node16`**, que resolve `exports` de pacotes modernos corretamente **e
   emite CJS** quando o `package.json` não declara `type: module` — a
   combinação `module: commonjs` + `moduleResolution: node16` é inválida no
   TypeScript.
5. **Pacotes compilam para `dist/`** (`tsc`) e são consumidos por `main`/`types`
   simples, **sem `exports` condicional**. O Nest compila com o `rootDir` do
   próprio app; importar `.ts` de fora dele quebra.

### Contrato, dados e ambiente

6. **`nestjs-zod@5.5.0` + `@nestjs/swagger@11.4.7`** como a biblioteca
   Zod→OpenAPI que o ADR-0002 delegou ao `TECHNOLOGY_STACK`. O OpenAPI é gerado
   da tabela de rotas e **publicado** em `packages/contracts/openapi.json`, com
   teste de contrato como gate de CI.
7. **`prisma/` na raiz** com schema clássico (`url = env("DATABASE_URL")`) e
   **zero models**: sem `DOMAIN_MODEL` implementado não há model a criar, e o
   teste de integração usa `SELECT 1`.
8. **Docker Compose próprio**: project name **`petdots-mvp`**, só
   `postgres:16-alpine`, na porta **5437**. O nome distinto do legado
   (`petdots`) impede que um `compose up` derrube os containers do protótipo.
9. **`.gitattributes` com `* text=auto eol=lf`**, para que o lockfile e o
   código não acumulem diff de fim de linha num time que trabalha no Windows.
10. **Aprovação explícita de install scripts** (npm 11 os bloqueia por padrão):
    aprovados e **pinados por versão** apenas `prisma`, `@prisma/engines` e
    `@prisma/client`, que baixam e posicionam os engines. Os demais pacotes com
    script de instalação (`@parcel/watcher`, `unrs-resolver`, `protobufjs`,
    `ssh2` e `@scarf/scarf`) foram **explicitamente negados** com
    `npm deny-scripts`: são otimizações nativas com fallback em JS — e o
    `@scarf/scarf` é telemetria de instalação, sem função para o projeto.

### Escopo do scaffold e destino do legado

11. **Bootstrap mínimo:** raiz, `packages/{config,domain,contracts}` e
    `apps/api`. **Sem** OpenTelemetry, `apps/app`, `apps/landing` ou
    `packages/ui` — OTel e a landing são tarefas próprias, `apps/app` nasce no
    spike-gate (`pd-02`) e `packages/ui` depende do resultado dele.
12. **O protótipo legado foi arquivado, não portado.** A tag anotada
    `legacy-marketplace` aponta para `8a9625b`; `master` foi fast-forwarded
    para a linha AI-first e as branches `develop` e `feat/ai-first` foram
    apagadas. O código do marketplace legado **não é reaproveitado**: o
    compromisso anti-contaminação do ADR-0002 continua valendo, e a única via
    para revertê-lo seria um ADR que o substitua — não uma decisão de
    implementação.

## Alternativas consideradas

### (a) pnpm em vez de npm workspaces

**Por que preterida:** não estava instalado na máquina, e o React Native (que
chega no `pd-02`) exige `node-linker=hoisted`, o que anula justamente a
estritez de resolução que é a principal vantagem do pnpm. Restaria a economia
de disco, insuficiente para justificar uma ferramenta a mais.

**Trade-off registrado:** aceita-se o hoisting do npm — e com ele a
possibilidade de importar uma dependência não declarada sem erro — em troca de
uma ferramenta a menos e do caminho já trilhado pelo React Native.

### (b) Prisma 7 (ou 8-rc) desde o início

**Por que preterida:** é ESM-only. Adotá-lo obrigaria a migrar Nest, ts-jest e
todos os pacotes para ESM no mesmo movimento em que se cria o repositório —
concentrando no bootstrap o risco de integração mais alto disponível, para
ganhar nada que o MVP precise hoje.

**Trade-off registrado:** fica-se numa linha de Prisma que **não recebe a
correção** da vulnerabilidade `deepmerge-ts` (ver Consequências). O upgrade é
item de backlog **com gatilho nomeado**: quando o Nest migrar para ESM.

### (c) NestJS 12

**Por que preterida:** `nestjs-zod@5.5.0` — a biblioteca que materializa o
contrato Zod→OpenAPI, que é decisão do ADR-0002 — declara peer
`@nestjs/common ^10 || ^11`. Subir para o Nest 12 significaria abrir mão da
geração de OpenAPI a partir do Zod ou usá-la com peer violado.

**Trade-off registrado:** o repositório nasce uma major atrás do Nest. Gatilho
para revisar: `nestjs-zod` declarar suporte a `^12`.

### (d) Sem Turborepo, só scripts `npm -ws`

**Por que preterida:** `npm run build -ws` executa os workspaces em ordem
alfabética — `apps/api` antes de `packages/contracts` —, e a API não compila
sem os pacotes construídos. Contornar isso exigiria uma sequência de scripts
escrita à mão, que é um orquestrador pior mantido por nós mesmos.

**Trade-off registrado:** uma dependência de build a mais, em troca de um grafo
de dependências declarado e de cache local.

### (e) Manter a linha de trabalho em `feat/ai-first`

**Por que preterida:** mantinha três branches vivas (`master` e `develop` com o
protótipo descontinuado, `feat/ai-first` com a documentação), com a branch
default do GitHub apontando para código que o ADR-0001 já descontinuara.

**Trade-off registrado:** o histórico do protótipo deixa de ser alcançável por
branch e passa a sê-lo **só pela tag** `legacy-marketplace` — deliberado, e o
motivo de a tag ser anotada.

### (f) Reaproveitar o código do protótipo legado

**Por que preterida:** contraria o compromisso **anti-contaminação** do
ADR-0002/ADR-0001, que é explícito: schema, enums e interceptors são
re-derivados do `DOMAIN_MODEL`, e o legado vale como referência de capacidade,
não como fonte. A tentação é real — o ADR-0004 devolveu o MVP ao formato
marketplace, aproximando-o do que o protótipo fazia — e por isso fica
registrada aqui: **reabrir isso exige um ADR que substitua o 0002**, não uma
decisão de implementação.

## Consequências

**Positivas:**

- O bloqueador do backlog cai: existe onde escrever a primeira linha de módulo,
  e o `pd-02` (spike-gate) tem onde nascer.
- Todo o núcleo é CommonJS, uma única forma de módulo — a classe de erro mais
  cara em monorepo TypeScript some do bootstrap.
- O contrato de fronteira nasce testado: o OpenAPI é gerado do Zod, publicado no
  repositório e um teste de CI falha se o código divergir dele.
- O ambiente local não colide com nada: o compose próprio na 5437 convive com o
  protótipo e com os outros projetos da máquina.
- A superfície de install scripts é mínima e explícita, incluindo a recusa
  deliberada de telemetria de instalação.

**Negativas / riscos:**

- **O repositório nasce uma major atrás em quase tudo** (Nest 11, Prisma 6, TS
  5.9, ESLint 9). Cada upgrade vira item de backlog com gatilho próprio; a
  dívida é conhecida e datada, não acidental. O `npm ci` já avisa que o ESLint
  9.39.5 saiu de suporte.
- **Vulnerabilidade `high` sem correção disponível na linha escolhida:**
  `deepmerge-ts <8.0.0` (stack exhaustion, GHSA-ggr8-5vv4-36mx) entra via
  `@prisma/config` → `prisma`. Atinge a **CLI** do Prisma (tempo de build), não
  o runtime da API, e o `npm audit fix` só a "resolve" fazendo downgrade do
  Prisma. Fica no backlog, ligada ao mesmo gatilho do upgrade para Prisma 7.
- **O hoisting do npm permite importar dependência não declarada** sem que nada
  reclame — risco real num monorepo com pacotes compartilhados. Mitigação hoje:
  os `package.json` declaram tudo que usam; não há verificação automática.
- **`@nestjs/swagger` declara peer `class-validator: "*"`**, e o npm o instala.
  **Não é usado e não deve ser:** a validação de borda é Zod, fonte única
  (ADR-0002 / API_GUIDELINES). Registrado aqui para que ninguém "conserte" o
  projeto adotando-o — nem o remova achando que é lixo.
- **A documentação fica fora do Prettier** (`**/*.md` no `.prettierignore`): ela
  usa quebra manual e tabelas alinhadas à mão, e o reflow automático destruiria
  essa formatação sem ganho. O custo é que a consistência dos `.md` continua
  sendo responsabilidade de quem escreve.

## Status

`Accepted` — 2026-09-07

**Parcialmente superseded pelo [ADR-0007](0007-esm-nest-12-e-prisma-7.md)**
(08/09/2026), que migrou o repositório para ESM e subiu NestJS 12 e Prisma 7.
O que o 0007 substitui: os **pins** de NestJS 11, Prisma 6 e CommonJS, e as
alternativas **(b)** e **(c)** acima — cujas premissas foram medidas e não se
confirmaram (o `deepmerge-ts@8` não é ESM-only, e o Prisma 7 **não** carrega a
correção da vulnerabilidade). O restante deste ADR — npm workspaces +
Turborepo, Node 24, arquivamento do legado — continua valendo.
