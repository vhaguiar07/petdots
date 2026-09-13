---
title: "ADR-0017: O pedido antes do pagamento — carrinho no cliente, cotação no servidor e a máquina de estados"
status: stable
version: "1.0"
updated: 2026-09-13
scope: >
  Registra as decisões com custo de reversão da pd-15, que levou o pedido ao
  banco sem pagamento: o pedido nasce PLACED e o estado pré-pagamento fica para
  a pd-17; o carrinho vive só no cliente e quem precifica é POST /order-quotes;
  a auditoria nasce como porta chamada pela aplicação e não como interceptor
  HTTP; a agenda semanal é JSONB escrita pelo seed; o fuso é fixo e sem
  biblioteca de datas; Refund nasce sem PSP; a transação atravessa módulos por
  um contexto opaco; o job roda em um runner próprio sem @nestjs/schedule; e a
  idempotência de POST /orders é uma coluna única, não um interceptor. Três
  delas contrariam a letra de documentos canônicos, e é por isso que este ADR
  existe.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 03-engineering/SECURITY.md
  - 04-api/API_GUIDELINES.md
  - 04-api/ERROR_MODEL.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md
  - 06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md
  - 08-features/orders/PEDIDO_E_CARRINHO.md
type: decision
---

# ADR-0017: O pedido antes do pagamento

## Contexto

A jornada **J3** parava na vitrine: *"J3 não existe: sem carrinho, sem
checkout"* (`USER_JOURNEYS`). O comparador levava o tutor até `/loja/{id}` e
acabava ali — o produto tinha uma vitrine e nenhuma forma de comprar.

Três coisas destravaram a implementação, e uma continuava travada:

| O que estava resolvido | Onde |
|---|---|
| Prazo de aceite, agenda semanal, item em falta, cancelamento e `Refund` | [ADR-0014](0014-ciclo-do-dinheiro-no-pedido.md) |
| `OWNER` × `OPERATOR` | [ADR-0013](0013-papeis-de-loja-owner-e-operator.md) |
| Snapshot, comissão por categoria, um pedido uma loja | [ADR-0004](0004-arquitetura-mvp-marketplace.md) |
| **O PSP** | ❌ nada — a integração é a `pd-17` |
| **`StoreMember`** | ❌ nada — a tabela e o `StoreScopeGuard` são a `pd-16` |

O briefing do Victor foi explícito: *"`orders` — carrinho, pedido e máquina de
estados, **sem pagamento**. O pedido para em `PLACED`."* Construir o pedido
nesse recorte obriga a decidir nove coisas cujo custo de reversão é real, e
**três delas contrariam a letra** de documentos canônicos. É por isso que este
ADR existe: sem ele, quem ler o `SYSTEM_ARCHITECTURE` daqui a três meses vai
encontrar "Audit interceptor na borda" e concluir que a implementação está
errada.

---

## Decisão

### A1 — O pedido nasce `PLACED`, e o estado anterior ao pagamento fica para a `pd-17`

O fluxo 1 do `SYSTEM_ARCHITECTURE` põe `order.status = PLACED` **depois** do
webhook do PSP, o que implica um estado antes dele. O `OrderStatus` do
`DOMAIN_MODEL` começa em `PLACED`. Os dois estão certos em momentos
diferentes, e a `pd-15` fica com o segundo: **o pedido é criado já em
`PLACED`**, com `placed_at = created_at`.

**Por quê:** acrescentar um `PENDING_PAYMENT` agora seria criar um valor de
enum **sem produtor** — exatamente o problema que os próprios documentos
apontam em `SUBSTITUTED`. E a pergunta que esse estado responde ("o pedido é
criado antes ou depois da intenção de pagamento?") é da `pd-17`, com o PSP na
mão, não de uma tarefa que não fala com PSP nenhum.

**Custo assumido:** o `PlaceOrderUseCase` é parcialmente reescrito na `pd-17`.
Barato, porque a tabela de transições é **dado** (A3): acrescentar o estado é
`ALTER TYPE … ADD VALUE` numa migration aditiva, uma linha na tabela, e mover o
`→ PLACED` para o handler do webhook.

### A2 — Só o lado do tutor, mais o job. Os endpoints da loja são a `pd-16`

Nascem `POST /order-quotes`, `POST /orders`, `GET /orders`,
`GET /orders/{orderId}`, `POST /orders/{orderId}/cancellation` e o **job de
auto-recusa**. Aceitar, recusar, despachar, entregar e marcar item indisponível
**não nascem como rota** — mas nascem inteiros no domínio, puros e testados.

**Por quê:** sem `StoreMember` não há como saber **qual** loja um
`STORE_MEMBER` opera — o ADR-0013 B7 decidiu que o token não carrega isso, de
propósito. Um endpoint de aceite sob `@Roles('STORE_MEMBER')` e mais nada
deixaria a loja A aceitar o pedido da loja B, que é literalmente o buraco que o
`StoreScopeGuard` existe para fechar e que o ADR-0011 A2 recusou correr.

**Consequência visível e correta:** na `pd-15` **todo pedido expira** em 15
minutos úteis, porque ninguém pode aceitar. É o comportamento que o ADR-0014
descreve.

### A3 — A máquina de estados é uma tabela de dados, não uma cadeia de `if`s

`ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]>`, e funções
puras (`acceptOrder`, `rejectOrder`, `expireAcceptance`, `dispatchOrder`,
`deliverOrder`, `cancelOrderByTutor`, `cancelOrderByStore`,
`markItemUnavailable`) que recebem o pedido e o instante e devolvem
`{ order, refund }` — **o pedido novo e a devolução que a saída gera, juntos**.

**Por quê:** um teste unitário percorre a tabela inteira e prova que tudo fora
dela levanta, o que nenhum conjunto de `if`s espalhados permite. Devolver a
devolução **junto** da transição é o que materializa *"toda saída que não é
entrega termina em `Refund`"* (ADR-0014) na própria função que decide a saída —
não há como obter o pedido novo sem receber também o dinheiro que ele deve.

`DELIVERED`, `REJECTED` e `CANCELLED` não têm saída. O `DOMAIN_MODEL` só
nomeava o primeiro e o último; **`REJECTED` é terminal pelo mesmo motivo**.

### A4 — A transição é condicional ao estado atual (compare-and-set)

`UPDATE orders SET … WHERE id = ? AND status = ?`. Zero linhas afetadas ⇒ a
transição é recusada e **os efeitos colaterais não rodam**. `Refund` e linha de
auditoria nascem na **mesma transação** Postgres.

**Por quê:** é o precedente da rotação do refresh token (ADR-0011 A7) e o que o
ADR-0014 C7 exige do job. A `pd-14` aceitou duas escritas sem transação porque
o `PUT` era idempotente e repetir corrigia; **aqui repetir não corrige** um
`REJECTED` sem `Refund` — é dinheiro que deixou de existir.

⚠️ **Aprendizado da implementação, registrado porque contradiz a expectativa
do plano:** com o advisory lock no lugar, duas varreduras do job **não**
exercitam o compare-and-set (a segunda não encontra pedido vencido). O que o
exercita é **duas requisições HTTP simultâneas de cancelamento**, e foi preciso
escrever esse teste para que a condição estivesse de fato protegida. O mesmo
vale para a unicidade de `Idempotency-Key`: o replay sequencial passa sem o
índice, porque a consulta na aplicação responde antes. Sentinela que não cai
quando a regra some não protege nada.

### A5 — O carrinho vive só no cliente

`localStorage` no web, **memória** no nativo, por uma porta com duas
implementações (o padrão do `session-storage`). Um carrinho, uma loja. **O
servidor nunca vê um carrinho.**

**Por quê:** `Cart` **não é entidade do `DOMAIN_MODEL`** — criá-la no banco
mudaria o modelo de domínio para resolver um problema que o piloto não tem (uma
pessoa por aparelho), e "carrinho abandonado" está em `IDEIAS` como
oportunidade **sem dono**. O que precisa de fonte única — preço, taxa,
comissão, disponibilidade, loja aberta — **não está no carrinho**: está na
cotação (A6).

**Consequência assumida:** no nativo o carrinho some ao fechar o app.
`expo-secure-store` é a ferramenta errada (keychain, ~2 KB) e `AsyncStorage`
não está instalado. **Gatilho para corrigir: o primeiro build nativo.**

### A6 — Nasce `POST /api/v1/order-quotes` → `200`

Valida e precifica o carrinho **sem persistir nada**, pelo mesmo caso de uso
interno (`PriceOrderUseCase`) que o `POST /orders` usa antes de gravar.

**Por quê:** a J3 manda o tutor *ver o total com taxa de entrega e taxa de
serviço* **antes** de pagar. Calcular isso no cliente duplicaria três regras do
servidor (área mais barata que cobre, taxa de serviço, disponibilidade) e
mentiria no dia em que divergissem. `200` e não `201` porque nada é criado;
substantivo (`order-quotes`) e não verbo, pelo `API_GUIDELINES`.

**Nunca devolve comissão.** O take rate é assunto entre a plataforma e a loja
(`SECURITY`), e é o pitch ao lojista (ADR-0003) — não é do tutor.

🔴 **Loja fechada não é erro na cotação.** A cotação responde `200` com
`storeOpenNow: false` e `nextOpeningAt`, para a tela dizer *"Fechada agora ·
abre segunda às 08:00"* e desabilitar o botão. Na **criação** é `409
STORE_CLOSED`, porque criar o pedido fora do horário produziria exatamente o
pedido parado, pago e sem resposta que o ADR-0014 existe para evitar.

### A7 — `Idempotency-Key` é header **obrigatório**, por coluna única

UUID gerado pelo app ao abrir o checkout, trocado após o sucesso. Coluna
`orders.idempotency_key` com índice único `(tutor_id, idempotency_key)`; replay
devolve o **mesmo** pedido com `201`. Header ausente ou inválido → `422`, com
`details[].field = 'Idempotency-Key'`.

**Por quê obrigatório:** é critério de saída do `MVP_SCOPE` e regra do
`API_GUIDELINES`, e idempotência opcional é idempotência que ninguém usa. Esta
é a única rota da API onde repetir significa cobrar duas vezes.

**Por quê coluna e não interceptor:** o `SYSTEM_ARCHITECTURE` prevê um
"Idempotency interceptor". Um interceptor genérico que guarda respostas é
infraestrutura antecipada para **uma** rota; a coluna faz o mesmo trabalho, é
verificável por constraint e não inventa um cache de respostas que ninguém
pediu. Quando o webhook do PSP chegar (`pd-17`), ele traz a sua própria
idempotência por `psp_payment_id` — que também não é um interceptor.

### A8 — `audit_log` nasce aqui, escrito por **porta na aplicação**

Tabela `audit_log` e um módulo de suporte `apps/api/src/audit/` (como `prisma/`
e `health/`: dono de tabela, sem agregado). A porta `IAuditTrail` é chamada
**pelo caso de uso, dentro da transação da transição**. Toda transição de
estado grava uma linha; **criar o pedido não grava** — a própria linha de
`orders`, com `tutor_id` e `placed_at`, já é o registro.

🔴 **Isto contraria a letra de dois documentos**, e é a decisão central deste
ADR:

- o `SYSTEM_ARCHITECTURE` §Transversais diz *"**Audit interceptor**: registra
  quem mudou preço, aceitou/recusou pedido e alterou comissão"*;
- o `SECURITY` §Auditoria diz que `audit_log` e o interceptor *"nascem com a
  primeira delas, que é a escrita de ofertas"*.

**Por que estão errados:** o `SECURITY` nomeia *"aceite ou recusa de pedido"*
entre as quatro mutações que **exigem** rastro — e a `pd-15` produz uma recusa:
a **auto-recusa por prazo vencido**. Ela é feita pelo sistema, **sem ator
humano e sem requisição HTTP**. Um interceptor de borda vê rota e status; não
vê o fato de domínio ("de `PLACED` para `REJECTED`, motivo expiração"), não
sabe o estado anterior, e **não roda dentro de um job**. Adiar a tabela
deixaria a primeira recusa do projeto sem rastro, contra o próprio `SECURITY`.

A `pd-16` (aceite e recusa pela loja) e a escrita de ofertas herdam a porta
pronta, sem código novo de auditoria.

**Payload sem PII:** ids, estados, motivos e valores. Nunca nome, telefone ou
endereço. Logs rotacionam; uma tabela de auditoria não.

**Nome no singular:** `audit_log`, exceção deliberada à regra do plural de
`NAMING_CONVENTIONS`. É o nome canônico em `SECURITY`, `SYSTEM_ARCHITECTURE` e
`QUALITY_ATTRIBUTES` desde a fundação, e renomear o termo para satisfazer a
convenção custaria mais que a exceção.

### A9 — `Refund` nasce como tabela e como módulo `payments` mínimo

Módulo `payments` com **um** caso de uso exportado (`RecordRefundUseCase`),
nenhum controller, nenhuma tabela `payments` ou `payouts`.
`refunds.payment_id` é **nulo permitido e sem FK** — não existe `payments` para
referenciar.

**Por quê no `payments`:** o `SYSTEM_ARCHITECTURE` dá `refunds` a esse módulo.
Criar a tabela dentro de `orders` e movê-la na `pd-17` seria churn com migration
junto.

⚠️ **Consequência assumida:** na `pd-15` nenhum pedido é pago, então cada
`Refund` registra "valor a devolver de um pedido que nunca foi cobrado" — só no
banco de desenvolvimento. A `pd-17` decide se apaga essas linhas ou as ignora
(não há produção). Foi o briefing que pôs `Refund` aqui; a análise mediu o
custo.

### A10 — A transação atravessa módulos por um tipo **opaco**

`apps/api/src/prisma/persistence-context.ts` declara `PersistenceContext`, um
tipo com marca de compilação que **não existe em runtime** e que só duas
funções — no mesmo arquivo — convertem de e para `Prisma.TransactionClient`.
As portas `IAuditTrail.record(entry, context?)` e
`IRefundRepository.create(refund, context?)` aceitam-no; só os adapters `infra/`
o desembrulham.

**Por quê:** é o que permite A4 sem que `domain/` ou `application/` importem
Prisma, que é o que o `CODING_STANDARDS` proíbe. O caso de uso passa adiante um
token que ele mesmo não consegue abrir. **Custo:** um tipo a mais e dois
parâmetros opcionais.

### A11 — A agenda semanal é `stores.opening_hours` (JSONB), escrita pelo seed

`[{ weekday: 0–6, opens: 'HH:MM', closes: 'HH:MM' }]`, várias faixas por dia
(almoço), sem faixa cruzando a meia-noite, **parseada com Zod ao ler e ao
semear, nunca convertida**. `closes` aceita `24:00` como fim do dia.

**Lista vazia = loja nunca aberta = não recebe pedido.** Falha fechada, porque
o ADR-0014 C2 manda recusar antes de cobrar, e uma loja sem agenda aceitando
pedido às 3h é o problema que o ADR existe para evitar.

**Por quê JSONB:** mesmo raciocínio de `postal_code_ranges` (ADR-0010). É
**valor** da loja, lido inteiro para responder "está aberta agora?", nunca
consultado por SQL. Tabela filha normalizaria um value object.

**Quem escreve hoje é o seed** — precedente do ADR-0013 B5 ("como o catálogo é
semeado hoje"). O painel da `pd-16` dá a edição ao **`OWNER`** (ADR-0013 B4: é
decisão comercial, como área de entrega e taxa).

### A12 — Toda a matemática de horário é pura, com fuso fixo e **sem biblioteca de datas**

`packages/domain/zoned-time.ts` e `opening-hours.ts`, fuso
`America/Sao_Paulo` numa constante, via `Intl.DateTimeFormat`. A deadline
**acumula minutos só dentro das faixas** — 18h55 numa loja que fecha 19h ⇒ 5
min hoje e 10 na abertura seguinte — e é **persistida** em
`orders.acceptance_deadline_at` no momento da criação.

**Sem dependência nova:** o Node 24 tem ICU completo e conhece
`America/Sao_Paulo` (conferido). **Offset detectado, nunca `-03:00` fixo:** o
Brasil aboliu o horário de verão por decreto e pode trazê-lo de volta do mesmo
jeito; quando trouxer, os dados do ICU sabem e nenhuma linha aqui muda.

**Persistir a deadline** é o que faz o job ser um `WHERE
acceptance_deadline_at <= now()` indexado em vez de recomputar a agenda de cada
pedido — e é o que garante que **mudar a agenda depois não move a deadline de
um pedido já feito**.

### A13 — O job roda num runner mínimo, **sem `@nestjs/schedule`**

Provider com `OnModuleInit`/`OnModuleDestroy` e `setInterval(...).unref()`,
`ORDER_EXPIRY_SWEEP_INTERVAL_MS` (default 60 000, `0` desliga, desligado sob
`NODE_ENV=test`), chamando um caso de uso que roda **dentro de uma transação
com `pg_try_advisory_xact_lock`**.

**Por quê sem a biblioteca:** o `TECHNOLOGY_STACK` fala em "scheduler
in-process do Nest", o que se lê como `@nestjs/schedule`. O repositório já roda
um pacote fora do peer range (`nestjs-zod` contra o Nest 12, ADR-0007), e um
segundo — para um temporizador que a plataforma já tem — é risco sem ganho.
Quando existir o **segundo job** (a conciliação diária da `pd-17`) haverá duas
necessidades reais para escolher uma biblioteca contra.

⚠️ **O runner não tem teste.** O que é testado é o caso de uso que ele chama,
incluindo a reentrância. Vão declarado.

---

## Alternativas consideradas

- **Carrinho no banco (`carts`/`cart_items`) com sincronização** — descartada
  pelo Victor (13/09/2026). Cria entidade fora do `DOMAIN_MODEL` e dois estados
  a reconciliar (cliente × servidor), sem ganho medido num piloto de uma pessoa
  por aparelho. *Se virar requisito*, `POST /order-quotes` já é o contrato que
  um carrinho no servidor preencheria.
- **Sem cotação: o cliente calcula o total** — descartada. Duplica três regras
  do servidor e mente quando divergir. O tutor veria um total que a API nunca
  disse.
- **`PENDING_PAYMENT` agora** — descartada (A1). Enum sem produtor, e a decisão
  de *quando* o pedido é criado é da `pd-17`.
- **Pedido criado só após a captura** — descartada: o `Payment` referenciaria um
  pedido que não existe.
- **Endpoints da loja sob `@Roles('STORE_MEMBER')` sem escopo por instância** —
  descartada (A2). A loja A aceitaria pedido da loja B.
- **Puxar `StoreMember` + `StoreScopeGuard` para cá** — descartada: dobra a
  entrega e é a `pd-16` inteira.
- **`@nestjs/schedule`** — descartada (A13). Dependência nova, com peer não
  conferido contra o Nest 12, para um `setInterval`.
- **Auditoria por interceptor HTTP** — descartada (A8). Cobre só o que vem por
  rota; o job ficaria de fora, e o interceptor não conhece o estado anterior.
- **Adiar `audit_log` para a escrita de ofertas, como os docs diziam** —
  descartada (A8). Deixaria a primeira recusa auditável do projeto sem rastro.
- **Agenda em tabela filha (`store_opening_hours`)** — descartada (A11).
  Normalizaria um value object que é sempre lido inteiro.
- **`-03:00` fixo, ou uma biblioteca de datas (date-fns-tz, Luxon)** —
  descartada (A12). O offset fixo quebra se o horário de verão voltar; a
  biblioteca é uma dependência para o que o `Intl` do Node já faz.
- **`refunds` dentro de `orders`, movida depois** — descartada (A9). Churn com
  migration.
- **Transação distribuída, ou nenhuma transação** — descartada (A4/A10). A
  primeira é infraestrutura para um problema que um Postgres único não tem; a
  segunda deixa `REJECTED` sem `Refund`.
- **`Idempotency-Key` opcional, ou um interceptor genérico de idempotência** —
  descartada (A7).

---

## Consequências

**Positivas**

- **A J3 anda até o pedido.** O comparador deixa de terminar numa vitrine:
  montar o carrinho, conferir o endereço, ver o total com as duas taxas, fazer
  o pedido e acompanhá-lo passam a existir.
- **A máquina de estados está inteira e testada**, incluindo as transições que
  ainda não têm ator. A `pd-16` liga controllers a casos de uso que já têm
  forma, e a `pd-17` acrescenta um estado com uma linha.
- **O projeto passa a ter rastro** desde a primeira mutação que o exigia, e a
  porta serve `pd-16` e a escrita de ofertas sem código novo.
- **O prazo do ADR-0014 funciona de verdade**, com o relógio que pausa fora do
  horário coberto por teste unitário puro.
- **A tabela de comissão sai do papel** com override por loja e comissão zero
  por indicação, cobertos por unidade e verificados no snapshot de um pedido
  real.

**Negativas, aceitas**

- 🔴 **Na `pd-15` todo pedido expira**, porque ninguém pode aceitar. É o
  comportamento correto do ADR-0014 e some na `pd-16`.
- **Cada `Refund` é de um pedido que nunca foi cobrado** (A9), só em
  desenvolvimento.
- **O `PlaceOrderUseCase` é parcialmente reescrito na `pd-17`** (A1).
- **`STORE_REFERRAL` continua sem produtor.** A regra existe e é testada;
  falta `referral_code` em `stores` (J6). Mesma situação de `SUBSTITUTED`.
- **O runner do job não tem teste** (A13), e as telas não têm teste de
  renderização (ADR-0012 A11).
- **O carrinho nativo é em memória** (A5), com gatilho nomeado.
- 🔴 **`orders.tutor_id` é `ON DELETE RESTRICT`**, então apagar uma conta que já
  pediu **falha no banco**. É desejado — o pedido é registro fiscal — e a
  capacidade 14 (exclusão a pedido do titular) já previa **anonimizar e
  preservar o registro** (`SECURITY` §LGPD), não apagar. Fica na vigilância do
  `BACKLOG` com esse gatilho.
- **Dado pessoal duplicado:** o pedido guarda nome, telefone e endereço do
  tutor como snapshot (é o mínimo que a loja precisa para entregar,
  `SECURITY` §LGPD). A anonimização da capacidade 14 terá de alcançá-los.
- **Três documentos canônicos foram corrigidos** — `SYSTEM_ARCHITECTURE`,
  `SECURITY` e `TECHNOLOGY_STACK` —, e um quarto (`DOMAIN_MODEL`) teve o
  "nasce já pago" datado. Quem lesse a versão anterior concluiria que a
  implementação está errada.
- **As comissões do seed são hipóteses** (`PLACEHOLDER`), e as 8 lojas do
  piloto passaram a `ACTIVE` para que um pedido possa existir em
  desenvolvimento. A invariante "`ACTIVE` exige `psp_recipient_id`" **não é
  verificável** até a coluna existir (J6/`pd-17`).

---

## Status

`accepted` — 13/09/2026. Decisões **A1–A13** tomadas na análise (Fable) e
**P1–P9** pelo **Victor** no portão da `pd-15`, em bloco, sobre recomendação da
IA. Implementadas na branch `pd-15/feat/pedido-carrinho-e-maquina-de-estados`.
