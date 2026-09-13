---
title: Deployment
status: draft
version: "1.4"
updated: 2026-09-13
scope: >
  Como o PetDots é construído e entregue: ambientes, pipeline de CI/CD, build do
  monorepo (API + cliente universal via Expo/EAS) e a postura de infraestrutura
  (instância única; Postgres gerenciado; gatilhos de ADR para escalar).
  Materializa o ADR-0002 e o atributo de disponibilidade de QUALITY_ATTRIBUTES;
  não cunha versões (GIT_WORKFLOW) nem define a observabilidade (OBSERVABILITY).
relates_to:
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 02-architecture/TECHNOLOGY_STACK.md
  - 02-architecture/QUALITY_ATTRIBUTES.md
  - 03-engineering/GIT_WORKFLOW.md
  - 03-engineering/OBSERVABILITY.md
  - 03-engineering/TESTING_STRATEGY.md
type: engineering
---

# PetDots — Deployment

> O **build e a entrega** vivem aqui; **como a versão é cunhada** (SemVer, tags)
> está em [`GIT_WORKFLOW`](./GIT_WORKFLOW.md); **o que é observado** após o deploy
> está em [`OBSERVABILITY`](./OBSERVABILITY.md). A postura de infra materializa o
> [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md).

---

## Objetivo

Descrever **como o PetDots vai do commit ao ambiente em execução**: ambientes,
pipeline de CI/CD, build do monorepo e a postura de infraestrutura. Proporcional
ao MVP de produto pessoal — **simplicidade > disponibilidade** (`QUALITY_ATTRIBUTES`
#7); nada de HA/multi-região agora.

**Não cobre:** versionamento de release → `GIT_WORKFLOW`; os sinais de
observabilidade/health → `OBSERVABILITY`; o inventário da stack → [`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md).

---

## Postura de infraestrutura

Coerente com "nunca otimizar prematuramente / não adicionar infraestrutura
antecipadamente" (P5) e com a disponibilidade proporcional de `QUALITY_ATTRIBUTES`:

- **Instância única** da API (sem HA, sem multi-região no MVP).
- **PostgreSQL gerenciado** (único datastore) + **backups automáticos** (PITR
  quando disponível — sustenta a integridade do atributo #2).
- **Sem storage de objeto no MVP** — não há upload de documento (a Carteira
  Digital é fase 2). Gatilho para provisionar S3 ou compatível: a fase 2.
- **PSP** (Asaas ou Mercado Pago) como serviço externo, com o endpoint de
  **webhook acessível publicamente** e a chave de assinatura no ambiente
  (`SECURITY`).
- **Observabilidade** em **serviço gerenciado** via OTel (`OBSERVABILITY`).
- **Sem broker/fila/cache** — lembretes via scheduler in-process + advisory lock
  (ADR-0002).

> **Gatilhos de ADR para escalar** (de `QUALITY_ATTRIBUTES`/`TECHNICAL_VISION`):
> múltiplas réplicas (→ fila externa para os jobs), read-replicas, multi-região/HA,
> extração de serviço. Nenhum é adotado sem um ADR que registre o gatilho real.

## Provedor

✅ **Decidido em 13/09/2026**
([ADR-0020](../06-decisions/ADR/0020-hosting-do-piloto-railway-e-cloudflare.md)),
pelo critério de **custo mínimo com zero operação de banco**:

| Peça | Onde | Endereço |
|---|---|---|
| `apps/landing` (Node, `next start`) | **Railway**, plano Hobby, região US East | `petdots.com.br` |
| `apps/api` | Railway, mesmo projeto | `api.petdots.com.br` |
| Postgres | Railway, template Postgres com volume, **backup diário e semanal** ligados; sem PITR (aceito, com gatilho) | rede privada do projeto |
| `apps/app` (web, export estático) | **Cloudflare Pages**, com `_redirects` para as rotas dinâmicas | `app.petdots.com.br` |
| DNS | Cloudflare (nameservers trocados no Registro.br) | — |
| Domínio | Registro.br, já registrado | — |

Regras que o ADR fixa e que este documento operacionaliza:

- **Migrations:** `prisma migrate deploy` como **pre-deploy command** do serviço
  da API. Falhou, o deploy não sobe e a versão anterior continua no ar. O
  **seed nunca entra no deploy** — roda à mão, e só com dados de campo.
- **Gatilho de deploy:** a produção acompanha **`master`**
  ([ADR-0009](../06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md)).
  Publicar é promover `develop` → `master`.
- **A landing chama a API pela rede privada** do Railway (`PETDOTS_API_URL`
  interno), nunca pelo domínio público.
- 🔴 **Nada é pago até a tarefa de publicação começar** (E8): conta no Railway
  só quando a publicação estiver a dias; o trial de 30 dias cobre a montagem.
- **Custo estimado:** US$ 10-15 por mês, cobrado em dólar.

Os passos concretos abaixo foram fechados na **`pd-19`**, a tarefa de
publicação. Os números e comportamentos marcados como *medidos* foram
verificados em 13/09/2026 e a forma de reproduzi-los está junto.

---

## Passos de deploy

> Tudo aqui materializa o [ADR-0020](../06-decisions/ADR/0020-hosting-do-piloto-railway-e-cloudflare.md)
> e o [ADR-0021](../06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md).
> **Nenhum segredo aparece neste documento** — só o nome das variáveis
> (`DIRETRIZES_FLUXO_IA` §9).

### Configuração em arquivo, um por serviço

Cada serviço do Railway lê o seu próprio `railway.json`, **versionado**:

| Serviço | Arquivo | Config file path na tela do serviço |
|---|---|---|
| `api` | [`apps/api/railway.json`](../../apps/api/railway.json) | `/apps/api/railway.json` |
| `landing` | [`apps/landing/railway.json`](../../apps/landing/railway.json) | `/apps/landing/railway.json` |

O **root directory dos dois é a raiz do repositório** — é um monorepo npm
workspaces, e o Railpack o suporta sem configuração. O que separa um serviço do
outro é o `--filter` do Turborepo no build e o `-w` no start.

⚠️ **Configuração em código sobrepõe a tela.** Mudar um destes campos pelo
painel funciona até o próximo deploy, que volta ao arquivo.

| Campo | `api` | `landing` | Por quê |
|---|---|---|---|
| `build.builder` | `RAILPACK` | `RAILPACK` | É o builder cujo comportamento com Node foi verificado (abaixo). O schema o marca como experimental; a alternativa é `NIXPACKS`, e trocar exige reverificar a instalação das dev dependencies |
| `build.buildCommand` | `npm run prisma:generate && npx turbo run build --filter=@petdots/api` | `npx turbo run build --filter=@petdots/landing` | O `^build` do Turborepo constrói `packages/*` antes. O `prisma generate` precisa correr antes do `nest build` — é o mesmo passo que o CI faz |
| `build.watchPatterns` | `apps/api/**`, `packages/**`, `prisma/**`, `prisma.config.ts`, manifestos, `turbo.json` | `apps/landing/**`, `packages/**`, manifestos, `turbo.json` | Um push que só toca a landing não redeploya a API, e vice-versa |
| `deploy.preDeployCommand` | `["npx prisma migrate deploy"]` | — | É a resposta a "quem roda as migrations" (ADR-0020, E3) |
| `deploy.startCommand` | `npm run start:prod -w @petdots/api` | `npm run start:prod -w @petdots/landing` | `npm run -w` põe o cwd no workspace, então o `--import ./dist/instrumentation.js` da API resolve |
| `deploy.healthcheckPath` | `/api/v1/health` | `/` | — |
| `deploy.healthcheckTimeout` | `120` | `100` | O pre-deploy roda antes e não conta aqui |
| `deploy.restartPolicyType` | `ON_FAILURE`, 3 tentativas | idem | — |

**`start:prod` existe nos dois workspaces por um motivo.** O `start` da landing
é `next start -p 3002`, com a porta fixa que os roteiros manuais usam; o
`start:prod` é `next start` **sem `-p`**, para o Next ler o `PORT` que o Railway
injeta.

### Migrations: falha fechada, dos dois lados

`npx prisma migrate deploy` roda como **pre-deploy command** do serviço da API.
Verificado na documentação do Railway em 13/09/2026:

- o comando roda **na imagem da aplicação**, com as variáveis do serviço e
  **dentro da rede privada** — ou seja, alcança o Postgres pelo mesmo
  `DATABASE_URL` do runtime;
- *"If your command fails, it will not be retried and the deployment will not
  proceed"* — migration que falha **não sobe a versão nova**, e a anterior
  continua no ar.

O **healthcheck fecha a segunda porta**: o `GET /api/v1/health` responde `503`
quando o banco não responde, então um deploy que migrou mas não conecta nunca
fica saudável.

⚠️ **O CLI do Prisma precisa existir na imagem da aplicação**, e `prisma` é
`devDependency` da raiz. O Railpack **mantém as dev dependencies**: ele define
`NPM_CONFIG_PRODUCTION=false` na instalação e `NODE_ENV=production` só em
runtime (verificado na documentação do Railpack, 13/09/2026). 🔴 **Não definir
`RAILPACK_PRUNE_DEPS`** — ela remove as dev dependencies e o pre-deploy passa a
não encontrar o `prisma`.

🔴 **O seed nunca entra no deploy.** Ele semeia as **oito lojas fictícias** do
spike (item 3b do [`BACKLOG`](../07-process/BACKLOG.md)), e por isso o banco de
produção sobe **migrado e vazio**. Quando o censo de rua trocar
`apps/api/src/seed/data/pilot.ts`, o seed roda **à mão, uma vez**, pelo CLI do
Railway, e exige o build antes (`prisma.config.ts` aponta para
`apps/api/dist/seed/seed.js`).

### Variáveis por serviço

Nomes, nunca valores. Segredo é colado pelo Victor no painel.

**`api`**

| Variável | Origem |
|---|---|
| `DATABASE_URL` | Referência ao serviço Postgres do projeto (`${{Postgres.DATABASE_URL}}`), pela rede privada |
| `JWT_SECRET` | Victor gera (`openssl rand -base64 48`) e cola. Obrigatória e sem default: a API não sobe sem ela |
| `NODE_ENV=production`, `PORT=3001`, `LOG_LEVEL=info` | Painel. O `PORT` é **explícito** porque a landing o referencia |
| `CORS_ORIGINS=https://app.petdots.com.br` | Painel. A landing **não** entra: ela chama pelo servidor. Enquanto o app web estiver também no endereço `*.pages.dev`, os dois vão separados por vírgula |
| `TRUST_PROXY_HOPS=1` | Painel. 🔴 É disto que depende o rate limit contar por visitante — ver `SECURITY` |
| `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME=petdots-api` | Painel, com a chave do Grafana Cloud (ADR-0021) |
| chave e segredo de webhook do Asaas | Painel, **quando existirem** (`pd-17`) |

**`landing`**

| Variável | Origem |
|---|---|
| `PETDOTS_API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` | Rede privada (ADR-0020, E4). O hostname interno é `SERVICE_NAME.railway.internal` e **a porta do serviço-alvo vai na URL** |
| `PETDOTS_SITE_URL=https://petdots.com.br` | Errar isto faz o buscador indexar o endereço errado |
| `NODE_ENV=production` | — |
| `PETDOTS_COMPARADOR_PUBLICO` | 🔴 **Ausente até o censo** (ADR-0020, E9). Definir como `true` esconde nada e anuncia o comparador; ausente, ele fica fora do menu, do `sitemap.xml` e do índice do buscador |

**`petdots-app` (Cloudflare Pages, variáveis de build)**

| Variável | Valor |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.petdots.com.br` — precisa casar com o `connect-src` da CSP |
| `NODE_VERSION` | `24` |

### O app web no Cloudflare Pages

| Campo | Valor |
|---|---|
| Repositório / branch de produção | `vhaguiar07/petdots`, **`master`** |
| Root directory | raiz do repositório |
| Build command | `npm ci && npx turbo run build --filter=@petdots/app && cp apps/app/dist/+not-found.html apps/app/dist/404.html` |
| Output directory | `apps/app/dist` |
| Deploys de preview | **desligados** — só `master` publica (ADR-0020, E7) |

O `cp` existe porque o Pages serve `404.html` para caminho que não casa com
nada, e o Expo emite a tela como `+not-found.html`.

Dois arquivos em `apps/app/public/` (o `expo export` copia `public/` para o
`dist` — verificado):

- **[`_redirects`](../../apps/app/public/_redirects)** — reescreve cada rota
  dinâmica para o seu `[param].html`, com status `200`. Sem ele, um F5 em
  `/painel/abc` é `404` (ADR-0020, E5).
- **[`_headers`](../../apps/app/public/_headers)** — a **Content-Security-Policy**
  e os cabeçalhos de segurança. Ver `SECURITY`.

🔴 **Três armadilhas medidas em 13/09/2026**, com `wrangler pages dev` sobre o
export local:

1. **O destino da reescrita não leva `.html`.** Com `/painel/[storeId].html` o
   Pages devolve **308 para `/painel/[storeId]`** — ele tira a extensão de
   qualquer caminho `.html`, inclusive do alvo de uma reescrita. O navegador
   segue o 308, a URL vira o nome literal do parâmetro, e o `expo-router` passa
   a achar que o `storeId` é `[storeId]`. **Sem extensão, serve o arquivo e a
   URL não muda.**
2. **A regra ganha do arquivo.** *"Redirects are always followed, regardless of
   whether or not an asset matches the incoming request"*, e a primeira que casa
   decide — por isso rota estática que colide com um placeholder vem **antes**
   dele no arquivo.
3. **O `wrangler` lê o `.env` da raiz** e lista as variáveis dele como bindings
   (os valores saem mascarados). Rodar a prova local ciente disso.

**Como reproduzir a prova**, que é o que se faz antes de acreditar numa mudança
no `_redirects` ou na CSP:

```bash
npm run build -w @petdots/app
cp apps/app/dist/+not-found.html apps/app/dist/404.html
npx wrangler pages dev apps/app/dist --port 8788 --ip 127.0.0.1
# noutro terminal: cada rota dinâmica deve responder 200, sem Location
curl -sI http://127.0.0.1:8788/painel/abc | head -1
```

⚠️ No Windows, derrubar o emulador exige matar a árvore: o `Ctrl+C` deixa
`workerd.exe` órfão segurando a porta.

### DNS, domínio e TLS

| Registro | Tipo | Alvo | Modo |
|---|---|---|---|
| `petdots.com.br` | CNAME | domínio Railway da landing | **DNS-only** (nuvem cinza) |
| `api` | CNAME | domínio Railway da API | **DNS-only** |
| `app` | CNAME | `<projeto>.pages.dev` | criado pelo próprio Pages |
| `www` | — | redirect rule `301` para o apex | proxied |
| — | TXT | os valores de verificação que o Railway fornece | — |

O Railway exige **CNAME e TXT juntos** para cada domínio custom.

**Por que DNS-only nos dois do Railway:** é o que deixa o Railway emitir o
próprio certificado, como o ADR-0020 E6 prevê, e mantém **um único salto de
proxy** — que é o que torna `TRUST_PROXY_HOPS=1` verdadeiro. Pôr a nuvem
laranja acrescenta o salto do Cloudflare e exige subir o número para `2`, além
de escolher o modo SSL (**Full (Strict)**, nunca Flexible). Reversível por
clique, desde que as duas pontas mudem juntas.

O domínio segue no **Registro.br**, com os **nameservers apontados para o
Cloudflare** — é o Cloudflare que faz o *CNAME flattening* que o domínio raiz
exige e que o Registro.br não oferece.

### `contato@petdots.com.br`

O endereço **não é uma caixa**: o **Email Routing do Cloudflare** o encaminha
para uma caixa existente do Victor, sem custo. Exige o DNS da zona já no
Cloudflare, adiciona MX, SPF e DKIM automaticamente, e o destino recebe um
e-mail de verificação que precisa ser confirmado.

🔴 **É pré-condição de "publicado", não de deploy.** A página `/privacidade`
promete esse canal ao titular, e a LGPD manda oferecê-lo — publicar um endereço
que devolve a mensagem é pior do que não ter página.

### Ordem do go-live

1. Projeto no Railway (trial), região **US East**; Postgres pelo template, com
   **backup diário e semanal** ligados no volume.
2. Serviços `api` e `landing`, apontando para **`master`**, com os config file
   paths e as variáveis acima. ⚠️ O primeiro build falha ou sobe código antigo:
   `master` ainda não tem a publicação. É esperado.
3. **Victor autoriza**, e só então a `develop` é promovida para `master` por PR
   (`--base master`). O merge é o que dispara o deploy de verdade.
4. Verificar nos domínios do Railway: health `200` com `database: up`, as **seis
   migrations** no log do pre-deploy, a landing respondendo, um lead de teste
   chegando ao banco.
5. Nameservers trocados no Registro.br; DNS propaga; certificados emitem.
6. Email Routing ligado e **verificado com um envio real**.
7. **Upgrade para o Hobby** no dia em que `petdots.com.br` responder (ADR-0020,
   E8) — 🔴 e **antes de o trial vencer**: o Railway apaga o volume de contas
   Trial 30 dias depois de os créditos expirarem.
8. Cloudflare Pages, e `app.petdots.com.br` por último (ADR-0020, E9: landing e
   API primeiro).

### Rollback

Pelo painel do Railway: **redeploy da versão anterior**, que volta a imagem já
construída. ⚠️ **Rollback de código não desfaz migration** — as do Prisma são
para frente. Uma migration destrutiva exigiria a migration inversa; até hoje
nenhuma o é.

### Retenção de log

**7 dias no plano Hobby** do Railway (3 no Free, 30 no Pro), no painel do
deploy. Não há log drain nativo, e os logs **não** são enviados ao backend de
telemetria — decisão e gatilho no [ADR-0021](../06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md), T3.

---

## Ambientes

Proporcional ao MVP — o mínimo que separa desenvolvimento de produção:

| Ambiente | Papel |
|----------|-------|
| **Local** | Máquina do dev (Postgres em Docker) — ver [`DEVELOPMENT_GUIDE`](./DEVELOPMENT_GUIDE.md). |
| **Produção** | Instância única + Postgres gerenciado; alvo dos releases. |

Um ambiente de **staging/preview** pode ser adicionado quando houver necessidade
(ex.: validar o cliente universal antes de publicar) — decisão proporcional, não
antecipada.

---

## Pipeline de CI/CD

Acionado pelo fluxo de [`GIT_WORKFLOW`](./GIT_WORKFLOW.md) (PR → `master` → tag):

1. **CI em PR:** instalar, **lint**, **testes** (unidade + integração com Postgres
   efêmero) e **teste de contrato OpenAPI** — todos verdes são gate de merge
   (ver [`TESTING_STRATEGY`](./TESTING_STRATEGY.md)).
2. **Build do monorepo:** construir os artefatos afetados (Turborepo opcional como
   orquestrador — `TECHNOLOGY_STACK`).
3. **Release:** em tag `vX.Y.Z`, publicar/entregar os artefatos.
4. **Migrations:** aplicar migrations do Prisma de forma controlada antes/junto do
   deploy da API.
5. **Pós-deploy:** health checks verdes e sinais de `OBSERVABILITY` acompanhados.

---

## Build do monorepo

| Artefato | Build | Entrega |
|----------|-------|---------|
| **API (NestJS)** | build Node do workspace `api` | instância única (container) |
| **Cliente universal (Expo)** | **EAS** para iOS/Android; **RN Web** para a web | lojas (mobile) + **Cloudflare Pages** (web). ⚠️ O export estático gera `[param].html` para rotas dinâmicas e exige **reescrita de URL** no host (ADR-0020, E5) |
| **Landing (Next.js)** | `next build` no workspace `landing` | **hosting Node (SSR)** — ⚠️ **não é export estático** |

O **spike-gate do cliente universal foi aprovado em 11/09/2026**
([ADR-0008](../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)):
a camada de apresentação é Expo + React Native Web, sem condicional — a linha de
fallback em Next.js que existia aqui deixou de ter sentido e saiu. A landing
**não** é esse fallback: ela é uma app própria e permanente (ADR-0004 #13), que
existe pelo SEO das páginas públicas.

> ⚠️ **A landing precisa de servidor Node, não de CDN estática.** O formulário da
> lista de espera roda numa **Server Action**, que é quem chama a API — é o que
> mantém a URL interna fora do navegador e dispensa CORS. Publicá-la como export
> estático quebraria a captura. A plataforma precisa injetar `PETDOTS_API_URL`.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define a postura de infra (instância única; Postgres e observabilidade gerenciados; sem storage no MVP) com gatilhos de ADR.
- [x] Lista os ambientes proporcionais ao MVP.
- [x] Descreve o pipeline de CI/CD com os gates de `TESTING_STRATEGY` e a aplicação de migrations.
- [x] Cobre o build do monorepo (API + Expo/EAS + RN Web + landing Next.js) sem cunhar versão nem definir observabilidade.
- [x] Provedor concreto de execução/hosting decidido (ADR-0020, 13/09/2026).
- [x] Passos de deploy fechados na `pd-19` (13/09/2026): `railway.json` por serviço, migrations por pre-deploy, variáveis por serviço, `_redirects`/`_headers` do app web, DNS, Email Routing, ordem de go-live e rollback.
