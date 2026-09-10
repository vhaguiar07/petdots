---
title: Product Capabilities
status: stable
version: "2.0"
updated: 2026-09-10
scope: >
  Mapa das capacidades funcionais do PetDots — as grandes áreas funcionais do
  produto, com a persona que servem, a fase do roadmap, o módulo que as
  materializa e as entidades envolvidas. Responde "quais áreas o produto
  cobre"; não detalha funcionalidades (FEATURE_CATALOG), fases
  (PRODUCT_ROADMAP), escopo (MVP_SCOPE) nem entidades (DOMAIN_MODEL).
relates_to:
  - 01-product/FEATURE_CATALOG.md
  - 01-product/MVP_SCOPE.md
  - 01-product/DOMAIN_MODEL.md
  - 00-foundation/PRODUCT_ROADMAP.md
  - 00-foundation/GLOSSARY.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
type: product
---

# PetDots — Product Capabilities

> **v2.0 (2026-09-10).** Reescrito na `pd-07`. A v1.0 (jun/2026) mapeava as
> capacidades do produto "Vida do Pet" e classificava o marketplace como
> **C11, Fase 4, "capacidade-satélite, não núcleo"** — o oposto do
> [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md). Nesta
> versão, o marketplace hiperlocal **é** o núcleo da Fase 1, e as capacidades da
> v1.0 aparecem com a fase de reentrada.

---

## Objetivo

Mapeia as **capacidades** do PetDots — as grandes áreas funcionais da
plataforma, na taxonomia do [GLOSSARY](../00-foundation/GLOSSARY.md): uma
**Capacidade** agrupa funcionalidades relacionadas; uma **Funcionalidade** é um
comportamento específico dentro de uma capacidade.

**Não cobre:** as funcionalidades concretas →
[`FEATURE_CATALOG`](./FEATURE_CATALOG.md); o recorte e os critérios do MVP →
[`MVP_SCOPE`](./MVP_SCOPE.md); o faseamento →
[`PRODUCT_ROADMAP`](../00-foundation/PRODUCT_ROADMAP.md); as entidades →
[`DOMAIN_MODEL`](./DOMAIN_MODEL.md); as jornadas →
[`USER_JOURNEYS`](./USER_JOURNEYS.md).

---

## O núcleo do produto

O núcleo da Fase 1 é a **transação recorrente**: um tutor compra de uma loja do
seu bairro, e a plataforma sabe quando ele precisa comprar de novo.

As capacidades C1–C14 existem para sustentar esse ciclo. Duas delas são as
"joias" que dão valor ao app **antes** de haver volume de transação: **C6
(comparador)** e **C9 (reposição inteligente)**.

---

## Capacidades da Fase 1 — marketplace hiperlocal

| # | Capacidade | O que é | Persona | Módulo | Entidades |
|---|---|---|---|---|---|
| C1 | **Identidade & Acesso** | Cadastro e login (e-mail/senha, Google), papéis e recuperação de acesso | Tutor, Lojista | `identity` | `User` |
| C2 | **Perfil do Tutor & Pets** | Endereço com bairro/CEP; pet enxuto (peso, consumo) a serviço da reposição; Pet ID imutável | Tutor | `tutors` | `Tutor`, `Pet` |
| C3 | **Catálogo Mestre** | Produtos por EAN, curados pela plataforma, com categoria que determina a comissão; tabela de comissão historizada | Plataforma | `catalog` | `Product`, `CommissionRate` |
| C4 | **Loja & Onboarding** | Cadastro e ativação da loja, membros e papéis, subconta no PSP, tarifa de fundador, código de indicação | Lojista | `stores` | `Store`, `StoreMember`, `StoreCommissionRate` |
| C5 | **Oferta** | A loja marca "tenho" e informa preço e disponibilidade sobre o catálogo mestre | Lojista | `offers` | `Offer` |
| C6 | **Comparador de Preços** (Joia 2) | Busca de produto e comparação entre as lojas que entregam no endereço, com preço, taxa e prazo; páginas públicas indexáveis | Tutor, visitante | `offers`, `apps/landing` | `Offer`, `Store`, `DeliveryArea` |
| C7 | **Pedido** | Carrinho de uma loja, máquina de estados, snapshot de preço e comissão, substituição assistida | Tutor, Lojista | `orders` | `Order`, `OrderItem` |
| C8 | **Pagamento & Repasse** | Intenção no PSP com split, Pix, confirmação por webhook, repasse à loja, conciliação diária | Tutor, Lojista | `payments` | `Payment`, `Payout` |
| C9 | **Reposição Inteligente** (Joia 1) | Calculadora de consumo, agenda por consumo ou intervalo, projeção de término e recálculo após a entrega | Tutor | `replenishment` | `ReplenishmentSchedule` |
| C10 | **Entrega** | Elegibilidade do endereço por área, taxa e prazo, despacho e status, custo real | Tutor, Lojista | `delivery` | `Delivery`, `DeliveryArea` |
| C11 | **Notificações** | Lembrete de reposição idempotente e avisos transacionais do pedido, por push e WhatsApp | Tutor, Lojista | `notifications` | `Reminder` |
| C12 | **Painel do Lojista** | Fila de pedidos, aceite/recusa, indisponibilidade, despacho, preços e repasses — no mesmo app, sob papel `STORE_MEMBER` | Lojista | `orders`, `offers`, `payments` | — |
| C13 | **Aquisição & Lista de Espera** | Landing pública do smoke test, captura de endereço fora de área, QR do balcão como canal | Visitante, Lojista | `waitlist`, `apps/landing` | `WaitlistEntry`, `Store` |
| C14 | **Operação da Plataforma & Soberania de Dados** | Curadoria do catálogo, tabela de comissão e ativação de loja sob papel `ADMIN`; exportação e exclusão dos dados do tutor (LGPD) | Plataforma, Tutor | todos | — |

---

## Capacidades das fases seguintes

| # | Capacidade | O que é | Persona | Fase |
|---|---|---|---|---|
| C15 | **Carteira Digital & Histórico do Pet** | Vacinas, exames, documentos e timeline do pet, como agregado sob o `Pet` | Tutor | 2 |
| C16 | **Assinatura & Clube** | Recompra recorrente, clube de descontos, mensalidade SaaS do painel | Tutor, Lojista | 2 |
| C17 | **Serviços & Agendamento** | Perfil de parceiro, catálogo de serviços, agendamento, comunicação tutor↔parceiro | Prestador, Vet, Clínica | 3 |
| C18 | **Reputação** | Avaliação de parceiro nascida de serviço concluído | Tutor, parceiros | 3 |
| C19 | **Portal Empresarial & ERP** | Agenda, prontuário, financeiro e estoque para o parceiro operar dentro da plataforma | Clínica | 4 |
| C20 | **Integrações & API Pública** | Integração com sistemas externos de parceiros | Parceiros | 4 |
| C21 | **Retail Media & Fidelidade** | Destaque pago de lojas e marcas, campanhas, programa de fidelidade | Lojista, marcas | 4 |
| C22 | **Inteligência (IA)** | Recomendação personalizada, previsão de demanda, assistente, busca semântica | Todas | transversal desde a 1; dedicada na 5 |
| C23 | **Impacto Social & Expansões** | ONGs, adoção com Pet ID, laboratórios, seguradoras | ONG e expansões | 6 |

---

## Notas

- **O marketplace é o núcleo, não satélite.** É a inversão em relação à v1.0, e
  a razão de existir desta versão: o que era C11/Fase 4 se decompôs nas
  capacidades C3–C13 da Fase 1.
- **As joias vêm antes do volume.** C6 e C9 têm valor com zero transação — é o
  que permite lançar num bairro sem base instalada.
- **C11 nasce parcial.** O módulo `notifications` só modela `Reminder`; a
  notificação transacional é pendência registrada em
  [`MVP_SCOPE`](./MVP_SCOPE.md) §"Pendências de modelagem".
- **C14 não tem ferramenta própria no MVP.** A operação da plataforma é
  trabalho manual sob papel `ADMIN`; o console é lacuna registrada em
  [`IDEIAS.md`](../07-process/IDEIAS.md).
- **C22 (IA) é transversal desde a Fase 1** — a calculadora de consumo e o apoio
  à curadoria do catálogo — e vira frente dedicada na Fase 5.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Lista as capacidades com persona, fase, módulo e entidades, na taxonomia do GLOSSARY.
- [x] Distingue capacidade (área) de funcionalidade (comportamento) sem invadir o `FEATURE_CATALOG`.
- [x] Marca as capacidades da Fase 1 e trata o marketplace como núcleo (ADR-0004).
- [x] Aponta as capacidades que nascem parciais e onde a lacuna está registrada.
- [ ] Revisado a cada nova capacidade priorizada no roadmap.
