---
title: Backlog
status: stable
version: "1.23"
updated: 2026-09-13
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

Última revisão: 13/09/2026.

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
| 3 | **Aprovar ou reescrever a copy da landing e a lista de bairros** do `<datalist>` — **também a copy de `/precos` e da página de produto**, e, desde a `pd-13`, **a copy das cinco telas do `apps/app`** (título "Quanto custa no seu bairro", rótulo "O que seu pet usa", estados vazios, "informe seu bairro", "Sua sessão expirou. Entre de novo.", os rótulos dos papéis em `/conta`). **Desde a `pd-14`, mais quatro telas:** `/cadastro` ("Criar conta", "Mínimo de 10 caracteres.", "Já tenho conta", a frase do aviso de privacidade), `/conta/endereco` ("Seu endereço", "É para onde as lojas entregam o seu pedido.", "Salvar e continuar", "Fazer depois"), `/conta/pets/novo` e `/conta/pets/{id}` ("Seu pet" / "Editar pet", "O peso é o que vai alimentar a reposição inteligente.", "Cão"/"Gato", "Excluir pet" → "Confirmar exclusão"), **e as mensagens de erro** ("CEP deve ter 8 dígitos.", "Informe um celular brasileiro com DDD.", "Informe um peso entre 0,1 kg e 120 kg.", "Data inválida.", "Escolha cão ou gato.", "Complete seu cadastro", "Você ainda não cadastrou um pet."). **Desde a `pd-15`, mais três telas e os rótulos de status do pedido:** `/carrinho` ("Entre para fazer o pedido", "Complete seu endereço", "Esta loja não entrega no seu endereço", "Taxa de serviço", "A loja tem 15 min para aceitar depois que você pedir", "Fazer pedido"), `/pedidos` ("Você ainda não fez nenhum pedido.") e `/pedidos/{id}` ("Cancelar pedido" → "Confirmar cancelamento", "A loja tem até HH:MM para aceitar"); os **rótulos de status** ("Aguardando a loja", "Aceito", "Saiu para entrega", "Entregue", "Recusado", "Cancelado"); e o aviso de loja fechada ("Fechada · abre segunda às 08:00"). **Desde a `pd-16`, mais cinco telas — as do painel do lojista:** `/painel` ("Painel da loja", "Sua conta não opera nenhuma loja.", "Escolha a loja que você quer operar"), `/painel/{id}` ("Aguardando você", "Aceitos — separar", "Saíram para entrega", "Concluídos", "vence em N min", "prazo vencido", "Aceitar", "Recusar" → "Confirmar recusa", "Você não opera esta loja."), `/painel/{id}/pedidos/{orderId}` ("Separar", "Entregar em", "Indisponível", "Despachar", "Confirmar entrega", "Cancelar pedido", "Por que está cancelando?", "O tutor vê este motivo."), `/painel/{id}/horarios` ("Abrir neste dia" / "Fechar neste dia", "+ intervalo de almoço", "Salvar horários", "Com todos os dias fechados, a loja para de receber pedidos até você abrir de novo.") e `/painel/{id}/ofertas` ("Adicionar à prateleira", "O que você vende", 'Marcar "não tenho"', "Sua prateleira está vazia."). **E o que o tutor passou a ver:** "Recusado pela loja", "Cancelado pela loja" com o motivo, e "Para cancelar, fale com a loja." ⚠️ **Duas dessas são provisórias por construção:** "A loja não respondeu a tempo. **Nada foi cobrado.**" e "A loja recusou o pedido. **Nada foi cobrado.**" — na `pd-17`, com pagamento de verdade, as duas viram "o valor será devolvido" | Nasce aqui. Constantes em `apps/landing/src/content/neighborhoods.ts`; textos em `page.tsx`, `waitlist-form.tsx`, `precos/page.tsx` e `precos/[productSlug]/page.tsx`; no app, em `apps/app/src/screens/*.tsx`; as mensagens de validação em `packages/contracts/src/tutors.ts` | Decisão de produto, registrada desde a análise: *"Copy e bairros são do Victor, não da IA"*. A IA entregou como proposta |
| 3b | 🔴 **Substituir `apps/api/src/seed/data/pilot.ts` pelos dados de campo** (Trilha B, item B4) **ANTES de qualquer deploy público** | Nasce aqui (`pd-11`). Arquivo marcado `PLACEHOLDER` na primeira linha | As **8 lojas do seed são fictícias**, herdadas do spike da `pd-08`, e os preços são gerados por algoritmo. Publicar nomes inventados de petshop como se fossem reais é o tipo de erro que não se desfaz. Só você tem os dados de rua. 🔴 **A `pd-15` aumentou o risco deste item:** as oito passaram a `status: ACTIVE` e ganharam **agenda semanal fictícia** (seg–sáb 08:00–19:00; duas com almoço; uma com domingo de manhã) — sem isso nenhum pedido poderia ser criado em desenvolvimento. Ou seja, hoje o seed publica lojas inventadas que **parecem estar abertas e recebendo pedido**. ⚠️ **A `pd-16` acrescentou mais uma camada a este risco:** a primeira loja fictícia ("Petshop Amigo Fiel") passou a ter **um `OWNER` e um `OPERATOR` de desenvolvimento vinculados** — contas `.local`, que o seed se recusa a criar em produção, mas que fazem a loja inventada parecer operada por alguém. ✅ **A `pd-19` tirou a urgência disto sem resolvê-lo:** o seed **nunca entra no deploy** (ADR-0020, E3), então o banco de produção sobe **migrado e vazio**, e a `/precos` fica fora do menu, do `sitemap.xml` e do índice do buscador até você trocar este arquivo (E9). Nenhuma loja inventada vai ao ar. **O que destrava:** trocar `pilot.ts` pelos dados de campo, rodar `npm run db:seed` pelo CLI do Railway e definir `PETDOTS_COMPARADOR_PUBLICO=true` |
| 3c | **Conferir os EANs do catálogo inicial e aprovar a lista de produtos** | Nasce aqui (`pd-11`). `apps/api/src/seed/data/products.ts` — 52 produtos, **todos com `ean: null`** | O `null` é deliberado: o `DOMAIN_MODEL` admite produto sem EAN "com curadoria manual e marcação explícita", e inventar código de barras violaria a invariante de forma disfarçada. Conferir exige a embalagem na mão |
| 3d | 🔴 **Aprovar ou trocar os valores de comissão do seed** — `FOOD_STANDARD` 6%, `FOOD_PREMIUM` 9%, `HYGIENE` 8%, `HEALTH_OTC` 12%, `ACCESSORY` 12%, `TREAT` 10% | Nasce aqui (`pd-15`). `apps/api/src/seed/data/commission-rates.ts`, marcado `PLACEHOLDER`; item próprio na vigilância | São **hipóteses**, não tabela. O [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) dá faixas e registra a sua ressalva: a calibração com lojistas reais — as margens verdadeiras deles, a reação ao pitch — **precede o congelamento**. ⚠️ E **`TREAT` não está no ADR**: veio da faixa de "margem média" da `IDEACAO §26`. Trocar um número no arquivo e rodar `npm run db:seed` é o procedimento inteiro |
| ~~4~~ | ✅ **RESOLVIDO na `pd-19` (13/09/2026)** — o canal do titular existe e está publicado. A página `/privacidade` traz `contato@petdots.com.br` no cabeçalho e no §5, e `PRIVACY_CONTACT` deixou de ser `contato@petdots.com.br (a definir)`. ⏳ **O que resta é seu, na Etapa 2:** dizer **qual caixa recebe** e ligar o Email Routing do Cloudflare — 🔴 **pré-condição de go-live**, porque a página promete um canal que a LGPD manda oferecer, e um endereço que devolve a mensagem é pior do que não ter página | `apps/landing/src/content/privacy.ts`; texto em [`AVISO_DE_PRIVACIDADE`](../01-product/AVISO_DE_PRIVACIDADE.md), premissa A2 | O endereço `contato@` não é uma caixa: com o DNS no Cloudflare (ADR-0020, E6) o Email Routing encaminha para uma caixa sua, sem custo, e o destino recebe um e-mail de verificação que só você confirma |
| 5 | **Promover a `develop` para `master`**, quando quiser | "Aguardando promoção", no fim deste documento | ✅ **Metade resolvida em 11/09/2026:** a `develop` foi criada e a `pd-09` mergeada nela ([ADR-0009](../06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md)) — decisão sua, tomada depois de a IA recomendar o contrário e você reafirmar. O que resta é o que o próprio modelo lhe reserva: **`master` só avança a pedido explícito seu**, a cada vez. ⚠️ Enquanto não promover, `master` fica atrás do estado real, e quem clonar o repositório cai nela |
| 6 | **Publicar** (landing + API + Postgres + app web + domínio) — **é a `pd-19`**. ✅ **Etapa 1 (código) entregue em 13/09/2026:** rate limit, página `/privacidade`, comparador fora do menu, `_redirects` e CSP do app web, `railway.json` dos dois serviços, ADR-0021 e a documentação. ⏳ **Etapa 2 (montagem) espera você.** O que só você faz: **criar a conta no Railway** (quando a publicação estiver a dias — ADR-0020, E8), criar a conta no Cloudflare e no Grafana Cloud, autorizar os apps do GitHub no repositório, colar o `JWT_SECRET` e a chave do Grafana, **trocar os nameservers de `petdots.com.br` no Registro.br**, ligar o Email Routing, e **pedir a promoção `develop` → `master`** — é o merge em `master` que dispara o deploy (E7) | Passos concretos fechados em [`DEPLOYMENT`](../03-engineering/DEPLOYMENT.md) §"Passos de deploy"; ordem do go-live lá também | Envolve conta e cartão — 🔴 **e nada é pago antes de a publicação estar a dias** (E8): o trial dá US$ 5 por 30 dias e cobre a montagem. ⚠️ **O upgrade para o Hobby não pode atrasar além do trial:** o Railway apaga o volume do Postgres de contas Trial 30 dias depois de os créditos expirarem. Publica-se **sem seed** e com a `/precos` fora do menu até o censo (E9) |
| ~~7~~ | ✅ **RESOLVIDO em 13/09/2026** — é o **Grafana Cloud, plano gratuito** ([ADR-0021](../06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md)), decidido por você no portão da `pd-19`. O que decidiu não foi preço (os dois finalistas são gratuitos): foram **3 usuários contra 1** — o sócio precisa de login — e **14 dias de retenção contra 8**. ⏳ **Resta o cadastro**, na Etapa 2: criar a conta e colar endpoint e chave no painel do Railway | Variáveis em [`DEPLOYMENT`](../03-engineering/DEPLOYMENT.md) §"Variáveis por serviço"; critérios em [`OBSERVABILITY`](../03-engineering/OBSERVABILITY.md) | Cadastro e chave. Anda junto com o item 6 |
| 8 | **Compartilhar com o sócio o diff da emenda v1.1** de `PRODUCT_VISION`/`PRODUCT_PRINCIPLES` (o §8 virou "A Cunha Vence Primeiro") | Nota em "Aguardando merge", no fim deste documento; **A-05** no backlog da estratégia | É carta de fundação, alinhada entre os dois sócios. A `pd-07` foi mergeada antes dessa validação — consequência assumida no merge |
| 9 | 🔴 **Gerar o `JWT_SECRET` do seu `.env` local** — `openssl rand -base64 48`, colar no `.env` | Nasce aqui (`pd-12`). Documentado no [`DEVELOPMENT_GUIDE`](../03-engineering/DEVELOPMENT_GUIDE.md) e no `.env.example` | A variável é **obrigatória e sem default** (ADR-0011): sem ela **a API não sobe**. É deliberado — segredo com default é segredo que vai para produção. A IA não escreve no seu `.env`, que é local e não versionado. O mesmo vale para o ambiente de deploy, quando existir |
| ~~10~~ | ✅ **RESOLVIDO em 12/09/2026** — `OWNER` × `OPERATOR` decidido pelo Victor, registrado no [ADR-0013](../06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md) | Critério agora **marcado** no [`SECURITY`](../03-engineering/SECURITY.md) e no [`AUTHENTICATION`](../04-api/AUTHENTICATION.md); a tabela de permissões vive no `SECURITY` | Em uma linha: **preço, repasse, área de entrega e convite de membro são do `OWNER`; pedido e disponibilidade são dos dois.** Os dois papéis são modelados na `pd-16`, mas **a tela de convite não nasce no MVP** — o vínculo é criado no onboarding conduzido por você, como o catálogo é semeado hoje. Com isso o `StoreScopeGuard` perde um dos dois pré-requisitos; falta só `StoreMember` no schema |
| 11 | 🔴 **Acrescentar `CORS_ORIGINS=http://localhost:8081` ao `.env` local e reiniciar a API** | Nasce aqui (`pd-13`). Documentado no [`DEVELOPMENT_GUIDE`](../03-engineering/DEVELOPMENT_GUIDE.md) e no `.env.example` | O `apps/app` chama a API **pelo navegador** (a landing a chama pelo servidor), então sem essa variável o browser bloqueia **todas** as chamadas — e **o sintoma engana**: o badge do topo diz "API: fora do ar" com a API perfeitamente de pé. A IA não escreve no seu `.env`, que é local e não versionado (precedente do item 9), e `nest start --watch` **não relê o `.env`**: a API precisa ser reiniciada por você. ✅ **A metade de produção deixou de ser pergunta na `pd-19`:** a origem real é `https://app.petdots.com.br`, e está na tabela de variáveis do [`DEPLOYMENT`](../03-engineering/DEPLOYMENT.md) — colar no painel é parte da Etapa 2 |
| ~~12~~ | ✅ **RESOLVIDO na `pd-19` (13/09/2026).** A base legal foi aprovada por você em 13/09 (conta é execução de contrato; lista de espera é consentimento), e agora a frase **é um link**: *"Ao criar a conta você aceita o aviso de privacidade do PetDots"*, apontando para `https://petdots.com.br/privacidade`. A troca de "concorda com" por "aceita" é deliberada — "concordar" sugere um consentimento que a tela não pede e não deve pedir (ADR-0015, D10) | `apps/app/src/screens/register-screen.tsx`; texto em [`AVISO_DE_PRIVACIDADE`](../01-product/AVISO_DE_PRIVACIDADE.md) Parte 2 | Era decisão de produto e jurídica, e a parte de produto está fechada. A leitura jurídica do aviso inteiro continua sua — item 16 |
| 13 | 🔴 **Criar o vínculo das lojas reais com `npm run store:add-member`** — uma vez por pessoa que vai operar cada loja | Nasce aqui (`pd-16`). Procedimento em [`PAINEL_DO_LOJISTA`](../08-features/stores/PAINEL_DO_LOJISTA.md) §"Como o Victor opera hoje" e no [`DEVELOPMENT_GUIDE`](../03-engineering/DEVELOPMENT_GUIDE.md) | **Não existe tela de convite de membro** (ADR-0013 B5, ADR-0018 A1), e não vai existir no MVP. O onboarding é: **(1)** a pessoa cria a conta em `/cadastro`; **(2)** ela te diz qual e-mail usou; **(3)** você roda `npm run store:add-member -- --store <slug> --email <e-mail> --role OWNER`; **(4)** ela sai e entra de novo. ⚠️ **Pré-requisito real:** ela precisa ter conta **antes** — o script se recusa a inventar alguém, e é esse mesmo motivo que mantém o e-mail de gente real fora de arquivo versionado (LGPD). ⚠️ Depois do vínculo, **relogar**: o papel novo só chega ao token no próximo login (ou em até 15 min, pela renovação). ⚠️ Este comando **roda em produção de propósito**, ao contrário do seed de contas `.local` |
| 14 | 🔴 **Abrir o CNPJ, e com ele o acordo de sócios** — é o que trava a `pd-17` inteira | Nasce aqui (13/09/2026), a partir do [ADR-0019](../06-decisions/ADR/0019-psp-do-piloto-asaas.md). Itens **C-02** e **C-01** do backlog da estratégia (`petdots-estrategia/`), os dois `P0` e abertos; detalhe em `TRILHA-C-fundacao-do-negocio.md` §C8 | **A subconta do Asaas exige pessoa jurídica** — conta de CPF não cria subconta, e sem subconta não há split. A Trilha C estima **duas a quatro semanas** e **R$ 1.000-2.000** com contador, e o Asaas ainda aplica um **período de avaliação regulatória** a todo cliente novo que cria subconta via API. ⚠️ **A `pd-17` está a quatro a oito semanas, e nenhuma delas é engenharia.** O acordo de sócios anda junto por outro motivo: hoje todo código escrito é propriedade intelectual pessoal de quem o escreveu |
| ~~15~~ | ✅ **RESOLVIDO na `pd-19` (13/09/2026).** O §3 da página `/privacidade` declara, em português claro, que os servidores ficam nos Estados Unidos e que os dados são transferidos para fora do Brasil, com as salvaguardas que a LGPD exige. O §2 nomeia Railway e Cloudflare | §3 de [`AVISO_DE_PRIVACIDADE`](../01-product/AVISO_DE_PRIVACIDADE.md), publicado em `apps/landing/src/app/privacidade/page.tsx` | Hospedar no Railway (Virgínia) é **transferência internacional** pelo art. 33 da LGPD, regulamentada pela Resolução CD/ANPD nº 19/2024. ⚠️ **A premissa A5 continua aberta e virou o item 16:** o texto publicado afirma que os contratos com os provedores trazem as garantias da lei, e isso **não foi verificado** |
| 16 | 🔴 **Ler, ou mandar ler, o aviso de privacidade publicado — em especial o §3** | Nasce aqui (13/09/2026, `pd-19`), da premissa **A5** de [`AVISO_DE_PRIVACIDADE`](../01-product/AVISO_DE_PRIVACIDADE.md) | O texto **já está no ar** e afirma que *"os contratos com os provedores incluem as garantias contratuais previstas na lei"*. **Isso não foi verificado**: os termos do Railway e do Cloudflare precisam ser lidos à luz do art. 33 da LGPD e da Resolução CD/ANPD nº 19/2024. Não travou a publicação — o aviso descreve o que o sistema faz, e ter a página é melhor do que não ter —, mas é afirmação jurídica sobre contrato nosso. 🔴 **Se a leitura concluir que residência no Brasil é obrigatória**, o gatilho (b) do ADR-0020 E11 dispara e a saída nomeada é o **Fly.io em São Paulo**, a US$ 38 a mais por mês só de banco |
| 17 | **Confirmar com o contador o prazo de guarda fiscal de 5 anos** | Nasce aqui (13/09/2026, `pd-19`), da premissa **A7** de [`AVISO_DE_PRIVACIDADE`](../01-product/AVISO_DE_PRIVACIDADE.md) | O §4 do aviso publicado promete anonimizar — não apagar — o pedido de quem pedir exclusão, e guardá-lo por **5 anos**, que é o prazo usual. Publicado sem confirmar porque **ainda não há pedido pago**: o prazo só passa a valer sobre dado real com a `pd-17`. Confirme junto com a abertura do CNPJ (item 14); se o número mudar, muda o §4 e a data no topo da página |

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
| 🔴 **Não existe recuperação de acesso — gatilho DISPAROU: o app web foi publicado na `pd-19`** | Desde a `pd-12` dá para logar, mas quem esquece a senha **fica trancado**, sem caminho de volta pela aplicação ([ADR-0011](../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md), A4/R1). **Por que ficou fora:** exige canal de **notificação transacional**, decisão de modelagem pendente registrada abaixo (o módulo `notifications` só tem `reminders`) e que pede ADR próprio — sem canal, "recuperar senha" não tem como existir. 🔴 **O que mudou em 13/09/2026:** o gatilho era *"primeiro usuário real fora do seed"*, e a `pd-19` publicou `app.petdots.com.br` — **qualquer pessoa pode criar conta agora**. Foi decisão consciente do Victor no portão (P4): a landing não linka para o app, ninguém chega nele por acaso, e o smoke test com lojistas precisa de URL estável. Até o canal existir, **o conserto é o Victor trocar o hash por SQL**. **Trabalho:** decidir o canal, depois `POST /auth/password-reset` com token de uso único e expiração curta | `pd-12`, 12/09/2026; gatilho disparado na `pd-19`, 13/09/2026 |
| **Remoção de membro e a regra do último `OWNER` sem produtor — gatilho: tela de convite/remoção de membro** | O [ADR-0013](../06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md) B6 diz que **toda loja tem ao menos um `OWNER`**, e a `pd-16` implementou o vínculo **sem nada que o remova** — logo a invariante não tem como ser violada hoje, e também não tem como ser verificada. B5 já tinha tirado a tela de convite do MVP, com gatilho *primeira loja pedindo um segundo acesso*; remover membro entra pela mesma porta. **Trabalho quando disparar:** a tela, mais a regra que recusa remover o último `OWNER` | `pd-16`, 13/09/2026 ([ADR-0018](../06-decisions/ADR/0018-painel-do-lojista-vinculo-escopo-e-app.md)) |
| **Apagar a conta de quem opera uma loja falha no banco — gatilho: capacidade 14 (direitos do titular sobre os dados)** | A FK `store_members.user_id` é **`RESTRICT`** (ADR-0018, A2): apagar um `users` que tem vínculo levanta erro de integridade em vez de cascatear. **É a falha fechada certa por enquanto** — enquanto remover o último `OWNER` for proibido e não tiver produtor, cascatear poderia deixar uma loja sem dona. Mas a capacidade 14 promete exclusão a pedido do titular, e vai esbarrar nisso. **Trabalho quando disparar:** decidir, com uma loja real na mão, se a conta é anonimizada (como o pedido, que é registro contábil) ou se a exclusão exige transferir a titularidade antes | `pd-16`, 13/09/2026 |
| **Fila da loja sem paginação — gatilho: primeira loja com mais de ~200 pedidos** | `GET /stores/{storeId}/orders` devolve **tudo**, sem `page`/`pageSize`, e o painel busca a fila inteira a cada 20 s. No piloto é dezenas de linhas, e paginar agora seria infraestrutura antecipada (ADR-0018). **O que mede:** `SELECT count(*) FROM orders GROUP BY store_id`. **Trabalho quando disparar:** paginação por offset, na forma já fixada pelo [`API_GUIDELINES`](../04-api/API_GUIDELINES.md) | `pd-16`, 13/09/2026 |
| **A prateleira de uma loja `PAUSED` não abre — gatilho: primeira loja real pausada precisando editar preço** | O painel lê a prateleira pela rota **pública** `GET /stores/{id}/offers?unavailable=true`, e essa rota responde `404 STORE_NOT_FOUND` para loja pausada (pd-13, A15 — regra certa para o lado público). Consequência: quem pausa a loja perde a tela de preços, embora continue enxergando a fila e os horários (`/store-memberships` inclui pausadas de propósito). **Descoberto na `pd-16`, por leitura do código, não reproduzido.** **Trabalho quando disparar:** uma leitura escopada da prateleira, ou relaxar a regra só para membros | `pd-16`, 13/09/2026 |
| **Google OAuth adiado — gatilho: decisão sobre vinculação de conta + OAuth client novo no Google Cloud** | O `SECURITY` e o `AUTHENTICATION` preveem login social; a `pd-12` entregou só e-mail/senha ([ADR-0011](../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md), A3). **Dois bloqueios independentes.** (a) **Decisão de produto:** a mesma pessoa entrando por Google e por senha com o mesmo e-mail vira **um** `User` ou dois? Vinculação de conta é decisão, não detalhe de implementação. (b) **Acesso ao console:** exige criar um OAuth client novo — trabalho do Victor. ⚠️ **Relacionado ao item 1 da fila:** há um client legado **ainda pendente de revogação** no mesmo console, o que torna o momento péssimo para criar outro. Resolver aquele primeiro | `pd-12`, 12/09/2026 |
| 🐞 **Bug pendente: a busca de produtos some por completo em telas mobile — gatilho DISPAROU; falta a medição a 390px** | Ver `BUG-001` em [`BUGS.md`](BUGS.md) — abaixo de 768px o app web legado não oferecia **nenhuma** forma de buscar produto por nome (`header.tsx:73`, `hidden md:block`). ⚠️ **Não há mais código vivo com o defeito** (legado arquivado em 07/09/2026). ✅ **O gatilho era "desenhar a J2 de produto", e a `pd-11` a desenhou:** `/precos` e `/precos/{slug}` na landing, com a busca **fora do header** (bloco próprio, sem `display:none` por breakpoint) e a tabela de ofertas virando **cartões empilhados** abaixo de 640px, sem rolagem horizontal. 🔶 **Por que o item continua aqui:** "sem rolagem horizontal a 390px" só se verifica renderizando, e a IA não abriu navegador — a conferência é o **passo 10 do roteiro manual da `pd-11`**. Passando, o item sai daqui e vira `BUG-R01` em Resolvidos. **Trabalho:** só a medição | Reprodução do Victor, 06/09/2026; escopo atualizado em 07/09/2026; reconferido na `pd-08` (11/09); J2 desenhada na `pd-11` (11/09/2026) |
| **Painéis e alertas além do mínimo — gatilho: primeira semana de tráfego real** | ✅ **O mínimo foi definido na `pd-19`** ([ADR-0021](../06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md), T5): uma **sonda HTTP externa** no `/api/v1/health` e na raiz da landing, avisando quando a resposta não for `200`, e **um painel** sobre `http.server.request.duration`. O que fica é o conjunto completo — alerta por taxa de erro, por latência, por fila de pedidos parada. **Por que não agora:** alerta desenhado sem conhecer a forma do tráfego produz alarme falso, e alarme falso treina a pessoa a ignorar o alarme. Com uma semana de tráfego real os limiares deixam de ser chute | `OBSERVABILITY`, 08/09/2026; recortado na `pd-19`, 13/09/2026 |
| **Logs não chegam ao backend de telemetria — gatilho: primeiro incidente que exija correlacionar log com trace fora do Railway, ou a retenção de 7 dias se mostrar curta** | ⚠️ **Gatilho trocado na `pd-19`** — o antigo era "vendor escolhido", e ele disparou; a **premissa** é que não se sustentou. Desde a `pd-04` os logs carregam `trace_id`/`span_id`, e seguem **só em stdout**. Com **uma instância** (`DEPLOYMENT`), "juntar log de várias réplicas" não existe como problema; o Railway retém **7 dias no Hobby**, no mesmo painel do deploy; e a correlação já é possível assim que alguém precisar dela. Enviá-los custaria um exportador OTLP de logs **mais** um bridge do pino, que a `pd-04` não deixou pronto, para comprar conveniência ([ADR-0021](../06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md), T3). **Trabalho:** decidir entre bridge do pino e agente coletor, e medir o que isso consome da cota do vendor | ADR-0006, 08/09/2026; re-escopado na `pd-19`, 13/09/2026 |
| **`nestjs-zod` rodando fora do peer declarado, e parado desde 25/07/2026 — gatilho: `nestjs-zod` publicar suporte a `^12`** | **Medido em 08/09/2026:** a `pd-05` subiu o NestJS para 12 forçando por `overrides` os **dois** peers que o `nestjs-zod@5.5.0` declara (`@nestjs/common ^10 || ^11` e `@nestjs/swagger ^7.4.2 || ^8 || ^11`) — decisão do [ADR-0007](../06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md), sustentada por contrato OpenAPI inalterado e suíte verde. **O risco de fundo é a biblioteca:** último publish em **25/07/2026**, sem pré-release recente, e é ela que materializa o contrato Zod→OpenAPI do ADR-0002. **Trabalho:** remover o override quando o upstream publicar suporte a `^12`; se ela não voltar a publicar, executar a substituição registrada em [`IDEIAS.md`](IDEIAS.md) | `pd-05`, 08/09/2026 |
| **Tooling do Nest travado na linha 11 — gatilho: decidir subir a raiz para TypeScript 6** | **Premissa corrigida em 11/09/2026 (`pd-08`).** O registro anterior dizia que "a `latest` do TypeScript é 7.0.2 (a 6 saiu apenas em beta)" e tratava o upgrade como duas majors de uma vez. **Isso está refutado:** as versões **6.0.2 e 6.0.3 estão publicadas e são estáveis** — o que enganou a leitura original é que a tag `latest` pulou para a linha 7 e as tags `beta`/`rc` do TypeScript estão desatualizadas. O que segue valendo do registro de 08/09/2026: `@nestjs/schematics@12` declara peer `typescript >=6.0.0` e o `@nestjs/cli@12` embute `typescript ~6.0.2`; a raiz está em **5.9.3**; o alcance é só build e scaffolding (`nest build` funciona, CI verde). **Novo desde a `pd-08`:** a coexistência das duas linhas **está medida e funcionando** — `apps/app` roda **TypeScript 6.0.3** aninhada em `apps/app/node_modules` enquanto a raiz segue em 5.9.3, sem colisão. Ou seja, **o caminho é um único major (5.9 → 6), não dois**, e não exige o compilador nativo da linha 7. **Trabalho:** avaliar subir a raiz para a linha 6 e, com ela, `@nestjs/cli`/`@nestjs/schematics` 12 — conferindo os peers de `typescript-eslint` (aceita `<6.1`) e `ts-jest` (aceita `<7`) | `pd-05`, 08/09/2026; premissa refutada e alcance remedido na `pd-08`, 11/09/2026 |
| **14 vulnerabilidades `moderate` vindas da cadeia de build do Expo — gatilho: `expo-router` e `@expo/config-plugins` atualizarem suas transitivas** | **Medido em 11/09/2026 (`pd-08`), comparando `npm audit` num worktree de `d18bc0e` com o da branch:** o `apps/app` acrescentou **14 `moderate`**, em duas cadeias — `decode-uri-component` ← `query-string` ← **`expo-router`**, e `uuid` ← `xcode` ← **`@expo/config-plugins`** (puxado por `expo`, `@expo/cli`, `expo-splash-screen`, `@expo/metro-config`, `@expo/prebuild-config`). **Nenhuma é código de runtime do cliente:** `xcode`/`config-plugins` só rodam em prebuild nativo, e as duas são DoS por entrada malformada. **Por que não se resolve agora:** são transitivas de pacotes do SDK 57, e forçar `override` nelas arrisca o bundler no meio do gate — o ADR-0008 fixou o SDK 57 justamente para não invalidar a medição. **Trabalho:** reconferir a cada bump de SDK do Expo; se persistirem, avaliar `overrides` como os dois que já sustentam o Prisma | `pd-08`, 11/09/2026 |
| **7 vulnerabilidades `high` pré-existentes na cadeia `multer`/NestJS — gatilho: `@nestjs/platform-express` depender de `multer` corrigido** | ⚠️ **Premissa do repositório envelhecida, corrigida em 11/09/2026.** O `TECHNOLOGY_STACK` e o item dos `overrides` afirmam `npm audit` **em zero**, medido em 08/09/2026. **Já não é verdade, e não é culpa da `pd-08`:** medido num worktree limpo de `d18bc0e`, **sem `apps/app`**, o audit acusa **7 `high`** — quatro advisories de DoS no `multer`, que sobem por `@nestjs/platform-express` → `@nestjs/core` → `@nestjs/swagger`/`@nestjs/testing`/`nestjs-pino`/`nestjs-zod`. Surgiram entre 08/09 e 11/09/2026. **Alcance:** o `multer` só é exercido em upload multipart, e **o MVP não tem upload** (`MVP_SCOPE`: storage fora do escopo). **Trabalho:** acompanhar o `@nestjs/platform-express`; quando publicar com `multer` corrigido, subir. Reavaliar com urgência **se e quando** o primeiro endpoint de upload nascer | `pd-08`, 11/09/2026 |
| **Busca de produto por `LIKE` sobre `search_text` — gatilho: catálogo acima de ~500 SKUs, ou qualidade de busca ruim medida** | A `pd-11` implementou a busca com uma coluna normalizada (`products.search_text`, sem acento e em minúsculas) e `LIKE` por token AND-ado, **em vez do `tsvector`** que o `SYSTEM_ARCHITECTURE` previa ([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md), A5). **Por que assim:** com 52 SKUs, full-text + `unaccent` — que exige função wrapper `IMMUTABLE` para viabilizar coluna gerada — é infraestrutura antecipada (`AGENTS.md`). **O que se perde:** não há stemming ("raçoes" não acha "ração"), não há tolerância a erro de digitação, e `%termo%` não usa índice (btree não ajuda). **Trabalho:** quando o gatilho disparar, avaliar `tsvector` + `unaccent` ou `pg_trgm` — sem datastore novo em nenhum dos casos | `pd-11`, 11/09/2026 |
| **Cobertura de entrega resolvida em memória — gatilho: mais de ~200 áreas de entrega ativas** | O `CompareOffersUseCase` carrega **todas** as áreas ativas de lojas não pausadas e filtra com `areaCoversAddress`, função pura de `packages/domain` ([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md), A7). **Por que assim:** põe a regra onde o ADR-0004 #12 a quer (domínio puro, teste unitário) e evita SQL sobre a coluna JSONB `postal_code_ranges`. **Medido hoje:** 9 áreas ativas no seed do piloto — uma consulta pequena por comparação. **Trabalho:** ao passar de ~200 áreas, mover o filtro para SQL (ou materializar bairro/faixa numa tabela indexada) e medir de novo | `pd-11`, 11/09/2026 |
| **Corpo do 404 de produto não é renderizado no servidor — gatilho: o Next passar a renderizar a fronteira de `not-found` no SSR, ou o primeiro relato de tela em branco** | **Medido na `pd-11` (11/09/2026)**, em build de produção (`next start`): `GET /precos/produto-que-nao-existe` devolve **404** e o `<title>` correto, mas o `<body>` servido traz só o placeholder de Suspense — o conteúdo de `not-found.tsx` chega apenas no payload RSC. Com JS ligado o visitante vê a página; **com JS desligado, vê tela em branco**. **Causa provada, e não é nossa:** uma reprodução mínima — rota dinâmica sem `generateMetadata`, sem `fetch`, com `notFound()` logo após o `await params` — comporta-se **de forma idêntica**. É como o Next implementa `notFound()`: ele sinaliza lançando exceção, e o React não renderiza conteúdo de fronteira de erro durante o SSR. Também **não é o `try/catch`** (reestruturado, sem mudança) e **não é geral** — o 404 de rota inexistente, servido pelo `_not-found` estático, renderiza no servidor. ✅ **SEO coberto duas vezes:** o Next injeta `<meta name="robots" content="noindex">` sozinho, e `title`/`description`/`canonical`/`og:` estão no `<head>` servido de **todas** as páginas reais (verificado uma a uma). 🙋 **Decisão do Victor, 11/09/2026:** manter o **404 verdadeiro**. A IA apresentou a alternativa — renderizar a mensagem direto na página, o que traria o corpo no HTML servido ao custo de virar **status 200 (soft 404)**, perdendo o sinal nos logs e na conformidade — e ele preferiu o status correto. **Trabalho:** reavaliar a cada major do Next | `pd-11`, 11/09/2026 |
| **Landing sem teste automatizado de interface — gatilho: primeira tela da landing com estado de cliente além do formulário de espera, ou primeira regressão detectada pelo roteiro manual** | **Migrado de [`IDEIAS.md`](IDEIAS.md) na `pd-11`** (decisão P4 do portão, 11/09/2026): o gatilho antigo era "a segunda tela da landing", e a `pd-11` criou a segunda e a terceira — mas **ambas são server components sem estado de cliente**, com formulários `GET` puros e zero `useState`. Montar Playwright sobre páginas sem interação escolheria a ferramenta no pior momento possível, e a lógica que poderia quebrar está coberta: a API por e2e contra Postgres real, e as regras por unidade em `packages/domain`. **O vão que fica:** a Server Action do formulário de espera (`pd-09`) e a renderização das páginas de preço não são exercitadas por teste nenhum — a rede é o roteiro manual (item 2 da intervenção manual). **Trabalho:** quando o gatilho disparar, escolher a ferramenta com mais de uma tela interativa na mão | `pd-09` (`IDEIAS`), 11/09/2026; gatilho redefinido e migrado na `pd-11`, 11/09/2026 |
| **`eslint-config-expo` e `eslint-config-next` atrasados em relação ao ESLint 10 do repositório — gatilho: `eslint-plugin-react` publicar suporte estável ao ESLint 10** | **Medido em 11/09/2026 (`pd-08`), e reconfirmado na `pd-09` com a landing:** os dois configs embutem `eslint-plugin-react@7.37.x`, cuja `latest` declara peer `eslint ^3 … ^9.7` — não cobre o **ESLint 10.10.0** do repositório. Na prática o lint **morre ao carregar a primeira regra**: `TypeError: contextOrFilename.getFilename is not a function`, porque a autodetecção de versão do React usa uma API que o ESLint 10 removeu. **Contornado em dois lugares, com o mesmo remédio de uma linha** — `apps/app/eslint.config.mjs` e `apps/landing/eslint.config.mjs`, ambos com `settings: { react: { version: '19.2.3' } }`, que pula a detecção, e com o motivo no comentário. Em ambos também estão desligadas as regras `import/*`, cujo resolver de TypeScript é incompatível e reporta todo import como não resolvido (o eixo é coberto por `import-x` nos demais workspaces, pelo `tsc` e pelo bundler de cada app — Metro e Turbopack, os dois no CI). ✅ **Na `pd-09` o contorno bastou**: `eslint-config-next@16.3.4` sob ESLint 10 lintou os 9 arquivos da landing sem erro, e o fallback previsto no plano (base `@petdots/config` + `@next/eslint-plugin-next` avulso) **não foi necessário**. **Risco:** o contorno é frágil a upgrades de qualquer um dos dois configs, e agora são dois pontos a manter. A única versão que declara peer para o ESLint 10 é a `eslint-plugin-react@7.8.0-rc.0`, pré-release. **Trabalho:** remover os dois contornos quando o upstream publicar estável | `pd-08`, 11/09/2026; estendido ao `eslint-config-next` na `pd-09`, 11/09/2026 |
| **Caminho nativo do `SecureStore` não exercitado — gatilho: primeiro build nativo (Expo Go ou EAS)** | `apps/app/src/session/session-storage.ts` guarda a sessão no `expo-secure-store` e é o arquivo que o `tsc` confere, mas **nenhum teste e nenhum build o executou**: o projeto não tem build nativo nem Expo Go configurado, e o Metro entrega `session-storage.web.ts` no navegador. O que roda hoje é só a metade web. **Risco:** um erro de API do `SecureStore` (nome de método, chave acima de 2048 bytes, keychain bloqueado) só apareceria no primeiro aparelho. O teto de bytes já tem teste unitário; o resto não | `pd-13`, 12/09/2026 |
| **Sessão não sincroniza entre abas, e duas renovações simultâneas podem deslogar uma — gatilho: primeiro relato de logout inesperado** | No web a sessão vive no `localStorage` e **nenhuma aba avisa a outra**: sair numa aba deixa a outra achando que continua logada até o próximo refresh ou F5. Pior caso conhecido: duas abas renovando **ao mesmo tempo** apresentam o mesmo refresh token, a rotação queima o primeiro, e a segunda recebe `401` e desloga. O *single-flight* de `http.ts` resolve isso **dentro** de uma aba, não entre abas — precisaria de `storage` events ou `BroadcastChannel`. **Aceito para o MVP** (ADR-0012): o piloto tem uma aba por pessoa, e a correção custa mais que o incômodo hoje | `pd-13`, 12/09/2026 |
| **Quinze eventos de domínio documentados e não emitidos — gatilho: primeiro consumidor de evento in-process (candidato: notificação de boas-vindas, ou o aviso de pedido novo à loja)** | **Atualizado na `pd-16` (13/09/2026): são quinze.** A `pd-15` acrescentou `order.placed`, `order.cancelled` e `order.rejected`; a `pd-16` acrescentou `order.accepted`, `order.dispatched`, `order.delivered`, `order.item_unavailable`, `offer.price_changed`, `offer.availability_changed` e `offer.created` — todos pelo mesmo motivo dos outros. 🔴 **E o consumidor real continua tendo nome, agora invertido:** avisar **o tutor** de que a loja aceitou, despachou ou entregou (capacidade 10). O aviso **à loja** também segue faltando, mas deixou de ser fatal: a `pd-16` pôs polling de 20 s na fila, então um pedido não expira mais por ninguém ter olhado. ⚠️ **A linha de `audit_log` não é um evento** e não conta aqui: é rastro, não barramento — ninguém reage a ela. **Registro anterior:** O [`USER_JOURNEYS`](../01-product/USER_JOURNEYS.md) §J9 prevê `waitlist.joined`, e a `pd-09` implementou a captura **sem emiti-lo** (decisão A14); o [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md) §Eventos prevê `tutor.created` e `pet.created`, e a `pd-14` fez o mesmo (ADR-0015). O motivo é idêntico nos três, e por isso são **um item só**: não existe barramento in-process no projeto, não há consumidor, e instalar `@nestjs/event-emitter` para eventos sem ouvinte é infraestrutura antecipada (`AGENTS.md`). Os casos de uso carregam comentário dizendo isso — `apps/api/src/modules/waitlist/application/join-waitlist.use-case.ts`, `.../tutors/application/upsert-tutor-profile.use-case.ts` e `.../tutors/application/register-pet.use-case.ts`. **Trabalho:** quando nascer o primeiro consumidor real, escolher o barramento e emitir os três — e conferir se os demais eventos do `DOMAIN_MODEL` entram junto | `pd-09`, 11/09/2026; ampliado na `pd-14`, 12/09/2026 |
| **Exclusão de pet é física — gatilho: `replenishment_schedules` referenciar `pets` (capacidade 9)** | `DELETE /tutors/me/pets/{petId}` apaga a linha de verdade (ADR-0015, D5). Hoje é a escolha certa e **nada referencia `pets`**: um `deleted_at` teria de ser carregado por toda consulta para um caso que não existe, e um pet não está sob retenção fiscal como o Pedido está. **Quando a agenda de reposição apontar para o pet**, a decisão precisa ser refeita com uma agenda na mão: cascata (a agenda morre com o pet) × soft-delete (a agenda sobrevive apontando para um pet inativo). **Trabalho:** decidir e, se for soft-delete, migrar as linhas existentes e revisar todas as consultas de `pets` | `pd-14`, 12/09/2026 |
| 🐞 **Bug pendente: `string \| null` sai como `array de string` no `openapi.json`** | Ver `BUG-V01` em [`BUGS.md`](BUGS.md) — quatro campos do contrato publicado (`phone` ×2, `petFoodDeclared`, `ean`) descrevem um array onde a API devolve um escalar anulável. **Sem efeito em runtime**: quem serializa é o schema Zod, e nenhum cliente do repositório é gerado a partir do `openapi.json`. **Gatilho:** `nestjs-zod`/`@nestjs/swagger` preservarem `type: [T, 'null']` no schema de topo de um `createZodDto`, **ou** o projeto passar a gerar cliente pelo contrato. Falta medir em qual das duas bibliotecas o array é achatado, para abrir a issue no lugar certo | `pd-14`, 12/09/2026 |
| **`STORE_REFERRAL` sem produtor — gatilho: `referral_code` em `stores` (J6/onboarding)** | A comissão zero para cliente próprio do lojista (ADR-0003 #4) **está implementada e testada** em `packages/domain/src/commission.ts` — e **nada a aciona**: `orders.acquisition_channel` nasce sempre `PLATFORM`, porque `stores.referral_code` não existe no schema. É a mesma situação de `SUBSTITUTED`: valor de enum apontando para um caminho que o MVP não percorre. **Por que não se resolveu na `pd-15`:** inventar um `?ref=` agora seria decidir a mecânica do canal de aquisição sem o dono dela — o código/QR da loja é da J6 (ADR-0010, A3) e do onboarding. **Trabalho:** quando `referral_code` nascer, ligar a origem da requisição ao canal na criação do pedido | `pd-15`, 13/09/2026 |
| **Carrinho nativo vive em memória e some ao fechar o app — gatilho: primeiro build nativo** | `apps/app/src/cart/cart-storage.ts` (a metade **nativa**) guarda o carrinho numa variável de módulo. **Por que não é `expo-secure-store`:** é um keychain com teto de ~2 KB, ferramenta errada para uma lista de compras que não é segredo. **Por que não é `AsyncStorage`:** não está instalado, e instalá-lo na `pd-15` seria dependência nova para uma plataforma que ninguém buildou ainda (ADR-0017, A5). **No web — que é o que o piloto roda — o `localStorage` já sobrevive a um F5.** **Trabalho:** no primeiro build nativo, instalar `@react-native-async-storage/async-storage` e trocar o objeto; a porta e o parse com Zod já estão prontos | `pd-15`, 13/09/2026 |
| **Job roda num runner próprio, sem biblioteca — gatilho: o segundo job (conciliação diária do PSP, `pd-17`)** | O `OrderExpirySweeper` é um `setInterval(...).unref()` (ADR-0017, A13), e **não** `@nestjs/schedule`. **Por que:** o repositório já roda um pacote fora do peer range (`nestjs-zod` contra o Nest 12, ADR-0007), e um segundo — para um temporizador que a plataforma já tem — é risco sem ganho. **O que se perde:** declaração por decorator, e um lugar único para listar os jobs. **O que se ganha:** ~40 linhas sem dependência, e a parte difícil (deadline, advisory lock, compare-and-set) está em código testado. ⚠️ **O runner em si não tem teste** — só o caso de uso que ele chama. **Trabalho:** com o segundo job na mão, decidir entre manter e adotar uma biblioteca | `pd-15`, 13/09/2026 |
| 🔴 **Apagar uma conta que já fez pedido falha no banco — gatilho: capacidade 14 (direitos do tutor sobre os dados)** | `orders.tutor_id` é **`ON DELETE RESTRICT`**, não `CASCADE`, porque o pedido é registro fiscal e não pode ser apagado junto com o tutor (ADR-0017). **Consequência medida:** a cascata `users` → `tutors` que funcionava até a `pd-14` agora **falha** para qualquer conta que tenha pedido. É o comportamento desejado, e aponta para o que o `SECURITY` §LGPD já prescrevia: a exclusão a pedido do titular **anonimiza o dado pessoal e preserva o registro**, nunca apaga. ⚠️ **Agravante da `pd-15`:** o pedido guarda um **snapshot** de nome, telefone e endereço (é o mínimo que a loja precisa para entregar), então o dado pessoal está **duplicado** — a anonimização terá de alcançar `orders.contact_name`, `contact_phone` e `delivery_address`, além de `tutors`. **Trabalho:** na capacidade 14, escrever a anonimização em vez do `DELETE` | `pd-15`, 13/09/2026 |
| **Rate limit vive na memória do processo — gatilho: a segunda réplica da API** | O `RateLimitStore` da `pd-19` conta em `Map`, no processo. É o que cabe hoje: a API é **instância única** (`DEPLOYMENT`), então um processo vê todas as requisições e um armazenamento compartilhado custaria Redis — infra que o ADR-0002 proíbe antecipar. Duas consequências **aceitas e nomeadas**: os contadores **zeram a cada deploy** (uma janela de folga por publicação, irrelevante contra abuso sustentado) e **não somariam entre réplicas** — com duas, cada uma daria o orçamento inteiro. **Trabalho:** quando a segunda réplica existir, trocar o store por um compartilhado. O gatilho já é gatilho de ADR por outro motivo (fila externa para os jobs) | `pd-19`, 13/09/2026 |
| **O `_redirects` do app web precisa acompanhar rota estática nova sob um prefixo dinâmico — gatilho: rota nova em `apps/app` sob `/painel`, `/pedidos`, `/conta/pets`, `/loja` ou `/precos`** | No Cloudflare Pages *"redirects are always followed, regardless of whether or not an asset matches the incoming request"*: a regra **ganha do arquivo**, e a primeira que casa decide. Uma rota estática nova sob um desses prefixos seria engolida pelo placeholder, e o sintoma é a tela errada — não um 404. Hoje isso é **inofensivo**, e foi medido: `conta/pets/novo.html` e `conta/pets/[petId].html` são **byte a byte iguais**, porque toda rota sob `(private)/` exporta o mesmo placeholder "Carregando sua sessão…" (ADR-0012, A7). Passa a morder quando uma dessas rotas deixar de ser privada ou ganhar conteúdo próprio no export. **Trabalho:** uma linha em `apps/app/public/_redirects`, antes do placeholder, e a prova com `wrangler pages dev` | `pd-19`, 13/09/2026 |
| **O hash da CSP do app web está preso ao script de hidratação do Expo — gatilho: upgrade do `expo-router` ou do `expo`** | `apps/app/public/_headers` traz `script-src 'self' 'sha256-…'`, e o hash é do **único** script inline do export: `globalThis.__EXPO_ROUTER_HYDRATE__=true;`. É essa ausência de `'unsafe-inline'` que compra proteção contra XSS — o risco aceito do `localStorage` (ADR-0012). Se o Expo mudar essa linha, **o app abre em branco** e o console acusa violação de CSP; o build passa, o teste passa, e só o navegador reclama. **Trabalho:** recalcular o hash (o comando está no próprio arquivo e no `SECURITY`) e provar com `wrangler pages dev` antes de publicar | `pd-19`, 13/09/2026 |
| **A sonda de uptime pode depender de um serviço externo ao Grafana — gatilho: confirmar no cadastro se o Free inclui Synthetic Monitoring** | O [ADR-0021](../06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md) escolheu o Grafana Cloud Free, e a página de preços **não confirma** alerting nem sondas sintéticas no plano gratuito (o New Relic Free confirma 500 checks, e foi o segundo colocado por outros motivos). Se não houver sonda no Free, a de T5 vai para um monitor externo gratuito, que é mais um cadastro a manter. **Trabalho:** conferir na Etapa 2, ao criar a conta, e registrar o que ficou | `pd-19`, 13/09/2026 |
| **Comissões do seed são hipóteses, e uma delas não está em ADR nenhum — gatilho: primeira loja real (calibração de campo)** | `apps/api/src/seed/data/commission-rates.ts` semeia `FOOD_STANDARD` 600, `FOOD_PREMIUM` 900, `HYGIENE` 800, `HEALTH_OTC` 1200, `ACCESSORY` 1200 e `TREAT` 1000 bps, marcado `PLACEHOLDER`. Os cinco primeiros saem das faixas do [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) sob a "regra do ⅓"; ⚠️ **`TREAT` não está no ADR-0003** — veio da faixa de "margem média" da `IDEACAO §26`. O próprio ADR registra que as faixas "são hipóteses, não tabela final" e que a calibração com lojistas reais **precede o congelamento**. **Trabalho:** trocar os números no arquivo e rodar `npm run db:seed` — é o procedimento inteiro. Ver também o item **3d** da intervenção manual | `pd-15`, 13/09/2026 |
| **`GET /orders` sem paginação — gatilho: primeiro tutor com mais de ~50 pedidos** | A rota devolve `{ items }` com todos os pedidos do chamador, ordenados por `placed_at desc`, sem metadados — pelo critério de "coleção pequena com limite natural" do [`API_GUIDELINES`](../04-api/API_GUIDELINES.md), o mesmo de `/tutors/me/pets` e `/delivery-areas`. **Medido hoje:** um tutor do piloto faz alguns pedidos por mês. **Trabalho:** ao disparar, paginar por offset como `/products` já faz, sob `VERSIONING` | `pd-15`, 13/09/2026 |
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
>
> ✅ **Quatro saíram daqui em 12/09/2026**, decididas pelo Victor e registradas
> no [ADR-0014](../06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md):
> **estorno e ajuste de pedido**, **prazo de aceite e auto-recusa**, **política
> de cancelamento** e **horário de funcionamento da loja**. Eram as quatro que
> bloqueavam `orders`, e saíram juntas porque eram a mesma pergunta vista de
> ângulos diferentes: o dinheiro entra antes de a loja confirmar, e o que
> acontece quando a confirmação não vem. **Nenhuma das cinco restantes bloqueia
> a `pd-15`.**

| Pendência | Por que o MVP não opera sem ela | O que destrava |
|---|---|---|
| **Cupom de aquisição** | O ADR-0003 #3 já prevê subsídio só via cupom com verba e prazo; falta `discount_cents`, a entidade e a regra de quem paga o desconto | ADR próprio antes de implementar `payments` |
| **Notificação transacional** | O módulo `notifications` tem só `reminders`, e `Reminder` pressupõe agenda de reposição; aviso de pedido aceito ou despachado não tem onde morar. ⚠️ **Ganhou um segundo dependente na `pd-12`:** a **recuperação de acesso** (vigilância) também precisa deste canal — sem ele, "esqueci minha senha" não tem como existir. ⚠️ **E um terceiro na `pd-16`:** o **aviso de pedido novo à loja**, hoje substituído por **polling de 20 s** na fila do painel. O polling é suficiente para uma loja com a aba aberta no balcão e insuficiente para qualquer outra situação — é a solução provisória que o ADR-0018 A8 nomeia como tal | ADR próprio antes de implementar `notifications` |
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
| **Terminar o MVP marketplace do ADR-0004 — falta todo o ciclo do dinheiro** | O [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) está **aceito** (03/09/2026) e define módulos, agregados e fronteiras do MVP. **O que já existe:** capacidade 12 (lista de espera, `pd-09`), o eixo de **leitura** do comparador — capacidades 3, 4-parcial, 5-leitura e 6 (`pd-11`), com quatro endpoints `GET`, quatro tabelas e as páginas `/precos`; a **capacidade 1** quase inteira (`pd-12`: cadastro, login, refresh, logout, `AuthGuard` e `RolesGuard` pelos três papéis); e, desde a `pd-13`, **a capacidade 1 com cliente e a capacidade 5 no app** — login pela interface, `GET /auth/me`, guards **globais**, e as três telas de leitura do `apps/app` (busca, comparação e vitrine da loja) sobre a API de verdade, com dois endpoints novos de loja ([ADR-0012](../06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md)). E, desde a `pd-14`, **a capacidade 2 inteira e a 1 completa no que era possível**: `tutors` e `pets` no banco, as sete rotas de `/tutors`, a **tela de cadastro** e as três telas do perfil, com o endereço já alimentando o comparador ([ADR-0015](../06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md)). **Foi também a primeira escrita de domínio do `apps/app`** — até aqui o cliente só lia. Falta, da capacidade 1: Google OAuth e recuperação de acesso, os dois na vigilância. E, desde a `pd-15`, **a capacidade 6 parcial e a 3 completa**: o pedido no banco sem pagamento — cotação, criação com `Idempotency-Key`, snapshot, comissão por categoria com override e zero por indicação, cancelamento pelo tutor, auto-recusa por prazo vencido, a máquina de estados inteira no domínio, `audit_log`, e o carrinho e o checkout no `apps/app` ([ADR-0017](../06-decisions/ADR/0017-pedido-antes-do-pagamento.md)). **A J3 deixou de não existir.** E, desde a `pd-16`, **a outra metade da 6, a 4 no que não depende do PSP, a 5 completa e a 11 quase inteira**: `store_members`, o `StoreScopeGuard`, as seis ações da loja no pedido, a agenda semanal editável pelo `OWNER`, a escrita de ofertas e as cinco telas do painel ([ADR-0018](../06-decisions/ADR/0018-painel-do-lojista-vinculo-escopo-e-app.md)). **A J4 deixou de não existir.** **O que falta:** `payments` (7), entrega (8), reposição (9), notificações (10), painel do lojista (11), back-office (13) e os direitos do tutor sobre os dados (14) — ou seja, **o ciclo do dinheiro ainda não fecha: nada é cobrado, e nada é repassado**. ⚠️ A **9** tem uma trava própria que não é de código: a fórmula de consumo não existe em documento nenhum e precisa de ADR antes de virar tarefa. O escopo funcional está em [`01-product/MVP_SCOPE.md`](../01-product/MVP_SCOPE.md); o que existe, em [`08-features/`](../08-features/) | ADR-0004, 03/09/2026; recorte atualizado na `pd-11`, 11/09/2026, nas `pd-12`/`pd-13`/`pd-14`, 12/09/2026, e na `pd-15`, 13/09/2026 |
| ~~**Escrita de ofertas pelo lojista (capacidades 5 e 11)**~~ | ✅ **ENTREGUE na `pd-16`** (13/09/2026, [ADR-0018](../06-decisions/ADR/0018-painel-do-lojista-vinculo-escopo-e-app.md), P4). O lojista informa o próprio preço: `PUT /stores/{id}/offers/{offerId}/price` (`OWNER`), `.../availability` (os dois papéis) e `POST /stores/{id}/offers` para pôr um produto do catálogo na prateleira — com a tela `/painel/{storeId}/ofertas`, `assertProductCanBeOffered` reaproveitado, e auditoria em `offer.price_changed`, `offer.availability_changed` e `offer.created`. 🔴 **CORREÇÃO (13/09/2026):** este item dizia que o `Audit` **interceptor** "nasce justamente aqui, porque esta é a primeira das quatro mutações rastreáveis do MVP". **As duas metades estavam erradas.** (a) `audit_log` nasceu na `pd-15`, não aqui — a primeira mutação rastreável a chegar foi a **auto-recusa de pedido por prazo vencido**, não a alteração de preço. (b) Não é um interceptor: é uma **porta chamada pela camada de aplicação**, na mesma transação da mutação ([ADR-0017](../06-decisions/ADR/0017-pedido-antes-do-pagamento.md), A8), porque aquela primeira mutação é feita por um **job**, sem rota e sem status HTTP, que um interceptor de borda nunca veria. A escrita de ofertas **herdou a porta pronta** e só ampliou `entity_type` para `'offer'`. ⏳ **O que resta:** edição **em lote** (a prateleira edita uma linha por vez), e as ofertas do piloto continuam **também** semeadas por arquivo até a primeira loja real assumir as suas | `pd-11`, 11/09/2026; recorte atualizado na `pd-12`, 12/09/2026; **entregue e corrigido na `pd-16`, 13/09/2026** |
| **Implementar a monetização e o split de pagamento do ADR-0003** | O [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) está **aceito** (02/09/2026) e fecha take rate e forma de pagamento do piloto, com a economia por pedido modelada na `IDEACAO_FASE1` §25-§26. Nada implementado. ⚠️ Envolve dinheiro de terceiros (split para o lojista): é candidato natural a ADR próprio de integração e ao maior rigor de teste do MVP | ADR-0003, 02/09/2026 |

| **Vários endereços por tutor, com principal e nome ("casa", "trabalho")** — ✅ **agendada como `pd-18`** | 🔶 **Migrado de [`IDEIAS`](IDEIAS.md) em 13/09/2026: o gatilho disparou.** O item previa virar pendência quando *"casa e trabalho" ou "entregar no endereço da minha mãe" virasse requisito* — e o Victor pediu exatamente isso ao percorrer o roteiro da `pd-15`, com o próprio endereço na mão. **Por que vale mais do que conveniência:** neste produto o endereço **decide quais lojas existem** para a pessoa. Com um só, o tutor tem uma única resposta possível para "quem entrega aqui", e para fazer outra pergunta precisa **editar o perfil** — destrutivo, e não é o que ele quer dizer. Ração é o que mais se manda para o trabalho, onde há alguém para receber peso. **O caso real que expôs isso:** o endereço do Victor (Engenho Novo, CEP 20715310) não é coberto pela loja que ele queria testar, e nas três que o cobrem o único caminho seria trocar o endereço do cadastro. 🔴 **Exige ADR**, porque reverte uma decisão registrada: o [ADR-0015](../06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md) D2 escolheu **colunas planas** em `tutors` em vez de tabela `addresses`, e nomeou este mesmo gatilho para reabrir. **Desenho provável:** tabela `addresses` (`tutor_id`, `label` — **texto livre**, não enum, porque existe "casa da minha mãe" e "sítio" —, os campos que hoje são colunas de `tutors`, e `is_default`); ⚠️ `is_default` **não é enfeite**: é o que preserva o comportamento atual, porque o comparador pré-preenche o CEP a partir dele. **Migração aditiva e sem risco para pedido:** `orders` já grava o **snapshot** do endereço, então nenhum pedido existente depende de `tutors`. **Também toca:** `PUT /tutors/me` (deixa de carregar o endereço), rotas novas de `/tutors/me/addresses`, o seletor no checkout e no comparador, `DOMAIN_MODEL`, `MVP_SCOPE` #2 e o doc de feature do perfil | Sugestão do Victor ao testar a `pd-15`, 13/09/2026; gatilho do ADR-0015 D2; agendada como `pd-18` por ele no mesmo dia |

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
| ~~`pd-13`~~ | ✅ **Entregue em 12/09/2026** — login por interface, sessão persistida por plataforma, `GET /auth/me`, guards globais, as três telas do `apps/app` sobre a API e a vitrine da loja. O spike saiu por inteiro ([ADR-0012](../06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md)) | — |
| ~~`pd-14`~~ | ✅ **Entregue em 12/09/2026** — `tutors` e `pets` no banco, as sete rotas de `/tutors`, a tela de cadastro e as três telas do perfil, com onboarding guiado e não bloqueante, e o endereço pré-preenchendo o CEP do comparador ([ADR-0015](../06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md)). Fecha a **capacidade 2** e a parte que faltava da **1**; a J1 anda até o pet. Primeiro teste de posse e primeiro `403` de papel da API. ⚠️ A calculadora de consumo **não** entrou, e o motivo é que a fórmula não existe em documento nenhum — é decisão de ADR, não de implementação | ✅ nenhuma |
| ~~`pd-15`~~ | ✅ **Entregue em 13/09/2026** — o pedido no banco, sem pagamento ([ADR-0017](../06-decisions/ADR/0017-pedido-antes-do-pagamento.md)): quinta migration com `orders`, `order_items`, `refunds`, `commission_rates`, `store_commission_rates`, `audit_log` e a agenda semanal da loja; `POST /order-quotes` e as quatro rotas de `/orders`; a **máquina de estados inteira no domínio**; o **job de auto-recusa** por prazo vencido; `audit_log` nascendo com a primeira mutação que exigia rastro; e o carrinho, o checkout e as telas de pedido no `apps/app`. ⚠️ **Consequência conhecida:** como a loja ainda não tem endpoint, **todo pedido acaba auto-recusado** — some na `pd-16`. *(Registro original: `orders` — carrinho, pedido, máquina de estados, **sem pagamento**: o pedido para em `PLACED`.* ✅ **Reconfirmado pelo Victor em 12/09/2026**, no encerramento da `pd-14`: a pergunta de puxar a capacidade 9 para cá foi levantada e **respondida — `orders` continua sendo a `pd-15`**. Os dois motivos: as travas de `orders` caíram e as da capacidade 9 não (ela ainda espera o ADR da fórmula de consumo, que não existe). Custo assumido: `pets.weight_grams` fica sendo dado morto até a 9 entrar. ✅ **Insumos prontos desde a `pd-14`:** o endereço de entrega e o telefone do tutor — o checkout não precisa de um segundo formulário de contato. ✅ **As quatro decisões de modelagem que a bloqueavam foram tomadas em 12/09/2026** ([ADR-0014](../06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md)): prazo de aceite de 15 min contado só em horário de funcionamento, agenda semanal da loja, ajuste por item em falta e cancelamento livre até o aceite. ⚠️ Traz junto a **agenda semanal** (`Store`) e a entidade **`Refund`**, ainda que a devolução só passe a funcionar de verdade com o PSP da `pd-17`.)* | ✅ nenhuma |
| ~~`pd-16`~~ | ✅ **Entregue em 13/09/2026** — o painel do lojista ([ADR-0018](../06-decisions/ADR/0018-painel-do-lojista-vinculo-escopo-e-app.md)): **sexta migration** com `store_members` e o enum `store_role`; o **`StoreScopeGuard`** aplicado por rota, com o `storeId` no path e uma consulta por requisição escopada; **treze rotas** — a fila e as seis ações da loja no pedido, os vínculos, a agenda semanal e as três de oferta; o script `npm run store:add-member`, que é o onboarding de loja inteiro; e **cinco telas** sob `/painel`, com polling de 20 s. 🔴 **O efeito que motivou a tarefa: um pedido aceito não é mais auto-recusado.** Junto vieram o **primeiro teste de acesso negado a membro de outra loja** do projeto, o **sentinela concorrente aceite × cancelamento**, e a **escrita de ofertas pelo lojista**, que fecha a terceira das quatro mutações que exigem rastro. ⚠️ **Fora, com motivo:** tela de convite de membro (ADR-0013 B5), repasse (J8, `pd-17`), aviso de pedido novo (capacidade 10) e motivo em texto livre na recusa (`IDEIAS`) | ✅ nenhuma |
| `pd-17` | `payments` — PSP, split, repasse e a **devolução** que o ADR-0014 exige. **A `pd-15` deixou quatro coisas nomeadas para cá:** (a) o **estado anterior ao pagamento** e a mudança de *quando* o pedido é criado (ADR-0017, A1 — `PlaceOrderUseCase` é parcialmente reescrito); (b) a **FK de `refunds.payment_id`**, hoje nula e sem referência; (c) **o que fazer com os `Refund` de pedidos que nunca foram cobrados**, que a `pd-15` gerou em desenvolvimento; (d) a **biblioteca de scheduling**, se quiser uma — é no segundo job (conciliação diária) que a decisão passa a ter duas necessidades reais para se apoiar | 🔴 **CNPJ, e depois conta no Asaas** — ver o item 14 da intervenção manual + três decisões de modelagem que seguem abertas (notificação transacional, obrigações fiscais do split, extrato de repasse). ✅ **O fornecedor deixou de ser pergunta em 13/09/2026:** é o **Asaas**, com subconta por loja ([ADR-0019](../06-decisions/ADR/0019-psp-do-piloto-asaas.md)). ✅ O **estorno** também não é mais: está no [ADR-0014](../06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md). 🔴 **O que sobrou é jurídico, não técnico:** a subconta do Asaas **exige CNPJ**, que não existe — de duas a quatro semanas, mais o período de avaliação regulatória do PSP |
| `pd-18` | **Vários endereços por tutor**, com um marcado como principal e **nome em cada um** ("casa", "trabalho"). ✅ **Agendada pelo Victor em 13/09/2026**, ao testar a `pd-15` com o próprio endereço: as lojas que o cobrem estavam fechadas e a única aberta não cobria — e o único caminho, hoje, seria **editar o cadastro**. Detalhe, desenho e o que toca estão no item de features acima. 🔴 **Exige ADR:** reverte o [ADR-0015](../06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md) D2, que escolheu colunas planas em `tutors` e nomeou este gatilho para reabrir | ✅ **nenhuma** — não depende de PSP, de `StoreMember` nem de nada fora do repositório. Podia vir antes, e a ordem é decisão do Victor |
| **`pd-19`** | 🚀 **Publicar** — aberta fora da ordem acima, em 13/09/2026. ✅ **Etapa 1 (código) entregue:** o **rate limit** por IP nas quatro rotas públicas com `429 RATE_LIMITED`, a página **`/privacidade`** que fecha os itens **4, 12 e 15** da intervenção manual, o comparador **fora do menu, do sitemap e do índice** até o censo (E9), o **`_redirects`** e a **CSP** do app web no Cloudflare Pages, o **`railway.json`** de cada serviço com `prisma migrate deploy` como pre-deploy, o **[ADR-0021](../06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md)** com o destino da telemetria, e `/api/v1/health` fora dos traces. Os itens de vigilância com gatilho *deploy público* saíram todos. ⏳ **Etapa 2 (montagem) é a que falta:** contas, variáveis, DNS, Email Routing e a promoção `develop` → `master`, que é o que dispara o deploy. Passos em [`DEPLOYMENT`](../03-engineering/DEPLOYMENT.md) §"Passos de deploy" | ⏳ **Conta no Railway — o Victor cria quando a publicação estiver a dias** (ADR-0020, E8). Também dele: as contas no Cloudflare e no Grafana Cloud, colar o `JWT_SECRET` e a chave de telemetria, trocar os nameservers no Registro.br, dizer qual caixa recebe `contato@`, e pedir a promoção para `master` |

> ⚠️ **Por que a publicação é `pd-19` e não `pd-17` — decisão da IA em
> 13/09/2026, delegada pelo Victor.** A regra de numeração
> (`DIRETRIZES_FLUXO_IA` §2) manda usar o próximo da sequência, que hoje é 17.
> Mas `payments` é chamada de `pd-17` em **cinco ADRs aceitos** (0014, 0017,
> 0018, 0019 e 0020), que não se editam, e em 13 documentos vivos (mais de 40
> ocorrências, medidas em 13/09/2026); `pd-18` já tem dono desde a `pd-15`. Renumerar custaria dezenas
> de edições e deixaria os ADRs apontando para o número errado. **Os rótulos
> `pd-17` e `pd-18` ficam reservados** para as tarefas acima. 🔴 **Consequência
> para a próxima Fase 1:** depois que a `pd-19` for mergeada, os três comandos
> de "maior `pd-NN`" devolvem 19 — e **17 e 18 não estão livres**. Quem abrir
> `payments` usa `pd-17`; quem abrir vários endereços usa `pd-18`; qualquer
> outra tarefa nova usa `pd-20` em diante.

**Por que a `pd-18` vem por último, mesmo sem trava externa:** ela é a única
das quatro que **não** destrava outra. A `pd-16` tirou o pedido do limbo — ✅
feito em 13/09/2026 —, e a `pd-17` fecha o ciclo do dinheiro. Vários endereços melhora o que já funciona; as duas anteriores fazem
funcionar o que ainda não funciona. ⚠️ **Custo assumido enquanto isso:** para
comparar preços de outro endereço, o tutor tem de editar o cadastro.

**Por que o checkout não vem antes:** ele depende de `Tutor` (endereço),
`Order` e `Payment` — três capacidades —, e a última não começa sem conta no
PSP. **Por que o painel não vem antes:** ele depende de `orders` — a fila de
pedidos é o painel. O outro motivo **deixou de valer em 12/09/2026**: o
`StoreScopeGuard` exigia a distinção `OWNER` × `OPERATOR`, e ela foi fechada no
[ADR-0013](../06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md). E, sem
o login por interface da `pd-13`, nenhuma das duas telas seria navegável
clicando.

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

**Na `develop` e fora de `master`: da `pd-09` à `pd-16`, a `pd-19`, e os PRs
só de documentação (#12, #13 e #17 a #21).**

🔴 **A próxima promoção é o primeiro deploy do projeto.** Ela leva **seis
migrations** e dez tarefas de uma vez, e é ela que dispara o build da API e da
landing no Railway (ADR-0020, E7). A ordem, as verificações e o rollback estão
em [`DEPLOYMENT`](../03-engineering/DEPLOYMENT.md) §"Passos de deploy".
⚠️ **Os roteiros manuais pendentes da `pd-09` e da `pd-11` (item 2) continuam
pendentes** — promover não os substitui.

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
- **`pd-13`** — **sem migration**: login pela interface no `apps/app`, sessão
  persistida por plataforma, `GET /auth/me`, os guards passando a **globais** e
  a vitrine da loja (ADR-0012). Squash em **12/09/2026** pelo
  [PR #12](https://github.com/vhaguiar07/petdots/pull/12) (`b9a6520`).
  ⚠️ **Esta linha faltava:** a `pd-13` foi mergeada e não foi registrada aqui no
  encerramento dela; acrescentada na `pd-14`, ao conferir a seção.
- **`pd-14`** — a **quarta migration** (`create_tutors_and_pets`), o módulo
  `tutors` (perfil, endereço padrão e pets), o módulo `postal-codes` (busca de
  endereço por CEP, a **primeira dependência de terceiro** do projeto), as
  quatro telas novas do `apps/app` e o `phone` na identidade
  ([ADR-0015](../06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md)
  e [ADR-0016](../06-decisions/ADR/0016-diretorio-de-ceps-atras-da-nossa-api.md)).
  Squash em **12/09/2026** pelo
  [PR #14](https://github.com/vhaguiar07/petdots/pull/14) (`d41d07c`), com CI
  verde nos dois runs, e branch removida do remoto e do clone.
  ✅ **Roteiro manual percorrido e aprovado pelo Victor antes do merge.**
- **`pd-15`** — a **quinta migration**
  (`create_orders_refunds_commission_and_audit_log`): `orders`, `order_items`,
  `refunds`, `commission_rates`, `store_commission_rates`, `audit_log` e a
  coluna `stores.opening_hours`. Com ela, o módulo `orders` (cotação, pedido,
  máquina de estados e o **primeiro job** do projeto), um `payments` **mínimo**
  (só `refunds`), o módulo de suporte `audit` (**primeiro `audit_log`**), e o
  carrinho, o checkout e as telas de pedido no `apps/app`
  ([ADR-0017](../06-decisions/ADR/0017-pedido-antes-do-pagamento.md)).
  Squash em **13/09/2026** pelo
  [PR #15](https://github.com/vhaguiar07/petdots/pull/15) (`6f60903`), com CI
  verde nos dois runs, e branch removida do remoto e do clone.
  ✅ **Roteiro manual percorrido e aprovado pelo Victor antes do merge.**
  ⚠️ **Exige `npm run db:seed` em qualquer ambiente com banco**, além do
  `prisma migrate deploy`: é o seed que grava a **tabela de comissão** (sem ela
  o pedido não é precificado), as **agendas** (sem elas nenhuma loja abre) e o
  `status: ACTIVE` das lojas. Duas variáveis novas, **ambas opcionais com
  default**: `ACCEPTANCE_WINDOW_MINUTES` (15) e
  `ORDER_EXPIRY_SWEEP_INTERVAL_MS` (60000; `0` desliga).
  🔴 **Dois commits de correção logo após o merge** (`1239c1b`, `7d96b49`):
  um `tsconfig.json` solto entrou na raiz pelo `git add -A` do commit de
  documentação — o CLI do Expo o cria no diretório corrente, e o wrapper de dev
  fora rodado a partir da raiz. Removido, e o wrapper passou a fixar o `cwd`.
- **Dois PRs só de documentação**, sem código: o
  [#13](https://github.com/vhaguiar07/petdots/pull/13) (`bc41a2c`), que trouxe
  os ADR-0013 e ADR-0014.

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

> ⚠️ **Ao promover para `master`, lembrar — são quatro migrations agora.** Em
> qualquer ambiente que já tenha banco: `npm run prisma:migrate` (local) ou
> `prisma migrate deploy` (alhures), **e depois `npm run db:seed`**, sem o qual o
> comparador sobe sem um produto sequer. Hoje só existe o Postgres local do
> Victor, onde as quatro **já foram aplicadas** (as duas primeiras em
> 11/09/2026, a terceira e a quarta em 12/09/2026). A quarta é a
> `create_tutors_and_pets` (`pd-14`) — **o seed não mudou**, nenhum tutor nem pet
> é semeado: criar o perfil e o pet pela tela **é** o roteiro.
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

> ⚠️ **Ainda não existe ambiente de produção**, e é por isso que esta seção
> descreve o que vai ficar pendente **assim que ele existir**. A `pd-19`
> entregou o **código** da publicação (Etapa 1) e deixou a **montagem** (Etapa
> 2) esperando a conta no Railway — item 6 da intervenção manual.

O que já se sabe que ficará pendente **no dia seguinte ao go-live**:

| Pendência | Por quê, e o que a destrava |
|---|---|
| 🔴 **O banco sobe vazio — o seed não roda** | As oito lojas do seed são fictícias (item 3b) e o seed **nunca** entra no deploy (ADR-0020, E3). Destrava com o censo de rua: trocar `apps/api/src/seed/data/pilot.ts`, rodar `npm run db:seed` pelo CLI do Railway (exige o build antes) e ligar `PETDOTS_COMPARADOR_PUBLICO=true` |
| 🔴 **Nenhum lojista real vinculado** | `npm run store:add-member` roda **uma vez por pessoa**, em produção, depois que ela criar a conta em `/cadastro` (item 13). Este comando roda em produção de propósito, ao contrário do seed de contas `.local` |
| **O aviso de privacidade fala em "fundador", não em empresa** | Premissa A1. Quando o CNPJ sair (item 14), o cabeçalho da página `/privacidade` troca para razão social e CNPJ, e a data no topo muda junto |
| **`CORS_ORIGINS` pode carregar a URL `*.pages.dev`** | Enquanto o app web for demonstrado pelo endereço temporário do Cloudflare. Remover quando só `app.petdots.com.br` for usado |
| **`PRIVACY_UPDATED_AT` precisa ser a data real da publicação** | Hoje é um valor de trabalho em `apps/landing/src/content/privacy.ts`. Trocar no commit que promover `develop` para `master` |

**Migrations aplicadas em produção:** nenhuma ainda. As **seis** são aplicadas
pelo pre-deploy command no primeiro deploy, e o log dele é a prova.
