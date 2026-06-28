---
title: Observability
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Como o PetDots é observável: logs estruturados (com petId no contexto), métricas,
  tracing distribuído (OpenTelemetry) e health checks. Realiza o atributo #5 de
  QUALITY_ATTRIBUTES e o princípio P8. Para os CAMPOS de log canônicos referencia
  NAMING_CONVENTIONS; para o destino/serviço gerenciado, TECHNOLOGY_STACK; não
  repete a postura de segurança (SECURITY).
relates_to:
  - 02-architecture/QUALITY_ATTRIBUTES.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 00-foundation/NAMING_CONVENTIONS.md
  - 03-engineering/SECURITY.md
type: engineering
---

# PetDots — Observability

> Os **campos de log** canônicos (`timestamp`, `correlationId`, `requestId`,
> `userId`, `petId`) são definidos em
> [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md) (seção "Logs") —
> aqui definimos **como observar**, não os formatos. Realiza o atributo #5 de
> [`QUALITY_ATTRIBUTES`](../02-architecture/QUALITY_ATTRIBUTES.md) e o princípio P8.

---

## Objetivo

Garantir que **todo caminho crítico do PetDots seja observável** — "todo
componente importante deverá ser observável" (`AGENTS.md`, P8). Proporcional ao
MVP: cobrir os fluxos do MVP, sem operar infraestrutura de observabilidade
própria.

**Não cobre:** as **metas** (p95, uptime) → `QUALITY_ATTRIBUTES`; o **destino**
(serviço gerenciado) e as ferramentas → [`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md);
o que **não** pode ser logado e por quê → [`SECURITY`](./SECURITY.md).

---

## Os três sinais + health

Padrão **OpenTelemetry** (vendor-neutral) exportando para um **serviço gerenciado**
— sem Prometheus/Grafana/Loki próprios no MVP (ADR-0002 / `TECHNOLOGY_STACK`).

### Logs estruturados

- Formato **estruturado** (JSON), em **inglês** (`AI_CODING_RULES`).
- Cada log carrega os campos canônicos do `NAMING_CONVENTIONS`: `timestamp`,
  `correlationId`, `requestId`, `userId` (quando houver) e **`petId` quando o
  contexto envolver um Pet** (regra recorrente em `AI_CODING_RULES` e P8).
- **Nunca registrar informação sensível** (dado de saúde, segredo, token, PII além
  do necessário) — `NAMING_CONVENTIONS` e [`SECURITY`](./SECURITY.md).

### Métricas

- Métricas por endpoint dos fluxos do MVP (latência, throughput, erros), base para
  acompanhar a meta direcional de desempenho (p95 ~< 300 ms em leituras comuns —
  `QUALITY_ATTRIBUTES` #6).
- Métricas dos lembretes (execuções, duplicados/perdidos = 0) sustentam o atributo
  #3 de confiabilidade.

### Tracing

- **Traces** com propagação de `correlationId`/contexto pelos fluxos principais
  (cadastro, registro de Evento, upload, lembrete → Evento, exportação — ver
  `SYSTEM_ARCHITECTURE`), para diagnosticar latência e falhas ponta a ponta.

### Health checks

- **Health/readiness** expostos pela API (estado do processo e da conexão com o
  Postgres), consumidos pelo ambiente de execução (ver [`DEPLOYMENT`](./DEPLOYMENT.md)).

---

## O que observar nos caminhos críticos do MVP

| Fluxo (`SYSTEM_ARCHITECTURE`) | Sinal-chave |
|-------------------------------|-------------|
| Cadastro + auth | taxa de erro de login, latência; tentativas falhas (sem vazar credencial) |
| Registro de Evento / Timeline | latência de escrita; volume de `timeline.event.created` |
| Upload de documento (presigned) | sucesso/erro do fluxo; reconciliação banco × S3 |
| Lembrete → Evento | execuções, **0 duplicado/perdido**, atrasos |
| Exportação do Histórico | sucesso/duração da exportação (critério de saída do MVP) |
| Acesso a dado de Pet | trilha de auditoria (via interceptor — `SECURITY`) |

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define logs estruturados com os campos canônicos do `NAMING_CONVENTIONS` (incl. `petId`).
- [x] Cobre métricas, tracing (OTel → serviço gerenciado) e health checks.
- [x] Lista o que observar nos fluxos críticos do MVP, ligando aos atributos de qualidade.
- [x] Reforça "não logar sensível" remetendo a `SECURITY`, sem repetir a postura.
- [ ] Painéis/alertas concretos definidos quando o serviço gerenciado for escolhido.
