---
title: Backlog
status: stable
version: 1.0
updated: 2026-09-06
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

Última revisão: 06/09/2026.

---

## Bloqueadores

| Item | Detalhe | Origem |
|---|---|---|
| 🔴 **O monorepo não está bootstrapado — não há código na `feat/ai-first`** | **Verificado em 06/09/2026** (`git ls-files` na `feat/ai-first`): a branch rastreia **54 arquivos, todos de documentação** — não existe `package.json` na raiz, nem workspaces, nem `apps/*/package.json`, nem `src/`. O que há no disco (`apps/web/.next`, `apps/api/dist`, `node_modules`) são artefatos de build do protótipo legado, de 20–24/06/2026, ignorados pelo `.gitignore` e órfãos do código que os gerou. **Consequência:** nenhuma tarefa de implementação pode começar; todo item de "Features planejadas" abaixo depende deste. O próprio [README.md](../../README.md) declara o estado (§ "Executando a stack completa"). **Trabalho:** criar a raiz do workspace, pinar gerenciador e versões no lockfile, e os scripts operacionais previstos em [`03-engineering/DEVELOPMENT_GUIDE.md`](../03-engineering/DEVELOPMENT_GUIDE.md) | Verificação do repositório, 06/09/2026 |
| **Spike-gate do cliente universal ainda não executado** | O [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) escolheu **Expo + React Native Web** como cliente universal **condicionado a um spike-gate**, com fallback para Expo + Next.js se o gate reprovar. O gate não foi executado, então a camada de cliente do MVP está formalmente indefinida — e o [`PROJECT_STATE.md`](../../PROJECT_STATE.md) o registra como o **primeiro passo** da implementação. **Depende do bootstrap acima.** Produto do gate: decisão registrada (ADR novo ou emenda ao 0002) | `PROJECT_STATE.md` (marco atual); ADR-0002 |

## Decisões de negócio pendentes

| Item | Detalhe | Origem |
|---|---|---|
| **Definir o gerenciador de pacotes do monorepo** | O [README.md](../../README.md) e o `DEVELOPMENT_GUIDE` escrevem `<gerenciador> install` com o placeholder literal — npm e pnpm estão listados como opção e nenhum foi escolhido. É pré-requisito do bootstrap (a escolha muda o formato dos workspaces e do lockfile) e vale um registro, ainda que curto | Leitura de `README.md` e `DEVELOPMENT_GUIDE.md`, 06/09/2026 |
| **Destino do protótipo legado nas branches `master` e `develop`** | O [ADR-0001](../06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md) descontinuou o marketplace de entrega rápida, mas o código **continua vivo e é a única coisa executável do repositório**: `develop` (tip de 26/06/2026) e `master` (16/06/2026) carregam o monorepo Turborepo completo — API NestJS com 20 migrations, front Next.js e app Expo. **Verificado em 06/09/2026**, subindo a stack: a aplicação roda ponta a ponta contra o Postgres local. Não há decisão registrada sobre arquivar, manter como referência ou descartar — e enquanto não houver, `develop` acumula divergência com a linha AI-first. ⚠️ Parte desse código é reaproveitável pelo ADR-0004 (o MVP voltou a ser marketplace): decidir isso **antes** do bootstrap evita reescrever o que já existe | Verificação das branches e execução da stack, 06/09/2026 |

## Débito técnico

| Item | Detalhe | Origem |
|---|---|---|
| **Credencial real do Google OAuth em texto puro no disco** | **Verificado em 06/09/2026.** O `apps/api/.env` (working tree, presente desde 20/06/2026) contém um `GOOGLE_CLIENT_SECRET` de projeto real do Google Cloud, junto do `GOOGLE_CLIENT_ID`. **Confirmado:** o arquivo **nunca foi versionado** (`git log --all -- '**/.env'` vazio) e a string **não existe em nenhum commit** (`git grep` sobre `git rev-list --all` vazio) — não é um caso de credencial no histórico, e não exige reescrita de histórico. **Também confirmado:** o valor foi **exibido em texto puro no transcrito de uma sessão de IA em 06/09/2026**. **Hipótese em aberto — o que falta medir:** se a credencial ainda é válida e o que ela abre hoje. É essa resposta que decide a ação (rotacionar × nada a fazer), não a presença dela no arquivo. **Trabalho:** conferir o status no console do Google Cloud e, se ativa, rotacionar | Inspeção do ambiente ao subir a stack, 06/09/2026 |
| **Não existe `.env.example`** | **Verificado em 06/09/2026:** o `.gitignore` já reserva a exceção (`!.env.example`) e o [README.md](../../README.md) instrui "copiar `.env.example` → `.env`", mas o arquivo **não existe em nenhuma branch**. Consequência: as variáveis obrigatórias (`DATABASE_URL`, `JWT_SECRET`, `S3_BUCKET`, `GOOGLE_OAUTH_CLIENT_ID`…) só são descobertas lendo um `.env` real — que é justamente o que não se deve abrir. Irmão do item acima: `.env.example` é o que permite documentar os nomes sem tocar nos valores | Verificação do repositório, 06/09/2026 |
| 🐞 **Bug pendente: a busca de produtos some por completo em telas mobile** | Ver `BUG-001` em [`BUGS.md`](BUGS.md) — abaixo de 768px o app web não oferece **nenhuma** forma de buscar produto por nome, e não há menu mobile que substitua o campo escondido. Reproduzido pelo Victor e confirmado em `header.tsx:73` (`hidden md:block`). ⚠️ **É do protótipo legado**: a prioridade depende da decisão pendente sobre o destino dele (item acima). A correção exige desenhar a entrada mobile, não só remover o `hidden` — o header não comporta o campo inteiro nessa largura | Reprodução do Victor + varredura de `apps/web/`, 06/09/2026 |
| **Artefatos de build órfãos na working tree** | `apps/web/.next`, `apps/web/tsconfig.tsbuildinfo`, `apps/api/dist`, `apps/mobile/.expo` e três `node_modules` sobraram no disco do protótipo legado (20–24/06/2026) e **não têm código-fonte correspondente na `feat/ai-first`**. São ignorados pelo Git, então não afetam o repositório — mas fazem `apps/` parecer povoado para quem inspeciona o diretório, e um `dist` de junho pode ser executado por engano. **Trabalho:** limpar, ou documentar por que ficam | Verificação do repositório, 06/09/2026 |

## Features / entregas planejadas

> Todas dependem do bootstrap do monorepo (ver Bloqueadores).

| Item | Detalhe | Origem |
|---|---|---|
| **Implementar o MVP marketplace do ADR-0004** | O [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) está **aceito** (03/09/2026) e define módulos, agregados e fronteiras do MVP, substituindo o desenho v1.0 do `SYSTEM_ARCHITECTURE` (que servia ao produto "Vida do Pet"). Nenhuma linha foi implementada. O escopo funcional correspondente está em [`01-product/MVP_SCOPE.md`](../01-product/MVP_SCOPE.md) | ADR-0004, 03/09/2026 |
| **Implementar a monetização e o split de pagamento do ADR-0003** | O [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) está **aceito** (02/09/2026) e fecha take rate e forma de pagamento do piloto, com a economia por pedido modelada na `IDEACAO_FASE1` §25-§26. Nada implementado. ⚠️ Envolve dinheiro de terceiros (split para o lojista): é candidato natural a ADR próprio de integração e ao maior rigor de teste do MVP | ADR-0003, 02/09/2026 |

## Documentação

| Item | Detalhe | Origem |
|---|---|---|
| 🔴 **`MVP_SCOPE` contradiz o ADR-0004 sobre o que é o MVP** | **Medido em 06/09/2026**, lendo a working tree: [`01-product/MVP_SCOPE.md`](../01-product/MVP_SCOPE.md) §"Fora do escopo" (linhas 83-97) lista **"Marketplace de produtos e catálogo de Pet Shops" como Fase 4**, justificado por "monetização via comércio — pós-fidelização", e descreve um MVP centrado em Tutores e Pets. O [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md), **aceito em 03/09/2026**, faz exatamente o oposto: o marketplace hiperlocal **é** o produto inicial, e o ADR declara que substitui o desenho anterior. Os dois documentos estão vivos e se contradizem no ponto mais central do produto. **Impacto:** o `PROJECT_STATE.md` manda iniciar a implementação "a partir de `MVP_SCOPE`" — quem seguir essa instrução literalmente constrói o produto errado. Ambos os arquivos (`MVP_SCOPE` e `PRODUCT_ROADMAP`) já se declaram `outdated` no frontmatter, o que sinaliza a defasagem mas não impede o uso. **Trabalho:** reescrever `MVP_SCOPE` e `PRODUCT_ROADMAP` sob o ADR-0004 e devolvê-los a `draft`/`stable` | Leitura cruzada de `MVP_SCOPE.md:83-97` × ADR-0004, 06/09/2026 |
| **Nenhuma camada de features documentadas** | O ecossistema SOAC mantém `docs/<modulo>/features/` com a visão transversal de cada feature (banco → backend → frontend), e o modelo de processo importado em 06/09/2026 pressupõe esse artefato. O PetDots ainda não tem nenhuma feature implementada, então a pasta não faz sentido hoje — **criar junto com a primeira feature do MVP**, não antes | Importação do modelo de processo, 06/09/2026 |
| **`PLANS/` ainda não existe** | O fluxo de trabalho (§1, "Quem implementa") prevê planos autossuficientes em `PLANS/` na raiz. A pasta será criada na primeira tarefa que passar pelo portão Fase 1 → Fase 2 — não vale criá-la vazia | Importação do modelo de processo, 06/09/2026 |

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
