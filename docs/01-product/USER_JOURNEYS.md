---
title: User Journeys
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Jornadas passo a passo dos usuários do PetDots, com foco no Tutor e no MVP
  (Fase 1). Cada jornada lista ator, objetivo, passos, eventos de domínio
  disparados e capacidades envolvidas. Responde "como o usuário percorre o
  produto"; não descreve quem são as personas (PERSONAS) nem o que são as
  funcionalidades (FEATURE_CATALOG). É a fonte de fluxos que o DOMAIN_MODEL delega.
relates_to:
  - 01-product/PERSONAS.md
  - 01-product/CAPABILITIES.md
  - 01-product/FEATURE_CATALOG.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
type: product
---

# PetDots — User Journeys

---

## Objetivo

Descreve as **jornadas** (fluxos passo a passo) dos usuários, com foco no
**Tutor** e no **MVP (Fase 1)**. O [`DOMAIN_MODEL`](./DOMAIN_MODEL.md) delega
explicitamente a este documento os "fluxos de tela e jornadas".

**Não cobre:** quem são os perfis → [`PERSONAS`](./PERSONAS.md); o que são as
funcionalidades → [`FEATURE_CATALOG`](./FEATURE_CATALOG.md); as entidades →
`DOMAIN_MODEL`.

Cada jornada segue o formato: **Ator · Objetivo · Passos · Eventos de domínio ·
Capacidades**.

---

## Jornadas do MVP (Fase 1 — Tutor)

### J1 — Onboarding: criar conta e o primeiro Pet

- **Ator:** Tutor de Pet · **Objetivo:** começar a usar o PetDots com um pet cadastrado.
- **Passos:** cadastra-se (e-mail/senha ou Google) → confirma acesso → cadastra o primeiro Pet (espécie, raça, nascimento, foto) → recebe o **Pet ID** estável e vê a Timeline (vazia) e a Carteira Digital criadas.
- **Eventos:** `tutor.created`, `pet.created`, `tutor.linked_to_pet`.
- **Capacidades:** C2 (Identidade & Acesso), C1 (Gestão de Pets).

### J2 — Registrar um evento na Timeline (ex.: vacina)

- **Ator:** Tutor · **Objetivo:** registrar uma ocorrência da vida do pet.
- **Passos:** abre o Pet → adiciona Evento → escolhe categoria (vacina/consulta/exame/…) → informa data e descrição → o Evento aparece na Timeline.
- **Eventos:** `timeline.event.created` (e `vaccination.registered` quando aplicável).
- **Capacidades:** C3 (Timeline & Histórico).

### J3 — Guardar um documento na Carteira Digital

- **Ator:** Tutor · **Objetivo:** centralizar um documento (carteira de vacinação, receita, exame).
- **Passos:** abre a Carteira Digital do Pet → faz upload (via URL pré-assinada) → classifica o documento (tipo, data) → visualiza/baixa quando precisar.
- **Eventos:** (metadado persistido; pode gerar registro relacionado na Timeline).
- **Capacidades:** C4 (Carteira Digital).

### J4 — Configurar e cumprir um lembrete

- **Ator:** Tutor · **Objetivo:** não esquecer vacina/medicamento/consulta.
- **Passos:** cria um lembrete (o quê, quando, recorrência) → recebe o alerta na data → marca como cumprido → o sistema **registra um Evento** na Timeline.
- **Eventos:** `timeline.event.created` ao cumprir.
- **Capacidades:** C5 (Lembretes & Alertas), C3 (Timeline).

### J5 — Compartilhar acesso de um Pet com um familiar

- **Ator:** Tutor primário · **Objetivo:** dar acesso a um familiar (tutor autorizado).
- **Passos:** abre o Pet → convida outro Tutor → define o papel/permissão → o convidado passa a ver/colaborar conforme a permissão.
- **Eventos:** `tutor.linked_to_pet`.
- **Capacidades:** C2 (Identidade & Acesso — ownership/compartilhamento).

### J6 — Consultar o Histórico completo e exportar

- **Ator:** Tutor · **Objetivo:** ver a vida do pet de ponta a ponta e exportar.
- **Passos:** abre o Pet → navega a Timeline cronológica (filtros por tipo/período) → abre documentos da Carteira → exporta o Histórico (Timeline + Carteira) em formato legível.
- **Eventos:** (leitura; exportação é capacidade de saída do MVP).
- **Capacidades:** C3 (Histórico), C4 (Carteira).

---

## Jornadas de maior risco de UX (insumo do spike-gate)

O [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) condiciona o
cliente universal a um spike. As jornadas que mais estressam a paridade
mobile↔web (especialmente **web desktop**) e devem ser validadas no spike:

- **J6** — Timeline densa e navegação do Histórico (listas longas, filtros, layout desktop).
- **J3** — visualização/upload de documento (viewer, arquivos grandes).
- **J2** — formulários de registro de Evento (ergonomia em desktop e mobile).

---

## Jornadas de fases futuras (visão)

Detalhadas quando as fases forem priorizadas (evolução incremental): agendamento
de serviço (Tutor → Parceiro, Fase 2), operação de clínica no Portal/ERP (Fase 3),
compra no marketplace com registro no perfil do pet (Fase 4), adoção via ONG com
transferência do Pet ID (Fase 6).

---

## Critérios

Este documento é considerado pronto quando:

- [x] Descreve as jornadas do MVP (Tutor) com passos, eventos de domínio e capacidades.
- [x] Conecta-se ao `DOMAIN_MODEL` (eventos `domain.action`) sem redefinir entidades.
- [x] Destaca as jornadas de maior risco de UX como insumo do spike-gate.
- [x] Não duplica `PERSONAS` (quem) nem `FEATURE_CATALOG` (o quê).
- [ ] Jornadas de fases futuras detalhadas quando priorizadas.
