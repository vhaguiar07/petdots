---
title: Testing Strategy
status: draft
version: "1.3"
updated: 2026-09-12
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

1. **Autorização / escopo de loja** — nenhum acesso a pedido ou preço de outra
   loja; o `StoreScopeGuard` sobre `store_members` é a defesa (atributo #1).
2. **Dinheiro** — cálculo de comissão por categoria (com override de fundador e
   comissão zero por indicação), snapshot que não muda pedido existente, e
   **nenhum `Payout` sem `Payment` `CAPTURED`** (atributo #2 / `DOMAIN_MODEL`).
3. **Idempotência** — do webhook do PSP (por `psp_payment_id`), da criação de
   pedido (`Idempotency-Key`) e dos lembretes (atributos #2 e #3).
4. **Invariantes de domínio** — pedido imutável após terminal, `total_cents` =
   itens + entrega + serviço, par (`store_id`, `product_id`) único, transição de
   status unidirecional (P4 / `DOMAIN_MODEL`).
5. **Contrato da API** — o OpenAPI publicado não diverge do código (sustenta a
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

**No cliente universal (`apps/app`), o tipo é Unidade e nada além** — máquina de
estado da sessão, renovação de token com `fetch` falso e armazenamento com
`localStorage` falso, com `jest-expo` e **sem biblioteca de renderização**. Não
é uma categoria nova: é o mesmo princípio de "testar onde o risco está" aplicado
a um cliente. O que pode deslogar alguém indevidamente é a lógica de refresh,
não o JSX; a renderização fica coberta por `lint`, `typecheck` e pelo
`expo export`, que falha se uma tela não compilar (`pd-13`,
[ADR-0012](../06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md)).
⚠️ O Turborepo encadeia `test` depois de `build`, então `npm test` roda o
`expo export` do app antes (em cache).

### O que cada caminho crítico exige

- **Autorização:** todo endpoint de dado de loja tem teste de acesso negado a
  membro de outra loja (e concedido com vínculo/papel).
- **Posse, desde a `pd-14`:** todo endpoint de dado de terceiro tem teste de
  acesso negado. O **primeiro** é `tutors.e2e-spec.ts` (T11): o tutor B não lê,
  não edita e não apaga o pet do tutor A — **`404` nos três**, e o pet de A
  segue intacto depois da tentativa. Esse último detalhe é o que separa "foi
  recusado" de "recusou depois de já ter escrito".
  **É o padrão a copiar para `orders`**: pedido de outro tutor → `404`. E vale
  com prova de vermelho — tirar o `tutor_id` do `where` do repositório derruba
  T11, que é o que garante que a posse está na consulta e não numa checagem que
  alguém pode esquecer de chamar.
- **Papel, desde a `pd-14`:** a primeira rota real com `@Roles()` tem teste de
  `403` (T6) — `ADMIN` sem `TUTOR` em `/tutors/me`.
- **Rotas públicas, desde que os guards são globais (`pd-13`):** um
  **sentinela** percorre todas as rotas abertas **sem** `Authorization` e falha
  se alguma responder `401`. Com a inversão, o modo de errar deixou de ser "uma
  rota ficou aberta" e passou a ser "uma rota pública fechou sozinha" — e é o
  comparador, a aquisição orgânica do produto, que estaria na linha de tiro.
- **Comissão:** teste **unitário puro** em `packages/domain` cobrindo cada
  categoria, o override de fundador e a comissão zero por indicação — é onde o
  erro custa dinheiro do parceiro.
- **Webhook do PSP:** teste de **reentrega** — processar o mesmo evento duas
  vezes e verificar um único repasse; e teste de assinatura inválida rejeitada.
- **Lembretes:** teste de **reentrância** — disparar o mesmo job concorrente e
  verificar 0 duplicado/perdido (advisory lock + outbox; `SYSTEM_ARCHITECTURE`).
- **Integridade:** teste de que mutações passam pela raiz do agregado e mantêm a
  invariante; teste de que alterar preço de oferta ou tabela de comissão **não**
  altera pedido já criado (snapshot).

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
