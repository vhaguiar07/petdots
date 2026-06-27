---
title: PetDots — Project State
status: stable
version: 2.0
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

O projeto encontra-se em fase de fundação documental.

A implementação não foi iniciada nesta nova fundação.

O código legado (marketplace same-day em NestJS/Prisma) foi descontinuado e arquivado como referência histórica no Git, conforme decisão registrada em ADR-0001. Não representa o produto sendo construído.

Nenhuma implementação deverá iniciar antes da conclusão do DOMAIN_MODEL.md e dos documentos de MVP_SCOPE e arquitetura técnica.

---

# Documentação Concluída

## Fundação (`docs/00-foundation/`)

* ✅ PRODUCT_VISION.md (stable)
* ✅ PRODUCT_PRINCIPLES.md (stable)
* ✅ BUSINESS_MODEL.md (stable)
* ✅ GLOSSARY.md (stable)
* ✅ NAMING_CONVENTIONS.md (stable)
* ✅ PRODUCT_ROADMAP.md (draft)

## Produto (`docs/01-product/`)

* ✅ PERSONAS.md (draft)

## Decisões (`docs/06-decisions/ADR/`)

* ✅ ADR-0001: Re-fundação — PetDots como ecossistema AI-first (stable)

## Documentação de Referência

* ✅ docs/README.md — Índice mestre e única fonte-da-verdade canônica (stable)
* ✅ PROJECT_CONTEXT.md (stable)
* ✅ PROJECT_STATE.md (este documento, stable)

---

# Documentação em Andamento

Nenhuma em andamento no momento.

---

# Documentação Planejada (ainda sem conteúdo)

## Fundação

* [ ] PROJECT_MANIFESTO.md (planned)
* [ ] SUCCESS_METRICS.md (planned)

## Produto

* [ ] DOMAIN_MODEL.md (planned) ← **próximo documento**
* [ ] CAPABILITIES.md (planned)
* [ ] FEATURE_CATALOG.md (planned)
* [ ] MVP_SCOPE.md (planned)
* [ ] USER_JOURNEYS.md (planned)

## Arquitetura (`docs/02-architecture/`)

* [ ] TECHNICAL_VISION.md (planned)
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

## AI (`docs/05-ai/`)

* [ ] AI_CONTEXT.md (draft)
* [ ] AI_DEVELOPMENT_GUIDE.md (planned)
* [ ] AI_ARCHITECTURE_RULES.md (planned)
* [ ] AI_CODING_RULES.md (planned)
* [ ] AI_DOMAIN_KNOWLEDGE.md (planned)

---

# Próximo Documento

**DOMAIN_MODEL.md**

Este documento tem prioridade máxima na fase atual. Define entidades, agregados, relacionamentos, ownership, regras de negócio e eventos do domínio.

Após o DOMAIN_MODEL, a sequência recomendada é: roadmap detalhado → SUCCESS_METRICS → MVP_SCOPE → arquitetura técnica → implementação.

---

# Próxima Atividade

Realizar workshop de modelagem do domínio para preencher `docs/01-product/DOMAIN_MODEL.md`.

Objetivos:

* identificar entidades;
* identificar agregados;
* identificar relacionamentos;
* definir ownership;
* definir regras de negócio;
* definir eventos do domínio.

---

# Decisões Arquiteturais

* **ADR-0001** — Re-fundação do PetDots como ecossistema AI-first, descontinuação do marketplace legado. Ver [docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).

---

# Stack Tecnológica

A definir em `docs/02-architecture/TECHNOLOGY_STACK.md` (planned).

Nenhuma decisão de stack foi tomada nesta fundação.

---

# Próximo Marco

Conclusão da fundação documental: DOMAIN_MODEL → roadmap detalhado → SUCCESS_METRICS → MVP_SCOPE.

Esse marco representa o encerramento da fase de definição funcional e o início da arquitetura técnica do sistema, a partir da qual a implementação do MVP poderá ser planejada.

---

# Observações

Este documento deve ser atualizado sempre que:

* um documento for concluído;
* uma decisão importante for tomada;
* uma fase do roadmap for iniciada ou concluída;
* houver mudança significativa na direção do projeto.
