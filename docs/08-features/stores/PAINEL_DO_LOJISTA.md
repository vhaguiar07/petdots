---
title: Feature — Painel do Lojista
status: stable
version: '1.0'
updated: 2026-09-13
scope: >
  Visão transversal do painel do lojista no PetDots — banco, API, guard,
  auditoria e cliente numa leitura só: a tabela store_members e como o vínculo
  nasce sem tela de convite, o StoreScopeGuard aplicado por rota e a diferença
  entre 403 e 404, as treze rotas escopadas, as seis transições auditadas com
  storeRole no payload, a agenda semanal e a prateleira escritas pelo OWNER, as
  cinco telas sob /painel com polling de 20 s, o que a feature deliberadamente
  ainda não faz (convite, repasse, notificação, motivo de recusa) e o passo a
  passo com que o Victor liga uma loja real.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 01-product/USER_JOURNEYS.md
  - 03-engineering/SECURITY.md
  - 04-api/AUTHENTICATION.md
  - 04-api/ERROR_MODEL.md
  - 06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md
  - 06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md
  - 06-decisions/ADR/0017-pedido-antes-do-pagamento.md
  - 06-decisions/ADR/0018-painel-do-lojista-vinculo-escopo-e-app.md
  - 08-features/orders/PEDIDO_E_CARRINHO.md
  - 08-features/comparador/COMPARADOR_DE_PRECOS.md
type: product
---

# Feature — Painel do Lojista

> Leitura transversal de **uma** feature: banco → API → cliente, o que ela não
> faz, e como operá-la. O detalhe de cada camada continua nos documentos
> canônicos — [`DOMAIN_MODEL`](../../01-product/DOMAIN_MODEL.md) para as
> entidades, [`SECURITY`](../../03-engineering/SECURITY.md) para autorização e
> auditoria, [ADR-0013](../../06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md)
> para os papéis e
> [ADR-0018](../../06-decisions/ADR/0018-painel-do-lojista-vinculo-escopo-e-app.md)
> para o porquê de cada decisão de implementação.

---

## O que é

O outro lado do pedido. A [`pd-15`](../orders/PEDIDO_E_CARRINHO.md) entregou o
pedido inteiro e deixou a loja sem endpoint para aceitá-lo — e como o job de
auto-recusa já rodava, **todo pedido criado terminava auto-recusado em quinze
minutos úteis**. O tutor comprava e nada acontecia.

Esta feature liga controllers e um guard a funções que já existiam, puras e
testadas, no domínio de `orders`. Ela **não reescreveu a máquina de estados**:
deu produtor a cada transição que não tinha um.

Entrega, em uma frase: a dona da loja entra no mesmo aplicativo do tutor, vê a
fila de pedidos, aceita, separa, despacha e confirma a entrega — e, se for
`OWNER`, edita os horários e os preços.

---

## Banco

Uma tabela nova, a sexta migration (`create_store_members`):

| Coluna | Tipo | Por quê |
|---|---|---|
| `id` | `uuid` | |
| `store_id` | `uuid` → `stores` **`CASCADE`** | Um vínculo sem loja não significa nada |
| `user_id` | `uuid` → `users` **`RESTRICT`** | Falha fechada: apagar a conta de quem opera uma loja exige remover o vínculo antes |
| `role` | `store_role` (`OWNER` \| `OPERATOR`) | ADR-0013 |
| `created_at`, `updated_at` | `timestamptz` | |

Mais `@@unique([storeId, userId])` — que é o índice pelo qual o guard consulta —
e `@@index([userId])`, para a listagem de vínculos.

**N:N, e não uma coluna em `users`** (ADR-0013 B8): uma pessoa pode ser dona da
loja de uma esquina e operar o balcão de outra, então a capacidade é propriedade
do **par**, nunca do humano. É também por isso que `StoreRole` não viaja no
token (B7) — um claim teria de dizer "de qual loja?".

### Por que as duas FKs são diferentes

`stores` cascateia e `users` restringe, de propósito. Remover o **último
`OWNER`** de uma loja é proibido (ADR-0013 B6) e não tem produtor — não existe
tela que remova membro —, então deixar a conta ser apagada arrastaria o vínculo
e poderia deixar uma loja sem dona. A capacidade 14 (exclusão de conta) decide
isso com uma loja real na mão; até lá, a falha fechada é a resposta certa, e
está na vigilância do backlog com esse gatilho.

---

## Como o vínculo nasce (sem tela de convite)

ADR-0013 B5 tirou a tela de convite do MVP. O vínculo nasce no onboarding
conduzido pelo Victor, como o catálogo é semeado hoje:

```bash
npm run store:add-member -- --store <slug> --email <e-mail> --role OWNER|OPERATOR
```

O script e o seed de desenvolvimento chamam a **mesma** função,
`grantStoreMembership`, que numa transação:

1. resolve a loja pelo `slug` e a pessoa pelo e-mail normalizado;
2. **recusa** se qualquer um dos dois não existir — a pessoa precisa ter criado
   a conta em `/cadastro` antes;
3. faz `upsert` pelo par `(store_id, user_id)` — rodar de novo troca o papel,
   nunca duplica;
4. 🔴 **acrescenta `STORE_MEMBER` a `users.roles`** se faltar.

O passo 4 é o que se esquece. `POST /auth/register` só concede `TUTOR`, então
sem ele o `RolesGuard` global barraria a lojista **antes** de o
`StoreScopeGuard` entrar em cena — e é exatamente isso que uma das provas de
vermelho da `pd-16` demonstra.

⚠️ **O e-mail é argumento, nunca arquivo.** Pôr o e-mail de uma pessoa real num
seed versionado seria dado pessoal em repositório público (LGPD). Por isso não
existe `PILOT_MEMBERS` em `pilot.ts`.

⚠️ **O script não se recusa a rodar em produção** — é o procedimento de
onboarding de loja real. O que é DEV-ONLY são as contas `.local` do seed.

⚠️ **Quem recebe o vínculo precisa relogar.** O access token na mão dela
precede o papel novo; `RefreshTokensUseCase` relê os papéis do banco, então ele
chega sozinho em até 15 minutos — mas um novo login é instantâneo, e o script
imprime esse aviso.

---

## O guard

`StoreScopeGuard` vive em `apps/api/src/common/guards/`, ao lado do `AuthGuard`
e do `RolesGuard`, e responde a pergunta que nenhum dos dois responde: **qual**
loja esta pessoa está operando, e em que papel.

| Camada | Pergunta | Onde |
|---|---|---|
| `AuthGuard` (global) | Quem é? | `APP_GUARD` |
| `RolesGuard` (global) | É `STORE_MEMBER`? | `APP_GUARD` |
| **`StoreScopeGuard`** | **Opera esta loja?** | `@UseGuards` por controller |
| `@StoreRoles('OWNER')` | Neste papel? | Decorator no handler |

**Aplicado por rota, não global.** Cada requisição escopada paga **uma**
consulta pelo índice único `(store_id, user_id)`; a fila do tutor, o comparador
e o `/auth/me` não pagam nada, porque nunca chegam a esta classe. Um guard
global lendo metadata custaria o mesmo no banco e teria o **mesmo** modo de
falha — "esqueci o decorator" — com a consulta escondida.

A defesa contra o `@UseGuards` esquecido é dupla:

- o handler obtém o `storeId` **só** por `membershipOf(request)`, que lança
  `403` quando o guard não rodou — nunca de `params`;
- todo repositório de dado de loja leva `storeId` no `where` (o padrão de posse
  que a `pd-14` fixou para pets e a `pd-15` para pedidos).

⚠️ **Guards rodam antes dos pipes**, então o guard valida `params.storeId` com
`z.uuid()` antes de consultar. Sem isso, um id malformado chegaria ao Prisma e
voltaria como `500`.

⚠️ **`ADMIN` não atravessa o guard** (ADR-0018 A13). Não há console nem caso de
uso administrativo; o bypass viria com o ADR do back-office.

### `403` × `404`: a escolha é deliberada

| Situação | Resposta | Por quê |
|---|---|---|
| Não é membro da loja da URL | `403 STORE_SCOPE_DENIED` | A existência de uma **loja** é pública — o comparador a publica |
| É membro, mas o papel não basta | **O mesmo** `403` | Dizer "precisaria ser OWNER" entrega o modelo de privilégio de graça |
| É membro, e nomeia pedido de **outra** loja | `404 ORDER_NOT_FOUND` | A existência de um **pedido** não é pública |
| É membro, e nomeia oferta de outra loja | `404 OFFER_NOT_FOUND` | Idem |

O mecanismo do `404` é o `storeId` no `where` da consulta — posse na query, não
checagem depois.

---

## API

Treze rotas novas, todas fechadas. Nenhuma é `@Public()`.

### Vínculos

| Rota | Papel | O que faz |
|---|---|---|
| `GET /store-memberships` | `STORE_MEMBER` | As lojas que a pessoa opera, **incluindo pausadas** |

Sem `StoreScopeGuard`: não há `storeId` no path para escopar. É a rota que
*informa* quais ids existem, limitada pelo id do próprio chamador.

⚠️ Ela lê o repositório de `stores` diretamente, **não** `FindStoreUseCase`, que
esconde `PAUSED`. Essa regra é certa para o lado público e errada aqui: é no
painel que a loja é despausada.

### Pedido

Todas sob `@Roles('STORE_MEMBER')` + `StoreScopeGuard`, e todas respondem `200`
com o pedido no mesmo `orderSchema` que o tutor recebe.

| Rota | Papel | Transição |
|---|---|---|
| `GET /stores/{storeId}/orders?status=` | ambos | A fila. `status` é lista separada por vírgula; ausente é tudo |
| `GET /stores/{storeId}/orders/{orderId}` | ambos | Um pedido |
| `POST .../acceptance` | ambos | `PLACED` → `ACCEPTED` |
| `POST .../rejection` | ambos | `PLACED` → `REJECTED` (`STORE_REJECTED`), refund total |
| `POST .../dispatch` | ambos | `ACCEPTED` → `DISPATCHED` |
| `POST .../delivery-confirmation` | ambos | `DISPATCHED` → `DELIVERED` |
| `POST .../cancellation` | ambos | `ACCEPTED` → `CANCELLED`, motivo obrigatório, refund total |
| `PATCH .../items/{orderItemId}` | ambos | Marca a linha `UNAVAILABLE`, refund da linha |

Ações como **sub-recurso substantivo**, no precedente de `/cancellation`
(`API_GUIDELINES`). `delivery-confirmation` e não `delivery`, porque `Delivery`
é entidade da capacidade 8.

**O contrato do pedido é o mesmo do tutor, de propósito.** O que a loja precisa
para entregar é exatamente o snapshot de contato e endereço que o `SECURITY`
§LGPD chama de mínimo; e o que ela **não** vê — a comissão — já está fora de
`toOrderContract`, que nunca faz spread. Um segundo mapeamento seria um segundo
lugar por onde a taxa poderia vazar.

### Agenda e prateleira

| Rota | Papel | O que faz |
|---|---|---|
| `PUT /stores/{storeId}/opening-hours` | 🔴 `OWNER` | A semana inteira de uma vez |
| `PUT /stores/{storeId}/offers/{offerId}/price` | 🔴 `OWNER` | O preço que o comparador ordena |
| `PUT /stores/{storeId}/offers/{offerId}/availability` | ambos | "Tenho" / "não tenho" |
| `POST /stores/{storeId}/offers` | 🔴 `OWNER` | "Tenho isso" — `201` + `Location` |

A **leitura** da prateleira é a rota pública `GET /stores/{storeId}/offers` com
`?unavailable=true`, que devolve também as indisponíveis. Uma oferta
indisponível não é segredo: é a loja dizendo "não tenho", o comparador já filtra
por `available`, e a vitrine sem o parâmetro não muda de comportamento.

### Códigos novos

`ORDER_ITEM_NOT_FOUND` (404), `OFFER_NOT_FOUND` (404), `OFFER_ALREADY_EXISTS`
(409), `PRODUCT_NOT_OFFERABLE` (422). E `STORE_SCOPE_DENIED` (403), que o
`ERROR_MODEL` reservava desde a v1.1 e agora tem produtor.

---

## Auditoria

As **seis** transições da loja no pedido gravam `audit_log` na mesma transação
da transição, com ator `USER`, `actorUserId`, `storeId` e `requestId`:

| Ação | Payload além do comum |
|---|---|
| `order.accepted` | |
| `order.rejected` | `reason: 'STORE_REJECTED'` |
| `order.dispatched` | |
| `order.delivered` | |
| `order.cancelled` | `reason: 'STORE_CANCELLED'` |
| `order.item_unavailable` | `orderItemId`, `orderCancelled` |

E três de oferta, que ampliaram o `entityType` da porta de `'order'` para
`'order' | 'offer'`: `offer.price_changed` (com `fromPriceCents` e
`toPriceCents`), `offer.availability_changed`, `offer.created`.

🔴 **Todo payload leva `storeRole`.** É a rastreabilidade "quem aceitou cada
pedido" que o ADR-0013 usou para descartar "um login por loja" — e não custou
uma coluna.

⚠️ **O texto livre do cancelamento fica fora do payload.** Pode conter o nome do
tutor ("a Maria ligou…"), e `audit_log` é permanente: logs rotacionam, essa
tabela não. Ele é persistido em `orders.cancellation_reason`, que o tutor lê.

⚠️ **A agenda não é auditada.** Não está entre as quatro mutações que o
`SECURITY` §Auditoria exige rastrear; `stores.updated_at` responde "quando" e o
log de aplicação responde "quem". Gatilho para mudar: a primeira divergência
sobre a loja estar fechada.

---

## Cliente (`apps/app`)

O painel mora no **mesmo** aplicativo do tutor, sob `(private)/painel/`. Um
segundo app duplicaria sessão, cliente HTTP, renovação de token, tema,
primitives, wrapper de dev e CI — para um painel que é régua de WhatsApp, não
ERP. O `lojista@` do seed é `TUTOR` também, o que só funciona num app.

| Rota | Tela | Quem vê |
|---|---|---|
| `/painel` | Lista de vínculos — **um vínculo redireciona direto** | `STORE_MEMBER` |
| `/painel/{storeId}` | A fila, em quatro seções | membros da loja |
| `/painel/{storeId}/pedidos/{orderId}` | O pedido, com as ações do estado | membros |
| `/painel/{storeId}/horarios` | Editor da semana | `OWNER` |
| `/painel/{storeId}/ofertas` | A prateleira | membros (preço só `OWNER`) |

O link **"Painel da loja"** aparece no cabeçalho só quando `STORE_MEMBER` está
nos papéis da sessão — o que custa zero requisição, porque o papel está no token.

### A fila se atualiza sozinha

**Polling de 20 s**, que é o que `USER_JOURNEYS` §risco de UX descreve. Não há
push: notificação é decisão da capacidade 10, e é o terceiro dependente do item
"Notificação transacional" do backlog.

Dois detalhes que não são incidentais: o timer é limpo no unmount e a requisição
é abortada junto; e o polling **pausa com a aba escondida**, senão um painel
aberto de um dia para o outro faria 4.320 requisições antes de alguém olhar.

### A ordem da fila é uma função pura

`groupOrdersForQueue` separa em "Aguardando você", "Aceitos — separar", "Saíram
para entrega" e "Concluídos". A API devolve `placedAt desc`, que é o padrão
honesto de uma lista; o painel reordena o que está aguardando pelo **prazo mais
curto primeiro**, porque um pedido com dois minutos importa mais que um com
catorze.

🔴 Um pedido que **expirou enquanto o painel estava aberto** aparece em
"Concluídos" como "Recusado — prazo vencido". Sumir da tela entre um poll e o
outro, sem explicação, é a pior coisa que uma fila pode fazer com quem a observa.

### O que o `OPERATOR` não vê

Os links **"Horários"** e **"Prateleira"** não aparecem para ele, e o campo de
preço da prateleira vira leitura. Isso é conveniência: a API recusa de qualquer
forma, com `403 STORE_SCOPE_DENIED`.

### Duas etapas para o que move dinheiro

Recusar, cancelar e marcar item indisponível pedem confirmação — o mesmo padrão
do cancelamento pelo tutor. Aceitar, despachar e confirmar entrega são um toque
só: são esperados e a próxima transição os sucede.

### O que mudou para o tutor

Três coisas, todas na tela do pedido:

- **"Recusado pela loja"**, distinto de "Recusado — a loja não respondeu a
  tempo";
- **"Cancelado pela loja"**, com o motivo que ela escreveu;
- em `ACCEPTED` e `DISPATCHED`, **"Para cancelar, fale com a loja."** — sem
  botão e ⚠️ **sem telefone**, porque `phone_whatsapp` ainda não está no schema
  (entra na J6).

---

## Regras

1. **Um pedido aceito nunca é auto-recusado.** `findOverdue` filtra
   `status = 'PLACED'`; o sweeper não enxerga `ACCEPTED`.
2. **Toda saída que não é entrega gera `Refund`** (ADR-0014) — recusa,
   cancelamento e item em falta. A transição, o refund e a linha de auditoria
   são uma transação só.
3. **A transição é condicional ao estado atual.** `UPDATE … WHERE id AND status`:
   dois cliques simultâneos produzem um `200` e um `409`, um refund no máximo e
   exatamente uma linha de auditoria.
4. **Cancelar exige motivo; recusar, não.** Cancelar acontece depois do aceite,
   e é o lado que tem o que explicar (ADR-0014 C4).
5. **Item em falta devolve só a linha.** Entrega e serviço ficam (ADR-0014 C6).
   Quando não sobra nada, o pedido vira `CANCELLED` com refund **total**.
6. **Marcar item só a partir de `ACCEPTED`.** De `PLACED` a resposta é aceitar
   ou recusar, não editar.
7. **Agenda vazia significa nunca abre** — falha fechada, e a loja para de
   receber pedidos.
8. **Mudar a agenda não move o prazo de pedidos já feitos.**
   `acceptance_deadline_at` é coluna persistida (ADR-0017 A12).
9. **Mudar o preço não muda pedido já feito.** Cada linha carrega seu snapshot.
10. **Disponibilidade não carimba `price_updated_at`.** Ter de volta em estoque
    não é preço novo, e o comparador mostra esse carimbo.

---

## O que esta feature **não** faz ainda

| O que | Por quê / gatilho |
|---|---|
| **Tela de convite e remoção de membro** | ADR-0013 B5 — gatilho: a primeira loja pedindo um segundo acesso. Com ela vem a regra do último `OWNER` (B6), que hoje não tem produtor |
| **Motivo de recusa em texto livre** | ADR-0018 A9 — em `IDEIAS`, gatilho: o primeiro tutor perguntando por quê |
| **Repasse e faturamento** | J8, `pd-17`, travada pela conta no PSP |
| **Aviso à loja de pedido novo** | Capacidade 10; hoje é o polling de 20 s |
| **Substituição assistida (`SUBSTITUTED`)** | Precisa do tutor concordar, e não há canal dentro do pedido |
| **Paginação da fila** | Gatilho: a primeira loja com mais de ~200 pedidos |
| **Onboarding de loja pela interface** | J6 — `PROSPECT` → `ACTIVE`, documentos, `psp_recipient_id` |
| **Edição de oferta em lote** | A prateleira edita uma linha por vez |
| **Prateleira de loja `PAUSED`** | A leitura passa pela rota pública, que responde `404` para loja pausada (pd-13 A15). Gatilho: a primeira loja real pausada precisando editar preço |

---

## Como o Victor opera hoje

### Ligar uma loja real ao painel

1. **A pessoa cria a conta** em `/cadastro`, com o e-mail dela. (Ela ainda não
   vê nada de loja — a conta nasce só com `TUTOR`.)
2. **Ela avisa qual e-mail usou.**
3. **Ele roda o script**, com o `slug` da loja:

   ```bash
   npm run build
   npm run store:add-member -- --store petshop-amigo-fiel \
     --email dona@exemplo.com.br --role OWNER
   ```

   A saída confirma com ids: `membership granted (storeId=…, userId=…,
   role=OWNER, roleGranted=true)`.
4. **Ela sai e entra de novo.** O cabeçalho ganha "Painel da loja".

Rodar de novo com outro `--role` troca o papel sem duplicar. Um e-mail que não
existe é recusado com a mensagem dizendo para a pessoa se cadastrar primeiro.

### Em desenvolvimento

`npm run db:seed` cria quatro contas (`tutor@`, `lojista@`, `operador@`,
`admin@`, senha `petdots-dev-2026`) e **dois vínculos** com a primeira loja do
piloto: `lojista@` como `OWNER` e `operador@` como `OPERATOR`. A mesma loja para
os dois é o que torna a separação de papéis percorrível à mão.

⚠️ Tudo isso é recusado com `NODE_ENV=production` — as contas e os vínculos
caem juntos, porque o vínculo aponta para as contas por e-mail.

### Conferir o que aconteceu

`npx prisma studio` → `store_members` (quem opera o quê), `audit_log`
(`actor_kind USER`, `payload.storeRole`, sem nome nem telefone) e `refunds`
(uma linha por saída que não foi entrega).
