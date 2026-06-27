# PetDots — Arquitetura

> Este documento é o índice vivo da arquitetura do projeto. Toda decisão relevante de
> arquitetura, módulo novo ou mudança estrutural deve ser refletida aqui.

## Visão geral

PetDots é um marketplace de petshops (estilo Mercado Livre/Amazon, porém com **entrega
no mesmo dia**, estilo delivery de comida). Cada lojista cria e administra sua loja
virtual (estoque, preços, promoções, fotos), clientes compram e acompanham a entrega em
tempo real, e administradores internos gerenciam a plataforma.

### Públicos / frontends

| App | Stack | Observações |
| --- | --- | --- |
| `apps/web` | Next.js (React) | Cliente final (desktop) e painel do lojista |
| `apps/mobile` | Expo (React Native) | Cliente final (mobile) |
| `apps/api` | NestJS | API única consumida por todos os clientes |

Todos os frontends consomem a **mesma API** (`apps/api`). Não há duplicação de regra de
negócio entre cliente/lojista/admin — apenas permissões diferentes (RBAC).

## Monorepo

- Gerenciador: **npm workspaces** + **Turborepo**
- Estrutura:
  ```
  apps/
    api/      -> NestJS + Prisma
    web/      -> Next.js
    mobile/   -> Expo / React Native
  packages/
    shared/   -> tipos, DTOs e client de API compartilhados (web + mobile)
  ```

### `packages/shared`

- Pacote `@petdots/shared`, consumido como **fonte TypeScript** (sem build step —
  `main`/`types`/`exports` apontam para `src/index.ts`)
- `src/types/enums.ts` — espelha os enums do Prisma (`UserRole`, `StoreDeliveryMode`,
  `StoreStatus`, `DiscountType`, `OrderStatus`, `DeliveryProviderType`,
  `DeliveryStatus`, `CatalogProductStatus`) como `const object` + tipo, sem depender
  de `@prisma/client`
- `src/types/entities.ts` — interfaces de entidades (`AuthUser`, `Store`, `Category`,
  `Brand`, `CatalogProduct`, `CatalogProductImage`, `StoreProduct`, `Promotion`,
  `Address`, `Order`, `OrderItem`, `Delivery`, `ProductReview`, `StoreReview`,
  `PriceAlert`, etc.)
- `src/types/dto.ts` — inputs/outputs dos endpoints (register/login, create/update de
  store, category, brand, catalog product, store product, promotion, address, order,
  query de produtos/pedidos, `CreateReviewInput`/`ReplyReviewInput`,
  `UpsertPriceAlertInput`, `QueryCatalogInput`, `UpdateCatalogProductStatusInput`).
  Os tipos `CreateProductInput`/`UpdateProductInput`/`QueryProductsInput` foram mantidos
  como `@deprecated` — use `CreateStoreProductInput`/`UpdateStoreProductInput`/
  `QueryStoreProductsInput`.
- `src/api-client.ts` — classe `ApiClient` com métodos para auth (incluindo Google
  OAuth), stores, categories, brands, catalog products (admin), store products,
  promotions, addresses, orders, reviews (produto/loja) e price alerts; trata renovação
  automática de access token via refresh token em respostas `401` (`tryRefresh`)
- `TokenStorage` — interface (`getAccessToken`, `getRefreshToken`, `setTokens`,
  `clearTokens`) implementada separadamente por cada frontend:
  - `apps/web` → `localStorage` (`apps/web/lib/api-client.ts`)
  - `apps/mobile` → `@react-native-async-storage/async-storage`
    (`apps/mobile/src/lib/api-client.ts`)

### Integração com Next.js (`apps/web`)

- `next.config.ts` declara `transpilePackages: ["@petdots/shared"]` para o Next
  conseguir transpilar o pacote TS do workspace
- `NEXT_PUBLIC_API_URL` em `.env.local` define a base URL da API

### Identidade visual e telas (`apps/web`)

- **Cores** definidas em `app/globals.css` via tokens Tailwind v4 (`@theme inline`):
  `primary-50..900` (laranja, base `#FF6B00`), `ink`/`ink-muted` (preto/cinza para
  texto), `surface`/`surface-muted`/`border` (branco e variações neutras)
- `components/header.tsx` — cabeçalho fixo com logo, links de autenticação e, para
  `STORE_OWNER`, link para "Minha loja"
- `lib/auth-context.tsx` — `AuthProvider`/`useAuth()`: estado de sessão no client,
  persiste o `AuthUser` em `localStorage` (`petdots.user`) além dos tokens (já
  tratados pelo `ApiClient`/`TokenStorage`). No carregamento, o cache local é usado
  apenas como valor inicial (evita flash sem usuário); em seguida a sessão é
  revalidada via `GET /auth/me` — em caso de sucesso o cache é atualizado com o
  perfil atual (papel, status etc.), em caso de falha (401/usuário inativo) a
  sessão local é limpa
- `app/login/page.tsx` — formulário de login (email/senha + botão "Entrar com
  Google" que redireciona para `GET /auth/google`)
- `app/auth/callback/` — página de callback OAuth: lê os tokens da URL (query string)
  após o redirect do backend e persiste a sessão via `AuthContext`
- `app/register/page.tsx` — cadastro com escolha de perfil (`CUSTOMER` "Quero
  comprar" ou `STORE_OWNER` "Tenho um petshop"); `STORE_OWNER` é redirecionado para
  `/stores/new` após o cadastro
- `app/stores/new/page.tsx` — formulário de criação de loja (`POST /stores`),
  acessível apenas para `STORE_OWNER` autenticado; loja criada entra como
  `PENDING_APPROVAL` até aprovação de um admin
- `app/page.tsx` — home redesenhada (hero + grid de lojas ativas, cada card linka
  para `/stores/[id]`)
- `app/stores/page.tsx` — listagem de lojas com suporte a todos os filtros do
  dropdown "Encontrar Lojas": `?filter=nearby` (geolocalização via
  `navigator.geolocation`, com fallback sem permissão), `?filter=rating`,
  `?filter=fast` (Entrega Rápida), `?filter=newest`. Cards exibem badge "⚡ ~X min" quando
  `deliveryTimeMinutes` está preenchido e "📍 X km" quando coordenadas disponíveis

### Fluxo de compra (`apps/web`)

- `lib/pricing.ts` — `getEffectiveUnitPrice`/`hasActiveDiscount`/`formatCurrency`;
  espelha no client o cálculo de melhor promoção ativa feito por
  `OrdersService.bestDiscountPerUnit` (apenas para exibição — o valor cobrado é
  sempre recalculado pela API no `POST /orders`)
- `lib/cart-context.tsx` — `CartProvider`/`useCart()`: carrinho **de uma loja por
  vez**, persistido em `localStorage` (`petdots.cart`). Ao adicionar um produto de
  uma loja diferente da que já está no carrinho, confirma com o usuário
  (`window.confirm`) antes de substituir o carrinho atual
- `lib/order-status.ts` — labels/estilos em pt-BR para `OrderStatus` e
  `isOrderCancellable` (espelha os status de onde `OrdersService.cancel` permite
  `CANCELLED`: `PENDING`/`CONFIRMED`/`PREPARING`)
- `app/stores/[id]/page.tsx` — catálogo da loja: dados da loja + grid de produtos
  (`GET /products?storeId=`), com preço promocional calculado via `lib/pricing.ts`
  e botão "Adicionar ao carrinho" (apenas para `CUSTOMER` ou visitante não
  autenticado)
- `app/cart/page.tsx` — carrinho: lista de itens com controle de quantidade,
  seleção de endereço de entrega (`GET /addresses`) e botão "Finalizar pedido"
  (`POST /orders`); após sucesso, limpa o carrinho e redireciona para
  `/orders/[id]`
- `app/addresses/page.tsx` — CRUD de endereços do usuário autenticado (criar,
  listar, definir padrão, remover)
- `app/orders/page.tsx` — "Minhas compras": lista os pedidos do cliente
  (`GET /orders`) com status e total
- `app/orders/[id]/page.tsx` — detalhe do pedido: itens, endereço, totais e botão
  "Cancelar pedido" quando o status permite (`PENDING`/`CONFIRMED`/`PREPARING`)
- `components/header.tsx` — para `CUSTOMER`: links "Minhas compras" e "Carrinho"
  (com contador de itens); para `STORE_OWNER`: link "Minha loja" (`/dashboard`);
  para `ADMIN`: link "Admin"

### Painel do lojista (`apps/web/app/dashboard`)

- `app/dashboard/layout.tsx` — guarda de acesso: redireciona para `/` se o
  usuário não for `STORE_OWNER`; navegação entre Minha loja / Produtos / Pedidos
- `app/dashboard/page.tsx` — busca a loja via `GET /stores/me`; se o lojista
  ainda não criou uma loja, redireciona para `/stores/new`. Mostra o status da
  loja (`PENDING_APPROVAL`/`ACTIVE`/`SUSPENDED`) e formulário para editar nome,
  descrição e modo de entrega (`PATCH /stores/:id`)
- `app/dashboard/products/page.tsx` — CRUD de produtos da loja (`StoreProduct`):
  lista todos os produtos (ativos e inativos) via `GET /products/mine?storeId=`;
  formulário de criação/edição — permite buscar no catálogo global (por nome/barcode)
  ou criar novo produto (que entra como `PENDING_REVIEW` até moderação admin); botão
  Ativar/Desativar (`PATCH /products/:id` com `isActive`)
- `app/dashboard/orders/page.tsx` — lista os pedidos da loja
  (`GET /orders?storeId=`) com itens e total; permite avançar o status do
  pedido (`PATCH /orders/:id/status`) seguindo as transições válidas de
  `lib/order-status.ts` (`ORDER_STATUS_TRANSITIONS`, espelha
  `ALLOWED_TRANSITIONS` do backend)
- `app/stores/new/page.tsx` — criação da loja (primeiro acesso); se o lojista já
  possui uma loja, redireciona para `/dashboard`

### Painel administrativo (`apps/web/app/admin`)

- `app/admin/layout.tsx` — guarda de acesso (`useAuth`): redireciona para `/` se o
  usuário não estiver autenticado ou não for `ADMIN`; renderiza a navegação entre
  Lojas / Usuários / Catálogo / Marcas / Logs de auditoria
- `app/admin/page.tsx` — redireciona para `/admin/stores`
- `app/admin/stores/page.tsx` — lista todas as lojas (`GET /admin/stores`) com
  filtro por status e botões "Aprovar" (`ACTIVE`) / "Suspender" (`SUSPENDED`)
  (`PATCH /admin/stores/:id/status`) — é aqui que uma loja `PENDING_APPROVAL`
  passa a aparecer no marketplace
- `app/admin/users/page.tsx` — lista usuários (`GET /admin/users`) com filtro por
  papel, permite alterar `role` e ativar/desativar (`PATCH /admin/users/:id`); o
  próprio usuário admin logado não pode alterar a si mesmo
- `app/admin/audit-logs/page.tsx` — lista paginada de `GET /admin/audit-logs`,
  com filtro por entidade
- `app/admin/catalog/page.tsx` — modera o catálogo global: lista `CatalogProduct`
  com filtro por status (`PENDING_REVIEW`/`ACTIVE`/`REJECTED`) via
  `GET /admin/catalog`; botões "Aprovar" / "Rejeitar" chamam
  `PATCH /admin/catalog/:id/status`
- `app/admin/brands/page.tsx` — lista e cria marcas (`GET /admin/brands`,
  `POST /brands`)

### Auth: registro com escolha de perfil

- `POST /auth/register` aceita `role` opcional (`CUSTOMER` ou `STORE_OWNER`,
  validado via `@IsIn` em `RegisterDto`/`SELF_REGISTERABLE_ROLES`). `ADMIN` não pode
  ser criado por este endpoint — apenas via seed/admin.
- Autoatribuição de `STORE_OWNER` é segura porque a loja criada nasce
  `PENDING_APPROVAL` e só fica visível/operante após aprovação de um `ADMIN`.

### Integração com Expo (`apps/mobile`)

- `metro.config.js` configura o Metro para resolver pacotes do monorepo:
  `watchFolders` aponta para a raiz do workspace, `nodeModulesPaths` inclui o
  `node_modules` do app e da raiz, e `disableHierarchicalLookup` é habilitado
- `EXPO_PUBLIC_API_URL` em `.env` define a base URL da API (em dispositivo/emulador
  físico, `localhost` não alcança a máquina host — usar o IP da máquina na rede local)

### CORS

- `apps/api/src/main.ts` habilita CORS via `app.enableCors({ origin:
  CORS_ORIGINS.split(','), credentials: true })`
- `CORS_ORIGINS` em `apps/api/.env` lista as origens permitidas (ex:
  `http://localhost:3000` para o web em dev)

## Backend (`apps/api`)

- **Framework**: NestJS 11, monolito modular (módulos em `src/modules/*`)
- **ORM**: Prisma 6 + PostgreSQL
- **Banco local de dev**: container Docker dedicado (`docker-compose.yml`), Postgres na
  porta `5436` (portas 5432-5435 já estavam em uso por outras instalações na máquina)

### Módulos atuais

- `prisma` — `PrismaService` global, injeta `PrismaClient` em todo o app
- `modules/auth` — autenticação (ver seção Auth)
- `modules/users` — CRUD básico de usuários
- `modules/stores` — perfil de loja (CRUD com RBAC); `GET /stores/me` retorna a
  loja do lojista autenticado (ou `null` se ainda não criou uma), usado pelo
  painel do lojista. `GET /stores` aceita os seguintes filtros/ordenações via query string:
  - `?sort=rating` — ordena por `avgRating` desc (top 6)
  - `?sort=newest` — ordena por `createdAt` desc (10 mais recentes)
  - `?lat=&lng=` — ordena por distância haversine; retorna lojas dentro de 20 km
    ou, se nenhuma estiver nesse raio, as 10 mais próximas
  - `?fastDelivery=true` — filtra lojas com `deliveryTimeMinutes <= 45`
  - `?deliveryProvider=` — filtra por provedor de entrega
  - `?limit=` — limita o número de resultados (1–50)
- `modules/categories` — categorias de produtos (CRUD, somente ADMIN escreve)
- `modules/brands` — marcas de produtos (ex: "Royal Canin"); CRUD com RBAC:
  qualquer lojista pode criar; ADMIN pode gerenciar todas; expostas em
  `GET /brands` (público) e `POST /brands` (STORE_OWNER/ADMIN)
- `modules/products` — gerencia `StoreProduct` (oferta da loja) e `CatalogProduct`
  (catálogo global compartilhado). Ao criar um produto, o lojista pode:
  - Referenciar um `CatalogProduct` existente via `catalogProductId` (reutiliza
    nome, marca, imagens, barcode do catálogo; apenas define preço/estoque/descrição
    próprios no `StoreProduct`)
  - Criar um produto novo (sem `catalogProductId`): um `CatalogProduct` novo é criado
    com status `PENDING_REVIEW` para moderação pelo admin, e o `StoreProduct` é
    associado a ele
  Soft-delete via `isActive` no `StoreProduct`; `GET /products/mine?storeId=`
  (STORE_OWNER/ADMIN) lista todos os produtos da loja, incluindo inativos, para
  gestão no painel do lojista
- `modules/price-alerts` — alertas de preço por `CatalogProduct`: cliente define um
  preço-alvo (`POST /price-alerts`); histórico de variações de preço registrado em
  `PriceHistory` por `StoreProduct`; endpoints: `POST /price-alerts` (upsert),
  `GET /price-alerts` (lista do usuário autenticado), `DELETE /price-alerts/:id`
- `modules/promotions` — promoções/descontos por produto ou loja (percentual ou valor
  fixo, com validação de período)
- `modules/addresses` — endereços de entrega do usuário autenticado (CRUD, com endereço
  padrão único por usuário)
- `modules/orders` — pedidos: criação com cálculo automático de subtotal/descontos
  (aplica a melhor promoção ativa por produto) e baixa de estoque, listagem (cliente
  ou loja), atualização de status com máquina de estados (`PENDING → CONFIRMED →
  PREPARING → OUT_FOR_DELIVERY → DELIVERED`, com `CANCELLED` a partir de
  `PENDING`/`CONFIRMED`/`PREPARING`) e cancelamento pelo cliente (restaura estoque)
- `modules/audit-log` — registro de auditoria (quem fez o quê e quando);
  `AuditLogService.findAll` suporta paginação e filtro por `entity`/`userId`
  (usado pelo painel admin)
- `modules/reviews` — avaliações de produtos e lojas (ver seção "Avaliações
  (Reviews)" abaixo)
- `modules/admin` — endpoints exclusivos de `ADMIN` (`@Roles(UserRole.ADMIN)` no
  controller inteiro):
  - `GET /admin/stores?status=` — lista lojas em qualquer status (inclusive
    `PENDING_APPROVAL`/`SUSPENDED`), com dados do `owner`
  - `PATCH /admin/stores/:id/status` — aprova (`ACTIVE`), suspende ou reativa uma loja
  - `GET /admin/users?role=` — lista usuários (sem `passwordHash`)
  - `PATCH /admin/users/:id` — atualiza `role`/`isActive` de um usuário
  - `GET /admin/audit-logs?entity=&userId=&page=&pageSize=` — logs de auditoria
    paginados, com dados do usuário que executou a ação
  - `GET /admin/catalog?status=&page=&pageSize=` — lista `CatalogProduct` (todos os
    status, incluindo `PENDING_REVIEW`)
  - `PATCH /admin/catalog/:id/status` — aprova (`ACTIVE`) ou rejeita (`REJECTED`) um
    produto do catálogo global
  - `GET /admin/brands` — lista todas as marcas

### Autenticação

- **JWT access token** (15 min) + **refresh token** (30 dias) com **rotation**
- Hash de senha: **Argon2** (`passwordHash` agora é nullable — usuários criados via
  Google OAuth não têm senha local)
- Refresh tokens são armazenados no banco como hash (SHA-256) com `revoked`,
  `expiresAt`. A cada `/auth/refresh`, o token antigo é revogado e um novo é emitido.
  Reuso de um token já revogado/expirado revoga **toda a sessão** do usuário (proteção
  contra roubo de refresh token).
- `JwtAuthGuard` é **global** — toda rota exige token, exceto as marcadas com
  `@Public()`.
- `RolesGuard` é **global** — rotas marcadas com `@Roles(UserRole.X)` exigem o papel
  correspondente. Roles: `CUSTOMER`, `STORE_OWNER`, `ADMIN`.
- Rate limiting via `@nestjs/throttler` (global: 100 req/min; login: 5/min).
- `GET /auth/me` — retorna o perfil do usuário autenticado (via `UsersService.findProfile`,
  sem `passwordHash`); exige token válido (não é `@Public()`), lança `NotFoundException`
  se o usuário não existir mais. Usado pelo web para revalidar a sessão.

#### Login com Google (OAuth 2.0)

- **Strategy**: `PassportStrategy(Strategy, 'google')` (`modules/auth/strategies/
  google.strategy.ts`) via `passport-google-oauth20`; valida o `id_token` do Google e
  extrai `googleId`, `email`, `name`
- **Guard**: `GoogleAuthGuard` (`common/guards/google-auth.guard.ts`), usado nos
  endpoints públicos do fluxo OAuth
- **Fluxo**:
  1. `GET /auth/google` (público) → redireciona para o consent screen do Google
  2. `GET /auth/google/callback` (público) → Google redireciona com código; o guard
     valida e chama `AuthService.googleLogin(profile)`
  3. `AuthService.googleLogin`: procura por `googleId`; se não encontrar, verifica
     se o e-mail já existe e vincula o `googleId` (conta mista); caso contrário cria
     conta nova sem senha. Retorna os mesmos tokens JWT do fluxo email/senha.
  4. O frontend (`apps/web/app/auth/callback`) recebe os tokens via query string ou
     redirect e persiste no `localStorage`
- **Variáveis de ambiente** necessárias (ver seção de env vars):
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`

### Usuário admin (dev)

- `/auth/register` nunca cria `ADMIN` (ver seção "Auth: registro com escolha de
  perfil"). Para ter um admin em dev, use o seed do Prisma:
  `npx prisma db seed` (em `apps/api`) — cria/promove (`upsert`) o usuário definido
  por `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`/`ADMIN_SEED_NAME` no `.env` (padrões:
  `admin@petdots.local` / `AdminP@ssw0rd123`). Script em `prisma/seed.ts`, configurado
  via `migrations.seed` em `prisma.config.ts`.

### Auditoria ("quem fez o quê e quando")

- Tabela `audit_logs` no Postgres (via Prisma), populada automaticamente por
  `AuditLogInterceptor` (global) para qualquer rota anotada com `@AuditLog({ entity,
  action })`.
- Logs técnicos (request/response, erros) vão via **nestjs-pino** (Pino), formato JSON
  estruturado em produção, pretty-print em dev. Authorization header é redatado.
  Em produção, recomenda-se enviar esses logs para uma ferramenta centralizada (ex:
  Grafana Loki) — ainda não configurado.

### Documentação da API

- Swagger/OpenAPI em `/api/docs`, gerado via decorators `@ApiTags`/`@ApiProperty` nos
  DTOs e controllers.

### Testes

- **Jest** para unit tests (`*.spec.ts` ao lado do código)
- **Jest + Supertest** para e2e (`test/*.e2e-spec.ts`), roda contra o Postgres do
  docker-compose
- Pirâmide sugerida: unit (regras de negócio/services), integração (controllers +
  Prisma real), e2e (fluxos críticos: registro/login, criação de loja, pedido completo)

### Modelo de dados (Prisma)

Principais entidades em `apps/api/prisma/schema.prisma`:

- `User` (roles: CUSTOMER, STORE_OWNER, ADMIN; `passwordHash` nullable; `googleId`
  único e opcional para contas OAuth) + `RefreshToken` + `Address`
- `Store` (perfil da loja, `deliveryProvider`: SELF/EXTERNAL, status de aprovação,
  `deliveryRadiusKm: Float @default(10)`)
- `Category`, `PetType`
- `Brand` — marca de produto (ex: "Royal Canin")
- `CatalogProduct` — produto global compartilhado entre lojas (status:
  `PENDING_REVIEW | ACTIVE | REJECTED`); inclui `barcode`, `brandId`, imagens via
  `CatalogProductImage`
- `StoreProduct` — oferta da loja sobre um `CatalogProduct`: `price`, `stock`,
  `isActive`, `customDescription`; histórico de preços via `PriceHistory`
- `Promotion` (desconto percentual ou valor fixo, por produto ou loja)
- `Order`, `OrderItem`, `Delivery` (provider SELF/EXTERNAL, status de rastreamento)
- `ProductReview`, `StoreReview` (avaliações de clientes; ver seção "Avaliações
  (Reviews)")
- `PriceAlert` — alerta de preço por `CatalogProduct` + `User` (targetPrice);
  `@@unique([catalogProductId, userId])`
- `PriceHistory` — registro histórico de variações de preço por `StoreProduct`
- `AuditLog`

## Variáveis de ambiente (`apps/api/.env`)

```
DATABASE_URL=postgresql://petdots:petdots@localhost:5436/petdots?schema=public
JWT_ACCESS_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=30d
PORT=3001
CORS_ORIGINS=http://localhost:3000,http://localhost:8081

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Storage (S3-compatible — MinIO local; em produção, trocar pelas credenciais do R2/S3)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=petdots
S3_SECRET_ACCESS_KEY=petdots123
S3_BUCKET=petdots-uploads
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=http://localhost:9000/petdots-uploads

# Logs centralizados (Loki) — opcional; se vazio, logs ficam só locais (pino-pretty)
LOKI_URL=http://localhost:3100
```

> ⚠️ Os secrets de JWT no `.env` são apenas para desenvolvimento. Em produção devem
> vir de um cofre de segredos (ex: variáveis de ambiente do provedor, AWS Secrets
> Manager, etc).

## Upload de imagens / object storage

- API S3-compatível via `@aws-sdk/client-s3` (`PutObjectCommand`), encapsulada em
  `UploadsModule` (`apps/api/src/modules/uploads`):
  - `UploadsService` lê config de `S3_*` via `ConfigService` e expõe
    `uploadImage(file, folder)`, que gera uma key `folder/<uuid>.<ext>` e retorna
    `${S3_PUBLIC_URL}/<key>`
  - `UploadsController` expõe `POST /uploads/images` (roles `STORE_OWNER`/`ADMIN`,
    `FileInterceptor('file')`, `ParseFilePipeBuilder` valida tipo
    `image/(jpeg|png|webp)` e tamanho máx. 5MB)
- **Local (dev)**: MinIO via `docker-compose.yml` (serviços `minio` — API porta
  `9000`, console `9001` — e `minio-init`, um container `mc` one-shot que cria o
  bucket `petdots-uploads` e define política `anonymous download`, deixando os
  objetos publicamente legíveis pela `S3_PUBLIC_URL`)
- **Produção**: trocar `S3_ENDPOINT`/`S3_REGION`/`S3_ACCESS_KEY_ID`/
  `S3_SECRET_ACCESS_KEY`/`S3_BUCKET`/`S3_PUBLIC_URL` pelas credenciais do Cloudflare
  R2 ou AWS S3 (e `S3_FORCE_PATH_STYLE=false` para S3 real) — nenhuma mudança de
  código necessária
- `ApiClient.uploadProductImage(file, filename)` (em `@petdots/shared`) envia o
  arquivo via `FormData` para `/uploads/images` e retorna `{ url }`; usa os helpers
  `requestFormData`/`fetchFormData`, que espelham `request`/`fetch` (incluindo retry
  via refresh token em 401)
- `apps/web/app/dashboard/products/page.tsx`: o campo "Imagens" do formulário de
  produto usa `<input type="file">` — cada arquivo selecionado é enviado via
  `uploadProductImage` e a URL retornada é adicionada à lista `images` (com preview
  em miniatura e botão de remoção), que continua sendo enviada como `images: string[]`
  para `createProduct`/`updateProduct` (já suportado por `ProductsService` via
  `ProductImage`)

## Frontend web (`apps/web`)

- **Next.js 16** (App Router, Turbopack, Tailwind CSS v4), TypeScript
- Roda na porta padrão `3000`; consome a API em `http://localhost:3001`
- ⚠️ Next.js 16 tem mudanças relevantes em relação a versões anteriores — ver
  `apps/web/AGENTS.md` antes de implementar páginas/rotas

## App mobile (`apps/mobile`)

- **Expo 56** + **Expo Router** (file-based routing em `src/app`), React Native 0.85,
  TypeScript
- ⚠️ Expo 56 também tem mudanças relevantes — ver `apps/mobile/AGENTS.md`
- Branding: tokens de cor da marca (`primary` laranja `#FF6B00`, `primaryMuted`,
  `onPrimary`, `border`, `danger`, `success`) em `src/constants/theme.ts`
  (`Colors.light`/`Colors.dark`), usados via `ThemedView`/`ThemedText`/`useTheme()`
- Sessão e carrinho persistidos com `@react-native-async-storage/async-storage`
  (`src/lib/auth-context.tsx` e `src/lib/cart-context.tsx`, mirror dos contexts do
  web; `AuthProvider` revalida a sessão com `apiClient.getMe()`)
- Navegação por abas em `src/app/(tabs)/_layout.tsx` usando `Tabs`/`TabList`/
  `TabSlot`/`TabTrigger` de `expo-router/ui` (cross-platform, sem ícones nativos por
  imagem): **Início** (lista de lojas), **Pedidos**, **Carrinho** (com badge de
  contagem) e **Conta**
- Telas do fluxo do cliente (CUSTOMER), espelhando `apps/web`:
  - `(tabs)/index.tsx` — home com lista de lojas (`apiClient.listStores()`)
  - `(tabs)/orders.tsx` — histórico de pedidos com status (`src/lib/order-status.ts`)
  - `(tabs)/cart.tsx` — itens do carrinho, seleção/cadastro mínimo de endereço
    (`apiClient.listAddresses()`/`createAddress()`) e checkout
    (`apiClient.createOrder()`)
  - `(tabs)/account.tsx` — perfil e logout, ou CTAs de login/registro
  - `login.tsx` / `register.tsx` — telas modais (`presentation: 'modal'`)
  - `stores/[id].tsx` — catálogo de produtos da loja com adicionar ao carrinho
- `src/lib/pricing.ts` e `src/lib/order-status.ts` espelham as versões do web
  (`apps/web/lib`), adaptando estilos Tailwind para cores RN
- **Fix do hoisting do `expo-router`/`@expo/metro-runtime`** (resolvido):
  `npm run web` (Expo web) falhava ao iniciar com `Unable to resolve module
  @expo/metro-runtime` e depois `Cannot find module 'expo-router/_ctx-shared'`.
  Duas causas distintas, ambas relacionadas ao `disableHierarchicalLookup: true`
  do `metro.config.js` (Metro só procura em `apps/mobile/node_modules` e no
  `node_modules` raiz, sem subir a árvore a partir de cada pacote):
  - `@expo/metro-runtime` é dependência transitiva do `expo-router`, mas não
    estava listado como dependência direta do `apps/mobile/package.json`, então o
    npm só o instalava dentro de `expo-router/node_modules`, fora do alcance do
    Metro. **Fix definitivo**: adicionado `@expo/metro-runtime: "~56.0.15"` como
    dependência direta em `apps/mobile/package.json` — o npm agora o hospeda na
    raiz (`node_modules/@expo/metro-runtime`), dentro do `nodeModulesPaths` do
    Metro.
  - `@expo/cli` (na raiz) depende de `@expo/router-server`, que declara
    `expo-router: "*"` como peer dependency opcional, usado via `require()`
    (resolução normal do Node, não do Metro) para gerar os tipos de rota
    (`expo-router/_ctx-shared`). O npm mantém `expo-router` apenas em
    `apps/mobile/node_modules` (não promove para a raiz), fora da cadeia de
    `require` do `@expo/cli`. **Fix definitivo**: script
    `apps/mobile/scripts/fix-expo-router-server-link.js`, rodado via
    `postinstall` do `apps/mobile/package.json`, cria automaticamente um link
    (`junction` no Windows) de
    `node_modules/@expo/cli/node_modules/@expo/router-server/node_modules/expo-router`
    para `apps/mobile/node_modules/expo-router` sempre que `npm install` é
    executado — não requer mais intervenção manual após `rm -rf node_modules`.

## Real-time de pedidos (WebSocket)

- **Gateway**: `OrdersGateway` (`apps/api/src/modules/orders/orders.gateway.ts`),
  namespace `/orders` (Socket.IO via `@nestjs/websockets` +
  `@nestjs/platform-socket.io`), CORS espelhando `CORS_ORIGINS`
  - Autenticação no handshake: o cliente envia o access token JWT em
    `socket.handshake.auth.token` (ou header `Authorization: Bearer`); o gateway
    valida com `JwtService.verifyAsync` usando `JWT_ACCESS_SECRET` e desconecta o
    socket se inválido
  - **Rooms**: todo cliente conectado entra em `user:<userId>`; se for
    `STORE_OWNER` com loja própria, também entra em `store:<storeId>`
  - `OrdersModule` importa `JwtModule.register({})` (registro local, sem secret
    fixo) e registra `OrdersGateway` como provider
- **Eventos emitidos por `OrdersService`** (após persistir no banco):
  - `order:created` → room `store:<storeId>` (novo pedido para o lojista)
  - `order:updated` → rooms `user:<customerId>` e `store:<storeId>` (mudança de
    status via `updateStatus`/`cancel`, inclui o `Order` completo com
    `ORDER_INCLUDE`)
- **Cliente** (`@petdots/shared/src/realtime.ts`): `createOrdersSocket(baseUrl,
  accessToken)` retorna um `Socket` tipado (`OrdersServerToClientEvents`) já
  conectado ao namespace `/orders` (`transports: ['websocket']`)
- **Web** (`apps/web/lib/use-orders-socket.ts`): hook `useOrdersSocket({
  onOrderCreated?, onOrderUpdated? })` que conecta com o access token do
  `localStorage` enquanto o componente estiver montado
  - `app/orders/page.tsx` ("Minhas compras") e `app/orders/[id]/page.tsx`:
    atualizam o pedido na tela ao receber `order:updated`
  - `app/dashboard/orders/page.tsx` (painel do lojista): insere novos pedidos ao
    receber `order:created` e atualiza status ao receber `order:updated`
- **Mobile**: ainda não conectado ao gateway (próximo passo, ver lista abaixo)

## Logs centralizados (Loki/Grafana)

- API usa `nestjs-pino` (pino-http) com transporte **multi-target**, configurado em
  `apps/api/src/app.module.ts`:
  - **Dev** (`NODE_ENV !== 'production'`): `pino-pretty` no console, como antes
  - **Loki** (se `LOKI_URL` estiver definido): target `pino-loki`, enviando todos
    os logs para `${LOKI_URL}/loki/api/v1/push` com labels fixas
    `{ service: 'petdots-api', env: NODE_ENV }`
  - Se `LOKI_URL` não estiver definido, esse target é simplesmente omitido — sem
    mudança de comportamento (mesmo `redact` de `req.headers.authorization` de
    antes)
  - `import 'dotenv/config'` no topo de `app.module.ts` garante que `.env` já
    esteja carregado no momento em que `process.env.LOKI_URL` é lido (a leitura
    ocorre na avaliação do módulo, antes do `ConfigModule.forRoot()` rodar)
- **Local (dev)**: `docker-compose.yml` sobe `loki` (porta `3100`) e `grafana`
  (porta `3300`, mapeada para a `3000` interna do container, para não colidir com
  o `apps/web`); Grafana com acesso anônimo habilitado como Admin
  (`GF_AUTH_ANONYMOUS_ENABLED`) para uso local sem login
- Datasource do Loki pré-configurado via provisioning em
  `infra/grafana/provisioning/datasources/loki.yaml` (apontando para
  `http://loki:3100` na rede interna do Docker), já marcado como default —
  basta abrir `http://localhost:3300/explore` e consultar `{service="petdots-api"}`
- **Produção**: apontar `LOKI_URL` para a instância de Loki gerenciada (ex: Grafana
  Cloud) — nenhuma mudança de código necessária, mesmo padrão usado para
  MinIO → R2/S3

## Provedores de entrega (`DeliveryProvider`)

- Cada `Store` tem `deliveryProvider: DeliveryProviderType` (`SELF` | `EXTERNAL`,
  default `SELF`), definido pelo lojista (campo do formulário de criação/edição da
  loja em `apps/web/app/stores/new` e `apps/web/app/dashboard`) — uma loja nunca tem
  os dois modos simultaneamente
- `apps/api/src/modules/delivery/delivery-provider.interface.ts` define a interface
  `DeliveryProvider`:
  - `createDelivery(client, orderId)` — cria o registro `Delivery` do pedido
  - `syncStatus(client, orderId, orderStatus)` — sincroniza `Delivery.status` a
    partir do `OrderStatus`; retorna `null` se o provedor não deriva o status da
    entrega a partir do status do pedido
- `SelfDeliveryProvider` (`providers/self-delivery.provider.ts`): entrega feita pela
  própria loja. `syncStatus` mantém `Delivery.status` em sincronia automática com o
  `OrderStatus` (PENDING/CONFIRMED/PREPARING → WAITING, OUT_FOR_DELIVERY → IN_TRANSIT,
  DELIVERED → DELIVERED, CANCELLED → FAILED) — o lojista gerencia tudo através do
  status do pedido, sem passo extra
- `ExternalDeliveryProvider` (`providers/external-delivery.provider.ts`): cria o
  registro `Delivery` (status inicial `WAITING`), mas `syncStatus` é um no-op
  (`null`) — o status real virá de uma integração futura com o parceiro (API/webhook),
  ainda não implementada
- `DeliveryProviderFactory` (`delivery-provider.factory.ts`, exportado por
  `DeliveryModule`) resolve `DeliveryProviderType` → instância do provider
  correspondente
- `OrdersService` usa a factory:
  - `create()`: dentro da transação, após criar o pedido e baixar o estoque, chama
    `createDelivery` com o `deliveryProvider` da loja e anexa o `Delivery` criado ao
    pedido retornado
  - `updateStatus()`/`cancel()`: após atualizar o `Order`, chama `syncStatus` com o
    novo status; se retornar um `Delivery` (caso SELF), substitui `updated.delivery`

## Avaliações (Reviews)

- **Modelos** `ProductReview` e `StoreReview` (`apps/api/prisma/schema.prisma`,
  `modules/reviews`), separados (não polimórficos), cada um com FK para
  `product`/`store`, `customer` (User) e `order`
- **Compra verificada obrigatória**: só é possível avaliar um produto/loja se o
  cliente tiver um pedido `DELIVERED` que contenha aquele produto (`ProductReview`)
  ou que pertença àquela loja (`StoreReview`)
- **Uma avaliação por cliente, no total** (não por pedido): `@@unique([productId,
  customerId])` / `@@unique([storeId, customerId])`; `POST` é um **upsert** — uma
  nova avaliação do mesmo cliente substitui a anterior
- **Agregados desnormalizados**: `Product.avgRating`/`reviewCount` e
  `Store.avgRating`/`reviewCount`, recalculados via `aggregate()` (full recompute,
  não incremental, para evitar drift de float) dentro do mesmo `$transaction` em
  toda criação/atualização/remoção de avaliação
- **Resposta do lojista**: campos `ownerReply`/`ownerRepliedAt` em ambos os
  modelos; `PATCH .../:reviewId/reply` restrito ao proprietário da loja (ou ADMIN)
- **Endpoints** (`modules/reviews`):
  - `GET /products/:productId/reviews` / `GET /stores/:storeId/reviews` — públicos,
    ordenados por `createdAt desc`, incluem `customer: { id, name }`
  - `POST /products/:productId/reviews` / `POST /stores/:storeId/reviews` —
    `CUSTOMER`, upsert (`{ rating, comment? }`)
  - `DELETE /products/:productId/reviews` / `DELETE /stores/:storeId/reviews` —
    `CUSTOMER`, remove a própria avaliação
  - `PATCH /products/:productId/reviews/:reviewId/reply` / `PATCH
    /stores/:storeId/reviews/:reviewId/reply` — `STORE_OWNER`/`ADMIN`, define
    `ownerReply`
- `@petdots/shared`: tipos `ProductReview`/`StoreReview` (em `types/entities.ts`,
  com `customer?: Pick<User, "id" | "name">`), `CreateReviewInput`/
  `ReplyReviewInput` (em `types/dto.ts`) e 8 métodos no `ApiClient`
  (`listProductReviews`, `upsertProductReview`, `deleteProductReview`,
  `replyToProductReview` + equivalentes para `StoreReview`)
- **Frontend conectado**: as telas de avaliação em `apps/web`
  (`app/products/[id]`, `app/stores/[id]`, `app/dashboard/reviews`,
  `app/orders/[id]`) usam os métodos reais do `ApiClient` (sem mocks)

## Painel do lojista: indicadores e analytics

- **Endpoint** `GET /stores/:id/stats` (`modules/stores`, `StoresController.getStats`
  → `StoresService.getStats`), restrito a `STORE_OWNER`/`ADMIN` com checagem de
  propriedade (`ForbiddenException` se o requester não for o dono nem ADMIN)
- **Tipo `StoreStats`** (`@petdots/shared`, `types/entities.ts`), com método
  `ApiClient.getStoreStats(id)`:
  - `revenueDelivered`/`revenueInProgress`: faturamento é calculado **apenas**
    a partir de pedidos `DELIVERED` (receita realizada); pedidos em andamento
    (`PENDING`/`CONFIRMED`/`PREPARING`/`OUT_FOR_DELIVERY`) somam em
    `revenueInProgress` (receita potencial) e `CANCELLED` não entra em nenhum dos
    dois
  - `ordersCount`/`cancelledOrdersCount`: total de pedidos válidos (excluindo
    cancelados) e quantos foram cancelados
  - `activeProductsCount`: contagem de produtos com `isActive: true`
  - `ordersByStatus`: contagem de pedidos por `OrderStatus` (todos os status,
    incluindo zerados)
  - `revenueByDay`: série dos últimos 30 dias (`{date, revenue}`), somando
    pedidos `DELIVERED` por dia
  - `topProducts`: top 5 produtos por receita (`{productId, name, quantitySold,
    revenue}`), agregados a partir de `OrderItem` de pedidos `DELIVERED`
- **Frontend** (`apps/web/app/dashboard`):
  - `layout.tsx`: 4 cards de indicadores — "Faturamento Total"
    (`revenueDelivered`), "Em Andamento" (`revenueInProgress`, badge
    "Potencial"), "Quantidade de Pedidos" (`ordersCount`, com nota de quantos
    foram cancelados) e "Produtos Ativos" (`activeProductsCount`)
  - `page.tsx`: seção de analytics com `recharts` (nova dependência) — gráfico de
    área do faturamento nos últimos 30 dias, donut de pedidos por status (cores
    de `lib/order-status.ts` → `ORDER_STATUS_CHART_COLORS`) e barras horizontais
    dos produtos mais vendidos

## Decisões pendentes / próximos passos

- [x] Identidade visual e telas iniciais do web (login, cadastro, criar loja, home)
- [x] Fluxo de compra no web (catálogo da loja, carrinho, checkout, endereços,
  minhas compras)
- [x] Branding e telas iniciais do mobile (fluxo do cliente: login/registro, lojas,
  catálogo, carrinho/checkout, pedidos, conta)
- [x] Resolver definitivamente o hoisting do `expo-router`/`@expo/metro-runtime`
  (ver seção "App mobile" acima — fix automatizado via dependência direta +
  `postinstall`)
- [ ] Testar o fluxo do cliente no mobile via Chrome (`npm run web`)
- [ ] Telas mobile do lojista (dashboard), admin, detalhe do pedido, conectar ao
  gateway de real-time (`@petdots/shared/realtime`)
- [ ] Estudar integração de pagamentos (boleto bancário, cartão de crédito/débito,
  Pix): hoje o checkout (`POST /orders`) não cobra de fato — definir provedor (ex:
  Stripe, Mercado Pago, Pagar.me/PagSeguro), fluxo de confirmação/captura e webhook
  de atualização de status de pagamento, e como isso se encaixa na máquina de
  estados do `Order`
- [x] Submenus "Encontrar Lojas" do topbar (`components/header.tsx`) integrados:
  "Lojas Próximas" → `/stores?filter=nearby`, "Melhor Avaliadas" →
  `/stores?filter=rating`, "Entrega Rápida" → `/stores?filter=fast`,
  "Novidades" → `/stores?filter=newest`; todos navegam para `app/stores/page.tsx`
  com filtros reais via `GET /stores`

- [ ] Submenus "Encontrar Produtos" do topbar (`components/header.tsx`): selecionar
  uma categoria ou "🔥 Ofertas" deve listar **produtos** (não lojas) —
  hoje os botões de categoria redirecionam para a home com parâmetros
  que não têm efeito real. Criar página `/products` (busca/listagem via
  `GET /products?categoryId=&search=&onSale=`) e definir critério de
  organização dos resultados: mais bem avaliados (`avgRating`), em oferta primeiro,
  ou replicar as seções/sub-grids da Home
- [ ] Tag "Aberto agora"/"Fechado" (`app/stores/[id]/page.tsx`, `isStoreOpen`) é
  mockada (fixo 08h–19h, seg–sáb) e não usa `Store.businessHours`; estudar cálculo
  real a partir de `businessHours.weekdays/saturday/sunday` (considerando timezone)
  e se vale a pena reaproveitar esse cálculo nos cards de loja da Home (pesquisar
  como apps de delivery, ex: iFood, calculam/exibem esse status)
- [x] **Tag "Entrega Rápida" — Fase 1 concluída**
  - `Store.deliveryTimeMinutes Int?` no schema Prisma (migração
    `20260617100000_store_delivery_time`); lojista preenche em
    `apps/web/app/dashboard/page.tsx`
  - `GET /stores?fastDelivery=true` filtra por `deliveryTimeMinutes <= 45`
  - Submenu "Entrega Rápida" do header aponta para `/stores?filter=fast`
  - Cards da `/stores` exibem badge "⚡ ~X min" quando o campo está preenchido

- [ ] **Tag "Entrega Rápida" — Fases 2 e 3 (pendentes)**

  **Fase 2 — Pesquisa pós-venda**
  - Após o pedido ser marcado como `DELIVERED`, enviar ao cliente uma pergunta
    simples: *"A entrega chegou no tempo esperado?"* (sim / não, opcional — não
    bloquear o fluxo)
  - Armazenar em `Order.deliveryOnTime: Boolean?` (ou em tabela própria, caso
    a pesquisa cresça — ex: nota, comentário sobre a entrega)
  - Manter `deliveryOnTime` separado do `StoreReview.rating` para não
    contaminar a nota geral da loja com questões logísticas

  **Fase 2 — Pesquisa pós-venda**
  - Após o pedido ser marcado como `DELIVERED`, enviar ao cliente uma pergunta
    simples: *"A entrega chegou no tempo esperado?"* (sim / não, opcional — não
    bloquear o fluxo)
  - Armazenar em `Order.deliveryOnTime: Boolean?` (ou em tabela própria, caso
    a pesquisa cresça — ex: nota, comentário sobre a entrega)
  - Manter `deliveryOnTime` separado do `StoreReview.rating` para não
    contaminar a nota geral da loja com questões logísticas

  **Fase 3 — Controle automático da tag**
  - Calcular `deliveryPunctualityRate` por loja: percentual de pedidos
    `DELIVERED` nos últimos 30 dias em que `deliveryOnTime = true` (mínimo de
    10 respostas para entrar no cálculo)
  - Se `deliveryPunctualityRate < 70%`:
    - Notificar o lojista (e-mail ou alerta no painel): "Sua taxa de
      pontualidade caiu para X% — revise o tempo estimado ou melhore a
      operação para manter a tag Entrega Rápida"
    - Se não melhorar em 7 dias, remover automaticamente a tag
      (`deliveryTimeMinutes` permanece salvo, mas a loja sai do filtro
      `?fastDelivery=true`)
  - Lojas novas têm carência: as primeiras 10 respostas não ativam punição
    automática (para não desincentivar novos cadastros)
  - Administradores podem ver o `deliveryPunctualityRate` em
    `GET /admin/stores` e intervir manualmente se necessário

  **Referências**
  - iFood/Rappi: tempo estimado é autodeclarado pelo restaurante + ajustado
    pelo histórico real de entrega (algoritmo interno). A tag desaparece
    automaticamente se a loja consistentemente descumpre o prazo.
  - Decisão: implementar Fase 1 agora; Fases 2 e 3 após ter volume de pedidos
    reais suficiente para validar o threshold e o período de avaliação.
- [x] Login com Google (OAuth 2.0): `passport-google-oauth20`, fluxo completo
  backend + callback no frontend web; vincula `googleId` a conta existente por
  e-mail; contas OAuth têm `passwordHash = null`
- [x] Catálogo global de produtos (`CatalogProduct`/`StoreProduct`/`Brand`):
  produtos compartilhados entre lojas com moderação admin (`PENDING_REVIEW →
  ACTIVE/REJECTED`); lojista pode referenciar produto existente ou propor novo;
  histórico de preços via `PriceHistory`
- [x] Alertas de preço por `CatalogProduct`: módulo `price-alerts`, modelo
  `PriceAlert` com `targetPrice` por usuário/produto do catálogo
- [x] `deliveryRadiusKm` na `Store` (padrão 10 km)
- [ ] Notificação de alerta de preço: quando o `StoreProduct.price` de alguma loja
  cair abaixo do `targetPrice` do cliente, disparar notificação (push/e-mail);
  ainda não implementado — `PriceAlert` existe no banco mas o gatilho de disparo está
  pendente
- [ ] Fluxo "Esqueci minha senha": endpoints `POST /auth/forgot-password` (envia
  e-mail com token de redefinição) e `POST /auth/reset-password` (define nova senha
  a partir do token), com as mesmas regras de força/confirmação de senha do
  cadastro/troca de senha; telas correspondentes no web e mobile
- [x] Endpoint `/auth/me`: retorna o perfil do usuário autenticado a partir do
  banco (`UsersService.findProfile`, sem `passwordHash`); consumido pelo
  `lib/auth-context.tsx` do web para revalidar a sessão a cada carregamento
- [x] Painel do lojista (`apps/web/app/dashboard`): editar dados da loja, CRUD
  de produtos (incluindo inativos) e gestão de pedidos da loja
- [x] Upload de imagens (object storage — S3/R2/MinIO; ver seção "Upload de
  imagens / object storage" acima)
- [x] Real-time de status de pedido (WebSockets; ver seção "Real-time de pedidos
  (WebSocket)" acima — web conectado, mobile pendente)
- [x] Abstração de provedores de entrega (`DeliveryProvider`: SELF vs EXTERNAL; ver
  seção "Provedores de entrega (`DeliveryProvider`)" acima)
- [x] Painel administrativo (módulo `admin`): aprovação/suspensão de lojas,
  gestão de usuários (papel e status ativo) e visualização de logs de auditoria,
  com interface em `apps/web/app/admin`
- [x] Logs centralizados (Loki/Grafana; ver seção "Logs centralizados (Loki/Grafana)"
  acima — local via docker-compose, produção via `LOKI_URL`)
- [x] Backend de avaliações de produtos e lojas (ver seção "Avaliações (Reviews)"
  acima — falta conectar o frontend web, que ainda usa mocks)
- [ ] 2FA para lojistas/admins
