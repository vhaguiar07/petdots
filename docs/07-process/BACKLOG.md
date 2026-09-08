---
title: Backlog
status: stable
version: 1.4
updated: 2026-09-08
scope: >
  Estoque de pendências conhecidas do PetDots — débito técnico, decisões
  pendentes, features planejadas e documentação faltando. Daqui saem as
  próximas tarefas pd-NN. Não é fila de trabalho e não guarda ideias
  (essas vivem em IDEIAS.md).
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 07-process/BUGS.md
  - 07-process/IDEIAS.md
  - PROJECT_STATE.md
type: process
---

# Backlog — PetDots

> **Estoque de pendências conhecidas**, de onde saem as próximas tarefas
> `pd-NN`. Regras de manutenção em
> [`DIRETRIZES_FLUXO_IA.md`](DIRETRIZES_FLUXO_IA.md) §3: item novo entra na
> entrega que o gerou; item resolvido sai, e o histórico fica no relatório da
> branch que o resolveu.
>
> **Só entra o que foi verificado** — cada linha traz origem e data. Severidade
> alta (🔴) exige a medição que a sustenta.
>
> **Ideia não é pendência**: melhorias sem dono nem prazo vão para
> [`IDEIAS.md`](IDEIAS.md).
>
> 🔢 **O tamanho desta lista não é métrica de progresso.** Ela cresce em função
> do trabalho feito — instrumentar OTel faz nascer "para qual serviço exportar?",
> usar um override faz nascer "remover quando o upstream corrigir". Por isso o
> débito técnico é dividido em **fila** (acionável) e **vigilância** (esperando
> gatilho), e **o número que se reporta é o da fila**. Regras em
> [`DIRETRIZES_FLUXO_IA.md`](DIRETRIZES_FLUXO_IA.md) §3.1–§3.3.
>
> **Matar débito não é avanço** — avanço é produto andando (decisão do Victor,
> 08/09/2026). Tarefa só de débito só se abre quando o item **bloqueia trabalho
> de produto** ou é **risco de segurança ativo**; fora disso, o débito é
> resolvido dentro da tarefa que esbarrar nele.

Última revisão: 08/09/2026.

---

## Bloqueadores

| Item | Detalhe | Origem |
|---|---|---|
| **Spike-gate do cliente universal ainda não executado** | O [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) escolheu **Expo + React Native Web** como cliente universal **condicionado a um spike-gate**, com fallback para Expo + Next.js se o gate reprovar. O gate não foi executado, então a camada de cliente do MVP está formalmente indefinida — e o [`PROJECT_STATE.md`](../../PROJECT_STATE.md) o registra como o **próximo passo** (`pd-02`). O bootstrap que o bloqueava foi entregue em 07/09/2026. Produto do gate: decisão registrada (ADR novo ou emenda ao 0002) | `PROJECT_STATE.md` (marco atual); ADR-0002 |

## Débito técnico

> Dividido em **fila** e **vigilância** (`DIRETRIZES_FLUXO_IA` §3.3). **O número
> que se reporta é o da fila.** Vigilância não é trabalho esperando: é anotação
> com gatilho nomeado, e o item só volta para a fila quando o gatilho dispara —
> momento em que ele entra na tarefa que o destravou (§3.2), não numa branch de
> débito própria (§3.1).

### Fila — acionável hoje

> Nada externo falta. Ainda assim, **tarefa só de débito só se abre** quando o
> item bloqueia trabalho de produto ou é risco de segurança ativo (§3.1).

| Item | Detalhe | Origem |
|---|---|---|
| **Credencial real do Google OAuth em texto puro no disco — ainda ativa, rotação pendente** | **Verificado em 06/09/2026.** O `.env` do legado contém um `GOOGLE_CLIENT_SECRET` de projeto real do Google Cloud, junto do `GOOGLE_CLIENT_ID`. **Confirmado:** o arquivo **nunca foi versionado** (`git log --all -- '**/.env'` vazio) e a string **não existe em nenhum commit** (`git grep` sobre `git rev-list --all` vazio) — não é um caso de credencial no histórico, e não exige reescrita de histórico. **Também confirmado:** o valor foi **exibido em texto puro no transcrito de uma sessão de IA em 06/09/2026**. **Atualização de 07/09/2026:** ao limpar o legado do disco (`pd-01`), o arquivo foi **movido para fora do repositório**, para `%USERPROFILE%\petdots-legacy-env\api\.env` — continua sendo o **único exemplar** da credencial. **Confirmado em 08/09/2026 (console do Google Cloud, Victor):** o OAuth client **segue ativo**. **Trabalho:** rotacionar o `GOOGLE_CLIENT_SECRET` no console e atualizar o único exemplar em `%USERPROFILE%\petdots-legacy-env\api\.env` | Inspeção do ambiente ao subir a stack, 06/09/2026; movida em 07/09/2026; validade confirmada em 08/09/2026 |
| **Containers órfãos do protótipo legado seguem rodando no ambiente local** | **Verificado em 08/09/2026** (`docker ps` + `docker inspect`): quatro containers do projeto compose `petdots` (working_dir = raiz deste repo) estão **de pé há 3 semanas** — `petdots-grafana` (grafana 11, porta 3300), `petdots-loki` (loki 3, 3100), `petdots-minio` (9000/9001) e `petdots-postgres` (postgres 16, **5436**). São do compose **legado**, que a `pd-01` apagou do disco ao arquivar o protótipo — mas os containers nunca foram parados. **Riscos:** (a) `petdots-postgres` na 5436 é facilmente confundido com o `petdots-mvp-postgres-1` na 5437, que é o do MVP; (b) Grafana/Loki próprios rodando contradizem na aparência o [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) #10 e podem ser tomados por "a stack de observabilidade do projeto"; (c) consomem recurso da máquina sem uso. **Trabalho:** decisão do Victor — parar e remover os quatro (e os volumes, se os dados legados não interessarem) | Inspeção do ambiente durante a `pd-04`, 08/09/2026 |
| **`GH_TOKEN` fine-grained volta a aparecer no shell do agente, apesar de "resolvido" na `pd-01`** | O relatório da `pd-01` (07/09/2026) registra que a variável `GH_TOKEN` — um fine-grained PAT sem alcance para `createPullRequest` em repositório de outra conta — foi **removida do ambiente do Windows**, verificado abrindo e fechando um PR de teste. **Verificado de novo em 08/09/2026, na `pd-03`:** `gh pr create` falhou com o mesmo erro (`Resource not accessible by personal access token`); `echo "GH_TOKEN set: ${GH_TOKEN:+yes}"` confirmou a variável presente no shell do Bash tool. **Contorno que funcionou:** prefixar cada chamada ao `gh` com `env -u GH_TOKEN` (a conta certa, `vhaguiar002`, já estava autenticada via keyring). **Hipótese em aberto — o que falta medir:** se a remoção da `pd-01` valeu só para o registro de ambiente do Windows e algum perfil do Git Bash (`.bashrc`/`.bash_profile`) exporta a variável de novo, ou se ela nunca foi de fato removida nesse shell. **Trabalho:** localizar onde a variável é setada para o shell do Bash tool e remover na origem — não só contornar por sessão | Falha ao abrir o PR da `pd-03`, 08/09/2026 |

### Vigilância — bloqueado por gatilho

> Cada item nomeia **o que o destrava**. Item aqui sem gatilho nomeado está no
> lugar errado: ou é fila, ou o gatilho está faltando.

| Item | Detalhe | Origem |
|---|---|---|
| 🐞 **Bug pendente: a busca de produtos some por completo em telas mobile — gatilho: desenhar a busca do comparador** | Ver `BUG-001` em [`BUGS.md`](BUGS.md) — abaixo de 768px o app web não oferecia **nenhuma** forma de buscar produto por nome. Reproduzido pelo Victor e confirmado em `header.tsx:73` (`hidden md:block`). ⚠️ **É do protótipo legado, que foi arquivado em 07/09/2026** na tag `legacy-marketplace` e removido do disco: **não há mais código vivo com esse defeito**. O registro permanece como conhecimento de UX — a mesma armadilha (busca escondida em `md:`) não deve se repetir no catálogo do MVP. **Trabalho:** nenhum no legado; considerar ao desenhar a busca do comparador | Reprodução do Victor, 06/09/2026; escopo atualizado em 07/09/2026 |
| **Serviço gerenciado de observabilidade não escolhido — gatilho: existir ambiente de deploy** | A instrumentação OTel foi entregue na `pd-04` (08/09/2026), mas o **destino** segue em aberto. Shortlist e critério no [ADR-0006](../06-decisions/ADR/0006-instrumentacao-opentelemetry.md) #8: Grafana Cloud, New Relic, Honeycomb, Axiom — todos OTLP-nativos com free tier, cujos limites **precisam ser conferidos na página de preços no momento da escolha**. **Por que adiar não custa:** no código a troca de vendor é de duas variáveis de ambiente; o caro (painéis, alertas, histórico) só faz sentido com ambiente para observar, e não há deploy. **Trabalho:** escolher, cadastrar, pôr endpoint e chave no ambiente | ADR-0006, 08/09/2026 |
| **Painéis e alertas de observabilidade não definidos — gatilho: vendor escolhido** | É o critério que segue **desmarcado** na [`OBSERVABILITY`](../03-engineering/OBSERVABILITY.md). Sem painel e sem alerta, a telemetria existe mas ninguém é avisado de nada. Depende do item acima | `OBSERVABILITY` (critério de pronto), 08/09/2026 |
| **Logs não chegam ao backend de telemetria — gatilho: vendor escolhido** | Desde a `pd-04` os logs carregam `trace_id`/`span_id` e são correlacionáveis, mas seguem **só em stdout** — nada os envia a lugar nenhum. Enviar exige decidir o deploy (agente coletor × transport do pino), e não há deploy. **Trabalho:** decidir junto com o `DEPLOYMENT` | ADR-0006 (alternativas consideradas), 08/09/2026 |
| **`/api/v1/health` não excluído dos traces — gatilho: orquestrador fazendo probe** | O `ignoreIncomingRequestHook` da `pd-04` descarta só `/api/docs`. O health ficou tracejado de propósito: é a única rota real hoje, ou seja, o único alvo para verificar a instrumentação. Quando algo sondar o health em intervalo, ele vira ruído e volume pago. **Trabalho:** acrescentar o prefixo em `UNTRACED_PATH_PREFIXES` (`apps/api/src/otel/otel.sdk.ts`) | ADR-0006 #7, 08/09/2026 |
| **`nestjs-zod` rodando fora do peer declarado, e parado desde 25/07/2026 — gatilho: `nestjs-zod` publicar suporte a `^12`** | **Medido em 08/09/2026:** a `pd-05` subiu o NestJS para 12 forçando por `overrides` os **dois** peers que o `nestjs-zod@5.5.0` declara (`@nestjs/common ^10 || ^11` e `@nestjs/swagger ^7.4.2 || ^8 || ^11`) — decisão do [ADR-0007](../06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md), sustentada por contrato OpenAPI inalterado e suíte verde. **O risco de fundo é a biblioteca:** último publish em **25/07/2026**, sem pré-release recente, e é ela que materializa o contrato Zod→OpenAPI do ADR-0002. **Trabalho:** remover o override quando o upstream publicar suporte a `^12`; se ela não voltar a publicar, executar a substituição registrada em [`IDEIAS.md`](IDEIAS.md) | `pd-05`, 08/09/2026 |
| **Tooling do Nest travado na linha 11 — gatilho: TypeScript ≥ 6** | **Medido em 08/09/2026:** `@nestjs/schematics@12` declara peer `typescript >=6.0.0` e o `@nestjs/cli@12` embute `typescript ~6.0.2`; o repositório está em **5.9.3**. Por isso a `pd-05` subiu o **runtime** do Nest para 12 e manteve `@nestjs/cli` e `@nestjs/schematics` em 11 ([ADR-0007](../06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md), alternativa (c)). **Alcance:** só build e scaffolding — `nest build` funciona e o CI está verde. ⚠️ A `latest` do TypeScript é **7.0.2** (a 6 saiu apenas em beta): o upgrade é de duas majors e cai no port nativo, então é tarefa própria, não bump de rotina. **Trabalho:** avaliar TypeScript 7 e, com ele, o tooling do Nest 12 | `pd-05`, 08/09/2026 |
| **Dois `overrides` de segurança carregados no `package.json` — gatilho: Prisma depender de versões corrigidas** | **Medido em 08/09/2026:** o `npm audit` só chega a **0** porque a raiz força `deepmerge-ts@8.0.2` (o `@prisma/config` pina a 7.1.5 vulnerável, **tanto no Prisma 6 quanto no 7**) e `mysql2@3.24.4` (o Prisma 7 embute `mysql2@3.15.3`, que este projeto nem usa — é PostgreSQL). Os dois são contornos de dependência transitiva, não correções do upstream. **Trabalho:** remover cada override quando o Prisma passar a depender de versão corrigida; conferir a cada bump do Prisma | `pd-05`, 08/09/2026 |

## Features / entregas planejadas

> O bootstrap do monorepo, que bloqueava todas elas, foi entregue em 07/09/2026
> (`pd-01`). Passam a depender do spike-gate (`pd-02`), que define a camada de
> cliente.

| Item | Detalhe | Origem |
|---|---|---|
| **Implementar o MVP marketplace do ADR-0004** | O [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) está **aceito** (03/09/2026) e define módulos, agregados e fronteiras do MVP, substituindo o desenho v1.0 do `SYSTEM_ARCHITECTURE` (que servia ao produto "Vida do Pet"). Nenhuma linha foi implementada. O escopo funcional correspondente está em [`01-product/MVP_SCOPE.md`](../01-product/MVP_SCOPE.md) | ADR-0004, 03/09/2026 |
| **Implementar a monetização e o split de pagamento do ADR-0003** | O [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) está **aceito** (02/09/2026) e fecha take rate e forma de pagamento do piloto, com a economia por pedido modelada na `IDEACAO_FASE1` §25-§26. Nada implementado. ⚠️ Envolve dinheiro de terceiros (split para o lojista): é candidato natural a ADR próprio de integração e ao maior rigor de teste do MVP | ADR-0003, 02/09/2026 |

## Documentação

| Item | Detalhe | Origem |
|---|---|---|
| 🔴 **`MVP_SCOPE` contradiz o ADR-0004 sobre o que é o MVP** | **Medido em 06/09/2026**, lendo a working tree: [`01-product/MVP_SCOPE.md`](../01-product/MVP_SCOPE.md) §"Fora do escopo" (linhas 83-97) lista **"Marketplace de produtos e catálogo de Pet Shops" como Fase 4**, justificado por "monetização via comércio — pós-fidelização", e descreve um MVP centrado em Tutores e Pets. O [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md), **aceito em 03/09/2026**, faz exatamente o oposto: o marketplace hiperlocal **é** o produto inicial, e o ADR declara que substitui o desenho anterior. Os dois documentos estão vivos e se contradizem no ponto mais central do produto. **Impacto:** o `PROJECT_STATE.md` manda iniciar a implementação "a partir de `MVP_SCOPE`" — quem seguir essa instrução literalmente constrói o produto errado. Ambos os arquivos (`MVP_SCOPE` e `PRODUCT_ROADMAP`) já se declaram `outdated` no frontmatter, o que sinaliza a defasagem mas não impede o uso. **Trabalho:** reescrever `MVP_SCOPE` e `PRODUCT_ROADMAP` sob o ADR-0004 e devolvê-los a `draft`/`stable` | Leitura cruzada de `MVP_SCOPE.md:83-97` × ADR-0004, 06/09/2026 |
| **Nenhuma camada de features documentadas** | O ecossistema SOAC mantém `docs/<modulo>/features/` com a visão transversal de cada feature (banco → backend → frontend), e o modelo de processo importado em 06/09/2026 pressupõe esse artefato. O PetDots ainda não tem nenhuma feature implementada, então a pasta não faz sentido hoje — **criar junto com a primeira feature do MVP**, não antes | Importação do modelo de processo, 06/09/2026 |
| **As camadas 03-engineering e 04-api ainda descrevem o produto "Vida do Pet"** | **Verificado em 07/09/2026**, ao implementar o bootstrap contra esses documentos. As **regras** seguem válidas e foram aplicadas (Zod na borda → 422, `/api/v1`, formato de erro, health = processo + Postgres), mas os **exemplos** são do produto anterior: [`TESTING_STRATEGY`](../03-engineering/TESTING_STRATEGY.md) prioriza ownership via `pet_tutors` e idempotência de lembretes; [`OBSERVABILITY`](../03-engineering/OBSERVABILITY.md) lista "upload de documento (presigned)" e "reconciliação banco × S3" como fluxos críticos — mas o ADR-0004 tirou o S3 do MVP; [`ERROR_MODEL`](../04-api/ERROR_MODEL.md) e [`API_GUIDELINES`](../04-api/API_GUIDELINES.md) exemplificam com `PET_NOT_FOUND` e `/pets/{petId}/events`. **Impacto:** um agente que siga os exemplos literalmente testa e instrumenta o produto errado. **Trabalho:** reescrever os exemplos sob o ADR-0004 (loja, oferta, pedido, split), preservando as regras | Leitura cruzada durante o bootstrap, 07/09/2026 |

## Pendências de produção

> Registro do que já está integrado e ainda **não** foi para produção — código e
> banco. **Ao responder qualquer pergunta sobre o backlog, listar também esta
> seção.** O merge para a linha estável **nunca é automático**: só a pedido
> explícito do usuário, a cada vez.

**No momento: nada pendente.** O PetDots não tem ambiente de produção — não há
deploy, não há migration aplicada em prod, e a linha AI-first não tem código. A
seção passa a ser alimentada no encerramento da primeira branch `pd-NN` que
gerar entrega deployável (ver [`DIRETRIZES_FLUXO_IA.md`](DIRETRIZES_FLUXO_IA.md) §7,
passo 4).
