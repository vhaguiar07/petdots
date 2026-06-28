---
title: Product Capabilities
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Mapa das capacidades funcionais do PetDots — as grandes áreas funcionais do
  produto (no sentido de "Capacidade" do GLOSSARY), com a persona que servem, a
  fase do roadmap e as entidades de domínio envolvidas. Responde "quais áreas o
  produto cobre"; não detalha funcionalidades (FEATURE_CATALOG), fases
  (PRODUCT_ROADMAP) nem entidades (DOMAIN_MODEL).
relates_to:
  - 01-product/FEATURE_CATALOG.md
  - 01-product/DOMAIN_MODEL.md
  - 00-foundation/PRODUCT_ROADMAP.md
  - 00-foundation/GLOSSARY.md
type: product
---

# PetDots — Product Capabilities

---

## Objetivo

Mapeia as **capacidades** do PetDots — as grandes áreas funcionais da plataforma.
Segue a taxonomia do [GLOSSARY](../00-foundation/GLOSSARY.md): uma **Capacidade**
agrupa funcionalidades relacionadas; uma **Funcionalidade** é um comportamento
específico dentro de uma capacidade.

**Não cobre:** as funcionalidades concretas → [`FEATURE_CATALOG`](./FEATURE_CATALOG.md);
o faseamento e a narrativa → [`PRODUCT_ROADMAP`](../00-foundation/PRODUCT_ROADMAP.md);
as entidades → [`DOMAIN_MODEL`](./DOMAIN_MODEL.md); as jornadas →
[`USER_JOURNEYS`](./USER_JOURNEYS.md).

---

## Mapa de capacidades

| # | Capacidade | O que é | Persona | Fase | Entidades |
|---|-----------|---------|---------|------|-----------|
| C1 | **Gestão de Pets** | Cadastrar e gerir pets; Pet ID estável | Tutor (P1) | 1 | `Pet`, `PetId` |
| C2 | **Identidade & Acesso** | Cadastro/login do Tutor, múltiplos tutores, compartilhamento, ownership | Tutor (P1) | 1 | `Tutor`, vínculo `pet_tutors` |
| C3 | **Timeline & Histórico** | Registro cronológico de Eventos e visão consolidada da vida do pet | Tutor (P1) | 1 | `Timeline`, `Event`, `Histórico` |
| C4 | **Carteira Digital** | Armazenar documentos (vacinação, receitas, exames) | Tutor (P1) | 1 | `DigitalWallet` |
| C5 | **Lembretes & Alertas** | Agenda inteligente; lembrete cumprido gera Evento | Tutor (P1) | 1 | `Event` |
| C6 | **Descoberta & Parceiros** | Perfis de parceiros e busca de profissionais/serviços | Vet/Clínica/Prestador (P2) | 2 | `Partner`, `Service` |
| C7 | **Agendamento** | Reserva de serviços (Tutor → Parceiro) | P1/P2 | 2 | `Appointment` |
| C8 | **Avaliações & Reputação** | Avaliação de parceiros após atendimento | P1/P2 | 2 | (sobre `Partner`) |
| C9 | **Portal Empresarial & ERP** | Gestão operacional para clínicas (agenda, prontuário, financeiro) | Clínica (P2) | 3 | `Partner` (Clínica) |
| C10 | **Integrações & API de Parceiros** | Integração com sistemas externos de parceiros | Parceiros (P2) | 3 | — |
| C11 | **Marketplace & Comércio** | Catálogo de produtos, compra e entrega | Pet Shop (P3) | 4 | (capacidade-satélite) |
| C12 | **Fidelidade & Campanhas** | Programa de fidelidade e campanhas patrocinadas | Pet Shop (P3) | 4 | — |
| C13 | **Inteligência (IA)** | Recomendações, alertas preditivos, assistente, busca semântica | Todas (P1–P3) | transversal; dedicada na 5 | (sobre o histórico) |
| C14 | **Impacto Social & Expansões** | ONGs (adoção/campanhas), laboratórios, seguradoras | ONG (P4) e expansões | 6 | `Ngo`, `Laboratory` |

---

## Notas

- **Capacidades do MVP (Fase 1):** C1–C5. As demais entram conforme o roadmap,
  como **módulos-satélite** que referenciam o núcleo Pet/Tutor/Timeline por `id`.
- **Marketplace (C11) é capacidade-satélite, não núcleo** — coerente com a visão
  e com o `DOMAIN_MODEL` ("comércio é capacidade futura").
- **Inteligência (C13) é transversal:** permeia as capacidades desde o MVP de
  forma discreta (ex.: sugestão de categoria de Evento) e se torna uma frente
  dedicada na Fase 5.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Lista as capacidades com persona, fase e entidades, na taxonomia do GLOSSARY.
- [x] Distingue capacidade (área) de funcionalidade (comportamento) sem invadir o `FEATURE_CATALOG`.
- [x] Marca as capacidades do MVP e mantém o marketplace como satélite.
- [ ] Revisado a cada nova capacidade priorizada no roadmap.
