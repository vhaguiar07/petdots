---
title: "ADR-0007: Migração para ESM, NestJS 12 e Prisma 7"
status: stable
version: 1.0
updated: 2026-09-08
scope: >
  Migra o monorepo de CommonJS para ESM e, com isso, sobe NestJS 11→12 e
  Prisma 6→7. Registra que o NestJS 12 é ESM-only, que o peer declarado do
  nestjs-zod passa a ser forçado por override, e que a vulnerabilidade
  deepmerge-ts se resolve por override — não pelo upgrade do Prisma, como o
  ADR-0005 supunha. Revisa os pins do ADR-0005.
relates_to:
  - 06-decisions/ADR/0005-bootstrap-monorepo.md
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0006-instrumentacao-opentelemetry.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 07-process/BACKLOG.md
type: decision
---

# ADR-0007: Migração para ESM, NestJS 12 e Prisma 7

## Contexto

O [ADR-0005](0005-bootstrap-monorepo.md) pinou o repositório em **NestJS 11,
Prisma 6 e CommonJS**, e registrou três débitos com gatilho nomeado. A `pd-05`
foi aberta para fechar os três de uma vez. Ao medir o estado real antes de
planejar (`DIRETRIZES_FLUXO_IA` §3), **três premissas do ADR-0005 e do backlog
não se confirmaram**:

| # | O que se acreditava | O que foi medido (08/09/2026) |
|---|---|---|
| 1 | A vulnerabilidade `deepmerge-ts` "sai junto com o Prisma 7" | **Falso.** `@prisma/config@7.10.0` pina o mesmo `deepmerge-ts@7.1.5` vulnerável do Prisma 6. O upgrade não fecha a vulnerabilidade |
| 2 | O `deepmerge-ts@8` é ESM-only, o que tornaria o override arriscado sob CJS | **Falso.** É *dual package* (`import` → `.mjs`, `require` → `.cjs`), e o `@prisma/config` o carrega por `await import(...)` de qualquer forma |
| 3 | O gatilho do Prisma 7 é "quando o Nest migrar para ESM" | **Confirmado, e mais forte do que parecia:** o próprio **NestJS 12 é ESM-only** (`@nestjs/common` e `@nestjs/core` declaram `"type": "module"`). Subir o Nest *é* a migração ESM |

A terceira medição colapsou os três débitos num único movimento: não havia como
subir o Nest sem migrar para ESM, e migrado o repositório, o gatilho do Prisma
estava satisfeito. A janela também era a mais barata possível — **24 arquivos
`.ts`, nenhum módulo de domínio, nenhum model no `schema.prisma`, uma rota**.

A objeção original do ADR-0005 à alternativa (b) era **concentrar o risco de
integração no bootstrap**, "para ganhar nada que o MVP precise hoje". O
bootstrap acabou; a objeção expirou. O que continua valendo é o custo de adiar:
cada módulo novo torna a migração mais cara.

Restava um bloqueio de terceiro: o `nestjs-zod@5.5.0` — a biblioteca que
materializa o contrato Zod→OpenAPI do [ADR-0002](0002-stack-tecnologica-fundacao.md)
— declara peer `@nestjs/common ^10 || ^11` **e** `@nestjs/swagger ^7.4.2 || ^8
|| ^11`, e **não publica desde 25/07/2026**, sem pré-release recente.

## Decisão

1. **O monorepo passa a ser ESM.** `"type": "module"` em `apps/api` e nos três
   pacotes; imports relativos com extensão `.js`; `import.meta.url` no lugar de
   `__dirname`; Jest em modo ESM (`useESM`, `extensionsToTreatAsEsm`,
   `--experimental-vm-modules` via wrapper). O `tsconfig.base.json` **não muda**:
   já usava `module`/`moduleResolution: node16`.
2. **NestJS 12.0.1** no runtime. O **tooling** (`@nestjs/cli`,
   `@nestjs/schematics`) **fica na linha 11**: o `@nestjs/schematics@12` exige
   `typescript >= 6`, e o repositório está em 5.9.3.
3. **O peer do `nestjs-zod` é forçado por `overrides`**, rodando a 5.5.0 fora da
   faixa que ela declara, com gatilho de saída registrado no backlog.
4. **Prisma 7.10.0**, com `prisma.config.ts` na raiz e driver adapter
   (`@prisma/adapter-pg`) no `PrismaService`. A `url` sai do `schema.prisma`.
   **Nunca a `latest`**: em 08/09/2026 ela aponta para `8.0.0-rc.13`, uma RC.
5. **Vulnerabilidades fechadas por `overrides`**, não por upgrade:
   `deepmerge-ts` para 8.0.2 e `mysql2` para 3.24.4 (o Prisma 7 embute o
   `mysql2`, que este projeto não usa — é PostgreSQL).
6. **Os pacotes de runtime do Nest são pinados também na raiz.** Sem isso o npm
   hoista `nestjs-zod` para a raiz e aninha `@nestjs/swagger` e
   `@nestjs/platform-express` em `apps/api`, onde não se enxergam.

## Alternativas consideradas

**(a) Esperar o `nestjs-zod` publicar suporte a `^12`.** Descartada: a
biblioteca está parada há seis semanas com o Nest 12 já publicado, sem sinal de
trabalho em andamento. Esperar mantinha os três débitos em ciclo de
reverificação — exatamente o que a `pd-05` foi aberta para encerrar.

**(b) Substituir o `nestjs-zod` por outra ponte Zod→OpenAPI.** É a solução
estrutural do risco, e continua sendo a resposta certa se a biblioteca não
voltar a publicar. Descartada **agora** por escopo: mexe num contrato do
ADR-0002 e é decisão própria. Registrada em `IDEIAS.md`.

**(c) Subir também o tooling do Nest para a linha 12.** Descartada: arrastaria o
TypeScript para ≥ 6 no mesmo movimento. A `latest` do TypeScript é **7.0.2** (a
6 saiu apenas em beta), e o port nativo é mudança grande demais para viajar de
carona num upgrade de dependências. Vira débito próprio.

**(d) Ficar no Prisma 6 e só migrar o Nest.** Descartada: uma vez o repositório
em ESM, o gatilho do Prisma estava satisfeito e adiar só preservaria um item de
backlog sem motivo técnico.

**(e) `patch-package` sobre o `nestjs-zod`** em vez de `overrides`. Descartada:
`overrides` é nativo do npm, não precisa de passo de build extra e é
inspecionável no `package.json`.

## Consequências

**Positivas**

- Os três débitos do ADR-0005 saem do backlog resolvidos; `npm audit` vai de
  **3 `high` para 0**.
- A migração ESM foi paga no momento mais barato que existirá.
- O contrato OpenAPI **não mudou** (`contract:write` sem diff), o que é a
  evidência de que rodar o `nestjs-zod` fora do peer não alterou a geração.

**Negativas e riscos assumidos**

- **Rodar fora do peer declarado é uma aposta.** Sustentada por: contrato
  inalterado, suíte verde e ausência de produção. Se o `nestjs-zod` publicar
  suporte, o override sai.
- **A instrumentação OTel mudou de mecanismo.** Sob ESM o hook de loader precisa
  ser instalado antes do *carregamento* do grafo, o que exige
  `node --import ./dist/instrumentation.js`. Medido em 08/09/2026: sem o hook os
  spans do **express** desaparecem e o span HTTP perde o nome da rota
  (`GET` em vez de `GET /api/v1/health`) — sem erro algum.
  `test/instrumentation.esm.e2e-spec.ts` é o sentinela, com prova de vermelho.
- **Duplicação de versão entre raiz e `apps/api`.** O pin duplicado pode divergir
  e recriar duas cópias do Nest, quebrando DI em silêncio.
  `test/nest-single-copy.spec.ts` guarda contra isso.
- **Dois `overrides` de segurança** (`deepmerge-ts`, `mysql2`) que precisam sair
  quando o upstream corrigir.

## Status

`accepted` — 08/09/2026.

Substitui o [ADR-0005](0005-bootstrap-monorepo.md) **apenas na parte dos pins**
(NestJS 11, Prisma 6, CommonJS) e nas alternativas (b) e (c) dele. O restante do
ADR-0005 — npm workspaces + Turborepo, Node 24, arquivamento do legado —
continua valendo.
