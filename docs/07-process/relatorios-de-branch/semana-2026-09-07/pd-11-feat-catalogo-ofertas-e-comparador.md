---
title: "Relatório — pd-11/feat/catalogo-ofertas-e-comparador"
status: stable
version: "1.0"
updated: 2026-09-11
scope: >
  Relatório de encerramento da branch pd-11/feat/catalogo-ofertas-e-comparador,
  que entregou o comparador público de preços — segunda migration do projeto,
  três módulos novos na API, o seed versionado do catálogo e as páginas
  indexáveis /precos da landing (ADR-0010).
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md
  - 08-features/comparador/COMPARADOR_DE_PRECOS.md
type: process
---

# pd-11/feat/catalogo-ofertas-e-comparador

**Encerrada em:** 11/09/2026
**Merge:** `86225d4` em **`develop`** — squash pelo
[PR #10](https://github.com/vhaguiar07/petdots/pull/10), CI verde nos dois runs,
branch removida do remoto e do clone
**ADR:** [0010 — Comparador público antes do checkout](../../../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md)

---

## Objetivo

Victor, 11/09/2026, ao pedir a próxima tarefa:

> *"O que você recomenda matar agora? Lembrando que eu gosto de matar mais de
> uma coisa por branch, se possível agrupe mais de uma entrega num lugar só, até
> que perca um pouco de contexto"*

A análise recomendou o **eixo do comparador** — capacidades 3, 4-parcial e 5 do
`MVP_SCOPE`, jornada J2 — numa branch só, absorvendo dois itens de vigilância
cujo gatilho era literalmente "implementar a J2". Ele aprovou:

> *"Perfeito, vamos com suas recomendações. Fase 1 em Fable, pode iniciar"*

**Por que esta fatia:** era a "Próxima Atividade" do `PROJECT_STATE` v4.6; não
depende dos ADRs do ciclo do dinheiro (é **leitura**); reusa o `apps/landing` da
`pd-09` para as páginas indexáveis que o `MVP_SCOPE` #5 e o ADR-0004 #13 exigem;
e dá à landing um motivo de existir além do formulário — o comparador indexável é
o único ativo de aquisição orgânica do MVP.

## O que foi feito

**Frente 1 — `packages/domain` (regras puras).** Cinco arquivos novos, todos sem
framework e sem I/O: `slug.ts` (URL pública, transliterada), `search-text.ts`
(normalização e tokens de busca), `delivery-coverage.ts` (`areaCoversAddress` —
a regra "esta loja entrega aqui?"), `offer-ranking.ts` (preço entregue e os dois
comparadores) e `product-offerability.ts` (`assertProductCanBeOffered`).

**Frente 2 — `packages/contracts` (a borda, antes do handler).** `pagination.ts`
fixou a forma de coleção do projeto (`DEFAULT_PAGE_SIZE` 20, `MAX_PAGE_SIZE` 50);
`catalog.ts`, `stores.ts` e `offers.ts` trazem os schemas dos quatro endpoints,
com mensagens em pt-BR e **sem `transform`** — normalizar é do caso de uso
(pd-09, A11).

**Frente 3 — schema e migration.** `20260911200208_create_catalog_stores_and_offers`:
quatro tabelas, dois enums, cinco índices únicos e **quatro `CHECK` escritos à
mão** (o Prisma não os modela). `postal_code_ranges` em JSONB, `neighborhoods` em
`TEXT[]` nativo.

**Frentes 4–6 — três módulos novos na API**, nas quatro camadas do
`CODING_STANDARDS`: `catalog`, `stores` e `offers`. Os quatro endpoints são
`GET`, públicos e sem escrita. **Nenhum módulo lê tabela alheia:** o comparador
chama `catalog.FindProductUseCase` e `stores.FindDeliveryCoverageUseCase` e junta
em memória.

**Frente 7 — seed versionado** (`apps/api/src/seed/`). Catálogo real do spike
(52 produtos, todos com `ean: null`) e as 8 lojas fictícias marcadas
`PLACEHOLDER`. Idempotente por chave natural e **validado inteiro antes da
primeira escrita**.

**Frente 8 — testes.** Quatro suítes e2e novas contra Postgres efêmero com as
migrations reais, mais uma fixture pequena e explícita
(`test/support/seed-fixture.ts`) desenhada para que cada linha prove uma regra.

**Frente 9 — landing.** `/precos`, `/precos/[productSlug]`, `sitemap.xml` e
`robots.txt`. Server components, formulários `GET` puros, zero JavaScript de
cliente. `src/lib/api.ts` com `import 'server-only'` e parsing pelos schemas dos
contratos.

**Frente 10 — documentação.** Dezoito documentos na mesma entrega:

- **ADR-0010** (novo), `ADR/README` v1.5, `DECISION_LOG` v1.7;
- `DOMAIN_MODEL` v2.3 — `slug`, `search_text`, JSONB, `Store` mínima, e as duas
  invariantes novas de listagem e ranking;
- `SYSTEM_ARCHITECTURE` v2.1 — **o Fluxo 2 descrevia um JOIN que a implementação
  não faz**; era o documento mais importante de corrigir, porque quem o lesse
  reintroduziria o acoplamento;
- `API_GUIDELINES` v1.3 (paginação fixada), `ERROR_MODEL` v1.3
  (`PRODUCT_NOT_FOUND`), `FEATURE_CATALOG` v2.2, `USER_JOURNEYS` v2.2,
  `DEVELOPMENT_GUIDE` v2.4, `AI_CONTEXT` v3.1, `docs/README` v2.7;
- **`08-features/comparador/COMPARADOR_DE_PRECOS.md`** (novo) e
  `LISTA_DE_ESPERA` v1.1;
- `DIRETRIZES_FLUXO_IA` v1.3, `BACKLOG` v1.11, `BUGS` v1.2, `IDEIAS` v1.6,
  `PROJECT_STATE` v4.7.

### Débito de processo encontrado na Fase 1 e resolvido aqui (regra 3.2)

| # | O que estava errado | Como se sabe | Correção |
|---|---|---|---|
| 1 | A `pd-10` foi mergeada **sem relatório de encerramento**, obrigação do `DIRETRIZES` §7 | Branch ausente de `git branch -a`, mas PR #9 mergeado em `gh pr list --state merged` | [Relatório retroativo](pd-10-docs-duas-linhas-de-integracao.md) escrito a partir do PR e do ADR-0009 |
| 2 | A numeração `pd-NN` tinha **duas fontes**, e as duas devolviam `pd-10` de novo — número já gasto | Consequência direta do item 1 | `DIRETRIZES_FLUXO_IA` §2 ganhou a **terceira fonte**, `gh pr list --state merged` |
| 3 | `AI_CONTEXT` v3.0 afirmava "**Ainda não existe módulo de domínio**" | Falso desde a `pd-09`; é o primeiro documento que um agente lê | Corrigido na v3.1, apontando para `08-features/` |
| 4 | O índice de `relatorios-de-branch/README.md` listava **1 de 9** relatórios | Leitura do diretório | Completado; um índice que não indexa é pior que nenhum |
| 5 | O inventário documental do `PROJECT_STATE` estava defasado em **11 versões** | Comparação com o frontmatter de cada arquivo | Reconferido um a um |

## Migrations

| Migration | O que muda | Aplicada em |
|---|---|---|
| `20260911200208_create_catalog_stores_and_offers` | Cria `products`, `stores`, `delivery_areas`, `offers`; os enums `product_category` e `store_status`; 5 índices únicos, 2 índices de consulta e 4 `CHECK` | **Postgres local** (`petdots-mvp-postgres-1`, porta 5437) em 11/09/2026, e no **Postgres efêmero** de cada suíte e2e a cada execução. **Nenhum ambiente remoto** — o projeto não tem deploy |

## Decisões tomadas

As 24 decisões da análise (A1–A24) e as 6 do portão (P1–P6) estão registradas no
plano da Fase 1 e, o que sobrevive a ele, no
[ADR-0010](../../../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md).
As que mudaram o produto ou o processo:

| Decisão | Quem |
|---|---|
| Loja aparece no comparador com `status ≠ PAUSED`; `ACTIVE` governa o pedido, não a listagem | **Usuário** (P1) — avisado de que publica preço de loja que não assinou nada, e aprovou |
| `CommissionRate`/`StoreCommissionRate` ficam fora desta branch | **Usuário** (P2) |
| Escrever o ADR-0010 e reajustar dois gatilhos de decisão pendente | **Usuário** (P3) |
| Adiar o teste automatizado de UI da landing, com gatilho novo | **Usuário** (P4) — o vão fica declarado abaixo |
| Modelo e formato da Fase 2: Opus, IA sozinha | **Usuário** (P5) |
| Seed com lojas fictícias marcadas `PLACEHOLDER` até os dados de campo chegarem | **Usuário** (P6) |
| Ranking por **preço entregue**, não por preço do item | IA (A11), aprovada em bloco |
| Busca por coluna normalizada + `LIKE`, com gatilho nomeado para `tsvector` | IA (A5) |
| Paginação por **offset**, `?page=&pageSize=` | IA (A9) |
| Seed versionado como ingestão **interina** do catálogo | IA (A14) |
| `slug` em `Product` e `Store` — atributo **novo** em relação ao `DOMAIN_MODEL` v2.2 | IA (A4) |
| Cobertura de entrega resolvida em memória, com gatilho nomeado | IA (A7) |

**Uma decisão da IA durante a Fase 2, que o plano não previa:** a busca usa
`LIKE` simples, não `ILIKE`. O plano dizia "`contains` (ILIKE)", mas com a coluna
já normalizada em minúsculas a insensibilidade a caixa é redundante — `LIKE` é
determinístico e mais barato. Registrado assim no código e nos documentos.

## Validações

| O quê | Resultado |
|---|---|
| Lint | **7 workspaces**, verde |
| Checagem de tipos | **7 workspaces**, verde |
| Build | **5 tarefas**, verde |
| Testes | **22 suítes, 168 testes** — `@petdots/domain` 8/67, `@petdots/contracts` 4/37, `@petdots/api` 10/64. **Baseline na `develop` antes de mexer: 10 suítes, 63 testes** (medida em 11/09/2026, exatamente o número que o plano previa) |
| Teste de contrato | **1 suíte, 1 teste**, verde com o snapshot regenerado |
| Formatação | `prettier --check .` — "All matched files use Prettier code style!" |
| Frontmatter | `check-frontmatter.sh` **OK nos 22 `.md`** criados ou alterados (18 alterados, 4 novos) |
| Diff do `openapi.json` | **+590 linhas, −0**. Só as quatro rotas novas e seus schemas; o contrato da waitlist ficou intacto |
| Migration | `npx prisma migrate status` → "Database schema is up to date!". `grep -c 'CREATE TABLE'` = **4**, `grep -c 'CHECK'` = **4** |
| Seed idempotente | `npm run db:seed` duas vezes seguidas: **52 produtos, 8 lojas, 9 áreas, 354 ofertas** nas duas |
| Nenhuma escrita exposta | `grep -rn "@Post\|@Put\|@Patch\|@Delete"` nos três módulos: **vazio** |
| Nenhum módulo lê tabela alheia | Os três greps cruzados: **vazio** |
| **Smoke de boot** | API subida em background com `LOG_LEVEL=debug` e **derrubada na mesma resposta**. `GET /health` → **200**; `GET /products?q=golden 15` → **1 produto** (`golden-formula-caes-adultos-frango-e-arroz-15-kg`); `GET /offers?productId=…&neighborhood=Méier` → **4 lojas**, ordenadas por total (26740 < 31280 < 32320 < 35350); `GET /delivery-areas` → **9 áreas** |
| Log sem segredo | Com `LOG_LEVEL=debug` e 4 requisições logadas: **0 ocorrências** de `postgresql://`, `DATABASE_URL`, da senha do compose e de `:5437` |

> ⚠️ **A porta 3001 estava ocupada** pelo `saac-frontend` de outro projeto
> (PID 38176) — exatamente a armadilha da `pd-09`. O smoke rodou em **3011**, e
> **o processo do Victor não foi tocado**.

### Prova de vermelho

Três sentinelas, três mutações, cada uma restaurada em seguida
(`npx prisma migrate status` limpo ao final):

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| 1 | Comentado `CREATE UNIQUE INDEX "offers_store_id_product_id_key"` **no SQL da migration** | **5 de 5** de `seed.e2e-spec.ts`, incluindo o sentinela *"refuses a second offer for the same store and product"*. O `upsert` do seed também depende do índice, então o `beforeAll` morre com `42P10` — a constraint sustenta tanto a invariante quanto a re-execução do seed |
| 2 | Comentado `ALTER TABLE "offers" … CHECK ("price_cents" > 0)` **no SQL da migration** | **Exatamente 1**: *"refuses an offer priced at zero"* (1 failed, 4 passed) |
| 3 | Comentada a chamada a `assertProductCanBeOffered` em `seed-database.ts` | **Exatamente 1**: *"validates before writing: a prescription product with an offer aborts the run"* (1 failed, 4 passed) |

⚠️ A mutação é **no SQL da migration**, nunca no `schema.prisma` — mutar o schema
não prova nada, porque os testes aplicam as migrations reais (lição da `pd-09`).

### Sondagem HTTP do roteiro manual (11/09/2026)

A pedido do Victor, o roteiro foi percorrido **por HTTP** — API em `:3011` e a
landing em **build de produção** (`next start`) em `:3002` —, cobrindo tudo que
não exige olho humano. **89 asserções: 87 passaram, 2 falharam.**

| Passo | Resultado |
|---|---|
| 1 · `/api/docs` | As 4 rotas novas publicadas, mais health e waitlist |
| 2 · busca sem acento | `?q=racao` → 2 produtos, **todos** com "Ração" no nome; `?q=golden 15` → exatamente 1 (o AND funciona) |
| 3 · home | "Comparar preços" na topbar, formulário de espera e honeypot intactos (sem regressão da `pd-09`) |
| 4 · `/precos?q=golden` | 5 resultados, cada um link para o produto; formulário `method="get"`; termo preservado no campo |
| 5 · produto sem endereço | 8 ofertas ordenadas pelo preço do item (26050 … 34860), `landedCents` nulo em todas, "informe seu bairro" nas três colunas; **a ordem na tabela bate com a da API** |
| 6 · bairro Méier | **4 lojas** — Amigo Fiel, Casa dos Bichos, Agropet, Ração & Cia — ordenadas por **total**: R$ 267,40 < R$ 312,80 < R$ 323,20 < R$ 353,50; total = item + entrega em todas; badge "menor preço" **uma vez**, na linha da mais barata |
| 7 · CEP 20725-000 | **6 lojas** (a faixa de CEP alcança mais que o bairro), ordenadas por total; `GET /delivery-areas?postalCode=` concorda: 6 áreas cobrem |
| 8 · CEP `2072` | "CEP deve ter 8 dígitos." na tela, `aria-invalid="true"`, `aria-describedby` ligado ao erro, e a tabela volta ao estado sem endereço |
| 9 · Copacabana | "Nenhuma loja entrega em Copacabana ainda" + link para `/#lista-de-espera`; a API devolve lista vazia, **não** 404 |
| 10 · responsividade | **Parcial** — sem navegador não dá para medir 390px. Verificado no HTML: nenhum `display:none` por breakpoint, `data-label` em todas as células (é o que vira cartão), nenhuma largura fixa em px, meta viewport presente |
| 11 · teclado | **Parcial** — nenhum `tabindex` positivo, ordem no DOM bairro → CEP → botão, `<label for>` em todos os campos, badge com `aria-label` |
| 12 · sitemap e robots | **52 URLs de produto para 52 produtos ativos**, mais `/` e `/precos`; robots libera e aponta o sitemap |
| 13 · produto inexistente | Status **404** correto, mas o corpo não vem no HTML servido — **ver a falha abaixo** |
| 14 · API derrubada | As três páginas continuam respondendo 200 com mensagem genérica; **zero vazamento** de `localhost:3011`, `ECONNREFUSED`, stack ou caminho de arquivo. O cabeçalho do produto sobrevive pelo ISR; só o bloco de preços degrada |
| 15 · integridade no banco | 354 ofertas, **0** com preço ≤ 0, **0** pares (loja, produto) duplicados, **0** ofertas de produto com receita ou inativo, **0** slug duplicado, **0** faixa de CEP malformada, 8 lojas `PROSPECT`, 33 ofertas indisponíveis |
| 16 · seed de novo | `52 produtos, 8 lojas, 9 áreas, 354 ofertas` — idêntico, com a base já populada |
| 17 · `pilot.ts` | Aviso `PLACEHOLDER` na primeira linha do arquivo |
| **Extra** | `POST`/`PATCH`/`DELETE` nos três recursos → **404/405** (não há escrita); a URL interna da API **não aparece** no HTML de nenhuma página |

**Uma verificação que não estava no roteiro e valeu a pena:** as tags de SEO
foram conferidas uma a uma no `<head>` **servido** (fora de `<script>`) —
`title`, `description`, `canonical` e `og:title` estão lá em todas as páginas,
com a description refletindo o filtro ("8 petshops" sem endereço, "4 petshops"
com Méier). A premissa de aquisição orgânica da feature está de pé.

#### A falha encontrada, a causa provada, e a decisão

`/precos/{slug-inexistente}` devolve **404** e o `<title>` certo, mas o corpo de
`not-found.tsx` só chega no payload RSC — **com JS desligado, tela em branco**.

**Investigação, em quatro passos:**

1. Reestruturei o `notFound()` para **fora** do `try/catch`: o comportamento
   **não mudou**. O comentário que eu havia escrito atribuindo a causa ao
   `catch` estava errado e foi corrigido. A reestruturação **ficou**, porque é o
   padrão seguro — os próprios docs do Next avisam que "a `try/catch` around the
   call suppresses it", e é para isso que existe o `unstable_rethrow`.
2. Comparei com o 404 de **rota inexistente**, servido pelo `_not-found`
   estático: esse **renderiza no servidor**. Logo, não é geral.
3. **Reprodução mínima** (rota temporária, descartada em seguida): página
   dinâmica sem `generateMetadata`, sem `fetch`, com `notFound()` logo após o
   `await params`. **Comportamento idêntico** — 404, `noindex`, corpo só no
   payload. **A causa é do framework**, não do nosso código: `notFound()`
   sinaliza lançando exceção, e o React não renderiza conteúdo de fronteira de
   erro durante o SSR.
4. Conferi o alcance real: o Next injeta `<meta name="robots" content="noindex">`
   **sozinho**, e `title`/`description`/`canonical`/`og:` estão no `<head>`
   servido de todas as páginas reais.

**Decisão do Victor (11/09/2026):** manter o **404 verdadeiro**. A IA apresentou
os dois desenhos possíveis — manter como está (status correto, corpo dependente
de JS) ou renderizar a mensagem direto na página (corpo sempre servido, status
vira **200**, um *soft 404* que some dos logs e da conformidade) — com
recomendação pelo primeiro. Ele escolheu o status correto. Registrado na
vigilância do backlog e no doc de feature, com gatilho.

#### Uma suspeita que se mostrou infundada

Durante a investigação notei que `generateMetadata` e a página chamam
`compareOffers` **as duas**, e temi o dobro de requisições em toda visita.
**Medido, e não acontece:** uma visita a `/precos/{slug}?bairro=Méier` gera
**exatamente três** requisições à API — `products?slug=`, `offers?productId=` e
`delivery-areas`, uma de cada. O Next memoiza o `fetch` entre o metadata e o
render. Fica registrado aqui para ninguém "otimizar" isso depois sem medir.

### O que **não** rodou

- **Nenhum teste automatizado de interface na landing** (decisão P4 do portão). As
  três rotas novas são server components sem estado de cliente, e a única
  verificação da renderização é o roteiro manual. O gatilho para reverter isso
  está na vigilância do backlog.
- **A medição a 390px não foi feita.** "Sem rolagem horizontal" só se verifica
  renderizando, e não há navegador headless no ambiente (conferido: nem
  Playwright, nem Puppeteer) — instalar um só para isto seria dependência nova
  sem ADR. É o passo 10 do roteiro, e é o que fecha o `BUG-001`.

⚠️ **O merge aconteceu com os passos 10, 11 e 18 pendentes** — responsividade a
390px, percurso de teclado num navegador e aprovação da copy. O Victor autorizou
o encerramento em 11/09/2026 sabendo disso, pela mesma regra que valeu na
`pd-09`: "finalizar a tarefa" significa integrar na `develop`, e é justamente
para isso que a `develop` existe. Os três seguem no item 2 da seção "Intervenção
manual do Victor" do backlog, e **o `BUG-001` continua aberto** até a medição.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | 1 | **1** |
| Vigilância (com gatilho) | 11 | **13** |

**Saíram da vigilância (1):** "Comparador sem paginação nem virtualização" —
**resolvido por desenho**, não por virtualização. A medição da `pd-08` (36,7 s em
400 kbps) era de uma tela com 343 ofertas de uma vez; nenhuma tela nova renderiza
isso, porque a página é **por produto** (≤ dezenas de linhas) e a busca é
**paginada pela API**. O resíduo — não repetir a tela do spike ao construir a J2
no `apps/app` — migrou para o item de feature correspondente.

🔶 **Continua na vigilância, e deveria ter saído (1):** "Bug pendente `BUG-001`".
O gatilho ("desenhar a J2 de produto") **disparou** e a repetição foi evitada por
desenho, mas a medição a 390px é do Victor. **Sai no passo 10 do roteiro.**

**Entraram (3), e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| Busca por `LIKE` sobre `search_text` | Catálogo acima de ~500 SKUs, ou busca ruim medida | Hoje são 52 SKUs. `tsvector` agora seria infraestrutura antecipada (`AGENTS.md`) |
| Cobertura de entrega em memória | Mais de ~200 áreas ativas | Hoje são 9. Mover para SQL agora tiraria a regra do domínio puro, contra o ADR-0004 #12 |
| Landing sem teste automatizado de UI | Primeira tela com estado de cliente além do formulário, ou primeira regressão pelo roteiro | Migrou do `IDEIAS` com gatilho redefinido (P4). As páginas novas são server components sem interação — a ferramenta seria escolhida no pior momento possível |

**Ajustados (2):** "Horário de funcionamento" teve o gatilho corrigido de
"implementar `stores`" para "implementar `orders`/ativação de loja" — o módulo
`stores` nasceu aqui sem exercer a regra, e o gatilho antigo teria travado o
comparador por uma decisão que ele não usa. "Console de administração" ganhou o
registro do interino e a nota de que **já mordeu duas vezes**.

## Pendências geradas

- **Backlog** — os três itens de vigilância acima, e **três linhas novas na
  intervenção manual do Victor**: substituir as lojas fictícias do seed (3b,
  🔴 antes de qualquer deploy público), conferir os EANs do catálogo (3c), e
  aprovar ou reescrever a copy das páginas novas (3).
- **BUGS.md** — `BUG-001` atualizado com o estado real e o que falta medir.
- **IDEIAS.md** — duas ideias novas ("a partir de R$ X" na busca; página pública
  da loja) e a nota de interino na ingestão do catálogo.

### Avaliações obrigatórias da Fase 1

**Auditoria — não se aplica nesta tarefa.** Nenhuma mutação passa pela API: os
quatro endpoints são `GET`. A única escrita é o seed, operado por quem já tem
acesso ao banco, e **o Git é o rastro** de quem mudou qual preço. O `Audit`
interceptor que o `SECURITY` exige para "alteração de preço de oferta" nasce com
o **primeiro endpoint de escrita de oferta** (painel do lojista), não antes — e
está registrado como item de feature no backlog.
