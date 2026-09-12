---
title: "Relatório — pd-12/feat/identidade-e-acesso"
status: stable
version: "1.0"
updated: 2026-09-12
scope: >
  Relatório de encerramento da branch pd-12/feat/identidade-e-acesso, que pôs de
  pé a capacidade 1 do MVP_SCOPE — terceira migration do projeto (users e
  refresh_tokens), o módulo identity com cadastro, login, refresh rotacionado e
  logout, os guards AuthGuard e RolesGuard, e os usuários de desenvolvimento no
  seed versionado (ADR-0011).
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md
  - 04-api/AUTHENTICATION.md
  - 03-engineering/SECURITY.md
type: process
---

# pd-12/feat/identidade-e-acesso

**Encerrada em:** 12/09/2026
**Merge:** `ba30386` em `develop` — squash do [PR #11](https://github.com/vhaguiar07/petdots/pull/11), CI verde nos dois runs, branch removida do remoto e do clone
**ADR:** [0011 — Autenticação própria antes da escrita](../../../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md)

---

## Objetivo

A tarefa nasceu de uma pergunta operacional do Victor, em 11/09/2026, ao abrir a
aplicação:

> "Como eu logo na aplicação, agora que a home virou a sala de espera?"

A resposta era **não se loga**: a capacidade 1 do `MVP_SCOPE` — identidade e
acesso — nunca tinha sido implementada. A busca por `@UseGuards`, JWT, sessão ou
`passport` em `apps/api`, `apps/landing` e `packages/` voltava vazia, e o schema
não tinha model `User`. O login que ele lembrava era do protótipo legado
arquivado na tag `legacy-marketplace`.

Daí veio a pergunta que decidiu o desenho:

> "Precisamos arrumar alguma alternativa para isso. Como vou testar as telas no
> período de desenvolvimento?"

A análise apontou que **nenhuma tela é travada hoje** — as três rotas da landing
são públicas por desenho (ADR-0010) — e que a alternativa certa não é um
contorno paralelo, mas **usuários de desenvolvimento no seed versionado**,
decididos dentro do desenho do `identity`. Bypass de autenticação
(`AUTH_DISABLED`, `X-Dev-User`, guard que devolve `true` em dev) foi
explicitamente desaconselhado: é caminho de código que não existe em produção.

## O que foi feito

### Banco e domínio

- **`prisma/schema.prisma`** — `enum UserRole`, `model User` e
  `model RefreshToken`. `User` guarda o hash, nunca a senha; `RefreshToken`
  guarda o **SHA-256** do token, nunca o token.
- **Migration `20260912001114_create_users_and_refresh_tokens`** — a terceira do
  projeto, com **duas check constraints escritas à mão**, no precedente da
  `pd-11`: `email = lower(email)` e `roles` não vazio. A primeira é o que faz o
  índice único significar "uma pessoa, uma conta" em vez de "uma grafia, uma
  conta"; a segunda impede uma linha que autentica só para ser negada em todo
  lugar.
- **`packages/domain/src/email.ts`** — `normalizeEmail` (trim + minúsculas) e
  `isEmail`. Deliberadamente **não** remove pontos nem `+tag`: são regras de
  aliasing de provedor, e aplicá-las fundiria endereços que o dono considera
  distintos.
- **`packages/domain/src/password-policy.ts`** — mínimo 10 caracteres, máximo
  128. Função pura, para valer igual na API e no seed.

### Contratos

- **`packages/contracts/src/identity.ts`** — `registerRequestSchema`,
  `loginRequestSchema`, `refreshRequestSchema`, `logoutRequestSchema`,
  `authTokensSchema` e `authenticatedUserSchema`. 🔴 `passwordHash` **não existe
  neste arquivo**, e é o que faz o Zod removê-lo de qualquer resposta.
  ⚠️ O `loginRequestSchema` **não** aplica a política de senha: recusar um
  palpite curto com um `422` que nomeia o campo responderia diferente conforme a
  forma do palpite, antes mesmo de checar a credencial.

### Módulo `identity`

Espelha `waitlist/` (`controller → application → domain → infra`), com quatro
rotas: `POST /api/v1/auth/{register,login,refresh,logout}`.

- **`application/session-issuer.ts`** — o único lugar que monta a resposta de
  sessão, campo a campo. Um spread do `User` carregaria `passwordHash` para
  dentro de toda resposta no dia em que alguém acrescentar uma coluna.
- **`application/login.use-case.ts`** — 🔴 e-mail inexistente, e-mail malformado
  e senha errada saem pela **mesma porta**, com o mesmo corpo **e o mesmo custo
  de hashing**: quando não há usuário, a verificação roda contra um hash argon2
  real de um valor que ninguém conhece. Sem isso, o cronômetro desfaria o que a
  mensagem idêntica protege.
- **`application/refresh-tokens.use-case.ts`** — revoga o token apresentado
  **antes** de emitir o par novo, e relê o usuário do banco em vez de confiar
  nas claims de um token de até 30 dias.
- **`infra/prisma-refresh-token.repository.ts`** — a revogação é um
  `updateMany … where revokedAt: null`. Ler a linha e depois revogá-la deixaria
  dois replays simultâneos ganharem os dois.
- **`infra/jwt-token.service.ts`** — access token JWT; refresh token de 256 bits
  aleatórios, opaco, com SHA-256 no banco. O `expiresIn` é lido de volta do
  próprio token assinado, não recalculado a partir da variável de ambiente.
- **`register-user.use-case.ts`** — 🔴 o papel é `TUTOR`, decidido no servidor.
  `register` é endpoint aberto: um campo `roles` no corpo estaria a uma
  requisição da escalação de privilégio.

### Guards (`apps/api/src/common/guards/`)

`auth.guard.ts`, `roles.guard.ts`, `@Roles(...)`, `@Public()` e o tipo
`AuthenticatedRequest`. Dois pontos que a implementação fechou:

- O `AuthGuard` **valida as claims com Zod**. Um token pode ser autêntico —
  assinado com a nossa chave — e ainda carregar `roles` como string, `roles`
  vazio ou `sub` que não é UUID.
- O `RolesGuard` verifica **interseção**, não igualdade: `['TUTOR',
  'STORE_MEMBER']` passa num gate de `STORE_MEMBER`.

⚠️ Os guards **não** entram como globais — ver a decisão correspondente abaixo.

### Semente de desenvolvimento

- **`apps/api/src/seed/data/dev-users.ts`** — três contas, cabeçalho `DEV-ONLY`
  na primeira linha. `lojista@` tem **dois papéis** de propósito.
- **`apps/api/src/seed/seed-database.ts`** — `seedDevUsers` 🔴 **recusa-se a
  rodar com `NODE_ENV=production`**: avisa no log e segue semeando o catálogo,
  porque falhar levaria o catálogo junto. A validação dos usuários acontece
  antes da primeira escrita, como o resto do seed.

### Configuração

- **`envSchema`** — `JWT_SECRET` (obrigatória, sem default, mínimo 32),
  `JWT_EXPIRATION_TIME` (default `15m`, com regex de formato) e
  `REFRESH_TOKEN_EXPIRATION_DAYS` (default 30).
- **`apps/api/test/support/jest-env.ts`** — novo `setupFiles` nas duas configs
  de Jest. Sem ele, toda suíte que boota o `AppModule` passaria a falhar por
  ambiente, com um erro que parece defeito da feature sob teste.

### Docs

Nove documentos, dois deles por **contradição** e não por desatualização:

- **`04-api/AUTHENTICATION.md`** → v2.0, `draft` → `stable`. 🔴 Corrigidas as
  duas afirmações que contradiziam o `DOMAIN_MODEL`: o `sub` é o **`User.id`**,
  não o do Tutor (o documento dizia Tutor; `Tutor` nem existe no schema), e o
  cadastro cria **`User`**, não `Tutor` com evento `tutor.created`. Cada fluxo
  passou a marcar ✅/⏳.
- **`03-engineering/SECURITY.md`** → v1.2. Marcados os critérios cumpridos;
  `OWNER` × `OPERATOR` **segue desmarcado**, e agora acompanhado de outros
  quatro critérios abertos que antes não existiam como linha.
- **`01-product/DOMAIN_MODEL.md`** → v2.4. Nota "no banco desde a `pd-12`" em
  `User`, com as check constraints e a tabela irmã `refresh_tokens`; e nota em
  `Tutor` dizendo que **ainda não está no banco**.
- **`01-product/MVP_SCOPE.md`** → v2.2. Capacidade 1 deixa de ser "nada
  implementado".
- **`02-architecture/TECHNOLOGY_STACK.md`** → v1.7. As duas dependências com
  versão exata, e o porquê de `@node-rs/argon2` em vez do pacote `argon2`.
- **`03-engineering/DEVELOPMENT_GUIDE.md`** → v2.5. Seção nova **"Como logar em
  desenvolvimento"** — que é a resposta literal à pergunta que originou a
  tarefa —, as três variáveis novas e o aviso de que agora são três migrations.
- **`.env.example`** — as três variáveis, com `JWT_SECRET` claramente de exemplo
  e o `openssl rand -base64 48` ao lado.
- **`06-decisions/ADR/0011-…`** + índice do `ADR/README.md` e do
  `DECISION_LOG.md`.
- **`07-process/BACKLOG.md`** → v1.12. Ver o saldo abaixo.
- **`packages/contracts/openapi.json`** — regenerado; as quatro rotas entraram,
  e nenhuma menção a hash.

`03-engineering/TESTING_STRATEGY.md` **não** foi alterado: a entrega não criou
categoria nova de teste — e2e contra Postgres real, unitários puros e sentinelas
já são as categorias que o documento descreve.

## Migrations

| Migration | O que muda | Aplicada em |
|---|---|---|
| `20260912001114_create_users_and_refresh_tokens` | `user_role`, `users`, `refresh_tokens`; índice único em `users.email` e em `refresh_tokens.token_hash`; FK com `ON DELETE CASCADE`; e duas check constraints à mão (`users_email_lowercase_check`, `users_roles_not_empty_check`) | Postgres local do Victor (`petdots-mvp-postgres-1`, `:5437`) em 12/09/2026, e em todo container efêmero das suítes e2e |

⚠️ **É a terceira migration do projeto.** Em qualquer ambiente que já tenha
banco: `prisma migrate deploy` e depois `npm run db:seed`.

> Nota de método: as duas check constraints foram acrescentadas ao arquivo
> **depois** de o `prisma migrate dev` gerá-lo, e aplicadas ao banco local por
> `psql`, porque `prisma migrate reset` é destrutivo e foi (corretamente)
> bloqueado. Nos containers efêmeros das suítes elas são aplicadas pelo próprio
> `prisma migrate deploy`, que lê o arquivo inteiro — é ali que estão provadas.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| Escopo = authn + RBAC grosso. Fora: `StoreScopeGuard`, Google OAuth, recuperação de acesso, perfil de Tutor | IA (A1–A4), **aprovado pelo Victor no portão (P1)** |
| Credenciais de desenvolvimento: três contas `.local`, senha única `petdots-dev-2026` | **Usuário (P2)** — descartou senha por usuário e senha aleatória impressa |
| Fase 2 em Opus, IA sozinha | **Usuário (P3)** |
| argon2 via `@node-rs/argon2`, não via o pacote `argon2` (node-gyp em Windows) | IA (A5) |
| Bearer no header, não cookie `httpOnly` | IA (A6) |
| Refresh persistido, rotacionado, e revogado por `UPDATE` condicional | IA (A7) |
| Seed de usuários se recusa a rodar em produção | IA (A8) |
| `sub` = `User.id` — o `AUTHENTICATION` estava errado e foi corrigido | IA (A9) |
| Cadastro cria `User` e nada mais | IA (A10) |
| Nenhum evento de domínio emitido | IA (A11) |
| Resposta idêntica **e custo de hashing idêntico** para toda credencial inválida | IA (Fase 2) |
| Papel do cadastro decidido no servidor, nunca pelo corpo da requisição | IA (Fase 2) |
| Guards disponíveis mas **não globais**; `@Public()` já existe e é honrado | IA (A/passo 11) |
| Duas check constraints à mão em `users` | IA (Fase 2), no precedente da `pd-11` |
| Refresh token aleatório opaco com SHA-256, não JWT nem argon2 | IA (Fase 2) |
| Logout encerra **uma** sessão e é idempotente (`204` sempre) | IA (Fase 2) |
| Auditoria **não se aplica** — nenhuma das quatro mutações do `SECURITY` nasce aqui | IA (Fase 1) |

## Validações

| O quê | Resultado |
|---|---|
| Lint (`npm run lint`) | 7 tarefas, **0 erros** |
| Checagem de tipos (`npm run typecheck`) | 7 tarefas, **0 erros** |
| Build (`npm run build`) | 5 tarefas, verde |
| Formatação (`npm run format:check`) | "All matched files use Prettier code style" |
| Testes (`npm test`) | **28 suítes, 229 testes** — `@petdots/domain` 10/84, `@petdots/contracts` 5/49, `@petdots/api` 13/96. Nenhuma falha |
| Contrato OpenAPI (`npm run test:contract`) | 1 suíte, 1 teste, verde após `npm run contract:write` (+249 linhas no snapshot) |
| Smoke de boot | API subiu em `:3999` e mapeou as **quatro** rotas: `/api/v1/auth/register`, `/login`, `/refresh`, `/logout` |
| Fluxo real contra o banco semeado | login `200` (roles `STORE_MEMBER,TUTOR`, `expiresIn` 900); senha errada `401`; e-mail inexistente `401` **com corpo idêntico**; refresh `200`; replay do refresh antigo `401`; logout `204`; refresh após logout `401`; `GET /api/v1/products` **`200` sem token** |
| Seed | `52 products, 8 stores, 9 delivery areas, 354 offers, 3 users` |
| Carga do binário argon2 no Windows | `require('@node-rs/argon2')` gerou `$argon2id$v=19$m=19456,t=2,p=1$…` sem toolchain nativo — R2 verificado localmente |

> **Processos que a IA iniciou e encerrou:** um `node dist/main.js` em
> **`:3999`** (PID 25628), para o smoke de boot e o fluxo acima — porta escolhida
> justamente para não colidir com o `:3001` do Victor. **Encerrado na mesma
> resposta.** Nenhum processo dele foi tocado.

### CI — falhou na primeira tentativa, e o motivo importa

O [PR #11](https://github.com/vhaguiar07/petdots/pull/11) reprovou no primeiro
run: **Lint, Typecheck, Build, Test e Contract passaram**, e só o **Smoke de
boot** caiu, com

```
Invalid environment configuration — JWT_SECRET: Invalid input: expected string, received undefined
```

Ou seja, **a API se recusou a subir sem o segredo — exatamente como projetado**
(R5). O defeito não estava no código: estava em `.github/workflows/ci.yml`, que
não fornecia a variável. A análise previu que o `envSchema` novo quebraria o
boot de quem não atualizasse o ambiente e mitigou para o `.env` do Victor, mas
**esqueceu que o CI é um desses ambientes**.

**Correção:** o passo de smoke passa a gerar a chave na hora
(`openssl rand -base64 48`), em vez de ler um secret do repositório. O processo
serve a ninguém e morre em segundos; um valor commitado seria segredo falso em
repositório público, e um secret de verdade seria mais uma coisa a rotacionar
para um boot descartável.

✅ **R2 fechado pelo mesmo run:** `Test` passou no runner Linux, o que prova que
o binário pré-compilado do `@node-rs/argon2` funciona fora do Windows — era a
única forma de verificar isso.

### Prova de vermelho

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| 1 | `NODE_ENV === 'production'` trocado por um valor que nunca ocorre, em `seedDevUsers` | `C7 — creates no user at all` e `C7 — says why, instead of failing silently` |
| 2 | `user: { ...user, … }` no `SessionIssuer` (o spread que a decisão proíbe) | `C6 🔴 — no response of this module ever carried the password or its hash` |

Ambas revertidas em seguida; a suíte voltou ao verde.

## Roteiro de testes manuais

> Entregue ao Victor em 12/09/2026. Rótulos e mensagens **conferidos na API e na
> landing em execução**, não deduzidos do código. Os comandos são de **Git
> Bash**: no PowerShell, `curl` é apelido de `Invoke-WebRequest` e a sintaxe não
> vale.

**Preparo já executado pela IA:** migrations aplicadas (3), `npm run db:seed`
(`52 products, 8 stores, 9 delivery areas, 354 offers, 3 users`), `JWT_SECRET`
gerada no `.env` local e API de pé em `:3001` (PID 38684, `nest start --watch`).

### Bloco A — autenticação (terminal)

| # | O que fazer | O que tem de acontecer |
|---|---|---|
| A1 | `POST /api/v1/auth/login` com `lojista@dev.petdots.local` / `petdots-dev-2026` | `200`; corpo com `accessToken`, `refreshToken`, `expiresIn: 900` e `user.roles: ["STORE_MEMBER","TUTOR"]` — **dois papéis** |
| A2 | Mesmo login com senha errada | `401`, `code: UNAUTHENTICATED`, `message: "E-mail ou senha inválidos."` |
| A3 | Login com um e-mail que não existe | 🔴 `401` com **exatamente o mesmo corpo** de A2 (só `requestId` difere) |
| A4 | `POST /auth/refresh` com o `refreshToken` de A1 | `200`, par novo; `refreshToken` **diferente** do anterior |
| A5 | Repetir A4 com o **mesmo** token já usado | 🔴 `401` — a rotação queimou o anterior |
| A6 | `POST /auth/logout` com o refresh de A4 | `204`, sem corpo |
| A7 | `POST /auth/refresh` com o token de A6 | `401` |
| A8 | `POST /auth/register` com `TUTOR@dev.petdots.local` (maiúsculas) | `409`, `code: EMAIL_ALREADY_REGISTERED` — o e-mail normaliza, então a grafia diferente **não** cria conta nova |
| A9 | `POST /auth/register` com senha `curta` | `422`, `code: VALIDATION_FAILED`, `details[0].field: "password"`, mensagem "A senha precisa ter ao menos 10 caracteres." |

### Bloco B — regressão do comparador (navegador)

| # | O que fazer | O que tem de acontecer |
|---|---|---|
| B1 | Abrir `http://localhost:3002/precos` | Página "Quanto custa no seu bairro" abre **sem pedir login** |
| B2 | Buscar (`Ex.: golden 15 kg, areia, antipulgas`) e escolher um bairro | Resultados como antes; colunas `Loja`, `Preço`, `Entrega`, `Prazo`, `Total` e o selo "Menor preço total" |
| B3 | Abrir uma página de produto (`/precos/{slug}`) | Abre sem login, com as mesmas ofertas |
| B4 | `GET /api/v1/products`, `/products/{id}`, `/delivery-areas`, `/offers` **sem** header `Authorization` | Os quatro respondem `200` — os guards **não** são globais, e o comparador não pode ter regredido |

### Bloco C — banco

| # | O que fazer | O que tem de acontecer |
|---|---|---|
| C1 | `npx prisma studio`, tabela `users` | Três linhas: `admin@` (`ADMIN`), `lojista@` (`STORE_MEMBER`, `TUTOR`), `tutor@` (`TUTOR`) |
| C2 | Olhar a coluna `password_hash` | Começa com **`$argon2id$v=`** nas três — nunca a senha em texto |
| C3 | Tabela `refresh_tokens` | Linhas com `token_hash` (64 hex), e as dos passos A5–A7 com `revoked_at` preenchido |

### Resultado

**Divisão decidida pelo Victor em 12/09/2026:** *"eu só vou testar o que só eu
posso fazer; o que você pode fazer, eu não testo"*. A IA percorreu tudo que é
verificável por HTTP e por SQL; sobraram para ele os três passos que exigem olho
em tela renderizada — **percorridos e aprovados no mesmo dia**.

| Bloco | Passos | Resultado |
|---|---|---|
| A — autenticação | A1–A9 | ✅ **9/9**, contra a API em `:3001` com o banco semeado |
| B — comparador | B4 (rotas públicas) | ✅ `products`, `products/{id}`, `delivery-areas`, `offers` e `health` respondem **`200` sem header de autorização** |
| B — comparador | B1, B2, B3 | ✅ **percorridos pelo Victor em 12/09/2026**: *"/precos funcionando completamente com as seeds, ficou ótimo"* |
| C — banco | C1–C3 | ✅ três usuários com os papéis certos, `password_hash` em `$argon2id$v=1…`, `token_hash` de 64 hex, revogações registradas |

Evidência dos passos que mais importam:

- **A3 × A2** — senha errada e e-mail inexistente devolveram corpos **idênticos**
  (`401`, `UNAUTHENTICATED`, `"E-mail ou senha inválidos."`, `details: []`),
  divergindo só no `requestId`.
- **A5** — o refresh token de A1, já rotacionado em A4, devolveu `401`.
- **A7** — o refresh token de A4, revogado pelo logout de A6 (`204`), devolveu
  `401`.
- **A8** — `LOJISTA@dev.petdots.local` em maiúsculas devolveu `409`
  `EMAIL_ALREADY_REGISTERED`: a normalização impede uma segunda conta para a
  mesma pessoa.
- **C3** — 5 linhas em `refresh_tokens`, **4 revogadas**, batendo com as
  rotações e o logout executados.

⚠️ Uma armadilha do próprio roteiro: a primeira execução de B4 usou um
`productId` inventado e devolveu `404`. **Não é falha de autenticação** — é o
`PRODUCT_NOT_FOUND` que a `pd-11` decidiu de propósito (ERROR_MODEL). Refeito com
um produto real, `200`.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | 1 | **1** |
| Vigilância (com gatilho) | 17 | **21** |

**Saíram da fila:** nenhum item. O único da fila (revogar o OAuth client legado
no Google Cloud) depende de acesso que a IA não tem e **continua aberto** — e a
`pd-12` deu um motivo novo para resolvê-lo: o Google OAuth adiado precisa de um
client novo **no mesmo console**.

**Reescritos** (não saíram, mas o recorte mudou): "Terminar o MVP marketplace do
ADR-0004", que dizia que `identity` não existe, e "Escrita de ofertas pelo
lojista", cujo primeiro pré-requisito passou a estar cumprido.

**Entraram, e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| 🔴 Não existe recuperação de acesso | *Primeiro usuário real fora do seed* | Depende da decisão de **notificação transacional**, que já estava no backlog como decisão de modelagem pendente e pede ADR próprio. Sem canal, "recuperar senha" não tem como existir |
| Google OAuth adiado | *Decisão sobre vinculação de conta* **+** *OAuth client novo no Google Cloud* | Uma decisão de produto (mesmo e-mail por Google e por senha = um `User` ou dois?) e um acesso ao console que só o Victor tem. Relacionado ao item 1 da fila |
| Guards não são globais | *Primeiro endpoint autenticado* | Nada externo falta — é reavaliação deliberada. Hoje inverter obrigaria a marcar `@Public()` em todos os endpoints existentes e arriscaria o comparador |
| `StoreScopeGuard` e autorização fina | *`StoreMember` existir no schema* **e** *`OWNER` × `OPERATOR` fechado* | `StoreMember` nasce no onboarding de loja (ADR-0010); a distinção é decisão de produto do Victor, e é o critério que o `SECURITY` declara pré-requisito |

Dois itens novos na **intervenção manual do Victor** (que não altera a contagem
da fila): **9 — gerar o `JWT_SECRET` do `.env` local** e **10 — decidir `OWNER`
× `OPERATOR`**.

## Pendências geradas

- Quatro linhas na **vigilância** do [`BACKLOG.md`](../../BACKLOG.md), cada uma
  com gatilho nomeado (tabela acima).
- Dois itens na seção **"Intervenção manual do Victor"** do mesmo documento.
- Uma nota no item **"Notificação transacional"** das decisões pendentes: ele
  ganhou um segundo dependente (a recuperação de acesso).
- 🔴 **Ação imediata do Victor, antes de subir a API:** acrescentar `JWT_SECRET`
  ao `.env` local (`openssl rand -base64 48`). É obrigatória e sem default — a
  API **não sobe** sem ela. Item 9 da intervenção manual.

**Nenhum bug** foi encontrado durante a tarefa; `BUGS.md` não mudou.
