---
title: PetDots — Project State
status: stable
version: 3.0
updated: 2026-06-27
scope: >
  Estado atual do projeto PetDots. Registra a fase, o backlog documental fiel
  ao disco, as decisões arquiteturais registradas e o próximo passo concreto.
  Deve ser o primeiro ponto de consulta antes de iniciar qualquer atividade.
relates_to:
  - docs/README.md
  - docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
  - docs/01-product/DOMAIN_MODEL.md
type: foundation
---

# PetDots — Project State

---

# Objetivo

Este documento representa o estado atual do projeto.

Ele deve ser atualizado continuamente durante toda a evolução do PetDots.

Seu objetivo é permitir que qualquer pessoa ou agente de IA saiba exatamente onde o projeto está e qual é o próximo passo.

---

# Situação Atual

**Fase do Projeto**

Fundação greenfield do ecossistema PetDots (ver [ADR-0001](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md)).

---

## Desenvolvimento

A fundação documental do ecossistema foi estabelecida: visão de produto, domínio, AI-first e decisões arquiteturais estão registrados.

A implementação não foi iniciada nesta nova fundação — nenhum código de produto foi escrito ainda.

O código legado (marketplace same-day em NestJS/Prisma) foi descontinuado e arquivado como referência histórica no Git, conforme decisão registrada em ADR-0001. Não representa o produto sendo construído.

A implementação do MVP deverá iniciar após a conclusão da camada de arquitetura técnica (TECHNICAL_VISION, TECHNOLOGY_STACK e demais documentos de `docs/02-architecture/`).

---

# Documentação Existente

> Para o índice canônico completo, consulte [docs/README.md](docs/README.md).

## Fundação (`docs/00-foundation/`)

* PRODUCT_VISION.md (stable)
* PRODUCT_PRINCIPLES.md (stable)
* BUSINESS_MODEL.md (stable)
* GLOSSARY.md (stable)
* NAMING_CONVENTIONS.md (stable)
* PRODUCT_ROADMAP.md (draft — roadmap real por fases)
* SUCCESS_METRICS.md (draft)

## Produto (`docs/01-product/`)

* PERSONAS.md (draft)
* DOMAIN_MODEL.md (draft — keystone do domínio)
* MVP_SCOPE.md (draft)

## AI (`docs/05-ai/`)

* AI_CONTEXT.md (draft)
* AI_DOMAIN_KNOWLEDGE.md (draft)
* AI_ARCHITECTURE_RULES.md (draft)
* AI_CODING_RULES.md (draft)
* AI_DEVELOPMENT_GUIDE.md (draft)

## Decisões (`docs/06-decisions/`)

* ADR-0001: Re-fundação — PetDots como ecossistema AI-first (stable, Accepted)
* DECISION_LOG.md (stable)

## Documentação de Referência

* docs/README.md — Índice mestre e única fonte-da-verdade canônica (stable)
* PROJECT_CONTEXT.md (stable)
* PROJECT_STATE.md (este documento, stable)

---

# Documentação Planejada (ainda sem conteúdo)

## Fundação

* [ ] PROJECT_MANIFESTO.md (planned)

## Produto

* [ ] CAPABILITIES.md (planned)
* [ ] FEATURE_CATALOG.md (planned)
* [ ] USER_JOURNEYS.md (planned)

## Arquitetura (`docs/02-architecture/`)

* [ ] TECHNICAL_VISION.md (planned) ← **próximo documento**
* [ ] ARCHITECTURAL_PRINCIPLES.md (planned)
* [ ] SYSTEM_ARCHITECTURE.md (planned)
* [ ] QUALITY_ATTRIBUTES.md (planned)
* [ ] TECHNOLOGY_STACK.md (planned)

## Engenharia (`docs/03-engineering/`)

* [ ] DEVELOPMENT_GUIDE.md (planned)
* [ ] CODING_STANDARDS.md (planned)
* [ ] GIT_WORKFLOW.md (planned)
* [ ] TESTING_STRATEGY.md (planned)
* [ ] SECURITY.md (planned)
* [ ] OBSERVABILITY.md (planned)
* [ ] DEPLOYMENT.md (planned)

## API (`docs/04-api/`)

* [ ] API_GUIDELINES.md (planned)
* [ ] AUTHENTICATION.md (planned)
* [ ] ERROR_MODEL.md (planned)
* [ ] VERSIONING.md (planned)

---

# Próxima Atividade

Iniciar a camada de **arquitetura técnica**, seguindo a ordem natural Produto → Domínio → Arquitetura.

Com DOMAIN_MODEL e MVP_SCOPE estabelecidos, o próximo passo é preencher `docs/02-architecture/TECHNICAL_VISION.md` e `docs/02-architecture/TECHNOLOGY_STACK.md` — decisões sem as quais nenhuma implementação pode começar com segurança.

Objetivos da camada de arquitetura:

* definir visão técnica e princípios arquiteturais;
* escolher stack tecnológica alinhada ao contexto AI-first;
* descrever system architecture de alto nível;
* definir atributos de qualidade e trade-offs.

---

# Decisões Arquiteturais

* **ADR-0001** — Re-fundação do PetDots como ecossistema AI-first, descontinuação do marketplace legado. Ver [docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).

---

# Stack Tecnológica

A definir em `docs/02-architecture/TECHNOLOGY_STACK.md` (planned).

Nenhuma decisão de stack foi tomada nesta fundação.

---

# Próximo Marco

Conclusão da camada de arquitetura técnica: TECHNICAL_VISION → ARCHITECTURAL_PRINCIPLES → TECHNOLOGY_STACK → SYSTEM_ARCHITECTURE → QUALITY_ATTRIBUTES.

Esse marco representa o encerramento da fase de definição e o início da implementação do MVP, a partir do escopo estabelecido em MVP_SCOPE.

---

# Observações

Este documento deve ser atualizado sempre que:

* um documento for concluído;
* uma decisão importante for tomada;
* uma fase do roadmap for iniciada ou concluída;
* houver mudança significativa na direção do projeto.
