---
title: System Architecture
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Visão de componentes do PetDots e suas interações: a topologia do Modular
  Monolith (módulos por agregado), o(s) cliente(s), a camada de contrato, dados,
  storage, jobs e observabilidade, e os fluxos principais do MVP. Descreve a
  forma do sistema; não decide a stack (ADR-0002/TECHNOLOGY_STACK), os princípios
  (ARCHITECTURAL_PRINCIPLES) nem as metas (QUALITY_ATTRIBUTES).
relates_to:
  - 02-architecture/TECHNICAL_VISION.md
  - 02-architecture/ARCHITECTURAL_PRINCIPLES.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
type: architecture
---

# PetDots — System Architecture

---

## Objetivo

Descreve **os componentes do PetDots e como interagem** — a forma do sistema no
MVP (Fase 1) e a topologia que sustenta a evolução. Não decide tecnologias (ver
[ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e
[`TECHNOLOGY_STACK`](./TECHNOLOGY_STACK.md)), princípios
([`ARCHITECTURAL_PRINCIPLES`](./ARCHITECTURAL_PRINCIPLES.md)) nem metas
([`QUALITY_ATTRIBUTES`](./QUALITY_ATTRIBUTES.md)).

---

## Visão de alto nível

```
   ┌─────────────────────────────┐
   │  Cliente universal (Expo +   │   iOS · Android · Web
   │  React Native [+ RN Web])    │   (sujeito ao spike-gate)
   └──────────────┬──────────────┘
                  │  HTTPS · contrato REST/OpenAPI (tipos derivados)
                  ▼
   ┌─────────────────────────────────────────────────────────┐
   │             API — NestJS (Modular Monolith)              │
   │  transversais: AuthGuard · OwnershipGuard · Audit ·      │
   │                Validação (Zod) · OpenTelemetry           │
   │  módulos:  auth │ tutors │ pets │ notifications │        │
   │            partners (stub, Fase 2)                       │
   └───────┬───────────────────┬──────────────────┬──────────┘
           │ Prisma            │ presigned URLs    │ OTLP
           ▼                   ▼                   ▼
     ┌───────────┐      ┌─────────────┐     ┌───────────────┐
     │ PostgreSQL│      │ S3 (compat) │     │ Observab.     │
     │  (único)  │      │  documentos │     │ (gerenciado)  │
     └───────────┘      └─────────────┘     └───────────────┘
```

O cliente nunca acessa banco ou storage diretamente: tudo passa pelo contrato da
API. O upload/download de documentos usa **presigned URLs** — o byte do arquivo
não trafega pela API.

---

## Estrutura de módulos (MVP)

Um módulo por agregado-raiz do `DOMAIN_MODEL`, mais suporte. Cada módulo é dono
exclusivo das suas tabelas (princípio P2).

| Módulo | Responsabilidade | Entidades (DOMAIN_MODEL) |
|--------|------------------|--------------------------|
| **auth** | Cadastro, login, tokens (JWT/refresh), Google OAuth, recuperação | Identidade do Tutor (credenciais) |
| **tutors** | Tutor, vínculos N:N com Pet (`pet_tutors`, papel/permissão), compartilhamento | `Tutor`, vínculo `Tutor↔Pet` |
| **pets** | Pet (Pet ID imutável), Timeline, Eventos, Carteira Digital, Histórico | `Pet`, `Timeline`, `Event`, `DigitalWallet` |
| **notifications** | Lembretes/alertas; lembrete cumprido **emite Evento** | (orquestra `Event`) |
| **partners** *(stub)* | Reservado para Parceiros/Serviços/Agendamento (Fase 2) | `Partner` e especializações |

> Disciplina de fronteira: a **Timeline é projeção** dos Eventos do Pet (não um
> módulo próprio); `Event`, `DigitalWallet` e `Timeline` pertencem ao agregado
> `Pet`, logo vivem no módulo **pets**.

### Camadas internas de um módulo

`controller` (HTTP + contrato Zod/OpenAPI) → `application` (casos de uso) →
`domain` (entidades + invariantes, sem dependência de framework) → `infra`
(repositório Prisma). Clean Architecture é aplicada **onde paga** (P-Clean
"opcional"): a regra firme é a do princípio P1 — dependências apontam para o
domínio.

---

## Integração entre módulos

- **Por caso de uso ou evento de domínio** (`domain.action`), nunca por banco
  compartilhado (P2).
- Eventos no MVP: `pet.created`, `timeline.event.created`,
  `vaccination.registered`, `tutor.linked_to_pet`, etc. (ver `DOMAIN_MODEL`).
- Exemplo: **lembrete cumprido** (notifications) → emite `timeline.event.created`
  → o módulo **pets** registra o Evento na Timeline. Na Fase 2,
  `appointment.completed` seguirá o mesmo padrão.
- No monolito, os eventos são in-process (event bus do Nest); mensageria externa
  só com ADR.

---

## Fluxos principais (MVP)

1. **Cadastro + auth:** cliente → `auth` cria Tutor e emite tokens.
2. **Cadastro de Pet:** `pets` cria o Pet com **Pet ID (UUID) imutável**; cria a
   Timeline (1:1) e a Carteira Digital (1:1); vincula o Tutor primário em
   `tutors` (`pet_tutors`).
3. **Registro de Evento:** `pets` adiciona um Evento → projeta na Timeline
   (`timeline.event.created`).
4. **Upload de documento:** `pets` gera **presigned URL**; o cliente envia o
   arquivo direto ao S3; o metadado entra na Carteira Digital.
5. **Lembrete → Evento:** scheduler in-process dispara o lembrete (advisory lock,
   idempotente); ao ser cumprido, emite Evento na Timeline.
6. **Exportação do Histórico:** `pets` empacota Timeline + documentos da Carteira
   num formato legível (portabilidade / critério de saída do MVP).

Todo acesso a dado de um Pet passa pelo **OwnershipGuard** (vínculo `pet_tutors`)
e é registrado pelo **Audit interceptor**.

---

## Dados e armazenamento

- **PostgreSQL** (único): tabelas derivadas do `DOMAIN_MODEL` — `tutors`, `pets`,
  `pet_tutors`, `events`, `digital_wallets`, `documents`, `reminders`,
  `audit_log` (nomenclatura em `NAMING_CONVENTIONS`: `snake_case` plural, PK
  `id` UUID, FK `entidade_id`, `created_at`/`updated_at`).
- **S3**: binários dos documentos; o banco guarda só o metadado + a chave do
  objeto. Exclusão LGPD coordena banco + objeto, respeitando retenção
  (soft-delete/tombstone).

---

## Transversais e evolução

- **Transversais:** AuthGuard, OwnershipGuard, Audit interceptor, validação Zod,
  OpenTelemetry — aplicados na borda da API.
- **Evolução:** a topologia acomoda as fases seguintes adicionando módulos-satélite
  (partners/services/appointments → comércio → IA) que referenciam o núcleo por
  `id` e integram por evento — sem reescrita. Ver [`TECHNICAL_VISION`](./TECHNICAL_VISION.md).

---

## Critérios

Este documento é considerado pronto quando:

- [x] Apresenta a topologia de alto nível (cliente, API, dados, storage, observabilidade).
- [x] Lista os módulos do MVP com responsabilidade e entidades, um por agregado.
- [x] Descreve a integração por contrato/evento (não por banco compartilhado).
- [x] Cobre os fluxos principais do MVP e os pontos transversais.
- [x] Não decide stack (ADR-0002/`TECHNOLOGY_STACK`) nem repete princípios/metas.
- [ ] Revisado quando a camada `03-engineering` (DEVELOPMENT_GUIDE) for escrita.
