---
title: "Relatório — pd-15/feat/pedido-carrinho-e-maquina-de-estados"
status: stable
version: "1.0"
updated: 2026-09-13
scope: >
  Encerramento da pd-15: o pedido foi ao banco sem pagamento — cotação, criação
  com Idempotency-Key, snapshot, comissão por categoria, cancelamento pelo tutor
  e auto-recusa por prazo vencido, mais o carrinho e o checkout no cliente.
  Registra as decisões, as validações com números reais, as seis provas de
  vermelho (duas delas com achado), o saldo do backlog e o que ficou de fora.
relates_to:
  - 06-decisions/ADR/0017-pedido-antes-do-pagamento.md
  - 08-features/orders/PEDIDO_E_CARRINHO.md
  - 07-process/BACKLOG.md
type: process
---

# pd-15/feat/pedido-carrinho-e-maquina-de-estados

**Encerrada em:** 13/09/2026
**Merge:** `6f60903` em `develop` ([PR #15](https://github.com/vhaguiar07/petdots/pull/15), squash, CI verde nos dois runs)
**ADR:** [0017 — O pedido antes do pagamento](../../../06-decisions/ADR/0017-pedido-antes-do-pagamento.md)

---

## Objetivo

Nas palavras do Victor, abrindo a Fase 1:

> "`orders` — carrinho, pedido e máquina de estados, **sem pagamento**. O pedido
> para em `PLACED`. É a capacidade 6 do `MVP_SCOPE`."

E, sobre a fronteira:

> "Escopo: `payments` fica fora. O pedido não é pago nesta entrega. Se a análise
> achar que algo do ciclo do dinheiro precisa vir junto, apresente no portão —
> não puxe sozinha."

**O que tornou a tarefa necessária:** a jornada J3 parava na vitrine — o
`USER_JOURNEYS` dizia textualmente *"J3 não existe: sem carrinho, sem checkout"*.
O comparador levava o tutor até `/loja/{id}` e acabava ali: o produto tinha uma
vitrine e nenhuma forma de comprar. O ADR-0014 (12/09) havia destravado as quatro
pendências de modelagem que bloqueavam `orders`, e a `pd-14` deixara prontos o
endereço de entrega e o telefone do tutor.

## O que foi feito

**`packages/domain`** (`3ca1926`) — cinco arquivos de regra pura, todos testados:
`zoned-time` (partes locais de um instante via `Intl`, com **offset detectado**,
nunca `-03:00` fixo), `opening-hours` (agenda semanal e o **prazo que pausa fora
do horário**), `commission` (take rate com override e zero por indicação),
`order-pricing` (`SERVICE_FEE_CENTS`, totais) e `order-code` (código legível de 6
caracteres, sem `0`/`O`/`1`/`I`).

**`packages/contracts`** (`b97acab`) — `orders.ts` novo (pedido, cotação,
enums, `Idempotency-Key`), `openingHours` em `storeSchema`, `commissionRateSchema`
no catálogo. ⚠️ Nenhum schema de pedido carrega comissão ou `tutorId`.

**Migration** (`cb3105f`) — a quinta: 6 tabelas, 6 enums, a coluna
`stores.opening_hours`, 11 índices e **15 `CHECK`** escritos à mão.

**Módulos existentes** (`7409705`) — `TutorsModule` ganha o seu **primeiro
`exports`** (`FindTutorProfileUseCase`); `stores` ganha a agenda parseada com Zod
e o repositório de comissão especial; `catalog` ganha a tabela de comissão;
`offers` ganha `findByIdsForStore` (que **inclui indisponíveis**, para separar
`409` de `422`); o seed passa a gravar comissões, agendas e `status: ACTIVE`.

**`audit` e `payments`** (`21c4070`) — `PersistenceContext`, um tipo **opaco**
que deixa a transação atravessar módulos sem que `application/` importe Prisma;
`IAuditTrail` como porta; `payments` mínimo com `RecordRefundUseCase` e nenhum
controller.

**`orders`** (`6160a81`) — a máquina de estados como **tabela de dados**, o
`PriceOrderUseCase` que a cotação e a criação compartilham, o compare-and-set da
transição, o job de auto-recusa e os dois controllers.
⚠️ O `HttpExceptionFilter` precisou aprender a ler `details` do corpo da
exceção: ele honrava `code` e **descartava `details`**, então `ORDER_ITEMS_INVALID`
e o `422` do header chegariam sem campo.

**Cliente** (`d8eb0e6`) — carrinho só no app (porta com duas implementações),
`/carrinho`, `/pedidos`, `/pedidos/{id}`, e **"Adicionar"** na vitrine **e no
comparador**, com os componentes compartilhados em `cart/add-to-cart.tsx`.

**Wrapper de dev** (`795186c`) — ver "Fora do escopo original", abaixo.

**Docs** (`ccb4d41`) — ADR-0017, o doc de feature novo, e **26 documentos**
sincronizados. Quatro **contradiziam** a entrega e foram corrigidos com o motivo:
`SYSTEM_ARCHITECTURE` (auditoria e idempotência "por interceptor"),
`TECHNOLOGY_STACK` ("scheduler do Nest"), `SECURITY` (`audit_log` "nasce com a
escrita de ofertas") e `DOMAIN_MODEL` ("o Pedido nasce já pago").

## Migrations

| Migration | O que muda | Aplicada em |
|---|---|---|
| `20260913034846_create_orders_refunds_commission_and_audit_log` | 6 tabelas, 6 enums, `stores.opening_hours`, 11 índices, 15 `CHECK` | Postgres local (`5437`) e o efêmero dos testes. **Nenhum ambiente remoto** |

⚠️ **Exige `npm run db:seed`** em qualquer ambiente com banco, além do
`migrate deploy`: é o seed que grava a tabela de comissão (sem ela o pedido não é
precificado), as agendas (sem elas nenhuma loja abre) e o `ACTIVE` das lojas.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| A1–A13 do ADR-0017 (pedido nasce `PLACED`; máquina como dado; compare-and-set; contexto opaco; agenda em JSONB; fuso sem biblioteca; runner sem `@nestjs/schedule`) | IA (análise, Fable) |
| P1 — carrinho só no cliente, com cotação no servidor | **Victor**, 13/09 |
| P2 — só o lado do tutor mais o job; loja na `pd-16` | **Victor**, 13/09 |
| P3 — estado pré-`PLACED` fica para a `pd-17` | **Victor**, 13/09 |
| P4 — comissões do seed como hipótese `PLACEHOLDER` | **Victor**, 13/09 |
| P5 — as 8 lojas do seed passam a `ACTIVE` | **Victor**, 13/09 |
| P6 — job com runner mínimo, sem dependência | **Victor**, 13/09 |
| P7 — `audit_log` nasce aqui, escrito por porta | **Victor**, 13/09 |
| P8 — escrever o ADR-0017 | **Victor**, 13/09 |
| **"Adicionar" no comparador + produto viajando no link** (A e B) | **Victor**, 13/09, ao testar |
| **Vários endereços por tutor agendado como `pd-18`** | **Victor**, 13/09 |
| `PriceOrderUseCase` **não lança** `StoreClosedError` — reporta `storeOpenNow` | IA, durante a implementação |
| `StoreClosedError` mora em `packages/domain`, não em `orders/domain` | IA, durante a implementação |

## Validações

| O quê | Resultado |
|---|---|
| Lint | 7 tarefas ✅ |
| Checagem de tipos | 7 tarefas ✅ |
| Build | 5 tarefas ✅ |
| Testes | **48 suítes, 588 testes** — `domain` 17/208, `contracts` 7/96, `api` 18/221, `app` 6/63. *(Baseline medido na `develop`: 39 suítes, 383 testes)* |
| Contrato OpenAPI | 1/1 ✅ — 17→21 rotas, 23→28 schemas, **nada removido** |
| `format:check` | ✅ |
| `migrate status` | 5 migrations, sem pendências |
| Smoke de boot | `PORT=3999`, **subido e derrubado**: `/health` 200; `/orders`, `/order-quotes` 401; rotas públicas 200; `openingHours` servido; sweeper logando `disabled` com `…=0` e `enabled, every 60000 ms` no default |
| Bloco C (HTTP/SQL, banco de desenvolvimento) | **34 casos + 7 do job**, todos verdes. Dados de teste apagados ao final |
| Log sem PII | Suíte rodada com `LOG_LEVEL=debug`: `Victor`, `Bruna`, `999990001`, `Dias da Cruz`, `20720000`, `Cachambi`, `Piedade` — **zero ocorrências**; `authorization` sai `[redacted]`; corpo nunca logado. As 9 chamadas de logger dos módulos novos carregam só ids, status e inteiros |
| Roteiro manual | **Percorrido e aprovado pelo Victor antes do merge** |

**O que não rodou:** o **runner** do job (`setInterval`) não tem teste — só o
caso de uso que ele chama; as telas não têm teste de renderização (ADR-0012
A11); não houve **build nativo**; e o **Ctrl+C do wrapper de dev** não pôde ser
verificado por aqui (exige gerar um `CTRL_C_EVENT` de console) — ficou como
passo manual.

### Prova de vermelho

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| a | `tutorId` fora do `where` de `findByIdForTutor` | O12 (posse) |
| b | `CHECK` do total comentado **na migration** | sentinela do total em O16 |
| c | condição `status` fora do `updateMany` | O13 "dois cancelamentos concorrentes" |
| d | ramo `STORE_REFERRAL` devolvendo a taxa da tabela | 2 testes de `commission.spec.ts` |
| e | `acceptanceDeadline` somando minutos de relógio | 4 testes de `opening-hours.spec.ts` (inclui o caso 18:55) |
| f | índice único `(tutor_id, idempotency_key)` comentado | O5 "duas criações com a mesma chave" |

🔴 **Duas descobertas, e são o achado mais importante desta branch.** As mutações
(c) e (f) **não derrubaram nada** na primeira tentativa:

- o **compare-and-set** não era exercitado pelo O14, porque o advisory lock
  serializa as varreduras e a segunda não encontra pedido vencido;
- a **unicidade da chave** não era exercitada pelo replay sequencial, porque a
  consulta na aplicação responde antes de o banco ser consultado.

Ou seja: num caminho com duas camadas de proteção, o teste sequencial mede a de
cima. Foi preciso escrever **dois testes concorrentes** para fixar a de baixo — e
o segundo deles **encontrou um defeito real**: o `P2002` não era mapeado para
`DuplicateIdempotencyKeyError`, porque `meta.target` não traz o nome da
constraint sob o driver adapter do Prisma 7; uma corrida devolvia `500`.
Corrigido lendo também a mensagem do erro. A lição foi registrada no
`TESTING_STRATEGY` v1.4.

## Fora do escopo original

**Três coisas entraram que não estavam no plano**, todas pela regra do
`DIRETRIZES` §3.2 (o critério é *quando* foi encontrado, não *se tem relação*):

1. **"Adicionar" no comparador e o produto viajando para a vitrine.** Medido: ao
   clicar na loja, o tutor caía na **linha 11 de 38** de uma prateleira ordenada
   por nome, com **quatro "Golden"** — incluindo a mesma ração em **3 kg e 15 kg
   adjacentes**. Era re-decidir o que já fora decidido, e o risco não era
   chateação: era comprar a variante errada. Decisão do Victor, ao testar.
2. **Wrapper de dev do `apps/app`.** O Ctrl+C não matava o Metro: o
   `cmd.exe /d /s /c` que o `npm run` insere engole o `CTRL_C_EVENT` no Windows e
   morre sem repassar ao neto, deixando o Expo órfão com a 8081 presa. O wrapper
   spawna `@expo/cli` **sem shell** e derruba a árvore com `taskkill /T` após 3s.
   Documentado no `DEVELOPMENT_GUIDE`.
3. **Dois commits de correção após o merge** (`1239c1b`, `7d96b49`): um
   `tsconfig.json` solto entrou na raiz pelo `git add -A` do commit de
   documentação — o CLI do Expo o cria no diretório corrente, e o wrapper fora
   rodado a partir da raiz. Removido, e o wrapper passou a fixar o `cwd`.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | 1 | **1** |
| Vigilância (com gatilho) | 26 | **32** |

**Saíram da fila:** nenhum — a fila tinha e continua tendo um item só (o OAuth
client legado, que depende do console do Google).

**Saiu da vigilância / de `IDEIAS`:** o item *"Segundo endereço por tutor"*
migrou de [`IDEIAS`](../../IDEIAS.md) para o backlog — **o gatilho nomeado
disparou** com as palavras do Victor. Agendado como **`pd-18`**.
Também saiu de `IDEIAS` a *"Política de cancelamento"*, resolvida.

**Entraram, e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| `STORE_REFERRAL` sem produtor | `referral_code` em `stores` | J6 / onboarding de loja |
| Carrinho nativo em memória | primeiro build nativo | instalar `AsyncStorage` |
| Runner do job sem biblioteca | o **segundo** job | conciliação diária (`pd-17`) |
| Apagar conta com pedido falha no banco | capacidade 14 | escrever a anonimização |
| Comissões do seed são hipóteses | primeira loja real | calibração de campo (ADR-0003) |
| `GET /orders` sem paginação | tutor com >50 pedidos | paginar por offset |

E **ampliado**: *"Três eventos de domínio não emitidos"* passou a **seis**
(`order.placed`, `order.cancelled`, `order.rejected`), agora com o primeiro
consumidor real nomeado — avisar a loja do pedido novo (capacidade 10).

## Pendências geradas

- **Seis itens de vigilância** e a ampliação do item de eventos, todos em
  [`BACKLOG.md`](../../BACKLOG.md), com gatilho nomeado.
- **`pd-18`** na sequência acordada: vários endereços por tutor, com principal e
  nome. 🔴 **Exige ADR**, porque reverte o ADR-0015 D2.
- **Intervenção manual:** item **3** (copy) estendido às telas novas; item **3b**
  (lojas fictícias) agora com o agravante de estarem `ACTIVE` e com agenda; item
  **3d** novo — aprovar ou trocar os valores de comissão do seed.
- **Nenhum bug** em [`BUGS.md`](../../BUGS.md): o defeito do `P2002` foi
  encontrado e corrigido dentro da própria tarefa, em código que nunca chegou a
  ser commitado quebrado.

## Avaliações obrigatórias da Fase 1

**Auditoria — aplica-se, e `audit_log` nasceu.** A primeira mutação auditável do
projeto é a **auto-recusa por prazo**: um job, sem rota e sem requisição. Por
isso a escrita é por **porta na camada de aplicação**, dentro da transação da
transição, e não por interceptor HTTP — um interceptor de borda não a veria, nem
saberia o estado anterior. `SECURITY` e `SYSTEM_ARCHITECTURE` foram corrigidos.
Tem rastro hoje: `order.rejected` (`SYSTEM`) e `order.cancelled` (`USER`).
Herdam o caminho: as transições da loja (`pd-16`) e a escrita de ofertas.
Payload sem PII, **medido**.

**Documentação — 26 documentos**, quatro deles corrigindo descrição que
contradizia a implementação.

**Testes — nasceram:** 5 suítes em `packages/domain`, `order.spec.ts` (40 testes,
percorrendo a tabela de transições inteira), `orders.spec.ts` em `contracts`,
`orders.e2e-spec.ts` (34 casos, incluindo posse, snapshot, idempotência,
reentrância e os sentinelas de constraint) e `cart-state.spec.ts` no app.
**Vãos declarados:** runner do job, renderização das telas, build nativo e o
Ctrl+C do wrapper.
