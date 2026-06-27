---
title: PetDots — AI Domain Knowledge
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Domínio destilado para agentes: entidades-chave, regras de negócio e eventos
  do PetDots em forma compacta. Projetado para que um agente gere código
  alinhado ao domínio sem precisar reler toda a documentação fonte.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 00-foundation/GLOSSARY.md
  - 05-ai/AI_CONTEXT.md
type: ai
---

# PetDots — AI Domain Knowledge

> Referências-fonte completas: [`DOMAIN_MODEL.md`](../01-product/DOMAIN_MODEL.md)
> e [`GLOSSARY.md`](../00-foundation/GLOSSARY.md). Este documento destila o
> essencial — não substitua as fontes; consulte-as para detalhes completos.

---

## Núcleo do domínio

O coração do PetDots é a **vida do Pet**. As três entidades nucleares são:

| Entidade   | Código EN  | Tabela       | Papel                                               |
| ---------- | ---------- | ------------ | --------------------------------------------------- |
| Pet        | `Pet`      | `pets`       | Entidade central; toda a plataforma gira em torno dela. |
| Tutor      | `Tutor`    | `tutors`     | Dono dos dados; controla permissões e compartilhamento. |
| Timeline   | `Timeline` | _(projeção)_ | Memória cronológica do Pet — 1:1 com Pet.           |

O **Pet ID** é o `id` (UUID) da entidade Pet. É imutável — não muda com troca de
Tutor nem com integração de novos Parceiros.

---

## Entidades e agregados

Para a lista completa de atributos, cardinalidades e invariantes, consulte
[`DOMAIN_MODEL.md`](../01-product/DOMAIN_MODEL.md). O resumo operacional para
geração de código:

### Agregado `Pet`

Raiz: `Pet`. Contém:
- `Timeline` (1:1) — projeção cronológica dos Eventos.
- `Event` (1:N) — ocorrências da vida do Pet (vacina, consulta, cirurgia, etc.).
- `DigitalWallet` (1:1) — documentos e registros (carteira de vacinação, exames, receitas).

Invariantes críticas:
- Todo Pet tem exatamente uma Timeline e uma DigitalWallet.
- O `pet.id` é imutável.
- Eventos pertencem a um único Pet e não podem ser movidos entre Pets.

### Agregado `Tutor`

Raiz: `Tutor`. Relacionamento Tutor ↔ Pet é **N:N** (tabela de junção
`pet_tutors` com `pet_id`, `tutor_id`, papel/permissão do vínculo).

Invariante crítica: um Pet deve ter ao menos um Tutor responsável a qualquer momento.

### Agregado `Parceiro` (`Partner`)

Raiz: `Partner`. Engloba `Service` (1:N) e `Appointment` (1:N do ponto de
vista do Parceiro). Especializações: `Clinic`, `Veterinarian`, `PetShop`,
`ServiceProvider`, `Ngo`, `Laboratory`.

---

## Regras de negócio essenciais

1. **"O Tutor é o Dono dos Dados"** — acesso de Parceiro aos dados do Pet é
   *concedido pelo Tutor*, nunca presumido.
2. **Portabilidade** — o Tutor pode exportar o Histórico completo (Timeline +
   DigitalWallet) em formato legível.
3. **Marketplace é periférico** — catálogo de produtos, carrinho e pagamentos
   são capacidade futura; não modele como cidadãos de primeira classe.
4. **Evento como consequência de Agendamento** — a conclusão de um `Appointment`
   deve gerar um `Event` na Timeline do Pet.
5. **IA não diagnostica** — o Assistente Inteligente fornece recomendações e
   resumos; decisões clínicas são responsabilidade de veterinários habilitados.
6. **Evolução incremental** — não modele capacidades não priorizadas (ver
   [ADR-0001](../06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md)).

---

## Eventos de domínio

Formato obrigatório: `domain.action` (ver
[`NAMING_CONVENTIONS.md`](../00-foundation/NAMING_CONVENTIONS.md)).

| Evento                   | Quando                                                              |
| ------------------------ | ------------------------------------------------------------------- |
| `pet.created`            | Pet cadastrado na plataforma.                                       |
| `pet.updated`            | Dados cadastrais de Pet alterados.                                  |
| `pet.deleted`            | Pet removido a pedido do Tutor.                                     |
| `tutor.created`          | Tutor cadastrado.                                                   |
| `tutor.linked_to_pet`    | Vínculo N:N Tutor–Pet criado.                                       |
| `appointment.scheduled`  | Agendamento criado.                                                 |
| `appointment.confirmed`  | Agendamento confirmado pelo Parceiro.                               |
| `appointment.cancelled`  | Agendamento cancelado.                                              |
| `appointment.completed`  | Agendamento concluído (gera `timeline.event.created`).             |
| `vaccination.registered` | Vacinação registrada para um Pet.                                   |
| `timeline.event.created` | Novo registro adicionado à Timeline do Pet.                         |

Novos eventos seguem o mesmo formato. Não crie eventos fora desta lista sem
atualizar `DOMAIN_MODEL.md`.

---

## Mapeamento PT ↔ EN (resumo)

Tabela completa em [`GLOSSARY.md`](../00-foundation/GLOSSARY.md) (seção
"Convenções de Terminologia") e `DOMAIN_MODEL.md` (seção "Convenção de nomes").
Nunca use termos fora deste mapeamento oficial.

| Domínio (PT)       | Código (EN)     | Tabela (snake_case)  |
| ------------------ | --------------- | -------------------- |
| Tutor              | Tutor           | `tutors`             |
| Pet                | Pet             | `pets`               |
| Evento             | Event           | `events`             |
| Timeline           | Timeline        | `timelines` (projeção — não materializada) |
| Carteira Digital   | DigitalWallet   | `digital_wallets`    |
| Parceiro           | Partner         | `partners`           |
| Serviço            | Service         | `services`           |
| Agendamento        | Appointment     | `appointments`       |

---

## O que um agente NÃO deve fazer com o domínio

- Inventar regras de negócio não documentadas.
- Criar nomes de entidades, tabelas ou eventos fora do mapeamento acima.
- Modelar Marketplace como entidade central.
- Assumir que o Pet ID pode mudar ou ser reutilizado.
- Gerar diagnósticos ou decisões clínicas.
