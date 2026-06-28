---
title: Quality Attributes
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Atributos de qualidade do PetDots e seus requisitos (direcionais e
  proporcionais ao MVP), com como medir e a tática arquitetural de cada um, mais
  os trade-offs assumidos. Define "quão bom o sistema precisa ser"; não decide
  stack (ADR-0002/TECHNOLOGY_STACK), princípios (ARCHITECTURAL_PRINCIPLES) nem
  componentes (SYSTEM_ARCHITECTURE).
relates_to:
  - 02-architecture/ARCHITECTURAL_PRINCIPLES.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 01-product/MVP_SCOPE.md
  - 00-foundation/SUCCESS_METRICS.md
  - 03-engineering/TESTING_STRATEGY.md
type: architecture
---

# PetDots — Quality Attributes

---

## Objetivo

Define os **atributos de qualidade** do PetDots e o quanto cada um precisa ser
atendido. Coerente com "nunca otimizar prematuramente": as metas são
**direcionais e proporcionais ao MVP** — não SLAs de enterprise. Várias linhas de
base são estabelecidas nos primeiros 30 dias (como em
[`SUCCESS_METRICS`](../00-foundation/SUCCESS_METRICS.md)).

Ordenados por prioridade para **este** produto (saúde do pet, dados do Tutor).

---

## Atributos prioritários

### 1. Segurança e Privacidade (LGPD) — prioridade máxima

- **Requisito:** apenas o Tutor e autorizados acessam os dados de um Pet;
  identidade e dados sensíveis sob nosso domínio; consentimento e auditoria.
- **Como medir:** 0 acessos a dado de Pet sem checagem de vínculo (teste +
  auditoria); cobertura de testes de autorização nos endpoints de Pet;
  exportação e exclusão funcionando.
- **Tática:** OwnershipGuard por instância (`pet_tutors`), auth próprio
  (JWT/argon2/OAuth), Audit interceptor, exclusão com retenção (soft-delete),
  presigned URLs com escopo/expiração. (Princípio P7.)

### 2. Integridade e durabilidade dos dados

- **Requisito:** **nenhuma perda** de Pet, Evento ou documento confirmado
  (critério de saída do MVP); invariantes de domínio sempre verdadeiras.
- **Como medir:** RPO baixo (backups automáticos + PITR quando disponível); 0
  violação de invariante em produção; reconciliação banco × S3 sem órfãos.
- **Tática:** invariantes na raiz do agregado (P4); transações no Postgres;
  metadado no banco + binário no S3 com exclusão coordenada.

### 3. Confiabilidade dos lembretes

- **Requisito:** lembrete (vacina/medicamento/consulta) **não duplica nem some**
  — é o coração do valor recorrente.
- **Como medir:** 0 disparo duplicado / perdido em teste de reentrância;
  idempotência verificada.
- **Tática:** scheduler in-process com **advisory lock** + tabela de jobs/outbox;
  disparo idempotente. (Fila externa só com ADR.)

### 4. Manutenibilidade e legibilidade (humano + agente)

- **Requisito:** o sistema é compreensível e modificável por uma pessoa e por
  agentes de IA sem contexto adicional.
- **Como medir:** módulos coesos (um por agregado); ausência de dependência
  cruzada por banco; nomes do `GLOSSARY`; docs como fonte-da-verdade atualizada.
- **Tática:** Modular Monolith, contratos declarativos, baixa "magia". (P1, P2, P6.)

### 5. Observabilidade

- **Requisito:** todo caminho crítico é observável.
- **Como medir:** logs estruturados com `petId` no contexto; traces e métricas
  dos fluxos do MVP; health checks.
- **Tática:** OpenTelemetry → serviço gerenciado. (P8.)

### 6. Desempenho / latência

- **Requisito (direcional):** leituras comuns (Timeline, Histórico) com p95
  ~< 300 ms na carga do MVP; baseline a confirmar nos primeiros 30 dias.
- **Como medir:** métricas de latência por endpoint (OTel).
- **Tática:** Postgres com índices adequados; sem cache distribuído no MVP (P5).

### 7. Disponibilidade (proporcional)

- **Requisito:** disponibilidade "boa o suficiente" para um MVP de produto
  pessoal; **sem** HA/multi-região agora.
- **Como medir:** uptime monitorado; janela de manutenção aceitável.
- **Tática:** instância única + backups; multi-região só mediante ADR (gatilho:
  requisito explícito de disponibilidade).

### 8. Portabilidade (dados do Tutor)

- **Requisito:** o Tutor exporta o Histórico completo (Timeline + Carteira) em
  formato legível.
- **Como medir:** exportação disponível e validada (critério de saída do MVP).
- **Tática:** caso de uso de exportação no módulo `pets`. (Princípio #3 de produto.)

### 9. Escalabilidade (caminho, não meta do MVP)

- **Requisito:** ter **caminho** para milhões sem reescrever o núcleo — não
  atingir escala agora.
- **Como medir:** N/A no MVP; revisitar quando o sinal aparecer.
- **Tática:** Modular Monolith + contratos estáveis; escala vertical primeiro;
  read-replicas / extração de serviço / fila só com ADR.

---

## Trade-offs assumidos

Decorrentes do [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md):

- **Cliente universal:** paridade **funcional** mobile+web priorizada sobre
  polimento de web desktop — mitigado pelo spike-gate (ver `TECHNOLOGY_STACK`).
- **Auth próprio:** soberania de dados priorizada sobre menor carga operacional
  (manutenção de segurança recai sobre o time solo).
- **Simplicidade > disponibilidade:** sem HA no MVP — aceito conscientemente.

---

## Resumo

| Atributo | Prioridade | Meta (direcional) |
|----------|-----------|-------------------|
| Segurança/Privacidade (LGPD) | Máxima | 0 acesso sem vínculo; export/exclusão ok |
| Integridade/durabilidade | Máxima | 0 perda confirmada; invariantes sempre ok |
| Confiabilidade de lembretes | Alta | 0 duplicado/perdido |
| Manutenibilidade/legibilidade | Alta | módulos coesos; sem acoplamento por banco |
| Observabilidade | Alta | caminhos críticos observáveis |
| Desempenho | Média | p95 ~< 300 ms (baseline a confirmar) |
| Disponibilidade | Média (proporcional) | sem HA no MVP |
| Portabilidade | Média | exportação do Histórico disponível |
| Escalabilidade | Baixa (no MVP) | caminho sem reescrita |

---

## Critérios

Este documento é considerado pronto quando:

- [x] Lista os atributos priorizados com requisito, como medir e tática.
- [x] Mantém as metas direcionais e proporcionais ao MVP (sem SLA prematuro).
- [x] Registra os trade-offs assumidos, coerentes com o ADR-0002.
- [x] Não decide stack/componentes nem repete princípios.
- [ ] Metas numéricas (latência, RPO) calibradas com baseline real nos primeiros 30 dias.
