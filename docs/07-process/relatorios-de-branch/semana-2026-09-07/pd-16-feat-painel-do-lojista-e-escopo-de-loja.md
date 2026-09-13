---
title: 'Relatório — pd-16/feat/painel-do-lojista-e-escopo-de-loja'
status: stable
version: '1.0'
updated: 2026-09-13
scope: >
  Encerramento da pd-16 — o painel do lojista: sexta migration (store_members),
  o StoreScopeGuard por rota, as treze rotas escopadas, o script de onboarding
  de loja, a escrita de ofertas pelo lojista e as cinco telas sob /painel. Traz
  também duas entregas que nasceram no meio do trabalho: a correção do Ctrl+C no
  Windows (BUG-R02) e o selo de loja fechada no comparador.
relates_to:
  - 06-decisions/ADR/0018-painel-do-lojista-vinculo-escopo-e-app.md
  - 08-features/stores/PAINEL_DO_LOJISTA.md
  - 07-process/BACKLOG.md
  - 07-process/BUGS.md
type: process
---

# pd-16/feat/painel-do-lojista-e-escopo-de-loja

**Encerrada em:** 13/09/2026
**Merge:** `ed9ff47` em `develop` (PR [#16](https://github.com/vhaguiar07/petdots/pull/16), squash)
**ADR:** [0018 — O painel do lojista: vínculo por script, escopo por rota e o painel no mesmo app](../../../06-decisions/ADR/0018-painel-do-lojista-vinculo-escopo-e-app.md)

---

## Objetivo

Nas palavras do Victor, ao abrir a Fase 1:

> "O painel do lojista — `StoreMember`, `StoreScopeGuard` e as ações da loja no
> pedido. É a capacidade 11 do `MVP_SCOPE`."

E o porquê da urgência, que é a frase que define a entrega:

> "**Por que esta tarefa é urgente, e não só a próxima da fila:** a `pd-15`
> entregou o pedido, mas a loja não tem endpoint para aceitá-lo. Como o job de
> auto-recusa já roda, **todo pedido criado hoje termina auto-recusado em 15
> minutos úteis**. O tutor compra e nada acontece. Tirar o pedido desse limbo é
> o produto desta tarefa."

Ele também foi explícito sobre o que **não** se reabre: ADR-0013 (papéis),
ADR-0014 (prazo, item em falta, cancelamento), ADR-0017 (pedido antes do
pagamento), e *"não reescreva o domínio"* — os casos de uso já existiam, puros e
testados, e faltava quem os chamasse.

## Diagnóstico

> Feature, mas com um defeito de produção no meio: o item que o `BACKLOG`
> descrevia errado, e que a IA teria confiado.

| # | O que estava errado | Como se sabe |
|---|---|---|
| 1 | **Nenhuma transição de saída da loja tinha produtor.** `findOverdue` filtra `status = 'PLACED'`, e nada produzia `ACCEPTED` — logo todo pedido era varrido | Leitura de `prisma-order.repository.ts:findOverdue` + `order-expiry.sweeper.ts`; confirmado pelo e2e S4, que hoje falha se o filtro sair |
| 2 | **`POST /auth/register` só concede `TUTOR`** — quem se cadastra pela tela nunca ganharia `STORE_MEMBER`, e o `RolesGuard` global o barraria **antes** de o `StoreScopeGuard` existir na requisição | Leitura de `register.use-case.ts`; virou a prova de vermelho (e) |
| 3 | 🔴 **O item "Escrita de ofertas pelo lojista" do `BACKLOG` estava errado nas duas metades** — dizia que o `audit_log` com o `Audit` **interceptor** "nasce justamente aqui". Nasceu na `pd-15`, e **não** como interceptor: como porta chamada pela aplicação | ADR-0017 A8 e o código de `audit/audit-trail.port.ts`. Corrigido no item, com a data |
| 4 | **`FindStoreUseCase` esconde loja `PAUSED`** — usá-lo para resolver a loja de um membro trancaria a dona fora do painel exatamente quando a loja está pausada | Leitura de `find-store.use-case.ts`; virou o teste S11 |

## O que foi feito

Commit único no merge (`ed9ff47`), três na branch antes do squash.

### Banco

- **`prisma/schema.prisma`** — `enum StoreRole` e `model StoreMember`. FK `stores`
  **`CASCADE`** (vínculo sem loja não significa nada) e FK `users` **`RESTRICT`**
  (falha fechada: enquanto remover o último `OWNER` for proibido e sem produtor,
  apagar a conta de quem opera uma loja tem de falhar).

### API

- **`common/guards/store-scope.guard.ts`** — o guard, aplicado por controller.
  Uma consulta pelo índice único, `storeId` do path, `403 STORE_SCOPE_DENIED`
  tanto para "não é membro" quanto para "papel insuficiente". Valida
  `params.storeId` com `z.uuid()` **antes** de consultar, porque guards rodam
  antes dos pipes e um id malformado chegaria ao Prisma como `500`.
- **`common/guards/membership-of.ts`** — a única porta pela qual um handler obtém
  o `storeId`. Sem o guard, lança. É o que faz um `@UseGuards` esquecido falhar
  fechando.
- **`common/request-context.ts`** — `callerOf` e `requestIdOf` saíram de
  `tutors.controller.ts` e de `orders.controller.ts`. `stores` precisava do
  primeiro, e um módulo fundacional importando de `tutors` viraria ciclo no dia
  em que `tutors` precisasse de `stores`.
- **`orders/application/store-order-transition.ts`** — as três escritas que toda
  transição da loja deve (status, `Refund`, `audit_log`) numa transação só, com
  o compare-and-set por baixo. Seis casos de uso finos por cima.
- **`offers/`** — `findByIdForStore`, `changePrice`, `changeAvailability` e
  `create`, todos com `storeId` no `where`; três casos de uso e o controller de
  escrita.
- **`seed/store-members.ts`** — `grantStoreMembership`, chamada pelo script CLI e
  pelo seed. Também grava `STORE_MEMBER` em `users.roles`, sem o que o
  diagnóstico #2 se realiza.
- **`seed/add-store-member.ts`** — o CLI. ⚠️ **Não** se recusa em produção: é o
  procedimento de onboarding de loja real; DEV-ONLY são as contas `.local`.

### Cliente

- **Cinco telas** sob `(private)/painel/`, polling de 20 s pausado com a aba
  escondida.
- **`panel/queue.ts`** e **`panel/opening-hours-draft.ts`** — funções puras,
  testadas: a ordenação da fila e a conversão agenda ↔ formulário.
- **`cart/order-labels.ts`** — o tutor passou a distinguir "Recusado pela loja"
  de "não respondeu a tempo", e a ver "Cancelado pela loja" com o motivo.

### Docs

Vinte documentos, e a razão de a lista ser longa é que **vários descreviam o
comportamento antigo como correto** — que é o tipo de documento que restaura o
bug em quem o lê:

- **`SECURITY`** dizia que o `StoreScopeGuard` estava *"bloqueado pela ausência
  de `StoreMember` no schema"*;
- **`AUTHENTICATION`** dizia *"não existe (ADR-0011, A2)"*;
- **`USER_JOURNEYS`** J4 dizia *"nada desta jornada tem tela ou rota ainda"*;
- **`PEDIDO_E_CARRINHO`** e **`AI_CONTEXT`** diziam que **todo** pedido acabava
  expirando;
- **`DEVELOPMENT_GUIDE`** mandava desligar o sweeper por causa disso;
- **`BACKLOG`** carregava o item do diagnóstico #3.

Mais o doc novo [`PAINEL_DO_LOJISTA`](../../../08-features/stores/PAINEL_DO_LOJISTA.md)
e o [ADR-0018](../../../06-decisions/ADR/0018-painel-do-lojista-vinculo-escopo-e-app.md).

### Duas entregas que nasceram no meio do trabalho

- **`BUG-R02` — Ctrl+C não encerrava o servidor de desenvolvimento no Windows.**
  Relatado pelo Victor pela terceira vez. A `pd-15` já tinha tentado corrigir no
  mesmo dia e **removeu o `cmd.exe` errado**: o que engole o sinal é o que o
  `npm run` insere **por cima** do wrapper. `scripts/dev-runner.mjs` agora usa
  três gatilhos redundantes (byte `0x03` do stdin, SIGINT/SIGTERM, vigia do
  processo pai) com `taskkill /T` por baixo. Detalhe em
  [`BUGS.md`](../../BUGS.md).
- **Selo de loja fechada no comparador.** Pedido do Victor ao usar a tela: antes
  ele adicionava ao carrinho e só descobria no checkout (`409 STORE_CLOSED`). A
  linha ganhou "Fechada · abre segunda às 08:00" **sem sair da lista** — indicar
  não é esconder, e a ordenação (ADR-0010 A11) não mudou.

## Migrations

| Migration | O que muda | Aplicada em |
|---|---|---|
| `20260913151213_create_store_members` | Cria `store_members` e o enum `store_role`; único `(store_id, user_id)`, índice em `user_id`, FK `stores` `CASCADE` e FK `users` `RESTRICT` | Banco local em 13/09/2026; CI do PR #16 |

Total no repositório: **seis**.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| As sete do portão (P1–P7), todas iguais às recomendações da análise — inclusive a **Frente 6 obrigatória** | **Usuário** (13/09/2026) |
| Selo de loja fechada: **só o selo**, sem mexer na ordenação | **Usuário** (13/09/2026, entre duas opções apresentadas) |
| Manter a correção do Ctrl+C e o selo **nesta branch** em vez de separar | **Usuário** |
| Mover `callerOf`/`requestIdOf` para `common/request-context.ts` — evita ciclo de import | IA |
| Campo `available` no `storeOfferSchema` (aditivo) — sem ele o painel não mostra o que está desligado | IA |
| Comparador recebe a **agenda crua**, não um `openNow` resolvido no servidor, que envelheceria | IA |
| Erro do filtro da fila nomeia a entrada (`status.0`), como `items.0.offerId` já fazia | IA |
| Selo só no estado **fechado** — carimbar "Aberta" em toda linha vira ruído | IA |

## Validações

| O quê | Resultado |
|---|---|
| Checagem de tipos | verde (7 pacotes) |
| Lint | verde (7 pacotes) |
| Build | verde (5 pacotes) |
| Formatação | `format:check` verde |
| Testes | **52 suítes, 724 testes**, 0 falhas — domain 17/208, contracts 7/130, app 9/101, api 19/285 *(baseline da `pd-15`: 48 suítes, 588 testes)* |
| Contrato | `test:contract` verde; OpenAPI **26 → 39 rotas**, nenhuma removida; 28 → 36 schemas |
| Migrations | `prisma migrate status` → 6, sem pendências |
| Smoke de boot | porta 3999, **10/10 sondagens** (7 públicas `200`, 3 fechadas `401`); derrubada na mesma execução |
| Bloco C (HTTP/SQL, pela IA) | **24/24**, incluindo a auto-recusa **não** agindo sobre pedido aceito, com o controle não-aceito expirando na mesma varredura |
| Seed local | `npm run db:seed` duas vezes, saída idêntica: `…, 4 users, 2 store members` |
| CI do PR | dois jobs `pass` (2m59s e 2m39s) |
| Testes manuais | **validados pelo Victor em 13/09/2026** |

⚠️ **O que NÃO foi verificado pela IA:** o gatilho principal do `BUG-R02` — o
Ctrl+C lido do stdin — não pôde ser exercitado, porque o ambiente da IA não tem
console interativo (`process.stdin.isTTY` indefinido). Foi entregue ao Victor
como bloco D do roteiro e validado por ele.

### Prova de vermelho

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| a | `storeId` fora do `where` de `findByIdForStore` | S9 (2 testes) |
| b | filtro `status = 'PLACED'` fora de `findOverdue` | S4 — a promessa da tarefa |
| c1 | `@StoreRoles('OWNER')` removido de `PUT /opening-hours` | 36 testes — o operador conseguiu fechar a loja e derrubou a suíte inteira |
| c2 | `@StoreRoles('OWNER')` removido de `PUT /offers/{id}/price` | S10 e S12 (4 testes) |
| d | guard devolvendo `true` sem consultar o vínculo | S1 (2 testes) |
| e | `STORE_MEMBER` não gravado em `users.roles` | 46 testes |
| f | `expectedStatus` fora do compare-and-set | S12 (2 testes) |

As seis ficaram vermelhas, cada uma no teste que deveria pegá-la. A lição da
`pd-15` — *"se alguma mutação não derrubar nada, o teste está medindo outra
camada"* — não precisou ser aplicada.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | 1 | **1** |
| Vigilância (com gatilho) | 12 | **15** |

**Saíram da vigilância:** *"`StoreScopeGuard` e autorização fina não existem —
gatilho: `StoreMember` no schema"*. O gatilho disparou e o item foi resolvido
nesta tarefa.

**Saiu da fila de features:** *"Escrita de ofertas pelo lojista"* — entregue, e
**corrigido** antes de ser marcado (diagnóstico #3).

**Entraram, e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| Remoção de membro e a regra do último `OWNER` (B6) sem produtor | Tela de convite/remoção | ADR-0013 B5 tirou a tela do MVP; o gatilho é a primeira loja pedindo um segundo acesso |
| Apagar conta de membro de loja falha no banco (FK `RESTRICT`) | Capacidade 14 | A decisão (anonimizar × transferir titularidade) precisa de uma loja real na mão |
| Fila da loja sem paginação | Primeira loja com >200 pedidos | No piloto são dezenas; paginar agora é infraestrutura antecipada |
| Prateleira de loja `PAUSED` não abre | Primeira loja real pausada precisando editar preço | A leitura passa pela rota pública, que responde `404` para loja pausada (pd-13 A15) |

**Ampliados:** *"eventos de domínio não emitidos"* passou de **seis para
quinze** (as seis ações da loja no pedido e as três de oferta); *"Notificação
transacional"* ganhou o **terceiro** dependente — o aviso de pedido novo à loja,
hoje substituído por polling de 20 s.

## Pendências geradas

- **`BUGS.md`** — `BUG-R02` (Ctrl+C no Windows), em **Resolvidos**. Sem linha no
  backlog, pela regra do `DIRETRIZES` §4: bug corrigido na própria tarefa nunca
  esteve na fila. ⚠️ Registrado como **segunda tentativa**, e com o aviso de que
  o gatilho principal não foi testado pela IA.
- **`BACKLOG.md`** — as quatro linhas de vigilância acima; o item **13** da
  intervenção manual (*"Criar o vínculo das lojas reais com
  `npm run store:add-member`"*); o item **3** (copy) estendido às cinco telas do
  painel; o item **3b** com o agravante de a loja fictícia passar a ter membros
  de desenvolvimento vinculados.
- **`IDEIAS.md`** — *"Motivo em texto livre na recusa pela loja"* (gatilho:
  primeiro tutor perguntando por quê) e *"Sugestão de preço pelo `OPERATOR`,
  aprovada pela dona"* (gatilho: primeira loja com `OPERATOR` de verdade
  reclamando).
- **`COMPARADOR_DE_PRECOS`** — o selo de loja fechada **não** existe na landing,
  de propósito: ela é renderizada no servidor e indexada, e "Fechada" no HTML
  servido envelhece. Gatilho: a landing publicada, com tráfego real.

## As três avaliações obrigatórias da Fase 1, conferidas contra o entregue

- **Auditoria — aplicou-se, e herdou a porta da `pd-15`.** As seis ações da loja
  no pedido gravam `audit_log` na transação da transição, com `storeRole` no
  payload; `offer.price_changed` fecha a **terceira das quatro** mutações que o
  `SECURITY` exige rastrear e ampliou `entity_type` para `'order' | 'offer'`. A
  edição da agenda **não** grava, por não estar entre as quatro. Payload sem PII,
  provado por varredura sobre toda a suíte (S13), e o motivo em texto livre do
  cancelamento fica deliberadamente fora.
- **Documentação — contradizia, e foi corrigida.** Ver §"O que foi feito", Docs.
- **Testes — nasceram.** `store-orders.e2e-spec.ts` (S1–S13, 57 testes,
  incluindo o **primeiro teste de acesso negado a membro de outra loja** do
  projeto e o **sentinela concorrente** aceite × cancelamento), `queue.spec.ts`,
  `opening-hours-draft.spec.ts`, `order-labels.spec.ts`, as extensões dos dois
  specs de seed e seis provas de vermelho. **Vãos declarados:** a renderização
  das telas (ADR-0012 A11), o polling em si (só a função pura de agrupamento), o
  runner do sweeper (já declarado na `pd-15`) e o `parseArgs` do script CLI — os
  e2e exercitam a função que ele chama, não o parser.
