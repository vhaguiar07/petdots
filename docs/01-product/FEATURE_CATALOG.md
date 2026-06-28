---
title: Feature Catalog
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Catálogo cross-fase de funcionalidades do PetDots, agrupadas por capacidade e
  mapeadas à fase do roadmap. As funcionalidades da Fase 1 referenciam o
  MVP_SCOPE como fonte autoritativa (não as redefine). Responde "quais
  funcionalidades existem e em que fase"; não define capacidades (CAPABILITIES),
  critérios de aceite do MVP (MVP_SCOPE) nem jornadas (USER_JOURNEYS).
relates_to:
  - 01-product/CAPABILITIES.md
  - 01-product/MVP_SCOPE.md
  - 01-product/USER_JOURNEYS.md
  - 00-foundation/PRODUCT_ROADMAP.md
type: product
---

# PetDots — Feature Catalog

---

## Objetivo

Cataloga as **funcionalidades** (comportamentos específicos, no sentido do
GLOSSARY) por **capacidade** e por **fase** do roadmap.

> **Estado:** o projeto é greenfield — **nada está implementado**. A coluna
> "Fase" indica o horizonte planejado, não estado de desenvolvimento.

> **Fonte autoritativa da Fase 1:** os critérios de aceite e o recorte do MVP
> vivem em [`MVP_SCOPE`](./MVP_SCOPE.md). Aqui as funcionalidades da Fase 1 são
> **listadas e referenciadas**, não redefinidas (evita listas concorrentes).

---

## Fase 1 — MVP (autoritativo em `MVP_SCOPE`)

| Capacidade | Funcionalidades | Referência |
|-----------|-----------------|-----------|
| Identidade & Acesso (C2) | Cadastro/login do Tutor; recuperação de acesso; gestão de múltiplos pets; compartilhamento com familiares; controle de acesso (ownership) | MVP_SCOPE #1, #3, #8 |
| Gestão de Pets (C1) | Cadastro de pet (espécie, raça, nascimento, foto); edição; Pet ID estável; exclusão (LGPD) | MVP_SCOPE #2, #9 |
| Timeline & Histórico (C3) | Registrar Evento; visualizar Timeline; visão consolidada do Histórico; exportação do histórico | MVP_SCOPE #4, #6 |
| Carteira Digital (C4) | Upload de documento; organização; visualização | MVP_SCOPE #5 |
| Lembretes & Alertas (C5) | Criar lembrete; disparo; lembrete cumprido → Evento na Timeline | MVP_SCOPE #7 |

---

## Fases seguintes (planejado — detalhamento quando priorizadas)

| Fase | Capacidade | Funcionalidades (visão) |
|------|-----------|--------------------------|
| 2 | Descoberta & Parceiros (C6) | Perfil de Parceiro; busca por localização; perfil de clínica com catálogo de serviços |
| 2 | Agendamento (C7) | Agendamento online; integração Agendamento → Evento na Timeline; comunicação básica tutor↔parceiro |
| 2 | Avaliações (C8) | Avaliação e reputação de parceiros |
| 3 | Portal & ERP (C9) | Dashboard, prontuário, agenda avançada, financeiro básico; integração de prontuário ao Histórico (com consentimento) |
| 3 | API de Parceiros (C10) | Integração com sistemas externos de clínicas |
| 4 | Marketplace (C11) | Catálogo de produtos; compra e entrega; histórico de compra vinculado ao pet |
| 4 | Fidelidade & Campanhas (C12) | Programa de fidelidade; campanhas/destaque patrocinado |
| 5 | Inteligência (C13) | Recomendações personalizadas; alertas preditivos; assistente de saúde; busca semântica; sumário de saúde |
| 6 | Impacto Social & Expansões (C14) | Perfil de ONG; campanhas de adoção; integração de laboratórios; seguradoras |

> As funcionalidades de fases futuras são intencionalmente de **alto nível** —
> evolução incremental: detalham-se quando a fase for priorizada, não antes.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Agrupa funcionalidades por capacidade e por fase.
- [x] Referencia o `MVP_SCOPE` como fonte autoritativa da Fase 1 (sem relistar critérios).
- [x] Mantém as fases futuras em alto nível (sem antecipar detalhe).
- [x] Não duplica `CAPABILITIES` (áreas) nem `USER_JOURNEYS` (fluxos).
- [ ] Atualizado a cada fase priorizada, detalhando suas funcionalidades.
