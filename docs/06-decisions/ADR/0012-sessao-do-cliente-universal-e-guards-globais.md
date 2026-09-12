---
title: "Sessão do cliente universal e guards globais"
status: accepted
version: 1.0
updated: 2026-09-12
scope: >
  Onde a sessão do usuário fica guardada em cada plataforma do apps/app, como
  o access token é renovado e o que acontece quando a renovação falha, como as
  rotas privadas do Expo Router são protegidas, e a inversão dos guards da API
  de "aplicados por rota" para "globais com @Public() nas rotas abertas".
relates_to:
  - 06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md
  - 06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md
  - 04-api/AUTHENTICATION.md
  - 03-engineering/SECURITY.md
  - 08-features/identity/IDENTIDADE_E_ACESSO.md
type: decision
---

# ADR-0012: Sessão do cliente universal e guards globais

## Contexto

A `pd-12` entregou autenticação própria na API — `register`, `login`, `refresh`
e `logout`, JWT no header `Authorization: Bearer`, refresh opaco rotacionado
([ADR-0011](./0011-autenticacao-propria-antes-da-escrita.md)). Ficaram duas
coisas de fora, e as duas viraram esta decisão.

**Não havia como logar pela interface.** O `apps/app` tinha quatro telas do
spike alimentadas por fixtures; só o indicador de saúde falava com a API. Logar
era `curl`.

**Nenhum endpoint exigia token.** Os guards nasceram "disponíveis, não globais"
(ADR-0011, R3), porque naquele momento *todo* endpoint da API era público por
desenho e tornar o guard global significaria marcar todos eles — arriscando o
comparador, que é a aquisição orgânica do produto. A decisão veio com um item de
vigilância e um gatilho nomeado: **primeiro endpoint autenticado**.

A análise da `pd-13` mediu o estado e encontrou o problema de fundo: **um login
que não destranca nada não prova nada**. Sem um endpoint que exija token, o
header `Bearer` nunca viaja, a renovação nunca é exercitada, e o risco "guard
que se aplica à mão se esquece" atravessa intacto para a próxima tarefa.

Três perguntas ficaram abertas, e são as que este ADR responde:

1. **Onde a sessão fica no aparelho** — o `expo-secure-store` não existe no
   navegador, e o `apps/app` é um app só para web e nativo.
2. **Como e quando o token é renovado**, e o que a interface faz quando a
   renovação falha.
3. **Como uma rota privada é protegida** num app exportado estaticamente
   (`web.output: "static"`,
   [ADR-0008](./0008-cliente-universal-expo-react-native-web.md) #6).

## Decisão

### 1. Nasce o primeiro endpoint autenticado, e os guards passam a globais

`GET /api/v1/auth/me` devolve `{ id, email, roles }` do usuário corrente,
**relendo a linha do banco** por `request.user.id` — nunca ecoando as claims do
token. O token é uma cópia de 15 minutos: o e-mail não está nele, papéis
concedidos ou revogados depois já estão velhos nele, e uma conta apagada há um
minuto ainda tem token que verifica. Usuário inexistente → `401`, pela mesma
porta única de toda falha de autenticação.

`AuthGuard` e `RolesGuard` passam a `APP_GUARD` **globais**, nessa ordem,
registrados no `IdentityModule` — e não no `AppModule`, porque `AuthGuard`
injeta `JwtService`, que o `IdentityModule` já configura e exporta; registrá-lo
ali evita uma segunda configuração do mesmo segredo.

A inversão é o ponto: **toda rota nasce fechada**. As abertas dizem isso com
`@Public()` — na classe de `HealthController`, `WaitlistController`,
`CatalogController`, `StoresController`, `DeliveryAreasController`,
`OffersController` e `StoreOffersController`; e nos quatro *handlers* de ação do
`IdentityController` (`register`, `login`, `refresh`, `logout`), nunca na classe
dele, porque `/auth/me` é a rota que precisa continuar fechada.

O que segura a regressão que o ADR-0011 temia é um teste:
`public-routes.e2e-spec.ts` percorre todas as rotas abertas **sem**
`Authorization` e falha se qualquer uma responder `401`.

### 2. A sessão é persistida inteira, por uma porta com duas implementações

A sessão guardada é `{ accessToken, refreshToken, expiresAt, user }`, sob a
chave única `petdots.session`.

`expo-secure-store` só existe no nativo — no web build o SDK entrega um módulo
vazio, `isAvailableAsync()` devolve `false` e `getItemAsync` lança. Logo o
armazenamento é uma **porta com duas implementações escolhidas pelo Metro por
sufixo de plataforma**:

| Arquivo | Plataforma | Onde guarda |
|---|---|---|
| `session-storage.ts` | nativo | `SecureStore` |
| `session-storage.web.ts` | web | `localStorage` |

O arquivo **sem** sufixo é o nativo de propósito: o TypeScript
(`moduleResolution: bundler`) não conhece sufixo de plataforma e resolve esse —
então é ele que o `tsc` confere. A interface e o parse ficam num terceiro
arquivo (`session-storage.types.ts`), para as duas metades não poderem divergir.

**O access token não fica só em memória.** Só-memória obrigaria um refresh — com
rotação — a cada F5 e a cada aba nova, multiplicando rotações e as corridas
entre abas. O access token expira em 15 minutos e não é revogável; guardá-lo
junto do refresh não amplia o que um XSS já levaria. A sessão serializada tem
~700 bytes, bem abaixo dos 2048 que o `SecureStore` do iOS avisa — e um teste
unitário fixa esse teto.

**Tudo é parseado com Zod ao carregar, nunca convertido.** Uma sessão escrita
por uma versão anterior do app tem outra forma; descartar é sempre seguro,
confiar coloca `undefined` onde deveria haver um token.

### 3. Renovação em dois momentos, num só lugar, e single-flight

Toda a lógica vive em `src/api/http.ts`:

- **proativa** — antes de uma chamada autenticada, se `expiresAt − 30 s ≤ agora`,
  renova primeiro;
- **reativa** — um `401` numa chamada **que mandou Bearer** dispara **um**
  refresh e **uma** repetição.

O critério da reativa é ter mandado Bearer, **não** o caminho da URL. Excluir
`/auth/*` por prefixo — como a análise havia escrito — excluiria também
`/auth/me`, a única rota autenticada que existe, desligando a renovação reativa
por inteiro. `login`, `refresh` e `logout` nunca mandam Bearer, então já ficam
de fora pelo critério certo.

O refresh é **single-flight**: chamadas concorrentes compartilham a mesma
Promise. Sem isso, duas telas renovando ao mesmo tempo apresentam o mesmo
refresh token, a rotação faz a segunda perder, e o app desloga sozinho.

`expiresAt` é `Date.now() + expiresIn · 1000`, calculado ao receber o par —
**nada decodifica o JWT no cliente**.

### 4. Só a API pode encerrar uma sessão

| Falha da renovação | O que acontece |
|---|---|
| `401` da API | Limpa o armazenamento, estado `signedOut` com `reason: 'expired'`, `/entrar` mostra *"Sua sessão expirou. Entre de novo."* |
| Rede, DNS, CORS | **A sessão fica.** A tela mostra indisponibilidade |

Deslogar por queda de rede é o bug clássico de app mobile: a pessoa entra num
túnel e sai deslogada, com a sessão perfeitamente válida no servidor. Só a API
dizendo "esse token não vale" autoriza descartar a sessão. É por isso que
`ApiError` e `ApiUnavailableError` são classes separadas.

O logout é local primeiro: limpa o armazenamento e volta para `/`, e só depois
chama `POST /auth/logout`. O que a pessoa pediu foi sair deste aparelho, e isso
não pode depender da rede; o token expira sozinho no servidor em 30 dias.

### 5. Rota privada por layout de grupo, não por `Stack.Protected`

Rotas privadas vivem em `src/app/(private)/`. O `_layout.tsx` do grupo lê
`useSession()`:

- `restoring` → placeholder *"Carregando sua sessão…"*;
- `signedOut` → `<Redirect href={{ pathname: '/entrar', params: { next } }} />`;
- `signedIn` → `<Slot />`.

`Stack.Protected` existe no `expo-router` 57, mas a documentação dele diz:
*"During static site generation, no HTML files are created for protected
routes"*. Com `web.output: "static"`, um F5 em `/conta` num host estático daria
**404** — a página simplesmente não teria sido gerada.

O redirect por layout gera o HTML assim mesmo. Durante o export a sessão está
`restoring` (o armazenamento só é lido depois da montagem), então o que vai para
`conta.html` é o placeholder, e a decisão de verdade acontece no navegador no
primeiro render. Conferido na `pd-13`: `conta.html` existe e carrega
*"Carregando sua sessão…"*.

Ler o armazenamento **depois da montagem** é a mesma exigência do export
estático que o `cart-context` do spike já obedecia: o módulo roda no servidor,
onde não há `localStorage`, e um valor lido durante o render divergiria da
hidratação.

### 6. O spike sai por inteiro

`apps/app/src/spike/` deixa de existir — fixtures, `data-source`, `cart-context`
e as quatro telas. O vocabulário de UI é promovido a `apps/app/src/ui/`. As
rotas `/checkout` e `/painel` **deixam de existir** até a `pd-15`/`pd-16`.

Era a decisão já registrada na `pd-08` ("saem quando a primeira tela de produto
nascer"). Manter fixtures vivas para duas telas de mentira deixaria o app com
duas fontes de dados e uma navegação que promete o que não existe. A referência
fica no Git: `7705a2f` é o último commit com o spike inteiro.

`packages/ui` **não nasce**: há um consumidor React Native só, e a landing é
outra árvore de renderização que não compartilha componente por desenho.

## Alternativas consideradas

**Login sem endpoint autenticado.** A sessão existiria só no cliente, o header
`Bearer` nunca viajaria, a renovação nunca seria exercitada e o risco dos guards
não-globais chegaria intacto à `pd-14`. Um login que não destranca nada não
prova o caminho autenticado ponta a ponta.

**Manter os guards aplicados por rota.** É o estado do ADR-0011, e ele tinha
razão enquanto não havia rota fechada: o custo de errar era o comparador
respondendo `401` a todo visitante. O que mudou é que agora existe rota fechada,
e o modo de errar passou a ser o pior dos dois — uma rota nova nascer aberta por
esquecimento. O sentinela e2e é o que torna a inversão segura.

**Sessão só em memória.** F5 e aba nova = logar de novo, e uma rotação de
refresh a cada 15 minutos por aba. Rejeitada pelo custo para a pessoa e pelo
aumento de corridas entre abas.

**`sessionStorage` no web.** Abrir em outra aba seria estar deslogado — contra o
B6 do ADR-0008, que exige que abrir uma URL interna em aba nova funcione.

**Cookie `httpOnly`.** Já descartado pelo ADR-0011 (A6): o app é export
estático, não há tela renderizada no servidor para receber o cookie, e a solução
exigiria CSRF e um servidor que o app não tem.

**`Stack.Protected`.** Ver §5: 404 no F5 em host estático.

**`packages/ui`.** Pacote com um consumidor é cerimônia (`AGENTS.md`). O
`DEVELOPMENT_GUIDE` tinha o gatilho errado ("componente compartilhado entre
telas" — as primitivas já são compartilhadas entre telas); o gatilho certo é
**segundo workspace React Native consumidor**, e foi corrigido lá.

## Consequências

**Positivas**

- O caminho autenticado existe de ponta a ponta e é observável: `/conta` mostra
  quem está logado, e cada abertura dela exercita Bearer, renovação proativa e
  repetição reativa.
- Toda rota nova da API nasce fechada. O esquecimento agora é visível (um `401`
  numa rota pública, pego pelo e2e) em vez de invisível (uma rota aberta que
  ninguém marcou).
- O `apps/app` ganha sua primeira suíte de testes e passa a ler a API de verdade
  em todas as telas que restaram — uma fonte de dados, não duas.
- Sessão sobrevive a F5 e a aba nova nas duas plataformas.

**Negativas, e aceitas**

- **XSS é o risco do `localStorage`.** Um script rodando nesta origem lê a
  sessão. O que limita: o React Native Web escapa todo texto que renderiza (não
  há `dangerouslySetInnerHTML` com dado de usuário), e a rotação do refresh faz
  uma cópia roubada morrer na próxima renovação legítima. **CSP no deploy do app
  web** é a mitigação que falta, e está na vigilância do backlog com gatilho
  *deploy*.
- **O caminho nativo não foi exercitado.** O projeto não tem build nativo; o
  `tsc` cobre o arquivo e a prova real fica com gatilho *primeiro build nativo*.
- **A sessão não sincroniza entre abas** no web: uma aba que desloga não avisa a
  outra, que descobre no próximo refresh. E duas renovações simultâneas em abas
  diferentes podem fazer uma perder a rotação. Aceito para o MVP, na vigilância
  com gatilho *primeiro relato de logout inesperado*.
- **`CORS_ORIGINS` passa a ser obrigatória** para usar o app no navegador, e o
  sintoma de esquecê-la engana: o badge diz "API: fora do ar" com a API de pé.
  Está na intervenção manual do backlog e no `DEVELOPMENT_GUIDE`.
- `/checkout` e `/painel` deixam de existir até a `pd-15`/`pd-16`.

## Status

`accepted`
