---
title: Authentication
status: stable
version: "2.2"
updated: 2026-09-12
scope: >
  Fluxo de autenticação da API do PetDots: JWT access/refresh, Google OAuth,
  header de autorização, ciclo de vida e revogação de token, e como a autorização
  por ownership é aplicada na borda. Complementa SECURITY (postura/porquê) sem
  duplicá-la. Deriva do ADR-0002. Não define o formato de erro (ERROR_MODEL) nem
  as convenções gerais de REST (API_GUIDELINES).
relates_to:
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md
  - 06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md
  - 03-engineering/SECURITY.md
  - 04-api/API_GUIDELINES.md
  - 04-api/ERROR_MODEL.md
  - 01-product/DOMAIN_MODEL.md
type: api
---

# PetDots — Authentication

> Este documento descreve o **fluxo** de autenticação da API. A **postura e o
> porquê** (auth própria, soberania de dados, LGPD, gestão de segredos) vivem em
> [`SECURITY`](../03-engineering/SECURITY.md) — **complementam-se, não se
> duplicam**. Deriva do [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md)
> e do [ADR-0011](../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md).

> ✅ **Implementado na `pd-12`** (12/09/2026): cadastro, login por senha,
> refresh, logout, `AuthGuard` e `RolesGuard`. **Ampliado na `pd-13`**
> (12/09/2026): `GET /auth/me`, os guards passaram a **globais**, e o login
> ganhou interface no `apps/app`. O que ainda **não existe** está marcado ⏳ ao
> longo do documento. A versão 2.0 corrigiu duas afirmações que contradiziam o
> `DOMAIN_MODEL` — ver a nota em *Claims* e a linha de Cadastro.

---

## Objetivo

Definir **como um cliente se autentica na API do PetDots** e como cada requisição
prova identidade e permissão. A identidade é **própria** (no nosso PostgreSQL),
não terceirizada (ADR-0002).

**Não cobre:** a postura de segurança e LGPD → [`SECURITY`](../03-engineering/SECURITY.md);
o formato das respostas `401`/`403` → [`ERROR_MODEL`](./ERROR_MODEL.md); as
convenções gerais de REST → [`API_GUIDELINES`](./API_GUIDELINES.md).

---

## Mecanismo

- **Access token:** JWT curto (`JWT_EXPIRATION_TIME`, default `15m`), assinado
  com `JWT_SECRET`. Expira sozinho; não há revogação ativa dele.
- **Refresh token:** **não é JWT**. São 256 bits aleatórios em base64url, e o
  banco guarda apenas o **SHA-256** deles (`refresh_tokens.token_hash`).
  Aleatório porque nada precisa ser lido de dentro dele — ele é procurado na
  tabela; SHA-256 e não argon2 porque a entrada já tem entropia máxima, e o
  custo do argon2 existe para retardar adivinhação de senha humana.
- **Senhas** com hashing **argon2** (`@node-rs/argon2` — ADR-0011, A5); nunca
  trafegam nem são logadas.
- ⏳ **Google OAuth** como login social, resolvido para a identidade no nosso
  banco — **adiado** (ADR-0011, A3): depende de um OAuth client novo no Google
  Cloud e da decisão de produto sobre vinculação de conta.
- **Header de autorização:** `Authorization: Bearer <accessToken>` em toda
  requisição autenticada — e **não** cookie `httpOnly`: a superfície logada do
  MVP é `apps/app` (Expo, ADR-0008) e a landing continua pública (ADR-0010).

### Claims do access token

O payload identifica o **Usuário** e seus papéis, sem dados sensíveis:

- `sub` — `id` (UUID) do **`User`**.
- `roles` — papéis para o RBAC (ver `SECURITY`). É **lista**, porque um mesmo
  humano acumula papéis.
- `exp` / `iat` — expiração curta (constante `JWT_EXPIRATION_TIME` —
  `NAMING_CONVENTIONS`).

> ⚠️ **Correção da v1.1 (ADR-0011, A9).** Até a versão 1.1 este documento dizia
> que o `sub` era o `id` do **Tutor**. Está errado: o `DOMAIN_MODEL` define
> `User` como a identidade autenticável e `Tutor` como *"perfil de consumo de um
> Usuário"* — entidade separada, com `user_id`. Pela ordem canônica de
> `docs/README.md`, o `DOMAIN_MODEL` prevalece. Além disso `Tutor` **ainda não
> existe no schema**: um `sub` de Tutor não teria a que se referir.

> 🔴 **O guard não confia na assinatura sozinha.** Um token pode ser autêntico
> — assinado com a nossa chave — e ainda assim carregar claims que não são
> nossas (`roles` como string, `roles` vazio, `sub` que não é UUID). O
> `AuthGuard` **valida o payload com Zod** antes de publicá-lo em
> `request.user`.

A autorização **fina por instância** (quais lojas o usuário opera, quais pedidos
são dele) **não** vive no token: deriva do vínculo `store_members` e da posse do
pedido em tempo de requisição (ver abaixo).

---

## Fluxos

| | Fluxo | Endpoint | Resultado |
|---|-------|----------|-----------|
| ✅ | Cadastro | `POST /api/v1/auth/register` → `201` | cria **`User`** com papel `TUTOR` e emite tokens |
| ✅ | Login (senha) | `POST /api/v1/auth/login` → `200` | valida argon2; emite access + refresh |
| ⏳ | Login (Google) | `POST /api/v1/auth/google` | valida OAuth; resolve/cria o `User`; emite tokens |
| ✅ | Renovar | `POST /api/v1/auth/refresh` → `200` | troca refresh válido por novo access **e** refresh rotacionado |
| ✅ | Logout / revogar | `POST /api/v1/auth/logout` → `204` | revoga o refresh token apresentado |
| ✅ | Sessão corrente | `GET /api/v1/auth/me` → `200` | **exige `Bearer`**; relê a linha e devolve `{ id, email, roles }` |
| ⏳ | Recuperar acesso | `POST /api/v1/auth/password-reset` | inicia recuperação — **não existe** (ADR-0011, A4) |

> ⚠️ **Correção da v1.1 (ADR-0011, A10).** Até a versão 1.1 esta tabela dizia
> que o cadastro criava um `Tutor` e emitia `tutor.created`. O cadastro cria
> **`User` e nada mais**: `Tutor` é a capacidade 2 do `MVP_SCOPE` — pets,
> endereços e agendas de reposição — e não nasce na autenticação. Nenhum evento
> de domínio é emitido, pelo mesmo motivo da `pd-09`: não há barramento
> in-process nem consumidor (ADR-0011, A11).

> 🔴 **Toda credencial inválida devolve a mesma resposta.** E-mail inexistente,
> e-mail malformado e senha errada produzem o mesmo `401` com o mesmo corpo
> (`UNAUTHENTICATED`, *"E-mail ou senha inválidos."*) e pagam o **mesmo custo de
> hashing**. Distinguir os casos — por mensagem, por status ou pelo tempo de
> resposta — entregaria um oráculo de "este e-mail tem conta aqui". Quem
> acrescentar um caso novo mantém a resposta idêntica.

> ⏳ **Não existe recuperação de acesso.** Quem esquece a senha fica trancado.
> É consequência aceita e datada (ADR-0011, A4/R1): depende do canal de
> notificação transacional, que é decisão de modelagem pendente. Está no backlog
> com gatilho *primeiro usuário real fora do seed*.

> Os caminhos acima ficam sob `/api/v1/auth` e seguem `API_GUIDELINES` na base
> versionada e no JSON camelCase, sobre o contrato OpenAPI canônico. **Exceção
> consciente:** fluxos de autenticação são **ações** (login, refresh, logout), não
> recursos CRUD — exceção pragmática e comum em REST à regra "sem verbos na URL"
> do `API_GUIDELINES`/`NAMING_CONVENTIONS`.

---

## Ciclo de vida e revogação do token

- **Access token** é curto; expira sem necessidade de revogação ativa.
- **Refresh token** é persistido/rastreado para permitir **revogação** (logout,
  troca de senha, suspeita de comprometimento) e **rotação** a cada uso.
- **A rotação é atômica.** Renovar revoga o token apresentado *antes* de emitir
  o par novo, e a revogação é um `UPDATE … WHERE revoked_at IS NULL` — a
  condição vive no próprio comando. Ler a linha e depois revogá-la deixaria dois
  replays simultâneos ganharem os dois, e uma rotação que pode ser repetida é
  rotação só no nome.
- **Logout encerra uma sessão, não todas.** Fechar uma aba não desconecta o
  celular. Matar todas as sessões (troca de senha, suspeita de comprometimento)
  é ação distinta e ⏳ ainda não existe.
- **Logout é idempotente e mudo:** `204` mesmo para um token que não existe —
  um `404` confirmaria quais strings são tokens de verdade.
- **Rotação/revogação de chave de assinatura** faz parte do backlog perpétuo de
  segurança do auth próprio (ADR-0002 / `SECURITY`).

---

## Autorização na borda (authn × authz)

A autenticação prova **quem é**; a autorização decide **o que pode**:

- ✅ **AuthGuard** valida o JWT e o formato das claims → `401` se ausente,
  inválido ou com claims que não são nossas. Publica `{ id, roles }` em
  `request.user` — e nada mais: nem e-mail, nem hash, nem o token cru.
- ✅ **RolesGuard** verifica o papel (`TUTOR`, `STORE_MEMBER`, `ADMIN`) → `403`
  se o papel não permite a operação. 🔴 **A verificação é uma interseção**, não
  uma igualdade: `roles` é lista porque um mesmo humano acumula papéis — o dono
  de petshop que também tem pet é `['TUTOR', 'STORE_MEMBER']` —, e comparar a
  lista inteira o trancaria fora das duas metades do produto.
- ⏳ **StoreScopeGuard** verificaria o vínculo `store_members` (papel `OWNER`
  vs. `OPERATOR`) para todo acesso a dado de loja → `403` se sem permissão
  (`SECURITY`, `SYSTEM_ARCHITECTURE`). Um lojista jamais lê pedido ou preço de
  outra loja. **Não existe** (ADR-0011, A2): `StoreMember` não está no schema.
  ✅ Dos dois pré-requisitos, **um caiu** — a distinção `OWNER` × `OPERATOR`
  está fechada (ADR-0013, 12/09/2026); falta `StoreMember` no banco, que nasce
  com o painel do lojista na `pd-16`.
- O **formato** dessas respostas de falha é o do [`ERROR_MODEL`](./ERROR_MODEL.md).

> ✅ **Os guards são globais desde a `pd-13`.** Estão registrados como
> `APP_GUARD` no `IdentityModule` — `AuthGuard` primeiro, `RolesGuard` depois,
> porque o segundo depende do primeiro ter rodado. Ficam ali, e não no
> `AppModule`, porque o `AuthGuard` injeta `JwtService`, que o `IdentityModule`
> já configura e exporta.
>
> 🔴 **Toda rota nasce fechada.** As abertas dizem isso com `@Public()`: na
> classe de `HealthController`, `WaitlistController`, `CatalogController`,
> `StoresController`, `DeliveryAreasController`, `OffersController` e
> `StoreOffersController`; e nos quatro *handlers* de ação do
> `IdentityController` — nunca na classe dele, porque `/auth/me` precisa
> continuar fechada.
>
> O gatilho que a v2.0 registrou ("primeiro endpoint autenticado") disparou com
> `/auth/me` e foi resolvido aqui (ADR-0012). O que protege o comparador da
> inversão é `apps/api/test/public-routes.e2e-spec.ts`: ele percorre as rotas
> abertas sem `Authorization` e falha se alguma responder `401`.

> ✅ **A distinção `OWNER` × `OPERATOR` está fechada** desde 12/09/2026
> ([ADR-0013](../06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md)), e
> com ela cai o pré-requisito que faltava para desenhar a autorização fina.
> Em uma linha: **preço, repasse, área de entrega e convite de membro são do
> `OWNER`; pedido e disponibilidade são dos dois.** 🔴 **`StoreRole` não entra
> no token** — o JWT diz apenas que a pessoa opera *alguma* loja, e qual loja
> com que poder é o vínculo `store_members`, lido em tempo de requisição. Pôr o
> papel de loja nas claims faria uma permissão revogada valer até o token
> expirar. A tabela completa está no `SECURITY`; a implementação é a `pd-16`.

---

## No cliente

O contrato acima é o da API. **Como o `apps/app` guarda e renova essa sessão é
decisão separada**, com custo de reversão próprio, e vive no
[ADR-0012](../06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md).
O resumo operacional, em uma tabela:

| Pergunta | Resposta |
|---|---|
| Onde a sessão fica | `SecureStore` no nativo, `localStorage` no web — chave `petdots.session` |
| O que é guardado | `{ accessToken, refreshToken, expiresAt, user }` |
| Quando renova | 30 s antes de expirar, e uma vez ao receber `401` numa chamada com `Bearer` |
| Renovações concorrentes | *Single-flight*: compartilham a mesma Promise, senão a rotação desloga a segunda |
| Refresh recusado com `401` | Sessão encerrada, `/entrar` diz "Sua sessão expirou. Entre de novo." |
| Refresh que falhou por **rede** | 🔴 **Sessão mantida.** Só a API pode encerrá-la |

A leitura transversal da feature — banco, API e cliente juntos — está em
[`08-features/identity/IDENTIDADE_E_ACESSO.md`](../08-features/identity/IDENTIDADE_E_ACESSO.md).

---

**O webhook do PSP é a exceção.** Ele não usa JWT: a autenticidade vem da
**assinatura** da requisição, verificada antes de qualquer processamento, e o
tratamento é idempotente por `psp_payment_id` (`SECURITY`).

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define o mecanismo (JWT access + refresh opaco, argon2, header Bearer).
- [x] Lista os fluxos de auth como recursos sob `/api/v1/auth`, coerentes com `API_GUIDELINES`.
- [x] Descreve ciclo de vida, rotação e revogação de token.
- [x] Separa authn de authz (AuthGuard/RolesGuard/StoreScopeGuard → 401/403), remetendo postura a `SECURITY` e formato a `ERROR_MODEL`.
- [x] Registra a exceção do webhook do PSP (assinatura, não JWT).
- [x] Descreve o que **existe** e o que ainda **não existe**, sem afirmar o segundo como pronto (`pd-12`, 12/09/2026).
- [x] Corrigido contra o `DOMAIN_MODEL`: `sub` é `User.id` e o cadastro cria `User` (ADR-0011, A9/A10).
- [x] Registra `GET /auth/me` e a inversão dos guards para globais (`pd-13`, ADR-0012).
- [x] Aponta para onde a sessão vive no cliente, sem duplicar o ADR-0012.
- [ ] Google OAuth implementado. *(Aberto: depende de OAuth client novo e da decisão sobre vinculação de conta — ADR-0011, A3.)*
- [ ] Recuperação de acesso implementada. *(Aberto: depende do canal de notificação transacional — ADR-0011, A4.)*
- [x] Distinção de permissão `OWNER` × `OPERATOR` fechada antes da autorização fina — 12/09/2026, [ADR-0013](../06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md).
