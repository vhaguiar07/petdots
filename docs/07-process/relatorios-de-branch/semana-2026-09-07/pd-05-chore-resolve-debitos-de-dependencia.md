---
title: "Relatório — pd-05/chore/resolve-debitos-de-dependencia"
status: stable
version: 1.0
updated: 2026-09-08
scope: >
  Encerramento da pd-05: migração do monorepo para ESM, upgrade de NestJS 11→12
  e Prisma 6→7, e fechamento das vulnerabilidades por overrides. Registra as
  três premissas do backlog e do ADR-0005 que a medição refutou, o que de fato
  saiu do backlog e os riscos assumidos com seus guardas.
relates_to:
  - 07-process/BACKLOG.md
  - 06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md
  - 06-decisions/ADR/0005-bootstrap-monorepo.md
  - 02-architecture/TECHNOLOGY_STACK.md
type: process
---

# pd-05/chore/resolve-debitos-de-dependencia

**Encerrada em:** 08/09/2026
**Merge:** `0b539e3` em `master` (PR [#4](https://github.com/vhaguiar07/petdots/pull/4), squash)
**ADR:** [0007 — Migração para ESM, NestJS 12 e Prisma 7](../../../06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md)

---

## Objetivo

O Victor perguntou quais débitos técnicos não tinham branch nem plano, recebeu a
triagem e escolheu três — a vulnerabilidade `deepmerge-ts`, o upgrade do Prisma
7 e o upgrade do NestJS 12 —, todos registrados como travados por gatilho:

> "Dá pra criar uma branch só para os 3?"

A análise propôs deixar o Prisma de fora, por depender de uma migração
CommonJS → ESM. O Victor recusou o recorte, duas vezes:

> "'o upgrade do Prisma depende de uma migração CommonJS → ESM' - então por que
> não faz?"

> "Você não está me acompanhando. Eu pedi explicitamente para essa branch
> resolver por completo as 3 pendências, não dá pra ser mais claro que isso.
> Resolva as 3 pendências, não importa os empecilhos"

O critério de sucesso era **backlog mais curto**, não o upgrade em si.

## Diagnóstico

Antes de planejar, o estado real foi medido contra o registry
(`DIRETRIZES_FLUXO_IA` §3, "medir antes de dimensionar"). **Três premissas não
se confirmaram** — e é isso que explica por que a entrega ficou diferente do que
o backlog previa.

| # | O que o backlog / ADR-0005 afirmava | Como se sabe |
|---|---|---|
| 1 | A vulnerabilidade `deepmerge-ts` "sai junto com o Prisma 7" | `npm view @prisma/config@7.10.0 dependencies` → `deepmerge-ts: "7.1.5"` — **o mesmo pin vulnerável do Prisma 6**. O upgrade não fecha nada |
| 2 | O `deepmerge-ts@8` é ESM-only, o que tornaria o override arriscado | O `package.json` da 8.0.2 tem `exports.require → ./dist/index.cjs`: é **dual package**. E `npm pack @prisma/config` mostrou que o consumo é `await import("deepmerge-ts")`, com um único símbolo (`deepmerge`) usado como `merger` do c12 |
| 3 | O gatilho do Prisma 7 é "quando o Nest migrar para ESM" | Confirmado, e mais forte: `@nestjs/common@12` e `@nestjs/core@12` declaram `"type": "module"`. **O NestJS 12 é ESM-only** — subir o Nest *é* a migração. O `tsc` acusou 19 erros TS1479/TS1541 ao instalar a 12 sobre o repositório CommonJS |

Consequência: os três itens **não eram uma cadeia de bloqueios**, como o backlog
descrevia. Eram um problema independente (a vulnerabilidade, que só `overrides`
resolve) e dois que colapsavam num único movimento (a migração ESM).

Dois bloqueios adicionais apareceram só ao executar:

| # | O que estava errado | Como se sabe |
|---|---|---|
| 4 | O npm instalava **duas cópias do Nest** | `node -e` resolvendo `@nestjs/common` a partir de `node_modules/nestjs-zod` devolveu **11.2.3**, enquanto `apps/api/node_modules` tinha **12.0.1**. `nestjs-zod` decoraria classes de uma cópia e o app fiaria as da outra — DI quebrada sem erro |
| 5 | O tooling do Nest 12 exige TypeScript ≥ 6 | `npm install` falhou com `peer typescript@">=6.0.0" from @nestjs/schematics@12.0.0`; o repositório está em 5.9.3 e a `latest` do TypeScript é **7.0.2** (a 6 saiu só em beta) |

## O que foi feito

**Frente 1 — vulnerabilidade (independente das outras, por causa do achado #1)**

- **`package.json` (raiz)** — `overrides` de `deepmerge-ts` para 8.0.2. Fechou os
  3 `high`. Verificado no caminho real: `loadConfigFromFile()` — a função que
  contém o `await import("deepmerge-ts")` — roda limpa, e `prisma generate`
  também.
- Mais tarde, um `overrides` de `mysql2` para 3.24.4: o Prisma 7 embute
  `mysql2@3.15.3` (vulnerável) e este projeto é PostgreSQL.

**Frente 2 — migração ESM (24 arquivos)**

- **`"type": "module"`** em `apps/api` e nos três pacotes. O `tsconfig.base.json`
  **não mudou**: já usava `module`/`moduleResolution: node16`.
- **30 specifiers relativos** ganharam extensão `.js`.
- **`apps/api/src/config/paths.ts`** — `__dirname` → `import.meta.url`.
- **`test/contract.spec.ts`, `test/health.e2e-spec.ts`** — o `require()` que
  adiava o `AppModule` virou `await import()`, preservando a intenção original.
- **Jest em modo ESM** nas quatro configs, com `--experimental-vm-modules` via
  **`scripts/jest.mjs`** — wrapper em vez de env var inline, seguindo a
  convenção que `write-openapi.js` já estabelecia para funcionar igual no
  Windows e no runner.
- **`turbo.json`** — `test` passou a depender do próprio `build`, porque o novo
  sentinela roda contra o `dist/`.

**Frente 3 — NestJS 12**

- Runtime para **12.0.1**; **tooling mantido na linha 11** (achado #5).
- `overrides` forçando os **dois** peers que o `nestjs-zod` declara — o de
  `@nestjs/swagger` é o que passa despercebido, porque o backlog só registrava o
  de `@nestjs/common`.
- Pacotes de runtime do Nest **também pinados na raiz**: sem isso o npm hoista
  `nestjs-zod` para a raiz e aninha `@nestjs/swagger` e
  `@nestjs/platform-express` em `apps/api`, onde não se enxergam (achado #4).

**Frente 4 — Prisma 7.10.0**

- **`prisma/schema.prisma`** — a `url` saiu do `datasource` (o Prisma 7 recusa).
- **`prisma.config.ts`** (novo, na raiz) — carrega o `.env` (o Prisma 7 não lê
  mais sozinho) e declara o datasource **só quando `DATABASE_URL` existe**.
- **`apps/api/src/prisma/prisma.service.ts`** — driver adapter
  (`@prisma/adapter-pg`), com a URL vinda do `ConfigService` validado, não de
  `process.env` cru.
- Deliberadamente **não** a `latest`: em 08/09/2026 ela aponta para
  `8.0.0-rc.13`, uma RC.

**Frente 5 — instrumentação OTel sob ESM**

- **`apps/api/src/instrumentation.ts`** — registra o hook
  (`import-in-the-middle`) e passa a carregar tudo por `await import()`, para
  que os pacotes OTel fiquem do lado certo do `register()`.
- **`apps/api/src/main.ts`** — deixou de importar a instrumentação: sob ESM o
  grafo inteiro é carregado antes de qualquer avaliação, então um import de
  dentro do `main.ts` chega tarde.
- Pontos de entrada passaram a usar `node --import ./dist/instrumentation.js`:
  `start:prod`, o novo **`apps/api/scripts/dev.mjs`** e o smoke de boot do
  **`.github/workflows/ci.yml`**.

**Docs (mesma entrega)**

- **[ADR-0007](../../../06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md)** — novo.
  **[ADR-0005](../../../06-decisions/ADR/0005-bootstrap-monorepo.md)** ganhou nota
  de *parcialmente superseded* (só o Status muda; ADR aceito não se edita).
- **[`TECHNOLOGY_STACK`](../../../02-architecture/TECHNOLOGY_STACK.md)** — versões
  e seção nova da `pd-05`.
- **[`CODING_STANDARDS`](../../../03-engineering/CODING_STANDARDS.md)** — seção
  "ESM: import relativo termina em `.js`". **É a correção mais importante do
  lote:** sem ela, o próximo agente escreve `from './x'` e quebra o build.
- **[`PROJECT_STATE`](../../../../PROJECT_STATE.md)** (v4.2),
  **[`DEVELOPMENT_GUIDE`](../../../03-engineering/DEVELOPMENT_GUIDE.md)**,
  **[`ADR/README`](../../../06-decisions/ADR/README.md)** (que também estava sem
  o ADR-0006, esquecido pela `pd-04`).

## Migrations

**Nenhuma.** O `schema.prisma` segue sem models.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| Resolver os três itens na mesma branch, "não importa os empecilhos" | **Usuário** (08/09) |
| Autorizar a migração CommonJS → ESM | **Usuário** (08/09) |
| Rodar o `nestjs-zod` fora do peer declarado, via `overrides` | **Usuário** (08/09, decorrente da anterior) |
| Manter o tooling do Nest na linha 11 em vez de arrastar o TypeScript para ≥ 6 | IA |
| Prisma **7.10.0 estável**, nunca a `latest` (que é RC) | IA |
| Fechar as vulnerabilidades por `overrides` em vez de upgrade | IA (forçado pelo achado #1) |
| Pinar os pacotes do Nest também na raiz, para forçar cópia única | IA |
| Declarar o datasource do `prisma.config.ts` só quando `DATABASE_URL` existe | IA |
| Modelo e formato da Fase 2: Opus, IA sozinha | **Usuário** |

## Validações

Última execução a partir de `npm ci` limpo, na ordem do CI:

| O quê | Resultado |
|---|---|
| `npm audit` | **3 `high` → 0 vulnerabilidades** |
| Lint | 5/5 tarefas |
| Checagem de tipos | 5/5 tarefas (os 19 erros TS1479/TS1541 do Nest 12 sobre CJS zeraram) |
| Build | 3/3 tarefas; `dist/` emitido em ESM, **zero `require()`** |
| Testes | **6 suítes, 34 testes** (domain 8; api 26) — eram 30 antes |
| Teste de contrato | 1/1 |
| Contrato OpenAPI | `contract:write` **sem diff** — o `nestjs-zod` fora do peer não alterou a geração |
| Smoke de boot | `Nest application successfully started`; `/api/v1/health` → **200**, `{"status":"ok","database":"up"}` contra Postgres real |
| CI | Verde nas duas execuções do PR #4, após o fix descrito abaixo |

**Vermelho no CI, corrigido na própria branch:** o primeiro push falhou no passo
`prisma:generate` com `PrismaConfigEnvError: Cannot resolve environment
variable: DATABASE_URL` — o runner não tem `.env`, e o `env()` do Prisma lança
ao carregar o config. `prisma generate` não abre conexão nenhuma, então o
datasource passou a ser declarado condicionalmente (`bb4e8cc`). Reproduzido
localmente movendo o `.env` para fora antes de empurrar o fix.

### Prova de vermelho

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| 1 | Remover `register('import-in-the-middle/hook.mjs')` de `instrumentation.ts` e recompilar | `instrumentation.esm.e2e-spec.ts` — `Expected value: "@opentelemetry/instrumentation-express"` / `Received array: ["prisma", "@opentelemetry/instrumentation-http"]` |

**A primeira versão deste sentinela não servia** e passava com e sem o hook: ela
só verificava se o payload continha `/api/v1/health`, e o path aparece como
atributo do span de qualquer jeito. A asserção foi refeita a partir da medição
do que realmente muda:

| | escopos exportados | span da rota |
|---|---|---|
| sem o hook | http, prisma | `GET` |
| com o hook | http, prisma, **express** | `GET /api/v1/health` |

Ou seja: `node:http` é instrumentado nos dois casos (é builtin, e o ESM
compartilha o objeto de módulo com o CJS). O que o hook compra é a
**instrumentação do express** — e com ela o nome de rota no span.

`nest-single-copy.spec.ts` não tem mutação induzida: o estado que ele detecta
**ocorreu de verdade** durante a tarefa (achado #4), com raiz em 11.2.3 e
`apps/api` em 12.0.1.

**Regressão introduzida e corrigida no caminho:** ao reescrever os scripts de
teste, o `--passWithNoTests` do `packages/contracts` foi perdido, e o pacote (que
não tem specs) passou a falhar. Descoberto comparando com o log de CI do
`master`. O `npm test` local vinha mascarando pelo cache do Turborepo.

## Pendências geradas

**No [`BACKLOG.md`](../../BACKLOG.md)** — saíram **4** itens e entraram **3**.

Removidos (resolvidos):

1. Vulnerabilidade `high` `deepmerge-ts`
2. Upgrade para Prisma 7
3. Upgrade para NestJS 12
4. **"Sem teste automatizado provando que spans existem"** — registrado pela
   `pd-04`, que concluiu que o sentinela "não funciona sob Jest". Resolvido por
   tabela: o novo sentinela sobe a app compilada num **processo filho**, o que
   contorna o registry de módulos do Jest — exatamente o "script Node de verdade
   contra o coletor" que aquele item pedia.

Adicionados, cada um com medição, data e gatilho:

1. **`nestjs-zod` rodando fora do peer declarado, e parado desde 25/07/2026** —
   remover o override quando o upstream publicar suporte a `^12`.
2. **Tooling do Nest travado na linha 11 — gatilho: TypeScript ≥ 6** — a
   `latest` do TypeScript é 7.0.2; é upgrade de duas majors e cai no port
   nativo, então é tarefa própria.
3. **Dois `overrides` de segurança no `package.json`** — `deepmerge-ts` e
   `mysql2` são contornos de dependência transitiva, não correções do upstream;
   conferir a cada bump do Prisma.

**No [`IDEIAS.md`](../../IDEIAS.md):** substituir o `nestjs-zod` por outra ponte
Zod→OpenAPI. É a solução estrutural do risco — hoje uma biblioteca sem
manutenção é dona do contrato do ADR-0002 —, mas não tem dono nem prazo.

**Pendências de produção:** **nenhuma.** A entrega não gera deploy nem migration,
e o projeto segue sem ambiente de produção.
