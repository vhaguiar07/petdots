---
title: "Relatório — pd-04/feat/instrumenta-opentelemetry"
status: stable
version: "1.0"
updated: 2026-09-08
scope: >
  Relatório de encerramento da tarefa pd-04: instrumentação OpenTelemetry da
  API — traces, métricas e correlação de log, com SDK desligado por padrão,
  coletor local de desenvolvimento e a escolha do serviço gerenciado adiada.
  Registra o que foi feito, as decisões e quem as tomou, as validações com
  números reais, dois achados de ambiente e as pendências geradas.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 07-process/BACKLOG.md
  - 06-decisions/ADR/0006-instrumentacao-opentelemetry.md
type: process
---

# pd-04/feat/instrumenta-opentelemetry

**Encerrada em:** 08/09/2026
**Merge:** `49f1195` em `master` (squash via PR #3)
**ADR:** [0006 — Instrumentação OpenTelemetry da API](../../../06-decisions/ADR/0006-instrumentacao-opentelemetry.md)

---

## Objetivo

Segunda das duas branches em que a triagem dos 8 itens de débito técnico foi
agrupada, a pedido do Victor (08/09/2026):

> "Dos débitos técnicos, quantos se encaixam numa branch só? [...] não vale a
> pena pra mim abrir 8 branches só pra isso, prefiro matar em menos se possível"

E, para esta: *"Agora crie o plano para a outra branch"*. A primeira foi a
[`pd-03`](pd-03-chore-eslint-10-e-dep-check.md).

O item do backlog era **"OpenTelemetry ainda não instrumentado"**, que o
[ADR-0005](../../../06-decisions/ADR/0005-bootstrap-monorepo.md) #11 deixou
deliberadamente fora do bootstrap. A urgência não era o sinal em si, e sim a
janela: **nenhum módulo de domínio existe ainda** (o `schema.prisma` não tem
models; a única rota é `/api/v1/health`), e retroinstrumentar rota por rota é
mais caro do que instrumentar a fiação antes.

A tarefa rodou em **um chat só**: Fase 1 (análise) e Fase 2 (implementação) em
Opus, 08/09. O plano `PLANS/plan-a.md` foi escrito como handoff autossuficiente
mesmo assim, e descartado no encerramento.

## Diagnóstico

| # | O que estava faltando | Como se sabe |
|---|---|---|
| 1 | Dois dos quatro sinais da `OBSERVABILITY`: **métricas e tracing** inexistentes | O bootstrap entregou só logs (pino) e health check; ADR-0005 #11 registra a exclusão explícita |
| 2 | O **destino** (serviço gerenciado) nunca foi escolhido | `TECHNOLOGY_STACK` dizia apenas "OpenTelemetry → serviço gerenciado", sem nome; o critério de pronto da `OBSERVABILITY` sobre painéis/alertas estava desmarcado desde 27/06 |
| 3 | A `OBSERVABILITY` descrevia o **alvo como se fosse o estado** | Leitura do documento contra o código: nada distinguia "existe" de "pretende-se" |

## O que foi feito

Commit único: `49f1195` (squash de 18 arquivos).

- **`apps/api/src/otel/otel.config.ts`** (novo) — a decisão de ligar ou não,
  isolada numa função pura que devolve união discriminada: `enabled`, ou
  `disabled` com um `reason` entre `test-env`, `sdk-disabled`, `no-endpoint` e
  `invalid-config`. Valida as variáveis `OTEL_*` com Zod e **nomeia a variável
  problemática sem nunca imprimir o valor** (o header carrega chave de API).
- **`apps/api/src/otel/otel.sdk.ts`** (novo) — monta o `NodeSDK`: resource com
  `service.name`/`deployment.environment.name`, exportadores OTLP/HTTP de trace
  e métrica, e as quatro instrumentações. Inclui `signalUrl()`, que acrescenta
  `/v1/traces` e `/v1/metrics` ao endpoint — sufixo que só é automático quando o
  SDK lê a variável por conta própria, e cuja ausência renderia 404 por export.
- **`apps/api/src/instrumentation.ts`** (novo) — o efeito colateral: resolve a
  config, **sempre** escreve a linha de boot, e sobe o SDK com flush em
  `SIGTERM`/`SIGINT`.
- **`apps/api/src/main.ts`** — `import './instrumentation';` como primeira linha
  de import, com comentário explicando que a ordem é funcional: patch por hook
  de `require` não alcança módulo já em cache, e "organize imports" apagaria a
  telemetria em silêncio.
- **`otel/collector-config.yaml`** + **`docker-compose.yml`** + **scripts** —
  coletor OTel local atrás do profile `observability`
  (`npm run otel:up` / `otel:down`), com exporter `debug`.
- **`.env.example`** — bloco de OTel comentado, com placeholder de chave e aviso
  de não commitar o valor real.
- **Testes** — `otel.config.spec.ts` (13) e `otel.sdk.spec.ts` (7).
- **Docs** — ADR-0006 novo; `OBSERVABILITY` v1.1 ganhou uma seção "Estado real
  da instrumentação" separando o que existe do que se pretende, e três critérios
  novos (dois desmarcados); `NAMING_CONVENTIONS` v1.1 registra `trace_id`,
  `span_id` e `trace_flags` como campos canônicos, explicando **por que ficam em
  snake_case** (são nomes do padrão OTel; renomear quebraria a correlação);
  `TECHNOLOGY_STACK` v1.3 e `PROJECT_STATE` v4.1 atualizados.

### Três decisões de implementação que valem registro

**O `.env` era invisível para o SDK — e o defeito era meu.** O `.env.example`
que eu mesmo escrevi mandava pôr `OTEL_EXPORTER_OTLP_ENDPOINT` no `.env`, mas o
`@nestjs/config` só copia o arquivo para `process.env` quando o `ConfigModule`
roda — depois da instrumentação. Seguir a própria instrução daria telemetria
muda. Corrigido com `process.loadEnvFile()` nativo do Node 24, e **verificado
que variável real de ambiente tem precedência sobre o arquivo**, para que config
de container não seja sobrescrita por um `.env` esquecido.

**`z.url()` puro não pega typo de esquema.** O teste de config reprovou na
primeira execução: `htp:/localhost:4318` passava como URL válida, o que
construiria um exportador apontando para o vazio — exatamente a falha silenciosa
que o módulo existe para evitar. Apertado para
`z.url({ protocol: /^https?$/ })`.

**Bundle automático descartado por medição, não por gosto.** O
`@opentelemetry/auto-instrumentations-node` arrasta **49 dependências** e aplica
patch em Redis, MongoDB, AWS e Kafka — nada disso existe no projeto. Quatro
instrumentações escolhidas a dedo no lugar.

## Migrations

**Nenhuma.** E nenhuma mudança no `schema.prisma`: medido em 08/09/2026 que o
tracing é **GA** no Prisma 6.19.3 — `prisma validate` com
`previewFeatures = ["tracing"]` responde *"Preview feature 'tracing' is
deprecated. The functionality can be used without specifying it as a preview
feature"*.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| Adiar a escolha do vendor; instrumentar vendor-neutral e provar contra coletor local | **Usuário** (portão, 08/09) — aceitou a recomendação da IA |
| Fase 2 em Opus, IA sozinha | **Usuário** (portão, 08/09) |
| Fase 1 em **Opus**, divergindo da recomendação da IA (que era **Fable**, por ser decisão de vendor com custo de reversão) | **Usuário** (08/09) |
| Instrumentações a dedo em vez do bundle de 49 deps | IA (Fase 1, medido com `npm view`) |
| Sem `nestjs-otel` — métricas HTTP já saem da instrumentação, e decorator de métrica só ganha uso com domínio | IA (Fase 1) |
| SDK sobe pelo primeiro import do `main.ts`, não por `node -r` (que exigiria mudar `start:prod`, smoke do CI e `nest start --watch`) | IA (Fase 1) |
| Config de OTel lida com Zod fora do `ConfigModule`, porque o SDK precede o Nest | IA (Fase 1) |
| Carregar o `.env` com `process.loadEnvFile()` dentro da instrumentação | IA (Fase 2 — sem isso, endpoint no `.env` seria invisível) |
| `/api/v1/health` segue tracejado; só `/api/docs` é ignorado | IA (Fase 1 — é a única rota real hoje, logo o único alvo de verificação) |
| Span nunca carrega corpo, header de autenticação nem PII | IA (Fase 1 — span não é trilha de auditoria) |
| Sem ADR para a escolha de vendor agora; o ADR-0006 registra shortlist, critério e gatilho | IA (Fase 1) |
| Acionar o fallback do plano no sentinela de span, em vez de maquiar o teste | IA (Fase 2 — limitação do Jest, medida) |

## Validações

Bateria completa após `npm install`, e as provas de comportamento contra o
**coletor local real** (não só compilação).

| O quê | Resultado |
|---|---|
| Lint | **5/5 tasks**, exit 0 |
| Checagem de tipos | **5/5 tasks**, exit 0 |
| Build | **3/3 tasks**, exit 0 |
| Testes | **4 suítes, 30 testes** — `domain` 8, `api` 22 (20 novos de OTel + 2 de health) |
| Teste de contrato | **1 suíte, 1 teste**, sem regravar o snapshot |
| Formatação | `prettier --check` limpo |
| `npm audit` | 3 `high`, mesma cadeia pré-existente `prisma → @prisma/config → deepmerge-ts` — sem regressão |
| Suíte anterior | intacta: health e2e em **6,41s** (era ~7,7s antes; mesmo patamar) |
| **CI run `34258849080`** (push) | **verde**, 1m08s |
| **CI run `34258927258`** (pull_request) | **verde**, 1m00s |
| Smoke de boot no CI | `OpenTelemetry: disabled — OTEL_EXPORTER_OTLP_ENDPOINT is not set` seguido de `boot OK — health respondeu 503` — o caminho desligado provado em ambiente real |

### Provas contra o coletor local

| O quê | Resultado observado |
|---|---|
| Linha de boot com endpoint | `OpenTelemetry: exporting to http://localhost:4318 as "petdots-api" (development)` |
| Span de servidor HTTP | `GET /api/v1/health` — **5 spans em 5 requests** |
| Spans de Express | `request handler - /api/v1/health`, `middleware - jsonParser`, `middleware - urlencodedParser` |
| **Spans de Prisma** | `prisma:client:operation`, `prisma:engine:query`, `prisma:engine:db_query`, `prisma:engine:serialize` |
| **Trace único ponta a ponta** | `trace_id` da linha de log (`6498c90eda725612d682a2d0e54361d3`) idêntico ao do span HTTP **e** ao do span Prisma |
| Métricas | `http.server.request.duration` e `http.client.request.duration` recebidas |
| `/api/docs` ignorado | **0** spans de servidor, contra 5 do health |
| Endpoint vindo do `.env` | Reconhecido (`.env` restaurado com **checksum idêntico** após o teste) |
| Caminhos desligados | `no-endpoint`, `invalid-config` (nomeando `OTEL_EXPORTER_OTLP_ENDPOINT`) e `sdk-disabled` |
| **Segredo em span ou log** | **0 ocorrências** do token enviado em `authorization`; **0 ocorrências** da chave na linha de `invalid-config` |

### Prova de vermelho

| # | Mutação aplicada | O que caiu |
|---|---|---|
| 1 | Endpoint com typo de esquema (`htp:/localhost:4318`) contra a validação original (`z.string().url()`) | `otel.config.spec.ts` — **1 falhou**, expondo que a URL era aceita e o exportador apontaria para o vazio. Corrigido para `z.url({ protocol: /^https?$/ })`, defeito **encontrado antes de existir** |

### Um teste que não foi possível automatizar

O sentinela que provaria "um request produz um span" **não funciona sob Jest**,
e a causa foi medida em 08/09/2026, não suposta: o Jest substitui o sistema de
módulos por um registry próprio, e o hook de `require` do OTel engancha o
`Module._load` real. Dentro de um spec,
`require('http').createServer.__wrapped` volta `undefined` — o patch nunca é
aplicado. Duas tentativas foram feitas (registro no corpo do spec e, depois, num
módulo importado antes de tudo, mesma técnica do `main.ts`); a segunda também
mediu zero spans.

Conforme o fallback previsto no próprio plano, **o teste não foi maquiado**: foi
removido, a cobertura automatizada ficou no que é código próprio
(`resolveOtelConfig`, `signalUrl`, `shouldIgnoreRequest` — 20 testes), a
existência de span foi provada contra o coletor local, e o sentinela
automatizado virou item de backlog com a medição.

## Pendências geradas

Registradas no [`BACKLOG.md`](../../BACKLOG.md), seção "Débito técnico":

- **Serviço gerenciado de observabilidade não escolhido** — gatilho: existir
  ambiente de deploy. Shortlist (Grafana Cloud, New Relic, Honeycomb, Axiom) e
  critério no ADR-0006 #8.
- **Painéis e alertas não definidos** — gatilho: vendor escolhido.
- **Logs não chegam ao backend de telemetria** — seguem em stdout, já
  correlacionáveis por `trace_id`; enviar exige decidir o deploy.
- **`/api/v1/health` não excluído dos traces** — gatilho: existir orquestrador
  fazendo probe.
- **Sem teste automatizado provando que spans existem** — com a medição da
  limitação do Jest e as duas saídas possíveis (script Node no CI × migrar a
  suíte para Vitest).
- **Containers órfãos do protótipo legado rodando no ambiente local** —
  verificado com `docker ps` + `docker inspect`: `petdots-grafana` (3300),
  `petdots-loki` (3100), `petdots-minio` (9000/9001) e `petdots-postgres`
  (**5436**), todos do compose legado que a `pd-01` apagou do disco sem parar os
  containers, de pé há 3 semanas. Riscos: confusão do Postgres da 5436 com o do
  MVP na 5437, aparência de contradição ao ADR-0002 #10 (Grafana/Loki próprios),
  e consumo de recurso. Ação é decisão do Victor.

**Corrigido de passagem** (achado na Fase 2, corrigido na mesma tarefa conforme
`DIRETRIZES_FLUXO_IA` §4): o `TECHNOLOGY_STACK` ainda declarava **ESLint 9.39.5
+ typescript-eslint 8.69** na tabela de versões pinadas, defasado desde a
`pd-03` do mesmo dia. Atualizado para 10.10.0 / 8.70, com a linha do
`eslint-plugin-import-x`.

**Saiu do backlog:** "OpenTelemetry ainda não instrumentado".

## As três avaliações da Fase 1

| Eixo | Decisão |
|---|---|
| **Auditoria** | **Não se aplica — e o porquê importa.** Telemetria não é trilha de auditoria: trace responde "por onde passou e quanto demorou", auditoria responde "quem fez o quê, quando". Confundir as duas é como identidade e PII acabam em atributo de span, o que o ADR-0006 #6 proíbe explicitamente. A trilha de auditoria nasce com o primeiro módulo que tenha ação de usuário, via interceptor (`SYSTEM_ARCHITECTURE`). |
| **Documentação de domínio** | Nenhum documento de domínio foi contrariado (não há domínio implementado). Os de engenharia e fundação que descreviam o alvo como estado foram corrigidos na mesma entrega: `OBSERVABILITY` (seção nova separando existe × pretende-se), `NAMING_CONVENTIONS` (campos do OTel), `TECHNOLOGY_STACK`, `PROJECT_STATE`. Os exemplos defasados do produto "Vida do Pet" na `OBSERVABILITY` **não** foram tocados: são item de backlog próprio, e misturar as duas coisas atrapalharia a revisão. |
| **Testes** | Nasceram 20 testes: `otel.config.spec.ts` (a decisão de ligar/não-ligar, incluindo o caso que pegou o defeito do `z.url()`) e `otel.sdk.spec.ts` (o sufixo `/v1/<sinal>` e a regra de path ignorado). Nenhum teste existente mudou — o que era o próprio critério de aceitação nº 2, porque teste alterado significaria SDK subindo em teste. A cobertura que **falta** está no backlog, com a medição. |

## Estado ao encerrar

`master` = `49f1195`, local e remoto sincronizados, CI verde nos dois runs,
branch removida (local e remota), árvore limpa, plano descartado.

Diferente da `pd-03`, o merge e a sincronização do `master` local saíram limpos
de primeira: a pré-condição desta branch passou a incluir `git fetch` e
comparação com `origin/master` **antes** de ramificar — a correção de processo
que a divergência da `pd-03` sugeriu.

Próxima tarefa candidata: **`pd-02` — spike-gate do cliente universal**, que
segue sendo o bloqueador de toda UI de produto, ou a contradição entre
`MVP_SCOPE` e o ADR-0004, que o backlog marca como 🔴 e que precisa sair antes
de implementar escopo funcional.
