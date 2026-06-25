# PetDots

Marketplace de petshops com entrega no mesmo dia. Lojistas cadastram seus produtos, clientes compram e acompanham a entrega em tempo real.

## Visão geral

| App | Stack | Porta |
|---|---|---|
| `apps/api` | NestJS + Prisma + PostgreSQL | 3001 |
| `apps/web` | Next.js 16 | 3000 |
| `apps/mobile` | Expo 56 / React Native | — |

## Pré-requisitos

- [Node.js](https://nodejs.org) >= 20
- [Docker](https://www.docker.com) e Docker Compose
- npm (incluso no Node.js)

---

## 1. Instalar dependências

Na raiz do projeto:

```bash
npm install
```

Isso instala as dependências de todos os workspaces (`api`, `web`, `mobile`, `shared`) de uma vez.

---

## 2. Configurar variáveis de ambiente

### API — `apps/api/.env`

Crie o arquivo `apps/api/.env` com o seguinte conteúdo:

```env
DATABASE_URL=postgresql://petdots:petdots@localhost:5436/petdots?schema=public

JWT_ACCESS_SECRET=troque_por_um_secret_seguro
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=troque_por_outro_secret_seguro
JWT_REFRESH_EXPIRES_IN=30d

PORT=3001
CORS_ORIGINS=http://localhost:3000,http://localhost:8081

# Google OAuth (opcional — necessário apenas para login com Google)
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Object storage (MinIO local via Docker — padrão de dev)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=petdots
S3_SECRET_ACCESS_KEY=petdots123
S3_BUCKET=petdots-uploads
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=http://localhost:9000/petdots-uploads

# Seed do admin
ADMIN_SEED_EMAIL=admin@petdots.local
ADMIN_SEED_PASSWORD=AdminP@ssw0rd123
ADMIN_SEED_NAME=Admin
```

### Web — `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Mobile — `apps/mobile/.env`

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

> Em dispositivo físico ou emulador, substitua `localhost` pelo IP da sua máquina na rede local (ex: `192.168.1.100`).

---

## 3. Subir a infraestrutura (Docker)

Na raiz do projeto:

```bash
docker compose up -d
```

Isso sobe os seguintes serviços:

| Serviço | URL |
|---|---|
| PostgreSQL | `localhost:5436` |
| MinIO (API) | `http://localhost:9000` |
| MinIO (Console) | `http://localhost:9001` |
| Loki | `http://localhost:3100` |
| Grafana | `http://localhost:3300` |

---

## 4. Aplicar migrations e seed do banco

```bash
cd apps/api
npx prisma migrate deploy
npx prisma db seed
```

O seed cria o usuário admin configurado em `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` e popula o catálogo com dados iniciais.

---

## 5. Iniciar os apps

### API

```bash
cd apps/api
npm run start:dev
```

A API ficará disponível em `http://localhost:3001`.  
Documentação Swagger: `http://localhost:3001/api/docs`

### Web

```bash
cd apps/web
npm run dev
```

Acesse em `http://localhost:3000`.

### Mobile

```bash
cd apps/mobile
npm run start
```

Aponte o Expo Go no celular para o QR code exibido no terminal, ou:

```bash
npm run android   # emulador Android
npm run ios       # simulador iOS (macOS)
npm run web       # navegador
```

### Todos ao mesmo tempo (a partir da raiz)

```bash
npm run dev
```

Inicia API, web e mobile em paralelo via Turborepo.

---

## Credenciais padrão de dev

| Usuário | E-mail | Senha |
|---|---|---|
| Admin | `admin@petdots.local` | `AdminP@ssw0rd123` |

Novos usuários `STORE_OWNER` e `CUSTOMER` podem ser criados pelo endpoint `POST /auth/register` ou pela tela de cadastro do web.
