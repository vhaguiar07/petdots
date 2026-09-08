---
title: Backlog
status: stable
version: 1.2
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

Última revisão: 08/09/2026.

---

## Bloqueadores

| Item | Detalhe | Origem |
|---|---|---|
| **Spike-gate do cliente universal ainda não executado** | O [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) escolheu **Expo + React Native Web** como cliente universal **condicionado a um spike-gate**, com fallback para Expo + Next.js se o gate reprovar. O gate não foi executado, então a camada de cliente do MVP está formalmente indefinida — e o [`PROJECT_STATE.md`](../../PROJECT_STATE.md) o registra como o **próximo passo** (`pd-02`). O bootstrap que o bloqueava foi entregue em 07/09/2026. Produto do gate: decisão registrada (ADR novo ou emenda ao 0002) | `PROJECT_STATE.md` (marco atual); ADR-0002 |

## Débito técnico

| Item | Detalhe | Origem |
|---|---|---|
| **Credencial real do Google OAuth em texto puro no disco — ainda ativa, rotação pendente** | **Verificado em 06/09/2026.** O `.env` do legado contém um `GOOGLE_CLIENT_SECRET` de projeto real do Google Cloud, junto do `GOOGLE_CLIENT_ID`. **Confirmado:** o arquivo **nunca foi versionado** (`git log --all -- '**/.env'` vazio) e a string **não existe em nenhum commit** (`git grep` sobre `git rev-list --all` vazio) — não é um caso de credencial no histórico, e não exige reescrita de histórico. **Também confirmado:** o valor foi **exibido em texto puro no transcrito de uma sessão de IA em 06/09/2026**. **Atualização de 07/09/2026:** ao limpar o legado do disco (`pd-01`), o arquivo foi **movido para fora do repositório**, para `%USERPROFILE%\petdots-legacy-env\api\.env` — continua sendo o **único exemplar** da credencial. **Confirmado em 08/09/2026 (console do Google Cloud, Victor):** o OAuth client **segue ativo**. **Trabalho:** rotacionar o `GOOGLE_CLIENT_SECRET` no console e atualizar o único exemplar em `%USERPROFILE%\petdots-legacy-env\api\.env` | Inspeção do ambiente ao subir a stack, 06/09/2026; movida em 07/09/2026; validade confirmada em 08/09/2026 |
| 🐞 **Bug pendente: a busca de produtos some por completo em telas mobile** | Ver `BUG-001` em [`BUGS.md`](BUGS.md) — abaixo de 768px o app web não oferecia **nenhuma** forma de buscar produto por nome. Reproduzido pelo Victor e confirmado em `header.tsx:73` (`hidden md:block`). ⚠️ **É do protótipo legado, que foi arquivado em 07/09/2026** na tag `legacy-marketplace` e removido do disco: **não há mais código vivo com esse defeito**. O registro permanece como conhecimento de UX — a mesma armadilha (busca escondida em `md:`) não deve se repetir no catálogo do MVP. **Trabalho:** nenhum no legado; considerar ao desenhar a busca do comparador | Reprodução do Victor, 06/09/2026; escopo atualizado em 07/09/2026 |
| **Vulnerabilidade `high` sem correção na linha do Prisma 6** | **Medido em 07/09/2026** (`npm audit`, após `npm ci`): `deepmerge-ts <8.0.0` — stack exhaustion ao mesclar grafos recursivos ([GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)) — entra por `prisma` → `@prisma/config` → `deepmerge-ts`. **Alcance:** a **CLI** do Prisma (tempo de build e `prisma generate`), não o runtime da API; nenhuma entrada de usuário chega lá. `npm audit fix --force` só a "resolve" fazendo downgrade para `prisma@6.12.0`. Sem correção disponível na linha 6. **Trabalho:** sai junto com o upgrade para Prisma 7 (item abaixo, mesmo gatilho). **Reverificado em 08/09/2026:** mesma cadeia, sem fix na linha 6 | `npm audit` no bootstrap, 07/09/2026; reverificado 08/09/2026 |
| **Upgrade para Prisma 7 — gatilho: Nest em ESM** | O Prisma 7 é **ESM-only** e exige driver adapter + `prisma.config.ts`; o repositório é CommonJS de ponta a ponta por causa de Nest 11 + `emitDecoratorMetadata` + ts-jest ([ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md), alternativa (b)). **Gatilho:** quando o Nest migrar para ESM, ou quando o custo da vulnerabilidade acima superar o da migração. Leva junto a correção do `deepmerge-ts`. **Reverificado em 08/09/2026:** gatilho segue não satisfeito — repositório continua CommonJS | ADR-0005, 07/09/2026; reverificado 08/09/2026 |
| **Upgrade para NestJS 12 — gatilho: `nestjs-zod` aceitar `^12`** | Pinado em 11.2.3 porque `nestjs-zod@5.5.0` declara peer `@nestjs/common ^10 \|\| ^11`, e é ele que materializa o contrato Zod→OpenAPI do ADR-0002. **Verificar** a cada bump da lib. Leva junto `@nestjs/config` (a 12.0.0 já aceita Nest 11 e 12). **Reverificado em 08/09/2026:** `nestjs-zod` segue em 5.5.0, peer `@nestjs/common ^10 \|\| ^11` — gatilho não satisfeito | ADR-0005, 07/09/2026; reverificado 08/09/2026 |
| **OpenTelemetry ainda não instrumentado** | O [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) #10 e a [`OBSERVABILITY`](../03-engineering/OBSERVABILITY.md) definem **OTel exportando para serviço gerenciado** como padrão de observabilidade. O bootstrap entregou **logs estruturados** (pino, com `requestId`/`correlationId`) e **health check**, mas **não** métricas nem tracing — OTel ficou deliberadamente fora do `pd-01` ([ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md) #11). **Custo de adiar:** cada rota nova nasce sem trace, e instrumentar depois é mais caro que instrumentar junto. **Trabalho:** tarefa própria, idealmente **antes** do primeiro módulo de domínio; exige também escolher o serviço gerenciado de destino | ADR-0005 (escopo do bootstrap), 07/09/2026 |
| **`GH_TOKEN` fine-grained volta a aparecer no shell do agente, apesar de "resolvido" na `pd-01`** | O relatório da `pd-01` (07/09/2026) registra que a variável `GH_TOKEN` — um fine-grained PAT sem alcance para `createPullRequest` em repositório de outra conta — foi **removida do ambiente do Windows**, verificado abrindo e fechando um PR de teste. **Verificado de novo em 08/09/2026, na `pd-03`:** `gh pr create` falhou com o mesmo erro (`Resource not accessible by personal access token`); `echo "GH_TOKEN set: ${GH_TOKEN:+yes}"` confirmou a variável presente no shell do Bash tool. **Contorno que funcionou:** prefixar cada chamada ao `gh` com `env -u GH_TOKEN` (a conta certa, `vhaguiar002`, já estava autenticada via keyring). **Hipótese em aberto — o que falta medir:** se a remoção da `pd-01` valeu só para o registro de ambiente do Windows e algum perfil do Git Bash (`.bashrc`/`.bash_profile`) exporta a variável de novo, ou se ela nunca foi de fato removida nesse shell. **Trabalho:** localizar onde a variável é setada para o shell do Bash tool e remover na origem — não só contornar por sessão | Falha ao abrir o PR da `pd-03`, 08/09/2026 |

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
