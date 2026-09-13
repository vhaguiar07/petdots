---
title: Feature — Pedido e Carrinho
status: stable
version: "1.2"
updated: 2026-09-13
scope: >
  Visão transversal do pedido no PetDots — banco, API, máquina de estados, job
  e cliente numa leitura só: as cinco tabelas novas e a coluna de agenda, as
  cinco rotas de /orders e /order-quotes, a idempotência por header, a posse
  por 404, a auto-recusa por prazo vencido, o carrinho que vive só no
  aplicativo, as telas novas e o "Adicionar" no comparador, o que a feature
  deliberadamente ainda não faz (pagamento, ações da loja, substituição,
  notificação) e como o Victor opera isso hoje.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 01-product/USER_JOURNEYS.md
  - 03-engineering/SECURITY.md
  - 04-api/API_GUIDELINES.md
  - 04-api/ERROR_MODEL.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md
  - 06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md
  - 06-decisions/ADR/0017-pedido-antes-do-pagamento.md
  - 08-features/comparador/COMPARADOR_DE_PRECOS.md
  - 08-features/tutors/PERFIL_DO_TUTOR_E_PETS.md
type: product
---

# Feature — Pedido e Carrinho

> Leitura transversal de **uma** feature: banco → API → cliente, o que ela não
> faz, e como operá-la. O detalhe de cada camada continua nos documentos
> canônicos — [`DOMAIN_MODEL`](../../01-product/DOMAIN_MODEL.md) para as
> entidades, [`ERROR_MODEL`](../../04-api/ERROR_MODEL.md) para os códigos,
> [ADR-0014](../../06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md) para o
> ciclo do dinheiro e
> [ADR-0017](../../06-decisions/ADR/0017-pedido-antes-do-pagamento.md) para o
> porquê de cada decisão de implementação.

---

## O que é

O caminho da vitrine até o pedido feito — **sem pagamento**. Entregue na
`pd-15` (13/09/2026), é a capacidade 6 do `MVP_SCOPE`, parcial:

1. na vitrine da loja, cada oferta ganhou **"Adicionar"**, e a loja diz se está
   **aberta agora**;
2. o carrinho vive **no aplicativo** — um carrinho, uma loja;
3. `/carrinho` pede ao servidor uma **cotação** a cada mudança, e mostra
   subtotal, entrega, taxa de serviço e total;
4. **"Fazer pedido"** cria o pedido, que nasce `PLACED`;
5. `/pedidos` lista, `/pedidos/{id}` acompanha, e enquanto a loja não aceita o
   tutor pode **cancelar**;
6. se ninguém aceitar dentro do prazo, um **job auto-recusa** o pedido.

⚠️ **Nada é cobrado.** Não há PSP, não há Pix, não há `Payment` — `pd-17`.

✅ **Desde a `pd-16` o pedido tem o outro lado** (13/09/2026, ADR-0018 — ver
[`PAINEL_DO_LOJISTA`](../stores/PAINEL_DO_LOJISTA.md)): a loja aceita, separa,
despacha e confirma a entrega pelo painel. ⚠️ A v1.1 deste documento dizia que
**todo** pedido acabava expirando, e era verdade: nada produzia `ACCEPTED`.
Agora só expira o que ninguém aceita — que é o comportamento que o ADR-0014 C2
descreve.

---

## Banco

Cinco tabelas novas, uma coluna nova e seis enums, na quinta migration
(`create_orders_refunds_commission_and_audit_log`):

| Tabela | Dono | Para quê |
|---|---|---|
| `orders` | `orders` | O pedido: uma loja, um tutor, os totais congelados |
| `order_items` | `orders` | As linhas, com o **snapshot** de tudo |
| `refunds` | `payments` | O caminho de volta do dinheiro (ADR-0014 C5) |
| `commission_rates` | `catalog` | O take rate por categoria, historizado |
| `store_commission_rates` | `stores` | A tarifa de fundador — exceção por loja |
| `audit_log` | `audit` (suporte) | Quem mudou o quê, e quando |

E `stores.opening_hours` (JSONB, default `[]`), a agenda semanal.

### O snapshot, e as quatro razões dele

`order_items` guarda `product_name_snapshot`, `product_variant_snapshot`,
`category_snapshot`, `unit_price_cents`, `commission_rate_bps_snapshot` e
`commission_amount_cents`. Nenhum JOIN reconstrói isso, por quatro motivos
independentes:

1. **Contábil.** O pedido é registro imutável (ADR-0004 #5), e o `Payout` da
   `pd-17` é calculado sobre os itens entregues **usando o snapshot**. Um JOIN
   pagaria a loja pelo preço de hoje, não pelo que o tutor pagou.
2. **A historização da tabela de comissão não basta.** `commission_rates` tem
   vigência, mas a **categoria do produto** pode mudar por operação
   administrativa e o **override da loja** pode expirar. Reconstruir "qual taxa
   valia" exigiria historizar três tabelas com semântica de instante idêntica.
3. **Fronteira de módulo.** `orders` **não pode** fazer JOIN em `products`,
   `offers` ou `stores` (`CODING_STANDARDS`). O snapshot é o que torna o pedido
   legível sem consultar outro módulo.
4. **O produto pode sair do catálogo** e o pedido precisa continuar dizendo o
   que foi comprado.

Pelo mesmo motivo, `order_items.product_id` e `offer_id` **não têm FK**: são
rastro, não junção.

### As constraints que carregam regra

Escritas à mão na migration, porque o Prisma não modela `CHECK` — quinze delas.
A que importa mais:

```sql
CHECK ("total_cents" = "items_total_cents" + "delivery_fee_cents" + "service_fee_cents")
```

É a invariante mais citada do `DOMAIN_MODEL`, e é o banco que a sustenta para
uma linha escrita por um seed, um script ou o `prisma studio`. Nada arredonda,
então a igualdade pode ser exata. As demais: nenhum valor monetário negativo,
`quantity > 0`, `unit_price_cents > 0`, `amount_cents > 0` num refund,
`rate_bps` entre 0 e 10000, vigência que não termina antes de começar, e
`jsonb_typeof(opening_hours) = 'array'`.

### As duas FKs que são `RESTRICT`

`orders.tutor_id` e `orders.store_id` **não** são `CASCADE`. O pedido é registro
fiscal: apagar um tutor ou uma loja não pode apagá-lo.

⚠️ **Consequência:** apagar uma conta que já pediu **falha no banco**. É
desejado — a capacidade 14 (exclusão a pedido do titular) já previa
*anonimizar e preservar o registro* (`SECURITY` §LGPD), não apagar. Está na
vigilância do `BACKLOG` com esse gatilho.

### Índices

`orders (store_id, status, placed_at)` — exigido pelo `SYSTEM_ARCHITECTURE`
para o painel do lojista; `orders (tutor_id, placed_at DESC)` — a lista do
tutor; `orders (status, acceptance_deadline_at)` — a varredura do job;
`orders (code)` único; `orders (tutor_id, idempotency_key)` único;
`order_items (order_id)`; `refunds (order_id)`;
`audit_log (entity_type, entity_id)` e `audit_log (created_at)`.

---

## API

Cinco rotas, todas fechadas e sob `@Roles('TUTOR')`:

| Rota | Resposta | O que faz |
|---|---|---|
| `POST /api/v1/order-quotes` | `200` | Precifica o carrinho. **Não persiste nada** |
| `POST /api/v1/orders` | `201` + `Location` | Cria o pedido. Exige `Idempotency-Key` |
| `GET /api/v1/orders` | `200` | Os pedidos do chamador, mais recentes primeiro |
| `GET /api/v1/orders/{orderId}` | `200` | Um pedido do chamador |
| `POST /api/v1/orders/{orderId}/cancellation` | `200` | Cancela, até a loja aceitar |

### Cotação × criação: a mesma conta, duas respostas para loja fechada

As duas passam pelo **mesmo caso de uso interno** (`PriceOrderUseCase`): o que
o tutor vê antes de confirmar e o que vai para o banco são calculados pelo
mesmo código, sobre as mesmas linhas.

🔴 Onde diferem é a loja fechada:

- **cotação:** `200`, com `storeOpenNow: false` e `nextOpeningAt`. A tela diz
  *"Fechada agora · abre às 08:00"* e desabilita o botão;
- **criação:** `409 STORE_CLOSED`, com a mensagem dizendo quando abre. Fora do
  horário o pedido **não é criado** (ADR-0014 C2).

### A cotação nunca devolve comissão

Nem no corpo do pedido, nem no da cotação. O take rate é assunto entre a
plataforma e a loja (`SECURITY`: *"o histórico de vendas de uma Loja não é
visível"*) e é o pitch ao lojista (ADR-0003). O `tutorId` também não aparece:
o pedido é de quem tem o token.

### `Idempotency-Key` é obrigatório

UUID no header de `POST /orders`, gerado pelo app ao abrir o checkout e trocado
após o sucesso. Repetir devolve **o mesmo pedido** com `201` — o cliente que
tentou de novo numa rede ruim não sabe se a primeira tentativa chegou, e não
precisa saber. Ausente ou inválido: `422`, com `details[].field =
'Idempotency-Key'`.

### Posse: `404`, nunca `403`

Pedido de outro tutor responde `404 ORDER_NOT_FOUND`, tanto na leitura quanto
no cancelamento. `403` confirmaria que o id existe e tem dono — o fato que um
estranho não pode sondar. A posse é imposta no `where` da própria consulta, o
mesmo padrão que a `pd-14` fixou para pets: não existe caminho em que a linha
alheia chega à mão e só depois é escondida.

### Os códigos de erro

Novos: `STORE_CLOSED` (409), `ORDER_NOT_FOUND` (404), `TUTOR_PROFILE_REQUIRED`
(409), `ORDER_ITEMS_INVALID` (422). Reservados que passaram a ser produzidos:
`STORE_NOT_ACTIVE` (409), `OFFER_UNAVAILABLE` (409),
`ADDRESS_OUT_OF_DELIVERY_AREA` (422), `ORDER_INVALID_TRANSITION` (409),
`STORE_NOT_FOUND` (404).

O corte `409` × `422` segue o `ERROR_MODEL`: conflito de **estado** é `409`
(loja fechada, loja inativa, oferta fora da prateleira, pedido já mudou); regra
sobre o **dado enviado** é `422` (oferta que não existe, de outra loja ou
repetida; endereço que nenhuma área cobre).

---

## Máquina de estados

Vive inteira no domínio, como **dado**:

| De | Pode ir para |
|---|---|
| `PLACED` | `ACCEPTED`, `REJECTED`, `CANCELLED` |
| `ACCEPTED` | `DISPATCHED`, `CANCELLED` |
| `DISPATCHED` | `DELIVERED` |
| `DELIVERED`, `REJECTED`, `CANCELLED` | — (terminais) |

Cada transição é uma função pura que devolve **o pedido novo e a devolução que
a saída gera**, juntos — é o que torna *"toda saída que não é entrega termina
em `Refund`"* uma propriedade da função, não uma convenção a lembrar.

**Quem produz cada uma** — completo desde a `pd-16`:

| Transição | Quem | Desde |
|---|---|---|
| `PLACED → CANCELLED` | ✅ o tutor, por botão | `pd-15` |
| `PLACED → REJECTED` (`ACCEPTANCE_EXPIRED`) | ✅ o job | `pd-15` |
| `PLACED → ACCEPTED` | ✅ a loja | `pd-16` |
| `PLACED → REJECTED` (`STORE_REJECTED`) | ✅ a loja | `pd-16` |
| `ACCEPTED → DISPATCHED` | ✅ a loja | `pd-16` |
| `DISPATCHED → DELIVERED` | ✅ a loja | `pd-16` |
| `ACCEPTED → CANCELLED` | ✅ a loja, com motivo | `pd-16` |
| item → `UNAVAILABLE` | ✅ a loja | `pd-16` |
| item → `SUBSTITUTED` | ⏳ ninguém | — |

A `pd-16` não reescreveu nada disso: o código já existia, puro e testado, e o
que faltava era quem o chamasse. As rotas da loja vivem em
`orders/store-orders.controller.ts`, sob o `StoreScopeGuard`.

### A transição é condicional ao estado atual

`UPDATE … WHERE id = ? AND status = ?`. Zero linhas ⇒ alguém chegou antes, e os
efeitos colaterais **não rodam**. `Refund` e auditoria nascem na mesma
transação.

---

## O prazo de aceite, e o job

A loja tem **15 minutos** para aceitar (`ACCEPTANCE_WINDOW_MINUTES`), e o
relógio **só corre em horário de funcionamento**: um pedido às 18h55 numa loja
que fecha às 19h gasta 5 minutos hoje e retoma os 10 restantes na abertura
seguinte. A conta é pura, testada, e o resultado é **persistido** em
`orders.acceptance_deadline_at` — mudar a agenda depois não move a deadline de
um pedido já feito.

Vencido o prazo, o `OrderExpirySweeper` (um `setInterval`, sem biblioteca de
scheduling) chama a varredura a cada `ORDER_EXPIRY_SWEEP_INTERVAL_MS`
(default 60 000; `0` desliga; desligada sob `NODE_ENV=test`). A varredura roda
dentro de uma transação com `pg_try_advisory_xact_lock`, e cada transição é o
compare-and-set acima — duas execuções simultâneas produzem **uma** recusa, um
`Refund` e uma linha de auditoria.

---

## Auditoria

`audit_log` nasceu aqui, e é escrita **pela camada de aplicação através de uma
porta**, na mesma transação da transição — **não** por um interceptor HTTP.

O motivo é a própria auto-recusa: ela é feita por um **job, sem requisição**, e
carrega um fato que um interceptor de borda não vê ("de `PLACED` para
`REJECTED`, motivo expiração"). O `SECURITY` nomeia *"aceite ou recusa de
pedido"* entre as quatro mutações que exigem rastro, e esta é a primeira delas
a existir.

O que tem rastro hoje: `order.cancelled` (ator `USER`) e `order.rejected`
(ator `SYSTEM`, sem `actor_user_id` e sem `request_id`). **Criar o pedido não
grava linha** — a própria linha de `orders` já diz quem, quando e o quê.

🔴 **O payload carrega só ids, estados, motivos e valores.** Nunca nome,
telefone ou endereço: logs rotacionam, uma tabela de auditoria não.

---

## Cliente (`apps/app`)

| Tela | Rota | O que faz |
|---|---|---|
| Comparador | `/precos/{slug}` (pública) | **"Adicionar"** por loja, direto da comparação |
| Vitrine da loja | `/loja/{storeId}` (pública) | **"Adicionar"** por oferta, horário, barra do carrinho; destaca o produto que veio no `?produto=` |
| Carrinho / checkout | `/carrinho` (pública) | Linhas, cotação, totais, **"Fazer pedido"** |
| Meus pedidos | `/pedidos` (privada) | Lista, mais recentes primeiro |
| Pedido | `/pedidos/{orderId}` (privada) | Status, itens, totais, **"Cancelar pedido"** |

### Dois lugares põem item no carrinho, e a regra é uma só

O **comparador** (`/precos/{slug}`) e a **vitrine** (`/loja/{storeId}`). Os
dois usam o mesmo `useAddToCart` e os mesmos componentes — o botão, a barra do
carrinho e o card de conflito vivem em `apps/app/src/cart/add-to-cart.tsx`.

🔴 **Adicionar do comparador é o caminho curto, e o mais seguro.** A pessoa está
olhando uma tabela de lojas para **um** produto; o botão adiciona **aquela
oferta**. Fazê-la navegar até a vitrine para agir significaria escolher o
produto de novo numa prateleira de dezenas — e o catálogo do piloto tem a mesma
ração em 3 kg e 15 kg, adjacentes por ordem alfabética. Re-decidir o que já foi
decidido é onde se compra a variante errada.

Quem vai à vitrine mesmo assim chega com `?produto={slug}`, e encontra o item
num card no topo com **"Adicionar"** e uma etiqueta **"o que você procurava"** na
linha da tabela. O parâmetro é só uma dica: se o produto não estiver mais na
prateleira daquela loja, a página ignora e mostra a prateleira normal.

### O carrinho vive só aqui

`localStorage` no web (chave `petdots.cart`), **memória** no nativo, por uma
porta com duas implementações — o mesmo padrão do `session-storage`. Parseado
com Zod ao carregar, nunca convertido: um carrinho escrito por uma versão
antiga é descartado, e a pessoa escolhe de novo.

**O servidor nunca vê um carrinho.** `Cart` não é entidade do `DOMAIN_MODEL`.

⚠️ **No nativo o carrinho some ao fechar o app.** `expo-secure-store` é a
ferramenta errada (keychain, ~2 KB) e `AsyncStorage` não está instalado.
Gatilho: **primeiro build nativo**.

### O checkout mostra os preços da cotação, não os do carrinho

O carrinho guarda o preço para a barra do rodapé mostrar um total sem uma
requisição por toque. O que é **cobrado** é o que a cotação diz — e é isso que
`/carrinho` exibe. A cotação é refeita a cada mudança, com debounce de 300 ms e
`AbortController`, para que uma resposta atrasada não sobrescreva um total mais
novo.

### Cada bloqueio tem uma saída desenhada

| Código | O que a tela mostra |
|---|---|
| sem sessão | **"Entre para fazer o pedido"** → `/entrar?next=/carrinho` |
| `TUTOR_PROFILE_REQUIRED` | **"Complete seu endereço"** → `/conta/endereco?next=/carrinho` |
| `ADDRESS_OUT_OF_DELIVERY_AREA` | **"Esta loja não entrega no seu endereço"** + editar endereço / ver outras lojas |
| `OFFER_UNAVAILABLE`, `ORDER_ITEMS_INVALID` | **"Um item saiu da prateleira"** + remover |
| `STORE_NOT_ACTIVE`, `STORE_NOT_FOUND` | **"Esta loja não está recebendo pedidos"** |
| loja fechada | botão desabilitado + quando abre |

Nenhuma falha cai em tela branca (BUG-R01).

### Cancelar confirma em duas etapas

**"Cancelar pedido"** → **"Confirmar cancelamento"**, o mesmo padrão da exclusão
de pet: cancelar não se desfaz, e um toque único ao lado do status é fácil
demais de acertar por engano.

---

## Regras

- **Um pedido, uma loja.** Adicionar item de outra loja pergunta antes de
  trocar; a resposta é da pessoa.
- **Snapshot:** mudar preço de oferta, categoria de produto ou tabela de
  comissão **nunca** altera pedido existente.
- **Taxa de entrega** = a da **área ativa mais barata da loja que cobre o
  endereço** — a mesma regra que o comparador já promete.
- **Taxa de serviço** = R$ 1,99, constante em `packages/domain` (ADR-0003 #2).
  É decisão de produto registrada em ADR, não configuração de ambiente.
- **Comissão** = zero se `STORE_REFERRAL`; senão o override da loja vigente;
  senão a tabela por categoria. Sem taxa vigente, o pedido **não é precificado**
  (levanta, em vez de cobrar zero em silêncio).
- **A loja precisa estar `ACTIVE`** para receber pedido. `≠ PAUSED` governa a
  listagem; `ACTIVE` governa o pedido.
- **Agenda vazia = loja nunca aberta.** Falha fechada.
- **Devolução:** total em recusa, expiração e cancelamento; **só os itens** num
  ajuste por falta — a entrega acontece e o serviço foi prestado (ADR-0014 C6,
  reversível, gatilho *primeira reclamação real de proporção*).
- **Cancelamento:** o tutor até o aceite; a loja depois, a pedido dele **pelo
  telefone**; ninguém depois do despacho.

---

## O que esta feature **não** faz ainda

- **Pagamento.** Nenhum PSP, nenhum Pix, nenhum `Payment`. O pedido não é pago
  — `pd-17`.
- **Substituição assistida** (`SUBSTITUTED`): enum sem produtor, gatilho *existir
  canal de atendimento no pedido*.
- **Motivo em texto livre na recusa pela loja.** A recusa existe desde a
  `pd-16`, mas `rejection_reason` é enum (ADR-0018 A9). Em `IDEIAS`, gatilho:
  *primeiro tutor perguntando por que foi recusado*.
- **`STORE_REFERRAL`**: regra implementada e testada, sem produtor. Gatilho:
  `referral_code` em `stores` (J6).
- **Notificação** à loja ou ao tutor. Nada avisa ninguém — capacidade 10.
- **Entrega** (`Delivery`) e **repasse** (`Payout`).
- **Carrinho no servidor** e recuperação de carrinho abandonado.
- **Paginação** de `GET /orders`. Gatilho: primeiro tutor com mais de ~50
  pedidos.
- **Leitura da auditoria.** `audit_log` não tem rota: o console que a mostraria
  é pendência do backlog.
- **Exportação e exclusão a pedido do titular** — capacidade 14, e agora com o
  agravante de que o pedido guarda dado pessoal que terá de ser **anonimizado**,
  não apagado.

---

## Como o Victor opera hoje

**Comissões e agendas são semeadas**, como o catálogo:

```bash
npm run prisma:migrate      # aplica a sexta migration
npm run build
npm run db:seed             # ⚠️ obrigatório: grava comissões, agendas e ACTIVE
```

- **A tabela de comissão** está em `apps/api/src/seed/data/commission-rates.ts`,
  marcada `PLACEHOLDER`. Trocar um número ali e rodar o seed de novo é o
  procedimento inteiro. Os valores são hipóteses do ADR-0003 — a calibração é
  de campo.
- **As agendas** estão em `apps/api/src/seed/data/pilot.ts`. Todas as 8 lojas
  do piloto abrem seg–sáb 08:00–19:00; duas fecham para almoço (12:00–14:00) e
  uma abre domingo de manhã.
- **As 8 lojas passaram a `ACTIVE`** — sem isso nenhum pedido pode ser criado em
  desenvolvimento. São fictícias e não podem chegar a um deploy público.

**Para olhar o que aconteceu:** `npx prisma studio` → `orders`, `order_items`,
`refunds`, `audit_log`.

**Para testar sem esperar 15 minutos**, adiantar a deadline e esperar uma
varredura (≤ 60 s):

```sql
UPDATE orders SET acceptance_deadline_at = now() - interval '1 minute'
WHERE code = 'ABC123';
```

**Para que os pedidos do banco local não expirem** enquanto você testa outra
coisa, suba a API com `ORDER_EXPIRY_SWEEP_INTERVAL_MS=0`. ⚠️ **Remova a
variável para testar o painel**: a auto-recusa é justamente o que o roteiro da
loja quer ver **não** acontecer sobre um pedido aceito.

**Para atender o pedido pelo outro lado**, entre como `lojista@dev` (ou
`operador@dev`) e abra **"Painel da loja"** — o procedimento inteiro está em
[`PAINEL_DO_LOJISTA`](../stores/PAINEL_DO_LOJISTA.md), inclusive como ligar uma
loja real a uma conta com `npm run store:add-member`.

⚠️ **Todo pedido de desenvolvimento acaba `REJECTED`**, porque ninguém pode
aceitar até a `pd-16`. Não é um defeito.
