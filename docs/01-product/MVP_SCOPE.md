---
title: PetDots — MVP Scope
status: stable
version: "2.2"
updated: 2026-09-12
scope: >
  Define o recorte do MVP do PetDots — o marketplace hiperlocal de petshops de
  bairro com reposição inteligente e comparador de preços: o que está dentro e
  fora do escopo, as pendências de modelagem que o escopo assume e os critérios
  de saída que validam o encerramento da fase 1. É a fonte autoritativa do
  escopo funcional da Fase 1.
relates_to:
  - 00-foundation/PRODUCT_ROADMAP.md
  - 00-foundation/SUCCESS_METRICS.md
  - 00-foundation/IDEACAO_FASE1.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/PERSONAS.md
  - 01-product/USER_JOURNEYS.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
type: product
---

# PetDots — MVP Scope

> **v2.1 (2026-09-11, `pd-09`).** As nove pendências de modelagem migraram para
> o [`BACKLOG`](../07-process/BACKLOG.md) — o gatilho ("início da implementação
> do ADR-0004") disparou quando a capacidade 12 saiu do papel. A tabela
> permanece aqui porque é escopo; o acompanhamento passa a ser do backlog.

> **v2.0 (2026-09-10).** Reescrito na `pd-07` sob o
> [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md). A v1.0
> descrevia o MVP "Vida do Pet" (Timeline, Carteira Digital, lembretes de
> vacina) e listava o marketplace como capacidade da Fase 4 — contradição com o
> ADR-0004, que era o item mais grave do backlog e foi resolvido nesta entrega.
> As capacidades da v1.0 não desapareceram: estão em "Fora do escopo", com a
> fase de reentrada.

---

## Objetivo do MVP

O MVP corresponde à **Fase 1 — Cunha** do
[PRODUCT_ROADMAP](../00-foundation/PRODUCT_ROADMAP.md): um **marketplace
hiperlocal de petshops de bairro**, operando em um território — o eixo Grande
Méier —, com duas capacidades que dão valor ao app antes de haver volume de
transação:

- **Joia 1 — Reposição inteligente:** o app sabe quando a ração, a areia ou o
  antipulgas do pet vai acabar e avisa no dia certo.
- **Joia 2 — Comparador de preços do bairro:** quanto custa aquele produto nas
  lojas que entregam no seu endereço.

Posicionamento em uma frase:

> **Saiba quando a ração acaba e onde comprar mais barato no seu bairro.**

**Marco de sucesso:**

> Um tutor do Grande Méier recebe o aviso de que a ração vai acabar, compara o
> preço nas petshops do bairro, compra pelo app e recebe em casa — e a loja vê o
> repasse cair sem que ninguém tenha cobrado nada dela.

O MVP **não** inclui carteira de saúde do pet, serviços, agendamento, portal
empresarial, IA dedicada nem ONGs — todas pertencem a fases posteriores.

---

## Personas atendidas

| Persona | Prioridade | Lado |
|---|---|---|
| Tutor de pet de bairro | P1 | Demanda |
| Lojista de petshop de bairro | P1 | Oferta |

O MVP só se considera entregue quando **os dois lados** estão servidos —
detalhe em [PERSONAS](PERSONAS.md).

---

## Dentro do escopo

Capacidades entregues, com o módulo que as materializa
([SYSTEM_ARCHITECTURE](../02-architecture/SYSTEM_ARCHITECTURE.md)) e as
entidades envolvidas ([DOMAIN_MODEL](DOMAIN_MODEL.md)).

| # | Capacidade | Módulo | Entidades |
|---|---|---|---|
| 1 | **Identidade e acesso** — cadastro e login por e-mail/senha e Google; papéis `TUTOR`, `STORE_MEMBER`, `ADMIN`; recuperação de acesso | `identity` | `User` |
| | ✅ **Parcialmente entregue na `pd-12`** (12/09/2026, ADR-0011): cadastro, login por e-mail/senha, refresh rotacionado, logout, `AuthGuard` e `RolesGuard` pelos três papéis. ⏳ **Falta:** login por Google (A3) e recuperação de acesso (A4) — os dois estão no `BACKLOG` com gatilho nomeado, e sem o segundo quem esquece a senha fica trancado. | | |
| 2 | **Perfil do tutor e pets** — endereço padrão com bairro e CEP; pet enxuto (espécie, nascimento, **peso**) a serviço da reposição; Pet ID imutável | `tutors` | `Tutor`, `Pet` |
| 3 | **Catálogo mestre** — produtos por EAN com marca, variante, peso líquido e **categoria** (que determina a comissão); curadoria da plataforma; tabela de comissão historizada | `catalog` | `Product`, `CommissionRate` |
| 4 | **Loja e onboarding** — `PROSPECT` → `ONBOARDING` → `ACTIVE`; membros com papel `OWNER`/`OPERATOR`; áreas de entrega por bairro e faixa de CEP com taxa e prazo; subconta no PSP; código de indicação e QR do balcão; tarifa de fundador por loja e categoria | `stores` | `Store`, `StoreMember`, `DeliveryArea`, `StoreCommissionRate` |
| 5 | **Oferta e comparador de preços (Joia 2)** — a loja marca "tenho" e informa preço e disponibilidade; busca de produto por nome e marca; comparação entre lojas que entregam no endereço, com preço, taxa e prazo; páginas públicas indexáveis do comparador | `offers`, `apps/landing` | `Offer` |
| 6 | **Pedido de uma loja** — carrinho → pedido; máquina de estados `PLACED` → `ACCEPTED` → `DISPATCHED` → `DELIVERED`, com `REJECTED` e `CANCELLED`; **snapshot** de preço, categoria e comissão por item; cálculo de comissão por categoria com override de fundador e **zero** para cliente próprio; substituição assistida e item indisponível | `orders` | `Order`, `OrderItem` |
| 7 | **Pagamento com split e repasse** — intenção de pagamento no PSP com regra de split; **Pix** como meio principal; confirmação **somente por webhook** assinado e idempotente; repasse à loja após pagamento capturado; conciliação diária com o extrato do PSP | `payments` | `Payment`, `Payout` |
| 8 | **Entrega** — elegibilidade do endereço por área ativa; taxa e prazo; despacho e status; registro do custo real quando conhecido (insumo da economia por pedido) | `delivery` | `Delivery` |
| 9 | **Reposição inteligente (Joia 1)** — calculadora de consumo (peso do pet + embalagem → gramas/dia → data projetada); agenda por consumo ou por intervalo fixo; recálculo a cada entrega | `replenishment` | `ReplenishmentSchedule` |
| 10 | **Notificações** — lembrete de reposição idempotente e avisos transacionais do pedido ao tutor e à loja, por push e WhatsApp | `notifications` | `Reminder` |
| 11 | **Painel do lojista** — no mesmo app, sob o papel `STORE_MEMBER`: fila de pedidos, aceitar/recusar, marcar indisponível, despachar, ajustar preço e disponibilidade, ver repasses por pedido | `orders`, `offers`, `payments` | — |
| 12 | **Landing pública e lista de espera** — landing "chegando ao bairro X" para o smoke test; captura de endereço fora da área de entrega | `waitlist`, `apps/landing` | `WaitlistEntry` |
| 13 | **Operação da plataforma** — sob o papel `ADMIN`: curadoria do catálogo, tabela de comissão, ativação de loja. **Sem console próprio no MVP** — ver "Pendências" abaixo | todos | — |
| 14 | **Direitos do tutor sobre seus dados** — exportação e solicitação de exclusão, respeitada a retenção fiscal dos pedidos (LGPD) | `tutors`, `identity` | `Tutor`, `User` |

### Invariantes de domínio respeitadas

Do [DOMAIN_MODEL](DOMAIN_MODEL.md) §Agregados — o que o MVP não pode violar:

- Um pedido pertence a **uma única loja**; não há carrinho multi-loja.
- Todos os valores de pedido e item são **snapshot**: mudança posterior de
  preço, categoria ou tabela de comissão **nunca** altera pedido existente.
- `total_cents = items_total_cents + delivery_fee_cents + service_fee_cents`.
- Comissão **zero** quando `acquisition_channel = STORE_REFERRAL`.
- **Não há repasse sem pagamento `CAPTURED`** — e o pagamento só é dado como
  capturado pelo webhook do PSP, nunca pelo retorno do cliente.
- Pedido só é criado com ofertas disponíveis, endereço dentro de área ativa e
  loja `ACTIVE`.
- Transições de status são unidirecionais; `DELIVERED` e `CANCELLED` são
  terminais, e pedido terminal é imutável.
- Par (`store_id`, `product_id`) é único; a loja nunca cria nem edita produto.
- Produto que exige receita **não pode ter oferta ativa**.
- Lembrete é idempotente por `dedupe_key`.
- Dinheiro em centavos inteiros, percentuais em pontos-base — nunca ponto
  flutuante.
- Um lojista jamais lê pedido ou preço de outra loja (`StoreScopeGuard`).

---

## Fora do escopo

Não fazem parte do MVP. Origem: `SYSTEM_ARCHITECTURE` §"O que está
deliberadamente fora do MVP", ADR-0004 §"Alternativas consideradas" e as
decisões da ideação.

| Capacidade | Fase | Justificativa |
|---|---|---|
| Carrinho multi-loja | — | Multiplicaria entregas, splits e estados de pedido por loja; ganho de conveniência pequeno num piloto de bairro (ADR-0004 #6) |
| Cartão de crédito | 1, pós-lançamento | Pix primeiro: custo menor, liquidação instantânea, sem chargeback (ADR-0003) |
| Estoque em tempo real | 2 | Paliativos no MVP: catálogo enxuto do que gira, aceite rápido e substituição assistida (IDEACAO §9) |
| Roteirização de entrega e área geoespacial (PostGIS) | 2+ | Bairro e faixa de CEP resolvem o piloto; gatilho de reversão é precisar de distância ou rota real (ADR-0004 #9) |
| Gráficos e relatórios no painel do lojista | 2 | O painel do MVP é "régua de WhatsApp, não ERP" (IDEACAO §11) |
| Carteira Digital, Timeline e histórico de saúde | 2 | O Pet ID já nasce imutável para receber o histórico depois; Timeline exige upload e storage, fora do MVP |
| Compartilhamento de pet entre tutores (N:N) | 2 | Volta com a carteira do pet |
| Clube de assinatura do tutor e mensalidade SaaS do painel | 2 | Cobrar a entrada de um clube sem valor provado é atrito fatal no pitch (ADR-0003) |
| Cupom de aquisição estruturado | 2 | Previsto como mecanismo de subsídio com verba e prazo (ADR-0003 #3), mas sem modelagem no MVP — ver "Pendências" |
| Perfis de parceiro (prestador, veterinário, clínica), serviços e agendamento | 3 | Existe **um** tipo de parceiro no MVP, modelado concretamente como `Store` (ADR-0004 #2) |
| Reputação e avaliação | 3 | Avaliação nasce de transação verificada; a de parceiro depende de serviço concluído |
| Portal empresarial e ERP | 4 | Aprofundamento B2B — o mais caro de todos |
| API pública para parceiros | 4 | Abrir API cedo congela contratos que ainda vão mudar |
| Retail media, fidelidade e campanhas patrocinadas | 4 | Monetização sobre marketplace já ativo |
| IA dedicada (recomendação personalizada, assistente, busca semântica) | 5 | IA no MVP é transversal e discreta: calculadora de consumo e apoio à curadoria do catálogo |
| ONGs, adoção, laboratórios, seguradoras | 6 | Expansão de impacto |
| Medicamentos que exigem receita | — | Regulação; excluir do catálogo é o caminho mais simples (IDEACAO §24) |
| Alerta de bairro / pet perdido ("Joia 3") | — | Não captura intenção de compra e vira produto inteiro (moderação, falsos alertas). Fica como *growth hook* (IDEACAO §19) |
| Frota própria de entrega | — | Queimar dinheiro cedo; usa-se o motoboy da loja ou parceiro do bairro |

> **Nota sobre IA no MVP.** O PetDots é AI-first no **processo de engenharia**
> (documentação e desenvolvimento assistidos). No **produto**, a fase 1 usa IA de
> forma discreta — cálculo de consumo, apoio à curadoria do catálogo. A frente
> dedicada é a Fase 5.

O espelho desta seção, com o que é ideia e não pendência, está em
[`IDEIAS.md`](../07-process/IDEIAS.md).

---

## Pendências de modelagem que o escopo assume

> Os enums e as regras do `DOMAIN_MODEL` v2.0 já **implicam** caminhos que ainda
> não têm modelagem: uma loja pode recusar (`REJECTED`) um pedido cujo Pix já foi
> capturado, e pode marcar item `UNAVAILABLE`. Omitir isso do escopo faria este
> documento mentir por omissão.
>
> Cada item abaixo está detalhado em
> [`IDEIAS.md`](../07-process/IDEIAS.md) §"Lacunas para um marketplace
> completo". **Migradas para o [`BACKLOG`](../07-process/BACKLOG.md) em
> 11/09/2026 (`pd-09`), no início da implementação do ADR-0004** — a tabela fica
> aqui porque é escopo; o acompanhamento é do backlog, e a mecânica de cada uma
> é decisão de ADR, não deste documento.

| Pendência | Por que o MVP não opera sem ela |
|---|---|
| **Estorno e ajuste de pedido** | O Pix é capturado antes do aceite da loja. Recusa, cancelamento ou item indisponível deixam o cliente pago a mais, sem caminho de volta — e sem reversão de comissão e repasse |
| **Prazo de aceite e auto-recusa** | Pedido pago que ninguém aceita é o pior caso possível: dinheiro do cliente parado sem saída |
| **Política de cancelamento** | `CANCELLED` existe; quem pode cancelar, até quando e o que acontece com o dinheiro, não |
| **Horário de funcionamento da loja** | Sem agenda semanal, o pedido das 22h entra numa loja fechada |
| **Cupom de aquisição** | O ADR-0003 #3 já prevê subsídio só via cupom com verba e prazo; falta `discount_cents`, a entidade e a regra de quem paga o desconto |
| **Notificação transacional** | O módulo `notifications` tem só `reminders`, e `Reminder` pressupõe agenda de reposição; aviso de pedido aceito ou despachado não tem onde morar |
| **Extrato de repasse** | `Payout` é por pedido; o lojista precisa saber quanto recebeu no período e de quais pedidos |
| **Console de administração** | A curadoria centralizada do catálogo é gargalo conhecido (ADR-0004 §Consequências) e a capacidade #13 não tem ferramenta — no piloto, é trabalho manual |
| **Obrigações fiscais do split** | Plataforma tem receita de serviço, loja vende mercadoria; quem emite o quê não está decidido |

---

## Critérios de saída do MVP

### Funcionais — o produto entregue

Um critério por jornada de [USER_JOURNEYS](USER_JOURNEYS.md):

- [ ] Tutor se cadastra, autentica e recupera acesso (J1).
- [ ] Tutor cadastra pet com peso e recebe a projeção de término do produto que
      ele consome — a calculadora entrega valor no primeiro uso (J1).
- [ ] Visitante ou tutor busca um produto e vê o preço nas lojas que entregam no
      seu endereço, com taxa e prazo (J2).
- [ ] Tutor compra de uma loja, paga por Pix e recebe em casa (J3).
- [ ] Lojista recebe o pedido, aceita, marca item indisponível quando preciso,
      despacha e conclui a entrega (J4).
- [ ] Tutor recebe o lembrete no dia certo e recompra a partir dele; a projeção
      é recalculada após a entrega (J5).
- [ ] Loja é onboardada de `PROSPECT` a `ACTIVE`, com subconta no PSP, área de
      entrega e ofertas semeadas (J6).
- [ ] Pedido vindo do QR da loja registra `STORE_REFERRAL` e **não** cobra
      comissão (J7).
- [ ] Lojista consulta os repasses dos seus pedidos (J8).
- [ ] Visitante fora da área de entrega entra na lista de espera (J9).
- [ ] Tutor exporta e solicita exclusão dos seus dados (LGPD).

### Econômicos — os gates do ADR-0003

Critério **duro**: os três, medidos no mix real de pedidos do piloto.

- [ ] Contribuição por pedido **≥ R$ 5**.
- [ ] Margem do lojista pós-comissão **≥ ⅔** da original (regra do ⅓).
- [ ] Taxas pagas pelo cliente **≤ ~8%** do ticket.

### Recorrência

- [ ] North Star em medição, com baseline estabelecida nos primeiros 60 dias de
      operação, e crescimento consistente semana a semana
      ([SUCCESS_METRICS](../00-foundation/SUCCESS_METRICS.md)).
- [ ] Conversão lembrete → pedido medida — é o motor desenhado da recorrência.
- [ ] Maioria das lojas da coorte **ativa na semana**, não apenas cadastrada.

### Qualidade e segurança

- [ ] `StoreScopeGuard` testado: lojista não acessa pedido nem preço de outra
      loja.
- [ ] Webhook do PSP com assinatura verificada e **idempotência testada** por
      `psp_payment_id`.
- [ ] Snapshot testado: alteração de preço ou de tabela de comissão não muda
      pedido existente.
- [ ] Cálculo de comissão coberto por teste unitário puro em `packages/domain`,
      incluindo override de fundador e comissão zero.
- [ ] Idempotência na criação de pedido (`Idempotency-Key`).
- [ ] Conciliação diária `payments`/`payouts` × extrato do PSP rodando e
      sinalizando divergência.
- [ ] Dados pessoais protegidos e exportáveis; nenhum segredo ou PII em log ou
      span.

### Sinal de saída

> O MVP está validado quando: (a) as capacidades funcionais estão em produção no
> território do piloto; (b) os três gates econômicos do ADR-0003 se sustentam no
> mix real; (c) o North Star está medido e crescendo; (d) a maioria das lojas da
> coorte está ativa; e (e) não há bloqueador crítico de qualidade ou segurança
> aberto.

A partir da validação, o time está autorizado a planejar a **Fase 2 —
Consolidação local e carteira do pet**.

---

## Relação com outros documentos

| Documento | Relação |
|---|---|
| [PRODUCT_ROADMAP](../00-foundation/PRODUCT_ROADMAP.md) | O MVP = Fase 1 do roadmap |
| [DOMAIN_MODEL](DOMAIN_MODEL.md) | Entidades, agregados e invariantes que este escopo respeita |
| [SYSTEM_ARCHITECTURE](../02-architecture/SYSTEM_ARCHITECTURE.md) | Módulos que materializam cada capacidade e os fluxos principais |
| [USER_JOURNEYS](USER_JOURNEYS.md) | Os fluxos que os critérios funcionais verificam |
| [SUCCESS_METRICS](../00-foundation/SUCCESS_METRICS.md) | North Star e metas usadas nos critérios de saída |
| [PERSONAS](PERSONAS.md) | As duas personas P1 atendidas |
| [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) | Monetização e os gates econômicos |
| [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) | As decisões arquiteturais que este escopo assume |
| [IDEIAS.md](../07-process/IDEIAS.md) | As lacunas conhecidas e o que é ideia sem dono |
