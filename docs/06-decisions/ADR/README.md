---
title: "ADR — Architecture Decision Records"
status: stable
version: 1.5
updated: 2026-09-11
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
| [ADR-0002](./0002-stack-tecnologica-fundacao.md) | Stack tecnológica de fundação do PetDots | Accepted | 2026-06-27 |
| [ADR-0003](./0003-monetizacao-piloto-e-split-pagamento.md) | Monetização do piloto e pagamento via split | Accepted | 2026-09-02 |
| [ADR-0004](./0004-arquitetura-mvp-marketplace.md) | Arquitetura do MVP marketplace | Accepted | 2026-09-03 |
| [ADR-0005](./0005-bootstrap-monorepo.md) | Bootstrap do monorepo — gerenciador, orquestrador e versões pinadas | Accepted (pins superseded pelo 0007) | 2026-09-07 |
| [ADR-0006](./0006-instrumentacao-opentelemetry.md) | Instrumentação OpenTelemetry da API | Accepted | 2026-09-08 |
| [ADR-0007](./0007-esm-nest-12-e-prisma-7.md) | Migração para ESM, NestJS 12 e Prisma 7 | Accepted | 2026-09-08 |
| [ADR-0008](./0008-cliente-universal-expo-react-native-web.md) | Cliente universal Expo + React Native Web — resultado do spike-gate | Accepted | 2026-09-11 |
| [ADR-0009](./0009-duas-linhas-de-integracao-develop-e-master.md) | Duas linhas de integração — `develop` e `master` | Accepted | 2026-09-11 |
| [ADR-0010](./0010-comparador-publico-antes-do-checkout.md) | Comparador público antes do checkout | Accepted | 2026-09-11 |
