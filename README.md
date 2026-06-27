---
title: PetDots
status: stable
version: 1.0
updated: 2026-06-27
scope: >
  README raiz do repositório PetDots. Apresenta o ecossistema, o estado atual
  do projeto e encaminha o leitor para a documentação estruturada em docs/.
relates_to:
  - docs/README.md
  - docs/05-ai/AI_CONTEXT.md
  - docs/02-architecture/TECHNOLOGY_STACK.md
  - docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
type: foundation
---

# PetDots

**Toda a vida do pet em um único lugar.**

O PetDots é uma plataforma digital AI-first que centraliza a jornada completa do animal de estimação — saúde, bem-estar, serviços, produtos e conexão com o ecossistema pet (tutores, clínicas, pet shops, prestadores e ONGs). O produto nasce com inteligência artificial como princípio de design, não como adição posterior, e é documentado em [`docs/`](docs/) como fonte canônica de decisões estratégicas, funcionais e técnicas.

Para entender o projeto em profundidade, comece por [`docs/README.md`](docs/README.md) (índice mestre) e [`docs/05-ai/AI_CONTEXT.md`](docs/05-ai/AI_CONTEXT.md) (contexto para agentes de IA e novos colaboradores).

---

## Documentação

A documentação vive em [`docs/`](docs/) e está organizada em clusters temáticos:

| Cluster | Conteúdo |
|---|---|
| [`00-foundation/`](docs/00-foundation/) | Visão, princípios, modelo de negócio, glossário |
| [`01-product/`](docs/01-product/) | Personas, domínio, jornadas, funcionalidades |
| [`02-architecture/`](docs/02-architecture/) | Arquitetura, stack tecnológica, atributos de qualidade |
| [`03-engineering/`](docs/03-engineering/) | Padrões de desenvolvimento, testes, segurança, deploy |
| [`04-api/`](docs/04-api/) | Contratos de API, autenticação, versionamento |
| [`05-ai/`](docs/05-ai/) | Contexto e guias específicos para agentes de IA |
| [`06-decisions/`](docs/06-decisions/) | Registro de decisões e ADRs |

Ponto de entrada recomendado: [`docs/README.md`](docs/README.md).

---

## Setup / Desenvolvimento

> **A ser definido.**
>
> O setup de desenvolvimento será documentado em [`docs/03-engineering/DEVELOPMENT_GUIDE.md`](docs/03-engineering/DEVELOPMENT_GUIDE.md) após a escolha da stack tecnológica, registrada em [`docs/02-architecture/TECHNOLOGY_STACK.md`](docs/02-architecture/TECHNOLOGY_STACK.md) (status: planned).
>
> Não existem comandos de instalação ou execução operacionais neste momento — a base de código está em fase de re-fundação (ver ADR-0001 abaixo).

---

## Referência histórica (marketplace legado)

> Esta seção preserva contexto histórico. As instruções abaixo **não estão operacionais** no estado atual do repositório.

Antes da re-fundação (ADR-0001, 2026-06-27), o repositório continha um protótipo funcional de **marketplace de petshops** (entrega rápida, same-day delivery), implementado como monorepo Turborepo com os seguintes apps:

- `apps/api` — backend NestJS + Prisma (~20 migrations: auth, catálogo compartilhado, promoções, alertas de preço, raio de entrega)
- `apps/web` — frontend Next.js
- `apps/mobile` — app Expo

Esse protótipo foi descontinuado e o escopo redirecionado para o ecossistema AI-first descrito neste README. O código permanece recuperável no histórico Git (ver `git log` na branch antes do esvaziamento da branch `feat/ai-first`).

Decisão formal: [`docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md`](docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md).
