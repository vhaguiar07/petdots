---
title: Technology Stack
status: stable
version: "1.5"
updated: 2026-09-11
scope: >
  Inventário vivo das tecnologias do PetDots por eixo (linguagem, backend, banco,
  ORM, contrato de API, auth, cliente, jobs, storage, observabilidade, testes),
  materializando a decisão registrada no ADR-0002. Cataloga e operacionaliza —
  não rejustifica a decisão (isso é o ADR-0002) nem repete princípios
  (ARCHITECTURAL_PRINCIPLES) ou componentes (SYSTEM_ARCHITECTURE).
relates_to:
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md
  - 02-architecture/ARCHITECTURAL_PRINCIPLES.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 03-engineering/DEVELOPMENT_GUIDE.md
type: architecture
---

# PetDots — Technology Stack

---

## Objetivo

Este é o **inventário vivo** das tecnologias do PetDots. Ele **materializa** a
decisão registrada no [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md):
o ADR *decide e justifica*; este documento *cataloga e operacionaliza*. A
justificativa de cada escolha e as alternativas preteridas vivem no ADR — aqui
não as repetimos.

> Mudar uma tecnologia deste inventário exige um novo ADR (ver
> [`ARCHITECTURAL_PRINCIPLES`](./ARCHITECTURAL_PRINCIPLES.md), princípio P5).

---

## Política de versionamento

- **Node.js LTS** como runtime.
- **Majors validadas no marketplace legado** (referência de capacidade, não código
  herdado — [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md)):
  **NestJS 11** e **Prisma 6**.
- Next.js, Expo (React Native) e React também integraram o legado. O eixo
  **Expo/React Native foi pinado na `pd-08`** (ver abaixo); o do Next.js será
  pinado quando `apps/landing` nascer.
- **As versões exatas são pinadas no lockfile** no bootstrap do repositório.
- Atualização de major segue o processo normal de manutenção; **troca de
  tecnologia** (não de versão) exige ADR.

### Versões pinadas no bootstrap (pd-01, 07/09/2026)

Fixadas sem `^`, com a justificativa de cada uma no
[ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md):

| Eixo | Versão |
|---|---|
| Node.js | **24 LTS** (Krypton) |
| Gerenciador | **npm 11** workspaces |
| NestJS | ~~11.2.3~~ → **12.0.1** na `pd-05` (`@nestjs/config` 12.0.0, `@nestjs/swagger` 12.0.1). ⚠️ **Tooling** (`@nestjs/cli` 11.0.24, `@nestjs/schematics` 11.1.0) **fica na linha 11** — ver abaixo |
| Prisma | ~~6.19.3~~ → **7.10.0** na `pd-05` (`@prisma/adapter-pg` 7.10.0; `prisma.config.ts` na raiz) |
| TypeScript | **5.9.3** (⚠️ **ESM** desde a `pd-05`; `module`/`moduleResolution: node16` — inalterados) |
| Zod | **4.5.4** |
| Jest | **30.5.1** + ts-jest 29.4.12 + Supertest 7 + `@testcontainers/postgresql` 12.1.0 |
| ESLint / Prettier | **10.10.0** (flat config) + typescript-eslint 8.70 + eslint-plugin-import-x 4.17.1 / **3.9.6** |
| Logging | **nestjs-pino 5.1.0** + pino 10 |

> A linha do ESLint subiu de 9.39.5 para 10.10.0 na **`pd-03`** (08/09/2026),
> junto com a regra `import-x/no-extraneous-dependencies`, que barra import de
> dependência não declarada no `package.json` do próprio workspace.

### Versões pinadas na instrumentação OTel (pd-04, 08/09/2026)

Justificadas no [ADR-0006](../06-decisions/ADR/0006-instrumentacao-opentelemetry.md):

| Pacote | Versão |
|---|---|
| `@opentelemetry/api` | **1.9.1** |
| `@opentelemetry/sdk-node` e exportadores OTLP/HTTP | **0.222.0** |
| `@opentelemetry/resources`, `sdk-metrics` | **2.11.0** |
| `@opentelemetry/semantic-conventions` | **1.43.0** |
| Instrumentações | HTTP **0.222.0** · Express **0.70.0** · pino **0.68.0** |
| `@prisma/instrumentation` | ~~6.19.3~~ → **7.10.0** na `pd-05` — casada com a versão do Prisma |
| Coletor local (dev) | `otel/opentelemetry-collector` **0.160.0** |

### Migração para ESM, NestJS 12 e Prisma 7 (pd-05, 08/09/2026)

Justificada no [ADR-0007](../06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md),
que revisa os pins do ADR-0005. Os três upgrades que o backlog listava como
travados **saíram juntos**, porque medir mostrou que eram um movimento só: o
**NestJS 12 é ESM-only**, e migrar o repositório para ESM era exatamente o
gatilho que o Prisma 7 esperava.

| Eixo | Estado depois da `pd-05` |
|---|---|
| Formato de módulo | **ESM** — `"type": "module"` em `apps/api` e nos três pacotes; imports relativos com `.js`; `import.meta.url` no lugar de `__dirname` |
| Jest | **modo ESM** (`useESM`, `extensionsToTreatAsEsm`), com `--experimental-vm-modules` via `scripts/jest.mjs` |
| Boot da API | `node --import ./dist/instrumentation.js dist/main.js` — sob ESM o hook de loader do OTel precisa ser instalado antes do carregamento do grafo |
| NestJS runtime | **12.0.1** |
| NestJS tooling | **11.x** — `@nestjs/schematics@12` exige `typescript >= 6`, e o repositório está em 5.9.3 (item de backlog) |
| Prisma | **7.10.0** com driver adapter; a `url` saiu do `schema.prisma` para o `prisma.config.ts` |

**Dois `overrides` sustentavam o `npm audit` em zero** (medido em 08/09/2026;
⚠️ **já não está em zero** — ver o backlog) e não são correções do
upstream: `deepmerge-ts@8.0.2` (o `@prisma/config` pina a 7.1.5 vulnerável
**tanto no Prisma 6 quanto no 7** — o upgrade sozinho não resolvia) e
`mysql2@3.24.4` (o Prisma 7 o embute; este projeto é PostgreSQL). Um terceiro
bloco de `overrides` força versão única dos pacotes do Nest, porque o
`nestjs-zod` roda **fora do peer que declara** — sem isso o npm instala duas
cópias do Nest e a injeção de dependência quebra em silêncio.
Guardado por `apps/api/test/nest-single-copy.spec.ts`.

### Versões pinadas do cliente universal (pd-08, 11/09/2026)

Justificadas no [ADR-0008](../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md).
Exatas, sem `^`/`~`. **Autoridade: `npx expo install --check`** dentro de
`apps/app` — ele conhece a matriz de compatibilidade do SDK e aceitou o pin
exato em todos os pacotes, corrigindo apenas `@types/react`.

| Pacote | Versão |
|---|---|
| `expo` | **57.0.21** (SDK 57; a 58 está em `preview`/`canary`) |
| `react-native` | **0.86.3** |
| `react` / `react-dom` | **19.2.3** — o `latest` do React é 19.3.0, mas o SDK casa com esta |
| `react-native-web` | **0.21.2** |
| `expo-router` | **57.0.20** |
| `expo-constants` / `-font` / `-linking` / `-splash-screen` / `-status-bar` / `-system-ui` | 57.0.17 / 57.0.3 / 57.0.9 / 57.0.8 / 57.0.1 / 57.0.3 |
| `react-native-reanimated` / `react-native-worklets` | **4.5.1** / **0.10.1** |
| `react-native-screens` / `-gesture-handler` / `-safe-area-context` | **4.26.0** / **2.32.0** / **5.7.0** |
| `typescript` | **6.0.3** — ⚠️ **só em `apps/app`**, aninhada em `apps/app/node_modules`; a raiz segue em **5.9.3** |
| `@types/react` | **19.2.4** |
| `eslint-config-expo` | **57.0.2** — ⚠️ ver a nota de lint abaixo |

> ⚠️ **O lint de `apps/app` não usa a base comum de `@petdots/config`.** Aquela
> config é type-checked sobre `moduleResolution: node16`, e a resolução deste
> workspace é a do Metro (`bundler`). O app usa `eslint-config-expo` com
> `settings.react.version` fixado: sem isso, o `eslint-plugin-react` embutido
> tenta autodetectar a versão do React por um caminho que o **ESLint 10** removeu
> (`context.getFilename`) e o lint morre ao carregar a primeira regra. A `latest`
> do `eslint-plugin-react` declara peer só até o ESLint 9. Item de vigilância no
> backlog.

---

## Inventário por eixo

| Eixo | Tecnologia | Papel |
|------|-----------|-------|
| Linguagem | **TypeScript** | Única linguagem, ponta a ponta (backend, web, mobile, contratos). |
| Estrutura | **Monorepo** (npm workspaces) | Pacotes compartilhados de domínio e contratos. |
| Orquestrador | **Turborepo 2.10** | Ordena `packages/* → apps/*` (`dependsOn: ["^build"]`) e cacheia tarefas. Deixou de ser opcional no bootstrap: `npm -ws` roda em ordem alfabética e quebraria o build (ADR-0005). |
| Backend | **NestJS** | Modular Monolith; um módulo por agregado + módulos de suporte. |
| Banco | **PostgreSQL** | Datastore único; JSONB/full-text/`pgvector` quando necessário, antes de qualquer datastore novo. |
| ORM | **Prisma** | `schema.prisma` derivado do `DOMAIN_MODEL`; PKs UUID; `$queryRaw` como escape hatch. |
| Validação | **Zod** | Fonte única de validação na borda. |
| Contrato | **REST + OpenAPI** (via **nestjs-zod** + `@nestjs/swagger`) | OpenAPI gerado dos schemas Zod e publicado em `packages/contracts/openapi.json` (ver mecanismo abaixo). |
| Auth | **JWT + argon2 + Google OAuth** (próprio) | Identidade no nosso Postgres; RBAC + escopo de loja por instância (`store_members`, via `StoreScopeGuard`). |
| Cliente | **Expo + React Native (+ React Native Web)** | Cliente universal iOS/Android/Web, em `apps/app`. **Spike-gate aprovado em 11/09/2026** ([ADR-0008](../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)) — sem condicional. |
| Landing pública | **Next.js** (`apps/landing`) | Landing do smoke test e páginas públicas do comparador, que precisam de SEO — separada do cliente universal desde já (ADR-0004 #13), e independente do spike-gate. **Ainda não bootstrapada.** |
| Jobs | **Scheduler in-process do Nest + advisory lock (Postgres)** | Lembretes de reposição, conciliação diária do PSP; tabela de jobs/outbox. BullMQ/Redis só com ADR. |
| Pagamentos | **PSP com split (Asaas ou Mercado Pago) — Pix primeiro** | Subconta por loja; comissão retida na liquidação; webhook assinado e idempotente ([ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md)). Fornecedor final pendente de due diligence (D9). |
| Storage | **Não usado no MVP** | Sem upload de documentos (Carteira Digital é fase 2). S3 + presigned URLs quando voltar. |
| Observabilidade | **OpenTelemetry (SDK instrumentado) → destino pendente** | Traces e métricas saindo por OTLP desde a `pd-04`; logs estruturados em stdout com `trace_id`. Instrumentações: HTTP, Express, pino, Prisma. Ligado por `OTEL_EXPORTER_OTLP_ENDPOINT`, desligado por padrão. Coletor local em dev (`npm run otel:up`). **Serviço gerenciado ainda não escolhido** — shortlist e critério no [ADR-0006](../06-decisions/ADR/0006-instrumentacao-opentelemetry.md), gatilho: existir ambiente de deploy. |
| Testes | **Jest + Supertest; Postgres efêmero (Testcontainers)** | Unit + integração; contrato OpenAPI testado. |

---

## Detalhes operacionais delegados pelo ADR-0002

### Mecanismo do contrato (Zod → OpenAPI)

Os **schemas Zod** são a fonte única; o **OpenAPI é gerado** a partir deles e
**publicado** como contrato canônico; os tipos do cliente derivam do OpenAPI. Um
**teste de contrato no CI** garante que o OpenAPI publicado não diverge do
código. A biblioteca concreta é escolha de implementação de baixa
reversibilidade (não exige ADR para troca, desde que o contrato permaneça
REST/recursos e o OpenAPI siga canônico).

**Escolhida no bootstrap:** [`nestjs-zod`](https://github.com/BenLorantfy/nestjs-zod)
5.5.0 com `@nestjs/swagger` 11.4.7, sobre o `z.toJSONSchema()` nativo do Zod 4.
Na prática: os schemas vivem em `packages/contracts`, viram DTO com
`createZodDto`, e o documento é gerado da tabela de rotas e gravado em
`packages/contracts/openapi.json` por `npm run contract:write`. O teste de
contrato compara o gerado com esse snapshot (ignorando `info.version`) e falha
em qualquer divergência.

### Spike-gate do cliente universal — ✅ aprovado em 11/09/2026

O [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) #12
condicionava o cliente universal a um spike de validação obrigatório, com
fallback nomeado para Expo (mobile) + Next.js (web). **A `pd-08` executou o gate
e o veredicto do Victor foi aprovar** — decisão registrada no
[ADR-0008](../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md),
que fecha a condição sem substituir o ADR-0002.

O spike construiu as três jornadas de maior risco (J2 comparador, J3 checkout,
J4 painel do lojista) sobre 343 ofertas e 40 pedidos. Números que sustentam o
veredicto:

| Eixo | Medido em 11/09/2026 |
|---|---|
| Acessibilidade | **0 violações `serious`/`critical`** do `axe-core` nas três telas |
| Custo da semântica de DOM | **8 componentes-envelope + 3 arquivos de fundação**; **zero** anotação por elemento em 11.208 elementos renderizados |
| Semântica gerada | O RN-Web promove `role` a tag nativa: 350 `<button>`, `<h1>`/`<h2>`/`<h3>`, `<header>`/`<nav>`/`<main>` |
| Desktop | Tabela em 1476px de 1920 (77%), sem rolagem horizontal; seleção de texto, Ctrl+F, voltar/avançar, F5 e abrir-em-nova-aba funcionando |
| Performance | **60 fps** mediano rolando 343 linhas (20.570px); bundle inicial **1,64 MB** |
| Rede limitada | 400 kbps/400 ms: primeira tabela em 1,4 s, lista densa em 36,7 s — **débito de UI registrado no backlog** |

**O fallback continua sendo a saída de emergência**, não descartado por
impossibilidade: os `packages/` de domínio e contratos seguem isolados da camada
de UI, que é a condição que preserva a reversão.

> **Regra que conduziu o gate, e que vale para qualquer reavaliação futura:** só
> **qualidade de UX/web/a11y** decide. Falha de tooling (resolução do Metro,
> interop ESM, hoisting do npm, versão de TypeScript) é **modo comum às duas
> alternativas** — o fallback também usa Expo e Metro no mobile —, e por isso não
> é evidência a favor de nenhuma.

---

## Fora do MVP (somente mediante ADR)

Itens deliberadamente **não** adotados agora, cada um com gatilho próprio (ver
ADR-0002): message broker / fila, cache distribuído (Redis), datastore de
vetores dedicado (o Postgres+`pgvector` é a porta de entrada), multi-região / HA,
e a frente de **IA dedicada** (Fase 5).

---

## Critérios

Este documento é considerado pronto quando:

- [x] Lista a tecnologia de cada eixo, materializando o ADR-0002 sem rejustificá-lo.
- [x] Define a política de versionamento e o que exige ADR para mudar.
- [x] Operacionaliza os pontos que o ADR delegou (mecanismo do contrato; spike-gate).
- [x] Não duplica princípios (`ARCHITECTURAL_PRINCIPLES`) nem componentes (`SYSTEM_ARCHITECTURE`).
- [x] Versões exatas preenchidas no bootstrap do repositório (lockfile).
