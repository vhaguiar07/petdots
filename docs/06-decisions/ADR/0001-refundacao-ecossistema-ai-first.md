---
title: "ADR-0001: Re-fundação — PetDots como ecossistema AI-first"
status: stable
version: 1.0
updated: 2026-06-27
scope: >
  Decisão fundacional que redefine o escopo, o estado e o modelo de documentação
  do projeto PetDots, descartando a trajetória de marketplace e estabelecendo o
  ecossistema "toda a vida do pet" como norte único.
relates_to:
  - docs/README.md
  - docs/01-foundation/PROJECT_STATE.md
  - docs/01-foundation/GLOSSARY.md
type: decision
---

# ADR-0001: Re-fundação — PetDots como ecossistema AI-first

## Contexto

Em 2026-06-27 uma auditoria do repositório revelou contradições críticas entre
o HEAD e o working tree da branch `feat/ai-first`:

- O HEAD continha uma implementação completa de **marketplace same-day** (NestJS
  + Prisma, ~20 migrations, auth, catálogo compartilhado, sistema de promoções,
  alertas de preço, raio de entrega por loja).
- O working tree da branch foi esvaziado, sem código de aplicação.
- A documentação existente apresentava **cinco listas de fonte-da-verdade**
  conflitantes, escopo ora "ecossistema" ora "marketplace", PROJECT_ROADMAP
  duplicado e ~70 % dos arquivos de docs vazios ou com apenas placeholders.
- A narrativa de produto descrevia um **ecossistema "toda a vida do pet"** (Pet
  Timeline, Tutor, histórico de saúde, bem-estar), incompatível com um
  marketplace de delivery de produtos pet.

A situação impedia qualquer avanço coerente: domínio, stack, roadmap e docs
apontavam para direções diferentes.

## Decisão

1. **Escopo redefinido:** PetDots é o **ecossistema "toda a vida do pet"** —
   plataforma centrada em Pet, Tutor e Timeline de eventos (saúde, vacinação,
   nutrição, bem-estar, adoção). O marketplace same-day *não* é o produto-alvo.

2. **Marketplace anterior = referência histórica:** o código do marketplace
   permanece acessível no histórico Git mas **não será minerado** nem portado
   para a nova base. Ele serve apenas como prova de capacidade técnica e
   referência de padrões de implementação já validados.

3. **Modelo Docs-SSOT leve:** a documentação é a **fonte-da-verdade** do
   projeto. Não há pipeline SDD formal; ADRs + PROJECT_STATE + GLOSSARY são os
   artefatos canônicos. Engenharia e stack são decididos *depois* que o domínio
   estiver estável.

4. **Fonte-da-verdade única:** `docs/README.md` é o ponto de entrada e define
   hierarquia de precedência entre todos os artefatos de documentação.

5. **Domínio centrado em Pet/Tutor/Timeline:** modelos de domínio, glossário e
   roadmap partem dessas três entidades nucleares.

## Alternativas consideradas

### (a) Evoluir o marketplace existente

Continuar a partir do código de marketplace do HEAD, adicionando as
funcionalidades de ecossistema (Pet Timeline, etc.) como módulos adicionais.

**Por que preterida:** o produto-alvo é o ecossistema, não o marketplace. Partir
do marketplace significaria herdar um modelo de dados (Store, Product, Order,
Delivery) como cidadãos de primeira classe, quando na nova visão eles são apenas
um *serviço periférico* opcional do ecossistema. O custo de inversão dos
relacionamentos supera o reaproveitamento do código.

**Trade-off registrado:** perde-se trabalho já implementado (auth, catálogo,
promoções). Ganho: modelo de domínio limpo, sem acoplamentos acidentais.

### (b) Greenfield minerando o código antigo

Partir do zero mas reutilizar seletivamente módulos do marketplace (ex.: módulo
de autenticação, seed de dados) para acelerar o desenvolvimento inicial.

**Por que preterida:** mineração seletiva tende a arrastar acoplamentos
implícitos (nomes de tabelas, convenções de enum, estrutura de Prisma schema)
que contradizem o domínio novo. O risco de "contaminação de modelo" supera o
ganho de velocidade de curto prazo, especialmente num projeto AI-first onde o
domínio precisa ser explícito e legível por LLMs.

**Trade-off registrado:** a aceleração técnica imediata é sacrificada em favor
da coerência semântica do domínio a longo prazo.

## Consequências

**Positivas:**
- Narrativa de produto única e coerente; docs e código apontam para a mesma
  direção.
- `PROJECT_STATE` retorna ao estado **"greenfield verdadeiro"** — sem dívida
  técnica herdada.
- Decisões futuras de stack e arquitetura partem de um modelo de domínio limpo.
- Documentação como fonte-da-verdade permite que agentes AI (copilots, LLMs de
  contexto) operem sobre artefatos canônicos e não contraditórios.

**Negativas / riscos:**
- Trabalho de implementação do marketplace (auth, catálogo, Prisma migrations)
  não é reaproveitado diretamente; há um custo de reescrever quando necessário.
- O período sem código de aplicação pode gerar percepção de falta de progresso
  técnico.
- Qualquer revisor que olhar o histórico Git sem contexto verá código de
  marketplace e poderá ficar confuso — mitigado por este ADR e pelo
  `PROJECT_STATE`.

## Status

`Accepted` — 2026-06-27
