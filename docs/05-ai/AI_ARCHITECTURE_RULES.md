---
title: PetDots — AI Architecture Rules
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Guardrails arquiteturais para a IA ao propor design: padrões adotados,
  restrições, anti-padrões e quando registrar uma decisão como ADR.
  Derivado de AGENTS.md e PRODUCT_PRINCIPLES.md — não os duplica.
relates_to:
  - AGENTS.md
  - 00-foundation/PRODUCT_PRINCIPLES.md
  - 06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
  - 05-ai/AI_CONTEXT.md
type: ai
---

# PetDots — AI Architecture Rules

> Fonte normativa: [`AGENTS.md`](../../AGENTS.md) (seção "Arquitetura") e
> [`PRODUCT_PRINCIPLES.md`](../00-foundation/PRODUCT_PRINCIPLES.md). Este
> documento traduz essas fontes em guardrails operacionais para a IA — não as
> redefine.

---

## Padrões arquiteturais adotados

Até decisão explícita em contrário (registrada em ADR):

| Padrão                          | Status     | Observação                                         |
| ------------------------------- | ---------- | -------------------------------------------------- |
| Modular Monolith                | Adotado    | Padrão default para esta fase greenfield.          |
| API First                       | Adotado    | Toda capacidade exposta via API, mesmo que interna.|
| Domain Driven Design (leve)     | Adotado    | Linguagem ubíqua, agregados, eventos de domínio.   |
| Clean Architecture              | Opcional   | Aplicar quando fizer sentido estrutural.           |
| Event Driven                    | Condicional| Só quando agregar valor comprovado.                |
| Microserviços                   | Proibido*  | Ver restrições abaixo.                             |

*Proibido sem ADR aprovado.

---

## Princípios de design que a IA deve aplicar

1. **Simplicidade primeiro** — a solução mais simples capaz de resolver o
   problema atual é sempre preferível. Nunca otimize prematuramente.
2. **Modularidade** — módulos com alta coesão e baixo acoplamento. Cada módulo
   corresponde a um conceito do domínio (ver
   [`DOMAIN_MODEL.md`](../01-product/DOMAIN_MODEL.md)).
3. **Evolução incremental** — não adicione infraestrutura, camadas ou
   abstrações para problemas que ainda não existem.
4. **Legibilidade** — código e estrutura devem ser compreensíveis por outro
   desenvolvedor e por outra IA sem contexto adicional.
5. **Domínio antes de técnica** — qualquer proposta de design começa pelo
   impacto no domínio (Pet / Tutor / Timeline), não pela tecnologia.

---

## Restrições explícitas

### Nunca propor sem ADR

- Microserviços ou separação de serviço independente.
- Introdução de message broker ou fila de mensagens.
- Cache distribuído ou camada de cache externa.
- Qualquer infraestrutura nova (banco adicional, CDN, serviço externo).
- Mudança de stack tecnológica (a stack vive em
  `docs/02-architecture/TECHNOLOGY_STACK.md`, ainda `planned`).

### Nunca fazer por padrão

- Adicionar abstração sem uso imediato comprovado.
- Criar interfaces genéricas "para o futuro".
- Duplicar lógica de domínio em camadas técnicas.
- Antecipar o Marketplace como módulo central antes de ser priorizado.

---

## Quando registrar uma ADR

Toda decisão arquitetural relevante deve gerar ou atualizar um ADR em
`docs/06-decisions/ADR/`. Uma decisão é relevante quando:

- Impacta a estrutura de módulos ou o modelo de domínio.
- Introduz uma nova tecnologia, dependência ou serviço externo.
- Altera uma convenção já estabelecida (nomenclatura, padrão de API, etc.).
- Contradiz ou amplia os padrões desta tabela.
- Resolve uma das "Questões em aberto" listadas no `DOMAIN_MODEL.md`.

Formato mínimo de um ADR: contexto, decisão, alternativas consideradas,
consequências. Ver ADR-0001 como referência de estrutura.

---

## Checklist de validação arquitetural

Antes de finalizar qualquer proposta de design, verifique:

- [ ] A solução está alinhada com os princípios de `PRODUCT_PRINCIPLES.md`?
- [ ] O modelo de domínio (Pet/Tutor/Timeline) permanece o centro?
- [ ] A solução é a mais simples capaz de resolver o problema?
- [ ] Infraestrutura nova está justificada por ADR?
- [ ] Microserviços foram descartados ou justificados explicitamente?
- [ ] A solução pode ser compreendida por outro agente sem contexto adicional?

Se qualquer resposta for negativa, revise antes de propor.
