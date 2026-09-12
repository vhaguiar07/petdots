---
title: Backlog
status: stable
version: "1.12"
updated: 2026-09-12
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
> 🙋 **O que depende do Victor está reunido numa seção própria**, logo abaixo
> dos bloqueadores — acesso que a IA não tem, decisão de produto, validação
> humana ou dinheiro. Ela aponta para os itens onde eles vivem, **sem** alterar
> a contagem da fila.
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

Última revisão: 12/09/2026.

---

## Bloqueadores

**Nenhum.** O único bloqueador aberto era o **spike-gate do cliente universal**,
executado na `pd-08` e **aprovado pelo Victor em 11/09/2026**
([ADR-0008](../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)).
A camada de cliente do MVP deixou de ser indefinida: é `apps/app`, Expo + React
Native Web, sem condicional. As capacidades do
[`MVP_SCOPE`](../01-product/MVP_SCOPE.md) estão liberadas para implementação.

## Intervenção manual do Victor

> **O que só as mãos dele resolvem** — acesso que a IA não tem, decisão de
> produto, validação humana ou dinheiro. Reunido aqui em 11/09/2026 (`pd-09`) a
> pedido do Victor, porque estava espalhado por cinco seções e por documentos de
> feature.
>
> ⚠️ **Esta seção não muda a contagem da fila de débito, que segue em 1.** Ela
> **aponta** para os itens onde eles já vivem, em vez de duplicá-los — item
> duplicado é item que se resolve num lugar e continua aberto no outro. Onde não
> havia registro anterior, a linha nasce aqui.

| # | O que depende de você | Onde vive | Por que a IA não faz |
|---|---|---|---|
| 1 | **Revogar o OAuth client do protótipo legado** no console do Google Cloud (`411727527361-qd7g95…` — só o client, não o projeto) | Fila de débito, abaixo — **é o único item da fila** | Acesso ao console. Passo a passo no `LEIA-ME.txt` em `%USERPROFILE%\petdots-legacy-env\` |
| 2 | **Percorrer os roteiros funcionais da landing** — os passos 2 a 11 da `pd-09` (erros por campo, `409` pela interface, Prisma Studio, 390px, teclado, API derrubada) **e os 18 passos da `pd-11`** (busca, comparação por bairro e por CEP, CEP inválido, bairro fora do piloto, 390px nas duas páginas novas, teclado, `sitemap.xml`, 404 de produto, API derrubada, seed rodado duas vezes) | Nasce aqui. Roteiros nos relatórios da [`pd-09`](relatorios-de-branch/semana-2026-09-07/pd-09-feat-landing-e-lista-de-espera.md) e da [`pd-11`](relatorios-de-branch/semana-2026-09-07/pd-11-feat-catalogo-ofertas-e-comparador.md) | Validação humana de interface. ⚠️ **A landing não tem teste automatizado de UI** (decisão P4 da `pd-11`, com gatilho registrado na vigilância) — estes roteiros são hoje a **única** verificação da renderização das páginas e da ponte entre formulário e API. O passo 10 da `pd-11` é também o que fecha o `BUG-001` |
| 3 | **Aprovar ou reescrever a copy da landing e a lista de bairros** do `<datalist>` — **agora também a copy de `/precos` e da página de produto** (título, textos de estado vazio, rótulos das colunas, o badge "menor preço") | Nasce aqui. Constantes em `apps/landing/src/content/neighborhoods.ts`; textos em `page.tsx`, `waitlist-form.tsx` e, desde a `pd-11`, em `precos/page.tsx` e `precos/[productSlug]/page.tsx` | Decisão de produto, registrada desde a análise: *"Copy e bairros são do Victor, não da IA"*. A IA entregou como proposta |
| 3b | 🔴 **Substituir `apps/api/src/seed/data/pilot.ts` pelos dados de campo** (Trilha B, item B4) **ANTES de qualquer deploy público** | Nasce aqui (`pd-11`). Arquivo marcado `PLACEHOLDER` na primeira linha | As **8 lojas do seed são fictícias**, herdadas do spike da `pd-08`, e os preços são gerados por algoritmo. Publicar nomes inventados de petshop como se fossem reais é o tipo de erro que não se desfaz. Só você tem os dados de rua |
| 3c | **Conferir os EANs do catálogo inicial e aprovar a lista de produtos** | Nasce aqui (`pd-11`). `apps/api/src/seed/data/products.ts` — 52 produtos, **todos com `ean: null`** | O `null` é deliberado: o `DOMAIN_MODEL` admite produto sem EAN "com curadoria manual e marcação explícita", e inventar código de barras violaria a invariante de forma disfarçada. Conferir exige a embalagem na mão |
| 4 | **Definir o canal de contato do aviso de privacidade** (LGPD) | Nasce aqui. Constante `PRIVACY_CONTACT` em `apps/landing/src/content/privacy.ts` | Decisão P4 do portão: o valor hoje é `contato@petdots.com.br (a definir)`, **deliberadamente marcado como provisório**. ⚠️ Não publicar a landing com ele assim — é o canal que a LGPD manda oferecer ao titular |
| 5 | **Promover a `develop` para `master`**, quando quiser | "Aguardando promoção", no fim deste documento | ✅ **Metade resolvida em 11/09/2026:** a `develop` foi criada e a `pd-09` mergeada nela ([ADR-0009](../06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md)) — decisão sua, tomada depois de a IA recomendar o contrário e você reafirmar. O que resta é o que o próprio modelo lhe reserva: **`master` só avança a pedido explícito seu**, a cada vez. ⚠️ Enquanto não promover, `master` fica atrás do estado real, e quem clonar o repositório cai nela |
| 6 | **Escolher o provedor de hosting e publicar** (landing + API + Postgres gerenciado + domínio) | Critério aberto no [`DEPLOYMENT`](../03-engineering/DEPLOYMENT.md); dispara os itens de rate limit e de observabilidade na vigilância | Envolve conta, cartão e domínio. ⚠️ **É o que trava o smoke test hoje** — a landing existe e passa no CI, mas roda só em `localhost`. Sem ela publicada, não há campanha nem medição de demanda (B5 da Trilha B) |
| 7 | **Escolher o serviço gerenciado de observabilidade** | Vigilância, abaixo — gatilho "existir ambiente de deploy" | Cadastro e chave. Anda junto com o item 6 |
| 8 | **Compartilhar com o sócio o diff da emenda v1.1** de `PRODUCT_VISION`/`PRODUCT_PRINCIPLES` (o §8 virou "A Cunha Vence Primeiro") | Nota em "Aguardando merge", no fim deste documento; **A-05** no backlog da estratégia | É carta de fundação, alinhada entre os dois sócios. A `pd-07` foi mergeada antes dessa validação — consequência assumida no merge |
| 9 | 🔴 **Gerar o `JWT_SECRET` do seu `.env` local** — `openssl rand -base64 48`, colar no `.env` | Nasce aqui (`pd-12`). Documentado no [`DEVELOPMENT_GUIDE`](../03-engineering/DEVELOPMENT_GUIDE.md) e no `.env.example` | A variável é **obrigatória e sem default** (ADR-0011): sem ela **a API não sobe**. É deliberado — segredo com default é segredo que vai para produção. A IA não escreve no seu `.env`, que é local e não versionado. O mesmo vale para o ambiente de deploy, quando existir |
| 10 | **Decidir `OWNER` × `OPERATOR`** — quem altera preço, quem vê repasse | Nasce aqui (`pd-12`). Critério desmarcado no [`SECURITY`](../03-engineering/SECURITY.md) e no [`AUTHENTICATION`](../04-api/AUTHENTICATION.md); aponta para o item de vigilância do `StoreScopeGuard`, abaixo | **Decisão de produto**, não técnica, e o próprio `SECURITY` a declara pré-requisito da autorização fina. ⚠️ **É o que trava o `StoreScopeGuard`**, que por sua vez trava a escrita de ofertas pelo lojista — o item de maior valor do backlog |

**Fora do repositório, mas bloqueando o mesmo objetivo:** o **polígono de
entrega (B4b)** e as conversas com lojistas (B4) — trabalho de rua, rastreado em
`TRILHA-B-validacao-de-mercado.md` na fila estratégica (`petdots-estrategia/`,
fora deste repo), não aqui. Junto com o item 6, é o que falta para ligar o smoke
test.

## Débito técnico

> Dividido em **fila** e **vigilância** (`DIRETRIZES_FLUXO_IA` §3.3). **O número
> que se reporta é o da fila.** Vigilância não é trabalho esperando: é anotação
> com gatilho nomeado, e o item só volta para a fila quando o gatilho dispara —
> momento em que ele entra na tarefa que o destravou (§3.2), não numa branch de
> débito própria (§3.1).

### Fila — acionável hoje

> **Um item, e o que falta nele é acesso que a IA não tem** (console do Google
> Cloud). Não há trabalho de débito acionável dentro do repositório. Ainda assim,
> **tarefa só de débito só se abre** quando o item bloqueia trabalho de produto
> ou é risco de segurança ativo (§3.1).

| Item | Detalhe | Origem |
|---|---|---|
| **OAuth client do protótipo legado ainda ativo no Google Cloud — revogação pendente** | **Atualizado em 10/09/2026 — o lado do disco está resolvido; sobrou o console.** O `.env` que era o único exemplar do `GOOGLE_CLIENT_SECRET` em texto puro **foi apagado**, junto de todo o `%USERPROFILE%\petdots-legacy-env\` (restou só um `LEIA-ME.txt` com o passo pendente e o client ID). Não existe mais exemplar do segredo em lugar nenhum, e o arquivo **nunca foi versionado** (verificado em 06/09/2026: `git log --all` e `git grep` sobre `git rev-list --all` vazios). **Decisão de 10/09/2026 (IA recomendou, Victor delegou): revogar em vez de rotacionar** — o client servia ao protótipo arquivado na tag `legacy-marketplace`, não há código vivo que o use, e o segredo foi exposto em texto puro no transcrito de uma sessão de IA em 06/09/2026, devendo ser tido por comprometido de todo modo; rotacionar manteria credencial real viva para código morto. **Trabalho (só o Victor tem acesso):** excluir o OAuth client `411727527361-qd7g95…` no console do Google Cloud — **só o client, não o projeto**; feito isso, apagar a pasta. Passo a passo no `LEIA-ME.txt` | Inspeção do ambiente ao subir a stack, 06/09/2026; validade confirmada no console em 08/09/2026; limpeza do disco em 10/09/2026 |

### Vigilância — bloqueado por gatilho

> Cada item nomeia **o que o destrava**. Item aqui sem gatilho nomeado está no
> lugar errado: ou é fila, ou o gatilho está faltando.

| Item | Detalhe | Origem |
|---|---|---|
| 🔴 **Não existe recuperação de acesso — gatilho: primeiro usuário real fora do seed** | Desde a `pd-12` dá para logar, mas quem esquece a senha **fica trancado**, sem caminho de volta pela aplicação ([ADR-0011](../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md), A4/R1). **Por que ficou fora:** exige canal de **notificação transacional**, que é decisão de modelagem pendente registrada abaixo (o módulo `notifications` só tem `reminders`) e pede ADR próprio — sem canal, "recuperar senha" não tem como existir. **Por que adiar não custa hoje:** os três usuários são semeados, o seed reescreve o hash a cada run e o Victor tem acesso ao banco. **No dia em que houver um cadastro de gente de fora, custa** — e é esse o gatilho. **Trabalho:** decidir o canal, depois `POST /auth/password-reset` com token de uso único e expiração curta | `pd-12`, 12/09/2026 |
| **Google OAuth adiado — gatilho: decisão sobre vinculação de conta + OAuth client novo no Google Cloud** | O `SECURITY` e o `AUTHENTICATION` preveem login social; a `pd-12` entregou só e-mail/senha ([ADR-0011](../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md), A3). **Dois bloqueios independentes.** (a) **Decisão de produto:** a mesma pessoa entrando por Google e por senha com o mesmo e-mail vira **um** `User` ou dois? Vinculação de conta é decisão, não detalhe de implementação. (b) **Acesso ao console:** exige criar um OAuth client novo — trabalho do Victor. ⚠️ **Relacionado ao item 1 da fila:** há um client legado **ainda pendente de revogação** no mesmo console, o que torna o momento péssimo para criar outro. Resolver aquele primeiro | `pd-12`, 12/09/2026 |
| **Os guards de autenticação não são globais — gatilho: primeiro endpoint autenticado** | `AuthGuard` e `RolesGuard` existem e são testados desde a `pd-12`, mas aplicam-se **por rota** (`@UseGuards`), não globalmente ([ADR-0011](../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md), R3). **Por que assim:** todo endpoint que existe hoje é público por desenho (`catalog`, `stores`, `offers`, `waitlist`, `health`) — tornar global obrigaria a marcar `@Public()` em tudo que já existe e arriscaria o comparador, que é o ativo de aquisição orgânica. **O risco que isso cria:** guard que se aplica à mão é guard que se esquece — o primeiro endpoint autenticado pode nascer sem `@UseGuards` e ninguém perceber. **Trabalho quando disparar:** o decorator `@Public()` já existe e o `AuthGuard` já o honra, então a inversão é registrar `APP_GUARD` em `app.module.ts` e marcar as rotas abertas | `pd-12`, 12/09/2026 |
| **`StoreScopeGuard` e autorização fina não existem — gatilho: `StoreMember` no schema E a distinção `OWNER` × `OPERATOR` fechada** | O `SECURITY` chama o escopo por instância de "defesa central" e fixa a invariante **0 acesso a pedido ou preço de outra loja**; ela **não está implementada** ([ADR-0011](../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md), A2). **Dois pré-requisitos, os dois abertos.** (a) `StoreMember` não está no `schema.prisma` — nasce com o onboarding de loja (J6/`payments`, ADR-0010). (b) A distinção `OWNER` × `OPERATOR` é o critério que segue **desmarcado** no `SECURITY`, e é decisão de produto — item 10 da intervenção manual. ⚠️ **Enquanto isso, nenhuma escrita de dado de loja pode ser aberta**: sem esse guard, a loja A altera a oferta da loja B | `pd-12`, 12/09/2026 |
| 🐞 **Bug pendente: a busca de produtos some por completo em telas mobile — gatilho DISPAROU; falta a medição a 390px** | Ver `BUG-001` em [`BUGS.md`](BUGS.md) — abaixo de 768px o app web legado não oferecia **nenhuma** forma de buscar produto por nome (`header.tsx:73`, `hidden md:block`). ⚠️ **Não há mais código vivo com o defeito** (legado arquivado em 07/09/2026). ✅ **O gatilho era "desenhar a J2 de produto", e a `pd-11` a desenhou:** `/precos` e `/precos/{slug}` na landing, com a busca **fora do header** (bloco próprio, sem `display:none` por breakpoint) e a tabela de ofertas virando **cartões empilhados** abaixo de 640px, sem rolagem horizontal. 🔶 **Por que o item continua aqui:** "sem rolagem horizontal a 390px" só se verifica renderizando, e a IA não abriu navegador — a conferência é o **passo 10 do roteiro manual da `pd-11`**. Passando, o item sai daqui e vira `BUG-R01` em Resolvidos. **Trabalho:** só a medição | Reprodução do Victor, 06/09/2026; escopo atualizado em 07/09/2026; reconferido na `pd-08` (11/09); J2 desenhada na `pd-11` (11/09/2026) |
| **Serviço gerenciado de observabilidade não escolhido — gatilho: existir ambiente de deploy** | A instrumentação OTel foi entregue na `pd-04` (08/09/2026), mas o **destino** segue em aberto. Shortlist e critério no [ADR-0006](../06-decisions/ADR/0006-instrumentacao-opentelemetry.md) #8: Grafana Cloud, New Relic, Honeycomb, Axiom — todos OTLP-nativos com free tier, cujos limites **precisam ser conferidos na página de preços no momento da escolha**. **Por que adiar não custa:** no código a troca de vendor é de duas variáveis de ambiente; o caro (painéis, alertas, histórico) só faz sentido com ambiente para observar, e não há deploy. **Trabalho:** escolher, cadastrar, pôr endpoint e chave no ambiente | ADR-0006, 08/09/2026 |
| **Painéis e alertas de observabilidade não definidos — gatilho: vendor escolhido** | É o critério que segue **desmarcado** na [`OBSERVABILITY`](../03-engineering/OBSERVABILITY.md). Sem painel e sem alerta, a telemetria existe mas ninguém é avisado de nada. Depende do item acima | `OBSERVABILITY` (critério de pronto), 08/09/2026 |
| **Logs não chegam ao backend de telemetria — gatilho: vendor escolhido** | Desde a `pd-04` os logs carregam `trace_id`/`span_id` e são correlacionáveis, mas seguem **só em stdout** — nada os envia a lugar nenhum. Enviar exige decidir o deploy (agente coletor × transport do pino), e não há deploy. **Trabalho:** decidir junto com o `DEPLOYMENT` | ADR-0006 (alternativas consideradas), 08/09/2026 |
| **`/api/v1/health` não excluído dos traces — gatilho: orquestrador fazendo probe** | O `ignoreIncomingRequestHook` da `pd-04` descarta só `/api/docs`. O health ficou tracejado de propósito: é a única rota real hoje, ou seja, o único alvo para verificar a instrumentação. Quando algo sondar o health em intervalo, ele vira ruído e volume pago. **Trabalho:** acrescentar o prefixo em `UNTRACED_PATH_PREFIXES` (`apps/api/src/otel/otel.sdk.ts`) | ADR-0006 #7, 08/09/2026 |
| **`nestjs-zod` rodando fora do peer declarado, e parado desde 25/07/2026 — gatilho: `nestjs-zod` publicar suporte a `^12`** | **Medido em 08/09/2026:** a `pd-05` subiu o NestJS para 12 forçando por `overrides` os **dois** peers que o `nestjs-zod@5.5.0` declara (`@nestjs/common ^10 || ^11` e `@nestjs/swagger ^7.4.2 || ^8 || ^11`) — decisão do [ADR-0007](../06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md), sustentada por contrato OpenAPI inalterado e suíte verde. **O risco de fundo é a biblioteca:** último publish em **25/07/2026**, sem pré-release recente, e é ela que materializa o contrato Zod→OpenAPI do ADR-0002. **Trabalho:** remover o override quando o upstream publicar suporte a `^12`; se ela não voltar a publicar, executar a substituição registrada em [`IDEIAS.md`](IDEIAS.md) | `pd-05`, 08/09/2026 |
| **Tooling do Nest travado na linha 11 — gatilho: decidir subir a raiz para TypeScript 6** | **Premissa corrigida em 11/09/2026 (`pd-08`).** O registro anterior dizia que "a `latest` do TypeScript é 7.0.2 (a 6 saiu apenas em beta)" e tratava o upgrade como duas majors de uma vez. **Isso está refutado:** as versões **6.0.2 e 6.0.3 estão publicadas e são estáveis** — o que enganou a leitura original é que a tag `latest` pulou para a linha 7 e as tags `beta`/`rc` do TypeScript estão desatualizadas. O que segue valendo do registro de 08/09/2026: `@nestjs/schematics@12` declara peer `typescript >=6.0.0` e o `@nestjs/cli@12` embute `typescript ~6.0.2`; a raiz está em **5.9.3**; o alcance é só build e scaffolding (`nest build` funciona, CI verde). **Novo desde a `pd-08`:** a coexistência das duas linhas **está medida e funcionando** — `apps/app` roda **TypeScript 6.0.3** aninhada em `apps/app/node_modules` enquanto a raiz segue em 5.9.3, sem colisão. Ou seja, **o caminho é um único major (5.9 → 6), não dois**, e não exige o compilador nativo da linha 7. **Trabalho:** avaliar subir a raiz para a linha 6 e, com ela, `@nestjs/cli`/`@nestjs/schematics` 12 — conferindo os peers de `typescript-eslint` (aceita `<6.1`) e `ts-jest` (aceita `<7`) | `pd-05`, 08/09/2026; premissa refutada e alcance remedido na `pd-08`, 11/09/2026 |
| **14 vulnerabilidades `moderate` vindas da cadeia de build do Expo — gatilho: `expo-router` e `@expo/config-plugins` atualizarem suas transitivas** | **Medido em 11/09/2026 (`pd-08`), comparando `npm audit` num worktree de `d18bc0e` com o da branch:** o `apps/app` acrescentou **14 `moderate`**, em duas cadeias — `decode-uri-component` ← `query-string` ← **`expo-router`**, e `uuid` ← `xcode` ← **`@expo/config-plugins`** (puxado por `expo`, `@expo/cli`, `expo-splash-screen`, `@expo/metro-config`, `@expo/prebuild-config`). **Nenhuma é código de runtime do cliente:** `xcode`/`config-plugins` só rodam em prebuild nativo, e as duas são DoS por entrada malformada. **Por que não se resolve agora:** são transitivas de pacotes do SDK 57, e forçar `override` nelas arrisca o bundler no meio do gate — o ADR-0008 fixou o SDK 57 justamente para não invalidar a medição. **Trabalho:** reconferir a cada bump de SDK do Expo; se persistirem, avaliar `overrides` como os dois que já sustentam o Prisma | `pd-08`, 11/09/2026 |
| **7 vulnerabilidades `high` pré-existentes na cadeia `multer`/NestJS — gatilho: `@nestjs/platform-express` depender de `multer` corrigido** | ⚠️ **Premissa do repositório envelhecida, corrigida em 11/09/2026.** O `TECHNOLOGY_STACK` e o item dos `overrides` afirmam `npm audit` **em zero**, medido em 08/09/2026. **Já não é verdade, e não é culpa da `pd-08`:** medido num worktree limpo de `d18bc0e`, **sem `apps/app`**, o audit acusa **7 `high`** — quatro advisories de DoS no `multer`, que sobem por `@nestjs/platform-express` → `@nestjs/core` → `@nestjs/swagger`/`@nestjs/testing`/`nestjs-pino`/`nestjs-zod`. Surgiram entre 08/09 e 11/09/2026. **Alcance:** o `multer` só é exercido em upload multipart, e **o MVP não tem upload** (`MVP_SCOPE`: storage fora do escopo). **Trabalho:** acompanhar o `@nestjs/platform-express`; quando publicar com `multer` corrigido, subir. Reavaliar com urgência **se e quando** o primeiro endpoint de upload nascer | `pd-08`, 11/09/2026 |
| **Busca de produto por `LIKE` sobre `search_text` — gatilho: catálogo acima de ~500 SKUs, ou qualidade de busca ruim medida** | A `pd-11` implementou a busca com uma coluna normalizada (`products.search_text`, sem acento e em minúsculas) e `LIKE` por token AND-ado, **em vez do `tsvector`** que o `SYSTEM_ARCHITECTURE` previa ([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md), A5). **Por que assim:** com 52 SKUs, full-text + `unaccent` — que exige função wrapper `IMMUTABLE` para viabilizar coluna gerada — é infraestrutura antecipada (`AGENTS.md`). **O que se perde:** não há stemming ("raçoes" não acha "ração"), não há tolerância a erro de digitação, e `%termo%` não usa índice (btree não ajuda). **Trabalho:** quando o gatilho disparar, avaliar `tsvector` + `unaccent` ou `pg_trgm` — sem datastore novo em nenhum dos casos | `pd-11`, 11/09/2026 |
| **Cobertura de entrega resolvida em memória — gatilho: mais de ~200 áreas de entrega ativas** | O `CompareOffersUseCase` carrega **todas** as áreas ativas de lojas não pausadas e filtra com `areaCoversAddress`, função pura de `packages/domain` ([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md), A7). **Por que assim:** põe a regra onde o ADR-0004 #12 a quer (domínio puro, teste unitário) e evita SQL sobre a coluna JSONB `postal_code_ranges`. **Medido hoje:** 9 áreas ativas no seed do piloto — uma consulta pequena por comparação. **Trabalho:** ao passar de ~200 áreas, mover o filtro para SQL (ou materializar bairro/faixa numa tabela indexada) e medir de novo | `pd-11`, 11/09/2026 |
| **Corpo do 404 de produto não é renderizado no servidor — gatilho: o Next passar a renderizar a fronteira de `not-found` no SSR, ou o primeiro relato de tela em branco** | **Medido na `pd-11` (11/09/2026)**, em build de produção (`next start`): `GET /precos/produto-que-nao-existe` devolve **404** e o `<title>` correto, mas o `<body>` servido traz só o placeholder de Suspense — o conteúdo de `not-found.tsx` chega apenas no payload RSC. Com JS ligado o visitante vê a página; **com JS desligado, vê tela em branco**. **Causa provada, e não é nossa:** uma reprodução mínima — rota dinâmica sem `generateMetadata`, sem `fetch`, com `notFound()` logo após o `await params` — comporta-se **de forma idêntica**. É como o Next implementa `notFound()`: ele sinaliza lançando exceção, e o React não renderiza conteúdo de fronteira de erro durante o SSR. Também **não é o `try/catch`** (reestruturado, sem mudança) e **não é geral** — o 404 de rota inexistente, servido pelo `_not-found` estático, renderiza no servidor. ✅ **SEO coberto duas vezes:** o Next injeta `<meta name="robots" content="noindex">` sozinho, e `title`/`description`/`canonical`/`og:` estão no `<head>` servido de **todas** as páginas reais (verificado uma a uma). 🙋 **Decisão do Victor, 11/09/2026:** manter o **404 verdadeiro**. A IA apresentou a alternativa — renderizar a mensagem direto na página, o que traria o corpo no HTML servido ao custo de virar **status 200 (soft 404)**, perdendo o sinal nos logs e na conformidade — e ele preferiu o status correto. **Trabalho:** reavaliar a cada major do Next | `pd-11`, 11/09/2026 |
| **Landing sem teste automatizado de interface — gatilho: primeira tela da landing com estado de cliente além do formulário de espera, ou primeira regressão detectada pelo roteiro manual** | **Migrado de [`IDEIAS.md`](IDEIAS.md) na `pd-11`** (decisão P4 do portão, 11/09/2026): o gatilho antigo era "a segunda tela da landing", e a `pd-11` criou a segunda e a terceira — mas **ambas são server components sem estado de cliente**, com formulários `GET` puros e zero `useState`. Montar Playwright sobre páginas sem interação escolheria a ferramenta no pior momento possível, e a lógica que poderia quebrar está coberta: a API por e2e contra Postgres real, e as regras por unidade em `packages/domain`. **O vão que fica:** a Server Action do formulário de espera (`pd-09`) e a renderização das páginas de preço não são exercitadas por teste nenhum — a rede é o roteiro manual (item 2 da intervenção manual). **Trabalho:** quando o gatilho disparar, escolher a ferramenta com mais de uma tela interativa na mão | `pd-09` (`IDEIAS`), 11/09/2026; gatilho redefinido e migrado na `pd-11`, 11/09/2026 |
| **`eslint-config-expo` e `eslint-config-next` atrasados em relação ao ESLint 10 do repositório — gatilho: `eslint-plugin-react` publicar suporte estável ao ESLint 10** | **Medido em 11/09/2026 (`pd-08`), e reconfirmado na `pd-09` com a landing:** os dois configs embutem `eslint-plugin-react@7.37.x`, cuja `latest` declara peer `eslint ^3 … ^9.7` — não cobre o **ESLint 10.10.0** do repositório. Na prática o lint **morre ao carregar a primeira regra**: `TypeError: contextOrFilename.getFilename is not a function`, porque a autodetecção de versão do React usa uma API que o ESLint 10 removeu. **Contornado em dois lugares, com o mesmo remédio de uma linha** — `apps/app/eslint.config.mjs` e `apps/landing/eslint.config.mjs`, ambos com `settings: { react: { version: '19.2.3' } }`, que pula a detecção, e com o motivo no comentário. Em ambos também estão desligadas as regras `import/*`, cujo resolver de TypeScript é incompatível e reporta todo import como não resolvido (o eixo é coberto por `import-x` nos demais workspaces, pelo `tsc` e pelo bundler de cada app — Metro e Turbopack, os dois no CI). ✅ **Na `pd-09` o contorno bastou**: `eslint-config-next@16.3.4` sob ESLint 10 lintou os 9 arquivos da landing sem erro, e o fallback previsto no plano (base `@petdots/config` + `@next/eslint-plugin-next` avulso) **não foi necessário**. **Risco:** o contorno é frágil a upgrades de qualquer um dos dois configs, e agora são dois pontos a manter. A única versão que declara peer para o ESLint 10 é a `eslint-plugin-react@7.8.0-rc.0`, pré-release. **Trabalho:** remover os dois contornos quando o upstream publicar estável | `pd-08`, 11/09/2026; estendido ao `eslint-config-next` na `pd-09`, 11/09/2026 |
| **Landing sem rate limit nem anti-abuso além do honeypot — gatilho: deploy público da landing** | A `pd-09` entregou `POST /api/v1/waitlist-entries` aberto, sem autenticação, com **apenas um honeypot** na landing (campo oculto; preenchido, a Server Action finge sucesso sem chamar a API). É mitigação **deliberadamente fraca** (decisão A18): qualquer robô que poste direto na API passa por cima dela, e o que existe hoje contra enchente de lead falso é só a unicidade do telefone. **Por que não se resolveu na `pd-09`:** não há deploy nem domínio público — a landing roda em `localhost:3002` —, e a forma do throttling (na plataforma de hosting, num proxy, ou `@nestjs/throttler` na API) é decisão do deploy, que não existe. **Trabalho:** ao publicar a landing, decidir e implementar rate limit por IP na captura; reavaliar se o honeypot continua valendo a pena | `pd-09`, 11/09/2026 |
| **Evento `waitlist.joined` documentado mas não emitido — gatilho: primeiro consumidor de evento in-process (candidato: notificação de boas-vindas)** | O [`USER_JOURNEYS`](../01-product/USER_JOURNEYS.md) §J9 prevê o evento `waitlist.joined`, e a `pd-09` implementou a captura **sem emiti-lo** (decisão A14): não existe barramento in-process no projeto, não há consumidor, e instalar `@nestjs/event-emitter` para um evento sem ouvinte é infraestrutura antecipada (`AGENTS.md`). O caso de uso carrega um comentário dizendo isso, em `apps/api/src/modules/waitlist/application/join-waitlist.use-case.ts`. **Trabalho:** quando nascer o primeiro consumidor real, escolher o barramento e emitir — e conferir se os demais eventos do `DOMAIN_MODEL` entram junto | `pd-09`, 11/09/2026 |
| **Dois `overrides` de segurança carregados no `package.json` — gatilho: Prisma depender de versões corrigidas** | ⚠️ **A frase "audit em zero" deste item vale só para 08/09/2026** — em 11/09 o audit acusa 7 `high` da cadeia `multer`, item próprio acima. O que segue verdadeiro é o papel dos overrides: **medido em 08/09/2026**, o `npm audit` só zerava porque a raiz força `deepmerge-ts@8.0.2` (o `@prisma/config` pina a 7.1.5 vulnerável, **tanto no Prisma 6 quanto no 7**) e `mysql2@3.24.4` (o Prisma 7 embute `mysql2@3.15.3`, que este projeto nem usa — é PostgreSQL). Os dois são contornos de dependência transitiva, não correções do upstream. **Trabalho:** remover cada override quando o Prisma passar a depender de versão corrigida; conferir a cada bump do Prisma | `pd-05`, 08/09/2026 |

## Decisões pendentes (modelagem)

> **Migradas do [`MVP_SCOPE`](../01-product/MVP_SCOPE.md) §"Pendências de
> modelagem" em 11/09/2026 (`pd-09`)**, quando o gatilho registrado lá — "início
> da implementação do ADR-0004" — disparou com a primeira capacidade saindo do
> papel.
>
> **Não são débito técnico nem features**, e por isso vivem numa seção própria:
> nenhuma delas é código a escrever, são **decisões de modelagem a tomar**, e
> cada uma pede **ADR próprio antes** de a implementação correspondente começar.
> Nenhuma entra na contagem da fila de débito.
>
> **Origem comum de todas:** `IDEIAS` 08/09/2026 → `MVP_SCOPE` 10/09/2026 →
> migradas na `pd-09`, 11/09/2026. O detalhe de cada uma está em
> [`IDEIAS.md`](IDEIAS.md) §"Lacunas para um marketplace completo".

| Pendência | Por que o MVP não opera sem ela | O que destrava |
|---|---|---|
| **Estorno e ajuste de pedido** | O Pix é capturado antes do aceite da loja. Recusa, cancelamento ou item indisponível deixam o cliente pago a mais, sem caminho de volta — e sem reversão de comissão e repasse | ADR próprio antes de implementar `orders`/`payments` |
| **Prazo de aceite e auto-recusa** | Pedido pago que ninguém aceita é o pior caso possível: dinheiro do cliente parado sem saída | ADR próprio antes de implementar `orders` |
| **Política de cancelamento** | `CANCELLED` existe; quem pode cancelar, até quando e o que acontece com o dinheiro, não | ADR próprio antes de implementar `orders`/`payments` |
| **Horário de funcionamento da loja** | Sem agenda semanal, o pedido das 22h entra numa loja fechada. 🔶 **Gatilho ajustado na `pd-11` (11/09/2026):** o antigo dizia "antes de implementar `stores`", e o módulo `stores` nasceu na `pd-11` sem exercer esta regra — horário afeta **pedido**, não listagem de preço. Manter o gatilho antigo teria travado o comparador por uma decisão que ele não usa | ADR próprio antes de implementar `orders` **ou** a ativação de loja |
| **Cupom de aquisição** | O ADR-0003 #3 já prevê subsídio só via cupom com verba e prazo; falta `discount_cents`, a entidade e a regra de quem paga o desconto | ADR próprio antes de implementar `payments` |
| **Notificação transacional** | O módulo `notifications` tem só `reminders`, e `Reminder` pressupõe agenda de reposição; aviso de pedido aceito ou despachado não tem onde morar. ⚠️ **Ganhou um segundo dependente na `pd-12`:** a **recuperação de acesso** (vigilância) também precisa deste canal — sem ele, "esqueci minha senha" não tem como existir | ADR próprio antes de implementar `notifications` |
| **Extrato de repasse** | `Payout` é por pedido; o lojista precisa saber quanto recebeu no período e de quais pedidos | ADR próprio antes de implementar `payments` |
| **Console de administração** | A curadoria centralizada do catálogo é gargalo conhecido (ADR-0004 §Consequências) e a capacidade #13 não tem ferramenta — no piloto, é trabalho manual. ⚠️ **Já mordeu duas vezes:** na `pd-09`, a lista de espera não tem leitura pela API, e o Victor lê os leads por `npx prisma studio` ou SQL; na `pd-11`, preço e catálogo entram por **arquivo versionado** e exigem `npm run build && npm run db:seed` a cada mudança — um lojista não edita TypeScript. 🔶 **Interino registrado:** o seed versionado ([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md), A14) destravou o comparador e **não resolve esta pendência** | ADR próprio antes de implementar o back-office; o interino segue valendo até lá |
| **Obrigações fiscais do split** | Plataforma tem receita de serviço, loja vende mercadoria; quem emite o quê não está decidido | ADR próprio antes de implementar `payments` |

## Features / entregas planejadas

> O bootstrap do monorepo, que bloqueava todas elas, foi entregue em 07/09/2026
> (`pd-01`); a documentação de produto foi re-sincronizada na `pd-07`
> (10/09/2026) — o `MVP_SCOPE` v2.0 já é fonte confiável de escopo; e o
> **spike-gate foi aprovado na `pd-08`** (11/09/2026), definindo a camada de
> cliente. **Nada mais as bloqueia.**
>
> ✅ **Saiu daqui na `pd-09` (11/09/2026):** "Bootstrapar `apps/landing` em
> Next.js" (ADR-0004 #13). O workspace existe, com o Next **pinado em 16.3.4**, e
> entrega a captura da lista de espera — a capacidade 12 do `MVP_SCOPE`.
>
> ✅ **A `pd-11` (11/09/2026) tirou o eixo do comparador do "nada implementado":**
> capacidades 3, 4-parcial, 5-leitura e 6, com a jornada J2 navegável na landing
> ([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md)).
> O item do MVP marketplace abaixo foi **reescrito** para dizer o que já existe e
> o que falta, em vez de "nenhuma linha foi implementada".

| Item | Detalhe | Origem |
|---|---|---|
| **Terminar o MVP marketplace do ADR-0004 — falta todo o ciclo do dinheiro** | O [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) está **aceito** (03/09/2026) e define módulos, agregados e fronteiras do MVP. **O que já existe:** capacidade 12 (lista de espera, `pd-09`), o eixo de **leitura** do comparador — capacidades 3, 4-parcial, 5-leitura e 6 (`pd-11`), com quatro endpoints `GET`, quatro tabelas e as páginas `/precos` — e, desde a `pd-12`, a **capacidade 1 em quase toda a extensão**: cadastro, login, refresh, logout, `AuthGuard` e `RolesGuard` pelos três papéis (falta só Google OAuth e recuperação de acesso, ambos na vigilância). **O que falta, e é a maior parte:** perfil de tutor e pets (2), `orders` (6), `payments` (7), entrega (8), reposição (9), notificações (10), painel do lojista (11) e o back-office (13) — ou seja, **quase toda a escrita**. O escopo funcional está em [`01-product/MVP_SCOPE.md`](../01-product/MVP_SCOPE.md); o que existe, em [`08-features/`](../08-features/) | ADR-0004, 03/09/2026; recorte atualizado na `pd-11`, 11/09/2026, e na `pd-12`, 12/09/2026 |
| **Escrita de ofertas pelo lojista (capacidades 5 e 11)** | Hoje preço e disponibilidade entram só por seed versionado ([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md)). Para o lojista informar o próprio preço faltam **dois dos três pré-requisitos**: ✅ `identity` **existe desde a `pd-12`** (login, papéis, `RolesGuard`); ⏳ falta o `StoreScopeGuard` que garante que a loja A não altere a oferta da loja B — que por sua vez depende de `StoreMember` existir e de `OWNER` × `OPERATOR` estar fechado (ver vigilância) —, e ⏳ o `Audit` interceptor que o [`SECURITY`](../03-engineering/SECURITY.md) exige para mutação de preço, e que **nasce justamente aqui**, porque esta é a primeira das quatro mutações rastreáveis do MVP. A regra de domínio já está pronta e é reaproveitável: `assertProductCanBeOffered`. ⚠️ **É o que transforma o comparador de vitrine em produto de duas pontas** — enquanto o preço depender do Victor editar arquivo, não há operação | `pd-11`, 11/09/2026; recorte atualizado na `pd-12`, 12/09/2026 |
| **J2 no `apps/app` sobre os endpoints da `pd-11`** | O cliente universal tem só as telas descartáveis do spike, com fixtures locais e 343 ofertas renderizadas de uma vez. Os quatro endpoints `GET` do comparador já existem e são **paginados onde precisa ser** — o app herda `?page=&pageSize=` na busca, e a tela de produto é por natureza curta (≤ dezenas de linhas). ⚠️ **Não repetir a tela de 343 ofertas do spike:** foi ela que produziu a medição de 36,7 s em 400 kbps na `pd-08`; o desenho paginado é o que dispensa virtualização | `pd-11`, 11/09/2026 |
| **Implementar a monetização e o split de pagamento do ADR-0003** | O [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) está **aceito** (02/09/2026) e fecha take rate e forma de pagamento do piloto, com a economia por pedido modelada na `IDEACAO_FASE1` §25-§26. Nada implementado. ⚠️ Envolve dinheiro de terceiros (split para o lojista): é candidato natural a ADR próprio de integração e ao maior rigor de teste do MVP | ADR-0003, 02/09/2026 |

### Sequência acordada para a escrita do MVP (12/09/2026)

> **Decisão do Victor**, tomada no encerramento da `pd-12`. Ele pediu
> inicialmente "checkout e painel do lojista antes"; a IA mostrou a cadeia real
> de dependências e ele aprovou a sequência abaixo. Ordenada para empurrar para
> o fim o que depende de coisas **fora do repositório**.
>
> ⚠️ **Isto é ordem acordada, não compromisso de prazo.** Cada uma abre com seu
> próprio briefing e portão (`DIRETRIZES_FLUXO_IA` §1).

| Ordem | Tarefa | Trava externa |
|---|---|---|
| `pd-13` | **Login por interface + comparador real no `apps/app`** — tela de login, sessão no armazenamento seguro do dispositivo, e as telas do spike passando a ler a API em vez das fixtures | nenhuma |
| `pd-14` | `tutors` — perfil, endereço padrão e pets (capacidade 2). É o que o pedido precisa para ter destino de entrega | nenhuma |
| `pd-15` | `orders` — carrinho, pedido, máquina de estados, **sem pagamento**: o pedido para em `PLACED` | nenhuma |
| `pd-16` | Painel do lojista + `StoreMember` + `StoreScopeGuard` | 🔴 **decisão `OWNER` × `OPERATOR`** (item 10 da intervenção manual) |
| `pd-17` | `payments` — PSP, split e repasse | 🔴 **conta no PSP** (item 6/manual) + as três decisões de modelagem abertas acima (notificação transacional, obrigações fiscais do split, extrato de repasse) |

**Por que o checkout não vem antes:** ele depende de `Tutor` (endereço),
`Order` e `Payment` — três capacidades —, e a última não começa sem conta no
PSP. **Por que o painel não vem antes:** além de `orders`, ele exige o
`StoreScopeGuard`, cujo pré-requisito declarado no `SECURITY` é a distinção
`OWNER` × `OPERATOR`. E, sem o login por interface da `pd-13`, nenhuma das duas
telas seria navegável clicando.

**Formato e modelo, decisão permanente do Victor (12/09/2026):** cada plano é
escrito em **Fable** (Fase 1) e executado em **Opus** (Fase 2), em chats
separados, com o arquivo em `PLANS/` como único handoff.

## Documentação

**Nada pendente.** O único item desta seção — "Nenhuma camada de features
documentadas" — foi **resolvido na `pd-09`** (11/09/2026): o gatilho registrado
era "criar junto com a primeira feature do MVP", e a lista de espera foi essa
feature. Nasceu a camada [`08-features/`](../08-features/), com
[`waitlist/LISTA_DE_ESPERA.md`](../08-features/waitlist/LISTA_DE_ESPERA.md) — a
visão transversal banco → API → landing que o modelo de processo pressupunha.

## Pendências de produção

> Registro do que já está pronto e ainda **não** entrou na linha estável ou em
> produção — código, banco e documentação. **Ao responder qualquer pergunta
> sobre o backlog, listar também esta seção.** O merge para a linha estável
> **nunca é automático**: só a pedido explícito do usuário, a cada vez.

### Aguardando promoção para `master`

> **O repositório passou a ter duas linhas em 11/09/2026**
> ([ADR-0009](../06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md)):
> `develop` integra todas as tarefas; **`master` só avança a pedido explícito do
> Victor**. Esta subseção passa a registrar o que já está integrado na `develop`
> e **ainda não foi promovido**.

**Na `develop` e fora de `master`: a `pd-09`, a `pd-10`, a `pd-11` e a `pd-12`.**

- **`pd-09`** — a **primeira migration do projeto** (`create_waitlist_entries`),
  o primeiro módulo de domínio da API (`waitlist`), o workspace `apps/landing`
  em Next.js 16.3.4 e a camada `docs/08-features/`. Squash em **11/09/2026**,
  [PR #8](https://github.com/vhaguiar07/petdots/pull/8) (`37d4633`), CI verde nos
  três runs, branch removida.
- **`pd-10`** — `develop` e `master` como duas linhas de integração (ADR-0009).
  Squash em **11/09/2026**, [PR #9](https://github.com/vhaguiar07/petdots/pull/9)
  (`0cbce5a`), CI verde. Só documentação.
- **`pd-11`** — a **segunda migration** (`create_catalog_stores_and_offers`),
  três módulos novos (`catalog`, `stores`, `offers`), o seed versionado do
  catálogo e as páginas `/precos` da landing (ADR-0010). Squash em
  **11/09/2026** pelo [PR #10](https://github.com/vhaguiar07/petdots/pull/10)
  (`86225d4`), com CI verde nos dois runs, e branch removida do remoto e do
  clone.
- **`pd-12`** — a **terceira migration** (`create_users_and_refresh_tokens`), o
  módulo `identity` (cadastro, login, refresh rotacionado, logout), os guards
  `AuthGuard`/`RolesGuard` e os três usuários de desenvolvimento no seed
  (ADR-0011). Squash em **12/09/2026** pelo
  [PR #11](https://github.com/vhaguiar07/petdots/pull/11) (`ba30386`), com CI
  verde nos dois runs, e branch removida do remoto e do clone.

✅ **A `pd-12` é a primeira cujo roteiro manual foi percorrido por inteiro antes
do merge.** Divisão que o Victor estabeleceu em 12/09/2026 — *"eu só vou testar
o que só eu posso fazer"* —: a IA percorreu os blocos verificáveis por HTTP e
SQL, ele percorreu os três passos de navegador e aprovou (*"/precos funcionando
completamente com as seeds"*).

⚠️ **Os testes manuais da `pd-09` e três passos da `pd-11` seguem pendentes** —
os dois merges aconteceram porque o Victor instruiu que "finalizar a tarefa"
significa integrar na `develop`, não porque os roteiros foram percorridos. Da
`pd-11` faltam os passos **10 (390px), 11 (teclado) e 18 (copy)**; os outros 15
foram percorridos por HTTP pela IA, com 87 de 89 asserções verdes. Ver os itens
2, 3, 3b, 3c e 4 da seção "Intervenção manual do Victor" — é justamente para
isso que a `develop` existe.

> ⚠️ **Ao promover para `master`, lembrar — são três migrations agora.** Em
> qualquer ambiente que já tenha banco: `npm run prisma:migrate` (local) ou
> `prisma migrate deploy` (alhures), **e depois `npm run db:seed`**, sem o qual o
> comparador sobe sem um produto sequer. Hoje só existe o Postgres local do
> Victor, onde as três **já foram aplicadas** (as duas primeiras em 11/09/2026,
> a terceira em 12/09/2026).
>
> 🔴 **E `JWT_SECRET` passa a ser obrigatória** (`pd-12`): sem ela a API **não
> sobe**, em ambiente nenhum. Não tem default de propósito. Ver o item 9 da
> intervenção manual.
>
> 🔴 **E antes de qualquer ambiente público:** trocar as lojas fictícias do seed
> (item 3b da intervenção manual).

### Histórico de merges em `master`

Até a `pd-08`, o repositório era trunk único e tudo ia direto para `master`.

A `pd-08` foi mergeada em **11/09/2026**, a pedido explícito
do Victor: squash `5ec24e4` pelo [PR #7](https://github.com/vhaguiar07/petdots/pull/7)
(CI verde em `22126b2`), branch removida do remoto e do clone local. Com isso
`master` passa a carregar `apps/app` e o [ADR-0008](../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md)
— a camada de cliente do MVP deixou de ser indefinida. Relatório em
[`relatorios-de-branch/semana-2026-09-07/pd-08-feat-spike-cliente-universal.md`](relatorios-de-branch/semana-2026-09-07/pd-08-feat-spike-cliente-universal.md).

E antes da `pd-08`, a `pd-07` fora mergeada em **10/09/2026** (squash `07799f0`,
[PR #6](https://github.com/vhaguiar07/petdots/pull/6)), levando o `MVP_SCOPE`
v2.0 para a linha estável.

> ⚠️ **Consequência assumida no merge da `pd-07`:** ele aconteceu **antes** de o
> sócio ver o diff da emenda v1.1 de `PRODUCT_VISION`/`PRODUCT_PRINCIPLES` (o §8
> passou a "A Cunha Vence Primeiro"), que era a recomendação registrada — é carta
> de fundação, alinhada entre os dois sócios. A validação segue pendente como
> **A-05** no backlog da estratégia; se o sócio discordar, a correção é **emenda
> nova sobre `master`**, não revert.

### Produção

**Nada pendente.** O PetDots não tem ambiente de produção — não há deploy, não
há migration aplicada em prod, e a linha AI-first não tem código. Esta subseção
passa a ser alimentada no encerramento da primeira branch `pd-NN` que gerar
entrega deployável (ver [`DIRETRIZES_FLUXO_IA.md`](DIRETRIZES_FLUXO_IA.md) §7,
passo 4).
