---
title: Technical Vision
status: stable
version: "2.0"
updated: 2026-09-10
scope: >
  Visão técnica de longo prazo do PetDots: a estrela-guia que orienta a evolução
  arquitetural por fases, os pilares técnicos duráveis e como a arquitetura
  acomoda o roadmap sem reescrever o núcleo da transação recorrente. Responde
  "para onde a arquitetura evolui e por quê"; não cobre inventário de stack,
  componentes, princípios detalhados nem métricas (ver docs irmãos).
relates_to:
  - 02-architecture/ARCHITECTURAL_PRINCIPLES.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 00-foundation/PRODUCT_ROADMAP.md
  - 01-product/DOMAIN_MODEL.md
type: architecture
---

# PetDots — Technical Vision

> **v2.0 (2026-09-10).** Reescrito na `pd-07`. A v1.0 (jun/2026) definia o núcleo
> técnico como **Pet / Tutor / Timeline** e tratava o comércio como
> "módulo-satélite, não núcleo" — premissa invertida pelo
> [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md). O que
> muda aqui é **qual é o núcleo estável**; os seis pilares e a lógica de
> complexidade adiada seguem válidos, com os exemplos atualizados.

---

## Objetivo

Este documento articula a **visão técnica de longo prazo** do PetDots: para onde
a arquitetura evolui e **por quê**. Serve de norte estável para que cada decisão
técnica — hoje e ao longo dos anos — fortaleça a visão de produto.

**Este documento não cobre** (e aponta para o irmão correspondente):

- O **inventário de tecnologias** e a justificativa de cada escolha → [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e `TECHNOLOGY_STACK.md`.
- Os **princípios arquiteturais** acionáveis → `ARCHITECTURAL_PRINCIPLES.md`.
- Os **componentes e suas interações** → `SYSTEM_ARCHITECTURE.md`.
- Os **atributos de qualidade** e metas mensuráveis → `QUALITY_ATTRIBUTES.md`.

---

## A estrela-guia técnica

O PetDots é um **Modular Monolith API-first** cujo núcleo estável é a
**transação recorrente** — Tutor · Loja · Pedido · Reposição — com o **pedido
como registro contábil imutável**. Ele **evolui por fases** para o ecossistema
completo (carteira do pet, serviços, B2B, IA, impacto social) **sem reescrever
esse núcleo**.

É construído para ser **legível por humanos e por agentes de IA** e para
**transformar dados em inteligência** de forma discreta e sempre com
*human-in-the-loop*.

Duas consequências que atravessam tudo:

- **A fronteira do dinheiro é a fronteira mais rígida do sistema.** Snapshot,
  idempotência e "nada de repasse sem pagamento confirmado" não são detalhes de
  implementação — são invariantes de arquitetura.
- **Fronteira de dono de dado é fronteira de código.** A loja é dona do seu
  preço, a plataforma é dona do catálogo, o tutor é dono dos seus dados. Isso
  vira guard e módulo, não disciplina.

---

## Pilares técnicos

Tradução técnica dos `PRODUCT_PRINCIPLES`; orientam a evolução e não substituem
a lista acionável de `ARCHITECTURAL_PRINCIPLES`.

### 1. Domínio no centro

O núcleo Tutor/Loja/Pedido/Reposição é o coração do sistema, com um módulo por
agregado. Capacidade futura entra como **módulo que referencia o núcleo por
`id`**, sem deslocá-lo — foi assim que o `Pet` foi mantido no MVP com `id`
imutável, preparando a carteira da fase 2 sem construí-la agora.

### 2. Modular Monolith primeiro

Um único artefato deployável, com fronteiras de domínio claras entre módulos. A
**extração de um serviço** só acontece sob força real (escala, ciclo de vida ou
time independentes) e **mediante ADR** — nunca microserviço antecipado.

### 3. API-first como superfície de produto

Toda capacidade nasce como serviço reutilizável com **contrato canônico
REST/OpenAPI**, gerado dos schemas Zod. Esse contrato serve todos os canais — app
do tutor, painel do lojista (o mesmo app, outro papel), landing pública — e as
integrações futuras de parceiros: escrito uma vez, consumido por muitos.

### 4. AI-first em duas dimensões

- **Build-time:** código e documentação legíveis e previsíveis para os agentes
  que constroem o produto (docs como fonte da verdade; convenções explícitas).
- **Run-time:** os dados geram inteligência — projeção de consumo do pet,
  histórico de preço por loja, previsão de demanda. Discreta e transversal na
  fase 1 (a calculadora de consumo); frente dedicada na Fase 5, sobre base
  consolidada. Sempre *human-in-the-loop*.

### 5. Soberania de dados: do tutor e do parceiro

Ownership, LGPD (exportação, exclusão com retenção legal, permissões) e
auditoria são **invariantes de primeira classe**, não detalhes de
infraestrutura — e orientam decisões estruturais, como identidade própria em vez
de terceirizada.

No marketplace isso ganha um segundo eixo: **a soberania comercial do
parceiro**. O preço da loja é público porque é o produto; o histórico de vendas
dela não é visível a nenhuma outra loja. É o que o `StoreScopeGuard` protege.

### 6. Simplicidade com complexidade adiada

"A solução mais simples capaz de resolver o problema atual." Cada salto de
complexidade — fila, cache, réplica de leitura, extração de serviço,
geoespacial, multi-região — é **deliberadamente adiado** até o sinal aparecer, e
cada um passa por ADR.

Os casos concretos que o MVP já adiou, com o gatilho de cada um: área de entrega
por bairro e CEP em vez de PostGIS (gatilho: precisar de distância ou rota
real); busca full-text do próprio Postgres em vez de datastore de busca
(gatilho: qualidade ruim acima de ~5 mil SKUs); scheduler in-process com
advisory lock em vez de broker (gatilho: volume ou necessidade de retentativa
distribuída); nenhum storage de objeto, porque não há upload no MVP.

---

## Evolução esperada (arquitetura × roadmap)

A cada fase do [PRODUCT_ROADMAP](../00-foundation/PRODUCT_ROADMAP.md) a
arquitetura ganha capacidades **sem deslocar o núcleo**. O contrato de API e os
eventos de domínio (`recurso.ação`) são a espinha de integração entre módulos.

| Fase | Capacidade que entra | O que exige da arquitetura (núcleo intacto) |
|---|---|---|
| **1 — Cunha: marketplace hiperlocal (MVP)** | Catálogo mestre, oferta e comparador, pedido, pagamento com split, entrega, reposição | Nasce o Modular Monolith do ADR-0002 com os **onze módulos** do ADR-0004; fronteira de dinheiro (snapshot, webhook idempotente, conciliação); `StoreScopeGuard`; regras puras de comissão e consumo em `packages/domain`; cliente universal sob spike-gate |
| **2 — Consolidação local e carteira do pet** | Carteira digital, histórico, assinatura, cartão, antecipação | Volta o **storage de objeto** (documentos) com o gatilho que o MVP nomeou; `Timeline`/`Event` entram como agregado sob `Pet`, que já tem `id` imutável; Tutor↔Pet passa a N:N (migração prevista); cobrança recorrente é nova integração com o PSP (ADR) |
| **3 — Serviços e saúde do bairro** | Parceiros, serviços, agendamento, reputação | `stores` passa a referenciar **`partners`** — a generalização que o ADR-0004 adiou de propósito, agora com um segundo tipo real; novos módulos referenciam `Pet`/`Tutor`/`Partner` por `id`; agendamento concluído emite evento que alimenta o histórico |
| **4 — Plataforma B2B** | Portal/ERP, API pública, retail media | O contrato OpenAPI canônico (existente desde a fase 1) vira a **API pública** de parceiros, com versionamento e limites; o portal pode virar front separado; **1º candidato real à extração de serviço** — se a carga justificar (ADR) |
| **5 — IA dedicada** | Recomendação, previsão de demanda, assistente, busca semântica | Camada de IA consome eventos e histórico; `pgvector`/FTS no Postgres é a porta de entrada; só então frente dedicada (worker ou serviço, via ADR). *Human-in-the-loop* |
| **6 — Impacto social e expansões** | ONGs, laboratórios, seguradoras | Novos perfis de `Partner` e integrações externas pelo contrato de API; adoção liga o **Pet ID** a um novo tutor (transferência de ownership) |

---

## O que esta visão não decide (e o que fica adiado)

Decisões deliberadamente **adiadas**, cada uma com seu gatilho:

- **Extração de serviços** — gatilho: carga ou ciclo de vida independentes que o
  monolito não acomode bem.
- **Multi-região / alta disponibilidade** — gatilho: requisito explícito de
  disponibilidade ou latência.
- **IA dedicada** (frente própria) — gatilho: base de dados consolidada
  (Fase 5).
- **Broker, fila, cache, datastore novo, geoespacial** — gatilho: necessidade
  comprovada, sempre via ADR (ADR-0002).
- **Destino gerenciado de telemetria** — gatilho: existir ambiente de deploy
  (ADR-0006).

Decisões **já tomadas ou detalhadas em outro lugar:** stack →
[ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e
`TECHNOLOGY_STACK`; módulos e agregados do MVP →
[ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md); princípios
acionáveis → `ARCHITECTURAL_PRINCIPLES`; componentes → `SYSTEM_ARCHITECTURE`;
metas de qualidade → `QUALITY_ATTRIBUTES`.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Articula a estrela-guia técnica alinhada à `PRODUCT_VISION` e ao ADR-0004.
- [x] Define os pilares técnicos sem repetir `ARCHITECTURAL_PRINCIPLES`.
- [x] Mapeia a evolução arquitetura × roadmap mantendo o núcleo da transação recorrente estável.
- [x] Explicita as decisões adiadas e seus gatilhos.
- [x] Não sobrepõe stack (ADR-0002), componentes (`SYSTEM_ARCHITECTURE`) nem métricas (`QUALITY_ATTRIBUTES`).
- [ ] Revisado quando a Fase 2 introduzir storage e o modelo N:N.
