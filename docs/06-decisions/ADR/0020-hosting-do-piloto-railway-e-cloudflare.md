---
title: "ADR-0020: O hosting do piloto é o Railway, com Cloudflare na frente"
status: stable
version: "1.0"
updated: 2026-09-13
scope: >
  Fecha o critério que o DEPLOYMENT deixou aberto: onde o PetDots é publicado.
  API, landing e Postgres vivem num único projeto do Railway; o export estático
  do cliente universal vive no Cloudflare Pages; o DNS de petdots.com.br vive no
  Cloudflare; o domínio segue no Registro.br. Registra o critério que decidiu
  (custo mensal mínimo com zero operação de banco para um fundador solo), duas
  armadilhas que a avaliação revelou antes de comparar preço (o export estático
  do Expo e a transferência internacional de dados da LGPD), e a regra de não
  pagar nada até a tarefa de publicação começar. É decisão de fornecedor,
  tomada pelo Victor; não cria conta nem implementa nada.
relates_to:
  - 03-engineering/DEPLOYMENT.md
  - 03-engineering/SECURITY.md
  - 03-engineering/OBSERVABILITY.md
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0006-instrumentacao-opentelemetry.md
  - 06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md
  - 06-decisions/ADR/0009-duas-linhas-de-integracao-develop-e-master.md
  - 06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md
  - 06-decisions/ADR/0019-psp-do-piloto-asaas.md
  - 07-process/BACKLOG.md
type: decision
---

# ADR-0020: O hosting do piloto é o Railway, com Cloudflare na frente

## Contexto

O [`DEPLOYMENT`](../../03-engineering/DEPLOYMENT.md) fixou a postura de
infraestrutura em 11/09/2026 — instância única, Postgres gerenciado, sem fila,
sem storage — e deixou **um** critério aberto: *"provedor concreto de
execução/hosting e passos de deploy fechados no bootstrap"*. Era o item 6 da
intervenção manual do `BACKLOG`, e ficou dormindo enquanto havia produto para
construir.

Deixou de dormir em 13/09/2026, por um motivo que não é engenharia: a due
diligence do PSP ([ADR-0019](0019-psp-do-piloto-asaas.md)) revelou que a
`pd-17` está atrás do CNPJ, a semanas de distância. O que sobra de valioso é
**publicar o que existe** — landing, comparador, checkout e painel do lojista
rodam só em `localhost`, e sem deploy não há smoke test nem medição de demanda
(`PROJECT_STATE` §"Próxima Atividade").

### O que precisa ser publicado, e cada peça exige uma coisa diferente

| Peça | O que é | O que exige do hosting |
|---|---|---|
| `apps/api` | NestJS 12 em ESM, boot por `node --import ./dist/instrumentation.js dist/main.js` | Processo Node sempre de pé (o webhook do Asaas vai chegar aqui), variáveis de ambiente, **migrations no deploy** |
| `apps/landing` | Next.js 16 | ⚠️ **Servidor Node, não CDN estática**: o formulário roda numa Server Action que chama a API pelo servidor. Export estático quebra a captura |
| `apps/app` (web) | Expo, `expo export --platform web` com `web.output: "static"` | Host estático, **com reescrita de URL** (ver abaixo) |
| `apps/app` (iOS/Android) | EAS | Não é urgente no piloto; fora desta decisão |
| Postgres | Seis migrations aplicadas | Gerenciado, com backup automático |
| Domínio | `petdots.com.br`, já registrado pelo Victor | A landing é o ativo de SEO; a API e o app são subdomínios |

### A restrição que o Victor pôs na frente

*"Prefiro o menor custo possível no início do projeto, ainda mais agora que nem
sei quando vou publicar. Não faz sentido ficar pagando caro por algo que ainda
não está em uso."* O `C-03` (orçamento e runway) está aberto e `P0` no backlog
da estratégia. Este ADR decide **onde**, e separadamente decide **quando
começar a pagar** (E8).

A due diligence foi feita em **13/09/2026**, por consulta às páginas públicas
de preço e documentação dos fornecedores. As páginas estão listadas no fim.

### O que a avaliação encontrou antes de comparar preço

**1. O export estático do Expo não funciona em host estático "puro".** Com
`web.output: "static"`, o `expo export` gera um arquivo HTML por rota, e as
rotas dinâmicas saem com o **nome literal do parâmetro**. Verificado no
`apps/app/dist` local em 13/09/2026: `painel/[storeId].html`,
`painel/[storeId]/pedidos/[orderId].html`, `pedidos/[orderId].html`,
`conta/pets/[petId].html`, `loja/[storeId].html`, `precos/[productSlug].html`.
Um F5 em `/painel/abc` num host que só serve arquivos responde **404** — é o
mesmo fenômeno que o [ADR-0012](0012-sessao-do-cliente-universal-e-guards-globais.md)
§5 já tinha visto por outro ângulo. A própria documentação do Expo diz que
rotas dinâmicas *"will not work out of the box"* no output estático. Logo, o
host do app web precisa de **reescrita de URL com placeholder**, ou o app
precisa mudar para `web.output: "single"`. É trabalho da tarefa de publicação
(E5), e a escolha do host tinha que comportá-lo.

**2. Hospedar fora do Brasil é transferência internacional de dados.** Nenhum
dos dois provedores de plataforma mais baratos (Railway, Render) tem região na
América do Sul; dos três avaliados, só o Fly.io tem São Paulo (`gru`). Dado pessoal de tutor e de
lojista guardado em servidor nos Estados Unidos cai no **art. 33 da LGPD**,
regulamentado pela **Resolução CD/ANPD nº 19/2024** (cláusulas-padrão
contratuais, com período de adequação de 12 meses que venceu em agosto de
2025). Isso não decide o provedor sozinho — o custo de residência é de US$ 38
por mês só de banco (ver Fly.io abaixo) —, mas **cria uma obrigação no aviso de
privacidade**, que já é público e já tem duas pendências LGPD (itens 4 e 12 da
intervenção manual). Vira E10.

**3. O Postgres serverless não cabe, e o motivo é nosso.** O Neon Free dá 100
CU-hours por mês e escala a zero quando ocioso. Mas a API roda o **job de
auto-recusa a cada 60 s** ([ADR-0017](0017-pedido-antes-do-pagamento.md)), que
consulta o banco — o banco nunca fica ocioso, e 0,25 CU × 730 h ≈ 183 CU-hours
estoura o plano. O Supabase Free **pausa o projeto após uma semana sem
atividade**. Nenhum dos dois é gratuito para o nosso padrão de uso, e os dois
separariam o banco da API em regiões diferentes. Saem.

**4. Duas páginas não abriram para a ferramenta de consulta:** a de preços do
Render e a de preços do Registro.br. Os números do Render abaixo (Starter US$ 7,
Basic-256mb US$ 6) e o do `.com.br` (R$ 40 por ano) vêm de fontes de terceiros
e **precisam ser confirmados na contratação**. Um artigo de 04/09/2026 relata
**dois reajustes do Render na mesma semana**, o que pesa contra previsibilidade
num orçamento que ainda não existe.

## Decisão

**API, landing e Postgres vivem num único projeto do Railway (plano Hobby,
região US East). O export estático do app vive no Cloudflare Pages. O DNS de
`petdots.com.br` vive no Cloudflare. O domínio segue no Registro.br.**

### Onde cada peça fica

| Peça | Onde | Endereço |
|---|---|---|
| `apps/landing` | Railway, serviço Node (`next start`) | `https://petdots.com.br` |
| `apps/api` | Railway, serviço Node | `https://api.petdots.com.br` |
| Postgres | Railway, template Postgres com volume, na mesma região | rede privada do projeto |
| `apps/app` (web) | Cloudflare Pages, projeto estático | `https://app.petdots.com.br` |
| DNS | Cloudflare (nameservers trocados no Registro.br) | — |
| Domínio | Registro.br, já registrado | — |

### O critério que decidiu: custo mínimo com zero operação de banco

| Eixo | **Railway** | Render | Fly.io |
|---|---|---|---|
| Custo do trio API + landing + Postgres | **~US$ 10-15/mês** — Hobby US$ 5 já inclui US$ 5 de uso; RAM US$ 10/GB-mês, vCPU US$ 20/mês, volume US$ 0,15/GB-mês, egress US$ 0,05/GB | ~US$ 20/mês — 2 × Starter (US$ 7, 0,5 CPU / 512 MB) + Basic-256mb (US$ 6) | Máquinas de US$ 2 a 6, mas o **Managed Postgres começa em US$ 38/mês** (Basic, 1 GB) |
| O free tier serve? | Não: US$ 1/mês de crédito. O **trial** dá US$ 5 uma vez, por 30 dias, sem cartão | Não: o web service free **dorme após 15 min** sem tráfego (webhook e SEO sofrem) e o Postgres free **expira em 30 dias** | Não há |
| Migrations no deploy | **Pre-deploy command**: roda entre build e deploy, com as variáveis do serviço; se falhar, *"the deployment will not proceed"*. Disponível no Hobby | Pre-deploy command idêntico em comportamento, mas **só em instância paga** | `release_command` |
| Backup do Postgres | Snapshot do volume: **diário (6 dias), semanal (27), mensal (89)**, incremental, cobrado ao preço do volume. **Sem PITR** | PITR de **3 dias** no Hobby | Incluído no gerenciado |
| Região | US East (Virgínia), US West, Amsterdã, Singapura. **Sem América do Sul** | Oregon, Ohio, Virgínia, Frankfurt, Singapura. **Sem América do Sul** | **São Paulo (`gru`)**, inclusive para o Managed Postgres |
| Quantos serviços você mantém | 3, no mesmo painel, um cartão, uma fatura | 3 | 3, mais a operação do banco se fugir do gerenciado |
| Monorepo npm workspaces | Suportado **sem root directory**: build e start filtrados por workspace, *watch paths* por app | Suportado | Um Dockerfile por app |
| Exige CNPJ? | Não | Não | Não |

**O que decidiu foi custo mais operação, não região.** O Render custa o dobro e
o preço dele está em movimento. O Fly.io é o único com São Paulo, mas o banco
gerenciado sozinho custa mais que toda a stack no Railway, e o Postgres não
gerenciado do Fly é, nas palavras da própria documentação, você operando banco
— exatamente o que um fundador solo que também está na rua não pode assumir.

**A latência que se aceita:** Rio de Janeiro a Virgínia, na casa de 120 ms de
ida e volta. Landing, API e banco ficam no mesmo datacenter, então cada página
paga esse custo **uma vez**. Para piloto de bairro é imperceptível.

**Backup sem PITR é aceitável agora** porque o volume do piloto é de dezenas de
pedidos e o **webhook do Asaas é a fonte de verdade do pagamento** (ADR-0019,
E4): um dia perdido se reconcilia. Se isso incomodar, o Render com PITR de 3
dias é a saída, a mais US$ 5 a 7 por mês.

**Por que Cloudflare, e não mais um serviço no Railway:** o Railway não tem
produto de site estático; servir o export do Expo lá seria um container a mais
para manter. O Cloudflare Pages é gratuito (500 builds/mês, 20.000 arquivos,
100 domínios por projeto), aceita **reescrita de URL com status 200 e
placeholder** via arquivo `_redirects` — o que resolve o achado #1 sem mexer no
app —, e o DNS dele faz o *CNAME flattening* que o domínio raiz apontando para
o Railway exige, e que o DNS do Registro.br não faz. Um provedor a mais, mas
sem custo e sem nada para operar.

### Custo mensal estimado

| Item | Estimativa |
|---|---|
| Railway Hobby (inclui US$ 5 de uso) | US$ 5 |
| API (~0,3 GB RAM, vCPU fracionária) | US$ 3-5 |
| Landing (~0,25 GB RAM) | US$ 2-3 |
| Postgres (~0,2 GB RAM + 1 GB de volume + backups) | US$ 2-3 |
| Cloudflare (DNS + Pages) | US$ 0 |
| Domínio `.com.br` (Registro.br) | R$ 40/ano, já pago |
| **Total** | **~US$ 10-15/mês**, abaixo do piso de R$ 100/mês que a Trilha C estimou para infra |

⚠️ São **estimativas** a partir das tarifas públicas de 13/09/2026, com o uso
real de um piloto de bairro. Cobrança em dólar, com IOF de cartão internacional.
A confirmação é a primeira fatura.

### O que esta decisão traz junto

| # | Decisão | Por quê |
|---|---|---|
| **E1** | **Um projeto no Railway com três serviços** — `api`, `landing`, `postgres` — na **mesma região (US East)**, deploy a partir do GitHub | Uma fatura, um painel, um cartão. Banco e API no mesmo datacenter é o que mantém a latência em uma viagem por página |
| **E2** | **O Postgres é o template do Railway** (que a documentação chama de *unmanaged*), com **backup diário e semanal** ligados no volume | É o que cabe no custo. **PITR não existe** e é aceito: o webhook do Asaas reconcilia pagamento, e o volume do piloto é pequeno. Gatilho para reavaliar: primeiro pagamento real, ou incidente que exija restaurar |
| **E3** | **`prisma migrate deploy` roda como pre-deploy command do serviço da API**, com a mesma `DATABASE_URL` do runtime. **Se falhar, o deploy não sobe** e a versão anterior continua no ar | É a resposta a "quem roda as migrations, e o que acontece se falharem" do `DEPLOYMENT` §Pipeline. ⚠️ O **seed nunca entra no deploy**: roda à mão, uma vez, pelo CLI do Railway, e **só quando `pilot.ts` tiver dados de campo** (item 3b) |
| **E4** | **A landing chama a API pela rede privada do Railway** — `PETDOTS_API_URL` aponta para o hostname interno do serviço da API, não para `api.petdots.com.br` | A Server Action já mantém a URL fora do navegador; a rede privada mantém a chamada fora da internet e fora do egress cobrado |
| **E5** | **O app web fica no Cloudflare Pages com um arquivo `_redirects` em `apps/app/public/`** reescrevendo cada rota dinâmica para o seu `[param].html` com status 200 — o Expo copia `public/` para o `dist`. Se a reescrita se mostrar frágil, a saída é `web.output: "single"` com uma regra catch-all | Resolve o achado #1 **sem tocar no código do app**. A escolha final entre as duas formas é da tarefa de publicação, medida com o export na mão |
| **E6** | **DNS no Cloudflare**: `petdots.com.br` (raiz) → landing; `api.` → API; `app.` → Pages. Certificados TLS automáticos nos dois provedores | O domínio raiz exige *CNAME flattening*, que o Registro.br não oferece. O Cloudflare também é onde o app web já vai morar |
| **E7** | **A produção acompanha `master`.** Publicar é promover `develop` → `master` ([ADR-0009](0009-duas-linhas-de-integracao-develop-e-master.md)) | Decisão do Victor em 13/09/2026. `master` é a linha que ele reconhece como aprovada por ele; torná-la o gatilho de deploy dá ao item 5 da intervenção manual um efeito concreto |
| **E8** | 🔴 **Nada é pago até a tarefa de publicação começar.** Nenhuma conta no Railway é criada antes disso; quando for, o **trial** (US$ 5 uma vez, 30 dias, sem cartão) cobre a montagem, e o **Hobby** só entra no dia em que a landing for para o ar. Cloudflare e Registro.br não custam nada a mais | Restrição declarada pelo Victor: *"não faz sentido pagar caro por algo que ainda não está em uso"*. O trial dura 30 dias, então a conta se cria **quando a publicação estiver a dias, não a semanas** |
| **E9** | **Publica-se sem seed, e a `/precos` sai do menu até o censo.** O banco sobe migrado e vazio; a lista de espera funciona; os dois links para `/precos` na home e a entrada fixa dela no `sitemap.xml` ficam escondidos até `pilot.ts` ter lojas reais. **Landing e API primeiro; o app web depois** | A trava 3b proíbe as oito lojas fictícias. Um comparador que responde "nenhum produto encontrado" a toda busca, para quem chegou por campanha paga, é pior que não ter o link. O smoke test da Trilha B mede **leads da lista de espera**, não o comparador. E publicar o app abre o cadastro para gente de fora, o que dispara "não existe recuperação de senha" na vigilância — por isso ele vem depois |
| **E10** | **O aviso de privacidade passa a declarar que os dados são armazenados em servidores nos Estados Unidos** (transferência internacional, art. 33 da LGPD), junto da revisão dos itens 4 e 12 | Achado #2. É o mínimo para a landing pública; se a revisão jurídica concluir que residência no Brasil é obrigatória, o gatilho de E11 dispara |
| **E11** | **A escolha é reavaliável, e os gatilhos são nomeados:** (a) o Railway abrir região no Brasil; (b) a revisão LGPD exigir residência dos dados; (c) a fatura passar de US$ 25 por dois meses seguidos; (d) incidente que exija restauração pontual | Nenhum se descobre em página de preço. Nos casos (b) e (d) a saída nomeada é o **Fly.io em `gru`** com Managed Postgres; no (c), rever o dimensionamento antes de trocar |

### Variáveis e segredos, por serviço

| Onde | Variável | Quem define |
|---|---|---|
| API | `DATABASE_URL` | Injetada pelo serviço Postgres do projeto, pela rede privada |
| API | `JWT_SECRET` | Victor gera (`openssl rand -base64 48`) e cola no painel — nunca em arquivo |
| API | `CORS_ORIGINS=https://app.petdots.com.br` | Painel. A landing **não** entra: chama pelo servidor |
| API | `NODE_ENV=production`, `PORT` | Painel |
| API | chave e segredo de webhook do Asaas | Painel, **quando existir** (`pd-17`) |
| API | `OTEL_EXPORTER_OTLP_ENDPOINT` e `OTEL_EXPORTER_OTLP_HEADERS` | Painel, quando o serviço de observabilidade for escolhido ([ADR-0006](0006-instrumentacao-opentelemetry.md) #8 — o gatilho "existir ambiente de deploy" dispara com esta tarefa) |
| Landing | `PETDOTS_API_URL` (hostname interno), `PETDOTS_SITE_URL=https://petdots.com.br` | Painel |
| App web | `EXPO_PUBLIC_API_URL=https://api.petdots.com.br` | Variável de **build** do Cloudflare Pages |

⚠️ **Gotcha para a tarefa de publicação:** `prisma` é `devDependency` da raiz.
O build do Railway precisa instalar as dev dependencies (não pode rodar com
`NODE_ENV=production` na fase de instalação), ou o pre-deploy command não
encontra o CLI.

### O que fica fora desta avaliação

- **Vercel para a landing** — o Hobby é *"for personal, non-commercial use"*; o
  Pro custa US$ 20/mês, o orçamento inteiro do Railway, para uma app só. E
  seria um segundo provedor pago.
- **EAS Hosting para o app web** — seria o caminho nativo do Expo, mas o plano
  Free **não permite domínio próprio**; o Starter custa US$ 19/mês.
- **Neon e Supabase** — pelo achado #3.
- **DigitalOcean App Platform, AWS e GCP em São Paulo, VPS com Coolify,
  hospedagens brasileiras** — não foram avaliados. Os dois primeiros trocam
  simplicidade por região; VPS é você operando tudo; hospedagem nacional de
  Node não tem a mecânica de pre-deploy nem o Postgres com backup pronto.
  Ampliar a lista adiaria a decisão sem baratear o resultado.
- **Serviço gerenciado de observabilidade** — continua sendo a decisão do
  ADR-0006 #8. O gatilho dela ("existir ambiente de deploy") **dispara com
  esta**, e se resolve na tarefa de publicação, não aqui.
- **iOS e Android via EAS** — fora do piloto, como o briefing pediu.

## Alternativas consideradas

- **Render (2 × Starter + Basic-256mb)** — preterido pelo custo (~US$ 20/mês,
  o dobro) e pela instabilidade recente de preço. Ganha em **PITR de 3 dias**, e
  é a saída nomeada se backup pontual passar a importar.
- **Fly.io em São Paulo com Managed Postgres** — preterido pelo custo do banco
  (US$ 38/mês). É o único com residência no Brasil, e fica registrado como a
  saída dos gatilhos (b) e (d) de E11.
- **Fly.io em São Paulo com Postgres não gerenciado** — descartado: é operar
  banco, na mesma pessoa que faz censo, KYC e curadoria.
- **Vercel (landing) + Railway (API + Postgres)** — descartado: um provedor pago
  a mais, e a landing chamaria a API pela internet em vez da rede privada.
- **Railway para tudo, inclusive o app web num container** — descartado: um
  serviço a mais para manter, para servir arquivos que o Cloudflare serve de
  graça.
- **Adiar a escolha até saber quando publicar** — descartada pelo Victor. A due
  diligence não depende da data, e fechá-la agora permite escrever a tarefa de
  publicação antes de a conta existir. O que se adia é **pagar** (E8), não
  decidir.

## Consequências

**Positivas**

- O último critério aberto do `DEPLOYMENT` tem dono, e a tarefa de publicação
  pode ser planejada sem conta criada.
- Custo mensal abaixo do piso que a Trilha C estimou para infra, com **zero
  operação de banco**.
- Migrations com falha fechada: deploy que não migra não sobe.
- Duas armadilhas que só apareceriam no primeiro deploy (o `[param].html` do
  Expo e a transferência internacional) estão nomeadas antes dele.
- O gatilho de deploy coincide com a linha que o Victor já aprova à mão.

**Negativas, aceitas**

- **Sem PITR.** Restauração é por snapshot diário ou semanal.
- **Dados nos Estados Unidos**, com a obrigação de declarar (E10) e o risco de a
  revisão jurídica pedir residência.
- **Cobrança em dólar, com IOF**, e uma fatura que varia com o câmbio.
- **O Postgres é template, não serviço**: upgrade de versão maior é nosso.
- **Um provedor a mais** (Cloudflare), ainda que gratuito e sem operação.
- **Dois preços vieram de terceiros** (Render, Registro.br) e se confirmam na
  contratação.
- **A comparação vale para 13/09/2026.** Tarifas e planos mudam.

## Páginas consultadas (13/09/2026)

Railway: [pricing](https://railway.com/pricing),
[plans](https://docs.railway.com/reference/pricing/plans),
[free trial](https://docs.railway.com/reference/pricing/free-trial),
[regions](https://docs.railway.com/reference/regions),
[pre-deploy command](https://docs.railway.com/deployments/pre-deploy-command),
[backups](https://docs.railway.com/reference/backups),
[PostgreSQL](https://docs.railway.com/guides/postgresql),
[monorepo](https://docs.railway.com/guides/monorepo).
Render: [free](https://render.com/docs/free),
[deploys](https://render.com/docs/deploys#deploy-steps),
[Postgres backups](https://render.com/docs/postgresql-backups),
[regions](https://render.com/docs/regions),
[compute plans](https://render.com/docs/compute-plans);
preços via terceiro: [bex.co, 04/09/2026](https://bex.co/blog/2026/09/04/render-price-changes-cost-sheet).
Fly.io: [pricing](https://fly.io/docs/about/pricing/),
[Managed Postgres](https://fly.io/docs/mpg/overview/),
[regions](https://fly.io/docs/reference/regions/).
Neon: [pricing](https://neon.com/pricing),
[regions](https://neon.com/docs/introduction/regions).
[Supabase pricing](https://supabase.com/pricing).
[Vercel pricing](https://vercel.com/pricing).
Expo: [EAS pricing](https://expo.dev/pricing),
[EAS Hosting](https://docs.expo.dev/eas/hosting/introduction/),
[static rendering](https://docs.expo.dev/router/reference/static-rendering/),
[publishing websites](https://docs.expo.dev/guides/publishing-websites/).
Cloudflare Pages: [limits](https://developers.cloudflare.com/pages/platform/limits/),
[redirects](https://developers.cloudflare.com/pages/configuration/redirects/).
ANPD: [Resolução CD/ANPD nº 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024).
Registro.br via terceiros: [Linkfl](https://blog.linkfl.com.br/quanto-custa-um-dominio/).

## Status

`accepted` — 13/09/2026. Decisão do **Victor**, sobre recomendação e due
diligence da IA, com a restrição de custo mínimo declarada por ele. Nenhuma
conta criada, nenhuma linha de código: a publicação é tarefa própria, e E8 diz
quando ela começa a custar.
