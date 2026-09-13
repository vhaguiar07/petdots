---
title: 'Relatório — pd-19/feat/publicacao-do-piloto'
status: stable
version: '1.0'
updated: 2026-09-13
scope: >
  Encerramento da Etapa 1 da pd-19 — o código da publicação: rate limit por IP
  nas quatro rotas públicas, a página /privacidade que fecha os itens 4, 12 e 15
  da intervenção manual, o comparador fora do menu até o censo, o _redirects e a
  CSP do app web no Cloudflare Pages, o railway.json de cada serviço e o
  ADR-0021 com o destino da telemetria. Registra também as quatro armadilhas de
  fornecedor medidas antes de existir conta, e o que a Etapa 2 (montagem) ainda
  exige do Victor.
relates_to:
  - 06-decisions/ADR/0020-hosting-do-piloto-railway-e-cloudflare.md
  - 06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md
  - 03-engineering/DEPLOYMENT.md
  - 01-product/AVISO_DE_PRIVACIDADE.md
type: process
---

# pd-19/feat/publicacao-do-piloto

**Encerrada em:** 13/09/2026
**Merge:** `42369aa` em `develop` ([PR #22](https://github.com/vhaguiar07/petdots/pull/22), squash, CI verde nos dois runs, branch removida)
**ADR:** [0021 — O destino da telemetria do piloto é o Grafana Cloud](../../../06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md)

> 🔴 **Esta branch é a Etapa 1 da `pd-19`, não a tarefa inteira.** O produto da
> `pd-19` é o PetDots **publicado**, e publicado ele não está: falta a **Etapa
> 2**, que é montagem — contas no Railway, no Cloudflare e no Grafana, variáveis,
> nameservers no Registro.br, Email Routing, e a promoção `develop` → `master`,
> que é o que dispara o deploy. A Etapa 2 **não tem branch**: é trabalho de
> painel, e está rastreada no item **6** da intervenção manual do
> [`BACKLOG`](../../BACKLOG.md) e em [`DEPLOYMENT`](../../../03-engineering/DEPLOYMENT.md)
> §"Passos de deploy". Este relatório cobre o que a branch fez.

---

## Objetivo

O Victor abriu a Fase 1 em 13/09/2026, nas palavras dele:

> "Fase 1 da pd-19: publicar o PetDots."
>
> "Decisões já tomadas, não reabrir: Railway + Cloudflare + Registro.br
> (ADR-0020); produção acompanha master; publica-se sem seed e com /precos fora
> do menu até o censo; landing e API primeiro, app web depois; os itens 4, 12 e
> 15 viram a página /privacidade com o texto do rascunho; nada é pago até a
> publicação estar a dias."
>
> "Ainda não existem: conta no Railway, o e-mail contato@petdots.com.br, o censo
> das lojas. O plano não pode depender deles para ser escrito."

**Por que a tarefa existia.** Desde a `pd-16` existe um caminho completo dos dois
lados — o tutor compra e a loja atende — e **ninguém de fora jamais viu**. Sem
deploy não há smoke test; sem smoke test não há medição de demanda; e sem ela o
go/no-go da Trilha B não acontece. A `pd-17` (`payments`) saiu do topo não por
prioridade, mas porque a subconta do Asaas exige CNPJ, que são quatro a oito
semanas fora da engenharia ([ADR-0019](../../../06-decisions/ADR/0019-psp-do-piloto-asaas.md)).

**O que a Fase 1 acrescentou ao pedido:** a divisão em duas etapas. Todo o
código podia ser escrito, testado e integrado **antes de existir conta em
provedor nenhum**, e foi — o que preserva a restrição E8 do ADR-0020 ("nada é
pago até a publicação estar a dias") sem deixar a tarefa parada esperando o
cartão.

## O que foi feito

### Frente A — a borda pública da API

- **`apps/api/src/common/guards/rate-limit.{decorator,guard,store}.ts` e
  `rate-limits.ts`** (novos) — throttle por IP, **opt-in por rota**. Janela fixa
  em memória, com expurgo amortizado e teto de 10 mil chaves. Estouro responde
  **`429`** com o código novo **`RATE_LIMITED`** e o cabeçalho `Retry-After`.
  Orçamentos: lista de espera 5/10 min, login 10/min, cadastro 5/10 min, CEP
  30/min.
- **Sem `@nestjs/throttler`.** Ele declara peer `^10 || ^11`; forçá-lo por
  `overrides` repetiria exatamente a dívida do `nestjs-zod` que já está na
  vigilância, para ~80 linhas que o projeto sabe escrever. Precedente: o job sem
  `@nestjs/schedule` (ADR-0017, A13).
- **`main.ts` e `env.schema.ts`** — `TRUST_PROXY_HOPS`, um **número de saltos**,
  nunca `true`. Com `true` o Express acredita na entrada mais à esquerda de
  `X-Forwarded-For`, que qualquer chamador escreve; com um número, vale o
  endereço que a nossa borda observou. Default `0`, que **sub-confia** em vez de
  super-confiar.
- **`apps/landing/src/app/actions.ts`** — a Server Action passa a repassar o IP
  do visitante. Sem isso, como a landing chama a API pelo servidor, **todo lead
  do mundo contaria no balde do container da landing**. Ela envia a **última**
  entrada da cadeia, pelo mesmo motivo que o `trust proxy` é um número.
- **`app.module.ts`** — o guard é registrado nos providers do **módulo raiz**,
  à frente dos `APP_GUARD` do `IdentityModule`, e por isso roda antes do
  `AuthGuard`. Isso não estava prometido por escrito em lugar nenhum do
  framework, então virou teste.
- **`otel.sdk.ts`** — `/api/v1/health` sai dos traces.

### Frente B — a landing

- **`src/app/privacidade/page.tsx`** (nova) — a página com o texto da Parte 1 de
  [`AVISO_DE_PRIVACIDADE`](../../../01-product/AVISO_DE_PRIVACIDADE.md), sem
  nenhum ⚠️. Reaproveita o `PageShell` do comparador, que ganhou um `footer`
  opcional.
- **`src/content/privacy.ts`** — `PRIVACY_CONTACT` deixou de ser
  `contato@petdots.com.br (a definir)`.
- **`src/lib/comparador.ts`** (novo) — `isComparadorListed`. Governa
  **descoberta, não a feature**: os dois links da home, as URLs do
  `sitemap.xml` e o `noindex` das páginas de preço. As rotas seguem
  respondendo, para o Victor demonstrar por link direto. **Falha fechado.**
- **`next.config.ts`** — cabeçalhos de segurança simples, **sem CSP**: a landing
  não tem sessão nem `localStorage`, e uma CSP no Next exigiria nonce por
  middleware. A assimetria com o app web está registrada no `SECURITY`.
- **`package.json`** — `start:prod` (`next start`, sem `-p`), para o Next ler o
  `PORT` que a plataforma injeta. O `start` local segue em 3002, que é a porta
  dos roteiros manuais.

### Frente C — o app web

- **`public/_redirects`** (novo) — reescrita `200` das oito rotas dinâmicas.
- **`public/_headers`** (novo) — a **Content-Security-Policy** que faltava à
  mitigação do risco de XSS do `localStorage` (ADR-0012, P4/A4), com
  `script-src` **sem** `'unsafe-inline'` e o hash do único script inline do
  export.
- **`app.json`** — `["expo-router", { "sitemap": false }]`, para a rota de
  depuração `_sitemap` não ir ao ar.
- **`register-screen.tsx`** — "Ao criar a conta você **aceita** o [aviso de
  privacidade]", agora um link. "Concorda com" sugeriria um consentimento que a
  tela não pede e não deve pedir (ADR-0015, D10).

### Frente D — documentação

**ADR-0021** novo; e **dezesseis** documentos atualizados: `DEPLOYMENT` (a
seção "Passos de deploy" inteira, que era o último critério aberto dele),
`SECURITY` (a seção "A borda pública"), `OBSERVABILITY`, `TECHNOLOGY_STACK`,
`ERROR_MODEL`, `DEVELOPMENT_GUIDE`, `AVISO_DE_PRIVACIDADE` (promovido a
`stable`), os quatro documentos de feature tocados, `BACKLOG`, `PROJECT_STATE`,
`README`, `docs/README` e os dois índices de ADR. No ADR-0006 **só o Status**
mudou, apontando o 0021 — ADR aceito não se edita no corpo.

## Migrations

**Nenhuma.** É a primeira tarefa desde a `pd-11` sem migration.

As **seis** existentes seguem sem aplicação em produção: elas rodam pelo
pre-deploy command no primeiro deploy, que é Etapa 2.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| Publicar o texto do aviso como está, com os trechos "quando o pagamento existir" | **Victor** (portão, P1 e P2) |
| Telemetria no **Grafana Cloud Free** — 3 usuários e 14 dias decidiram, não preço | **Victor** (portão, P3) |
| O app web entra no **mesmo go-live**, como último passo | **Victor** (portão, P4) |
| Rate limit cobre **também login e cadastro**, além dos dois itens do backlog | **Victor** (portão, P5) |
| Registros do Railway em **DNS-only** no Cloudflare | IA (default do plano; confirmar na Etapa 2) |
| Dividir a Fase 2 em **Etapa 1 (código)** e **Etapa 2 (montagem)** | IA, para preservar o E8 sem parar a tarefa |
| Guard de rate limit **próprio**, sem `@nestjs/throttler` | IA |
| Throttle **desligado sob `NODE_ENV=test`**, com três suítes comprando de volta o que o interruptor esconderia | IA |
| Comparador escondido **por flag**, não por remoção de código | IA |
| A página de privacidade em **JSX**, não em dados tipados | IA — descrever o texto como estrutura exigiria inventar uma marcação, e conferi-la contra o documento seria mais difícil do que conferir o texto |
| **`CHANGELOG.md` não foi tocado** | IA — o arquivo está vazio e nenhuma release foi cunhada; ele se preenche na primeira tag, que sai de `master` |

## Validações

| O quê | Resultado |
|---|---|
| `format:check` | limpo |
| Lint | verde |
| Checagem de tipos | verde |
| Build | verde |
| Testes | **56 suítes, 750 testes**, 0 falhas — domain 17/208, contracts 7/130, app 9/101, api 23/311 *(baseline da `pd-16`: 52 suítes, 724 testes)* |
| Contrato OpenAPI | verde, com os **quatro `429`** novos no snapshot |
| Smoke de boot (como o CI) | Nest subiu, health respondeu **`503`** sem banco, linha do OTel presente |
| CI no PR #22 | **verde nos dois runs** (2m42s e 3m14s) |
| Testes manuais | **validados pelo Victor em 13/09/2026** |

### Verificações que não são suíte de teste

| O quê | Como foi medido | Resultado |
|---|---|---|
| Landing construída **sem** a flag | `next build` + `next start` + `curl` | 0 links para `/precos`; sitemap com **2 URLs**; `/precos` e `/precos/{slug}` em `noindex, nofollow`; `/privacidade` `200` e **zero** ocorrências de "a definir"; os cinco cabeçalhos de segurança presentes |
| Landing construída **com** a flag | idem | 2 links; `/precos` e os 52 produtos no sitemap; `index, follow` |
| `_redirects` e CSP do app web | `wrangler pages dev` sobre `apps/app/dist` | as **8 rotas dinâmicas** em `200`, cada uma servindo **o arquivo certo** (comparação byte a byte contra o `dist`), **URL preservada** (sem `Location`), rota inexistente `404`, CSP e os quatro cabeçalhos presentes |

⚠️ **Uma comparação foi inconclusiva por um motivo que vale registrar:**
`conta/pets/novo.html` e `conta/pets/[petId].html` são **byte a byte iguais**,
porque toda rota sob `(private)/` exporta o mesmo placeholder "Carregando sua
sessão…" (ADR-0012, A7). Os arquivos das rotas **públicas** são distintos, e
foi neles que a comparação provou alguma coisa. O comentário do `_redirects` diz
isso com todas as letras, em vez de fingir que a regra de colisão corrige um bug
que hoje não existe.

⚠️ **`isComparadorListed` não tem teste unitário.** A landing não tem Jest, e
montar a infraestrutura para uma função de uma linha custaria mais do que vale.
A regra foi provada por **build + `curl` nos dois modos**, o que exercita o que
de fato importa — a home pré-renderizada, o sitemap e a metadata. Declarado aqui
em vez de escondido.

### Prova de vermelho

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| a | `@RateLimit` removido de `POST /waitlist-entries` | **2** — o sentinela de metadado (`rate-limit.routes.spec`) e o e2e das rotas reais |
| b | `trust proxy` como `true` em vez do número de saltos | **1** — o que prova que o endereço forjado à esquerda não vale |
| c | `/api/v1/health` devolvido aos traces | **2** |

🔴 **Um erro de processo, que fica registrado porque custou trabalho.** As
mutações foram desfeitas com `git checkout --`, que reverte para o **último
commit** — e como nada estava commitado ainda, isso **apagou as mudanças de dois
arquivos** (`waitlist.controller.ts` e `otel.sdk.ts`). Foram reaplicadas e a
bateria inteira foi repetida antes de qualquer commit. **A regra que faltava:
nunca desfazer mutação com `git checkout` enquanto o trabalho não estiver
commitado — reverter a mutação à mão, ou commitar antes.**

## Achados que o plano não previa

| # | O que se descobriu | Onde ficou registrado |
|---|---|---|
| 1 | 🔴 **O destino de uma reescrita no Cloudflare Pages não pode terminar em `.html`.** Ele devolve **308** para a versão sem extensão; o navegador segue, a URL vira `/painel/[storeId]`, e o `expo-router` passa a achar que o `storeId` é literalmente `[storeId]`. Teria aparecido como "o painel abre vazio em produção" | Comentário do `_redirects`, `DEPLOYMENT` e `PROJECT_STATE` |
| 2 | **O Railpack mantém as dev dependencies** (`NPM_CONFIG_PRODUCTION=false`) e não liga `RAILPACK_PRUNE_DEPS` por padrão — o gotcha do ADR-0020 sobre o CLI do Prisma **não acontece**, desde que ninguém ligue a variável | `DEPLOYMENT` §Migrations |
| 3 | **O `wrangler` lê o `.env` da raiz** e lista as variáveis como bindings (valores mascarados) | `DEPLOYMENT` |
| 4 | 🔴 **O Railway apaga o volume do Postgres de contas Trial 30 dias depois de os créditos expirarem** — é por isso que o upgrade para o Hobby não pode atrasar | `DEPLOYMENT`, ordem do go-live |
| 5 | **O sentinela do OTel provava o loader hook pedindo `/api/v1/health`**, que esta tarefa excluiu dos traces. Passou a usar `/api/v1/products` e **também** a afirmar que o health não gera span | `instrumentation.esm.e2e-spec.ts` |
| 6 | **O pre-deploy command roda na imagem da aplicação**, com as variáveis do serviço e dentro da rede privada, e *"the deployment will not proceed"* se falhar — a falha fechada do E3 está confirmada na documentação, não presumida | `DEPLOYMENT` §Migrations |

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | 1 | **1** |
| Vigilância (com gatilho) | 36 | **34** |

**Saíram da vigilância — seis, todos com gatilho disparado por esta tarefa:**
*"Landing sem rate limit nem anti-abuso além do honeypot"*, *"`GET
/postal-codes/{cep}` sem rate limit"*, *"Serviço gerenciado de observabilidade
não escolhido"*, *"Web do `apps/app` sem CSP"*, *"O export estático do app gera
`[param].html`"* e *"`/api/v1/health` não excluído dos traces"*. Pela regra
§3.2, item cujo gatilho dispara resolve-se na tarefa que o destravou.

**Saíram da intervenção manual:** os itens **4** (canal de contato), **7**
(serviço de observabilidade), **12** (base legal e destino do link) e **15**
(transferência internacional).

**Reescritos, com diagnóstico e data:**

- *"Logs não chegam ao backend de telemetria"* — o gatilho antigo ("vendor
  escolhido") disparou, mas a **premissa** não se sustentou: com instância
  única e 7 dias de retenção no painel do Railway, enviá-los compraria
  conveniência por um exportador de logs mais um bridge do pino. Gatilho novo
  nomeado.
- *"Painéis e alertas"* — o **mínimo** foi definido (sonda HTTP e um painel de
  latência); o conjunto completo ficou com gatilho *primeira semana de tráfego
  real*.
- 🔴 *"Não existe recuperação de acesso"* — **o gatilho disparou**: com
  `app.petdots.com.br` no ar, qualquer pessoa cria conta. Foi decisão consciente
  do Victor no portão (P4), e o item agora diz que, até o canal existir, o
  conserto é ele trocar o hash por SQL.

**Entraram, e por que não couberam nesta tarefa:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| Rate limit vive na memória do processo | A segunda réplica da API | Instância única é a postura do `DEPLOYMENT`; um store compartilhado custaria Redis, que o ADR-0002 proíbe antecipar |
| O `_redirects` precisa acompanhar rota estática nova sob prefixo dinâmico | Rota nova sob `/painel`, `/pedidos`, `/conta/pets`, `/loja` ou `/precos` | Hoje é inofensivo — as rotas privadas exportam HTML idêntico; morde quando uma delas deixar de ser privada |
| O hash da CSP está preso ao script de hidratação do Expo | Upgrade do `expo-router` ou do `expo` | Não há como hashear o que ainda não mudou; o sintoma é tela em branco, e o comando de recálculo está no próprio arquivo |
| A sonda de uptime pode depender de serviço externo ao Grafana | Confirmar no cadastro se o Free inclui Synthetic Monitoring | Só se sabe criando a conta, que é Etapa 2 |

## Pendências geradas

- **`BACKLOG.md`** — as quatro linhas de vigilância acima; os itens **16**
  (leitura jurídica do §3 do aviso, premissa A5) e **17** (prazo fiscal de 5
  anos com o contador, premissa A7) da intervenção manual; a seção
  **"Pendências de produção → Produção"**, que deixou de dizer "nada pendente" e
  passou a listar os cinco itens que valerão no dia seguinte ao go-live; e o
  item **6** reescrito com as duas etapas.
- **`BUGS.md`** — **nenhum**. Nenhum bug foi encontrado nesta tarefa.
- **`IDEIAS.md`** — nenhuma entrada nova.
- ⚠️ **`CHANGELOG.md` segue vazio**, deliberadamente: ele registra mudanças por
  versão, e nenhuma tag foi cunhada. Preenche-se na primeira release, que sai de
  `master` (`GIT_WORKFLOW`).

## Avaliações obrigatórias da Fase 1

- **Auditoria: não se aplica.** A tarefa não cria nem altera mutação de domínio.
  O rate limit é rejeição de borda, e o que ele registra é uma linha de log com
  rota, IP e `requestId` — **nunca o corpo**, porque uma tentativa de login
  carrega e-mail e senha.
- **Documentação de domínio: nenhuma regra de negócio mudou.** O que a tarefa
  desatualizou está na Frente D. Vale destacar uma **correção**, não só
  atualização: o comentário de `otel.sdk.ts` dizia que o health era *"the only
  real route today"*, e não é mais — são dezenas.
- **Testes que nasceram:** `rate-limit.store.spec` (contagem, janela, expurgo,
  teto), `rate-limit.guard.e2e-spec` (a recusa, sobre controller descartável,
  incluindo as duas asserções de `trust proxy`), `rate-limit.routes.spec` (o
  sentinela de metadado das quatro rotas reais) e `rate-limit.routes.e2e-spec`
  (as rotas reais com o interruptor forçado, e a **ordem dos guards**). Mais a
  asserção nova no sentinela do OTel, de que o health **não** gera span.

## O que a Etapa 2 precisa, em uma lista

Tudo depende do Victor; nada é engenharia. Ordem e detalhe em
[`DEPLOYMENT`](../../../03-engineering/DEPLOYMENT.md) §"Passos de deploy".

1. Conta no **Railway** (só quando a publicação estiver a dias — E8), no
   **Cloudflare** e no **Grafana Cloud**; apps do GitHub autorizados.
2. `JWT_SECRET` e a chave de telemetria colados no painel.
3. **Promoção `develop` → `master`**, que é o que dispara o deploy e leva as
   seis migrations.
4. Nameservers de `petdots.com.br` no Registro.br para o Cloudflare.
5. **Email Routing** de `contato@petdots.com.br` — 🔴 pré-condição de go-live.
6. Upgrade para o **Hobby**, antes de o trial vencer.
7. `app.petdots.com.br` no Cloudflare Pages, por último.
