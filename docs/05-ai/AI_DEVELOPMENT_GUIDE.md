---
title: PetDots — AI Development Guide
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Forma de trabalho leve do agente no PetDots: como ler contexto, propor
  soluções, validar princípios, implementar e atualizar docs. Deixa explícito
  que este projeto usa Docs-SSOT leve (ADR-0001), não um pipeline SDD pesado.
relates_to:
  - AGENTS.md
  - docs/05-ai/AI_CONTEXT.md
  - docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
  - docs/README.md
type: ai
---

# PetDots — AI Development Guide

> Este guia define a **forma de trabalho** do agente no PetDots.
> Para o domínio, consulte [`AI_DOMAIN_KNOWLEDGE.md`](./AI_DOMAIN_KNOWLEDGE.md);
> para regras arquiteturais, [`AI_ARCHITECTURE_RULES.md`](./AI_ARCHITECTURE_RULES.md);
> para regras de código, [`AI_CODING_RULES.md`](./AI_CODING_RULES.md).

---

## Modelo de documentação: Docs-SSOT leve

> **Decisão registrada em
> [ADR-0001](../06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md),
> seção "Decisão", item 3.**

O PetDots adota **Docs-SSOT leve** — a documentação é a fonte-da-verdade, mas
**não há pipeline SDD formal** (sem PRD obrigatório, sem Tech Spec pesada antes
de todo código, sem burocracia de aprovações).

O que isso significa na prática:
- ADRs, `PROJECT_STATE`, `GLOSSARY` e `DOMAIN_MODEL` são os artefatos canônicos.
- Decisões que impactam domínio ou arquitetura viram ADR — as demais não.
- Documentação evolui junto com o código, não antes dele por obrigação formal.
- O agente **não** deve criar artefatos formais que não foram pedidos.

---

## Fluxo de trabalho do agente

### Passo 1 — Ler o contexto antes de agir

Sempre iniciar por:

1. [`AGENTS.md`](../../AGENTS.md) — instruções permanentes e filosofia do projeto.
2. [`docs/05-ai/AI_CONTEXT.md`](./AI_CONTEXT.md) — contexto resumido e estado atual.
3. Documentos específicos da tarefa (ver hierarquia em [`docs/README.md`](../README.md)).

Nunca assuma informações que não estejam nos documentos oficiais. Em caso de
dúvida sobre regras de negócio, **pergunte** — não invente.

### Passo 2 — Entender o domínio antes de propor design

Antes de qualquer proposta técnica:

1. Identificar quais entidades do domínio (Pet, Tutor, Partner, etc.) são afetadas.
2. Verificar se a funcionalidade já existe no `DOMAIN_MODEL.md`.
3. Consultar o `GLOSSARY.md` para os termos corretos.
4. Verificar se há decisões em aberto relevantes no `DOMAIN_MODEL.md`.

### Passo 3 — Propor antes de implementar

Para qualquer mudança com impacto arquitetural:

1. **Descrever** o que será feito e por quê.
2. **Listar alternativas** com trade-offs quando houver múltiplas opções.
3. **Identificar** se uma ADR é necessária (ver critérios em
   [`AI_ARCHITECTURE_RULES.md`](./AI_ARCHITECTURE_RULES.md)).
4. **Aguardar validação** antes de implementar mudanças estruturais.

Para mudanças locais e pequenas (bugfix, ajuste de endpoint, nova coluna óbvia),
proposta e implementação podem ser simultâneas.

### Passo 4 — Validar contra os princípios

Antes de finalizar qualquer implementação, validar contra
[`PRODUCT_PRINCIPLES.md`](../00-foundation/PRODUCT_PRINCIPLES.md):

- A solução prioriza o bem-estar do Pet? (Princípio 1: Pet First)
- Simplifica a vida do Tutor? (Princípio 2: Tutor First)
- Respeita a ownership de dados do Tutor? (Princípio 3)
- Mantém simplicidade acima de funcionalidades? (Princípio 6)
- Evita introduzir tecnologias sem necessidade? (Anti-Princípio)

### Passo 5 — Implementar com as convenções

Aplicar automaticamente as regras de:
- [`AI_CODING_RULES.md`](./AI_CODING_RULES.md) — idioma, nomenclatura, qualidade.
- [`AI_ARCHITECTURE_RULES.md`](./AI_ARCHITECTURE_RULES.md) — padrões e restrições.
- [`AI_DOMAIN_KNOWLEDGE.md`](./AI_DOMAIN_KNOWLEDGE.md) — entidades, eventos, mapeamento PT↔EN.

### Passo 6 — Atualizar a documentação

Após cada implementação significativa:

| O que mudou                                       | O que atualizar                              |
| ------------------------------------------------- | -------------------------------------------- |
| Nova entidade ou atributo de domínio              | `DOMAIN_MODEL.md` + `GLOSSARY.md`           |
| Novo evento de domínio                            | `DOMAIN_MODEL.md` + `AI_DOMAIN_KNOWLEDGE.md`|
| Decisão arquitetural relevante                    | Novo ADR em `docs/06-decisions/ADR/`        |
| Novo conceito de produto                          | `GLOSSARY.md`                               |
| Mudança de convenção de nomenclatura              | `NAMING_CONVENTIONS.md` + ADR              |
| Estado do projeto (marco, stack definida, etc.)   | `PROJECT_STATE.md`                          |

---

## O que este guia NÃO é

- Não é um pipeline SDD pesado com etapas obrigatórias para cada linha de código.
- Não é uma lista de aprovações formais antes de agir.
- Não exige PRD, Tech Spec ou Design Doc para toda e qualquer mudança.
- Não substitui o bom senso: tarefas simples não precisam de cerimônia.

A burocracia não é o objetivo — **a coerência do produto é o objetivo**.

---

## Referência rápida: onde encontrar o quê

| Preciso de...                         | Consultar                                          |
| ------------------------------------- | -------------------------------------------------- |
| Contexto inicial do projeto           | `docs/05-ai/AI_CONTEXT.md`                        |
| Instruções permanentes ao agente      | `AGENTS.md`                                        |
| Entidades e regras do domínio         | `docs/01-product/DOMAIN_MODEL.md`                 |
| Termos e linguagem ubíqua             | `docs/00-foundation/GLOSSARY.md`                  |
| Convenções de nomenclatura            | `docs/00-foundation/NAMING_CONVENTIONS.md`        |
| Princípios do produto                 | `docs/00-foundation/PRODUCT_PRINCIPLES.md`        |
| Decisões arquiteturais (ADRs)         | `docs/06-decisions/ADR/`                          |
| Hierarquia canônica de documentação   | `docs/README.md`                                  |
| Domínio destilado para código         | `docs/05-ai/AI_DOMAIN_KNOWLEDGE.md`               |
| Guardrails arquiteturais              | `docs/05-ai/AI_ARCHITECTURE_RULES.md`             |
| Regras de código                      | `docs/05-ai/AI_CODING_RULES.md`                   |
