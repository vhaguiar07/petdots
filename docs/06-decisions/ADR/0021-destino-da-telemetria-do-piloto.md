---
title: "ADR-0021: O destino da telemetria do piloto é o Grafana Cloud"
status: stable
version: "1.0"
updated: 2026-09-13
scope: >
  Fecha a decisão #8 do ADR-0006, que adiou a escolha do serviço gerenciado de
  observabilidade até existir ambiente de deploy. O gatilho disparou com a
  pd-19. Traces e métricas da API passam a sair por OTLP para o Grafana Cloud
  no plano gratuito; os logs continuam no Railway, com retenção de 7 dias, e a
  razão de não os enviarem junto está registrada. Traz também a exclusão de
  /api/v1/health dos traces e a consequência no aviso de privacidade, que passa
  a declarar retenção de até 14 dias para registros técnicos. É decisão de
  fornecedor, tomada pelo Victor; a montagem da conta é da Etapa 2 da pd-19.
relates_to:
  - 03-engineering/OBSERVABILITY.md
  - 03-engineering/DEPLOYMENT.md
  - 03-engineering/SECURITY.md
  - 01-product/AVISO_DE_PRIVACIDADE.md
  - 06-decisions/ADR/0006-instrumentacao-opentelemetry.md
  - 06-decisions/ADR/0020-hosting-do-piloto-railway-e-cloudflare.md
  - 07-process/BACKLOG.md
type: decision
---

# ADR-0021: O destino da telemetria do piloto é o Grafana Cloud

## Contexto

O [ADR-0006](0006-instrumentacao-opentelemetry.md) instrumentou a API com
OpenTelemetry em 08/09/2026 e **adiou uma única coisa**, a decisão #8: para
qual serviço gerenciado exportar. Deixou a shortlist (Grafana Cloud, New Relic,
Honeycomb, Axiom), o critério, e um gatilho explícito — *"existir ambiente de
deploy"* — com o argumento que sustentava o adiamento:

> No **código** a troca de vendor custa duas variáveis de ambiente; **fora
> dele** custa painéis, alertas e histórico. Adiar a parte cara até haver o que
> observar não custa nada.

**O gatilho disparou com a `pd-19`**, a tarefa que publica o piloto
([ADR-0020](0020-hosting-do-piloto-railway-e-cloudflare.md)). Pela regra §3.2
do [`DIRETRIZES_FLUXO_IA`](../../07-process/DIRETRIZES_FLUXO_IA.md), item cujo
gatilho dispara resolve-se **na tarefa que o destravou**, e é o que este ADR
faz.

### O que já está pronto, e o que exatamente falta

| Peça | Estado |
|---|---|
| SDK OTel, quatro instrumentações escolhidas a dedo (HTTP, Express, pino, Prisma) | ✅ desde a `pd-04` |
| Exportador OTLP/HTTP de **traces** e de **métricas**, com o caminho do sinal montado por `signalUrl` | ✅ |
| Ligar/desligar por `OTEL_EXPORTER_OTLP_ENDPOINT`, com o motivo sempre logado no boot | ✅ |
| Autenticação por `OTEL_EXPORTER_OTLP_HEADERS` (formato `chave=valor`) | ✅ |
| Prova de ponta a ponta contra coletor local (`npm run otel:up`) | ✅ |
| **Destino real** | ❌ — é esta decisão |
| **Logs saindo do processo** | ❌ — ver a decisão 3 abaixo |
| Painéis e alertas | ❌ — dependiam do destino |

### A restrição, a mesma do hosting

O Victor declarou na `pd-19`: *"menor custo possível no início; nada pago antes
de estar em uso"*. O ADR-0020 fixou o teto prático — a infraestrutura inteira do
piloto custa **US$ 10-15 por mês** —, e observabilidade paga dobraria isso para
observar um serviço que ainda não tem usuários. **Free tier é requisito, não
preferência.**

### O que a due diligence encontrou (13/09/2026, páginas públicas de preço)

| | **Grafana Cloud Free** | New Relic Free | Honeycomb / Axiom |
|---|---|---|---|
| Métricas | **10 mil séries ativas** | incluídas na cota única | cobertura de métricas no free tier **não verificada** |
| Logs | **50 GB/mês** | incluídos na cota única | — |
| Traces | **50 GB/mês** | incluídos na cota única | — |
| Cota única de ingestão | — | **100 GB/mês** | — |
| Retenção | **14 dias** | **≥ 8 dias** | — |
| Usuários | **3** | **1** full platform | — |
| Alertas | não confirmado na página de preços | **incluídos** | — |
| Sondas sintéticas | não confirmado na página de preços | **500 checks** | — |
| OTLP nativo | sim | sim | sim |
| Cartão | não exige | não exige | — |

⚠️ **Honeycomb e Axiom não foram comparados a fundo.** O critério do ADR-0006
#8 exige **cobrir os três sinais**, e a cobertura de métricas no plano gratuito
dos dois não foi verificada. Ampliar a comparação adiaria a publicação sem
mudar a ordem dos dois primeiros — fica registrado como não avaliado, não como
descartado por mérito.

## Decisão

**Traces e métricas da API vão para o Grafana Cloud, plano gratuito, por
OTLP.** Os **logs continuam no Railway**. O `/api/v1/health` **sai dos traces**.

### O que decidiu: usuários e retenção, não preço

Os dois candidatos reais são gratuitos e OTLP-nativos, e nenhum dos dois seria
estourado pelo volume de um piloto de bairro. A escolha foi por duas diferenças
que **não** são técnicas:

1. **Três usuários contra um.** O PetDots tem **dois sócios**
   ([`PROJECT_STATE`](../../../PROJECT_STATE.md)), e o sócio está em Aracaju. Um
   único login *full platform* significaria que só uma pessoa pode olhar o
   sistema em produção — e, num incidente, que o outro depende de captura de
   tela. É a mesma razão pela qual o ADR-0009 existe: o que se compra é a
   capacidade de duas pessoas olharem a mesma coisa.
2. **14 dias de retenção contra 8.** O smoke test da Trilha B mede uma
   campanha que corre por semanas, e um problema que só aparece "na segunda de
   manhã" precisa de um histórico que atravesse mais de uma semana.

**O que se perde, e é aceito:** o New Relic confirma **alertas e 500 sondas
sintéticas** no plano gratuito, e a página de preços do Grafana **não confirma
nem uma coisa nem outra**. Se o cadastro mostrar que o Free não dá sonda, a
sonda HTTP do health vai para um monitor externo gratuito e isso fica
registrado no relatório da `pd-19` — é uma dependência a mais, não um
bloqueio. Não é motivo para trocar de vendor: sonda é commodity, login de sócio
não.

### O que esta decisão traz junto

| # | Decisão | Por quê |
|---|---|---|
| **T1** | **Três variáveis no serviço da API**, e nenhuma no código: `OTEL_EXPORTER_OTLP_ENDPOINT` (a **base**, sem `/v1/traces` — quem acrescenta o caminho do sinal é o `signalUrl`, ADR-0006 #3), `OTEL_EXPORTER_OTLP_HEADERS` (a credencial, no formato `chave=valor` da spec OTLP) e `OTEL_SERVICE_NAME=petdots-api` | É o que o ADR-0006 prometeu: **trocar de fornecedor custa duas variáveis**. Esta decisão não escreve uma linha de código, e é assim que ela continua reversível |
| **T2** | 🔴 **A credencial nunca aparece em arquivo versionado nem em saída de comando.** O Victor a cola no painel do Railway, como faz com o `JWT_SECRET` | `DIRETRIZES_FLUXO_IA` §9 e `SECURITY` §Gestão de segredos. Uma chave de ingestão aceita dados em nome do projeto e, num transcrito, vive para sempre |
| **T3** | **Os logs continuam em stdout, retidos pelo Railway.** O item de vigilância *"Logs não chegam ao backend de telemetria"* é **re-escopado, não fechado**, com gatilho novo: *primeiro incidente que exija correlacionar log com trace fora do Railway, ou a retenção de 7 dias se mostrar curta* | O gatilho antigo era "vendor escolhido", e ele dispara aqui — mas a **premissa** por trás dele não se sustenta. Há **uma instância** (`DEPLOYMENT`), então "juntar os logs de várias réplicas" não existe como problema; o Railway retém **7 dias no Hobby** e mostra tudo no mesmo painel do deploy; e os logs já carregam `trace_id`/`span_id` desde a `pd-04`, então a correlação existe assim que alguém precisar dela. Enviá-los custaria um exportador OTLP de logs **mais** um bridge do pino, que a `pd-04` não deixou pronto, para comprar conveniência. Adiar com gatilho honesto é melhor do que marcar como feito |
| **T4** | **`/api/v1/health` sai dos traces** — `UNTRACED_PATH_PREFIXES` em `apps/api/src/otel/otel.sdk.ts` passa a `['/api/docs', '/api/v1/health']` | É o item de vigilância cujo gatilho — *"orquestrador fazendo probe"* — dispara com esta mesma tarefa, e **duas vezes**: o healthcheck do próprio Railway (`railway.json`) e a sonda de uptime de T5. O ADR-0006 #7 manteve o health tracejado porque ele era *"a única rota real hoje"*; já não é — são dezenas —, e mantido ele seria o caminho mais tracejado do produto, descrevendo coisa nenhuma e ocupando cota medida |
| **T5** | **O mínimo de alerta que a publicação exige: uma sonda HTTP externa** em `https://api.petdots.com.br/api/v1/health` e em `https://petdots.com.br/`, avisando por e-mail quando a resposta não for `200`; e **um painel** sobre as métricas HTTP que a instrumentação já emite | Sem isto a telemetria existe e **ninguém é avisado de nada** — é o critério que segue desmarcado no `OBSERVABILITY`. O health responde `503` quando o banco não responde (e não `200`), então a sonda cobre o modo de falha mais provável do piloto. Painéis e alertas **além destes** ficam com gatilho *primeira semana de tráfego real*: desenhar alerta sem saber a forma do tráfego produz alarme falso, que treina a pessoa a ignorar o alarme |
| **T6** | **O aviso de privacidade passa a dizer que registros técnicos duram "até 14 dias"**, e não 7 | A premissa **A4** do rascunho fixou 7 dias pela retenção de log do Railway Hobby. A partir daqui o **trace** também é registro técnico, e um span de HTTP pode carregar o endereço do chamador: dizer 7 quando o dado vive 14 seria declarar ao titular um prazo menor do que o real. O número do aviso passa a ser o **maior** dos dois, que é o que o titular precisa saber |
| **T7** | **Gatilhos de reavaliação, nomeados:** (a) estourar qualquer cota do Free por dois meses seguidos; (b) precisar de mais de três pessoas olhando; (c) 14 dias de retenção se mostrarem curtos num incidente real; (d) o Grafana mudar o plano gratuito. Em (a) e (d), o candidato nomeado é o **New Relic Free**; em (b) e (c), a conversa é sobre plano pago e passa pelo orçamento | Nenhum deles se descobre numa página de preço — só com o sistema em uso. E o custo de trocar continua sendo T1: duas variáveis |

### O que fica fora

- **Envio de logs ao backend** — T3, com gatilho.
- **Tracing do `apps/landing` e do `apps/app`.** A instrumentação do ADR-0006 é
  da API. Instrumentar o cliente é decisão própria, e carrega uma pergunta de
  privacidade que a API não tem (telemetria de navegador é dado de
  comportamento). Gatilho: primeira dúvida de performance que os dados do
  servidor não respondam.
- **Painéis e alertas além do mínimo de T5** — gatilho *primeira semana de
  tráfego real*.
- **Honeycomb e Axiom** — não avaliados a fundo, pelo motivo registrado no
  Contexto.
- **Plano pago de qualquer fornecedor** — a restrição de custo do ADR-0020 (E8)
  vale igual aqui.

## Alternativas consideradas

- **New Relic Free** — o segundo colocado, por margem pequena, e o candidato
  nomeado dos gatilhos (a) e (d). Ganha em **alertas e 500 sondas sintéticas
  confirmados** e na cota única de 100 GB, que é mais simples de raciocinar.
  Preterido por **um único usuário full platform** — o sócio ficaria sem login —
  e por **8 dias de retenção** contra 14.
- **Honeycomb** e **Axiom** — na shortlist do ADR-0006 #8, **não avaliados a
  fundo**: a cobertura de métricas no plano gratuito não foi verificada, e o
  critério exige os três sinais. Ficam disponíveis para reavaliação.
- **Adiar de novo, publicando sem destino de telemetria.** Descartada: a
  publicação é exatamente o evento que o ADR-0006 nomeou como gatilho, e um
  piloto no ar sem trace nem alerta transforma o primeiro problema real em
  adivinhação. O custo de decidir agora é zero (free tier, duas variáveis).
- **Self-host de Prometheus/Grafana/Loki.** Já vetado pelo ADR-0002 #10 e
  reafirmado pelo ADR-0006. Continua sendo operar infraestrutura numa pessoa que
  também faz censo de rua.
- **Manter só o coletor local do `docker-compose`.** Ele é de desenvolvimento,
  efêmero e roda na máquina do Victor — não observa produção nenhuma.

## Consequências

**Positivas**

- O último item que o ADR-0006 deixou aberto tem dono, e os três critérios
  desmarcados do `OBSERVABILITY` passam a dois marcados e um re-escopado com
  gatilho.
- Traces e métricas de produção **desde o primeiro deploy**, sem custo e sem
  cartão.
- Os dois sócios podem olhar o mesmo sistema.
- O health deixa de gastar cota medida para descrever uma sonda.
- Trocar de fornecedor continua custando duas variáveis de ambiente.

**Negativas, aceitas**

- **Alertas e sondas no plano gratuito não estão confirmados**, e podem exigir
  um serviço externo a mais (gratuito) só para a sonda de uptime.
- **Os logs seguem fora do backend de telemetria**, e vivem 7 dias. Num
  incidente, log e trace se consultam em dois lugares.
- **Mais um fornecedor** no inventário, ainda que gratuito.
- **Retenção de 14 dias** é o teto do que se pode investigar, e o aviso de
  privacidade teve de crescer para declará-la.
- **A comparação vale para 13/09/2026.** Plano gratuito é o primeiro a mudar.

## Páginas consultadas (13/09/2026)

[Grafana Cloud pricing](https://grafana.com/pricing/),
[New Relic pricing](https://newrelic.com/pricing).
Shortlist e critério originais: [ADR-0006](0006-instrumentacao-opentelemetry.md) #8.

## Status

`accepted` — 13/09/2026. Decisão do **Victor**, no portão da `pd-19` (P3),
sobre recomendação e due diligence da IA. Nenhuma conta criada nesta etapa: a
conta, o endpoint e a chave são da **Etapa 2** da `pd-19`, junto com o resto da
montagem.
