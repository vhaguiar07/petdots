---
title: Technical Vision
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Visão técnica de longo prazo do ecossistema PetDots: a estrela-guia que orienta
  a evolução arquitetural por fases, os pilares técnicos duráveis e como a
  arquitetura acomoda o roadmap sem reescrever o núcleo Pet/Tutor/Timeline.
  Responde "para onde a arquitetura evolui e por quê"; não cobre inventário de
  stack, componentes, princípios detalhados nem métricas (ver docs irmãos).
relates_to:
  - 02-architecture/ARCHITECTURAL_PRINCIPLES.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 00-foundation/PRODUCT_ROADMAP.md
  - 01-product/DOMAIN_MODEL.md
type: architecture
---

# PetDots — Technical Vision

---

## Objetivo

Este documento articula a **visão técnica de longo prazo** do PetDots: para onde
a arquitetura evolui e **por quê**. Serve de norte estável para que cada decisão
técnica — hoje e ao longo dos anos — fortaleça a visão de produto "toda a vida
do pet em um único lugar".

**Este documento não cobre** (e aponta para o irmão correspondente, evitando
sobreposição):

- O **inventário de tecnologias** e a justificativa de cada escolha → [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e `TECHNOLOGY_STACK.md`.
- Os **princípios arquiteturais** acionáveis → `ARCHITECTURAL_PRINCIPLES.md`.
- Os **componentes e suas interações** → `SYSTEM_ARCHITECTURE.md`.
- Os **atributos de qualidade** e metas mensuráveis → `QUALITY_ATTRIBUTES.md`.

---

## A estrela-guia técnica

O PetDots é um **Modular Monolith API-first**, centrado no núcleo estável
**Pet / Tutor / Timeline**, que **evolui por fases** para o ecossistema completo
(saúde, serviços, B2B, comércio, IA, impacto social) **sem reescrever o núcleo**.
É construído para ser **legível por humanos e por agentes de IA** e para
**transformar dados em inteligência** de forma discreta e sempre com
*human-in-the-loop* — a plataforma apoia decisões, nunca substitui o profissional
veterinário.

---

## Pilares técnicos

Estes pilares são a tradução técnica dos `PRODUCT_PRINCIPLES`; orientam a
evolução, não a substituem a lista acionável de `ARCHITECTURAL_PRINCIPLES`.

### 1. Domínio no centro

O núcleo Pet/Tutor/Timeline é o coração imutável do sistema. Toda capacidade
futura entra como **módulo-satélite** que referencia o núcleo por `id`, sem
deslocá-lo. O comércio (marketplace) é satélite, não núcleo — coerente com o
princípio "Marketplace é uma consequência".

### 2. Modular Monolith primeiro

Começamos como um único artefato deployável, com fronteiras de domínio claras
entre módulos. A **extração de um serviço** só acontece sob uma força real
(escala, ciclo de vida ou time independentes) e **mediante ADR** — nunca
microserviço antecipado.

### 3. API-first como superfície de produto

Toda capacidade nasce como serviço reutilizável com um **contrato canônico
REST/OpenAPI**. Esse contrato é a superfície que serve todos os canais (Mobile,
Web, Portal Empresas) e as integrações futuras de parceiros — escrito uma vez,
consumido por muitos.

### 4. AI-first em duas dimensões

- **Build-time:** código e documentação legíveis e previsíveis para os agentes
  que constroem o produto (docs como fonte-da-verdade; convenções explícitas).
- **Run-time:** os dados do pet geram inteligência (recomendações, alertas,
  organização). Discreta e transversal no MVP; uma frente dedicada a partir da
  Fase 5, sobre uma base de dados consolidada. Sempre *human-in-the-loop*.

### 5. Soberania dos dados do Tutor

Ownership, LGPD (exportação, exclusão com retenção legal, permissões) e auditoria
são **invariantes de primeira classe**, não detalhes de infraestrutura. A
soberania dos dados orienta decisões estruturais (ex.: identidade própria, não
terceirizada).

### 6. Simplicidade com complexidade adiada

"A solução mais simples capaz de resolver o problema atual." Cada salto de
complexidade (fila, cache, réplicas de leitura, extração de serviço,
multi-região) é **deliberadamente adiado** até o sinal aparecer, e cada um passa
por um ADR. A sustentabilidade da arquitetura vale mais que a sofisticação.

---

## Evolução esperada (arquitetura × roadmap)

A cada fase do [PRODUCT_ROADMAP](../00-foundation/PRODUCT_ROADMAP.md) a
arquitetura ganha capacidades **sem deslocar o núcleo**. O contrato de API e os
eventos de domínio (`domain.action`) são a espinha de integração entre módulos.

| Fase | Capacidade que entra | O que exige da arquitetura (núcleo intacto) |
|------|----------------------|----------------------------------------------|
| **1 — Vida do Pet (MVP)** | Pet, Timeline, Carteira Digital, lembretes, auth | Nasce o Modular Monolith do [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md): núcleo Pet/Tutor/Timeline, cliente universal (com spike-gate), auth próprio. |
| **2 — Saúde e Serviços** | Parceiros, Serviços, Agendamento, busca | Novos módulos (partners/services/appointments) referenciam Pet/Tutor por `id`; Agendamento concluído **emite Evento** na Timeline. |
| **3 — ERP B2B** | Portal Empresarial, ERP, API de parceiros | O contrato OpenAPI canônico (existente desde a Fase 1) vira a **API pública** de parceiros; o Portal pode virar front separado; 1º candidato real à extração de serviço — **se** a carga justificar (ADR). |
| **4 — Marketplace** | Catálogo, pedidos, pagamentos | Módulo de comércio **satélite** referenciando Tutor/Pet/Parceiro; compra → histórico via evento; pagamentos podem exigir nova infra (ADR). |
| **5 — IA transversal** | Recomendações, alertas preditivos, busca semântica, sumário de saúde | Camada de IA consome eventos + histórico; `pgvector`/FTS no Postgres é a porta de entrada; só então uma frente dedicada (worker/serviço de IA, ADR). *Human-in-the-loop*. |
| **6 — Impacto social / expansões** | ONGs, laboratórios, seguradoras | Novos perfis de Parceiro + integrações externas via o contrato de API; adoção liga o **Pet ID** a um novo Tutor (transferência de ownership, invariante já prevista no domínio). |

---

## O que esta visão não decide (e o que fica adiado)

Decisões deliberadamente **adiadas**, cada uma com seu gatilho:

- **Extração de serviços** — gatilho: carga ou ciclo de vida independentes que o monolito não acomode bem.
- **Multi-região / alta disponibilidade** — gatilho: requisito explícito de disponibilidade/latência.
- **IA dedicada** (frente própria) — gatilho: base de dados consolidada (Fase 5).
- **Broker, fila, cache, novo datastore** — gatilho: necessidade comprovada (sempre via ADR, conforme ADR-0002).

Decisões **já tomadas ou detalhadas em outro lugar**: stack → [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md); princípios acionáveis → `ARCHITECTURAL_PRINCIPLES.md`; componentes → `SYSTEM_ARCHITECTURE.md`; metas de qualidade → `QUALITY_ATTRIBUTES.md`.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Articula a estrela-guia técnica alinhada à `PRODUCT_VISION`.
- [x] Define os pilares técnicos sem repetir `ARCHITECTURAL_PRINCIPLES`.
- [x] Mapeia a evolução arquitetura × roadmap mantendo o núcleo Pet/Tutor/Timeline estável.
- [x] Explicita as decisões adiadas e seus gatilhos.
- [x] Não sobrepõe stack (ADR-0002), componentes (`SYSTEM_ARCHITECTURE`) nem métricas (`QUALITY_ATTRIBUTES`).
- [ ] Revisado contra `ARCHITECTURAL_PRINCIPLES` e `SYSTEM_ARCHITECTURE` quando esses forem escritos.
