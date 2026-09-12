---
title: "Relatório — pd-13/feat/login-e-comparador-no-app"
status: stable
version: "1.0"
updated: 2026-09-12
scope: >
  Encerramento da pd-13: login por interface no apps/app, GET /auth/me como
  primeiro endpoint autenticado, inversão dos guards da API para globais, dois
  endpoints públicos de loja, e a substituição das telas do spike pelas telas
  reais sobre a API. Registra decisões, validações com números, prova de
  vermelho, saldo do backlog e o bug encontrado nos testes manuais.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md
  - 08-features/identity/IDENTIDADE_E_ACESSO.md
type: process
---

# pd-13/feat/login-e-comparador-no-app

**Encerrada em:** 12/09/2026
**Merge:** `b9a6520` em `develop` (PR [#12](https://github.com/vhaguiar07/petdots/pull/12))
**ADR:** [0012 — Sessão do cliente universal e guards globais](../../../06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md)

---

## Objetivo

Victor, abrindo a Fase 1 em 12/09/2026:

> "quero logar pela interface e navegar as telas do sistema com dados de
> verdade. Hoje não existe tela de login em lugar nenhum, e as quatro telas do
> `apps/app` (`index`, `loja/[storeId]`, `checkout`, `painel`) são do spike,
> alimentadas por fixtures em `apps/app/src/spike/fixtures/` — só o indicador de
> saúde fala com a API."

O escopo combinado no encerramento da `pd-12`:

> "login por interface no `apps/app` + as telas que têm backend real atrás
> passando a ler a API (comparador e loja). `checkout` e `painel` **não**
> entram: dependem de `orders`, `payments` e `StoreScopeGuard`, que são as
> `pd-15`, `pd-17` e `pd-16`."

## Diagnóstico

A análise (Fase 1, Fable) mediu três coisas que o briefing não sabia, e as três
mudaram o recorte apresentado no portão.

| # | O que estava errado | Como se sabe |
|---|---|---|
| 1 | **Um login que não destranca nada não prova nada.** Nenhuma tela do recorte exigia login e **nenhum endpoint exigia token**: o `AuthGuard` não estava aplicado a rota nenhuma, e os guards nasceram "disponíveis, não globais" (ADR-0011, R3) | Leitura de `apps/api/src/**`: zero ocorrências de `@UseGuards` fora do teste descartável de `guards.e2e-spec.ts` |
| 2 | **A tela da loja não tinha backend.** A premissa "telas que têm backend real atrás (comparador e loja)" estava meio errada | A API tinha `GET /products`, `/products/{id}`, `/delivery-areas` e `/offers?productId=`. **Não existia** `GET /stores/{id}` nem lista de ofertas de uma loja |
| 3 | **O CORS estava desligado no ambiente do Victor** — e o sintoma engana: o badge diz "API: fora do ar" com a API de pé | `curl -I -H 'Origin: http://localhost:8081' localhost:3001/api/v1/health` não devolvia `Access-Control-Allow-Origin`; `main.ts` só liga CORS quando `CORS_ORIGINS` existe |

## O que foi feito

### Frente A — API

- **`GET /api/v1/auth/me`** (`find-authenticated-user.use-case.ts`) — o primeiro
  endpoint autenticado da API. **Relê a linha do banco** por `request.user.id`
  em vez de ecoar as claims: o token é uma cópia de 15 minutos, o e-mail não
  está nele, e uma conta apagada há um minuto ainda tem token que verifica.
  Usuário inexistente → `401`, pela porta única de toda falha de autenticação.
- **Guards globais** (`identity.module.ts`) — `AuthGuard` e `RolesGuard` como
  `APP_GUARD`, nessa ordem. Ficam no `IdentityModule` e não no `AppModule`
  porque o `AuthGuard` injeta `JwtService`, que aquele módulo já configura;
  registrá-lo ali evita uma segunda configuração do mesmo segredo.
  **Toda rota passa a nascer fechada**; as abertas se declaram com `@Public()`.
- **Dois endpoints públicos de loja** — `GET /stores/{storeId}` (loja + áreas
  **ativas**) e `GET /stores/{storeId}/offers` (a prateleira, ordenada por nome
  do produto em pt-BR). Loja `PAUSED` → `404 STORE_NOT_FOUND` **nos dois**, pela
  mesma regra da listagem (ADR-0010).
- **`list-store-offers.use-case.ts`** resolve a loja por `stores.FindStoreUseCase`
  (deixando o `404` propagar) e os produtos **em lote** por
  `catalog.ListProductsByIdsUseCase` — uma consulta `IN`. Chamar
  `FindProductUseCase` num laço transformaria uma vitrine de cinquenta itens em
  cinquenta consultas.
- **`stores.controller.ts` renomeado para `delivery-areas.controller.ts`**, e um
  `stores.controller.ts` novo para `/stores`. A tag Swagger continua `stores`
  nos dois, para o contrato publicado só ganhar rotas em vez de mover as antigas.
- **`openapi.ts`** — `addBearerAuth()`, sem o qual o `@ApiBearerAuth()` seria
  silenciosamente ignorado e o contrato não diria que `/auth/me` exige token.

### Frente B — `apps/app`, fundação da sessão

- **`src/api/http.ts`** — o único lugar que lê `EXPO_PUBLIC_API_URL`, e toda a
  lógica de renovação: **proativa** (30 s antes de expirar), **reativa** (um
  `401` numa chamada com `Bearer` dispara um refresh e uma repetição) e
  **single-flight**.
- **`src/session/session-storage.ts`** (nativo, `SecureStore`) e
  **`.web.ts`** (`localStorage`) — duas implementações da mesma porta, escolhidas
  pelo Metro por sufixo de plataforma. A interface e o parse ficam num terceiro
  arquivo para as metades não poderem divergir.
- **`session-state.ts`** — máquina pura, sem React. **`session-context.tsx`** —
  lê o armazenamento **depois da montagem**, exigência do export estático.
- **`src/api/{identity,catalog,offers,stores}.ts`** — todas as respostas
  parseadas com os schemas de `@petdots/contracts`, nunca aceitas por confiança.

### Frente C — telas

`src/spike/` **apagado por inteiro**; `src/spike/ui/` promovido a `src/ui/`.
Cinco telas novas em `src/screens/`: busca, comparação, vitrine da loja, login e
conta. `/checkout` e `/painel` **deixaram de existir** até a `pd-15`/`pd-16`.

### Frente D — documentação

ADR-0012 (novo) · `08-features/identity/IDENTIDADE_E_ACESSO.md` (novo) ·
`ADR/README.md` · `DECISION_LOG.md` · `COMPARADOR_DE_PRECOS.md` ·
`AUTHENTICATION.md` (v2.1) · `ERROR_MODEL.md` (v1.4) · `SECURITY.md` (v1.3) ·
`DEVELOPMENT_GUIDE.md` (v2.6) · `TESTING_STRATEGY.md` (v1.2) ·
`TECHNOLOGY_STACK.md` (v1.8) · `USER_JOURNEYS.md` (v2.3) ·
`FEATURE_CATALOG.md` (v2.3) · `MVP_SCOPE.md` (v2.3) · `AI_CONTEXT.md` (v3.2) ·
`BACKLOG.md` (v1.13) · `BUGS.md` (v1.3) · `IDEIAS.md` (v1.7) ·
`PROJECT_STATE.md` (v4.8) · `packages/contracts/openapi.json` (regenerado).

**Dois documentos contradiziam o código, e não estavam só desatualizados:**

- **`AI_CONTEXT.md`** afirmava que "não existe autenticação" — errado desde a
  `pd-12`. É o primeiro documento que um agente lê.
- **`DEVELOPMENT_GUIDE.md`** dizia que `packages/ui` nasceria "quando houver
  componente compartilhado entre telas". O gatilho estava errado, e o código
  provava: as primitivas já eram compartilhadas. Corrigido para **segundo
  workspace React Native consumidor**.

**Encontrado de passagem (§3.2):** o `PROJECT_STATE.md` estava defasado em
**duas** tarefas — não registrava a `pd-12`. Corrigido aqui, com as duas.

## Migrations

**Nenhuma.** A `pd-13` não tocou o schema; `users` e `refresh_tokens` são da
`pd-12`, e os endpoints de loja leem tabelas da `pd-11`.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| **P1** — criar `/auth/me` e inverter os guards para globais nesta tarefa | **Usuário** (12/09/2026, *"Vamos com suas recomendações"*) |
| **P2** — os dois endpoints de loja entram no escopo | **Usuário**, mesma decisão |
| **P3** — o spike sai por inteiro; `/checkout` e `/painel` deixam de existir | **Usuário**, mesma decisão — reconfirmada em 12/09 ao rever as telas: *"vamos continuar assim"* |
| **P4** — sessão no `localStorage` no web, com XSS como risco aceito | **Usuário**, mesma decisão |
| A1–A7, A13 — armazenamento por plataforma, renovação, proteção de rota por layout | IA (ADR-0012) |
| A12 — `packages/ui` **não** nasce; gatilho corrigido | IA |
| **Critério da renovação reativa é `auth`, não o caminho da URL** | IA — **corrige o plano**, ver abaixo |
| **Login sem `?next=` vai para `/conta`** | IA — **corrige o plano**, ver abaixo |
| Gravar `CORS_ORIGINS` no `.env` local do Victor | **Usuário** (12/09/2026, *"Crie a env você"*) — o plano previa que a IA não escrevesse no `.env`; ele instruiu o contrário |
| Levantar API e app pela IA durante a Fase 3 | **Usuário** (*"Levante a aplicação"*), depois devolvidos a ele a pedido |

### Duas correções ao plano, detectadas na implementação

1. **A regra da renovação reativa estava errada.** O plano dizia "um `401` numa
   rota que **não é** `/auth/*` dispara um refresh". Isso excluiria `/auth/me` —
   a única rota autenticada que existe —, desligando a renovação reativa por
   inteiro. O critério correto é **ter mandado `Bearer`**, que já exclui
   `login`/`refresh`/`logout`, cujo `401` significa "senha errada". **Pego por
   teste**, não por leitura.
2. **O plano se contradizia sobre o destino do login.** O passo 24 especificava
   `router.replace(next ?? '/')`; o critério **C6** e o roteiro A1 exigiam
   `/conta`. Ficou `/conta`: quem clica "Entrar" quer ver que entrou.

## Validações

| O quê | Resultado |
|---|---|
| Lint | 7 tarefas, **0 erros** |
| Checagem de tipos | 7 tarefas, **0 erros** |
| Build | 5 tarefas verdes |
| `format:check` | limpo |
| Testes | **32 suítes, 283 testes** — `domain` 10/84, `contracts` 5/56, **`app` 3/28 (nova)**, `api` 14/115. Baseline `pd-12`: 28 suítes, 229 testes |
| Teste de contrato | **1/1 verde**; o diff do `openapi.json` traz as três rotas novas e `securitySchemes.bearer` |
| Smoke de boot | API em **`:3999`** → `200`; `/auth/me` `401`, `/products` e `/delivery-areas` `200`. Subida e derrubada na mesma resposta |
| Export estático do app | `expo export --platform web` gera `index`, `entrar`, `conta` (com o placeholder), `precos/[productSlug]`, `loja/[storeId]` — e **não** gera `checkout.html`/`painel.html` |
| CORS | Com `CORS_ORIGINS` no `.env`: `Access-Control-Allow-Origin: http://localhost:8081`, e preflight do `POST` com `authorization` → `204` |

⚠️ **O diff do contrato tem uma remoção**, e ela é esperada:
`operationId: StoresController_list` virou `DeliveryAreasController_list`,
consequência direta do rename da classe. Nenhuma rota saiu.

### Bloco C do roteiro (executado pela IA)

| # | Verificação | Resultado |
|---|---|---|
| C1 | `/auth/me` sem header | `401` `UNAUTHENTICATED` |
| C2 | `/auth/me` com `Bearer` do `lojista@` | `200` `{id, email, roles:["STORE_MEMBER","TUTOR"]}`; sem `passwordHash` nem `$argon2` no corpo |
| C3 | `/health`, `/products`, `/products/{id}`, `/delivery-areas`, `/offers?productId=` sem header | `200` ×5; `POST /waitlist-entries` inválido → `422`. **Nenhum `401`** |
| C4 | `/stores/{id}` do seed / UUID inexistente / `nao-e-uuid` | `200` (1 área ativa) / `404 STORE_NOT_FOUND` / `422 VALIDATION_FAILED` |
| C5 | `/stores/{id}/offers` | `200`, **38 itens**, ordenados em pt-BR, todos com preço positivo |

### Prova de vermelho

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| 1 | Remover `@Public()` de `CatalogController` | **13 testes**: as 12 da suíte `catalog` com `401` no lugar de `200`/`404`/`422`, **e o sentinela `public-routes`** |
| 2 | Trocar `if (!user)` por `if (false)` em `FindAuthenticatedUserUseCase` | O teste do usuário apagado: `500` no lugar de `401` |

Ambas revertidas. A mutação 1 é a que importa: prova que o sentinela pega a
regressão que o ADR-0011 mais temia — o comparador público respondendo `401`.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | 1 | **1** |
| Vigilância (com gatilho) | 21 | **23** |

**Saíram da vigilância:** "Os guards de autenticação não são globais — gatilho:
primeiro endpoint autenticado". O gatilho disparou com `/auth/me` e foi
resolvido aqui (regra §3.2).

**Saiu das features:** "J2 no `apps/app` sobre os endpoints da `pd-11`" —
entregue.

**Entraram, e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| Web do `apps/app` sem CSP | **deploy do app web** | Não existe onde publicar; a CSP é servida pelo host |
| Caminho nativo do `SecureStore` não exercitado | **primeiro build nativo** (Expo Go ou EAS) | O projeto não tem build nativo configurado |
| Sessão não sincroniza entre abas | **primeiro relato de logout inesperado** | Exige `storage` events ou `BroadcastChannel`; aceito para o MVP |

A fila não mudou de tamanho: continua no único item do console do Google Cloud,
que depende de acesso que a IA não tem.

## Avaliações obrigatórias da Fase 1

- **Auditoria:** **não se aplica.** Nenhuma das quatro mutações que o `SECURITY`
  manda rastrear (preço, aceite/recusa, comissão, categoria) nasce aqui — toda a
  superfície nova da API é leitura. Os eventos de autenticação já vão ao logger
  estruturado desde a `pd-12`.
- **Documentação:** 20 arquivos, listados acima. Dois **contradiziam o código**.
- **Testes:** nasceram (i) a **primeira suíte do `apps/app`**; (ii) e2e de
  `/auth/me` dentro da varredura anti-hash; (iii) o **sentinela das rotas
  públicas**; (iv) e2e dos dois endpoints de loja. A fixture de teste ganhou uma
  **área de entrega inativa**, para a regra "só áreas ativas" ter o que provar.

## Pendências geradas

- **`BACKLOG.md`** — três itens novos na vigilância (acima), e o item **11** da
  intervenção manual: `CORS_ORIGINS` no `.env` **e no ambiente de deploy quando
  existir**. O item **3** (copy) passou a citar as cinco telas do `apps/app`.
- **`BUGS.md`** — **`BUG-R01`**, nascido direto em *Resolvidos*: `/conta`
  travava em "Carregando sua sessão…" para sempre quando `GET /auth/me` falhava
  com qualquer erro que não fosse `ApiUnavailableError`. **Reproduzido pelo
  Victor nos testes manuais da Fase 3** e corrigido na mesma tarefa (§4), por
  isso sem linha no backlog. O caso reforça o item de vigilância "sem teste
  automatizado de interface": as telas do `apps/app` não têm teste de
  renderização por decisão registrada (ADR-0012, A11), e foi o roteiro manual
  que pegou.
- **`IDEIAS.md`** — a "Página pública da loja" passou a dizer que a vitrine
  existe no app desde a `pd-13`; o que continua sem dono é a página **SEO** na
  landing, por `slug`.
