---
title: PetDots — Glossary
status: stable
version: "2.0"
updated: 2026-09-10
scope: >
  Define a terminologia oficial e a linguagem ubíqua do domínio PetDots,
  organizada pela fase em que cada conceito entra no produto: os termos do
  marketplace hiperlocal da fase 1 e os das fases seguintes. Todo conceito com
  significado específico no produto tem definição aqui.
relates_to:
  - 00-foundation/NAMING_CONVENTIONS.md
  - 00-foundation/PRODUCT_ROADMAP.md
  - 01-product/DOMAIN_MODEL.md
  - README.md
type: foundation
---

# PetDots — Glossary

> **v2.0 (2026-09-10).** Reescrito na `pd-07`. A v1.0 (jun/2026) definia a
> linguagem do produto "Vida do Pet" e não continha nenhum termo do
> marketplace — Loja, Oferta, Pedido, Repasse, Comparador. Os termos da v1.0
> **não foram removidos**: os que pertencem a fases posteriores estão na seção
> "Fases futuras", com a fase de reentrada. As definições da fase 1 derivam do
> [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md) v2.0, que é a fonte
> autoritativa em caso de divergência.

---

## Objetivo

Este documento define a terminologia oficial do PetDots — a **linguagem ubíqua**
do domínio. Serve a todos os envolvidos no produto: pessoas e agentes de IA.

Sempre que um termo tiver significado específico no domínio, sua definição
precisa constar aqui.

---

## Regras gerais

- Cada conceito tem **um** significado oficial.
- Não criar sinônimos para o mesmo conceito.
- O código-fonte usa a nomenclatura definida aqui (mapeamento PT ↔ EN ↔ tabela
  no fim do documento e no `DOMAIN_MODEL`).
- Conceito novo entra neste documento **antes** de ser usado em documentação,
  API ou código.
- Termo de fase futura fica marcado como tal — usar em código só quando a fase
  chegar.

---

## Conceitos fundamentais

### Ecossistema

Conjunto de participantes que interagem por meio do PetDots: tutores, pets,
lojas (petshops), entregadores e — nas fases seguintes — prestadores de serviço,
veterinários, clínicas, ONGs, laboratórios e seguradoras.

O PetDots existe para conectar esses participantes. Na fase 1, o ecossistema tem
**dois lados ativos**: tutores e lojas.

### Cunha

A menor fatia do ecossistema capaz de gerar transação recorrente sozinha, e por
onde o produto começa. A cunha do PetDots é o **marketplace hiperlocal de
petshops de bairro**. O ecossistema completo é consequência da densidade que a
cunha cria, não o ponto de partida.

### Piloto

A operação da fase 1 num único território, com um número pequeno de lojas e
relacionamento pessoal com cada uma.

### Território

A região geográfica onde o piloto opera. O território do piloto é o **eixo
Grande Méier** — Méier, Todos os Santos, Cachambi, Engenho de Dentro e Engenho
Novo, na Zona Norte do Rio de Janeiro.

### Tutor

Pessoa responsável por um ou mais pets. É dono das informações dos seus animais
e controla o acesso a elas.

Na fase 1, um pet pertence a **um** tutor; o compartilhamento entre tutores
(N:N) volta na fase 2, junto com a carteira do pet.

### Pet

Animal cadastrado por um tutor. Na fase 1 o pet existe **a serviço da
reposição** — peso e consumo são o insumo da calculadora que projeta quando o
produto acaba. O pet volta ao centro do produto na fase 2, com a carteira e o
histórico.

### Pet ID

Identificador permanente e único de cada pet. Acompanha o animal por toda a vida
dentro do ecossistema: mesmo que o tutor mude ou novos parceiros sejam
integrados, o Pet ID permanece.

Na fase 1 ele já nasce imutável, exatamente para que o histórico da fase 2 possa
ser construído sobre ele.

---

## Marketplace hiperlocal — Fase 1

> Termos em uso hoje. Cada um corresponde a uma entidade, atributo ou regra do
> [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md) v2.0.

### Loja

Petshop de bairro participante da plataforma. É dona das próprias ofertas, áreas
de entrega e membros. Passa por `PROSPECT` → `ONBOARDING` → `ACTIVE`, e só chega
a `ACTIVE` com ao menos uma área de entrega, uma oferta disponível e subconta no
PSP.

No código: `Store`. **Não** confundir com "Pet Shop" da v1.0, que era um perfil
de parceiro genérico de fase futura.

### Membro da Loja

Vínculo entre um usuário e uma loja, com papel: `OWNER` (dono) ou `OPERATOR`
(quem opera o balcão). É o que autoriza alguém a ver e agir sobre os dados
daquela loja — e só daquela.

### Área de Entrega

Onde uma loja entrega, e por quanto: lista de bairros e faixas de CEP, com taxa
e prazo estimado. É o mapa de entrega da loja expresso sem infraestrutura
geoespacial.

### Catálogo mestre

O catálogo de produtos da **plataforma**, único e curado por nós, identificado
por EAN. A loja nunca cria nem edita produto: ela declara que tem e informa o
preço.

É o ativo mais estruturante da fase 1 — sem produto comum entre lojas não existe
comparação de preço.

### Produto

Item do catálogo mestre: nome, marca, categoria, variante (ex.: "15 kg"), peso
líquido, EAN. Pertence à plataforma.

### EAN

Código de barras global do produto. É a chave que garante que a mesma ração
ofertada por duas lojas seja **o mesmo** produto no catálogo.

### Categoria de produto

Classificação do produto que **determina a comissão**: ração standard, ração
premium, petisco, higiene, saúde de venda livre, acessório. Por isso é atributo
de domínio, não rótulo de vitrine.

### Oferta

O que uma loja vende, por quanto e se está disponível — o cruzamento de Loja com
Produto. É a fonte do comparador de preços.

### Comparador de preços

A consulta que mostra, para um produto, quanto ele custa nas lojas que entregam
no endereço do tutor, com taxa e prazo. É a **Joia 2** da fase 1 e tem valor
mesmo para quem não compra pelo app.

### Reposição inteligente

O mecanismo que sabe **quando** o produto do pet vai acabar e avisa o tutor. É a
**Joia 1** da fase 1.

### Calculadora de consumo

O cálculo que transforma peso do pet e tamanho da embalagem em gramas por dia e
em data projetada de término. É o que dá valor no primeiro uso do app ("seu saco
de 15 kg dura 42 dias"), sem exigir disciplina do tutor.

### Agenda de Reposição

O registro, para um pet e um produto, de quanto ele consome por dia e quando o
estoque do tutor acaba. Pode ser baseada em consumo (ração, areia) ou em
intervalo fixo (antipulgas, vermífugo).

### Lembrete

Aviso agendado ao tutor de que a reposição está próxima. É idempotente por
construção: reprocessar não gera aviso duplicado.

### Pedido

Uma compra de um tutor em **uma** loja. É o registro contábil da plataforma:
carrega o retrato imutável de preços, categorias e comissões do momento da
compra. Percorre `PLACED` → `ACCEPTED` → `DISPATCHED` → `DELIVERED`, com
`REJECTED` e `CANCELLED` como saídas.

Não existe carrinho de múltiplas lojas na fase 1.

### Item do pedido

Linha do pedido, com o snapshot do produto, do preço unitário e da comissão
aplicada. Registra também se foi entregue, substituído ou estava indisponível.

### Snapshot

A cópia congelada de um valor no momento do pedido — preço, categoria, taxa de
comissão. Existe para que mudança futura de preço ou de tabela **nunca** altere
um pedido já feito.

### Substituição assistida

Quando a loja não tem o item exato e oferece outro em seu lugar. Existe porque o
catálogo não reflete o estoque real da loja na fase 1.

### Pagamento

O que o cliente pagou e o rastro disso no PSP. Na fase 1 o meio principal é o
Pix; cartão entra depois do lançamento.

### PSP

*Payment Service Provider* — o provedor de pagamento que executa a cobrança e
divide o dinheiro. O dinheiro **nunca** é movimentado pela nossa API: ela cria a
intenção de pagamento e espera a confirmação do PSP.

### Split

A divisão do pagamento feita pelo PSP na liquidação: a loja recebe o líquido e a
plataforma retém comissão e taxa de serviço. Por construção, não existe cobrança
manual de comissão ao lojista.

### Webhook

A chamada que o PSP faz à nossa API para confirmar o pagamento. É a **única**
fonte que dá um pedido como pago: assinada, idempotente e com o payload
persistido para auditoria.

### Repasse

O que a loja recebe de um pedido depois da comissão — o resultado do split. Não
existe repasse sem pagamento confirmado.

### Take rate

O percentual que a plataforma retém sobre o valor dos produtos de um pedido.
Varia **por categoria** de produto.

### Taxa de comissão

A expressão concreta do take rate: a tabela vigente por categoria, historizada
porque vai ser recalibrada com dados de campo.

### Regra do ⅓

O limite que governa o take rate: a comissão **nunca** consome mais de um terço
da margem bruta do lojista naquela categoria. Acima disso, o lojista sai da
plataforma ou desvia o pedido para o WhatsApp.

### Tarifa de fundador

Take rate reduzido, travado por prazo, para as primeiras lojas do piloto.
Materializa-se como exceção por loja e categoria sobre a tabela geral.

### Comissão zero (cliente próprio)

Pedido que chegou pelo link ou QR da própria loja não paga comissão. É o que
transforma o WhatsApp do lojista — o concorrente invisível — em canal de
aquisição da plataforma.

### Código de indicação

O identificador único e imutável da loja usado no link e no QR do balcão. É o
que classifica o pedido como cliente próprio da loja.

### Taxa de serviço

Valor fixo cobrado do cliente por pedido, receita da plataforma.

### Taxa de entrega

Valor cobrado do cliente pela entrega, repassado integralmente a quem entrega.
Neutro para a plataforma no piloto.

### Entrega

Como o pedido chega ao cliente: pelo motoboy da própria loja ou por parceiro do
bairro. A plataforma não mantém frota.

### Entregador

Quem leva o pedido — motoboy da loja ou parceiro fixo do bairro, remunerado pela
taxa de entrega. É **papel operacional**, não uma identidade da plataforma: na
fase 1 não há app nem login de entregador.

### Painel do lojista

A área do app onde o membro da loja recebe e trabalha os pedidos, ajusta preço e
disponibilidade e vê repasses. Deliberadamente mínimo — "régua de WhatsApp, não
de ERP".

### Lista de espera

Cadastros capturados pela landing e por endereços fora da área de entrega. É o
dado que mede apetite antes do lançamento e escolhe o próximo bairro.

### Landing pública

A página web, indexável por buscadores, que sustenta o smoke test e as páginas
públicas do comparador.

### Smoke test

Teste de demanda feito **antes** de o app existir: landing "chegando ao bairro
X" mais tráfego pago geolocalizado, medindo custo por inscrição na lista de
espera.

---

## Fases futuras

> Conceitos **decididos e documentados** como pertencentes a fases posteriores.
> Não são esquecimento, e não devem aparecer em código da fase 1. A fase de
> reentrada de cada um está no [`PRODUCT_ROADMAP`](PRODUCT_ROADMAP.md); o
> caminho técnico, no [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md)
> §"Domínio das fases futuras".

### Histórico do Pet — fase 2

Conjunto de todas as informações registradas durante a vida do animal: vacinas,
consultas, exames, cirurgias, medicamentos, alergias, peso, eventos e
documentos.

### Timeline — fase 2

Representação cronológica do histórico do pet. A memória digital da vida do
animal.

### Evento — fase 2

Qualquer ocorrência relevante na vida do pet: vacina, consulta, cirurgia, banho,
tosa, vermifugação, exame, internação, adoção.

⚠️ Não confundir com **evento de domínio** (`order.placed`, `payment.captured`),
que é um conceito de engenharia em uso desde a fase 1 — ver `Domínio` e o
`DOMAIN_MODEL` §"Eventos de domínio".

### Carteira Digital — fase 2

Área que armazena documentos e registros do pet: carteira de vacinação,
receitas, exames, atestados, imagens.

### Parceiro — fase 3

Qualquer organização ou profissional participante do ecossistema. Na fase 1
existe **um** tipo de parceiro, modelado concretamente como `Loja`; a
generalização acontece quando o segundo tipo existir.

### Clínica — fase 3

Empresa de serviços veterinários, com veterinários e colaboradores vinculados.

### Veterinário — fase 3

Profissional habilitado responsável pelo atendimento clínico, autônomo ou
vinculado a uma clínica.

### Prestador de Serviço — fase 3

Pessoa física ou empresa que oferece serviços ao tutor: banho e tosa, hotel,
dog walker, cat sitter, transporte, adestramento, fotografia.

### Serviço — fase 3

Atividade contratável oferecida por um parceiro.

### Agendamento — fase 3

Reserva de horário para a realização de um serviço.

### Reputação — fase 3

Avaliação de um parceiro, nascida de serviço concluído na plataforma — nunca de
formulário solto.

### Portal Empresarial — fase 4

Área onde o parceiro passa a operar o próprio negócio dentro do PetDots
(agenda, prontuário, financeiro, estoque).

### ONG — fase 6

Organização dedicada ao bem-estar animal: adoções, campanhas, castrações,
projetos sociais.

### Laboratório — fase 6

Empresa de exames veterinários, com integração de resultados ao histórico do
pet.

---

## Inteligência

### Recomendação

Sugestão gerada automaticamente a partir dos dados cadastrados. Na fase 1:
reposição projetada e produto equivalente mais barato no bairro. Nas fases
seguintes: cuidados, serviços e previsão de demanda.

### Assistente Inteligente

Componente que auxilia o tutor com IA — orientações, resumos e recomendações.
Não realiza diagnóstico. Frente dedicada na fase 5.

### Inteligência Artificial

Conjunto de capacidades usadas para enriquecer a experiência e auxiliar
parceiros. Nunca substitui profissional habilitado.

---

## Plataforma

### Aplicativo do Tutor

Principal interface do tutor: iOS, Android e web.

### Painel do Lojista (canal)

**O mesmo aplicativo**, acessado por quem tem papel de membro de loja. Não é um
produto separado.

### Landing pública (canal)

Aplicação web separada, voltada a SEO: páginas públicas do comparador e a
landing do smoke test.

### Portal Empresarial (canal) — fase 4

Ambiente administrativo para parceiros que operam dentro da plataforma.

### API

Camada de comunicação entre as aplicações e, no futuro, integrações externas.
Toda capacidade da plataforma passa pela API — nenhum cliente acessa banco ou
PSP diretamente.

---

## Engenharia

### Capacidade (Capability)

Grande área funcional do sistema. Exemplos na fase 1: Catálogo, Oferta e
comparador, Pedido, Pagamento e repasse, Reposição inteligente.

Capacidades agrupam funcionalidades relacionadas — ver
[`CAPABILITIES`](../01-product/CAPABILITIES.md).

### Funcionalidade (Feature)

Comportamento específico dentro de uma capacidade. Exemplo — capacidade
"Reposição inteligente"; funcionalidades: calcular consumo diário, projetar data
de término, agendar lembrete, recalcular após a entrega.

### Domínio

Conjunto de regras de negócio do produto. Na fase 1, o núcleo do domínio é a
**transação recorrente**: um tutor compra de uma loja do seu bairro, e a
plataforma sabe quando ele precisa comprar de novo.

### Evento de domínio

Fato do negócio que o sistema publica, no formato `recurso.ação` — por exemplo
`order.placed`, `payment.captured`, `replenishment.due`. A lista canônica está
no `DOMAIN_MODEL`.

### Agregado

Grupo de entidades tratado como uma unidade de consistência, com uma raiz. Na
fase 1: `Loja`, `Produto`, `Pedido` e `Tutor`.

### AI First

Princípio segundo o qual documentação, arquitetura e desenvolvimento são
concebidos para colaboração entre pessoas e agentes de IA.

---

## Convenções de terminologia

Para manter consistência entre documentação, APIs e código, usar sempre estes
pares. A coluna **Fase** indica quando o termo entra em uso no código.

| Português | Inglês | Tabela | Fase |
|---|---|---|---|
| Usuário (identidade) | `User` | `users` | 1 |
| Tutor | `Tutor` | `tutors` | 1 |
| Pet | `Pet` | `pets` | 1 |
| Pet ID | `PetId` | — | 1 |
| Loja | `Store` | `stores` | 1 |
| Membro da Loja | `StoreMember` | `store_members` | 1 |
| Área de Entrega | `DeliveryArea` | `delivery_areas` | 1 |
| Produto | `Product` | `products` | 1 |
| Oferta | `Offer` | `offers` | 1 |
| Taxa de Comissão | `CommissionRate` | `commission_rates` | 1 |
| Comissão Especial da Loja | `StoreCommissionRate` | `store_commission_rates` | 1 |
| Pedido | `Order` | `orders` | 1 |
| Item do Pedido | `OrderItem` | `order_items` | 1 |
| Pagamento | `Payment` | `payments` | 1 |
| Repasse | `Payout` | `payouts` | 1 |
| Entrega | `Delivery` | `deliveries` | 1 |
| Agenda de Reposição | `ReplenishmentSchedule` | `replenishment_schedules` | 1 |
| Lembrete | `Reminder` | `reminders` | 1 |
| Lista de Espera | `WaitlistEntry` | `waitlist_entries` | 1 |
| Histórico do Pet | `PetHistory` | (projeção) | 2 |
| Timeline | `Timeline` | `timelines` | 2 |
| Evento (do pet) | `Event` | `events` | 2 |
| Carteira Digital | `DigitalWallet` | `digital_wallets` | 2 |
| Documento | `Document` | `documents` | 2 |
| Parceiro | `Partner` | `partners` | 3 |
| Clínica | `Clinic` | — | 3 |
| Veterinário | `Veterinarian` | — | 3 |
| Prestador de Serviço | `ServiceProvider` | — | 3 |
| Serviço | `Service` | `services` | 3 |
| Agendamento | `Appointment` | `appointments` | 3 |
| ONG | `Ngo` | — | 6 |
| Laboratório | `Laboratory` | — | 6 |

Convenções técnicas (PK, FK, `snake_case`, `*_cents`, `*_bps`) estão em
[`NAMING_CONVENTIONS`](NAMING_CONVENTIONS.md) e no `DOMAIN_MODEL`.

---

## Evolução

Este glossário evolui conforme novos conceitos entram no domínio. Nenhum termo
novo deve ser usado em documentação, API ou código antes de ter definição
oficial aqui.

Quando um conceito de fase futura entrar em uso, mover o verbete para a seção da
fase corrente e atualizar a coluna **Fase** da tabela de convenções.
