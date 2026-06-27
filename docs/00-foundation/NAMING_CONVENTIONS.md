# PetDots — Naming Conventions

> **Versão:** 1.0
> **Status:** Draft
> **Documento:** Naming Conventions

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
* Consulta
* Clínica
* Timeline
* Carteira Digital

---

## Código-fonte

Idioma:

Inglês

Exemplos:

* Tutor
* Pet
* Consultation
* Clinic
* Timeline
* DigitalWallet

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

Consultation

Clinic

Vaccination

TimelineEvent
```

---

## Interfaces

Prefixo:

I

Exemplos:

```text
IPetRepository

INotificationService

IAppointmentScheduler
```

---

## Métodos

Formato:

camelCase

Exemplos:

```text
createPet()

updatePet()

findPetById()

scheduleAppointment()

cancelAppointment()
```

---

## Variáveis

Formato:

camelCase

Exemplos:

```text
petName

birthDate

medicalHistory

nextVaccination
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
user-management

pet-health

marketplace

notifications

appointments
```

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
/api/v1/pets

/api/v1/tutors

/api/v1/appointments

/api/v1/clinics
```

---

Nunca utilizar verbos na URL.

Correto:

```text
POST /pets
```

Errado:

```text
POST /createPet
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
  "petId": "...",
  "petName": "...",
  "birthDate": "...",
  "medicalHistory": []
}
```

---

# Banco de Dados

## Tabelas

snake_case

Plural.

Exemplos:

```text
pets

tutors

appointments

vaccinations

timeline_events
```

---

## Colunas

snake_case

Exemplos:

```text
birth_date

created_at

updated_at

pet_id

clinic_id
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
pet_id

tutor_id

clinic_id

appointment_id
```

---

# Eventos

Formato:

domain.action

Exemplos:

```text
pet.created

pet.updated

appointment.scheduled

appointment.cancelled

vaccination.registered

timeline.event.created
```

---

# Tópicos de Mensageria

Caso existam futuramente.

Formato:

kebab-case

Exemplos:

```text
pet-events

notifications

appointments

marketplace
```

---

# Logs

Os logs devem utilizar linguagem técnica.

Sempre incluir:

* timestamp;
* correlationId;
* requestId;
* userId (quando existir);
* petId (quando aplicável).

Nunca registrar informações sensíveis.

---

# Branches Git

Formato:

```text
feature/

bugfix/

hotfix/

release/

docs/

refactor/
```

Exemplos:

```text
feature/pet-timeline

feature/appointment-module

bugfix/login

docs/product-roadmap
```

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

SMTP_HOST

S3_BUCKET

REDIS_URL
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
