---
title: Observability
status: draft
version: "1.2"
updated: 2026-09-10
scope: >
  Como o PetDots é observável: logs estruturados (com storeId/orderId no contexto), métricas,
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
> `userId`, `storeId`, `orderId`) são definidos em
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

## Estado real da instrumentação (08/09/2026)

> Esta seção diz o que **existe**; as seções seguintes dizem o que se **pretende**.
> A distinção importa: um agente que leia o alvo como se fosse o estado
> instrumenta o que já está instrumentado e ignora o que falta.

Instrumentado na `pd-04` ([ADR-0006](../06-decisions/ADR/0006-instrumentacao-opentelemetry.md)):

| Sinal | Estado | Como |
|---|---|---|
| **Tracing** | ✅ existe | SDK OTel no processo da API, export OTLP/HTTP. Instrumentações: HTTP, Express, pino e Prisma — span de query no mesmo trace do request |
| **Métricas** | ✅ existe | `PeriodicExportingMetricReader` via OTLP. `http.server.request.duration` sai automaticamente da instrumentação HTTP |
| **Logs** | ⚠️ parcial | Seguem estruturados em **stdout**, agora com `trace_id`/`span_id` para correlacionar. **Não** são enviados a backend de telemetria — depende de decidir o deploy (no backlog) |
| **Health** | ✅ existe | `GET /api/v1/health` desde o `pd-01`: processo + conexão Postgres, reportados em separado |

**Ligado por variável de ambiente, desligado por padrão.** Sem
`OTEL_EXPORTER_OTLP_ENDPOINT` o SDK não sobe — e o processo **sempre** loga no
boot se subiu ou por qual motivo não subiu. Telemetria mal configurada não
quebra nada, ela silencia; a linha de boot é o que torna isso localizável.

**Para ver telemetria em desenvolvimento:** `npm run otel:up` levanta um coletor
OTel local (profile `observability` do compose) que imprime o que recebe.

**O que ainda não existe:** destino gerenciado escolhido, painéis, alertas e
envio de logs. Cada um é item de backlog com gatilho — todos dependem de haver
ambiente de deploy.

**Regra que nasce com a instrumentação:** atributo de span **nunca** carrega
segredo nem PII. Span não é trilha de auditoria (que responde "quem fez o quê");
confundir os dois é como identidade e dado pessoal acabam em telemetria. Ver
[`SECURITY`](./SECURITY.md) e ADR-0006 #6.

---

## Os três sinais + health

Padrão **OpenTelemetry** (vendor-neutral) exportando para um **serviço gerenciado**
— sem Prometheus/Grafana/Loki próprios no MVP (ADR-0002 / `TECHNOLOGY_STACK`).

### Logs estruturados

- Formato **estruturado** (JSON), em **inglês** (`AI_CODING_RULES`).
- Cada log carrega os campos canônicos do `NAMING_CONVENTIONS`: `timestamp`,
  `correlationId`, `requestId`, `userId` (quando houver) e **`storeId`/`orderId`
  quando o contexto envolver loja ou pedido** (regra recorrente em
  `AI_CODING_RULES` e P8).
- **Nunca registrar informação sensível** (segredo, token, dado de pagamento,
  payload de webhook, endereço completo do tutor, PII além do necessário) —
  `NAMING_CONVENTIONS` e [`SECURITY`](./SECURITY.md).

### Métricas

- Métricas por endpoint dos fluxos do MVP (latência, throughput, erros), base para
  acompanhar a meta direcional de desempenho (p95 ~< 300 ms na busca do
  comparador e na fila de pedidos — `QUALITY_ATTRIBUTES` #6).
- Métricas dos lembretes (execuções, duplicados/perdidos = 0) sustentam o atributo
  #3 de confiabilidade.
- Métricas da fronteira de dinheiro: webhooks recebidos × processados, repasses
  liquidados e divergências de conciliação — sustentam o atributo #2.

### Tracing

- **Traces** com propagação de `correlationId`/contexto pelos fluxos principais
  (pedido ponta a ponta, webhook do PSP, busca do comparador, scheduler de
  reposição — ver `SYSTEM_ARCHITECTURE`), para diagnosticar latência e falhas
  ponta a ponta.

### Health checks

- **Health/readiness** expostos pela API (estado do processo e da conexão com o
  Postgres), consumidos pelo ambiente de execução (ver [`DEPLOYMENT`](./DEPLOYMENT.md)).

---

## O que observar nos caminhos críticos do MVP

| Fluxo (`SYSTEM_ARCHITECTURE`) | Sinal-chave |
|-------------------------------|-------------|
| Cadastro + auth | taxa de erro de login, latência; tentativas falhas (sem vazar credencial) |
| Pedido ponta a ponta | latência e taxa de erro por transição (`order.placed` → `payment.captured` → `order.delivered`); **pedidos pagos sem aceite** |
| Webhook do PSP | recebidos × processados, assinatura inválida, **reentregas absorvidas pela idempotência** |
| Conciliação diária | divergências entre `payments`/`payouts` e o extrato do PSP (**meta: zero**) |
| Busca do comparador | latência p95 e volume de `offers.search`; buscas sem resultado no bairro |
| Reposição (scheduler) | execuções, **0 lembrete duplicado/perdido**, atrasos |
| Exportação de dados do tutor | sucesso/duração da exportação (critério de saída do MVP) |
| Acesso a dado de loja | trilha de auditoria (via interceptor — `SECURITY`) |

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define logs estruturados com os campos canônicos do `NAMING_CONVENTIONS` (incl. `storeId`/`orderId`).
- [x] Cobre métricas, tracing (OTel → serviço gerenciado) e health checks.
- [x] Lista o que observar nos fluxos críticos do MVP, ligando aos atributos de qualidade.
- [x] Reforça "não logar sensível" remetendo a `SECURITY`, sem repetir a postura.
- [x] SDK OTel instrumentado na API, com traces e métricas saindo por OTLP (`pd-04`, ADR-0006).
- [ ] Serviço gerenciado de destino escolhido — gatilho: existir ambiente de deploy.
- [ ] Painéis/alertas concretos definidos quando o serviço gerenciado for escolhido.
- [ ] Logs enviados ao backend de telemetria (hoje só stdout, já com `trace_id`).
