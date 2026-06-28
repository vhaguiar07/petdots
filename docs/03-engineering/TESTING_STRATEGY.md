---
title: Testing Strategy
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Como testar o PetDots: tipos de teste (unidade, integração com Postgres efêmero,
  contrato OpenAPI), o que cada um cobre, ferramentas e política de cobertura
  proporcional ao MVP. É o "como testar" que realiza as metas de QUALITY_ATTRIBUTES;
  não define essas metas (lá), nem a stack (TECHNOLOGY_STACK), nem os padrões de
  código (CODING_STANDARDS).
relates_to:
  - 02-architecture/QUALITY_ATTRIBUTES.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 03-engineering/CODING_STANDARDS.md
  - 04-api/API_GUIDELINES.md
type: engineering
---

# PetDots — Testing Strategy

> As **metas** de qualidade (o "quão bom") vivem em
> [`QUALITY_ATTRIBUTES`](../02-architecture/QUALITY_ATTRIBUTES.md). Este documento
> é o **como testar** que as realiza. As **ferramentas** de teste estão pinadas
> em [`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md).

---

## Objetivo

Definir **como o PetDots é testado** para sustentar os atributos prioritários de
`QUALITY_ATTRIBUTES`: segurança/ownership, integridade dos dados e confiabilidade
dos lembretes. Proporcional ao MVP solo — **cobertura onde o risco está**, não
métrica por métrica.

**Não cobre:** as metas de qualidade → `QUALITY_ATTRIBUTES`; as ferramentas e
versões → `TECHNOLOGY_STACK`; o estilo do código de teste → [`CODING_STANDARDS`](./CODING_STANDARDS.md).

---

## Princípio: testar onde o risco está

A prioridade de teste segue a prioridade de `QUALITY_ATTRIBUTES`:

1. **Autorização / ownership** — nenhum acesso a dado de Pet sem o vínculo
   `pet_tutors` (atributo #1; invariante de domínio).
2. **Invariantes de domínio** — Pet ID imutável, Pet sempre com ≥1 Tutor, Evento
   pertence a um único Pet (P4 / `DOMAIN_MODEL`).
3. **Idempotência dos lembretes** — um lembrete não duplica nem some (atributo #3).
4. **Contrato da API** — o OpenAPI publicado não diverge do código (sustenta a
   manutenibilidade/legibilidade — atributo #4 — e cumpre o ADR-0002).

---

## Tipos de teste

| Tipo | Alvo | Como |
|------|------|------|
| **Unidade** | `domain` e `application` (regras, invariantes, casos de uso) | TS puro, sem banco nem HTTP; rápido e determinístico. |
| **Integração** | `controller → application → infra` contra um banco real | **PostgreSQL efêmero** (Testcontainers); valida Prisma, transações e guards. |
| **Contrato (OpenAPI)** | A fronteira REST | Garante que requests/responses batem com o **OpenAPI canônico** publicado (ver [`API_GUIDELINES`](../04-api/API_GUIDELINES.md)). |

Ferramentas (de `TECHNOLOGY_STACK`): **Jest** + **Supertest**; **Testcontainers**
para o Postgres efêmero. Não se usa banco mockado para o que o Postgres real
valida (ex.: advisory lock, constraints).

### O que cada caminho crítico exige

- **Autorização:** todo endpoint de dado de Pet tem teste de acesso negado sem
  vínculo (e concedido com vínculo/permissão).
- **Lembretes:** teste de **reentrância** — disparar o mesmo job concorrente e
  verificar 0 duplicado/perdido (advisory lock + outbox; `SYSTEM_ARCHITECTURE`).
- **Integridade:** teste de que mutações passam pela raiz do agregado e mantêm a
  invariante; reconciliação banco × S3 sem órfãos para documentos.

---

## Teste de contrato no CI

O **OpenAPI é o contrato canônico de fronteira** (ADR-0002). O CI roda um teste
que falha quando o contrato publicado **diverge** do que o código expõe — a
defesa contra *drift* citada em `TECHNOLOGY_STACK`. Mudança de contrato é mudança
deliberada: atualiza o schema Zod, regenera o OpenAPI e passa pela política de
[`VERSIONING`](../04-api/VERSIONING.md).

---

## Cobertura e gates

- **Cobertura é direcional, não um número cego:** priorizar `domain`/`application`
  e os caminhos críticos acima. Linha de base calibrada nos primeiros 30 dias
  (como as metas de `QUALITY_ATTRIBUTES`/`SUCCESS_METRICS`).
- **Gate de PR/CI:** unidade + integração + contrato + lint **verdes** antes do
  merge (ver [`GIT_WORKFLOW`](./GIT_WORKFLOW.md) e [`DEPLOYMENT`](./DEPLOYMENT.md)).
- **TDD onde paga:** invariantes e autorização se beneficiam de teste-primeiro;
  não é cerimônia obrigatória para todo ajuste trivial.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define os tipos de teste (unidade, integração com Postgres efêmero, contrato).
- [x] Prioriza autorização, invariantes e idempotência de lembretes, ligando a `QUALITY_ATTRIBUTES`.
- [x] Descreve o teste de contrato OpenAPI no CI contra *drift*.
- [x] Trata cobertura como direcional e proporcional ao MVP, sem redefinir metas nem stack.
- [ ] Limiares de cobertura calibrados com a base real nos primeiros 30 dias.
