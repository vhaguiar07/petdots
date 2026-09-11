---
title: Backlog
status: stable
version: "1.10"
updated: 2026-09-11
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

Última revisão: 11/09/2026.

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
| 2 | **Percorrer o roteiro funcional da landing** — passos 2 a 11 (erros por campo na tela, `409` pela interface, Prisma Studio, 390px, navegação só por teclado, API derrubada) | Nasce aqui. Roteiro no [relatório da `pd-09`](relatorios-de-branch/semana-2026-09-07/pd-09-feat-landing-e-lista-de-espera.md) | Validação humana de interface. ⚠️ **A Server Action da landing não tem teste automatizado** (decisão da Fase 1: sem framework de UI nesta tarefa) — os passos 2-11 são hoje a **única** verificação dessa ponte entre formulário e API |
| 3 | **Aprovar ou reescrever a copy da landing e a lista de bairros** do `<datalist>` | Nasce aqui. Constantes em `apps/landing/src/content/neighborhoods.ts` e nos textos de `page.tsx`/`waitlist-form.tsx` | Decisão de produto, registrada desde a análise: *"Copy e bairros são do Victor, não da IA"*. A IA entregou como proposta |
| 4 | **Definir o canal de contato do aviso de privacidade** (LGPD) | Nasce aqui. Constante `PRIVACY_CONTACT` em `apps/landing/src/content/privacy.ts` | Decisão P4 do portão: o valor hoje é `contato@petdots.com.br (a definir)`, **deliberadamente marcado como provisório**. ⚠️ Não publicar a landing com ele assim — é o canal que a LGPD manda oferecer ao titular |
| 5 | **Pedir o merge da `pd-09`** — e, antes, **decidir a linha de integração** | Ver "Aguardando merge" no fim deste documento | Merge nunca é automático (`DIRETRIZES_FLUXO_IA` §7). ⚠️ **Pendência descoberta em 11/09/2026:** o Victor pediu merge para `develop`, mas **`develop` não existe** neste repositório — não há ref local nem em `origin`, o `origin/HEAD` aponta para `master`, e o [`GIT_WORKFLOW`](../03-engineering/GIT_WORKFLOW.md) declara `master` como linha estável e integrável. A `develop` que existia era do protótipo legado, apagada em 06/09/2026. **Criar uma linha de integração nova muda o modelo de branches do repositório** e pede decisão explícita + atualização do `GIT_WORKFLOW` |
| 6 | **Escolher o provedor de hosting e publicar** (landing + API + Postgres gerenciado + domínio) | Critério aberto no [`DEPLOYMENT`](../03-engineering/DEPLOYMENT.md); dispara os itens de rate limit e de observabilidade na vigilância | Envolve conta, cartão e domínio. ⚠️ **É o que trava o smoke test hoje** — a landing existe e passa no CI, mas roda só em `localhost`. Sem ela publicada, não há campanha nem medição de demanda (B5 da Trilha B) |
| 7 | **Escolher o serviço gerenciado de observabilidade** | Vigilância, abaixo — gatilho "existir ambiente de deploy" | Cadastro e chave. Anda junto com o item 6 |
| 8 | **Compartilhar com o sócio o diff da emenda v1.1** de `PRODUCT_VISION`/`PRODUCT_PRINCIPLES` (o §8 virou "A Cunha Vence Primeiro") | Nota em "Aguardando merge", no fim deste documento; **A-05** no backlog da estratégia | É carta de fundação, alinhada entre os dois sócios. A `pd-07` foi mergeada antes dessa validação — consequência assumida no merge |

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
| 🐞 **Bug pendente: a busca de produtos some por completo em telas mobile — gatilho: desenhar a J2 de produto** | Ver `BUG-001` em [`BUGS.md`](BUGS.md) — abaixo de 768px o app web não oferecia **nenhuma** forma de buscar produto por nome. Reproduzido pelo Victor e confirmado em `header.tsx:73` (`hidden md:block`). ⚠️ **É do protótipo legado, que foi arquivado em 07/09/2026** na tag `legacy-marketplace` e removido do disco: **não há mais código vivo com esse defeito**. O registro permanece como conhecimento de UX. ✅ **Verificado na `pd-08` (11/09/2026):** o comparador do spike foi medido a 390px de largura e os **3 de 3 campos de busca seguem visíveis**, sem rolagem horizontal — a armadilha não se repetiu. Mas as telas do spike são descartáveis, então o item continua aqui: quem valida de vez é a J2 de produto. **Trabalho:** nenhum no legado; reconferir a 390px ao construir a busca definitiva | Reprodução do Victor, 06/09/2026; escopo atualizado em 07/09/2026; reconferido na `pd-08`, 11/09/2026 |
| **Serviço gerenciado de observabilidade não escolhido — gatilho: existir ambiente de deploy** | A instrumentação OTel foi entregue na `pd-04` (08/09/2026), mas o **destino** segue em aberto. Shortlist e critério no [ADR-0006](../06-decisions/ADR/0006-instrumentacao-opentelemetry.md) #8: Grafana Cloud, New Relic, Honeycomb, Axiom — todos OTLP-nativos com free tier, cujos limites **precisam ser conferidos na página de preços no momento da escolha**. **Por que adiar não custa:** no código a troca de vendor é de duas variáveis de ambiente; o caro (painéis, alertas, histórico) só faz sentido com ambiente para observar, e não há deploy. **Trabalho:** escolher, cadastrar, pôr endpoint e chave no ambiente | ADR-0006, 08/09/2026 |
| **Painéis e alertas de observabilidade não definidos — gatilho: vendor escolhido** | É o critério que segue **desmarcado** na [`OBSERVABILITY`](../03-engineering/OBSERVABILITY.md). Sem painel e sem alerta, a telemetria existe mas ninguém é avisado de nada. Depende do item acima | `OBSERVABILITY` (critério de pronto), 08/09/2026 |
| **Logs não chegam ao backend de telemetria — gatilho: vendor escolhido** | Desde a `pd-04` os logs carregam `trace_id`/`span_id` e são correlacionáveis, mas seguem **só em stdout** — nada os envia a lugar nenhum. Enviar exige decidir o deploy (agente coletor × transport do pino), e não há deploy. **Trabalho:** decidir junto com o `DEPLOYMENT` | ADR-0006 (alternativas consideradas), 08/09/2026 |
| **`/api/v1/health` não excluído dos traces — gatilho: orquestrador fazendo probe** | O `ignoreIncomingRequestHook` da `pd-04` descarta só `/api/docs`. O health ficou tracejado de propósito: é a única rota real hoje, ou seja, o único alvo para verificar a instrumentação. Quando algo sondar o health em intervalo, ele vira ruído e volume pago. **Trabalho:** acrescentar o prefixo em `UNTRACED_PATH_PREFIXES` (`apps/api/src/otel/otel.sdk.ts`) | ADR-0006 #7, 08/09/2026 |
| **`nestjs-zod` rodando fora do peer declarado, e parado desde 25/07/2026 — gatilho: `nestjs-zod` publicar suporte a `^12`** | **Medido em 08/09/2026:** a `pd-05` subiu o NestJS para 12 forçando por `overrides` os **dois** peers que o `nestjs-zod@5.5.0` declara (`@nestjs/common ^10 || ^11` e `@nestjs/swagger ^7.4.2 || ^8 || ^11`) — decisão do [ADR-0007](../06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md), sustentada por contrato OpenAPI inalterado e suíte verde. **O risco de fundo é a biblioteca:** último publish em **25/07/2026**, sem pré-release recente, e é ela que materializa o contrato Zod→OpenAPI do ADR-0002. **Trabalho:** remover o override quando o upstream publicar suporte a `^12`; se ela não voltar a publicar, executar a substituição registrada em [`IDEIAS.md`](IDEIAS.md) | `pd-05`, 08/09/2026 |
| **Tooling do Nest travado na linha 11 — gatilho: decidir subir a raiz para TypeScript 6** | **Premissa corrigida em 11/09/2026 (`pd-08`).** O registro anterior dizia que "a `latest` do TypeScript é 7.0.2 (a 6 saiu apenas em beta)" e tratava o upgrade como duas majors de uma vez. **Isso está refutado:** as versões **6.0.2 e 6.0.3 estão publicadas e são estáveis** — o que enganou a leitura original é que a tag `latest` pulou para a linha 7 e as tags `beta`/`rc` do TypeScript estão desatualizadas. O que segue valendo do registro de 08/09/2026: `@nestjs/schematics@12` declara peer `typescript >=6.0.0` e o `@nestjs/cli@12` embute `typescript ~6.0.2`; a raiz está em **5.9.3**; o alcance é só build e scaffolding (`nest build` funciona, CI verde). **Novo desde a `pd-08`:** a coexistência das duas linhas **está medida e funcionando** — `apps/app` roda **TypeScript 6.0.3** aninhada em `apps/app/node_modules` enquanto a raiz segue em 5.9.3, sem colisão. Ou seja, **o caminho é um único major (5.9 → 6), não dois**, e não exige o compilador nativo da linha 7. **Trabalho:** avaliar subir a raiz para a linha 6 e, com ela, `@nestjs/cli`/`@nestjs/schematics` 12 — conferindo os peers de `typescript-eslint` (aceita `<6.1`) e `ts-jest` (aceita `<7`) | `pd-05`, 08/09/2026; premissa refutada e alcance remedido na `pd-08`, 11/09/2026 |
| **14 vulnerabilidades `moderate` vindas da cadeia de build do Expo — gatilho: `expo-router` e `@expo/config-plugins` atualizarem suas transitivas** | **Medido em 11/09/2026 (`pd-08`), comparando `npm audit` num worktree de `d18bc0e` com o da branch:** o `apps/app` acrescentou **14 `moderate`**, em duas cadeias — `decode-uri-component` ← `query-string` ← **`expo-router`**, e `uuid` ← `xcode` ← **`@expo/config-plugins`** (puxado por `expo`, `@expo/cli`, `expo-splash-screen`, `@expo/metro-config`, `@expo/prebuild-config`). **Nenhuma é código de runtime do cliente:** `xcode`/`config-plugins` só rodam em prebuild nativo, e as duas são DoS por entrada malformada. **Por que não se resolve agora:** são transitivas de pacotes do SDK 57, e forçar `override` nelas arrisca o bundler no meio do gate — o ADR-0008 fixou o SDK 57 justamente para não invalidar a medição. **Trabalho:** reconferir a cada bump de SDK do Expo; se persistirem, avaliar `overrides` como os dois que já sustentam o Prisma | `pd-08`, 11/09/2026 |
| **7 vulnerabilidades `high` pré-existentes na cadeia `multer`/NestJS — gatilho: `@nestjs/platform-express` depender de `multer` corrigido** | ⚠️ **Premissa do repositório envelhecida, corrigida em 11/09/2026.** O `TECHNOLOGY_STACK` e o item dos `overrides` afirmam `npm audit` **em zero**, medido em 08/09/2026. **Já não é verdade, e não é culpa da `pd-08`:** medido num worktree limpo de `d18bc0e`, **sem `apps/app`**, o audit acusa **7 `high`** — quatro advisories de DoS no `multer`, que sobem por `@nestjs/platform-express` → `@nestjs/core` → `@nestjs/swagger`/`@nestjs/testing`/`nestjs-pino`/`nestjs-zod`. Surgiram entre 08/09 e 11/09/2026. **Alcance:** o `multer` só é exercido em upload multipart, e **o MVP não tem upload** (`MVP_SCOPE`: storage fora do escopo). **Trabalho:** acompanhar o `@nestjs/platform-express`; quando publicar com `multer` corrigido, subir. Reavaliar com urgência **se e quando** o primeiro endpoint de upload nascer | `pd-08`, 11/09/2026 |
| **Comparador sem paginação nem virtualização — gatilho: implementar a J2 de produto** | **Medido em 11/09/2026 (`pd-08`):** com 343 ofertas renderizadas de uma vez, a rolagem se mantém em **60 fps**, mas em rede de **400 kbps / 400 ms RTT** a lista densa só fica utilizável em **36,7 s** (a primeira tabela aparece em 1,4 s). O bundle web inicial é de **1,64 MB**. ⚠️ **Não é débito do React Native Web** — um cliente Next.js renderizando a mesma lista pagaria o mesmo; é desenho de tela. **Por que não se resolveu na `pd-08`:** as telas do spike são descartáveis (ADR-0008), e paginar a tela que existe para medir densidade enfraqueceria a própria medição. **Trabalho:** ao construir a J2 de produto, decidir entre paginação no servidor, janela virtual ou corte por endereço — e medir de novo | `pd-08`, 11/09/2026 |
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
| **Horário de funcionamento da loja** | Sem agenda semanal, o pedido das 22h entra numa loja fechada | ADR próprio antes de implementar `stores` |
| **Cupom de aquisição** | O ADR-0003 #3 já prevê subsídio só via cupom com verba e prazo; falta `discount_cents`, a entidade e a regra de quem paga o desconto | ADR próprio antes de implementar `payments` |
| **Notificação transacional** | O módulo `notifications` tem só `reminders`, e `Reminder` pressupõe agenda de reposição; aviso de pedido aceito ou despachado não tem onde morar | ADR próprio antes de implementar `notifications` |
| **Extrato de repasse** | `Payout` é por pedido; o lojista precisa saber quanto recebeu no período e de quais pedidos | ADR próprio antes de implementar `payments` |
| **Console de administração** | A curadoria centralizada do catálogo é gargalo conhecido (ADR-0004 §Consequências) e a capacidade #13 não tem ferramenta — no piloto, é trabalho manual. ⚠️ **Já mordeu na `pd-09`:** a lista de espera não tem leitura pela API (A8), então hoje o Victor lê os leads por `npx prisma studio` ou SQL direto | ADR próprio antes de implementar `stores`/catálogo |
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
> entrega a captura da lista de espera — a capacidade 12 do `MVP_SCOPE`. As duas
> entregas que restam abaixo são o corpo do marketplace.

| Item | Detalhe | Origem |
|---|---|---|
| **Implementar o MVP marketplace do ADR-0004** | O [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) está **aceito** (03/09/2026) e define módulos, agregados e fronteiras do MVP, substituindo o desenho v1.0 do `SYSTEM_ARCHITECTURE` (que servia ao produto "Vida do Pet"). Nenhuma linha foi implementada. O escopo funcional correspondente está em [`01-product/MVP_SCOPE.md`](../01-product/MVP_SCOPE.md) | ADR-0004, 03/09/2026 |
| **Implementar a monetização e o split de pagamento do ADR-0003** | O [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) está **aceito** (02/09/2026) e fecha take rate e forma de pagamento do piloto, com a economia por pedido modelada na `IDEACAO_FASE1` §25-§26. Nada implementado. ⚠️ Envolve dinheiro de terceiros (split para o lojista): é candidato natural a ADR próprio de integração e ao maior rigor de teste do MVP | ADR-0003, 02/09/2026 |

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

### Aguardando merge em `master`

**A `pd-09` (`pd-09/feat/landing-e-lista-de-espera`) está pendente.** Ela leva a
**primeira migration do projeto** (`create_waitlist_entries`), o primeiro módulo
de domínio da API (`waitlist`), o workspace `apps/landing` em Next.js 16.3.4 e a
camada `docs/08-features/`. **Pushada em 11/09/2026, CI verde** (run
`34627630485`, 11 passos, 1m58s, incluindo o smoke de boot). Fica aguardando os
testes manuais e o **pedido explícito de merge do Victor**
(`DIRETRIZES_FLUXO_IA` §7) — ver os itens 2, 3 e 5 da seção "Intervenção manual
do Victor".

> 🔴 **A linha de integração precisa ser decidida antes do merge.** Em
> 11/09/2026 o Victor instruiu: *"finalizar aqui e mandar pra develop. Envio
> para master só com pedido explícito meu"*. **Mas `develop` não existe neste
> repositório** — verificado no mesmo dia: nenhuma ref local ou em `origin`,
> `origin/HEAD` apontando para `master`, e o
> [`GIT_WORKFLOW`](../03-engineering/GIT_WORKFLOW.md) declarando `master` como a
> linha estável e integrável (trunk único). A `develop` que existiu era do
> protótipo legado e foi apagada em 06/09/2026, junto das branches arquivadas na
> tag `legacy-marketplace`.
>
> **Duas saídas, e a escolha é do Victor:** (a) manter o trunk único e tratar
> "finalizar" como merge em `master`; ou (b) adotar de fato um fluxo de duas
> linhas, criando `develop` como integração — o que **muda o modelo de branches
> do repositório** e exige atualizar o `GIT_WORKFLOW`, decidir de onde saem as
> tags de release e como o CI trata cada linha. A IA não criou a branch por
> conta própria: é decisão de topologia, não de execução.

> ⚠️ **Ao mergear, lembrar:** a migration precisa ser aplicada em qualquer
> ambiente que já tenha banco (`npm run prisma:migrate` local; `prisma migrate
> deploy` alhures). Hoje só existe o Postgres local do Victor, onde ela **já foi
> aplicada** em 11/09/2026.

Antes dela, a `pd-08` foi mergeada em **11/09/2026**, a pedido explícito
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
