---
title: Deployment
status: draft
version: "1.3"
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

Os **passos concretos de deploy** (serviços, comandos de build e start,
variáveis, `_redirects`, DNS) são da tarefa de publicação e entram aqui quando
ela fechar.

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
- [ ] Passos de deploy fechados — na tarefa de publicação.
