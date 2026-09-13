---
title: Feature — Identidade e Acesso
status: stable
version: "1.1"
updated: 2026-09-12
scope: >
  Visão transversal da autenticação do PetDots — banco, API e cliente numa
  leitura só: as tabelas users e refresh_tokens, as cinco rotas de /auth
  incluindo /auth/me, os guards globais, o login pela interface no apps/app,
  onde a sessão fica guardada em cada plataforma e como ela é renovada, o que a
  feature deliberadamente ainda não faz, e como o Victor loga hoje.
relates_to:
  - 01-product/USER_JOURNEYS.md
  - 01-product/DOMAIN_MODEL.md
  - 04-api/AUTHENTICATION.md
  - 04-api/ERROR_MODEL.md
  - 03-engineering/SECURITY.md
  - 06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md
  - 06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md
type: product
---

# Feature — Identidade e Acesso

> Leitura transversal de **uma** feature: banco → API → cliente, o que ela não
> faz, e como operá-la. O detalhe de cada camada continua nos documentos
> canônicos — [`AUTHENTICATION`](../../04-api/AUTHENTICATION.md) para o contrato
> das rotas, [`SECURITY`](../../03-engineering/SECURITY.md) para papéis e
> proteção de dados, os ADR [0011](../../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md)
> e [0012](../../06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md)
> para o porquê de cada escolha.

---

## O que é

Quem é a pessoa que está usando o PetDots, e o que ela pode fazer.

Entregue em duas partes: a **`pd-12`** (12/09/2026) construiu a autenticação na
API — cadastro, login, renovação e logout, com senha em argon2 e refresh token
rotacionado. A **`pd-13`** (12/09/2026) trouxe o login **pela interface** no
`apps/app`, criou o primeiro endpoint que exige token e fechou a API por
padrão.

A **`pd-14`** (12/09/2026) fechou a última lacuna do cadastro: a **tela**
`/cadastro`, que até então não existia — criar conta dependia de `curl`.

É a **capacidade 1** do [`MVP_SCOPE`](../../01-product/MVP_SCOPE.md) e o primeiro
passo da jornada **J1**. O restante da J1 — endereço e pet — é o agregado
`Tutor`, entregue na `pd-14`: ver
[`PERFIL_DO_TUTOR_E_PETS`](../tutors/PERFIL_DO_TUTOR_E_PETS.md).

---

## Banco

Duas tabelas, ambas da `pd-12`. **A `pd-13` não criou migration nenhuma.**

| Tabela | O que guarda |
|---|---|
| `users` | A identidade autenticável: `email` (único), `password_hash`, `roles[]` |
| `refresh_tokens` | Um refresh token revogável por sessão: `token_hash` (único), `expires_at`, `revoked_at` |

**`roles` é uma lista, não um valor.** Uma pessoa é uma linha só mesmo quando é
lojista *e* tutor — é o caso que quebra um `RolesGuard` escrito com igualdade em
vez de interseção (`DOMAIN_MODEL` §Usuário, ADR-0011 R4).

**Só o hash é guardado**, dos dois lados. `refresh_tokens.token_hash` é um
verificador de credencial, não a credencial — exatamente como
`users.password_hash`. Persistir o refresh token é o que faz o logout significar
alguma coisa: um access token expira sozinho, mas um refresh token que ninguém
rastreia nunca pode ser retomado.

---

## API

Cinco rotas sob `/api/v1/auth`. As quatro primeiras são **abertas**; `/auth/me`
é a única fechada — e a primeira rota autenticada da API inteira.

| Rota | Status | O que faz |
|---|---|---|
| `POST /auth/register` | `201` | Cria `User` com papel `TUTOR` e devolve uma sessão. O corpo **não** escolhe papéis |
| `POST /auth/login` | `200` | Troca credenciais por um par de tokens |
| `POST /auth/refresh` | `200` | Rotaciona: o token apresentado deixa de valer |
| `POST /auth/logout` | `204` | Revoga um refresh token. Idempotente, e responde `204` para qualquer string |
| `GET /auth/me` | `200` | **Requer `Authorization: Bearer`.** Devolve `{ id, email, phone, roles }` |

> **`phone` entrou na `pd-14`.** Ele é `null` até o tutor salvar o perfil.
> Quem o escreve é `UpdateUserPhoneUseCase`, deste módulo, chamado pelo
> `tutors` — que não toca a tabela `users`. Como o `user` da sessão mudou de
> forma, **uma sessão guardada antes da `pd-14` é descartada ao carregar** —
> comportamento desenhado pelo ADR-0012, e acontece uma vez.

### Toda falha de autenticação sai pela mesma porta

`401` com `code: UNAUTHENTICATED` e a mensagem **"E-mail ou senha inválidos."**
— idêntica para senha errada, e-mail malformado e e-mail que ninguém cadastrou.
E as três pagam o mesmo custo de hashing, para o cronômetro também não
responder. Numa plataforma cujos usuários são donos de pet e lojistas de um
bairro, "este endereço tem conta aqui" é o dado pessoal (ADR-0011, C3).

### `/auth/me` relê a linha, não o token

O access token é uma cópia de 15 minutos: o e-mail não está nele, papéis
mudados depois já estão velhos nele, e uma conta apagada há um minuto ainda tem
token que verifica. `/auth/me` busca o usuário por `request.user.id`; se não
existe mais, `401` pela mesma porta única.

### Os guards são globais desde a `pd-13`

`AuthGuard` e `RolesGuard` estão registrados como `APP_GUARD` no
`IdentityModule`, nessa ordem. **Toda rota nasce fechada**; as abertas dizem
isso com `@Public()`.

Isso vale para código que ainda não existe: um controller criado amanhã
responde `401` até ser marcado. É o comportamento desejado, e o modo de errar
agora é visível — uma rota pública respondendo `401` — em vez de invisível, que
era uma rota fechada que ninguém lembrou de proteger.

O que segura essa inversão é `apps/api/test/public-routes.e2e-spec.ts`: ele
percorre todas as rotas abertas sem `Authorization` e falha se qualquer uma
responder `401`. Sem ele, esquecer um `@Public()` derrubaria o comparador
público para todo visitante.

---

## Cliente (`apps/app`)

Duas telas: `/entrar` e `/conta` (privada).

### `/entrar`

E-mail e senha. A mensagem de erro do `401` é **a da API**, repetida na tela —
reescrevê-la como "e-mail não encontrado" destruiria no front exatamente o que a
API protege. Um `422` mostra `details[].message` junto do campo. Falha de rede
mostra texto do app.

Quem já está logado e abre `/entrar` é levado para `/conta`.

### `/conta`

Mostra "Você está logado como {email}" e os papéis como badges (`TUTOR` →
Tutor, `STORE_MEMBER` → Lojista, `ADMIN` → Administração), com um botão "Sair".

Ela chama `GET /auth/me` **na montagem**, em vez de mostrar o usuário que já
está na sessão guardada. É de propósito: é o que exercita `Bearer`, a renovação
proativa e a repetição reativa de ponta a ponta. Ler a cópia local deixaria toda
a maquinaria de sessão sem teste no app que depende dela.

### Onde a sessão fica

| Plataforma | Onde | Arquivo |
|---|---|---|
| Nativo | `expo-secure-store` | `src/session/session-storage.ts` |
| Web | `localStorage` | `src/session/session-storage.web.ts` |

Chave única: **`petdots.session`**, guardando
`{ accessToken, refreshToken, expiresAt, user }` (~700 bytes).

O `expo-secure-store` não existe no navegador, então são duas implementações da
mesma interface, escolhidas pelo Metro por sufixo de plataforma. O risco aceito
no web é **XSS**, com as mitigações nomeadas no
[ADR-0012](../../06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md).

Tudo é parseado com Zod ao carregar: uma sessão de uma versão anterior do app é
descartada, não confiada.

### Como renova, e o que acontece quando expira

Num só lugar (`src/api/http.ts`), em dois momentos:

- **proativo** — antes de uma chamada autenticada, se faltam menos de 30 s para
  `expiresAt`, renova antes;
- **reativo** — um `401` numa chamada que mandou `Bearer` dispara **um** refresh
  e **uma** repetição.

O refresh é **single-flight**: chamadas concorrentes compartilham a mesma
Promise. Sem isso, duas telas renovando juntas apresentam o mesmo refresh token,
a rotação faz a segunda perder, e o app desloga sozinho.

| Falha | O que a pessoa vê |
|---|---|
| Refresh recusado com `401` | Volta para `/entrar` com *"Sua sessão expirou. Entre de novo."*; o armazenamento é limpo |
| Refresh falhou por **rede** | **Continua logada.** A tela mostra indisponibilidade |

A distinção é a regra mais importante da feature no cliente: só a API dizendo
"esse token não vale" autoriza descartar uma sessão. Deslogar porque o metrô
entrou num túnel é o bug clássico de app mobile.

**Sair** limpa o armazenamento e volta ao comparador **antes** de chamar
`POST /auth/logout`. O que a pessoa pediu foi sair deste aparelho, e isso não
pode depender da rede; o token expira sozinho no servidor em 30 dias.

---

## O que esta feature **não** faz ainda

| Não faz | Onde entra |
|---|---|
| Login com Google | Sem dono. `IDEIAS.md` |
| Recuperação de senha ("esqueci minha senha") | Sem dono — exige envio de e-mail, que o projeto ainda não tem |
| Verificação de e-mail | Sem dono |
| `StoreScopeGuard` — "este lojista mexe nesta loja" | `pd-16`, com o painel do lojista |
| Sincronizar a sessão entre abas do navegador | Vigilância do backlog, gatilho: primeiro relato de logout inesperado |
| CSP no app web | Vigilância do backlog, gatilho: deploy do app web |
| Exercitar o `SecureStore` no nativo | Vigilância do backlog, gatilho: primeiro build nativo |

✅ **O cadastro pela interface saiu desta lista na `pd-14`:** `/cadastro`
existe, pede e-mail e senha, e leva direto ao onboarding do perfil.

---

## Como o Victor loga hoje

Três usuários semeados em desenvolvimento, todos com a senha
`petdots-dev-2026`:

| E-mail | Papéis |
|---|---|
| `tutor@dev.petdots.local` | `TUTOR` |
| `lojista@dev.petdots.local` | `STORE_MEMBER` **e** `TUTOR` |
| `admin@dev.petdots.local` | `ADMIN` |

O domínio `.local` não é roteável de propósito: nenhum deles pode colidir com o
endereço de uma pessoa real. O seed **se recusa a rodar com
`NODE_ENV=production`**.

**Pela interface:**

```bash
npm run dev -w @petdots/app
# abre http://localhost:8081 → "Entrar", ou "Criar conta" para uma conta nova
```

> ⚠️ **`CORS_ORIGINS` é obrigatória** para isso funcionar no navegador. Sem
> `CORS_ORIGINS=http://localhost:8081` no `.env` da raiz, o navegador bloqueia
> toda chamada do app à API — e o sintoma engana: o badge diz "API: fora do ar"
> com a API perfeitamente de pé. A API **não relê o `.env` em watch**: depois de
> acrescentar a variável, reinicie-a.

**Por `curl`,** quando o que se quer é o token:

```bash
TOKEN=$(curl -s localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"lojista@dev.petdots.local","password":"petdots-dev-2026"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')

curl -s localhost:3001/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```
