---
title: "Relatório — pd-01/chore/bootstrap-monorepo"
status: stable
version: 1.0
updated: 2026-09-07
scope: >
  Relatório de encerramento da tarefa pd-01: bootstrap do monorepo PetDots —
  raiz com npm workspaces e Turborepo, pacotes config/domain/contracts, API
  NestJS com health check contra Postgres, OpenAPI publicado e primeiro CI do
  repositório. Registra o que foi feito, as decisões e quem as tomou, as
  validações com números reais e as pendências geradas.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 07-process/BACKLOG.md
  - 06-decisions/ADR/0005-bootstrap-monorepo.md
type: process
---

# pd-01/chore/bootstrap-monorepo

**Encerrada em:** 07/09/2026
**Merge:** `7dab2e1` em `master` (fast-forward)
**ADR:** [0005 — Bootstrap do monorepo](../../../06-decisions/ADR/0005-bootstrap-monorepo.md)

---

## Objetivo

Item escolhido pelo Victor no backlog, que o classificava como **o** bloqueador:

> 🔴 Monorepo não bootstrapado — A `feat/ai-first` rastreia 54 arquivos, todos
> de documentação. Sem `package.json`, sem `src/`. Todo item de implementação
> depende deste.

Pedido dele, nas palavras dele (06/09/2026): *"Pode criar uma tarefa para essa
pendência, análise em Fable"*.

A tarefa rodou em dois chats, conforme a diretriz de handoff: **Fase 1 (análise)
em Fable, 06/09**; **Fase 2 (implementação) em Opus, 07/09**, a partir do plano
`PLANS/plan-a.md` — descartado no encerramento, como manda o processo.

O objetivo era deixar a próxima tarefa (`pd-02`, spike-gate) com onde nascer:
workspace, pacotes compartilhados, uma API que sobe e responde contra Postgres
real, contrato publicado e CI verde. **Nenhum módulo de domínio** — só a fiação.

## O que foi feito

Commits principais: `1300f98` (código), `e7bc3b5` (documentação), `7dab2e1` (CI).

- **Raiz** — `package.json` com npm workspaces (`packages/*` antes de `apps/*`),
  `turbo.json`, `.nvmrc` (24), `.gitattributes` (`eol=lf`), `.env.example`,
  `docker-compose.yml` (project `petdots-mvp`, `postgres:16-alpine` na **5437**)
  e `prisma/schema.prisma` sem models.
- **`packages/config`** — `tsconfig.base.json` (strict, CJS via `node16`),
  `eslint.base.mjs` (flat config, type-checked) e `prettier.config.mjs`,
  consumidos por caminho pelos demais workspaces.
- **`packages/domain`** — `applyBasisPoints(amountCents, bps)`, TS puro, zero
  dependências de runtime. Arredondamento **half-up away from zero**, escolhido
  e documentado explicitamente: um marketplace divide cada pedido entre duas
  partes, e truncar ou usar arredondamento bancário enviesaria sempre o mesmo
  lado (ADR-0004 #11).
- **`packages/contracts`** — `healthResponseSchema` em Zod 4 e o snapshot
  `openapi.json` publicado. O `status` é `enum(['ok','degraded'])`, não
  `literal('ok')`: o `503` carrega o mesmo corpo, então um cliente lê sucesso e
  falha com **um** schema.
- **`apps/api`** — NestJS 11 gerado com o CLI pinado e re-fiado: validação Zod
  do ambiente no boot, `LoggerModule` (pino) com `timestamp`/`requestId`/
  `correlationId` e redact de `authorization`/`cookie`, `PrismaService` global,
  `HttpExceptionFilter` traduzindo **toda** exceção para o `ERROR_MODEL`, e
  `GET /api/v1/health` com `SELECT 1`.
- **`.github/workflows/ci.yml`** — primeiro CI do repositório: `npm ci` →
  `prisma:generate` → lint → typecheck → build → test → contract → smoke de boot.
- **Docs** — ADR-0005 novo; `DEVELOPMENT_GUIDE` → v2.0 (descrevia a forma
  *prevista*, com `<gerenciador>` literal e a árvore do produto "Vida do Pet");
  `PROJECT_STATE` → v4.0 (listava as camadas 03/04 como "planejadas" quando já
  existiam, e desconhecia os ADRs 0003/0004/0005 e a camada `07-process`);
  `TECHNOLOGY_STACK` v1.2 e `README` v1.3 com as versões e comandos reais;
  `BACKLOG`, `BUGS`, `IDEIAS` e `docs/README.md` acertados.

### Duas decisões de implementação que valem registro

**O `$connect` do Prisma não derruba o boot.** Se a conexão falhasse no
`onModuleInit`, a API não subiria sem banco — e um health check que só responde
quando tudo está bem não serve para nada. O processo sobe, loga o erro e o
health reporta `degraded`/`down` com `503`. É isso que a `OBSERVABILITY` pede
(health = processo **+** conexão, reportados separadamente) e o que permitiu o
smoke de CI sem `services: postgres`.

**O documento OpenAPI não declara `servers`.** Como ele é construído depois do
`setGlobalPrefix`, os paths já saem como `/api/v1/health`; um
`addServer('/api/v1')` duplicaria o prefixo para qualquer cliente gerado a
partir do contrato.

## Migrations

**Nenhuma.** O `schema.prisma` nasce sem models: eles derivam do `DOMAIN_MODEL`
e nascem com o primeiro agregado implementado. `prisma migrate dev` não foi
executado — não havia o que migrar.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| npm 11 workspaces como gerenciador (pnpm descartado: não instalado, e RN exige `node-linker=hoisted`) | **Usuário** (portão, 06/09) |
| Escopo mínimo do scaffold — sem `apps/app`, `apps/landing`, `packages/ui`, OTel | **Usuário** (portão, 06/09) |
| Arquivar o legado na tag `legacy-marketplace`, ff `master`, apagar `develop` e `feat/ai-first` | **Usuário** (portão, 06/09) |
| Fase 2 em Opus, IA sozinha | **Usuário** (portão, 06/09) |
| Node 24; Nest 11.2.3; Prisma 6.19.3; TS 5.9.3; Zod 4.5.4; Jest 30; ESLint 9 — todas pinadas, cada major adiada com gatilho | IA (Fase 1, medido com `npm view`) |
| Turborepo como orquestrador (não opcional: `npm -ws` roda em ordem alfabética e quebraria o build) | IA (Fase 1) |
| CommonJS em tudo, via `module`/`moduleResolution: node16` | IA (Fase 2 — o plano pedia `commonjs` + `node16`, combinação **inválida** no TypeScript; `node16` puro emite CJS e resolve `exports` corretamente) |
| `@nestjs/config@4.0.4` | IA (Fase 2 — o plano pedia `@nestjs/config@11`, que **não existe**: a numeração do pacote é independente da do Nest. A 4.0.4 é a última com peer `^10 \|\| ^11`) |
| Aprovar install scripts só do Prisma e **negar** os outros 5 com `npm deny-scripts` | IA (Fase 2 — apareceram 8 pacotes, não os 3 previstos; `@scarf/scarf` é telemetria de instalação, sem função para o projeto) |
| Smoke de CI sem `services: postgres`, aceitando `503` como boot OK | IA (Fase 2 — o plano deixou a escolha em aberto, pedindo o mais simples; o e2e já cobre o caminho com banco real) |
| `**/*.md` fora do Prettier | IA (Fase 2 — o formatter reformataria 59 documentos escritos com quebra manual, criando ruído sem ganho; registrado no ADR-0005) |
| Actions do GitHub em v5 | IA (Fase 2 — o primeiro run avisou que as v4 rodam em Node 20, deprecado) |

## Validações

Todas com `node_modules` recém-instalado (`npm ci`), e repetidas no CI.

| O quê | Resultado |
|---|---|
| `npm ci` | 835 pacotes, **sem nenhum aviso `allow-scripts`** |
| Lint | **5/5 workspaces**, exit 0 |
| Checagem de tipos | **5/5 workspaces**, exit 0 |
| Build | **3/3**, ordem confirmada com `--force`: `contracts` e `domain` antes de `api` |
| Testes | **2 suítes, 10 testes** — `domain` 8, `api` e2e 2 (Postgres efêmero via Testcontainers) |
| Teste de contrato | **1 suíte, 1 teste** |
| Formatação | `prettier --check` limpo |
| Smoke de boot (local) | "Nest application successfully started"; `GET /api/v1/health` → `200 {"status":"ok","database":"up","timestamp":"2026-09-07T04:21:37.616Z"}` |
| Body inválido (local) | `422` com `{"error":{"code":"VALIDATION_FAILED","message":"Falha de validação.","details":[{"field":"email",…},{"field":"age",…}],"requestId":"4b341bdb-…"}}` |
| `GET /api/docs` | `200` |
| **CI (run `34085060254`)** | **verde no primeiro run**, 1m08s — 11 passos |
| **CI (run `34085312379`, actions v5)** | **verde**, 53s, sem annotations |
| Smoke de boot no CI | boot OK, health respondeu `503` (sem banco, como esperado) |
| Frontmatter | **11/11** documentos tocados OK |

### Prova de vermelho

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| 1 | Campo `uptimeSeconds` adicionado ao `healthResponseSchema` sem regenerar o snapshot | `contract.spec.ts` — **1 falhou**, exit 1, apontando `+ "uptimeSeconds"` no diff |
| 2 | `POST` com `{"email":"nao-e-email","age":-3}` na rota-sonda temporária | `HttpExceptionFilter` respondeu `422` no formato do `ERROR_MODEL` (rota removida em seguida, conforme o passo 24 do plano) |

### Um defeito que os testes escondiam

O e2e passava, mas por acidente, e o achado veio de um teste que **falhou depois
de uma correção não relacionada**: `ConfigModule.forRoot()` é avaliado quando o
módulo é **importado**, não quando o teste roda. Com o `import` estático no topo
do spec, a validação de ambiente acontecia antes do `beforeAll` — então lia o
`.env` do disco, enquanto o `PrismaClient` lia `process.env` com a URL do
container efêmero. **Dois ambientes diferentes na mesma execução**, e um teste
que dependia do `.env` do desenvolvedor para passar.

Corrigido carregando o `AppModule` sob demanda (`require` tipado, dentro do
`beforeAll`) e ignorando o arquivo `.env` quando `NODE_ENV=test`. A prova de que
funcionou é lateral: `LOG_LEVEL=silent` passou a ser respeitado, e a saída dos
testes ficou limpa. Sem essa correção, todo teste futuro herdaria em silêncio o
banco de desenvolvimento.

## Pendências geradas

Todas registradas no [`BACKLOG.md`](../../BACKLOG.md), seção "Débito técnico":

- **Vulnerabilidade `high` sem correção na linha do Prisma 6** — `deepmerge-ts <8.0.0`
  (GHSA-ggr8-5vv4-36mx) via `@prisma/config`. Atinge a **CLI** (tempo de build),
  não o runtime da API. Sai junto com o Prisma 7.
- **Upgrade Prisma 7** — gatilho: Nest migrar para ESM.
- **Upgrade NestJS 12** — gatilho: `nestjs-zod` aceitar `^12`.
- **Upgrade ESLint 10** — o `npm ci` já avisa que a 9.39.5 saiu de suporte.
- **OpenTelemetry ainda não instrumentado** — ficou fora do escopo por decisão do
  portão; idealmente entra **antes** do primeiro módulo de domínio, porque
  retroinstrumentar custa mais.
- **Hoisting do npm permite importar dependência não declarada** — sem verificação
  automática hoje.
- **Camadas 03/04 ainda descrevem o produto "Vida do Pet"** — as regras valem e
  foram aplicadas, mas os exemplos (`pet_tutors`, Timeline, S3) são do produto
  anterior. Achado ao implementar contra esses documentos.

Movidos ou reescritos:

- **Credencial Google OAuth** — o `.env` do legado foi **movido** para
  `%USERPROFILE%\petdots-legacy-env\api\.env`, fora do repositório, antes de
  qualquer remoção. Continua sendo o único exemplar; a pendência de verificar se
  a credencial ainda é válida **permanece aberta**.
- **`BUG-001`** (busca some no mobile) — escopo corrigido: o legado foi
  arquivado, não há mais código vivo com o defeito. O registro fica como lição
  de UX para o comparador de preços.
- **"Reaproveitar o protótipo legado"** — **removido** do `IDEIAS.md`: contraria
  o compromisso anti-contaminação do ADR-0002. O ADR-0005 registra que reabrir
  isso exigiria um ADR que substitua o 0002.
- **"Ambiente local em um comando"** — **removido**: `npm run db:up` +
  `prisma:generate` resolvem o que a ideia pedia.

Saíram do backlog por terem sido entregues: "monorepo não bootstrapado",
"definir o gerenciador de pacotes", "não existe `.env.example`", "artefatos de
build órfãos" e "destino do protótipo legado".

## As três avaliações da Fase 1

| Eixo | Decisão |
|---|---|
| **Auditoria** | **Não se aplica.** O scaffold não cria nenhuma ação de usuário rastreável — não há autenticação, papéis nem mutação de dado de domínio. O `Audit interceptor` do `SYSTEM_ARCHITECTURE` nasce com o primeiro módulo que registre quem mudou o quê. |
| **Documentação de domínio** | Nenhum documento de domínio foi contrariado (não há domínio implementado). Os documentos de **engenharia** que descreviam o repositório como não-bootstrapado foram corrigidos na mesma entrega: `DEVELOPMENT_GUIDE`, `TECHNOLOGY_STACK`, `README`, `PROJECT_STATE`, `docs/README.md`. |
| **Testes** | Unidade em `packages/domain`; integração `health` → Postgres efêmero (Testcontainers), incluindo o caminho de falha; contrato OpenAPI com prova de vermelho. Os três são gate de CI. |

## Estado ao encerrar

`master` = `7dab2e1`, CI verde, branch removida (local e remota), checkout de
volta em `master`, árvore limpa. Próxima tarefa: **`pd-02` — spike-gate do
cliente universal**.

> **Nota de processo:** o [`GIT_WORKFLOW`](../../../03-engineering/GIT_WORKFLOW.md)
> pede integração via Pull Request. O PR **não pôde ser aberto** nesta tarefa: o
> `gh` autenticava por um **fine-grained PAT** exposto na variável de ambiente
> `GH_TOKEN`, e esse formato de token não alcança repositório pessoal de outra
> conta — daí o `Resource not accessible by personal access token
> (createPullRequest)`. O merge foi fast-forward local com o CI já verde na
> branch: o gate de qualidade foi respeitado, o ritual de PR não.
>
> **Resolvido em 08/09/2026**, fora da tarefa: a variável `GH_TOKEN` foi removida
> do ambiente do Windows e as contas passaram a autenticar pelo `gh auth login`,
> que emite token OAuth com escopo `repo`. Verificado criando e fechando um PR de
> teste. A `pd-02` já pode encerrar pelo fluxo normal.
