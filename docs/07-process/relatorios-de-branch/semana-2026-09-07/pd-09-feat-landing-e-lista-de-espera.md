---
title: "Relatório — pd-09/feat/landing-e-lista-de-espera"
status: stable
version: "1.0"
updated: 2026-09-11
scope: >
  Relatório de encerramento da pd-09: a primeira fatia de produto do PetDots —
  primeira migration, primeiro módulo de domínio da API (waitlist), regras puras
  de telefone e CEP, contrato da lista de espera, o workspace apps/landing em
  Next.js e a camada docs/08-features. Registra decisões, validações com números
  reais, a prova de vermelho do sentinela de unicidade e o saldo do backlog.
relates_to:
  - 07-process/BACKLOG.md
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 08-features/waitlist/LISTA_DE_ESPERA.md
  - 01-product/DOMAIN_MODEL.md
type: process
---

# pd-09/feat/landing-e-lista-de-espera

**Encerrada em:** 11/09/2026
**Merge:** _pendente_ — aguarda pedido explícito do Victor (`DIRETRIZES_FLUXO_IA` §7)
**ADR:** nenhum — ver a decisão A19 abaixo

---

## Objetivo

Victor, em 11/09/2026, ao pedir a recomendação do que atacar em seguida:

> "O que você recomenda matar agora? Lembrando que eu gosto de matar mais de uma
> coisa por branch, se possível agrupe mais de uma entrega num lugar só, até que
> perca um pouco de contexto"

A análise (Fase 1, em Fable) recomendou **a branch que põe o smoke test em pé**,
e o Victor aprovou o recorte: *"Perfeito, pode entrar na Fase 1, em Fable"*.

**Por que esta fatia e não "começar o marketplace":** é a única que atravessa a
pilha inteira (Next.js → Nest → Prisma → migration → contrato → CI), exercitando
de ponta a ponta o que até então só tinha sido bootstrapado; produz o artefato
que o Victor leva para a rua (ele é o único fundador de rua, piloto no eixo
Grande Méier — `IDEACAO_FASE1` §20, smoke test); e não depende de nenhuma das 9
pendências de modelagem que travam `orders`/`payments`.

É o item **B5 da Trilha B** da fila estratégica, liberado pelo semáforo da
Trilha D para acontecer **durante** o trabalho de campo.

## O que foi feito

Cinco entregas numa branch só, na ordem em que uma depende da outra.

**`feat(waitlist): cria a lista de espera do banco ao contrato`** (`d04e34c`)

- **`prisma/schema.prisma`** — nasce o primeiro model do projeto,
  `WaitlistEntry`, com o enum `WaitlistSource`. O comentário do bootstrap ("não
  cria nenhum model") foi substituído pela regra que vale daqui em diante: cada
  agregado entra com a feature que o exercita, nunca antes.
- **`packages/domain/src/phone.ts` e `postal-code.ts`** — as primeiras regras de
  negócio de verdade do projeto. `normalizeBrazilianMobilePhone` leva qualquer
  grafia a E.164; `normalizePostalCode` reduz o CEP a 8 dígitos. Ambas com
  envelope sem exceção (`is…`) para o contrato usar. As mensagens de erro falam
  em **quantidade de dígitos, nunca no número** — elas viajam para o log, e
  telefone é PII.
- **`packages/contracts/src/waitlist.ts`** — o contrato da borda, que valida com
  **as mesmas funções** do domínio via `.refine()`. Uma fonte só para "o que é um
  telefone válido". O pacote passou a depender de `@petdots/domain`.
- **`apps/api/src/modules/waitlist/`** — o **primeiro módulo real**, nas quatro
  camadas do `CODING_STANDARDS`, servindo `POST /api/v1/waitlist-entries`. A
  normalização acontece no caso de uso, não no contrato (A11), e o repositório
  deixa **a constraint decidir** a duplicidade em vez de ler antes de escrever —
  dois visitantes enviando o mesmo telefone no mesmo instante passariam por uma
  leitura prévia, e só o índice único é atômico.
- **`apps/api/src/common/http-exception.filter.ts`** — o filtro passou a honrar
  um `code` vindo no corpo da `HttpException`, e o genérico do `403` deixou de
  ser `OWNERSHIP_DENIED` (resquício do produto v1.0) para ser `FORBIDDEN`. Débito
  encontrado na Fase 1, resolvido aqui (§3.2).
- **`packages/config/eslint.base.mjs`** — `import-x/no-extraneous-dependencies`
  não previa helper de teste compartilhado; `**/test/**` entrou na allowlist de
  devDependencies. Débito encontrado na Fase 2, resolvido nela.

**`feat(landing): publica a captura da lista de espera em next.js`** (`3952f29`)

- **`apps/landing/`** — workspace novo, criado **à mão** (não por
  `create-next-app`, que instala com `^` e gera lixo). A API é chamada **pelo
  servidor**, numa Server Action: sem CORS a configurar, a URL interna não vai ao
  navegador, e o honeypot é checado antes de qualquer requisição sair.
- **`turbo.json` / `ci.yml` / `.env.example`** — `.next/**` nos outputs,
  `NEXT_TELEMETRY_DISABLED` no CI (nenhum passo novo: `turbo run` já alcança a
  landing) e `PETDOTS_API_URL` documentada como opcional.

**`style: aplica o prettier nos arquivos do spike que ficaram fora`** (`9e1e993`)

- Seis arquivos de `apps/app/src/spike/` estavam fora do padrão desde a `pd-08`.
  Medido: `apps/app` não foi tocado por esta branch, logo a defasagem era
  pré-existente. Formatação pura, sem mudança de comportamento.

**Docs** — 13 documentos na mesma entrega, mais a camada nova. Os mais
importantes são os que **descreviam o estado antigo como correto**:
`DOMAIN_MODEL` v2.2 (os valores de `source` estavam em pt-BR minúsculo,
contrariando o `NAMING_CONVENTIONS`, e faltavam `consent_at`/`updated_at` e as
invariantes do telefone); `TECHNOLOGY_STACK` v1.6 e `DEVELOPMENT_GUIDE` v2.3
("landing ainda não bootstrapada", "schema sem models", o spike-gate como
próximo passo); `DEPLOYMENT` v1.2 (a linha "Web (fallback Next.js)" perdeu o
sentido com o gate aprovado); `FEATURE_CATALOG` v2.1 ("nada está implementado").
Nasceu **`docs/08-features/`** com
[`waitlist/LISTA_DE_ESPERA.md`](../../../08-features/waitlist/LISTA_DE_ESPERA.md).

## Migrations

| Migration | O que muda | Aplicada em |
|---|---|---|
| `20260911155642_create_waitlist_entries` | `CREATE TYPE "waitlist_source"`; `CREATE TABLE "waitlist_entries"` (id UUID com `gen_random_uuid()`, auditoria `created_at`/`updated_at`); `CREATE UNIQUE INDEX` em `phone` | **Postgres local do Victor** (5437), 11/09/2026. Nos testes, aplicada a cada execução num container efêmero. **Nenhum ambiente remoto** — não há deploy |

É a **primeira migration do projeto**. Ao trazer esta branch, qualquer clone com
banco precisa de `npm run prisma:migrate` + `npm run prisma:generate`.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| Recorte de cinco entregas numa branch; A3–A21 da análise | **Usuário** (portão, 11/09) |
| Consentimento LGPD: checkbox obrigatório + coluna `consent_at` carimbada pelo servidor (P2) | **Usuário** |
| Telefone único como identidade do lead; repetir devolve `409` (P3) | **Usuário** |
| `PRIVACY_CONTACT` fica como placeholder visível até o Victor decidir o canal (P4) | **Usuário** |
| Modelo e formato da Fase 2: Opus, IA sozinha (P5) | **Usuário** |
| Endpoint único, **sem `GET`** e **sem header `Location`** — não há leitura pública de PII, e apontar para rota inexistente é pior que omitir (A8) | IA |
| Normalização em `packages/domain`, e `contracts` passa a depender de `domain` (A10) | IA |
| Contratos **sem `transform`** — normalização é do caso de uso, para a entrada e a saída do OpenAPI não divergirem (A11) | IA |
| `waitlist.joined` **não** é emitido: sem barramento e sem consumidor, seria infraestrutura antecipada (A14) | IA |
| Anti-abuso só por honeypot; rate limit é decisão do deploy (A18) | IA |
| **Sem ADR** — Next.js na landing já é o ADR-0004 #13, e pinar versão é inventário (A19) | IA |
| Manter React **19.2.3** (não a `latest` 19.3.0) para igualar `apps/app` (A3) | IA |
| **Estilização da landing** — paleta, layout em duas colunas, ícones inline. Não havia paleta decidida em `docs/`; a proposta partiu do nome da marca | IA, **aprovada pelo Victor** ("ficou muito bom") |
| Devolver os valores digitados no `FormState` — o React 19 reseta o formulário após a action, e um erro de CEP apagaria o resto | IA (achado na Fase 2) |

## Validações

| O quê | Resultado |
|---|---|
| Checagem de tipos | **7 workspaces**, verde |
| Lint | **7 workspaces**, verde |
| Build | **5 tarefas**, verde |
| Testes | **10 suítes, 63 testes** — `@petdots/api` 6/30, `@petdots/domain` 3/25, `@petdots/contracts` 1/8. Baseline antes da branch: 5 suítes, 26 testes |
| Teste de contrato | **1 suíte, 1 teste**, verde — o diff do `openapi.json` trouxe **só** a rota nova e seus dois schemas |
| Smoke de boot (migration) | API compilada subiu, `/api/v1/health` → **200**, derrubada na mesma resposta |
| `next build` | **8,8 s** de compilação; rotas `/` e `/_not-found`, ambas estáticas. ⚠️ O output do Next 16 com Turbopack **não imprime mais o first-load JS** que o plano pedia para anotar |
| Nenhum PII em log | Rodado com `LOG_LEVEL=debug`, um `POST` real: **16 linhas de log, 0 ocorrências** de telefone, nome ou CEP |
| Formatação | `npm run format:check` verde no repositório inteiro |
| `npm ls react` | `@petdots/app` e `@petdots/landing` resolvem **19.2.3** cada um |
| CI | ver a seção de pendências — push feito no encerramento |

**O que NÃO rodou, e é preciso dizer:** o **roteiro de testes manuais não foi
percorrido pelo Victor passo a passo**. Ele abriu a landing, reprovou o visual
inicial ("tá quase crua"), aprovou o redesenho ("ficou muito bom") e mandou
encerrar. Os passos funcionais (erros por campo na tela, `409` pela interface,
Prisma Studio, 390px, navegação só por teclado) **não têm confirmação humana** —
os caminhos equivalentes estão cobertos por teste automatizado no lado da API,
mas **a Server Action da landing não tem teste nenhum** (decisão da análise: sem
framework de teste de UI nesta tarefa). Esse é o vão de cobertura desta entrega.

### Prova de vermelho

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| 1 | Comentado o `CREATE UNIQUE INDEX "waitlist_entries_phone_key"` na migration | `Waitlist (e2e) › rejects the same phone written differently` — **`201` em vez de `409`**. 1 falhou, 3 passaram |

⚠️ **Correção ao plano:** ele mandava comentar o `@unique` do `schema.prisma`.
Isso **não** provaria nada — quem cria a constraint no Postgres efêmero é o SQL
da migration, e o Prisma continuaria recebendo o erro do banco. A mutação
honesta é na migration, e foi essa que rodou.

### Um erro de medição que vale registrar

Durante a checagem de PII, o `POST` devolveu `404` e quase virou diagnóstico de
"módulo quebrado". A causa era outra: o **`saac-frontend`** do Victor (outro
projeto) tinha subido na porta **3001** no meio da sessão, e o dev server dele
responde `200` a qualquer `GET` (fallback de SPA) e `404` a `POST`. A medição foi
refeita na porta 3007. É exatamente o caso que o `DIRETRIZES` §8 antecipa:
**conferir se o processo em execução é o código novo antes de concluir qualquer
coisa** — e "responde 200" não é essa prova.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | 1 | **1** |
| Vigilância (com gatilho) | 12 | **14** |

A **fila permanece em 1** — o OAuth client do Google Cloud, que só o Victor pode
revogar. Nenhum item de débito acionável nasceu nem morreu aqui.

**Saíram (de outras seções, não da fila):**

- **Features** — "Bootstrapar `apps/landing` em Next.js" (ADR-0004 #13). Entregue.
- **Documentação** — "Nenhuma camada de features documentadas". O gatilho era
  "criar junto com a primeira feature do MVP", e esta foi a primeira. A seção
  ficou vazia.

**Entraram, e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| Landing sem rate limit além do honeypot | **Deploy público da landing** | Não há hosting nem domínio; a forma do throttling (plataforma, proxy ou `@nestjs/throttler`) é decisão do deploy, que não existe |
| `waitlist.joined` documentado mas não emitido | **Primeiro consumidor de evento in-process** | Instalar `@nestjs/event-emitter` para um evento sem ouvinte é infraestrutura antecipada (`AGENTS.md`) |

**Reescrito (não duplicado):** o item do `eslint-config-expo` passou a cobrir
também o **`eslint-config-next`** — é o mesmo `eslint-plugin-react` e o mesmo
contorno de uma linha, agora em dois lugares.

**Seção nova — "Decisões pendentes (modelagem)", 9 itens.** Migraram do
`MVP_SCOPE` porque o gatilho registrado lá ("início da implementação do
ADR-0004") disparou. **Não entram na contagem da fila:** não são código a
escrever, são decisões que pedem ADR próprio antes da implementação
correspondente.

## Pendências geradas

- **Duas linhas novas na vigilância** do [`BACKLOG.md`](../../BACKLOG.md)
  (rate limit; evento `waitlist.joined`), ambas com gatilho nomeado.
- **Nove decisões de modelagem** na seção nova do mesmo arquivo.
- **A própria `pd-09` em "Aguardando merge"**, com o lembrete de que a migration
  precisa ser aplicada em qualquer ambiente que já tenha banco.
- **`PRIVACY_CONTACT` provisório** (`contato@petdots.com.br (a definir)`) e a
  **lista de bairros** do `<datalist>` — decisões do Victor, ainda pendentes,
  registradas no documento da feature.
- **Nenhum bug** encontrado: nada foi para o [`BUGS.md`](../../BUGS.md).

### O que este relatório recomenda como próxima tarefa

O `PROJECT_STATE` v4.5 aponta **catálogo → oferta → comparador** (J2) como
próxima atividade, e continua correto do ponto de vista de produto. Mas há um
argumento para uma **`pd-10` de publicação da landing** vir antes: o smoke test
(B5 da Trilha B) é o que mede demanda **antes** de meses de código, e hoje ele
está travado não por software, mas por não haver deploy — o critério "provedor
concreto de hosting" segue aberto no `DEPLOYMENT` desde o bootstrap. Publicar
destrava o smoke test, dá ao Victor um link para as conversas de campo, e
dispara o gatilho de dois itens da vigilância. **A ordem é decisão do Victor.**

## Avaliações obrigatórias da Fase 1

| Eixo | Decisão e porquê |
|---|---|
| **Auditoria** | **Não se aplica.** A única mutação é a criação anônima de uma entrada de lista de espera; `created_at` + `source` são rastro suficiente, não há ator autenticado a registrar, e a lista de mutações que **exigem** auditoria no `SECURITY` (preço, aceite/recusa, comissão, categoria) não a inclui. O `Audit interceptor` do `SYSTEM_ARCHITECTURE` nasce com a primeira delas |
| **Documentação de domínio** | 13 documentos atualizados na mesma entrega (lista acima), mais a camada `08-features/` e o `docs/README.md` v2.6. `check-frontmatter.sh` verde em todos |
| **Testes** | Unidade: `phone.spec.ts`, `postal-code.spec.ts` (domínio), `waitlist.spec.ts` (contrato). Integração: `waitlist.e2e-spec.ts` contra Postgres efêmero **com as migrations reais**, incluindo o sentinela de unicidade com prova de vermelho. Contrato: snapshot regenerado. **Landing: sem teste automatizado** — decisão da análise, e o vão está declarado acima |
