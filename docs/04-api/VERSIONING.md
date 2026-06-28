---
title: API Versioning
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Como a API do PetDots é versionada: versão no caminho (/api/v1), o que conta
  como breaking change, a política de deprecação/sunset e o versionamento do
  OpenAPI canônico. Define "como o contrato evolui sem quebrar quem consome".
  Distingue-se do SemVer do produto (GIT_WORKFLOW) e das convenções gerais
  (API_GUIDELINES); o formato de erro vive em ERROR_MODEL.
relates_to:
  - 04-api/API_GUIDELINES.md
  - 04-api/ERROR_MODEL.md
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 03-engineering/GIT_WORKFLOW.md
type: api
---

# PetDots — API Versioning

> A **versão da API** (`/api/v1`) e o **SemVer do produto** ([`GIT_WORKFLOW`](../03-engineering/GIT_WORKFLOW.md))
> são coisas distintas: o produto pode lançar muitos `MINOR`/`PATCH` sob a **mesma**
> versão de API. As convenções gerais de REST estão em [`API_GUIDELINES`](./API_GUIDELINES.md).

---

## Objetivo

Definir **como o contrato da API evolui sem quebrar quem o consome** — a aplicação
hoje, e Portal Empresas e parceiros amanhã (API-first; o contrato OpenAPI é a
superfície pública — `TECHNICAL_VISION`).

**Não cobre:** as convenções de design REST → [`API_GUIDELINES`](./API_GUIDELINES.md);
o formato de erro → [`ERROR_MODEL`](./ERROR_MODEL.md); o versionamento do **produto**
(SemVer/tags) → [`GIT_WORKFLOW`](../03-engineering/GIT_WORKFLOW.md).

---

## Esquema de versão

- **Versão no caminho:** `/api/v1` (de `NAMING_CONVENTIONS` e ADR-0002). É a
  versão **maior** do contrato; só incrementa (`/api/v2`) sob uma mudança
  incompatível inevitável.
- Uma nova versão maior **coexiste** com a anterior durante a janela de deprecação
  — não se quebra `v1` ao lançar `v2`.
- O **OpenAPI publicado** é versionado junto ao contrato e é a referência canônica
  do que cada versão expõe (`API_GUIDELINES`).

---

## O que é (e o que não é) breaking change

| Não-disruptivo (sem nova versão maior) | Disruptivo (exige `/api/vN+1` ou migração coordenada) |
|----------------------------------------|--------------------------------------------------------|
| Adicionar endpoint ou recurso | Remover/renomear endpoint, recurso ou campo |
| Adicionar campo **opcional** na resposta | Tornar obrigatório um campo de request antes opcional |
| Adicionar valor a um enum **de saída tolerado** | Mudar tipo/semântica de um campo existente |
| Adicionar novo `code` de erro (`ERROR_MODEL`) | Alterar status/`code` de um erro já contratado |
| Relaxar uma validação | Endurecer validação que rejeita payloads antes válidos |

A fonte de verdade da compatibilidade é o **teste de contrato no CI**
(`TESTING_STRATEGY`): uma mudança que o quebra é, por definição, uma mudança de
contrato deliberada — e segue esta política. Breaking changes também se refletem
no commit (`BREAKING CHANGE:` — `GIT_WORKFLOW`).

---

## Deprecação e sunset

Quando um elemento do contrato precisa sair:

1. **Anunciar** a deprecação (no OpenAPI, marcando `deprecated`, e na documentação).
2. **Sinalizar em runtime** quando aplicável (ex.: header de aviso/`Sunset` com a
   data).
3. **Janela de transição:** manter o comportamento antigo funcionando por um
   período razoável, proporcional ao impacto e a quem consome.
4. **Remover** apenas após a janela, numa nova versão maior se for disruptivo.

No MVP, o único consumidor é a própria aplicação, então a janela é curta; a
disciplina existe para quando parceiros (Fase 3) passarem a depender do contrato.

---

## Relação com decisões de domínio

Mudanças de contrato que decorrem de **questões em aberto do domínio** (ex.:
modelagem de Parceiro; tutor primário vs. autorizado — `DOMAIN_MODEL`) devem ser
fechadas via **ADR** antes de cristalizar no contrato, evitando uma `v2`
prematura por decisão reversível mal-amadurecida.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define o esquema de versão no caminho (`/api/v1`) e a coexistência entre versões maiores.
- [x] Classifica mudanças disruptivas vs. não-disruptivas, ligando ao teste de contrato e ao commit.
- [x] Estabelece a política de deprecação/sunset proporcional ao consumidor.
- [x] Distingue versão de API do SemVer do produto (`GIT_WORKFLOW`) e remete erro a `ERROR_MODEL`.
- [ ] Janela de deprecação concreta definida quando o primeiro consumidor externo (Fase 3) existir.
