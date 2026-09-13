---
title: Development Guide
status: stable
version: 2.9
updated: 2026-09-13
scope: >
  Como desenvolver no repositório PetDots: pré-requisitos, estrutura do monorepo,
  configuração do ambiente local, comandos e fluxo de trabalho local. Responde
  "como rodar e evoluir o código nesta máquina". Não descreve o fluxo do agente
  de IA (05-ai/AI_DEVELOPMENT_GUIDE), o inventário de stack (TECHNOLOGY_STACK),
  os padrões de código (CODING_STANDARDS) nem o fluxo Git (GIT_WORKFLOW).
relates_to:
  - 02-architecture/TECHNOLOGY_STACK.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 03-engineering/CODING_STANDARDS.md
  - 03-engineering/GIT_WORKFLOW.md
  - 03-engineering/TESTING_STRATEGY.md
  - 05-ai/AI_DEVELOPMENT_GUIDE.md
  - 06-decisions/ADR/0005-bootstrap-monorepo.md
type: engineering
---

# PetDots — Development Guide

> **v2.0 (2026-09-07).** Reescrito no bootstrap do monorepo (`pd-01`): a v1.0
> descrevia a forma **prevista**, com `<gerenciador>` como placeholder e a árvore
> do produto "Vida do Pet". Agora descreve o repositório **real**. As decisões
> por trás dos comandos e versões estão no
> [ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md).

---

## Objetivo

Este guia descreve **como desenvolver no repositório PetDots**: o que instalar, a
forma do monorepo, como subir o ambiente local e o ciclo de trabalho diário.

**Não cobre** (aponta para o irmão, evitando sobreposição):

- A **forma de trabalho do agente de IA** (ler contexto, propor, validar) →
  [`AI_DEVELOPMENT_GUIDE`](../05-ai/AI_DEVELOPMENT_GUIDE.md).
- O **inventário de tecnologias** e versões → [`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md).
- Os **padrões de código** (estilo, estrutura de módulo) → [`CODING_STANDARDS`](./CODING_STANDARDS.md).
- O **fluxo de branches/commits/PR** → [`GIT_WORKFLOW`](./GIT_WORKFLOW.md).
- A **estratégia de testes** → [`TESTING_STRATEGY`](./TESTING_STRATEGY.md).

---

## Pré-requisitos

| Ferramenta | Versão | Papel |
|------------|--------|-------|
| **Node.js** | **24 LTS** (`.nvmrc`; `engines.node: >=24`) | Runtime de backend e tooling |
| **npm** | **11+** (workspaces; `packageManager` fixa `npm@11.16.0`) | Gerenciador do monorepo |
| **Docker** | Desktop ativo | PostgreSQL local **e** o Postgres efêmero dos testes (Testcontainers) |
| **Git** | 2.4x | Convenções em [`GIT_WORKFLOW`](./GIT_WORKFLOW.md) |

> **Expo CLI** já é exercido por `apps/app` (via `npx expo`, sem instalação
> global). O **EAS CLI** só entra quando houver build nativo para distribuir.

A stack completa e o porquê de cada escolha vivem no
[ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md), no
[ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md) e no
`TECHNOLOGY_STACK` — não os repetimos aqui.

---

## Estrutura do monorepo

Layout derivado do [`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md)
v2.0. O que **existe hoje**:

```text
petdots/
├── apps/
│   ├── api/              # NestJS 12 (ESM) — Modular Monolith
│   │   ├── src/
│   │   │   ├── common/   # HttpExceptionFilter (ERROR_MODEL)
│   │   │   ├── config/   # validação Zod do ambiente
│   │   │   ├── health/   # GET /api/v1/health
│   │   │   ├── audit/    # audit_log — módulo de suporte, sem agregado
│   │   │   ├── modules/  # um diretório por agregado
│   │   │   │   ├── catalog/    # controller / application / domain / infra
│   │   │   │   ├── identity/   # auth + os guards globais (APP_GUARD)
│   │   │   │   ├── offers/     # comparador e vitrine da loja
│   │   │   │   ├── orders/     # cotação, pedido, máquina de estados e o job
│   │   │   │   ├── payments/   # mínimo: só refunds, sem controller (pd-17 traz o PSP)
│   │   │   │   ├── postal-codes/
│   │   │   │   ├── stores/     # lojas, áreas de entrega e agenda semanal
│   │   │   │   ├── tutors/     # perfil do tutor, endereço padrão e pets
│   │   │   │   └── waitlist/
│   │   │   ├── otel/     # SDK de observabilidade
│   │   │   ├── prisma/   # PrismaService (global) + PersistenceContext
│   │   │   ├── seed/     # catálogo e piloto versionados (npm run db:seed)
│   │   │   └── openapi.ts
│   │   └── test/         # e2e (Testcontainers) + contrato OpenAPI + support/
│   ├── app/              # Expo 57 + React Native Web — cliente universal
│   │   └── src/
│   │       ├── api/      # cliente HTTP, renovação de token, chamadas por módulo
│   │       ├── cart/     # o carrinho — só no cliente (ADR-0017)
│   │       ├── session/  # máquina de estado + armazenamento por plataforma
│   │       ├── onboarding/ # a ordem dos passos do cadastro (lógica pura)
│   │       ├── screens/  # as doze telas
│   │       ├── ui/       # primitivas e AppShell (promovidos do spike na pd-13)
│   │       └── app/      # rotas do Expo Router — (private)/ é o grupo fechado
│   │                     # cadastro, carrinho, conta/, conta/endereco,
│   │                     # conta/pets/*, (private)/pedidos/*
│   └── landing/          # Next.js 16 — landing pública
│       └── src/
│           ├── app/      # / , /precos , /precos/[productSlug] , sitemap , robots
│           ├── content/  # constantes de copy (bairros, privacidade)
│           └── lib/      # chamadas à API (server-only) e formatação
├── packages/
│   ├── config/           # tsconfig, eslint e prettier compartilhados
│   ├── domain/           # regras puras — sem framework, sem I/O
│   └── contracts/        # schemas Zod + openapi.json publicado
├── prisma/
│   ├── schema.prisma
│   └── migrations/       # pd-09: waitlist_entries; pd-11: catálogo/lojas/ofertas;
│                         # pd-12: users + refresh_tokens (a pd-13 não criou nenhuma);
│                         # pd-14: tutors + pets; pd-15: orders, order_items,
│                         # refunds, commission_rates, store_commission_rates,
│                         # audit_log + stores.opening_hours
├── docs/                 # documentação — fonte-da-verdade
└── scripts/              # utilitários do repo (check-frontmatter.sh)
```

O que **ainda não existe**: `packages/ui`. ⚠️ **Correção da v2.6:** até aqui
este parágrafo dizia que ele nasceria "quando houver componente de fato
compartilhado entre telas". O gatilho estava errado, e o próprio código provava:
as primitivas em `apps/app/src/ui/` **já** são compartilhadas entre as cinco
telas, e continuam onde estão.

O gatilho certo é **um segundo workspace React Native consumidor**. Enquanto
houver um só, um pacote com um consumidor é cerimônia (`AGENTS.md`). E note que
`apps/app` (React Native Web) e `apps/landing` (DOM) são **árvores de
renderização diferentes**: não compartilham componente de UI, por desenho — a
landing nunca será esse segundo consumidor (ADR-0012).

Regras estruturais (de [`ARCHITECTURAL_PRINCIPLES`](../02-architecture/ARCHITECTURAL_PRINCIPLES.md)):

- **`packages/domain` e `packages/contracts` não dependem de UI nem de framework**
  (P9 — preserva o fallback do spike-gate; P1 — domínio no centro).
- `apps/*` dependem de `packages/*`, **nunca o contrário**.
- Cada **módulo da API** corresponde a um agregado-raiz; um módulo só acessa as
  próprias tabelas (P2).
- A camada interna de um módulo segue `controller → application → domain → infra`
  (ver `SYSTEM_ARCHITECTURE` e [`CODING_STANDARDS`](./CODING_STANDARDS.md)).

> **Pacotes são consumidos compilados.** Cada `packages/*` publica `dist/` via
> `main`/`types`; o Turborepo garante que eles sejam construídos antes de
> `apps/api` (`dependsOn: ["^build"]`). Importar `.ts` de outro workspace não
> funciona — o Nest compila com o `rootDir` do próprio app.

---

## Configuração do ambiente local

```bash
nvm use                 # Node 24 (ou instale-o)
npm ci                  # instalação única, na raiz
cp .env.example .env    # ajuste se necessário
npm run db:up           # Postgres 16 em localhost:5437
npm run prisma:generate # gera o Prisma Client
npm run build
npm run db:seed         # catálogo e lojas do piloto (exige o build acima)
```

**Variáveis de ambiente** (nomes em `UPPER_SNAKE_CASE` —
[`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md)): o
`.env.example` traz as que existem hoje — `DATABASE_URL`, `PORT`, `NODE_ENV`,
`LOG_LEVEL`, `CORS_ORIGINS`, o bloco OTel comentado, desde a `pd-09`
`PETDOTS_API_URL` (**opcional**, lida pelo **servidor** da landing; o default
`http://localhost:3001` basta em desenvolvimento) e, desde a `pd-11`,
`PETDOTS_SITE_URL` (**opcional**, o endereço público da landing — usada no
`sitemap.xml`, no `robots.txt` e na canonical das páginas de produto; default
`http://localhost:3002`). Desde a `pd-12` entram três da autenticação —
`JWT_SECRET`, `JWT_EXPIRATION_TIME` e `REFRESH_TOKEN_EXPIRATION_DAYS`. As chaves
de OAuth e PSP entram junto com os módulos correspondentes, não antes. A API
**valida o ambiente com Zod no boot** e falha imediatamente se algo faltar.
Segredos **nunca** são commitados (ver [`SECURITY`](./SECURITY.md)) — e o
repositório é **público**.

> 🔴 **`JWT_SECRET` é obrigatória e não tem default.** Quem atualizar o
> repositório e não acrescentar a variável ao `.env` **não sobe a API** — ela
> falha no boot, nomeando a variável e sem ecoar valor. É deliberado: segredo
> com default é segredo que vai para produção (ADR-0011). Gere a sua com
> `openssl rand -base64 48` e cole no `.env`; o valor do `.env.example` é
> claramente de exemplo e não serve.

> **A porta é 5437, não 5432.** O compose tem project name `petdots-mvp` e é
> deliberadamente distinto do compose do protótipo legado (`petdots`, porta
> 5436), para que um `docker compose down` aqui nunca derrube aquele
> (ADR-0005).

**Migrations:** `npm run prisma:migrate` aplica as migrations pendentes no banco
local (e cria uma nova quando o `schema.prisma` mudou). O schema **tem models**
desde a `pd-09` — eles derivam do
[`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md), e o primeiro é
`WaitlistEntry`; a `pd-11` acrescentou `Product`, `Store`, `DeliveryArea` e
`Offer`, a `pd-12` acrescentou `User` e `RefreshToken`, e a `pd-14`
acrescentou `Tutor` e `Pet`, e a `pd-15` acrescentou `Order`, `OrderItem`,
`Refund`, `CommissionRate`, `StoreCommissionRate` e `AuditLog`, e a `pd-16`
acrescentou `StoreMember` — são **seis migrations**. Ao trazer uma branch que mexeu no schema, rode
`npm run prisma:migrate` e `npm run prisma:generate` antes de subir a API.

**Seed:** `npm run db:seed` popula o catálogo, as lojas do piloto, as ofertas,
a **tabela de comissão** e a **agenda semanal** de cada loja (`pd-15`) e — desde
a `pd-16` — os **dois vínculos de loja** dos usuários de desenvolvimento, a
partir de `apps/api/src/seed/data/*.ts`. É **idempotente** — rodar duas
vezes não duplica nada — e **valida tudo antes de escrever**, então um arquivo
de dados inválido aborta o run inteiro sem deixar estado parcial.

🔴 **Depois da `pd-15` o seed deixou de ser opcional para quem vai testar
pedido.** Sem ele não há taxa de comissão vigente (e o pedido não é
precificado), não há agenda (e a loja nunca está aberta) e as lojas continuam
`PROSPECT` (e nenhuma recebe pedido).

### Como fazer um pedido em desenvolvimento

1. `npm run prisma:migrate && npm run build && npm run db:seed`;
2. entre como `tutor@dev.petdots.local` (senha em `seed/data/dev-users.ts`) e
   **salve o perfil** em `/conta/endereco` — sem telefone e endereço o checkout
   responde `TUTOR_PROFILE_REQUIRED`;
3. comparador → uma loja que entrega no seu bairro → **"Adicionar"** →
   **"Ver carrinho"** → **"Fazer pedido"**.

⚠️ **Três coisas que parecem defeito e não são:**

- **todas as 8 lojas do seed estão `ACTIVE`** e com agenda fictícia (seg–sáb
  08:00–19:00; duas fecham para almoço; uma abre domingo de manhã). Sem isso
  nenhum pedido poderia ser criado;
- **fora do horário o botão fica desabilitado** e a cotação diz quando a loja
  abre — é a regra do ADR-0014, não um bug;
- ⏳ **um pedido que ninguém aceitar acaba `REJECTED` em ~15 minutos úteis** —
  agora só quando ninguém aceita. ✅ **Desde a `pd-16` a loja tem como aceitar**
  (entre como `lojista@dev` → "Painel da loja" → **"Aceitar"**), e um pedido
  aceito nunca mais é varrido. Para congelar o prazo enquanto você testa outra
  coisa, suba a API com `ORDER_EXPIRY_SWEEP_INTERVAL_MS=0` — ⚠️ mas
  **remova-o** quando for testar o painel, porque a auto-recusa é justamente o
  que o roteiro quer ver **não** acontecer.

**Duas variáveis novas, ambas opcionais** (o `.env` não precisa mudar):
`ACCEPTANCE_WINDOW_MINUTES` (default 15) e `ORDER_EXPIRY_SWEEP_INTERVAL_MS`
(default 60000; `0` desliga a varredura).

> ⚠️ **O seed roda compilado:** `npm run build` **antes**, sempre. O comando
> executa `apps/api/dist/seed/seed.js`, como tudo em `apps/api`.
>
> ⚠️ **As lojas do seed são fictícias** (`PLACEHOLDER` no topo de
> `apps/api/src/seed/data/pilot.ts`) e não podem ir a deploy público.
>
> É a ingestão **interina** do catálogo, até existir console de administração
> ([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md)).

---

## Como logar em desenvolvimento

Desde a `pd-12` existe autenticação de verdade. **Não há bypass** — nem
`AUTH_DISABLED`, nem header de usuário falso, nem guard que devolve `true` em
desenvolvimento. Isso é deliberado: caminho de código que não existe em produção
é onde a falha de segurança mora (ADR-0011). O que existe são **quatro contas
semeadas**, que passam pelo login real.

O `npm run db:seed` cria as quatro e relata `… , 4 users, 2 store members` no
fim:

| E-mail | Papéis | Vínculo de loja | Para quê |
|---|---|---|---|
| `tutor@dev.petdots.local` | `TUTOR` | — | o lado do consumidor |
| `lojista@dev.petdots.local` | `STORE_MEMBER`, `TUTOR` | **`OWNER`** da primeira loja do piloto | o lado da loja — **dois papéis de propósito**, porque é o caso que quebra um `RolesGuard` mal escrito |
| `operador@dev.petdots.local` | `STORE_MEMBER` | **`OPERATOR`** da **mesma** loja | 🔴 o outro lado do ADR-0013: aceita e recusa pedido, e **não** vê Horários nem edita preço |
| `admin@dev.petdots.local` | `ADMIN` | — | operação da plataforma. ⚠️ `ADMIN` **não** atravessa o `StoreScopeGuard` (ADR-0018 A13) |

Senha das quatro: **`petdots-dev-2026`**.

⚠️ **A mesma loja para `lojista@` e `operador@` é deliberada**: a separação de
papéis só é percorrível à mão quando as duas contas olham para uma fila só.

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"lojista@dev.petdots.local","password":"petdots-dev-2026"}'
```

A resposta traz `accessToken` (JWT de 15 minutos), `refreshToken` (30 dias) e o
usuário. Use o access token em `Authorization: Bearer <accessToken>`; quando ele
expirar, `POST /api/v1/auth/refresh` com o refresh token devolve um par novo —
**e invalida o refresh anterior**, então guarde sempre o mais recente.

> 🔴 **O seed se recusa a criar essas contas com `NODE_ENV=production`** — não é
> erro, ele avisa no log e segue semeando o catálogo. Essa recusa é a única
> razão pela qual uma senha conhecida pode viver num arquivo versionado de um
> repositório público. Se ela cair, a senha vira credencial real exposta.

> ⏳ **Não existe "esqueci a senha".** Se você mudar a senha de uma dessas
> contas pela API e esquecê-la, o caminho de volta é rodar o seed de novo — ele
> reescreve o hash a partir do arquivo (ADR-0011, A4/R1).

### Ligar uma conta qualquer a uma loja

Desde a `pd-16` existe o comando de onboarding de loja. Não há tela de convite
(ADR-0013 B5), e a pessoa precisa **já ter conta**:

```bash
npm run build
npm run store:add-member -- --store petshop-amigo-fiel \
  --email alguem@exemplo.com --role OWNER
```

Ele resolve a loja pelo `slug` e a pessoa pelo e-mail, cria o vínculo e
**acrescenta `STORE_MEMBER` a `users.roles`** se faltar — sem essa segunda
metade o `RolesGuard` barraria a pessoa antes do `StoreScopeGuard`. Rodar de
novo com outro `--role` troca o papel, nunca duplica.

🔴 **Depois do vínculo, relogar.** O access token na mão da pessoa precede o
papel novo; `POST /auth/refresh` relê os papéis do banco, então ele chega
sozinho em até 15 minutos — mas um login novo é instantâneo. O script imprime
esse aviso.

⚠️ **Este comando NÃO se recusa a rodar em produção**, ao contrário do seed de
usuários: é o procedimento de onboarding de loja real. O que é DEV-ONLY são as
contas `.local`.

### Como criar conta pela interface

Desde a `pd-14` não é mais preciso `curl` para ter uma conta:

```bash
npm run dev -w @petdots/api     # 3001
npm run dev -w @petdots/app     # 8081
# http://localhost:8081 → "Criar conta"
```

A tela pede **e-mail e senha e nada mais** — é o que o cadastro cria
(ADR-0011, A10). Em seguida o onboarding leva ao endereço e ao primeiro pet,
sempre com "Fazer depois" à mão. As contas semeadas continuam valendo, e
`lojista@dev` também tem papel `TUTOR`, então enxerga o perfil; `admin@dev`
não tem, e recebe `403` em `/tutors/*`.

> ⚠️ **Sessões guardadas antes da `pd-14` são descartadas uma vez.** O `user`
> da sessão passou a ter `phone`, e o app parseia com Zod ao carregar — uma
> sessão que não bate com o schema é descartada, nunca convertida (ADR-0012).
> Sintoma: você abre o app atualizado e está deslogado. Entre de novo; acontece
> **uma vez**.

> **Os guards são globais desde a `pd-13`** (`APP_GUARD` no `IdentityModule`):
> toda rota da API nasce **fechada**, e as abertas se declaram com `@Public()`.
> Na prática isso significa que **um controller novo responde `401` até ser
> marcado** — comportamento desejado, e a suíte `public-routes.e2e-spec.ts` é o
> que avisa quando o esquecimento foi no sentido errado.
>
> As rotas da landing (`/`, `/precos`, `/precos/[slug]`) continuam públicas por
> desenho (ADR-0010). No `apps/app`, só `/conta` exige login.

---

## Fluxo de trabalho local

O ciclo diário, alinhado ao **loop AI-first gerar → ler → corrigir**:

1. Sincronizar a branch e criar a branch de trabalho (`GIT_WORKFLOW`).
2. Entender o domínio afetado no `DOMAIN_MODEL` / `GLOSSARY` antes de codar.
3. Definir o contrato (Zod em `packages/contracts` → OpenAPI) **antes** do
   handler (P3 / [`API_GUIDELINES`](../04-api/API_GUIDELINES.md)).
4. Implementar seguindo [`CODING_STANDARDS`](./CODING_STANDARDS.md).
5. Rodar testes e lint localmente (ver `TESTING_STRATEGY`).
6. Commit + PR (ver `GIT_WORKFLOW`); atualizar a documentação afetada.

### Comandos

| Intenção | Comando |
|----------|---------|
| Instalar dependências | `npm ci` (na raiz) |
| Subir a API em dev (watch) | `npm run dev -w @petdots/api` (porta 3001) |
| Subir a landing em dev | `npm run dev -w @petdots/landing` (porta 3002 — `/`, `/precos`) |
| Subir o cliente universal | `npm run dev -w @petdots/app` (Expo, porta 8081) |

> 🔴 **Por que o `dev` do `apps/app` passa por `scripts/dev.mjs`** (`pd-15`,
> 13/09/2026). Com um `"dev": "expo start"` direto, o `npm run` monta no Windows
> a cadeia `npm → cmd.exe /d /s /c → node (@expo/cli)`, e **o Ctrl+C não mata o
> Metro**: o Windows não tem sinal POSIX, o `CTRL_C_EVENT` vai para o grupo do
> console, e o `cmd.exe` que o npm insere engole o evento e morre sem repassar
> ao próprio neto. O Expo fica órfão segurando a 8081, com o watcher do Metro
> mantendo o event loop vivo — um servidor que não responde e impede o próximo
> `expo start`. **Medido em 13/09/2026**, com o processo órfão na mão.
>
> O wrapper resolve em dois movimentos: **spawna `@expo/cli` sem shell**, como
> filho direto (o Ctrl+C do console chega nele, como chegaria no Linux), e
> **derruba a árvore** com `taskkill /T` se o Metro não sair em 3 segundos.
> Mesma forma de `apps/api/scripts/dev.mjs` e `scripts/jest.mjs`.
>
> ⚠️ **Se ainda assim sobrar algo na porta:** `npx kill-port 8081`.
| Build de tudo, na ordem certa | `npm run build` |
| Lint | `npm run lint` |
| Checagem de tipos | `npm run typecheck` |
| Testes (unidade + integração) | `npm test` — inclui a suíte do `apps/app` (`jest-expo`) |
| Teste de contrato OpenAPI | `npm run test:contract` |
| **Regenerar** o OpenAPI publicado | `npm run contract:write` |
| Formatar o código | `npm run format` |
| Subir / derrubar o Postgres local | `npm run db:up` / `npm run db:down` |
| Gerar o Prisma Client | `npm run prisma:generate` |
| Migrations do banco | `npm run prisma:migrate` |
| Popular catálogo e piloto | `npm run db:seed` (**exige `npm run build` antes**) |
| Ligar uma conta a uma loja | `npm run store:add-member -- --store <slug> --email <e-mail> --role OWNER|OPERATOR` |
| Validar frontmatter de docs | `bash scripts/check-frontmatter.sh <arquivo.md>` |

Endereços locais: a API em `http://localhost:3001` (health em
`/api/v1/health`, documentação navegável em `/api/docs`), a **landing em
`http://localhost:3002`** e o **app em `http://localhost:8081`**. A landing
chama a API **pelo servidor**; o app a chama **pelo navegador**, e por isso só
ele depende de `CORS_ORIGINS`. Para testar qualquer um deles de ponta a ponta,
os dois processos precisam estar de pé.

> ⚠️ `npm test` do `apps/app` roda **depois do `build`**, porque o Turborepo
> encadeia as duas tarefas — o `expo export` do app acontece antes (e fica em
> cache). A suíte em si testa só lógica pura: máquina de sessão, renovação de
> token e armazenamento, sem biblioteca de renderização (ADR-0012, A11).

> **Mudou um schema Zod?** O teste de contrato vai falhar até que você regenere
> o snapshot com `npm run contract:write` e o commite. Isso é proposital: uma
> mudança de contrato é deliberada e visível no diff (`TESTING_STRATEGY`).

---

> **O spike-gate do cliente universal está concluído.** Ele foi executado na
> `pd-08` e **aprovado em 11/09/2026** — a camada de cliente é Expo + React
> Native Web, sem condicional e sem fallback. A medição, os critérios e as
> consequências estão no
> [ADR-0008](../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md).

---

## Critérios

Este documento é considerado pronto quando:

- [x] Lista os pré-requisitos e remete a stack ao `TECHNOLOGY_STACK`/ADR-0002.
- [x] Apresenta a estrutura do monorepo derivada do ADR-0002 (packages isolados da UI).
- [x] Descreve a configuração local e o ciclo de trabalho sem duplicar `CODING_STANDARDS`/`GIT_WORKFLOW`/`TESTING_STRATEGY`.
- [x] Remete a forma de trabalho do agente ao `AI_DEVELOPMENT_GUIDE`.
- [x] Scripts e versões exatas preenchidos no bootstrap do repositório.
