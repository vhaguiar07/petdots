---
title: "Relatório — pd-07/docs/resincroniza-produto-sob-adr-0004"
status: stable
version: 1.0
updated: 2026-09-10
scope: >
  Encerramento da pd-07: re-sincronização da documentação de produto, fundação,
  engenharia, API e contexto de IA sob o ADR-0004, eliminando a contradição
  entre os documentos canônicos e o MVP marketplace. Registra também a emenda da
  carta de fundação, a correção do rótulo do spike-gate (pd-02 → pd-08) e a
  neutralização do GH_TOKEN.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 07-process/BACKLOG.md
  - 01-product/MVP_SCOPE.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - _templates/relatorio-branch.md
type: process
---

# pd-07/docs/resincroniza-produto-sob-adr-0004

**Trabalho concluído em:** 10/09/2026
**Merge:** ⏳ **pendente** — [PR #6](https://github.com/vhaguiar07/petdots/pull/6) aberto em `master`, CI verde, **deixado em fila por decisão do Victor** (10/09/2026). Ver [`BACKLOG.md`](../../BACKLOG.md) §"Pendências de produção". O SHA do merge entra aqui quando ele acontecer
**ADR:** nenhum — a tarefa **materializa** o [ADR-0004](../../../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) na documentação; não decide nada novo

---

## Objetivo

Em 08/09/2026 o Victor perguntou:

> "Pense num marketplace completo. O que a PetDots ainda não tem que deveria ter
> para se tornar um completo?"

A análise cruzada respondeu a pergunta (20 lacunas registradas em
[`IDEIAS.md`](../../IDEIAS.md) §"Lacunas para um marketplace completo"), mas
revelou um problema maior de passagem: **a própria documentação canônica ainda
descrevia o produto anterior**. Dois dias depois, ao pedir a recomendação de
próximo passo, ele definiu o formato:

> "Lembre-se que sempre que possível agrupe mais de uma tarefa numa branch só,
> até mesmo que perca um pouco de contexto"

e aprovou a recomendação de uma branch única que resolvesse toda a defasagem
documental de uma vez, em vez de uma tarefa por item de backlog.

**Por que era urgente:** num projeto AI-first, documento defasado não é dívida
cosmética — é instrução errada para o próximo agente. O `PROJECT_STATE` mandava
implementar "a partir do `MVP_SCOPE`", e o `MVP_SCOPE` descrevia o produto
errado.

## Diagnóstico

| # | O que estava errado | Como se sabe |
|---|---|---|
| 1 | **`MVP_SCOPE` e `PRODUCT_ROADMAP` descreviam o MVP como "Vida do Pet"** e punham o marketplace na Fase 4 | Item 🔴 do backlog desde 06/09/2026; lido na working tree |
| 2 | **`CAPABILITIES`, `FEATURE_CATALOG`, `USER_JOURNEYS` e `SUCCESS_METRICS`** tinham o mesmo defeito, **sem aviso de defasagem** (`status: draft`, v1.0 de 27/06/2026) | Registrado no backlog em 08/09/2026; `CAPABILITIES` classificava Marketplace como "C11, Fase 4, capacidade-satélite, não núcleo" |
| 3 | **A defasagem alcançava 29 documentos, não os 9 que o backlog nomeava** | Inventário exaustivo de `docs/`, `PROJECT_STATE.md` e `AGENTS.md` em 10/09/2026, por agente de busca dedicado |
| 4 | **`PRODUCT_VISION` e `PRODUCT_PRINCIPLES` — o topo da ordem canônica de autoridade — contradiziam o ADR-0004** | `PRODUCT_VISION`: "O PetDots não deve ser percebido como um marketplace"; `PRODUCT_PRINCIPLES` §8: "Marketplace é uma Consequência — o PetDots não nasce para vender produtos". Pela ordem `PRINCIPLES > VISION > BUSINESS_MODEL`, o produto antigo vencia qualquer conflito |
| 5 | **`AI_DOMAIN_KNOWLEDGE`, que existe para gerar código, instruía o oposto do ADR-0004** | Regra 3 do documento: *"Marketplace é periférico — não modele como cidadãos de primeira classe"* |
| 6 | **O spike-gate era chamado de `pd-02` em todo o repositório** | A sequência já estava em `pd-06`; o spike não foi executado enquanto `pd-03`…`pd-06` aconteceram |
| 7 | **`README.md` da raiz declarava NestJS 11 e Prisma 6** | A `pd-05` (08/09/2026, ADR-0007) subiu para 12 e 7. Não estava em nenhum inventário — o README da raiz não fazia parte do escopo original |
| 8 | **`DECISION_LOG` não listava os ADR-0006 e ADR-0007** | 7 ADRs no diretório, 5 linhas na tabela |
| 9 | **`GH_TOKEN` reaparecia no shell do agente** apesar de "resolvido" na `pd-01` | Item da fila do backlog desde 08/09/2026 |

## O que foi feito

Três frentes, uma por commit, cada uma validada pelo Victor antes de ser
commitada.

### Frente A — o QUE construir (commit `223904e`)

14 arquivos. Reescritos sob o ADR-0004:

- **[`PRODUCT_ROADMAP`](../../../00-foundation/PRODUCT_ROADMAP.md) v2.0** — seis fases, F1 = cunha (marketplace hiperlocal no eixo Grande Méier). As fases 5 (IA) e 6 (impacto social) **mantiveram a numeração** porque o ADR-0002 e o `TECHNOLOGY_STACK` as citam por número. Ganhou uma seção "o que fica fora de todas as fases" (rede social, verticalização, Joia 3), para que decisões já descartadas não voltem como novidade.
- **[`MVP_SCOPE`](../../../01-product/MVP_SCOPE.md) v2.0** — 14 capacidades dentro (com módulo e entidades), 19 fora (com fase e justificativa), invariantes que o MVP não pode violar, e critérios de saída em quatro grupos: funcionais (um por jornada), econômicos (os três gates do ADR-0003), recorrência e qualidade/segurança.
- **[`GLOSSARY`](../../../00-foundation/GLOSSARY.md) v2.0** — ~35 termos do marketplace, derivados um a um das entidades do `DOMAIN_MODEL`. Os termos antigos **não foram removidos**: foram para "Fases futuras" com a fase de reentrada. A tabela PT↔EN↔tabela ganhou coluna **Fase**.
- **[`PERSONAS`](../../../01-product/PERSONAS.md) v2.0** — Lojista sobe a P1 ao lado do Tutor (os dois lados do marketplace).
- **[`USER_JOURNEYS`](../../../01-product/USER_JOURNEYS.md) v2.0** — 9 jornadas (6 do tutor, 3 do lojista), com **eventos exclusivamente da lista canônica** do `DOMAIN_MODEL`.
- **[`SUCCESS_METRICS`](../../../00-foundation/SUCCESS_METRICS.md) v2.0** — North Star operacional e cinco famílias de métrica, incluindo "lojas onboardadas × ativas" (a métrica do desengajamento do lojista) e a economia por pedido como métrica de produto.
- **[`CAPABILITIES`](../../../01-product/CAPABILITIES.md) v2.0**, **[`FEATURE_CATALOG`](../../../01-product/FEATURE_CATALOG.md) v2.0**, **[`TECHNICAL_VISION`](../../../02-architecture/TECHNICAL_VISION.md) v2.0** (núcleo técnico = transação recorrente), **[`AI_CONTEXT`](../../../05-ai/AI_CONTEXT.md) v3.0** e **[`AI_DOMAIN_KNOWLEDGE`](../../../05-ai/AI_DOMAIN_KNOWLEDGE.md) v2.0** (com as 9 regras de dinheiro e uma lista explícita de pendências que um agente **não** deve preencher sozinho).

Emendados cirurgicamente (não reescritos): **`PRODUCT_VISION` v1.1** (posicionamento em dois níveis) e **`PRODUCT_PRINCIPLES` v1.1** — o §8 deixou de ser "Marketplace é uma Consequência" e passou a **"A Cunha Vence Primeiro; o Ecossistema é a Consequência"**, preservando o que ele protegia (a experiência do tutor acima da monetização).

### Frente B — o COMO construir (commit `57809b9`)

17 arquivos, **regras preservadas, exemplos trocados** por uma tabela de
substituição fixa (`pet_tutors` → `store_members`/`StoreScopeGuard`,
`PET_NOT_FOUND` → `STORE_NOT_FOUND`, upload/S3 → webhook do PSP e conciliação,
`IAppointmentScheduler` → `ICommissionCalculator`, e assim por diante).

Onde a troca **acrescentou regra**, e não só exemplo:

- **`SECURITY`** — a seção "Storage: presigned URLs" virou **"Fronteira de pagamento: o webhook do PSP"**, com as regras que já valiam mas não estavam escritas ali; e nomeia as quatro mutações que **exigem** auditoria (preço, aceite/recusa, tabela de comissão, categoria do produto).
- **`TESTING_STRATEGY`** — a prioridade de teste passou de 4 para 5 itens, com **"Dinheiro" em 2º** e a idempotência do webhook explícita.
- **`ERROR_MODEL`** — 4 códigos novos e a regra, antes implícita, de **quando é `422` e quando é `409`**.
- **`AUTHENTICATION`** — registra que o webhook do PSP é a **exceção** ao JWT.
- **`NAMING_CONVENTIONS`** — `*Cents`/`*Bps` no contrato e a lista do que nunca vai para log no domínio de pagamento.

Duas perguntas em aberto foram **substituídas, não apagadas**: onde havia
"fechar a regra tutor primário vs. autorizado", agora está "fechar a distinção
`OWNER` × `OPERATOR` — quem altera preço, quem vê repasse".

### Frente C — arrumação, ambiente e encerramento

- **`PROJECT_STATE` v4.3** — registra `pd-06` e `pd-07`, sincroniza status e versão de cada documento com o frontmatter real, remove a nota de que as camadas 03/04 estavam defasadas, e corrige o próximo passo para **`pd-08`**.
- **`docs/README` v2.5** — 24 rótulos de status corrigidos (árvore, tabelas e ordem de leitura) e duas regras novas na "Fonte da Verdade": **documento `outdated` não exerce autoridade**, e **ADR aceito que contradiz um documento significa que o documento é que precisa ser corrigido** — a regra que faltava para esta tarefa nunca precisar acontecer de novo.
- **`README.md` da raiz v1.4** — a cunha da fase 1 na abertura, stack corrigida (**NestJS 12, Prisma 7**, linha de Pagamentos nova) e `pd-08`.
- **`DECISION_LOG` v1.4** — ADR-0006 e ADR-0007 acrescentados.
- **`IDEIAS` v1.4** — o espelho "Fora do MVP" foi reconferido contra o `MVP_SCOPE` v2.0: o marketplace saiu da lista, a carteira do pet entrou, e o aviso "este espelho está sob suspeita" foi removido.
- **`AGENTS.md`** — a cunha no §"O Projeto" e a correção de "TECHNOLOGY_STACK ainda `planned`", falso desde junho. **`PROJECT_CONTEXT.md`** — mesma frase da cunha.
- **`DEVELOPMENT_GUIDE` v2.2** — três ocorrências de `pd-02` → `pd-08`.
- **Trilhas em `Documents/petdots-estrategia`** (fora do repo): A3 concluído na Trilha A (v1.4), `00-INDICE` v1.8 com entrada no histórico de versões, A-01/A-02/A-03 e DOC-01/02/03 fechados no backlog da estratégia, e **os 7 PDFs regenerados**.

### GH_TOKEN — diagnóstico e correção

O item estava na fila desde 08/09/2026 com a hipótese "algum perfil do Git Bash
exporta a variável de novo". **A hipótese estava errada.** Medições de
10/09/2026:

| Onde | Resultado |
|---|---|
| `reg query HKCU\Environment /v GH_TOKEN` | não definida |
| `reg query HKLM\...\Environment /v GH_TOKEN` | não definida |
| `~/.bashrc`, `~/.bash_profile`, `~/.profile`, `/etc/profile*` | nenhum cita |
| Perfis do PowerShell | nenhum cita |
| `~/.claude/settings.json` | cita apenas em **três regras de permissão** (os contornos antigos); **sem bloco `env`** |
| `%APPDATA%/Antigravity/User/settings.json` | não existe |
| Cadeia de processos | `claude.exe` ← **`Antigravity IDE.exe`** |

**Conclusão:** a variável é **herdada do processo do IDE**, fora do alcance do
repositório. Correção aplicada: `.claude/settings.local.json` com
`{"env":{"GH_TOKEN":""}}` (adicionado ao `.gitignore`), depois de confirmar que
`GH_TOKEN` **vazio** faz o `gh` cair no keyring e resolver para `vhaguiar002`.

## Migrations

**Nenhuma.** A entrega é documentação e configuração local; não houve código nem
schema.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| Agrupar toda a defasagem documental numa branch só, em vez de uma tarefa por item | **Usuário** (regra geral dada em 10/09/2026) |
| Escopo = tudo que o inventário classificou como (A) ou (B) — 29 arquivos, não os 9 do backlog | IA |
| Menções históricas explícitas (ADRs, relatórios, `IDEACAO_FASE1`, changelogs) **não** se tocam | IA |
| Emendar `PRODUCT_VISION` e `PRODUCT_PRINCIPLES` cirurgicamente, e **compartilhar o diff com o sócio** antes do merge | **Usuário** (P1) |
| Seis fases no roadmap, preservando 5 = IA e 6 = impacto social | **Usuário** (P2) |
| North Star = tutores com **≥ 2 pedidos entregues nos últimos 60 dias** | **Usuário** (P3) |
| Entregador é papel operacional, não persona | **Usuário** (P4) |
| `MVP_SCOPE` lista o ciclo do dinheiro pós-captura como "dentro do escopo, modelagem pendente" | **Usuário** (P5) |
| `GH_TOKEN`: override local + teste manual do usuário fora do IDE | **Usuário** (P6) |
| Onde a fonte cala, escrever "não modelado" e apontar para `IDEIAS.md` — **nunca inventar regra** | IA |
| Rebaixar de 🔴 o item do `USER_JOURNEYS`/spike-gate, porque o critério autoritativo do spike (no `TECHNOLOGY_STACK`) já estava correto | IA |

## Validações

| O quê | Resultado |
|---|---|
| Frontmatter (`check-frontmatter.sh`) | **`OK` em todos os 33 arquivos** de `docs/` tocados, mais `PROJECT_STATE.md` |
| Termos do produto antigo em documento vivo | **0 ocorrências** de `pet_tutors`, `PET_NOT_FOUND`, `OwnershipGuard`, `petId`, `timeline.event.created`, `vaccination.registered`, `tutor.linked_to_pet`, `IAppointmentScheduler`, `feat/pet-timeline`, `/pets/{petId}` — fora de changelogs que citam o texto antigo e de duas menções históricas declaradas (`SYSTEM_ARCHITECTURE:215`, `TECHNOLOGY_STACK:129`) |
| Proveniência dos eventos do `USER_JOURNEYS` | **0 eventos sem fonte** no `DOMAIN_MODEL` v2.0 |
| Rótulo `pd-02` em documento vivo | **0 ocorrências**, exceto as três que o **explicam** (`PROJECT_STATE` ×2, `BACKLOG` ×1) |
| Links relativos dos arquivos tocados | **0 quebrados** |
| Rótulos de fase (`Fase 1`…`Fase 6`) nas camadas 00 e 01 | consistentes: 32 · 6 · 4 · 9 · 6 · 4 ocorrências |
| Status no `docs/README` × frontmatter real | **24 rótulos corrigidos**, 0 divergências restantes |
| `DECISION_LOG` × ADRs no diretório | **7 = 7** |
| PDFs das trilhas | **7 regenerados**, cada um mais novo que o `.md` correspondente |
| `gh` sem `env -u GH_TOKEN` | `vhaguiar002` como conta ativa |
| Suíte de testes / build / typecheck | **não rodados** — a entrega não toca código. O CI do PR roda a bateria completa e é o gate do merge |

### Prova de vermelho

**Não se aplica** — a entrega não cria testes-sentinela. Os critérios de
aceitação são os comandos de verificação acima, e três deles (termos defasados,
status × README, links quebrados) são candidatos a virar script de CI: registrado
como ideia, não como pendência.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | 3 | **2** |
| Vigilância (com gatilho) | 8 | 8 |
| Bloqueadores | 1 | 1 |
| Documentação | 3 | **1** |

**Saíram (4 itens):**

1. 🔴 `MVP_SCOPE` contradiz o ADR-0004 sobre o que é o MVP — **resolvido**.
2. `CAPABILITIES`, `FEATURE_CATALOG`, `USER_JOURNEYS` e `SUCCESS_METRICS` também dão o "Vida do Pet" como MVP — **resolvido**.
3. As camadas 03-engineering e 04-api ainda descrevem o produto "Vida do Pet" — **resolvido**.
4. `GH_TOKEN` fine-grained volta a aparecer no shell do agente — **resolvido na origem** (override local), com o diagnóstico registrado acima.

**Permanece na fila (2):** rotação do `GOOGLE_CLIENT_SECRET` e decisão sobre os
containers órfãos. **As duas dependem de ação manual do Victor** (console do
Google Cloud; `docker rm`), e nenhuma bloqueia trabalho de produto.

**Permanece em documentação (1):** "Nenhuma camada de features documentadas" —
gatilho é a primeira feature do MVP, não disparou.

**Entraram, e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| Validar com o sócio a emenda v1.1 de `PRODUCT_VISION`/`PRODUCT_PRINCIPLES` | Conversa com o sócio | **Victor** — a decisão P1 foi dele, mas a carta de fundação é alinhada entre os dois. Registrado como **A-05** no backlog da estratégia, não no do repo: é pendência de negócio, não de código |

Nenhum item novo de **vigilância** nasceu desta tarefa.

## Pendências geradas

- **Emenda da carta de fundação a validar com o sócio** — registrada como
  **A-05** no `BACKLOG.md` da pasta de estratégia (fora do repo), com o motivo e
  o que mudou.
- **As 20 lacunas de marketplace completo** continuam em
  [`IDEIAS.md`](../../IDEIAS.md), agora referenciadas pelo `MVP_SCOPE`
  §"Pendências de modelagem que o escopo assume", com o gatilho nomeado: migram
  para o backlog **no início da implementação do ADR-0004**. A mais urgente é o
  ciclo do dinheiro pós-captura (estorno, prazo de aceite, cancelamento) — é
  ADR, não implementação.
- **Nada mais.** Os quatro itens que saíram do backlog estão resolvidos, não
  transferidos.

## Avaliações obrigatórias da Fase 1

| Eixo | Decisão e porquê |
|---|---|
| **Auditoria** | **Não se aplica** — a entrega é documentação e configuração local, e não cria nem altera ação de sistema rastreável. A única mudança de ambiente (`GH_TOKEN`) está registrada acima com o diagnóstico completo. Vale registrar que a tarefa **acrescentou** exigência de auditoria ao `SECURITY`: as quatro mutações que passam a exigir rastro no MVP |
| **Documentação de domínio** | Esta tarefa **é** a sincronização. Ao fim, nenhum documento vivo contradiz o ADR-0004. `DOMAIN_MODEL` e `SYSTEM_ARCHITECTURE` (v2.0) não precisaram mudar — só o checkbox do `GLOSSARY` no `DOMAIN_MODEL` (v2.1), que era o último critério aberto dele |
| **Testes** | Nenhum código, nenhum teste novo. Os critérios de aceitação foram provados por comando (seção Validações). Nasce daqui uma **ideia** para `IDEIAS.md` §Processo: transformar as verificações de termos defasados, status × README e links quebrados num script de CI ao lado do `check-frontmatter.sh` — **não é pendência**, e só entra se o Victor quiser |
