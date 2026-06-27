---
title: PetDots — Domain Model
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Define o modelo de domínio do ecossistema PetDots: entidades, agregados,
  relacionamentos, ownership de dados e eventos de domínio. É a referência
  central que ancora arquitetura, banco de dados, APIs e a camada de
  conhecimento de IA. O domínio é centrado no Pet, no Tutor e na Timeline.
relates_to:
  - 00-foundation/GLOSSARY.md
  - 00-foundation/NAMING_CONVENTIONS.md
  - 01-product/PERSONAS.md
  - 01-product/MVP_SCOPE.md
  - 05-ai/AI_DOMAIN_KNOWLEDGE.md
type: product
---

# PetDots — Domain Model

---

## Objetivo

Este documento descreve o modelo de domínio do PetDots de forma precisa e
implementável.

Ele define **quais entidades existem**, **como elas se agrupam em agregados**,
**como se relacionam** (com cardinalidade explícita), **quem é dono de cada
dado** e **quais eventos de domínio** o sistema emite.

É a referência única que mantém arquitetura, modelagem de banco de dados,
contratos de API e a camada de conhecimento de IA alinhados à linguagem ubíqua
definida no [GLOSSARY](../00-foundation/GLOSSARY.md).

Toda a terminologia usada aqui segue exatamente o GLOSSARY. Toda nomenclatura
técnica (nomes de código, tabelas, eventos) segue
[NAMING_CONVENTIONS](../00-foundation/NAMING_CONVENTIONS.md).

---

## Escopo

**Coberto por este documento:**

- As entidades centrais da vida do Pet (Pet, Tutor, Timeline, Evento, Carteira
  Digital, Histórico do Pet).
- Os participantes do ecossistema (Parceiro e suas especializações) e os
  conceitos de Serviço e Agendamento.
- Agregados e suas raízes, relacionamentos e cardinalidades.
- Ownership de dados e o princípio "O Tutor é o Dono dos Dados".
- Eventos de domínio no formato `domain.action`.

**Não coberto (intencionalmente):**

- Modelagem física detalhada de banco (DDL, índices) — pertence à camada de
  arquitetura/dados.
- Contratos de endpoint de API (request/response) — pertencem à camada de API.
- Fluxos de tela e jornadas — ver `USER_JOURNEYS.md`.

> **Núcleo do domínio.** O coração do PetDots é a vida do Pet: o Pet, seu Tutor,
> sua Timeline e seus Eventos. A capacidade de comércio entre tutores e
> parceiros comerciais é **uma capacidade futura**, e não o núcleo do domínio
> (ver "Capacidades fora do núcleo", ao final).

---

## Conteúdo

### Convenção de nomes (PT ↔ código)

A documentação usa os termos em Português do GLOSSARY. Os identificadores de
código/eventos usam o mapeamento oficial:

| Domínio (PT)       | Código (EN)      | Tabela (snake_case)   |
| ------------------ | ---------------- | --------------------- |
| Tutor              | Tutor            | `tutors`              |
| Pet                | Pet              | `pets`                |
| Pet ID             | PetId            | (coluna `id` em pets) |
| Evento             | Event            | `events`              |
| Timeline           | Timeline         | `timelines`           |
| Carteira Digital   | DigitalWallet    | `digital_wallets`     |
| Parceiro           | Partner          | `partners`            |
| Clínica            | Clinic           | `clinics`             |
| Veterinário        | Veterinarian     | `veterinarians`       |
| Pet Shop           | PetShop          | `pet_shops`           |
| Prestador de Serv. | ServiceProvider  | `service_providers`   |
| ONG                | Ngo              | `ngos`                |
| Laboratório        | Laboratory       | `laboratories`        |
| Serviço            | Service          | `services`            |
| Agendamento        | Appointment      | `appointments`        |

> Toda PK é uma coluna `id` do tipo UUID; toda FK segue `entidade_id`
> (ex.: `pet_id`, `tutor_id`). Ver NAMING_CONVENTIONS.

---

### Entidades

Definições derivadas do GLOSSARY, com os atributos-chave que sustentam o modelo.
Os atributos listados são os essenciais ao domínio, não o esquema completo.

#### Tutor (`Tutor`)

Pessoa responsável por um ou mais Pets. É o dono das informações de seus animais
e controla compartilhamento, permissões e acesso aos dados.

Atributos-chave: `id`, `name`, `email`, `phone`, `created_at`.

#### Pet (`Pet`)

Animal cadastrado na plataforma. **É a entidade central do domínio** — toda a
plataforma é construída ao redor do Pet.

Atributos-chave: `id` (este `id` **é o Pet ID**), `name`, `species`
(enum `PetSpecies`: DOG, CAT, BIRD, RABBIT, ...), `breed`, `birth_date`, `sex`,
`photo_url`, `created_at`.

#### Pet ID (`PetId`)

Identificador permanente e único de cada Pet. Acompanha o animal por toda a vida
no ecossistema: **não muda** quando o Tutor é alterado nem quando novos parceiros
são integrados.

Modelagem: o Pet ID **é** o `id` (UUID) da entidade Pet. Não é uma entidade
separada; é a identidade estável do Pet — por isso é citado explicitamente, pois
sua imutabilidade é uma regra de negócio.

#### Evento (`Event`)

Qualquer ocorrência relevante registrada na vida do Pet (vacina, consulta,
cirurgia, banho, tosa, vermifugação, exame, internação, adoção, etc.).

Atributos-chave: `id`, `pet_id`, `type` (categoria do evento), `occurred_at`
(quando aconteceu), `description`, `source` (origem: tutor, parceiro,
integração), `created_at`. Pode referenciar a entidade que o originou
(ex.: `appointment_id`).

#### Timeline (`Timeline`)

Representação cronológica do Histórico do Pet — a memória digital da vida do
animal. Todo Evento relevante gera automaticamente um registro na Timeline.

Modelagem: a Timeline é a **projeção cronológica ordenada dos Eventos de um
Pet**. Há exatamente uma Timeline por Pet.

#### Carteira Digital (`DigitalWallet`)

Área que armazena documentos e registros importantes do Pet: carteira de
vacinação, receitas, exames, atestados, documentos e imagens.

Atributos-chave: `id`, `pet_id`, e uma coleção de documentos
(`document` com `type`, `file_url`, `issued_at`, `metadata`). Há exatamente uma
Carteira Digital por Pet.

#### Histórico do Pet (`Histórico do Pet`)

Conjunto de **todas** as informações registradas durante a vida do animal
(vacinas, consultas, exames, cirurgias, medicamentos, alergias, peso, eventos,
documentos).

Modelagem: o Histórico do Pet é um **conceito agregador**, não uma tabela
própria. Materializa-se através dos Eventos (a Timeline) e dos documentos (a
Carteira Digital) associados ao Pet. É a visão completa que emerge desses dados.

#### Parceiro (`Partner`)

Qualquer organização ou profissional participante do ecossistema (Clínicas,
Veterinários, Pet Shops, Prestadores de Serviço, Laboratórios, ONGs). É a
entidade-base; as demais abaixo são suas **especializações**.

Atributos-chave: `id`, `name`, `type` (especialização), `document` (CNPJ/CPF),
`contact`, `created_at`.

> **Questão em aberto (decisão de modelagem):** representar as especializações
> de Parceiro como (a) herança/tabela única com discriminador `type`, (b)
> tabelas-por-tipo com FK para `partners`, ou (c) papéis (roles) que um mesmo
> Parceiro pode acumular. Há prós e contras (um negócio pode ser Pet Shop **e**
> Clínica). Decisão a ser fechada na camada de arquitetura. Para o domínio,
> tratamos como especializações de Parceiro.

#### Clínica (`Clinic`)

Especialização de Parceiro: empresa de serviços veterinários. Pode possuir
diversos Veterinários e colaboradores.

#### Veterinário (`Veterinarian`)

Profissional habilitado responsável pelo atendimento clínico. Pode atuar de
forma independente (é um Parceiro por si) ou vinculado a uma Clínica.

#### Pet Shop (`PetShop`)

Especialização de Parceiro: comercializa itens e/ou presta serviços do mercado
pet.

#### Prestador de Serviço (`ServiceProvider`)

Especialização de Parceiro: pessoa física ou empresa que oferece serviços aos
tutores (dog walker, cat sitter, banho e tosa, hotel, transporte, adestramento,
fotografia).

#### ONG (`Ngo`)

Especialização de Parceiro: organização de bem-estar animal. Divulga eventos,
adoções, campanhas, castrações e projetos sociais.

#### Laboratório (`Laboratory`)

Especialização de Parceiro: realiza exames veterinários. Futuramente poderá
integrar automaticamente resultados ao Histórico do Pet (gerando Eventos).

#### Serviço (`Service`)

Atividade contratável oferecida por um Parceiro (consulta, exame, banho, hotel,
transporte, adestramento).

Atributos-chave: `id`, `partner_id`, `name`, `description`, `price`, `duration`,
`active`.

#### Agendamento (`Appointment`)

Reserva de um horário para realização de um Serviço. Conecta o Tutor que
solicita, o Parceiro que executa e o Pet que recebe o serviço.

Atributos-chave: `id`, `tutor_id`, `partner_id`, `pet_id`, `service_id`,
`scheduled_at`, `status` (enum: SCHEDULED, CONFIRMED, CANCELLED, COMPLETED),
`created_at`. Ao ser concluído, um Agendamento tipicamente origina um Evento na
Timeline do Pet.

---

### Agregados

Um **agregado** é um conjunto de entidades tratado como uma unidade de
consistência; o acesso e a modificação passam pela **raiz do agregado**.

#### Agregado raiz: `Pet`

A raiz `Pet` é o coração do domínio. Engloba:

- **Timeline** (1:1) — a memória cronológica do Pet.
- **Eventos** (1:N) — as ocorrências da vida do Pet, projetadas na Timeline.
- **Carteira Digital** (1:1) — documentos e registros do Pet.

Invariantes:

- Todo Pet tem exatamente uma Timeline e uma Carteira Digital ao longo de toda a
  sua existência.
- O Pet ID (`id`) é imutável.
- Eventos pertencem a um único Pet e não podem ser movidos entre Pets.

#### Agregado raiz: `Tutor`

A raiz `Tutor` engloba:

- **Vínculos com Pets** — os Pets que o Tutor tutela (relação N:N, ver abaixo).
- **Permissões / autorizações** — quem pode ver ou editar os dados de cada Pet
  e em qual extensão (o controle de compartilhamento de dados).

Invariantes:

- Um vínculo Tutor–Pet sempre carrega um papel/permissão (ex.: tutor primário,
  tutor autorizado).
- Um Pet deve ter ao menos um Tutor responsável a qualquer momento.

#### Agregado raiz: `Parceiro`

A raiz `Parceiro` engloba:

- **Serviços** (1:N) — o catálogo de serviços que o Parceiro oferece.
- **Agendamentos** (1:N do ponto de vista do Parceiro) — as reservas
  destinadas a ele.

Invariantes:

- Um Serviço pertence a exatamente um Parceiro.
- Um Agendamento referencia um Serviço do próprio Parceiro.

---

### Relacionamentos (cardinalidade explícita)

| Relação                              | Cardinalidade | Observação                                                 |
| ------------------------------------ | ------------- | ---------------------------------------------------------- |
| Tutor ↔ Pet                          | **N:N**       | Tutores autorizados; tabela de junção com papel/permissão. |
| Pet → Evento                         | **1:N**       | Um Pet tem muitos Eventos; cada Evento, um único Pet.      |
| Pet → Timeline                       | **1:1**       | Uma Timeline por Pet.                                      |
| Pet → Carteira Digital               | **1:1**       | Uma Carteira Digital por Pet.                              |
| Parceiro → Serviço                   | **1:N**       | Um Parceiro oferece vários Serviços.                       |
| Agendamento → Serviço                | **N:1**       | Cada Agendamento reserva um Serviço.                       |
| Agendamento ↔ (Tutor, Parceiro, Pet) | **liga 3**    | Liga Tutor (solicita) ↔ Parceiro (executa) ↔ Pet (recebe). |

Notas:

- **Tutor N:N Pet:** materializa-se numa tabela de junção (ex.: `pet_tutors`)
  com `pet_id`, `tutor_id` e o papel/permissão do vínculo. É o que permite que
  um Pet tenha múltiplos tutores autorizados e um Tutor tenha múltiplos Pets.
- **Agendamento como conector:** o Agendamento carrega `tutor_id`, `partner_id`,
  `pet_id` e `service_id`. Ele é o ponto de encontro entre o agregado Tutor, o
  agregado Parceiro e o agregado Pet, sem violar a independência das raízes
  (referencia-as por `id`).
- **Evento e Agendamento:** a conclusão de um Agendamento pode gerar um Evento
  na Timeline do Pet (ex.: consulta realizada). O Evento referencia o
  Agendamento que o originou via `appointment_id` quando aplicável.

---

### Ownership de dados

> **Princípio: "O Tutor é o Dono dos Dados".**

O **Tutor é o dono dos dados do Pet**. Os dados da vida do Pet (Eventos,
Timeline, Carteira Digital, Histórico) pertencem ao Tutor, não aos Parceiros que
os geraram.

Implicações de domínio:

- **Controle de compartilhamento:** o Tutor decide quais Parceiros acessam quais
  dados, e por quanto tempo. Acesso de Parceiro é concedido pelo Tutor, não
  presumido.
- **Permissões:** o vínculo Tutor–Pet carrega o nível de permissão. Tutores
  autorizados recebem permissões definidas pelo tutor responsável.
- **Portabilidade / exportação:** o Tutor pode exportar o Histórico completo do
  Pet (Timeline + Carteira Digital) num formato legível.
- **Exclusão:** o Tutor pode solicitar a exclusão dos dados do Pet, respeitando
  obrigações legais de retenção.
- **Pet ID estável:** mesmo com troca de Tutor ou integração de novos Parceiros,
  o Pet ID permanece, mas o controle de acesso acompanha o Tutor responsável
  vigente.

> **Questão em aberto (decisão de domínio):** quando um Pet tem múltiplos
> tutores autorizados, é necessário definir o conceito de **tutor primário**
> (quem tem a palavra final sobre permissões, exportação e exclusão) versus
> **tutores autorizados** com permissões delegadas. Recomenda-se adotar tutor
> primário; a regra exata de transferência de propriedade deve ser fechada antes
> da implementação.

---

### Eventos de domínio

Eventos de domínio seguem o formato `domain.action`
(ver NAMING_CONVENTIONS). São emitidos quando uma mudança de estado relevante
ocorre, e são a base para notificações, recomendações e a camada de IA.

| Evento                   | Quando é emitido                                          |
| ------------------------ | --------------------------------------------------------- |
| `pet.created`            | Um Pet é cadastrado na plataforma.                        |
| `pet.updated`            | Dados cadastrais de um Pet são alterados.                 |
| `pet.deleted`            | Um Pet (e seus dados) é removido a pedido do Tutor.       |
| `tutor.created`          | Um Tutor é cadastrado.                                    |
| `tutor.linked_to_pet`    | Um Tutor passa a tutelar um Pet (cria-se um vínculo N:N). |
| `appointment.scheduled`  | Um Agendamento é criado.                                  |
| `appointment.confirmed`  | Um Agendamento é confirmado pelo Parceiro.                |
| `appointment.cancelled`  | Um Agendamento é cancelado.                               |
| `appointment.completed`  | Um Agendamento é concluído.                               |
| `vaccination.registered` | Uma vacinação é registrada para um Pet.                   |
| `timeline.event.created` | Um novo registro é adicionado à Timeline do Pet.          |

Notas:

- `timeline.event.created` é, na prática, o evento "guarda-chuva" que sustenta a
  memória do Pet: vacinação, consulta, cirurgia e demais ocorrências resultam em
  um registro na Timeline. Eventos mais específicos (ex.:
  `vaccination.registered`) podem coexistir com ele.
- Os eventos acima são o conjunto inicial; novos eventos seguem o mesmo formato
  `domain.action` à medida que o domínio evolui.

---

### Capacidades fora do núcleo (futuras)

O **comércio** entre tutores e parceiros comerciais — catálogo de itens à venda,
carrinho, pedidos e pagamentos — é uma **capacidade futura** do ecossistema,
descrita no GLOSSARY como uma das capacidades (não o objetivo principal).

Por isso, este modelo de domínio **não** define essa área de comércio como
entidade central. O núcleo permanece Pet / Tutor / Timeline. Quando essa
capacidade for priorizada, ela será modelada como um agregado próprio,
referenciando Tutor, Pet e Parceiro por `id`, sem deslocar o centro do domínio.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define todas as entidades do GLOSSARY relevantes ao domínio, com
  atributos-chave.
- [x] Define os três agregados-raiz (Pet, Tutor, Parceiro) com suas invariantes.
- [x] Expressa todos os relacionamentos com cardinalidade explícita.
- [x] Documenta o ownership de dados e o princípio "O Tutor é o Dono dos Dados".
- [x] Lista os eventos de domínio no formato `domain.action`.
- [x] Mantém o domínio centrado em Pet / Tutor / Timeline e marca o comércio
  como capacidade futura.
- [x] Usa a linguagem ubíqua do GLOSSARY e as convenções do NAMING_CONVENTIONS.
- [ ] Decisões em aberto (modelagem de especializações de Parceiro; tutor
  primário vs. autorizados) fechadas na camada de arquitetura.
