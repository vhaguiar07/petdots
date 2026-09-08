---
title: "ADR-0006: Instrumentação OpenTelemetry da API"
status: accepted
version: "1.0"
updated: 2026-09-08
scope: >
  Como o OpenTelemetry é instrumentado na API do PetDots: instrumentações
  escolhidas, ponto de partida do SDK, contrato de variáveis de ambiente,
  desligamento por padrão, coletor local de desenvolvimento e a regra de nunca
  colocar segredo ou PII em atributo de span. Registra também o shortlist e o
  critério para escolher o serviço gerenciado de destino, cuja decisão fica
  adiada até existir ambiente de deploy.
relates_to:
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0005-bootstrap-monorepo.md
  - 03-engineering/OBSERVABILITY.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 00-foundation/NAMING_CONVENTIONS.md
type: decision
---

# ADR-0006: Instrumentação OpenTelemetry da API

## Contexto

O [ADR-0002](0002-stack-tecnologica-fundacao.md) #10 fixou **OpenTelemetry
(vendor-neutral) exportando para um serviço gerenciado**, sem operar
Prometheus/Grafana/Loki próprios no MVP. O [ADR-0005](0005-bootstrap-monorepo.md)
#11 deixou o OTel **deliberadamente fora** do bootstrap, como tarefa própria.

O bootstrap entregou apenas dois dos quatro sinais da
[`OBSERVABILITY`](../../03-engineering/OBSERVABILITY.md): logs estruturados
(pino, com `requestId`/`correlationId`) e health check. Faltavam **métricas** e
**tracing**.

Duas forças definiram o momento e o escopo desta decisão:

1. **A janela é agora.** Nenhum módulo de domínio existe (o `schema.prisma` não
   tem models; a única rota é `/api/v1/health`). Instrumentar a fiação antes do
   primeiro agregado é barato; retroinstrumentar rota por rota, depois, não é.
2. **Não existe ambiente de produção.** Sem deploy, não há o que observar num
   painel — e painel/alerta construído contra um ambiente que não existe
   envelhece antes do primeiro uso.

Dessas duas forças sai a divisão desta decisão: **a fiação entra agora; a
escolha do destino, não.**

## Decisão

### 1. Instrumentações escolhidas a dedo, não o bundle automático

Quatro instrumentações: `instrumentation-http`, `instrumentation-express`,
`instrumentation-pino` e `@prisma/instrumentation`.

O `@opentelemetry/auto-instrumentations-node` foi **medido em 08/09/2026: 49
dependências**, aplicando patch em Redis, MongoDB, AWS, Kafka e outros — nada
disso existe no projeto.

### 2. O SDK sobe pelo primeiro import do `main.ts`

`import './instrumentation';` é a **primeira linha de import** de
`apps/api/src/main.ts`. As instrumentações aplicam patch por hook de `require`,
e módulo já em cache nunca é patcheado; em CommonJS a ordem dos `require` segue
a ordem do fonte, então o import só-de-efeito posto no topo roda antes de todos
os outros.

⚠️ **Essa ordem é funcional, não estética.** Um "organize imports" do editor
ordena `./app.module` na frente e **apaga a telemetria sem erro nenhum**.

### 3. Configuração própria, lida antes do Nest existir

As variáveis `OTEL_*` são lidas e validadas com Zod em
`apps/api/src/otel/otel.config.ts`, **não** pelo `ConfigModule`: o SDK precisa
subir antes de o Nest existir, e o `ConfigModule.forRoot({ validate })` só roda
na avaliação do `AppModule`.

Como consequência, o `instrumentation.ts` carrega o `.env` da raiz por conta
própria, com o `process.loadEnvFile()` nativo do Node 24 — **sem isso,
`OTEL_EXPORTER_OTLP_ENDPOINT` posto no `.env` seria invisível para o SDK**
(o `@nestjs/config` só copia o arquivo para `process.env` mais tarde).
Verificado em 08/09/2026: variável real de ambiente tem precedência sobre o
arquivo, então config de container não é sobrescrita por um `.env` esquecido.

### 4. Desligado por padrão, e sempre dizendo por quê

O SDK **não sobe** quando: `NODE_ENV=test`, `OTEL_SDK_DISABLED=true`, o endpoint
não está definido, ou a configuração é inválida. Cada caso tem um `reason`
próprio, e o processo **sempre** escreve uma linha no boot com o resultado.

**Telemetria mal configurada não quebra nada — ela silencia.** E silêncio é
indistinguível de "ainda não houve tráfego". A linha de boot é o que torna a
falha localizável, e é por isso que a validação do endpoint fixa o protocolo:
`z.url()` puro aceita `htp:/host:4318` como URL válida, o que construiria um
exportador apontando para o vazio.

### 5. Coletor local para provar o pipeline, sem vendor

`docker-compose.yml` ganha um `otel-collector` atrás do profile
`observability` (`npm run otel:up`), com exporter `debug`. Prova endpoint,
caminho do sinal, protocolo e headers de ponta a ponta, sem cadastro em serviço
nenhum e sem custo.

**Não contraria o ADR-0002 #10:** é coletor efêmero de desenvolvimento, atrás de
profile, que nunca vai para produção — não é infraestrutura de observabilidade
própria.

### 6. Span nunca carrega segredo nem PII

Corpo de request e headers **não** são capturados. Um span não é trilha de
auditoria, e atributo de span é o lugar mais fácil de vazar token ou dado
pessoal ([`SECURITY`](../../03-engineering/SECURITY.md),
[`DIRETRIZES_FLUXO_IA`](../../07-process/DIRETRIZES_FLUXO_IA.md) §9). O padrão
das instrumentações já os omite; esta decisão proíbe habilitá-los sem pesar isso.

### 7. `/api/v1/health` continua tracejado; só o Swagger é ignorado

O `ignoreIncomingRequestHook` descarta apenas `/api/docs` e seus assets. O
health seria ruído se algo o sondasse em intervalo — e não existe orquestrador
nenhum ainda. Hoje ele é a **única** rota real, ou seja, o único alvo para
verificar a instrumentação. A exclusão está no backlog, com gatilho.

### 8. O serviço gerenciado de destino fica para depois

**Shortlist**, todos OTLP-nativos e com free tier: **Grafana Cloud**, **New
Relic**, **Honeycomb**, **Axiom**.

**Critério de escolha:** cobrir os três sinais; endpoint OTLP nativo (sem SDK
proprietário, que mataria o vendor-neutral do ADR-0002 #10); free tier que
aguente o piloto; custo previsível depois.

⚠️ **Os limites de cada free tier precisam ser conferidos na página de preços do
fornecedor no momento da escolha** — não há número fixado aqui de propósito,
porque envelheceria.

**Gatilho:** existir ambiente de deploy. A assimetria que justifica adiar: no
**código** a troca de vendor custa duas variáveis de ambiente; **fora dele**
custa painéis, alertas e histórico. Adiar a parte cara até haver o que observar
não custa nada.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| **`@opentelemetry/auto-instrumentations-node`** | 49 dependências e patch em bibliotecas inexistentes no projeto (medido em 08/09/2026). Reavaliar se o projeto passar a usar Redis, filas ou SDKs de nuvem |
| **`nestjs-otel`** (8.1.1, peer Nest `>=11 <13` — seria compatível) | Agrega decorators de métrica e middleware de métricas HTTP. As métricas HTTP já saem da `instrumentation-http`, e decorator de métrica só ganha uso quando existir módulo de domínio. Reavaliar então |
| **`node -r ./dist/instrumentation.js` em vez do primeiro import** | É imune a reordenação de import — a vantagem real. Mas exigiria mudar `start:prod`, o smoke do CI e o `nest start --watch`: três pontos de configuração para um ganho que um comentário e a linha de boot cobrem. **Reabrir se a ordem do import quebrar na prática** |
| **SDK proprietário de vendor** (Datadog, New Relic agent) | Mata o vendor-neutral do ADR-0002 #10 e amarra o código ao fornecedor |
| **Self-host de Prometheus/Grafana/Loki** | **Conflita com o ADR-0002 #10**, que explicitamente veta operar essa infraestrutura no MVP. Não é proposto — e a exceção do coletor local (decisão 5) é de desenvolvimento, efêmera, não operada |
| **Escolher o vendor agora e ligar com chave real** | Ganho legítimo: provaria autenticação e endpoint de verdade, não só contra coletor local. Descartado no portão (Victor, 08/09/2026) porque não há ambiente de produção para observar, e painel/alerta sem ambiente envelhece antes do uso |
| **Enviar logs ao backend de telemetria nesta entrega** | Exige decidir o deploy (agente coletor × transport do pino), que não existe. Os logs seguem em stdout, agora com `trace_id`/`span_id` para correlacionar quando o envio existir. No backlog |
| **Sentinela automatizado de span (Jest)** | **Medido em 08/09/2026: não funciona sob Jest.** O Jest substitui o sistema de módulos por um registry próprio, e o hook de `require` do OTel engancha o `Module._load` real — dentro de um spec, `require('http').createServer` volta sem patch. A cobertura automatizada ficou nas partes que são código próprio (`resolveOtelConfig`, `signalUrl`, `shouldIgnoreRequest`); a existência de span de verdade é provada contra o coletor local, e o sentinela automatizado está no backlog |

## Consequências

**Positivas**

- Traces, métricas e correlação de log passam a existir **antes** do primeiro
  módulo de domínio: cada rota nova nasce instrumentada, sem trabalho extra.
- Span de HTTP, de Express e de **query Prisma** no mesmo trace, e o `trace_id`
  do span aparece na linha de log do request — verificado contra o coletor local
  em 08/09/2026.
- Trocar de fornecedor custa duas variáveis de ambiente.
- CI e suíte de testes seguem intocados: sem endpoint configurado, o SDK não
  sobe.

**Negativas / custos assumidos**

- **A ordem do primeiro import é frágil por natureza** e não há regra de lint
  que a proteja. A defesa é o comentário no `main.ts` e a linha de boot.
- **Não há sentinela automatizado** provando que spans existem (limitação do
  Jest, acima). A prova é manual, contra o coletor local.
- `@prisma/instrumentation` fica pinado em `6.19.3`, casado com a versão do
  Prisma: **sobe junto** no upgrade para o Prisma 7 (já no backlog).
- A linha `0.x` dos pacotes de SDK/exportador do OTel gira rápido; bumps vão
  exigir reconferência periódica.
- O `instrumentation.ts` passa a popular `process.env` a partir do `.env` antes
  do Nest — mesmos valores que o `ConfigModule` já usava, mas agora visíveis
  globalmente no processo.

## Status

`accepted` — 08/09/2026, na tarefa `pd-04`.
