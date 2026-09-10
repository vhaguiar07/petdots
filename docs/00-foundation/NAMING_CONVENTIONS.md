---
title: PetDots — Naming Conventions
status: stable
version: 1.2
updated: 2026-09-10
scope: >
  Define os padrões oficiais de nomenclatura para documentação, código-fonte,
  APIs, banco de dados, eventos, infraestrutura, testes e ferramentas de IA.
relates_to:
  - 00-foundation/GLOSSARY.md
  - 00-foundation/PRODUCT_PRINCIPLES.md
  - README.md
type: foundation
---

# PetDots — Naming Conventions

---

# Objetivo

Este documento define os padrões oficiais de nomenclatura utilizados em todo o projeto PetDots.

Seu objetivo é garantir consistência entre:

* Documentação
* Código-fonte
* APIs
* Banco de dados
* Eventos
* Infraestrutura
* Testes
* Ferramentas de Inteligência Artificial

Todas as implementações devem seguir estas convenções.

---

# Filosofia

O projeto adota uma separação clara entre linguagem de negócio e linguagem técnica.

* A documentação funcional é escrita em **Português**.
* O código-fonte é escrito em **Inglês**.

Essa decisão permite que o produto seja compreendido facilmente pelos stakeholders brasileiros, enquanto mantém o código alinhado às boas práticas internacionais.

---

# Idiomas Oficiais

## Documentação

Idioma:

Português (Brasil)

Exemplos:

* Tutor
* Pet
* Loja
* Oferta
* Pedido
* Repasse

---

## Código-fonte

Idioma:

Inglês

Exemplos:

* Tutor
* Pet
* Store
* Offer
* Order
* Payout

---

# Convenções Gerais

Sempre utilizar:

* nomes claros;
* substantivos;
* linguagem de domínio;
* evitar abreviações;
* evitar siglas desnecessárias;
* evitar nomes genéricos.

---

# Convenções para Código

## Classes

Formato:

PascalCase

Exemplos:

```text
Pet

Tutor

Store

Offer

Order

OrderItem
```

---

## Interfaces

Prefixo:

I

Exemplos:

```text
IOfferRepository

INotificationService

ICommissionCalculator
```

---

## Métodos

Formato:

camelCase

Exemplos:

```text
placeOrder()

acceptOrder()

findOfferById()

calculateCommission()

projectDepletionDate()
```

---

## Variáveis

Formato:

camelCase

Exemplos:

```text
petName

birthDate

unitPriceCents

projectedDepletionAt
```

---

## Constantes

Formato:

UPPER_SNAKE_CASE

Exemplos:

```text
MAX_UPLOAD_SIZE

DEFAULT_PAGE_SIZE

JWT_EXPIRATION_TIME
```

---

## Enumerações

Formato:

PascalCase

Valores:

UPPER_SNAKE_CASE

Exemplo:

```text
PetSpecies

DOG

CAT

BIRD

RABBIT
```

---

# Convenções para Diretórios

Formato:

kebab-case

Exemplos:

```text
identity

catalog

offers

orders

payments
```

> Na API, os diretórios de módulo espelham os agregados do
> [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md) — ver a lista completa em
> [`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md).

---

# Convenções para Arquivos

Arquivos Markdown:

UPPER_SNAKE_CASE

Exemplo:

```text
PRODUCT_VISION.md

DOMAIN_MODEL.md

TECHNICAL_VISION.md
```

---

Arquivos de código:

Seguir convenção da linguagem utilizada.

---

# Convenções para APIs

## URLs

Sempre utilizar:

* minúsculas;
* substantivos;
* plural.

Exemplos:

```text
/api/v1/products

/api/v1/stores

/api/v1/offers

/api/v1/orders
```

---

Nunca utilizar verbos na URL.

Correto:

```text
POST /orders
```

Errado:

```text
POST /createOrder
```

---

# Métodos HTTP

GET

Consultar recursos.

POST

Criar recursos.

PUT

Atualizar completamente.

PATCH

Atualização parcial.

DELETE

Remover recurso.

---

# JSON

Campos sempre em:

camelCase

Exemplo:

```json
{
  "orderId": "...",
  "storeId": "...",
  "totalCents": 12990,
  "placedAt": "...",
  "items": []
}
```

> Valores monetários viajam como **inteiros em centavos** (`totalCents`), e
> percentuais como inteiros em pontos-base (`commissionRateBps`). Nunca ponto
> flutuante — ver `DOMAIN_MODEL`.

---

# Banco de Dados

## Tabelas

snake_case

Plural.

Exemplos:

```text
stores

offers

orders

order_items

payouts
```

---

## Colunas

snake_case

Exemplos:

```text
created_at

updated_at

store_id

unit_price_cents

commission_rate_bps
```

---

## Chaves Primárias

Sempre:

```text
id
```

Tipo preferencial:

UUID

---

## Chaves Estrangeiras

Sempre:

```text
tutor_id

store_id

product_id

order_id
```

---

# Eventos

Formato:

domain.action

Exemplos:

```text
order.placed

order.delivered

payment.captured

payout.settled

offer.price_changed

replenishment.due
```

> A lista canônica e completa dos eventos em uso vive no
> [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md) §"Eventos de domínio". Não
> criar evento fora dela sem atualizar aquele documento.

---

# Tópicos de Mensageria

Caso existam futuramente.

Formato:

kebab-case

Exemplos:

```text
order-events

payment-events

notifications
```

---

# Logs

Os logs devem utilizar linguagem técnica.

Sempre incluir:

* timestamp;
* correlationId;
* requestId;
* userId (quando existir);
* storeId e orderId (quando aplicável).

Nunca registrar informações sensíveis. No domínio da fase 1, isso inclui
explicitamente: dado de pagamento, identificador de subconta no PSP, payload de
webhook e endereço completo do tutor.

## Campos vindos do OpenTelemetry

Desde a `pd-04` ([ADR-0006](../06-decisions/ADR/0006-instrumentacao-opentelemetry.md)),
a linha de log de um request dentro de um trace ativo também carrega:

* `trace_id`;
* `span_id`;
* `trace_flags`.

Esses três são **snake_case de propósito**: são nomes do padrão OpenTelemetry,
gerados pela instrumentação, e renomeá-los para camelCase quebraria a correlação
automática com qualquer backend de telemetria. Não é inconsistência com o
camelCase dos campos próprios do PetDots (`correlationId`, `requestId`) — é a
fronteira entre convenção nossa e convenção do padrão externo.

---

# Branches Git

Formato:

```text
feat/

bugfix/

hotfix/

release/

docs/

refactor/
```

Exemplos:

```text
feat/comparador-de-precos

feat/split-pagamento

bugfix/login

docs/product-roadmap
```

> ⚠️ Estes são os prefixos de branch **genéricos**. As branches de tarefa deste
> projeto seguem o formato `pd-NN/categoria/nome` — ver
> [`DIRETRIZES_FLUXO_IA`](../07-process/DIRETRIZES_FLUXO_IA.md) §2.

---

# Commits

Seguir o padrão Conventional Commits.

Exemplos:

```text
feat:

fix:

refactor:

docs:

test:

build:

ci:

perf:
```

---

# Variáveis de Ambiente

Formato:

UPPER_SNAKE_CASE

Exemplos:

```text
DATABASE_URL

JWT_SECRET

PSP_API_KEY

PSP_WEBHOOK_SECRET

OTEL_EXPORTER_OTLP_ENDPOINT
```

---

# Docker

Imagens:

kebab-case

Exemplo:

```text
petdots-api

petdots-web

petdots-mobile

petdots-worker
```

---

# Kubernetes

Recursos:

kebab-case

Exemplo:

```text
petdots-api

petdots-postgres

petdots-worker
```

---

# IA

Todos os agentes de Inteligência Artificial utilizados durante o desenvolvimento devem respeitar integralmente este documento.

Sempre que gerar:

* código;
* documentação;
* APIs;
* testes;
* migrations;
* diagramas;

as convenções definidas neste documento deverão ser aplicadas automaticamente.

---

# Evolução

Este documento poderá ser expandido ao longo da evolução do projeto.

Entretanto, alterações em convenções já estabelecidas deverão ser evitadas, pois impactam diretamente:

* Código-fonte.
* APIs.
* Banco de dados.
* Documentação.
* Ferramentas de IA.
* Histórico do projeto.

Mudanças só deverão ocorrer mediante decisão arquitetural registrada no repositório.
