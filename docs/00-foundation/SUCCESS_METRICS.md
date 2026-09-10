---
title: PetDots — Success Metrics
status: draft
version: "2.0"
updated: 2026-09-10
scope: >
  Define como o PetDots mede sucesso: o North Star da fase 1 (tutores
  recorrentes), as famílias de métricas dos dois lados do marketplace (oferta,
  demanda, recorrência, economia por pedido e qualidade) e as metas por fase do
  roadmap. Valores numéricos são direcionais — serão calibrados com dado real
  do piloto.
relates_to:
  - 00-foundation/PRODUCT_VISION.md
  - 00-foundation/BUSINESS_MODEL.md
  - 00-foundation/PRODUCT_ROADMAP.md
  - 00-foundation/PRODUCT_PRINCIPLES.md
  - 01-product/MVP_SCOPE.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
type: foundation
---

# PetDots — Success Metrics

> **v2.0 (2026-09-10).** Reescrito na `pd-07`. A v1.0 (jun/2026) media o produto
> "Vida do Pet": o North Star era o tutor com a vida do pet centralizada, e os
> indicadores eram eventos na Timeline, documentos na Carteira Digital e
> agendamentos com parceiros. O [BUSINESS_MODEL](BUSINESS_MODEL.md) v2.0 fixou o
> princípio novo — *"a métrica-mãe da fase 1 é pedido recorrente por tutor, não
> downloads nem audiência"* — e esta versão o operacionaliza. As métricas da
> v1.0 ligadas a histórico e agendamento voltam nas fases 2 e 3, junto com as
> capacidades que as produzem.

---

## Objetivo

Define como o PetDots mede sucesso ao longo da evolução do produto.

Duas coisas mudam num marketplace em relação a um app de gestão pessoal, e as
métricas precisam refletir isso:

1. **Há dois lados.** Oferta e demanda falham por motivos diferentes, e o lado
   frágio muda com o tempo. Medir só o tutor esconde a loja que desengajou.
2. **A economia por pedido é métrica de produto, não de finanças.** Se a
   comissão sufoca a margem do lojista, ele sai da plataforma ou desvia o
   pedido para o WhatsApp — a conta por pedido é um indicador de saúde do
   produto tanto quanto a retenção.

Métricas de vaidade — downloads, audiência, GMV isolado — **não são** o headline.

---

## North Star

> **Tutores recorrentes: tutores com 2 ou mais pedidos entregues nos últimos 60
> dias.**

### Por que esta métrica

- **Captura o produto inteiro.** Para chegar ao segundo pedido, tudo precisa ter
  funcionado: havia oferta no bairro, o preço convenceu, a loja aceitou, a
  entrega chegou — e o tutor voltou.
- **A janela de 60 dias cobre dois ciclos.** Ração, areia e antipulgas são
  compras mensais; 30 dias mediriam sorte de calendário, 90 diluiriam o sinal de
  hábito.
- **"Entregue", não "feito".** Pedido recusado, cancelado ou não entregue não
  conta — é justamente o que não queremos otimizar.
- **É a expressão medível do princípio "Recorrência Acima de Aquisição"**
  ([PRODUCT_PRINCIPLES](PRODUCT_PRINCIPLES.md) §7) no vocabulário do
  marketplace.

O North Star é um indicador consolidado (*lagging*). Os antecedentes estão nas
famílias abaixo — em especial a conversão lembrete → pedido, que é o motor
desenhado da recorrência.

---

## Famílias de métricas

### 1. Oferta (as lojas)

O lado que falha primeiro num marketplace hiperlocal, e o mais fácil de medir
errado: loja cadastrada não é loja operando.

| Métrica | Definição | Indicador |
|---|---|---|
| Lojas ativas | Lojas com ≥ 1 pedido aceito na semana | Saúde real da oferta |
| Lojas onboardadas × ativas | Razão entre lojas em `ACTIVE` e lojas ativas na semana | **"Lojista assinado ≠ lojista ativo"** (IDEACAO §21) — a métrica do desengajamento |
| Taxa de aceite | % de pedidos aceitos sobre pedidos recebidos | Confiabilidade da oferta |
| Tempo até o aceite | Mediana entre `order.placed` e `order.accepted` | Experiência do tutor e atenção do lojista |
| Itens indisponíveis | % de itens marcados `UNAVAILABLE` ou substituídos | Distância entre catálogo e prateleira |
| Frescor do preço | Mediana de dias desde a última atualização de preço por loja | Confiabilidade do comparador |
| Cobertura do catálogo | % dos produtos que giram no bairro com ≥ 2 ofertas ativas | Sem isso não há comparação |
| NPS do lojista | Coletado em momento-chave do piloto | Percepção do parceiro |

### 2. Demanda (os tutores)

| Métrica | Definição | Indicador |
|---|---|---|
| Inscritos na lista de espera | Cadastros pela landing e por endereço fora de área | Apetite antes do lançamento (smoke test, IDEACAO §20) |
| Custo por inscrição | Verba de tráfego ÷ inscritos | Viabilidade de aquisição paga |
| Ativação | % de tutores cadastrados que fazem o 1º pedido | Conversão do funil |
| Consultas ao comparador | Buscas de produto por tutor ativo no mês | Uso da Joia 2, inclusive sem compra |
| Agenda de reposição criada | % de tutores com ≥ 1 agenda ativa | Adesão à Joia 1 — pré-condição da recorrência |
| Pedidos por canal | Distribuição entre `PLATFORM` e `STORE_REFERRAL` | Quanto o lojista está sendo canal (IDEACAO §23) |

### 3. Recorrência

| Métrica | Definição | Indicador |
|---|---|---|
| **North Star** | Tutores com ≥ 2 pedidos entregues em 60 dias | Métrica-mãe |
| Conversão lembrete → pedido | % de lembretes enviados que geram pedido em até 7 dias | **O motor da recorrência** — o antecedente mais importante |
| Precisão da projeção | Diferença em dias entre `projected_depletion_at` e a data do pedido seguinte | Qualidade da calculadora de consumo |
| Intervalo entre pedidos | Mediana de dias entre pedidos entregues do mesmo tutor | Formação de hábito |
| Retenção D30 / D60 de compradores | % de tutores com 1º pedido que voltam a comprar | Retenção no vocabulário de compra |

### 4. Economia por pedido

Os três primeiros são os **gates de validação do piloto** definidos no
[ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md).

| Métrica | Definição | Indicador |
|---|---|---|
| **Contribuição por pedido** | Comissão + taxa de serviço − custo de pagamento | Gate: **≥ R$ 5** no mix real |
| **Margem do lojista pós-comissão** | Margem dele depois da nossa comissão, em relação à original | Gate: **≥ ⅔** (regra do ⅓) |
| **Taxas ao cliente / ticket** | (Taxa de serviço + entrega) ÷ valor do pedido | Gate: **≤ ~8%** |
| Take rate efetivo | Comissão ÷ valor dos produtos, por categoria e no agregado | Calibração da tabela com dado de campo |
| Pedidos com comissão zero | % de pedidos `STORE_REFERRAL` | Custo real da aliança com o lojista |
| Entrega: cobrado × custo | `Delivery.fee_cents` vs `cost_cents` | Se o frete para em pé por pedido |
| Ticket médio | Valor médio do pedido | Contexto das demais |

### 5. Qualidade da operação

| Métrica | Definição | Indicador |
|---|---|---|
| Entrega no prazo | % de pedidos entregues dentro do prazo estimado da área | A promessa que sustenta a recompra |
| Recusas e cancelamentos | Por 100 pedidos, com motivo | Onde a operação quebra |
| Pedido pago sem aceite | Pedidos pagos que expiram sem resposta da loja | O pior caso possível: dinheiro do cliente parado |
| Divergência de conciliação | Diferenças entre `payments`/`payouts` e o extrato do PSP | Integridade contábil |

> **Métricas que dependem de capacidade ainda não modelada** — estorno, tempo de
> resolução de atendimento, avaliação de loja — entram quando a capacidade
> entrar. As lacunas estão registradas em
> [`IDEIAS.md`](../07-process/IDEIAS.md) §"Lacunas para um marketplace
> completo"; não inventar métrica para o que o produto ainda não faz.

---

## Metas por fase

As metas são **direcionais**. Não são projeção financeira nem compromisso, e
serão revisadas ao fim de cada fase com dado real.

### Fase 1 — Cunha: marketplace hiperlocal

**Foco:** provar que um bairro funciona de ponta a ponta e que a conta para em
pé por pedido.

| Indicador | Meta direcional |
|---|---|
| Gates do ADR-0003 (contribuição, margem do lojista, taxas ao cliente) | **Critério duro** — os três atendidos no mix real observado |
| North Star (tutores recorrentes) | Crescimento consistente semana a semana; baseline nos primeiros 60 dias de operação |
| Lojas ativas | Coorte de 5-10 lojas, com **maioria ativa na semana** — a meta é atividade, não assinatura |
| Conversão lembrete → pedido | Baseline nos primeiros 60 dias; melhoria mensurável a cada iteração da Joia 1 |
| Cobertura do catálogo | Maioria dos itens que giram com ≥ 2 ofertas — sem isso o comparador não tem o que comparar |
| Custo por inscrição na lista de espera | Teto definido **antes** do smoke test (go/no-go, IDEACAO §32 item 6) |
| Entrega no prazo | Alta desde o início: é a promessa que sustenta a recompra |
| NPS do lojista | Positivo — na fase 1 ele é o lado frágil |

> Nesta fase não há meta de serviços, agendamento ou parceiro de saúde — o
> produto não tem esse lado.

### Fase 2 — Consolidação local e carteira do pet

**Foco:** o playbook é replicável e o tutor usa o app sem estar comprando.

| Indicador | Meta direcional |
|---|---|
| Segundo território | Mesmas metas da fase 1 alcançadas mais rápido que no primeiro bairro |
| Uso sem compra | % de tutores que abrem o app em semana sem pedido |
| Adesão ao clube de assinatura | Baseline; retenção de assinantes acima da dos não assinantes |
| Conversão do painel em receita | % de lojas que aceitam mensalidade quando ela é introduzida |

### Fase 3 — Serviços e saúde do bairro

| Indicador | Meta direcional |
|---|---|
| Parceiros de serviço ativos | ≥ 1 serviço concluído no mês |
| Tutores com ≥ 1 serviço agendado | Efeito de rede entre os dois lados |
| Retenção com serviço × sem serviço | Hipótese: serviço aumenta retenção |

### Fase 4 — Plataforma B2B

| Indicador | Meta direcional |
|---|---|
| Parceiros operando na plataforma | % com agenda ou financeiro em uso real |
| Receita não-comissão | Participação de B2B e retail media na receita total |

### Fase 5 — IA dedicada

| Indicador | Meta direcional |
|---|---|
| Recomendações convertidas | % de sugestões de reposição/produto que viram pedido |
| Precisão da previsão de demanda | Erro médio da previsão por loja e categoria |

### Fase 6 — Impacto social e expansões

| Indicador | Meta direcional |
|---|---|
| Adoções com Pet ID transferido | Volume no período |
| ONGs ativas | Com ≥ 1 campanha publicada no mês |

---

## Princípios de uso das métricas

1. **O North Star é a bússola.** Toda métrica de produto deve ser questionada
   quanto ao seu impacto sobre tutores recorrentes.
2. **Medir os dois lados, sempre.** Relatório que mostra só demanda esconde a
   metade do marketplace que costuma falhar primeiro.
3. **GMV é monitorado, não é headline.** Ele fica visível por construção — o
   dinheiro passa pela plataforma via split. Isso não o torna a métrica de
   sucesso: um GMV que sufoca a margem do lojista destrói a oferta que o
   produziu.
4. **Métricas de vaidade são monitoradas, não otimizadas:** downloads, visitas,
   usuários cadastrados.
5. **Metas evoluem por fase.** Não existe OKR fixo para todo o ciclo de vida.
6. **Ausência de dado não é fracasso.** Em produto greenfield, a primeira
   missão é estabelecer baseline. Meta absoluta pré-lançamento é hipótese.
7. **Critério de go/no-go se define antes do teste.** Sem teto definido
   previamente, todo resultado "parece bom o suficiente" (IDEACAO §32).
8. **Objeção medida, não opinião coletada.** Lojista dizendo "tá caro" não é
   dado; lojista recusando o piloto gratuito por causa da comissão é (IDEACAO
   §30).

---

## Revisão contínua

Revisar este documento:

- ao fim de cada fase do roadmap, com base no dado coletado;
- quando o modelo de negócio ou a estratégia de crescimento mudarem;
- quando o North Star precisar de refinamento por aprendizado de mercado;
- quando uma capacidade nova passar a produzir métrica que hoje não existe.

O que não deve mudar é o compromisso com **recorrência**, com a **saúde dos dois
lados** e com a **economia por pedido** como fundamentos do sucesso.
