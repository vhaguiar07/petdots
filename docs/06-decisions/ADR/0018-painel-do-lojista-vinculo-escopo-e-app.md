---
title: 'ADR-0018: O painel do lojista — vínculo por script, escopo por rota e o painel no mesmo app'
status: stable
version: '1.0'
updated: 2026-09-13
scope: >
  Registra as decisões com custo de reversão da pd-16, que ligou a loja ao
  pedido: o vínculo StoreMember nasce por um script CLI versionado e não por
  tela de convite nem por rota de ADMIN; o StoreScopeGuard é aplicado por
  controller e lê o vínculo por requisição, com o storeId sempre no path;
  loja errada responde 403 e pedido de outra loja responde 404; o painel mora
  no mesmo apps/app sob (private)/painel/; a recusa não carrega motivo em texto
  livre; a agenda semanal ganha rota e editor do OWNER; ADMIN não atravessa o
  guard; e a escrita de ofertas pelo lojista entra junto, ampliando o
  entityType da auditoria para 'offer'.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 01-product/USER_JOURNEYS.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 03-engineering/SECURITY.md
  - 04-api/API_GUIDELINES.md
  - 04-api/AUTHENTICATION.md
  - 04-api/ERROR_MODEL.md
  - 06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md
  - 06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md
  - 06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md
  - 06-decisions/ADR/0017-pedido-antes-do-pagamento.md
  - 08-features/stores/PAINEL_DO_LOJISTA.md
  - 08-features/orders/PEDIDO_E_CARRINHO.md
type: decision
---

# ADR-0018: O painel do lojista

## Contexto

A `pd-15` entregou o pedido inteiro — carrinho, cotação, criação, máquina de
estados pura e testada, `Refund` em toda saída, auditoria por porta — e deixou
**um lado de fora**: o da loja. Nenhuma rota produzia `ACCEPTED`.

A consequência não era cosmética. O `OrderExpirySweeper` já rodava, e
`findOverdue` filtra `status = 'PLACED'`: **todo pedido criado terminava
auto-recusado em quinze minutos úteis**. O tutor comprava e nada acontecia. Nas
palavras do Victor, ao abrir a tarefa:

> "A `pd-15` entregou o pedido, mas a loja não tem endpoint para aceitá-lo.
> Como o job de auto-recusa já roda, todo pedido criado hoje termina
> auto-recusado em 15 minutos úteis. O tutor compra e nada acontece. Tirar o
> pedido desse limbo é o produto desta tarefa."

O que **já estava decidido** e não se reabriu:

| O que | Onde |
|---|---|
| `OWNER` × `OPERATOR`, a tabela de permissões, `StoreRole` fora do token, vínculo N:N | [ADR-0013](0013-papeis-de-loja-owner-e-operator.md) |
| Prazo de aceite, auto-recusa, item em falta, cancelamento, `Refund` | [ADR-0014](0014-ciclo-do-dinheiro-no-pedido.md) |
| Máquina como dado, compare-and-set, auditoria como porta, contexto opaco | [ADR-0017](0017-pedido-antes-do-pagamento.md) |
| Guards globais, toda rota nasce fechada | [ADR-0012](0012-sessao-do-cliente-universal-e-guards-globais.md) |

O que **não** estava, e custa caro reverter: quem cria o vínculo sem tela de
convite (ADR-0013 B5 tirou a tela do MVP); onde o escopo de loja é verificado e
quanto isso custa por requisição; e onde o painel mora. As três geram a
pergunta "por que não fizeram X?" — que é o critério do `DIRETRIZES` §6 para
existir um ADR.

---

## Decisão

### A1 · O vínculo nasce por um script CLI versionado

`npm run store:add-member -- --store <slug> --email <e-mail> --role OWNER|OPERATOR`.

O script e o seed de desenvolvimento chamam a **mesma** função,
`grantStoreMembership`, que numa transação: resolve a loja por `slug` e a pessoa
por e-mail normalizado, **recusa** se qualquer um dos dois não existir, faz
`upsert` pelo par `(store_id, user_id)` — rodar de novo troca o papel, nunca
duplica — e **acrescenta `STORE_MEMBER` a `users.roles`** quando falta.

Essa última metade é a que se esquece, e é por isso que ela está aqui e não no
chamador: `POST /auth/register` só concede `TUTOR`, então quem se cadastrou pela
tela seria barrado pelo `RolesGuard` global **antes** de o `StoreScopeGuard`
existir na requisição. O papel novo só chega ao token no próximo login ou na
renovação (≤ 15 min), porque `RefreshTokensUseCase` relê os papéis do banco.

O script **não** se recusa a rodar em produção — é exatamente o procedimento de
onboarding de loja real. O que é DEV-ONLY são as contas `.local` do seed.

### A3 · `StoreScopeGuard` por controller, `storeId` sempre no path

O guard vive em `common/guards/`, é aplicado com `@UseGuards` nos controllers
escopados e faz **uma** consulta pelo índice único `(store_id, user_id)`. Sem
vínculo, `403 STORE_SCOPE_DENIED`. O decorator `@StoreRoles('OWNER')` restringe
por papel de loja e, quando o papel não basta, responde **o mesmo** `403`, sem
dizer qual papel serviria — a mesma postura do `RolesGuard`. O guard publica
`request.storeMembership`, e os controllers leem o `storeId` **só** daí, por
`membershipOf(request)`, nunca de `params`.

Três consequências desenhadas:

- **Nenhuma rota fora do painel paga a consulta.** A fila do tutor, o
  comparador e o `/auth/me` não tocam `store_members`.
- **A defesa contra "esqueci o `@UseGuards`" é dupla**: sem o guard,
  `membershipOf` lança; e todo repositório de dado de loja leva `storeId` no
  `where` — o padrão de posse que a `pd-14` fixou para pets e a `pd-15` para
  pedidos.
- **Guards rodam antes dos pipes**, então o guard valida `params.storeId` com
  `z.uuid()` antes de consultar. Sem isso um id malformado chegaria ao Prisma e
  voltaria como `500`.

`storeId` no path e não "a loja do usuário" é ADR-0013 B8: uma pessoa opera mais
de uma loja, e a pergunta não tem resposta única.

### A5 · `403` para a loja, `404` para o pedido

Não-membro da loja da URL: `403 STORE_SCOPE_DENIED` — a existência de uma loja é
pública, o comparador a publica, nada vaza. Membro legítimo que nomeia um pedido
de **outra** loja pela URL da sua: `404 ORDER_NOT_FOUND`, porque a existência de
um pedido não é pública. O mecanismo é `findByIdForStore(orderId, storeId)` com
o `storeId` no `where` — posse na consulta, não checagem depois.

### A8 · O painel mora no mesmo `apps/app`

Sob `(private)/painel/`, com o link "Painel da loja" no `AppShell` só para quem
tem `STORE_MEMBER` no token. Telas: a lista de vínculos (um vínculo redireciona
direto), a fila, o pedido, os horários e a prateleira. **Polling de 20 s** na
fila, pausado com a aba escondida — não há notificação ainda (capacidade 10).

`GET /store-memberships` devolve as lojas que a pessoa opera **incluindo as
pausadas**, e lê o repositório de `stores` diretamente em vez de passar por
`FindStoreUseCase`, que esconde `PAUSED`. Essa regra é certa para o lado
público — uma loja que o comparador omite não pode ter página — e errada aqui:
é no painel que a loja é despausada.

### A9 · Recusa sem motivo em texto livre

`rejection_reason` continua o enum `STORE_REJECTED`, que é a distinção que o
ADR-0014 C2 de fato exige — "a loja disse não" contra "ninguém respondeu". Um
motivo escrito exigiria coluna e migration por um campo que a J4 cita de
passagem. Está em `IDEIAS`, com gatilho: o primeiro tutor perguntando por quê.

### A11 · A agenda semanal ganha rota e editor

`PUT /stores/{storeId}/opening-hours`, `@StoreRoles('OWNER')`, a semana inteira
de uma vez — a regra de não-sobreposição só se decide sobre a lista completa.
O editor oferece **duas faixas por dia** (a segunda é o almoço); o schema aceita
mais, e uma loja que precisar de uma terceira faz o editor crescer.

Semana vazia é aceita e significa **nunca abre**: falhar fechado é a mesma
escolha do schema. E a `acceptance_deadline_at` de pedidos já feitos **não se
move** — é coluna persistida, calculada uma vez contra a agenda vigente
(ADR-0017 A12).

**Não grava `audit_log`**: não está entre as quatro mutações que o `SECURITY`
exige rastrear. `stores.updated_at` responde "quando" e o log de aplicação
responde "quem".

### A13 · `ADMIN` não atravessa o guard

Não existe console nem caso de uso administrativo. Dar bypass agora seria
decidir o modelo de privilégio do back-office sem o ADR que deve essa decisão.
Gatilho: o console de administração.

### P4 · A escrita de ofertas entra junto

`PUT .../offers/{offerId}/price` (`OWNER`), `PUT .../offers/{offerId}/availability`
(os dois papéis) e `POST /stores/{storeId}/offers` (`OWNER`, "tenho isso" sobre
um produto do catálogo, passando por `assertProductCanBeOffered`).

A **leitura** do painel é a rota pública `GET /stores/{storeId}/offers` com o
parâmetro novo `?unavailable=true`: uma oferta indisponível não é segredo — é a
loja dizendo "não tenho" —, o comparador já filtra por `available`, e a vitrine
sem o parâmetro não muda de comportamento.

Isso amplia o `entityType` da auditoria de `'order'` para `'order' | 'offer'`, e
fecha a terceira das quatro mutações que o `SECURITY` exige rastrear:
`offer.price_changed`, `offer.availability_changed`, `offer.created`.

### A7 · `storeRole` no payload de toda transição da loja

As seis ações no pedido gravam `audit_log` com ator `USER`, `actorUserId`,
`storeId`, `requestId` e **`storeRole`** no payload. Esse último é a
rastreabilidade "quem aceitou cada pedido" que o ADR-0013 usou para descartar
"um login por loja" — e não custa uma coluna.

O texto livre do cancelamento **não** vai ao payload: pode conter o nome do
tutor ("a Maria ligou…") e a tabela de auditoria é permanente.

---

## Alternativas consideradas

### Para o vínculo (A1)

| Alternativa | Por que não |
|---|---|
| **Rota `POST /stores/{id}/members` sob `ADMIN`** | Não existe `ADMIN` em produção — o seed se recusa a criá-lo (ADR-0011 A8); seria o primeiro pedaço de back-office sem o ADR que o backlog exige para o console; e teria um único cliente, o `curl` do Victor. Gatilho para revisitar: o console de administração |
| **E-mails num arquivo de seed (`pilot.ts`)** | Dado pessoal versionado em repositório **público** — LGPD. É por isso que o script recebe o e-mail por argumento |
| **SQL à mão** | Esquece `STORE_MEMBER` em `users.roles` (o achado que virou prova de vermelho) e não valida nada |
| **Tela de convite de membro** | ADR-0013 B5 já a tirou do MVP. Gatilho nomeado: a primeira loja pedindo um segundo acesso |

### Para o escopo (A3)

| Alternativa | Por que não |
|---|---|
| **Guard global lendo metadata de rota** | Custaria o mesmo no banco e teria **o mesmo modo de falha** — "esqueci o decorator" — com a consulta escondida em toda requisição. Por rota, a consulta está onde se lê o custo |
| **Inferir a loja do usuário em vez do path** | ADR-0013 B8: uma pessoa opera mais de uma loja, e "a loja deste usuário" não tem resposta única |
| **`StoreRole` no token** | ADR-0013 B7 já descartou: o papel depende da loja, e um claim teria de dizer qual |
| **Checar a posse depois de ler a linha** | É a inversão que a `pd-14` corrigiu para pets: existe um instante em que a linha alheia está na memória, e todo caminho novo tem de lembrar de escondê-la |

### Para o painel (A8)

| Alternativa | Por que não |
|---|---|
| **App separado `apps/store-panel`** | Duplicaria sessão, cliente HTTP, renovação de token, tema, primitives, wrapper de dev e CI — para um painel que é "régua de WhatsApp, não ERP". O `SYSTEM_ARCHITECTURE` já diz `apps/app` = "tutor e lojista", e o `lojista@` do seed é `TUTOR` também, o que só funciona num app. Custo aceito: o bundle do tutor carrega telas que ele não abre |
| **As lojas do membro em `/auth/me`** | Acoplaria `identity` a `store_members` por um fato que só o painel lê |

### Para a leitura da prateleira (P4)

| Alternativa | Por que não |
|---|---|
| **Rota escopada com outro nome** (`shelf`, `offers/all`, `offer-management`) | Inventa um termo fora do `GLOSSARY` ou um verbo na URL |
| **O mesmo path sob dois controllers** | Não é possível no Nest |
| **Honrar o parâmetro só para quem tem vínculo** | Um handler `@Public()` não enxerga `request.user` |

### Para a recusa (A9) e a agenda (A11)

| Alternativa | Por que não |
|---|---|
| **Coluna `rejection_note` + campo na tela** | Migration e coluna por um campo que a J4 cita de passagem. Vai para `IDEIAS` |
| **Só a API da agenda, edição por Prisma Studio** | O `DOMAIN_MODEL`, o ADR-0013 B4 e o ADR-0017 A11 prometem **nominalmente** a edição pelo `OWNER`; e é ela que torna a separação de papéis verificável por teste |

---

## Consequências

**Positivas**

- 🔴 **O pedido sai do limbo.** Um pedido aceito nunca mais é varrido pela
  auto-recusa — provado pelo e2e e pela prova de vermelho que remove o filtro
  `status = 'PLACED'` de `findOverdue`.
- **A J4 fecha**: aceitar, recusar, despachar, confirmar entrega, marcar item
  em falta e cancelar têm produtor. `DELIVERED` — o gatilho do `Payout` da
  `pd-17` — passa a existir.
- **O invariante "0 acesso a pedido ou preço de outra loja" do `SECURITY`
  deixa de ser aspiração**: é o primeiro teste de acesso negado a membro de
  outra loja do projeto.
- **A separação `OWNER` × `OPERATOR` do ADR-0013 vira código verificável**, e
  não apenas uma tabela num documento.
- **Três das quatro mutações que o `SECURITY` exige rastrear têm rastro**:
  aceite, recusa e alteração de preço.

**Negativas e custos aceitos**

- **Onboarding de loja é um procedimento manual do Victor.** A pessoa cria
  conta, avisa o e-mail, ele roda o script, ela reloga. Documentado no
  `PAINEL_DO_LOJISTA` e no item 13 da intervenção manual do backlog.
- **Token velho depois do vínculo**: até 15 minutos, ou um novo login. O script
  imprime o aviso.
- **A regra do último `OWNER` (ADR-0013 B6) continua sem produtor** — não há o
  que remova um membro. Fica na vigilância, com gatilho: a tela de convite.
- **Apagar a conta de quem é membro falha no banco** (FK `Restrict`). É a
  falha fechada correta enquanto remover o último `OWNER` é proibido e não
  implementado; a capacidade 14 decide isso com uma loja na mão.
- **A fila da loja não é paginada.** Gatilho: a primeira loja com mais de ~200
  pedidos.
- **A prateleira de uma loja `PAUSED` não abre**, porque a leitura passa pela
  rota pública, que responde `404` para loja pausada (pd-13 A15). Gatilho: a
  primeira loja real pausada precisando editar preço.
- **Nada emite evento de domínio.** As seis ações da loja e as três de oferta
  ampliam o item de backlog "eventos de domínio não emitidos"; o consumidor que
  falta é avisar o tutor (capacidade 10).
- **O bundle do tutor carrega as telas do painel** (pequeno, aceito em A8).

**Contradições registradas**

O ADR-0013 diz que *"o `audit_log` com o `Audit` interceptor nasce com a escrita
de oferta"*. A escrita de oferta nasce aqui, mas o `audit_log` **não** nasceu
como interceptor: nasceu na `pd-15` como porta chamada pela aplicação
(ADR-0017 A8), porque a primeira recusa auditada do projeto é feita por um job,
sem rota e sem status code. ADR aceito não se edita; este cita os dois, e o item
correspondente do `BACKLOG` foi corrigido na mesma entrega.

---

## Status

`accepted` — portão fechado pelo Victor em 13/09/2026, com as sete decisões
(P1–P7) iguais às recomendações da análise.
