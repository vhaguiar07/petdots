---
title: "ADR — Architecture Decision Records"
status: stable
version: 1.0
updated: 2026-06-27
scope: >
  Guia do diretório de ADRs: o que é, como numerar, como criar e índice das
  decisões registradas no projeto PetDots.
relates_to:
  - docs/06-decisions/DECISION_LOG.md
  - docs/_templates/adr.md
type: decision
---

# ADR — Architecture Decision Records

## O que é um ADR?

Um **Architecture Decision Record** (ADR) é um documento curto que captura uma
decisão arquitetural ou de produto significativa: o contexto que a motivou, a
decisão em si, as alternativas consideradas e as consequências esperadas.

No PetDots, ADRs são a memória do projeto. Qualquer decisão que afete o escopo,
o domínio, a stack, a estrutura de dados ou os processos de desenvolvimento deve
ser registrada como ADR.

## Princípios

- **Imutável após `Accepted`:** um ADR aceito não é editado; se a decisão mudar,
  um novo ADR é criado com `superseded by ADR-{NNN}` no status do original.
- **Fonte-da-verdade:** ADRs têm precedência sobre comentários em código,
  mensagens de commit e conversas informais.
- **Legível por humanos e LLMs:** linguagem direta, sem jargão desnecessário.
  Contexto suficiente para que um agente AI entenda o raciocínio sem precisar
  inferir.

## Numeração

Os ADRs são numerados sequencialmente com 4 dígitos, sem gaps:

```
0001-titulo-kebab-case.md
0002-outro-titulo.md
...
```

O próximo número disponível é sempre `MAX(número existente) + 1`.

## Como criar um novo ADR

1. Copie o template: `docs/_templates/adr.md`
2. Nomeie o arquivo: `NNNN-titulo-kebab-case.md` (próximo número na sequência)
3. Preencha todos os campos do frontmatter
4. Preencha as seções: Contexto, Decisão, Alternativas consideradas,
   Consequências, Status
5. Adicione uma linha no `docs/06-decisions/DECISION_LOG.md`
6. Faça commit com mensagem `docs: registra ADR-NNNN (título resumido)`

## Template

Localização: [`docs/_templates/adr.md`](../../_templates/adr.md)

## Índice de ADRs

| ADR | Título | Status | Data |
|-----|--------|--------|------|
| [ADR-0001](./0001-refundacao-ecossistema-ai-first.md) | Re-fundação — PetDots como ecossistema AI-first | Accepted | 2026-06-27 |
