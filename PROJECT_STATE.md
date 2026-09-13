---
title: PetDots — Project State
status: stable
version: "5.1"
updated: 2026-09-12
scope: >
  Estado atual do projeto PetDots. Registra a fase, o inventário documental fiel
  ao disco, as decisões arquiteturais registradas e o próximo passo concreto.
  Deve ser o primeiro ponto de consulta antes de iniciar qualquer atividade.
  Pendências detalhadas vivem em docs/07-process/BACKLOG.md, não aqui.
relates_to:
  - docs/README.md
  - docs/07-process/BACKLOG.md
  - docs/06-decisions/ADR/0005-bootstrap-monorepo.md
  - docs/01-product/DOMAIN_MODEL.md
type: foundation
---

# PetDots — Project State

> **v5.1 (2026-09-12).** Atualizado no encerramento da `pd-14` — **o tutor
> existe no banco**. Entraram a quarta migration (`tutors` e `pets`), o sexto
> módulo de domínio, as quatro telas novas do `apps/app` e a **primeira escrita
> de domínio pelo cliente**, que até aqui só lia. Com ela vieram o **primeiro
> teste de posse** e o **primeiro `403` de papel** numa rota real
> ([ADR-0015](docs/06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md)).
> `Tutor` e `Pet` saíram da lista de agregados não modelados; a **capacidade 2
> está entregue** e a **1**, completa no que dependia de código.
> ⚠️ A **calculadora de consumo não entrou**, e não por prazo: a fórmula não
> está escrita em documento nenhum e exige ADR próprio.
> ⚠️ O inventário documental abaixo foi **reconferido contra o frontmatter de
> cada arquivo** — ele havia envelhecido de novo, porque o PR #13 subiu onze
> documentos sem atualizá-lo.
>
> **v4.7 (2026-09-11).** Atualizado no encerramento da `pd-11` — **o comparador
> de preços existe e é público**. Entraram a segunda migration do projeto
> (catálogo, lojas, áreas de entrega e ofertas), três módulos novos na API
> (`catalog`, `stores`, `offers`) com quatro endpoints `GET`, o seed versionado
> do catálogo e as páginas indexáveis `/precos` e `/precos/{slug}` na landing.
> A jornada **J2 está navegável**. Decisões no
> [ADR-0010](docs/06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md).
> ⚠️ Tudo é **leitura**: não há um endpoint de escrita, porque não há
> autenticação.
>
> **v4.6 (2026-09-11).** O repositório passou a ter **duas linhas de
> integração** ([ADR-0009](docs/06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md)):
> `develop` recebe todas as tarefas, **`master` só avança a pedido explícito do
> Victor**. ⚠️ **Consequência:** este documento, o `BACKLOG` e os demais docs de
> estado descrevem a **`develop`** — `master` pode estar atrás, e quem clona cai
> nela. A `pd-09` já está integrada na `develop` (`37d4633`) e **não** em
> `master`.
>
> **v4.5 (2026-09-11).** Atualizado no encerramento da `pd-09` — **a
> implementação do produto começou**. Saíram juntos, numa entrega só: a
> **primeira migration** do projeto (`waitlist_entries`), o **primeiro módulo de
> domínio** da API (`waitlist`, nas quatro camadas do `CODING_STANDARDS`), o
> workspace **`apps/landing`** em Next.js 16 com a captura da lista de espera, e
> a camada de documentação **`docs/08-features/`**. A frase "ainda não há módulo
> de domínio", que valia desde o bootstrap, deixou de valer.
>
> **v4.4 (2026-09-11).** Atualizado no encerramento da `pd-08` — o **spike-gate
> do cliente universal foi executado e aprovado**
> ([ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)).
> Com isso o projeto deixa de ter bloqueador: a camada de cliente está definida e
> as capacidades do `MVP_SCOPE` podem ser implementadas.
>
> **v4.3 (2026-09-10).** Atualizado no encerramento da `pd-07`
> (re-sincronização documental sob o [ADR-0004](docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md)).
> Registra também a `pd-06` (critério de débito e backlog em duas filas),
> encerrada em 08/09/2026. **A numeração do spike-gate mudou:** era chamado de
> `pd-02` desde junho, mas a sequência já está em `pd-07` — o spike é a `pd-08`.
>
> **v4.2 (2026-09-08).** Atualizado no encerramento da `pd-05` (migração ESM,
> NestJS 12 e Prisma 7 — [ADR-0007](docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md)).
>
> **v4.1 (2026-09-08).** Atualizado no encerramento da `pd-04` (instrumentação
> OpenTelemetry). Registra também a `pd-03` (ESLint 10 + checagem de dependência
> não declarada), encerrada no mesmo dia.
>
> **v4.0 (2026-09-07).** Atualizado no encerramento da `pd-01` (bootstrap do
> monorepo). A v3.4 era de 27/06 e havia envelhecido em três pontos: listava as
> camadas 03/04 como "planejadas" quando já existiam, não conhecia os ADRs
> 0003/0004/0005 nem a camada `07-process`, e dizia que não havia código.

---

# Objetivo

Este documento representa o estado atual do projeto.

Ele deve ser atualizado continuamente durante toda a evolução do PetDots.

Seu objetivo é permitir que qualquer pessoa ou agente de IA saiba exatamente onde o projeto está e qual é o próximo passo.

---

# Situação Atual

**Fase do Projeto**

Início da implementação do **MVP marketplace** ([ADR-0004](docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md)), sobre a fundação greenfield do [ADR-0001](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).

---

## Desenvolvimento

A fundação documental está completa (camadas 00–07) e o **monorepo foi bootstrapado** em 07/09/2026 pela tarefa `pd-01`:

- raiz com npm workspaces + Turborepo, Node 24, versões pinadas no lockfile;
- `packages/config` (tsconfig/eslint/prettier), `packages/domain` (regras puras) e `packages/contracts` (schemas Zod + OpenAPI publicado);
- `apps/api` em NestJS 12 (ESM) com `GET /api/v1/health` (processo + Postgres), logs JSON com `requestId`/`correlationId`, validação Zod na borda e o formato de erro do [`ERROR_MODEL`](docs/04-api/ERROR_MODEL.md);
- testes de unidade, de integração com Postgres efêmero (Testcontainers) e de contrato OpenAPI, todos gate no CI do GitHub.

Duas tarefas de manutenção da fundação foram entregues em 08/09/2026, ambas
antes do primeiro módulo de domínio, de propósito:

- **`pd-03`** — ESLint 10 em todos os workspaces e uma regra que barra import de
  dependência não declarada no `package.json` do próprio workspace (fechando o
  furo do hoisting do npm).
- **`pd-04`** — **OpenTelemetry instrumentado** na API: traces e métricas por
  OTLP, spans de HTTP/Express/Prisma no mesmo trace e `trace_id` na linha de log.
  Desligado por padrão, ligado por `OTEL_EXPORTER_OTLP_ENDPOINT`; coletor local
  em dev (`npm run otel:up`). O **serviço gerenciado de destino ainda não foi
  escolhido** — shortlist, critério e gatilho no
  [ADR-0006](docs/06-decisions/ADR/0006-instrumentacao-opentelemetry.md).

Duas tarefas de processo e documentação fecharam a fundação:

- **`pd-06`** (08/09/2026) — critério para abrir tarefa só de débito, obrigação
  de resolver na própria tarefa o débito encontrado nela, e divisão do débito
  técnico do backlog em **fila** (acionável) e **vigilância** (esperando
  gatilho). Origem: "matar débito não é avanço; avanço é produto andando".
- **`pd-07`** (10/09/2026) — **re-sincronização documental sob o ADR-0004.**
  Vinte e nove documentos deixaram de descrever o produto anterior ("Vida do
  Pet"): `PRODUCT_ROADMAP`, `MVP_SCOPE`, `PERSONAS`, `CAPABILITIES`,
  `FEATURE_CATALOG`, `USER_JOURNEYS`, `SUCCESS_METRICS`, `GLOSSARY`,
  `TECHNICAL_VISION`, `AI_CONTEXT` e `AI_DOMAIN_KNOWLEDGE` foram reescritos;
  `PRODUCT_VISION` e `PRODUCT_PRINCIPLES` receberam emenda cirúrgica (o §8
  passou de "Marketplace é uma Consequência" para "A Cunha Vence Primeiro"); e
  os **exemplos** das camadas 02, 03, 04 e 05 passaram do domínio antigo para
  loja, oferta, pedido e split, preservando as regras.

E a `pd-08` (11/09/2026) executou o **spike-gate do cliente universal**, que era
o último bloqueador do projeto:

- nasceu **`apps/app`** — Expo 57 + React Native Web + `expo-router`, ESM como os
  demais workspaces, com `lint`, `typecheck` e um `build` (`expo export
  --platform web`) que já rodam no CI pelo Turborepo;
- as **três jornadas de maior risco** (J2 comparador, J3 checkout, J4 painel do
  lojista) foram construídas sobre fixtures locais, com 343 ofertas e 40 pedidos;
- o **Victor aprovou o gate** em 11/09/2026, após percorrer as telas no
  navegador: **zero violações `serious`/`critical`** do `axe-core`, **60 fps**
  rolando a lista densa, e semântica de DOM obtida com **8 componentes-envelope**
  e **nenhuma anotação por elemento**. Decisão, medições e versões pinadas no
  [ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md);
- ⚠️ as telas em `apps/app/src/spike/` são **descartáveis** — provaram a
  plataforma, não são a UI de produto. O que sobrevive é o workspace e o
  vocabulário de UI em `src/spike/ui/`.

**A implementação do produto começou em 11/09/2026, pela tarefa `pd-09`** — uma
branch com cinco entregas que atravessam a pilha inteira:

- **primeira migration** do projeto (`20260911155642_create_waitlist_entries`): a
  tabela `waitlist_entries`, com o telefone normalizado em E.164 e **único** — a
  constraint que faz o smoke test contar pessoas, não submissões;
- **primeiro módulo de domínio** da API: `apps/api/src/modules/waitlist/`, nas
  quatro camadas do [`CODING_STANDARDS`](docs/03-engineering/CODING_STANDARDS.md),
  servindo `POST /api/v1/waitlist-entries` (`201`/`409`/`422`). É o padrão que os
  dez módulos seguintes copiam;
- **`packages/domain`** ganhou as primeiras regras de negócio de verdade
  (normalização de telefone e CEP), e **`packages/contracts`** passou a usá-las
  para validar na borda — uma fonte só para "o que é um telefone válido";
- **`apps/landing`**: Next.js 16.3.4, a landing pública do smoke test
  ([`LISTA_DE_ESPERA`](docs/08-features/waitlist/LISTA_DE_ESPERA.md));
- nasceu **`docs/08-features/`**, a leitura transversal do que está implementado.

**E em 11/09/2026 a `pd-11` pôs o comparador de preços de pé** — a jornada J2,
inteira em leitura:

- **segunda migration** (`20260911200208_create_catalog_stores_and_offers`):
  `products`, `stores`, `delivery_areas` e `offers`, com o par
  `(store_id, product_id)` único e quatro `CHECK` escritos à mão que sustentam
  "dinheiro é centavo inteiro positivo";
- **três módulos novos** na API — `catalog`, `stores` e `offers` —, servindo
  `GET /products`, `GET /products/{id}`, `GET /delivery-areas` e
  `GET /offers?productId=`. Nenhum deles lê tabela alheia: o comparador chama os
  casos de uso dos outros dois, nunca faz JOIN cruzando fronteira;
- **`packages/domain`** ganhou cinco regras puras — slug, texto de busca,
  cobertura de entrega, ranking de oferta e ofertabilidade de produto;
- **seed versionado** em `apps/api/src/seed/`: 52 produtos, 8 lojas, 9 áreas e
  354 ofertas, idempotente e validado antes de escrever. É a ingestão
  **interina** do catálogo até existir console de administração;
- **`apps/landing`** ganhou `/precos`, `/precos/{productSlug}`, `sitemap.xml` e
  `robots.txt` — server components com formulário `GET` puro, sem JavaScript de
  cliente ([`COMPARADOR_DE_PRECOS`](docs/08-features/comparador/COMPARADOR_DE_PRECOS.md)).

⚠️ **As 8 lojas do seed são fictícias** e não podem ir a deploy público — o item
está na intervenção manual do [`BACKLOG`](docs/07-process/BACKLOG.md).

**Em 12/09/2026 a `pd-12` entregou a autenticação própria** — a capacidade 1 do
MVP, e o fim de "não existe identidade":

- **terceira migration** (`users` e `refresh_tokens`): senha em **argon2** via
  `@node-rs/argon2`, refresh token guardado **só como hash** e revogável, e
  `roles` como lista, porque um mesmo humano acumula papéis;
- **quarto módulo de domínio**, `identity`, servindo `POST /auth/register`,
  `/login`, `/refresh` e `/logout`. O refresh é **rotacionado**: usar um token
  invalida o anterior;
- 🔴 **toda falha de autenticação sai pela mesma porta** — mesma mensagem, mesmo
  status e **mesmo custo de hashing**, para o cronômetro também não responder
  "este e-mail tem conta aqui";
- `AuthGuard` e `RolesGuard` nasceram testados, com a verificação de papéis por
  **interseção**, não igualdade;
- **três usuários semeados** em `.local` (`tutor@`, `lojista@`, `admin@`), com o
  seed **se recusando a rodar com `NODE_ENV=production`**
  ([ADR-0011](docs/06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md)).

**E em 12/09/2026 a `pd-13` ligou o cliente universal à API de verdade**, com
login pela interface — **sem criar migration nenhuma**:

- **`GET /auth/me`**, a primeira rota autenticada da API, relendo a linha do
  banco em vez de ecoar as claims do token;
- 🔴 **os guards passaram a globais** (`APP_GUARD` no `IdentityModule`): **toda
  rota nasce fechada**, e as abertas se declaram com `@Public()`. O que segura a
  inversão é um **sentinela e2e** que percorre as rotas públicas sem
  `Authorization` e falha se alguma responder `401` — a regressão que o ADR-0011
  mais temia;
- **dois endpoints novos de loja** — `GET /stores/{storeId}` e
  `GET /stores/{storeId}/offers` —, com loja `PAUSED` respondendo
  `404 STORE_NOT_FOUND` nos dois;
- **`apps/app` deixou de ser spike**: `src/spike/` foi apagado por inteiro e as
  telas passaram a ler a API. Restaram cinco rotas — `/`, `/precos/{slug}`,
  `/loja/{id}`, `/entrar` e `/conta` (privada). `/checkout` e `/painel`
  **deixaram de existir** até a `pd-15`/`pd-16`;
- **a sessão é persistida por plataforma** — `expo-secure-store` no nativo,
  `localStorage` no web — e renovada sozinha, 30 s antes de expirar ou ao
  receber um `401`, com *single-flight* para duas telas não queimarem o mesmo
  refresh token. 🔴 **Falha de rede não desloga ninguém**: só a API dizendo "esse
  token não vale" encerra uma sessão
  ([ADR-0012](docs/06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md));
- **primeira suíte de testes do `apps/app`** (`jest-expo`, 28 testes de lógica
  pura: máquina de sessão, renovação e armazenamento), agora no `npm test` e no
  CI.

⚠️ **`CORS_ORIGINS` passou a ser obrigatória** para usar o app no navegador, e o
sintoma de esquecê-la engana — o badge diz "API: fora do ar" com a API de pé.
Item 11 da intervenção manual do backlog.

**E em 12/09/2026 a `pd-14` colocou o tutor no banco** — a **quarta migration**
(`create_tutors_and_pets`), o **sexto módulo** de domínio e a **primeira escrita
de domínio pelo `apps/app`**, que até aqui só lia
([ADR-0015](docs/06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md)):

- **`tutors` 1:1 com `users`** (`user_id` único) e o endereço padrão como
  **colunas planas** — rua, número, complemento, bairro, CEP e referência. O
  cadastro continua criando `User` e mais nada: o perfil é um passo separado,
  `PUT /tutors/me`, que é **upsert idempotente** e responde `200` sempre;
- **`pets`** com espécie, nascimento (nulo permitido) e **peso** — o insumo da
  reposição —, mais dois `CHECK` escritos à mão: `weight_grams > 0` e o CEP
  conferido contra oito dígitos;
- 🔴 **primeiro teste de posse da API**: o tutor B não lê, não edita e não apaga
  o pet do tutor A — **`404` nos três**, nunca `403`, e o `tutor_id` entra no
  `where` da própria consulta. É o padrão que `orders` vai copiar;
- 🔴 **primeira rota real com `@Roles()`**: `/tutors/*` exige `TUTOR`, e o
  `RolesGuard` — que existia desde a `pd-12` e só era exercitado por um
  controller descartável — ganhou uso de verdade, com teste de `403`;
- **`users.phone` passou a ser escrito**, pelo fluxo do perfil, através de um
  caso de uso do `identity` — o módulo `tutors` não toca a tabela `users`.
  Consequência: `/auth/me` mudou de forma, e **a sessão guardada antes da
  `pd-14` é descartada uma vez**;
- **quatro telas novas** no `apps/app` — `/cadastro`, `/conta/endereco`,
  `/conta/pets/novo` e `/conta/pets/{id}` — com **onboarding guiado e nunca
  bloqueante**: toda tela tem "Fazer depois";
- **a primeira dependência de terceiro em runtime do projeto**, vinda do teste
  manual: `GET /postal-codes/{cep}` busca o endereço enquanto a pessoa digita.
  Ela mora **na nossa API, atrás de uma porta** — o app não conhece o provedor,
  e trocá-lo é trocar uma classe ([ADR-0016](docs/06-decisions/ADR/0016-diretorio-de-ceps-atras-da-nossa-api.md));
- ✅ **o endereço já entrega valor sozinho:** o comparador **pré-preenche o CEP**
  de quem tem perfil, ou seja, mostra quem entrega na casa da pessoa e por
  quanto — o valor de primeiro uso possível sem a calculadora.

⚠️ **A calculadora de consumo não entrou, e o motivo não é prazo.** A regra
"peso + embalagem → gramas/dia" **não está definida em documento nenhum** do
repositório: `IDEACAO_FASE1 §17`, `DOMAIN_MODEL`, `MVP_SCOPE` e `GLOSSARY` só a
nomeiam. Escrevê-la é decisão de domínio e **exige ADR próprio** com a fonte da
tabela de consumo. Até lá, `pets.weight_grams` é dado coletado e não consumido.

Quatro agregados do [`DOMAIN_MODEL`](docs/01-product/DOMAIN_MODEL.md) seguem
**não modelados no banco** — `Order`, `Payment`, `Payout`, `Delivery` — e a
recorrência (`ReplenishmentSchedule`, `Reminder`), por escolha: cada um entra
com a feature que o exercita. `User` saiu dessa lista na `pd-12`; **`Tutor` e
`Pet` saíram na `pd-14`**. As decisões do bootstrap estão no
[ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md).

O protótipo legado (marketplace same-day em NestJS/Prisma) foi **arquivado na tag `legacy-marketplace`** (commit `8a9625b`) e as branches que o carregavam foram removidas. Ele é referência de capacidade, **nunca fonte de código** (anti-contaminação, ADR-0001/0002).

---

# Documentação Existente

> Para o índice canônico completo, consulte [docs/README.md](docs/README.md).

> Status e versão conforme o frontmatter de cada arquivo em **12/09/2026**,
> reconferidos um a um no encerramento da `pd-13`. O inventário havia envelhecido
> de novo — a `pd-12` não o atualizou —, e este bloco só vale se for fiel ao
> disco.

## Fundação (`docs/00-foundation/`)

* PRODUCT_VISION.md (stable, v1.1 — dois níveis de posicionamento)
* PRODUCT_PRINCIPLES.md (stable, v1.1 — §8 "A Cunha Vence Primeiro")
* PROJECT_MANIFESTO.md (draft — carta de fundação)
* BUSINESS_MODEL.md (stable, v2.0)
* GLOSSARY.md (stable, v2.0 — termos do marketplace)
* NAMING_CONVENTIONS.md (stable, v1.2)
* PRODUCT_ROADMAP.md (stable, v2.0 — seis fases, F1 = cunha)
* SUCCESS_METRICS.md (draft, v2.0 — North Star de recorrência)
* IDEACAO_FASE1.md (documento vivo de brainstorm, sem frontmatter)

## Produto (`docs/01-product/`)

* PERSONAS.md (stable, v2.0 — Tutor e Lojista em P1)
* DOMAIN_MODEL.md (stable, v2.6 — keystone do domínio; catálogo, loja, área, oferta, usuário e refresh token no banco)
* MVP_SCOPE.md (stable, v2.5 — **fonte autoritativa do escopo da Fase 1**; capacidades 1 e 5 com nota da `pd-13`)
* CAPABILITIES.md (stable, v2.0)
* FEATURE_CATALOG.md (stable, v2.4 — C1/C3/C4/C5/C6/C13 parcialmente entregues)
* USER_JOURNEYS.md (stable, v2.5 — 9 jornadas; J2 na landing e no `apps/app`, J1 parcial)

## Arquitetura (`docs/02-architecture/`)

* TECHNICAL_VISION.md (stable, v2.0 — núcleo = transação recorrente)
* ARCHITECTURAL_PRINCIPLES.md (draft, v1.1)
* TECHNOLOGY_STACK.md (stable, v1.8 — versões exatas pinadas; `expo-secure-store` e `jest-expo` no cliente)
* SYSTEM_ARCHITECTURE.md (stable, v2.3 — MVP marketplace; fluxo 2 e dados atualizados)
* QUALITY_ATTRIBUTES.md (draft, v1.1)

## Engenharia (`docs/03-engineering/`)

* DEVELOPMENT_GUIDE.md (stable, v2.7 — repositório real; como logar pela interface e `CORS_ORIGINS`)
* CODING_STANDARDS.md (draft, v1.3 — fonte canônica de padrões de código)
* GIT_WORKFLOW.md (draft, v1.3 — duas linhas de integração)
* TESTING_STRATEGY.md (draft, v1.3)
* SECURITY.md (draft, v1.5 — fonte canônica de segurança; guards globais e onde a sessão fica no cliente)
* OBSERVABILITY.md (draft, v1.2)
* DEPLOYMENT.md (draft, v1.2)

## API (`docs/04-api/`)

* API_GUIDELINES.md (draft, v1.4 — fonte canônica de convenções REST; paginação fixada)
* AUTHENTICATION.md (stable, v2.3 — cinco rotas de `/auth`, guards globais, sessão no cliente)
* ERROR_MODEL.md (draft, v1.5 — cinco códigos reais catalogados, incluindo `STORE_NOT_FOUND`)
* VERSIONING.md (draft, v1.1)

## AI (`docs/05-ai/`)

* AI_CONTEXT.md (stable, v3.3 — **primeiro documento que um agente lê**; corrigido "não existe autenticação")
* AI_DOMAIN_KNOWLEDGE.md (stable, v2.0 — domínio destilado para gerar código)
* AI_ARCHITECTURE_RULES.md (draft, v1.1)
* AI_CODING_RULES.md (draft, v1.1)
* AI_DEVELOPMENT_GUIDE.md (draft, v1.1)

## Decisões (`docs/06-decisions/`)

* ADR-0001: Re-fundação — PetDots como ecossistema AI-first (Accepted)
* ADR-0002: Stack tecnológica de fundação (Accepted)
* ADR-0003: Monetização do piloto e pagamento via split (Accepted)
* ADR-0004: Arquitetura do MVP marketplace (Accepted)
* ADR-0005: Bootstrap do monorepo — gerenciador, orquestrador e versões pinadas (Accepted)
* ADR-0006: Instrumentação OpenTelemetry da API (Accepted)
* ADR-0007: Migração para ESM, NestJS 12 e Prisma 7 (Accepted)
* ADR-0008: Cliente universal Expo + React Native Web — resultado do spike-gate (Accepted)
* ADR-0009: Duas linhas de integração — `develop` e `master` (Accepted)
* ADR-0010: Comparador público antes do checkout (Accepted)
* ADR-0011: Autenticação própria antes da escrita (Accepted)
* ADR-0012: Sessão do cliente universal e guards globais (Accepted)
* ADR-0013: Papéis de loja — o que OWNER pode e OPERATOR não (Accepted)
* ADR-0014: O ciclo do dinheiro no pedido — captura, prazo de aceite, ajuste e cancelamento (Accepted)
* ADR-0015: Perfil do tutor e pets antes da reposição (Accepted)
* ADR-0016: O diretório de CEPs fica atrás da nossa API (Accepted)
* DECISION_LOG.md (stable, v2.1)

## Processo (`docs/07-process/`)

* DIRETRIZES_FLUXO_IA.md (stable, v1.3 — as três fases e os portões)
* BACKLOG.md (stable, v1.16 — **fonte das pendências**)
* BUGS.md (stable, v1.4)
* IDEIAS.md (stable, v1.9)
* relatorios-de-branch/ (um por branch encerrada; índice em `README.md` v1.2)

## Features implementadas (`docs/08-features/`)

Camada nascida na `pd-09` — a leitura transversal (banco → API → cliente) do que
**existe no código**, em oposição ao produto pretendido das camadas 00–06. É a
primeira parada para saber o que já foi construído.

* waitlist/LISTA_DE_ESPERA.md (stable, v1.1 — captura do smoke test)
* comparador/COMPARADOR_DE_PRECOS.md (stable, v1.2 — o comparador público de preços, na landing e no `apps/app`)
* identity/IDENTIDADE_E_ACESSO.md (stable, v1.1 — autenticação de ponta a ponta, e como o Victor loga hoje)
* tutors/PERFIL_DO_TUTOR_E_PETS.md (stable, v1.0 — perfil, endereço padrão e pets; a posse por `404` e o onboarding)

## Documentação de Referência

* docs/README.md — Índice mestre e única fonte-da-verdade canônica (stable)
* PROJECT_CONTEXT.md (stable)
* PROJECT_STATE.md (este documento, stable)

---

# Próxima Atividade

**`pd-15` — `orders`: carrinho, pedido e máquina de estados, sem pagamento** —
o pedido para em `PLACED`. É o próximo item da sequência acordada
(`BACKLOG` §"Sequência acordada"), **reconfirmado pelo Victor em 12/09/2026** no
encerramento da `pd-14`, e **nada o trava**.

Por que ele e não a capacidade 9: a `pd-14` levantou a pergunta, porque fechar a
J1 com a calculadora também seria defensável. O Victor manteve `orders`. As duas
razões que sustentam a escolha: o ADR-0014 **destravou as quatro pendências de
modelagem** que bloqueavam `orders`, que agora não espera nada; e a capacidade 9
**ainda espera um ADR que não existe** — a fórmula de consumo não está definida
em documento nenhum, e escrevê-la é decisão de produto, não de implementação.

⚠️ **O custo assumido:** `pets.weight_grams` fica sendo **dado morto** até a
capacidade 9 entrar. A `pd-14` coleta o peso e valida, mas nada o consome.

Insumos que a `pd-15` já tem prontos, e que não tinha antes da `pd-14`: o
**endereço de entrega** do tutor e o **telefone** dele — o pedido não precisa
abrir um segundo formulário de contato no checkout. E o **teste de posse** de
`tutors` é o padrão a copiar: pedido de outro tutor responde `404`.

**O que continua esperando você, e não a engenharia:**

- ✅ **(a) Os ADRs do ciclo do dinheiro — resolvidos em 12/09/2026**
  ([ADR-0014](docs/06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md)).
  Saíram **quatro** pendências de uma vez, e não três: estorno e ajuste, prazo
  de aceite e auto-recusa, política de cancelamento e horário de funcionamento
  da loja. Eram as quatro que bloqueavam `orders`, e eram a mesma pergunta vista
  de ângulos diferentes. **A `pd-15` deixa de ter pré-requisito de modelagem.**
- ✅ **(b) `OWNER` × `OPERATOR` — resolvido em 12/09/2026**
  ([ADR-0013](docs/06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md)).
  Era o que travava o `StoreScopeGuard`, que trava o painel do lojista
  (`pd-16`). Decidido: **preço, repasse, área de entrega e convite de membro são
  do `OWNER`; pedido e disponibilidade são dos dois.** A `pd-16` agora espera
  só por `orders`, e o guard tem a tabela de permissões pronta como insumo.

> **Nota de conselho, não de engenharia:** o que hoje separa o PetDots do smoke
> test continua não sendo código, é **deploy** — a landing, o comparador e agora
> o app rodam só em `localhost` (item 6 da intervenção manual). Publicar o que
> já existe mede demanda antes de construir o resto.

---

# Decisões Arquiteturais

* **ADR-0001** — Re-fundação do PetDots como ecossistema AI-first, descontinuação do marketplace legado. Ver [ADR-0001](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).
* **ADR-0002** — Stack tecnológica de fundação (TypeScript · NestJS Modular Monolith · PostgreSQL · Prisma · REST+Zod→OpenAPI · auth próprio · cliente universal Expo/RN-Web com spike-gate). Ver [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md).
* **ADR-0003** — Monetização do piloto e pagamento via split (take rate, Pix primeiro, subconta por loja). Ver [ADR-0003](docs/06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md).
* **ADR-0004** — Arquitetura do MVP marketplace: módulos por agregado, dinheiro em centavos e percentuais em bps, regras puras em `packages/domain`. Ver [ADR-0004](docs/06-decisions/ADR/0004-arquitetura-mvp-marketplace.md).
* **ADR-0005** — Bootstrap do monorepo: npm workspaces + Turborepo, Node 24, Nest 11/Prisma 6/TS 5.9 pinados, CommonJS, e o arquivamento do legado. Ver [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md).
* **ADR-0007** — Migração para ESM, NestJS 12 e Prisma 7: o Nest 12 é ESM-only, o que tornou a migração o mesmo movimento que destravava o Prisma; peer do `nestjs-zod` forçado por override; vulnerabilidades fechadas por `overrides`, não por upgrade. Revisa os pins do ADR-0005. Ver [ADR-0007](docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md).
* **ADR-0006** — Instrumentação OpenTelemetry da API: instrumentações escolhidas a dedo, SDK no primeiro import, desligado por padrão com motivo logado, coletor local em dev, span sem segredo nem PII — e a escolha do serviço gerenciado adiada até existir deploy. Ver [ADR-0006](docs/06-decisions/ADR/0006-instrumentacao-opentelemetry.md).
* **ADR-0009** — Duas linhas de integração: `develop` recebe todas as tarefas, `master` só avança a pedido explícito do Victor, e as tags de release saem só de `master`. Substitui o trunk único que vigorava desde o bootstrap. Decisão do Victor em 11/09/2026, depois de a IA recomendar o contrário — o valor buscado não é técnico, é ter uma linha que ele reconhece como aprovada por ele. Ver [ADR-0009](docs/06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md).
* **ADR-0010** — Comparador público antes do checkout: loja aparece com `status ≠ PAUSED` (`ACTIVE` governa o pedido, não a listagem), ranking por **preço entregue**, catálogo ingerido por **seed versionado** (interino, até haver console), busca por coluna normalizada + `LIKE` com gatilho nomeado para `tsvector`, paginação por offset fixada, e `CommissionRate` fora do banco. É o ADR que permitiu a J2 existir sem PSP, sem auth e sem painel do lojista. Ver [ADR-0010](docs/06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md).
* **ADR-0011** — Autenticação própria antes da escrita: JWT no header `Authorization: Bearer`, refresh opaco persistido e **rotacionado**, argon2 via `@node-rs/argon2`, `sub` = `User.id`, e uma resposta única para toda falha de credencial — mesma mensagem, mesmo status e mesmo custo de hashing. Ver [ADR-0011](docs/06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md).
* **ADR-0012** — Sessão do cliente universal e guards globais: a sessão inteira persistida sob uma chave, com `SecureStore` no nativo e `localStorage` no web (XSS é o risco aceito, com mitigações nomeadas); renovação proativa e reativa num só lugar, *single-flight*; **só a API pode encerrar uma sessão** — falha de rede não desloga; rota privada por layout de grupo e não `Stack.Protected` (que daria 404 no F5 em host estático); e os guards da API invertidos para **globais**. Ver [ADR-0012](docs/06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md).
* **ADR-0014** — O ciclo do dinheiro no pedido: o Pix continua sendo capturado **antes** do aceite, e toda saída que não é entrega termina em **devolução automática**, com a entidade `Refund` nova. A loja ganha **agenda semanal** e tem **15 minutos** para aceitar, contados só com ela aberta; vencido, auto-recusa com devolução total. Item em falta vira devolução parcial e o pedido segue. O tutor cancela livremente até o aceite. 🔴 **Não existe reversão de comissão**, porque o repasse é calculado sobre os itens entregues e só liquida em `DELIVERED`. Fecha **quatro** pendências de modelagem e destrava a `pd-15`. Ver [ADR-0014](docs/06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md).
* **ADR-0013** — Papéis de loja: preço, repasse, área de entrega e convite de membro são do `OWNER`; pedido e disponibilidade são do `OWNER` e do `OPERATOR`. 🔴 **Preço e disponibilidade são permissões separadas** — preço é decisão comercial numa margem que não absorve erro, e o pedido é registro imutável; disponibilidade é fato de prateleira, e travá-la na dona produz o pedido pago de item inexistente. Toda loja tem ao menos um `OWNER`, e o papel de loja **não vai no token**. Fecha o pré-requisito que o `SECURITY` declarava aberto e destrava a `pd-16`; a tela de convite de membro fica fora do MVP. Decisão do Victor, sem código: a implementação é a `pd-16`. Ver [ADR-0013](docs/06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md).
* **ADR-0008** — Cliente universal Expo + React Native Web **aprovado** no spike-gate: cumpre a condição que o ADR-0002 #12 deixou aberta, sem substituí-lo. O veredicto é do Victor, sustentado por medição — semântica de DOM obtida com 8 componentes-envelope e nenhuma anotação por elemento, zero violação `serious` do `axe-core`, 60 fps na lista densa. Pina o eixo Expo/React Native e mantém o fallback Expo + Next.js como saída preservada. Ver [ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md).

---

# Stack Tecnológica

Decidida no [ADR-0002](docs/06-decisions/ADR/0002-stack-tecnologica-fundacao.md), com as versões fixadas no [ADR-0005](docs/06-decisions/ADR/0005-bootstrap-monorepo.md), revisadas no [ADR-0007](docs/06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md) e ampliadas no [ADR-0008](docs/06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md): TypeScript ponta a ponta (**ESM**) · monorepo npm workspaces + Turborepo · NestJS 12 (Modular Monolith) · PostgreSQL 16 · Prisma 7 (driver adapter) · contrato REST + Zod 4 → OpenAPI canônico · auth próprio (JWT/argon2/OAuth) · **cliente universal Expo 57 + React Native Web 0.21 (spike-gate aprovado em 11/09/2026; fallback Expo + Next.js preservado como saída)** · `apps/landing` em Next.js para o que precisa de SEO · infraestrutura nova só mediante ADR.

O inventário vivo é [`docs/02-architecture/TECHNOLOGY_STACK.md`](docs/02-architecture/TECHNOLOGY_STACK.md) — fonte canônica em caso de divergência.

---

# Próximo Marco

✅ **O marco anterior — "primeira capacidade funcional do MVP em pé,
atravessando o contrato" — foi cumprido**, duas vezes: a `pd-09` (lista de
espera) e a `pd-11` (comparador), ambas do schema Zod ao endpoint testado contra
Postgres real, e daí à tela.

**O próximo marco é a primeira transação.** Um tutor escolhe uma loja no
comparador, monta o pedido, paga por Pix e a loja recebe o repasse — é o que
transforma o PetDots de guia de preços em marketplace, e é onde está todo o
risco que ainda não foi tocado: dinheiro de terceiros, idempotência, webhook.

Dois pré-requisitos, nesta ordem:

1. **`identity`** (capacidade 1) — sem autenticação não há tutor, não há loja
   dona do próprio preço e não há como abrir escrita nenhuma;
2. **Os ADRs do ciclo do dinheiro** — estorno e ajuste, prazo de aceite,
   política de cancelamento. O [`BACKLOG`](docs/07-process/BACKLOG.md)
   §"Decisões pendentes (modelagem)" é a lista; o `MVP_SCOPE`
   §"Pendências de modelagem" é a origem.

⚠️ **E fora do código:** publicar o que já existe. A landing e o comparador
rodam só em `localhost`, então o smoke test — a medição de demanda que deveria
informar tudo isso — ainda não começou.

---

# Observações

Este documento deve ser atualizado sempre que:

* um documento for concluído;
* uma decisão importante for tomada;
* uma fase do roadmap for iniciada ou concluída;
* houver mudança significativa na direção do projeto.
