---
title: Product Roadmap
status: stable
version: "2.0"
updated: 2026-09-10
scope: >
  Define as fases de evolução do PetDots, começando pela cunha da fase 1 — o
  marketplace hiperlocal de petshops de bairro — e seguindo até o ecossistema
  completo da PRODUCT_VISION. Cada fase traz personas atendidas, capacidades,
  monetização e o marco que a encerra. Não detalha o escopo do MVP (MVP_SCOPE),
  as entidades (DOMAIN_MODEL) nem as métricas (SUCCESS_METRICS).
relates_to:
  - 00-foundation/PRODUCT_VISION.md
  - 00-foundation/BUSINESS_MODEL.md
  - 00-foundation/IDEACAO_FASE1.md
  - 01-product/PERSONAS.md
  - 01-product/MVP_SCOPE.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
type: foundation
---

# Product Roadmap

> **v2.0 (2026-09-10).** Reescrito na `pd-07` sob o
> [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md). A v1.0
> (jun/2026) descrevia a Fase 1 como "Fundação: Vida do Pet" e tratava o
> marketplace como capacidade da Fase 4 — premissa substituída pela estratégia
> alinhada entre os sócios em 02/09/2026 ([IDEACAO_FASE1](IDEACAO_FASE1.md),
> Parte 4) e pelo [BUSINESS_MODEL](BUSINESS_MODEL.md) v2.0. As capacidades da
> v1.0 não foram descartadas: migraram para as fases 2 e 3, com o caminho de
> reentrada registrado no [DOMAIN_MODEL](../01-product/DOMAIN_MODEL.md)
> §"Domínio das fases futuras". As fases 5 (IA dedicada) e 6 (impacto social)
> mantêm a numeração da v1.0, porque o ADR-0002 e o
> [TECHNOLOGY_STACK](../02-architecture/TECHNOLOGY_STACK.md) as citam por
> número.

---

## Objetivo

Este documento define **como o PetDots evolui no tempo**: quais personas entram
em cada fase, quais capacidades são entregues, como cada fase se paga e qual
marco a considera cumprida.

A visão de longo prazo não mudou — *toda a vida do pet em um único lugar*. O que
este roadmap organiza é o **caminho** até lá, que começa por uma fatia estreita
e vencível em vez do ecossistema inteiro de uma vez.

**Não cobre:** o escopo detalhado da Fase 1 → [`MVP_SCOPE`](../01-product/MVP_SCOPE.md);
as entidades → [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md); as métricas e
metas → [`SUCCESS_METRICS`](SUCCESS_METRICS.md); a mecânica de receita →
[`BUSINESS_MODEL`](BUSINESS_MODEL.md).

---

## Princípios de priorização

- **A cunha vence primeiro.** Ecossistemas vencedores nascem de uma fatia que
  vence sozinha. A pergunta da Fase 1 não é "como servir todo o mercado pet?",
  é "qual a menor cunha que gera transação recorrente?" (IDEACAO §15).
- **Densidade hiperlocal, nunca "para todos".** Um bairro por vez, com oferta
  suficiente para o tutor achar o que procura perto de casa. Só se replica o
  playbook depois que ele funcionou num território.
- **Oferta antes da demanda.** Em marketplace hiperlocal, prometer entrega sem
  loja para entregar queima o cliente na primeira tentativa. As lojas entram
  primeiro; a campanha de demanda dispara em seguida — e o intervalo entre as
  duas coisas é risco operacional a comprimir, não a ignorar (IDEACAO §21).
- **Recorrência é desenhada, não esperada.** Ração é compra mensal: sem um
  mecanismo que traga o tutor de volta no dia certo, o app é esquecido entre
  duas compras.
- **A margem do lojista é o recurso escasso.** Nenhuma fase se paga espremendo
  o parceiro (regra do ⅓, [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md)).
- **Nova persona só entra com a base da fase anterior validada.** Cada fase
  adiciona um lado do ecossistema; adicionar dois de uma vez multiplica o
  problema de cold start.
- **IA é transversal desde a Fase 1** (a calculadora de consumo, a curadoria do
  catálogo) e vira **frente dedicada na Fase 5**.

---

## Fases

### Fase 1 — Cunha: marketplace hiperlocal de petshops de bairro

**Personas atendidas:** Tutor de pet de bairro e Lojista de petshop de bairro
(ambos P1).

**Horizonte:** MVP — o produto inicial. Piloto no **eixo Grande Méier** (Méier,
Todos os Santos, Cachambi, Engenho de Dentro, Engenho Novo — Zona Norte do Rio),
decidido em 03/09/2026 (IDEACAO §33).

#### Objetivo

Fazer um bairro funcionar de ponta a ponta: o tutor descobre quando o produto do
pet vai acabar, compara o preço nas petshops vizinhas, compra e recebe em casa;
a loja recebe o pedido, despacha e vê o repasse cair sem precisar cobrar
ninguém. As duas "joias" existem para que o app tenha valor **antes** de haver
volume de transação.

#### Capacidades entregues

- **Reposição inteligente (Joia 1)** — o app calcula quando a ração, a areia ou
  o antipulgas do pet acaba, a partir do peso do animal e do tamanho da
  embalagem, e avisa no dia certo. A calculadora de consumo entrega valor no
  primeiro uso, sem exigir disciplina do tutor (IDEACAO §17).
- **Comparador de preços do bairro (Joia 2)** — quanto custa aquele produto nas
  lojas que entregam no seu endereço, com taxa e prazo. Vale mesmo para quem não
  compra pelo app, e é ímã de busca orgânica (IDEACAO §18).
- **Catálogo mestre por EAN**, curado pela plataforma: a loja não cadastra
  produto, só declara que tem e informa o preço. É o ativo que torna a
  comparação possível e remove do lojista o trabalho de cadastrar milhares de
  SKUs.
- **Compra e entrega** — pedido de uma loja, pagamento por Pix com split no PSP,
  aceite e despacho pelo lojista, entrega pelo motoboy dele ou parceiro do
  bairro.
- **Painel mínimo do lojista** — receber, aceitar, recusar, marcar item
  indisponível, despachar e ver repasses. Régua de WhatsApp, não de ERP
  (IDEACAO §11).
- **Onboarding da loja** — cadastro, documentos, subconta no PSP, áreas de
  entrega por bairro e faixa de CEP, ofertas semeadas do catálogo mestre, e o
  QR de indicação do balcão.
- **Landing pública e lista de espera** — a base do smoke test de demanda e a
  captura de endereços fora da área de entrega, que escolhe o próximo bairro.

#### Monetização

Decidida no [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md):
take rate por categoria sob a regra do ⅓, taxa de serviço do cliente,
taxa de entrega repassada a quem entrega, **comissão zero em pedido de cliente
próprio do lojista** e **sem mensalidade** no piloto. A meta econômica é
contribuição positiva por pedido, não lucro operacional.

#### Marco

> Um tutor do Grande Méier recebe o aviso de que a ração do seu cão vai acabar,
> compara o preço nas petshops do bairro, compra pelo app e recebe em casa — e
> a loja vê o repasse cair sem que ninguém tenha cobrado nada dela.

Os critérios que validam a fase estão em [`MVP_SCOPE`](../01-product/MVP_SCOPE.md)
§"Critérios de saída" e nos gates do ADR-0003.

---

### Fase 2 — Consolidação local e carteira do pet

**Personas atendidas:** as mesmas da Fase 1, em mais territórios.

**Horizonte:** depois de o playbook do primeiro bairro estar validado.

#### Objetivo

Provar que o modelo é replicável e transformar o comprador recorrente em
usuário diário. A Fase 1 traz frequência de **compra**; a carteira do pet traz
frequência de **uso** — é o que faz o tutor abrir o app quando não está
comprando nada.

#### Capacidades entregues

- Replicação do playbook em bairros vizinhos, guiada pela lista de espera
  (Campo Grande é candidato natural de expansão — IDEACAO §33).
- **Carteira digital e histórico do pet** — vacinas, exames e documentos, como
  agregado sob o `Pet`, que já nasce com `id` imutável exatamente para isso.
  Volta com ela o compartilhamento de pet entre tutores (N:N).
- **Clube de assinatura do tutor** (desconto e frete) e **recompra recorrente**
  de ração.
- **Mensalidade SaaS do painel do lojista**, quando o valor estiver comprovado
  pelo próprio painel.
- **Cartão de crédito** e **antecipação de repasse** como serviços.
- **Cupom de aquisição estruturado**, com verba e prazo.
- Mecanismos que aproximem o catálogo do **estoque real** da loja.

#### Monetização

Mensalidade do painel, clube de assinatura e antecipação de repasse —
monetização adicional **sem** aumentar o take rate do lojista.

#### Marco

> O segundo bairro opera com o playbook do primeiro, e o tutor abre o app numa
> semana em que não comprou nada.

---

### Fase 3 — Ecossistema de serviços e saúde do bairro

**Personas atendidas:** prestadores de serviço de bairro (banho e tosa, hotel,
transporte), veterinários e clínicas.

**Horizonte:** com base de tutores e densidade local já instaladas.

#### Objetivo

Estender a relação que já existe com o lojista aos demais negócios do bairro. É
aqui que o parceiro deixa de ser um único tipo: `stores` passa a referenciar
`partners`, e a generalização que o ADR-0004 adiou de propósito acontece com um
segundo tipo real na mão.

#### Capacidades entregues

- Perfil de parceiro (prestador, veterinário, clínica) e catálogo de serviços.
- Busca e descoberta de profissionais por localização.
- **Agendamento online** e integração agendamento → histórico do pet.
- **Reputação de parceiro**, nascida de serviço concluído — nunca de formulário
  solto.
- Comunicação entre tutor e parceiro.

#### Monetização

Comissão sobre serviços agendados, somada às fontes das fases anteriores.

#### Marco

> O tutor agenda banho e tosa na mesma loja onde compra ração, e o atendimento
> entra no histórico do pet.

---

### Fase 4 — Plataforma B2B

**Personas atendidas:** lojas e clínicas que passam a **operar dentro** do
PetDots, e marcas.

**Horizonte:** maturação da relação com os parceiros.

#### Objetivo

Passar de canal a infraestrutura: o parceiro roda o próprio negócio na
plataforma, e a plataforma abre superfícies comerciais que não cobram mais do
lojista.

#### Capacidades entregues

- Portal empresarial e ERP (agenda, prontuário, financeiro, estoque básico).
- **API pública para parceiros** e integrações com sistemas externos.
- **Retail media** — destaque pago de lojas e marcas.
- Serviços financeiros para o lojista.
- Programa de fidelidade e campanhas patrocinadas.

#### Monetização

Planos B2B, retail media, serviços financeiros e APIs comerciais.

#### Marco

> A clínica opera agenda e prontuário pelo PetDots, e a marca de ração compra
> destaque no comparador.

---

### Fase 5 — IA dedicada

**Personas atendidas:** todas.

**Horizonte:** diferenciação por inteligência, sobre base de dados consolidada.

#### Objetivo

Transformar em inteligência o dado que as fases anteriores acumularam: consumo
real por pet, preço por loja ao longo do tempo, histórico de saúde.

#### Capacidades entregues

- Recomendação personalizada de reposição e de produto.
- Previsão de demanda por loja e por categoria (insumo de compra do lojista).
- Assistente do tutor, contextualizado no histórico do pet.
- Busca semântica e sumário de saúde.
- Insights de operação para lojas e clínicas.

#### Monetização

Recursos premium para tutores e insights B2B.

#### Marco

> O app avisa o tutor antes de ele perceber que precisa comprar, e a loja recebe
> a previsão do que vai vender na semana.

---

### Fase 6 — Impacto social e expansões

**Personas atendidas:** ONGs, laboratórios, seguradoras.

**Horizonte:** expansão de impacto.

#### Objetivo

Ampliar o ecossistema para o bem-estar animal e para os participantes que
dependem de uma base instalada para fazer sentido.

#### Capacidades entregues

- Perfil institucional de ONG, campanhas de adoção e castração, eventos.
- Adoção integrada ao cadastro do pet (Pet ID transferido ao novo tutor).
- Integração de laboratórios (resultados de exame no histórico).
- Infraestrutura para seguradoras.

#### Monetização

Parcerias institucionais e APIs comerciais.

#### Marco

> Um pet adotado via ONG chega ao novo tutor com o PetDots ativo e o histórico
> preservado.

---

## Visão temporal

| Fase | Foco | Personas principais | Monetização |
|---|---|---|---|
| Fase 1 | Cunha — marketplace hiperlocal num bairro | Tutor e Lojista | Take rate por categoria + taxa de serviço (ADR-0003) |
| Fase 2 | Consolidação local e carteira do pet | Tutor e Lojista, em mais bairros | SaaS do painel, clube de assinatura, antecipação |
| Fase 3 | Serviços e saúde do bairro | Prestadores, veterinários, clínicas | Comissão sobre serviços |
| Fase 4 | Plataforma B2B | Parceiros e marcas | Planos B2B, retail media, serviços financeiros |
| Fase 5 | IA dedicada | Todas | Premium e insights B2B |
| Fase 6 | Impacto social e expansões | ONGs, laboratórios, seguradoras | Parcerias e APIs |

---

## O que fica fora de todas as fases previstas

Registro do que foi avaliado e **não** entrou, para não voltar como novidade:

- **Rede social de pets** — descartada na ideação (IDEACAO §13): competiria com
  TikTok/Instagram, onde conteúdo pet já domina, com cold start ainda mais
  duro.
- **Operação verticalizada** (estoque próprio, dark store, frota) — é o modelo
  que o precedente Zee.Now condena (IDEACAO §1). A plataforma é asset-light.
- **Alerta de bairro / pet perdido** — a "Joia 3" ficou como *growth hook* para
  quando houver base instalada, não como capacidade de fase (IDEACAO §19).
- **Medicamentos que exigem receita** — fora do catálogo por decisão de escopo
  e regulação (IDEACAO §24).

Oportunidades sem dono nem prazo vivem em
[`IDEIAS.md`](../07-process/IDEIAS.md), não aqui.

---

## Relação com outros documentos

| Documento | Relação |
|---|---|
| [PRODUCT_VISION](PRODUCT_VISION.md) | Dá o destino; este roadmap dá o caminho. |
| [BUSINESS_MODEL](BUSINESS_MODEL.md) | Detalha a mecânica de receita de cada fase. |
| [IDEACAO_FASE1](IDEACAO_FASE1.md) | Registro da análise que produziu a cunha, as joias e o território. |
| [MVP_SCOPE](../01-product/MVP_SCOPE.md) | O recorte exato da Fase 1 — fonte autoritativa do escopo. |
| [PERSONAS](../01-product/PERSONAS.md) | Deriva deste roadmap a jornada de evolução das personas. |
| [DOMAIN_MODEL](../01-product/DOMAIN_MODEL.md) | Entidades da Fase 1 e o caminho de reentrada das capacidades das fases 2-3. |
| [SUCCESS_METRICS](SUCCESS_METRICS.md) | Metas por fase. |

---

## Revisão contínua

Este roadmap deve ser revisado sempre que houver mudança de prioridade
estratégica, validação ou invalidação de hipótese de produto, ou entrada de novo
segmento no ecossistema.

A sequência pode ser acelerada, mesclada ou reordenada conforme aprendizado de
mercado — desde que os princípios de priorização acima sejam mantidos. Mudança
de fase é decisão de produto: registrar em ADR quando tiver custo de reversão.
