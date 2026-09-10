---
title: PetDots — AI Domain Knowledge
status: stable
version: "2.0"
updated: 2026-09-10
scope: >
  Domínio do MVP marketplace destilado para agentes: entidades-chave, agregados,
  regras de dinheiro, eventos e mapeamento de nomes, em forma compacta.
  Projetado para que um agente gere código alinhado ao domínio sem reler toda a
  documentação fonte.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 00-foundation/GLOSSARY.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 05-ai/AI_CONTEXT.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
type: ai
---

# PetDots — AI Domain Knowledge

> **v2.0 (2026-09-10).** Reescrito na `pd-07` para o MVP marketplace. A v1.0
> destilava o domínio "Vida do Pet" (Pet como entidade central, Timeline,
> DigitalWallet, `pet_tutors` N:N, `Partner` polimórfico) e dizia
> explicitamente *"Marketplace é periférico — não modele como cidadão de
> primeira classe"*. Como este documento existe para gerar código, era o erro
> mais caro do repositório.
>
> **Fonte autoritativa:** [`DOMAIN_MODEL.md`](../01-product/DOMAIN_MODEL.md)
> v2.0 e [`GLOSSARY.md`](../00-foundation/GLOSSARY.md) v2.0. Em qualquer
> divergência, **o `DOMAIN_MODEL` vence** — este documento destila, não decide.

---

## Núcleo do domínio

O coração do MVP é a **transação recorrente**: um Tutor compra de uma Loja do seu
bairro, e a plataforma sabe **quando** ele precisa comprar de novo.

O ciclo, em uma linha:

```
oferta da loja → comparação de preço → pedido → pagamento com split → entrega
   → recálculo da agenda de reposição → lembrete → novo pedido
```

O **Pet** permanece no domínio, mas **enxuto e a serviço da reposição** (peso,
consumo) — não é a entidade central do MVP. O `Pet.id` (o **Pet ID**) é imutável
justamente para que a carteira de saúde da fase 2 possa ser construída sobre
ele.

Entidades nucleares:

| Entidade | Código | Tabela | Papel |
|---|---|---|---|
| Loja | `Store` | `stores` | Agregado-raiz da oferta; dona do próprio preço |
| Produto | `Product` | `products` | Catálogo mestre da plataforma, por EAN |
| Oferta | `Offer` | `offers` | Loja × Produto — o que faz o comparador existir |
| Pedido | `Order` | `orders` | Agregado-raiz da transação; **registro contábil imutável** |
| Tutor | `Tutor` | `tutors` | Agregado-raiz da demanda |

---

## Agregados e invariantes

Resumo operacional. Atributos completos, cardinalidades e enums no
`DOMAIN_MODEL`.

### Agregado `Store` (Loja)

Engloba `Offer` (1:N), `DeliveryArea` (1:N), `StoreMember` (1:N).

- Par (`store_id`, `product_id`) é **único**.
- A loja **não cria nem edita `Product`** — só `Offer` (preço e
  disponibilidade).
- Só entra em `ACTIVE` com: ≥ 1 área de entrega ativa, ≥ 1 oferta disponível e
  `psp_recipient_id` presente.
- `referral_code` é único e **imutável** após a criação.

### Agregado `Product` (catálogo mestre)

Global, sem dono comercial; curadoria da plataforma.

- `ean` é único quando presente.
- A `category` só muda por operação administrativa auditada — **ela determina a
  comissão**.
- Produto com `requires_prescription = true` **não pode ter oferta ativa**.

### Agregado `Order` (Pedido)

Engloba `OrderItem` (1:N), `Payment` (1:1 vigente), `Delivery` (1:1),
`Payout` (1:1).

- Um pedido pertence a **uma única loja**. Não existe carrinho multi-loja.
- Todos os valores são **snapshot**: alteração posterior de preço, categoria ou
  tabela de comissão **nunca** altera pedido existente.
- `total_cents = items_total_cents + delivery_fee_cents + service_fee_cents`.
- `commission_total_cents` é a soma das comissões dos itens; é **zero** quando
  `acquisition_channel = STORE_REFERRAL`.
- Só é criado se: todas as ofertas `available`, endereço dentro de uma
  `DeliveryArea` ativa da loja, e loja `ACTIVE`.
- Transições são **unidirecionais**; `DELIVERED` e `CANCELLED` são terminais.
- **Não há `Payout` sem `Payment` `CAPTURED`.**

### Agregado `Tutor`

Engloba `Pet` (1:N), `ReplenishmentSchedule` (1:N), endereços.

- No MVP, um Pet pertence a **exatamente um** Tutor (o N:N volta na fase 2).
- Uma agenda de reposição referencia um Pet do próprio Tutor.
- `Reminder` é idempotente por `dedupe_key`.

---

## Regras de dinheiro (as mais críticas para gerar código)

1. **Centavos e pontos-base, nunca float.** Valores monetários são inteiros em
   `*_cents`; percentuais são inteiros em `*_bps` (600 = 6,00%).
2. **Comissão é por categoria do produto**, da tabela vigente
   (`commission_rates`), com override por loja (`store_commission_rates`, que
   materializa a tarifa de fundador).
3. **Comissão zero para cliente próprio** — pedido com
   `acquisition_channel = STORE_REFERRAL`, derivado do `referral_code` da loja.
4. **Snapshot na escrita, nunca cálculo na leitura.** Preço, categoria e taxa de
   comissão são gravados no `OrderItem` no momento do pedido.
5. **O dinheiro não passa pela API.** Ela cria intenção no PSP com a regra de
   split; o PSP divide na liquidação.
6. **Pago é o que o webhook disser.** Webhook assinado, **idempotente por
   `psp_payment_id`**, com `psp_payload` persistido para auditoria. Nunca
   confiar no retorno do cliente.
7. **Sem `payment.captured`, sem repasse.**
8. **Pedido terminal é imutável.** Correção se faz por novo registro
   (estorno/ajuste) — e esse registro **ainda não está modelado**: ver
   "Pendências" abaixo.
9. **Regras puras em `packages/domain`** — cálculo de comissão e calculadora de
   consumo vivem lá, sem framework, cobertos por teste unitário
   (ADR-0004 #12).

Parâmetros de negócio (faixas de take rate, taxa de serviço, regra do ⅓) estão
no [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md)
— **não os hardcode**: eles vivem em tabela historizada porque vão ser
recalibrados.

---

## Fronteira de dados

- **Tutor** é dono dos seus dados, endereços, pets e agendas; pode exportar e
  solicitar exclusão (respeitada a retenção fiscal dos pedidos).
- **Loja** é dona de `Offer` e das suas áreas de entrega. Não é dona do
  `Product`.
- **Plataforma** é dona do catálogo mestre, da tabela de comissão e do registro
  contábil dos pedidos.
- **O preço de uma loja é público** (é o produto). **O histórico de vendas de
  uma loja não é visível a outra loja.**
- Todo acesso a dado de loja valida o vínculo em `store_members` —
  `StoreScopeGuard`. Um lojista jamais lê pedido ou preço de outra loja.

---

## Eventos de domínio

Formato `recurso.ação`, in-process no monolito. **Esta é a lista completa** — não
criar evento fora dela sem atualizar o `DOMAIN_MODEL`.

| Evento | Quando |
|---|---|
| `tutor.created` | Um tutor conclui o cadastro |
| `pet.created` | Um pet é cadastrado |
| `store.onboarded` | Uma loja passa a `ACTIVE` |
| `product.created` | Um produto entra no catálogo mestre |
| `offer.price_changed` | Uma loja altera preço |
| `offer.availability_changed` | Uma loja marca item disponível/indisponível |
| `order.placed` | Pedido criado pelo tutor |
| `order.accepted` | Loja aceitou |
| `order.rejected` | Loja recusou |
| `order.dispatched` | Saiu para entrega |
| `order.delivered` | Entregue — **dispara a atualização da agenda de reposição** |
| `order.cancelled` | Cancelado |
| `payment.captured` | PSP confirmou o pagamento (webhook) |
| `payment.failed` | Pagamento falhou ou expirou |
| `payout.settled` | Repasse à loja liquidado |
| `replenishment.due` | A projeção indica que o item vai acabar |
| `reminder.sent` | Lembrete entregue ao tutor |
| `waitlist.joined` | Alguém entrou na lista de espera |

Encadeamento central da recorrência:

```
order.delivered → recalcula projected_depletion_at → agenda Reminder
   → replenishment.due → reminder.sent → (o tutor volta a comprar)
```

---

## Mapeamento PT ↔ EN ↔ tabela

Tabela completa no `GLOSSARY` §"Convenções de terminologia" e no `DOMAIN_MODEL`
§"Convenção de nomes". Nunca usar termo fora do mapeamento oficial.

| Domínio (PT) | Código (EN) | Tabela |
|---|---|---|
| Usuário (identidade) | `User` | `users` |
| Tutor | `Tutor` | `tutors` |
| Pet | `Pet` | `pets` |
| Loja | `Store` | `stores` |
| Membro da Loja | `StoreMember` | `store_members` |
| Área de Entrega | `DeliveryArea` | `delivery_areas` |
| Produto | `Product` | `products` |
| Oferta | `Offer` | `offers` |
| Taxa de Comissão | `CommissionRate` | `commission_rates` |
| Comissão Especial da Loja | `StoreCommissionRate` | `store_commission_rates` |
| Pedido | `Order` | `orders` |
| Item do Pedido | `OrderItem` | `order_items` |
| Pagamento | `Payment` | `payments` |
| Repasse | `Payout` | `payouts` |
| Entrega | `Delivery` | `deliveries` |
| Agenda de Reposição | `ReplenishmentSchedule` | `replenishment_schedules` |
| Lembrete | `Reminder` | `reminders` |
| Lista de Espera | `WaitlistEntry` | `waitlist_entries` |

Convenções: PK `id` UUID; FK `entidade_id`; tabelas `snake_case` plural.

---

## Módulos (um por agregado, mais suporte)

`identity` · `tutors` · `catalog` · `stores` · `offers` · `orders` ·
`payments` · `delivery` · `replenishment` · `notifications` · `waitlist`

Cada módulo é **dono exclusivo das suas tabelas**. Camadas internas:
`controller` → `application` → `domain` → `infra`, com as dependências
apontando para o domínio. Detalhe em
[`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md).

---

## Pendências de modelagem — não preencher por conta própria

Estas capacidades são **assumidas pelo escopo e não estão modeladas**. Se a
tarefa esbarrar em qualquer uma delas, **parar e reportar**; a mecânica é
decisão de ADR:

- **Estorno e ajuste de pedido** (recusa, cancelamento e item indisponível com
  Pix já capturado; reversão de comissão e de repasse).
- **Prazo de aceite e auto-recusa.**
- **Política de cancelamento** (quem, até quando, o que acontece com o
  dinheiro).
- **Cupom e desconto** (`Order` não tem `discount_cents`).
- **Horário de funcionamento da loja.**
- **Notificação transacional** (o módulo `notifications` só tem `reminders`, e
  `Reminder` pressupõe agenda de reposição).
- **Extrato de repasse por período.**
- **Console de administração** e **ingestão do catálogo mestre**.
- **Avaliação e reputação de loja**; **regra de ranking do comparador** além de
  preço.
- **Obrigações fiscais do split.**

Detalhe de cada uma em [`IDEIAS.md`](../07-process/IDEIAS.md) §"Lacunas para um
marketplace completo" e em [`MVP_SCOPE`](../01-product/MVP_SCOPE.md)
§"Pendências de modelagem".

---

## Domínio das fases futuras

Fora do MVP, com caminho de reentrada registrado no `DOMAIN_MODEL`:

- **Timeline, Evento e Carteira Digital** — fase 2, como agregado sob `Pet`.
- **Tutor ↔ Pet N:N** — fase 2, com a carteira.
- **`Partner` polimórfico** (clínica, veterinário, prestador, ONG,
  laboratório) — fase 3. No MVP existe **um** tipo de parceiro, modelado
  concretamente como `Store`.
- **`Service` e `Appointment`** — fase 3.

Não modelar nada disso agora.

---

## O que um agente NÃO deve fazer com o domínio

- Inventar regra de negócio não documentada — inclusive as "pendências" acima.
- Criar nome de entidade, tabela ou evento fora do mapeamento oficial.
- Usar **float** para dinheiro ou percentual.
- Deixar a loja criar ou editar `Product`.
- Calcular comissão na leitura, em vez de gravar snapshot na escrita.
- Dar pedido como pago pelo retorno do cliente, sem o webhook.
- Emitir repasse sem pagamento capturado.
- Alterar pedido terminal.
- Criar oferta para produto que exige receita.
- Permitir que uma loja leia dado de outra loja.
- Modelar Timeline, Carteira Digital, `Partner` polimórfico, serviços ou
  agendamento no MVP.
- Assumir que o Pet ID pode mudar ou ser reutilizado.
- Gerar diagnóstico ou decisão clínica.
