---
title: "ADR-0002: Stack tecnológica de fundação do PetDots"
status: stable
version: 1.0
updated: 2026-06-27
scope: >
  Decisão da stack tecnológica de fundação do PetDots — linguagem, estrutura de
  repositório, backend, banco, ORM, contrato de API, autenticação, cliente
  mobile+web, jobs, storage e observabilidade — alinhada ao domínio
  Pet/Tutor/Timeline, ao MVP (Fase 1) e aos princípios de simplicidade,
  API-first e AI-first. Desbloqueia a camada de arquitetura técnica
  (docs/02-architecture/) e o início da implementação do MVP.
relates_to:
  - 02-architecture/TECHNOLOGY_STACK.md
  - 02-architecture/TECHNICAL_VISION.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
type: decision
---

# ADR-0002: Stack tecnológica de fundação do PetDots

## Contexto

A camada de arquitetura técnica (`docs/02-architecture/`) está inteiramente em
stubs `planned` e é o **gargalo** atual do projeto: o `AGENTS.md` proíbe assumir
tecnologias enquanto `TECHNOLOGY_STACK.md` não existir, e o `PROJECT_STATE`
registra que **nenhuma decisão de stack foi tomada**. Sem ela, nenhuma
implementação pode começar com segurança.

O [ADR-0001](./0001-refundacao-ecossistema-ai-first.md) já fixou que engenharia
e stack são decididas **depois** que o domínio estabiliza e **partem de um
modelo de domínio limpo**. O domínio está estável: o `DOMAIN_MODEL` centra-se em
Pet / Tutor / Timeline (agregados-raiz Pet, Tutor, Parceiro; PKs UUID; Pet ID
imutável; Tutor dono dos dados; eventos `domain.action`), e o `MVP_SCOPE`
delimita a Fase 1 — o Tutor gerindo a vida do pet (cadastro, Timeline, Carteira
Digital, lembretes, autenticação, exportação do histórico).

Forças e restrições em jogo:

- **Premissas de produto travadas para esta decisão:** o MVP entrega **mobile +
  web** (paridade desde o início); a **prioridade primária** da escolha é
  **simplicidade e legibilidade para agentes de IA** — o PetDots é AI-first, a
  documentação é a fonte-da-verdade e o produto é construído majoritariamente
  com agentes.
- **Princípios vinculantes:** Modular Monolith, API-First (REST, recursos não
  verbos), nunca microserviços sem justificativa, **nunca otimizar
  prematuramente / não adicionar infraestrutura antecipadamente**, "Tutor é dono
  dos dados" (LGPD). Anti-princípio explícito: **não adotar tecnologia por
  tendência de mercado**.
- **O marketplace legado é referência, não herança.** O legado (NestJS 11 +
  Prisma 6 + PostgreSQL; Next.js; Expo/React Native; monorepo Turborepo)
  comprova capacidade técnica, mas o ADR-0001 **proíbe minerar ou portar** seu
  código (risco de contaminação de modelo). Nota relevante: o legado usava
  **Next.js separado** para a web — portanto um cliente **universal mobile+web
  nunca foi validado** por ele.

A decisão foi conduzida por um painel de propostas de stack independentes
(ângulos: simplicidade radical, legibilidade-IA, provado-enxugado, máximo
compartilhamento) submetidas a **crítica adversarial** contra nove critérios:
aderência aos princípios, legibilidade-IA, fit de domínio, API-first,
multicliente consistente, escala sem complexidade, LGPD/ownership, realidade de
um time solo e custo de reversão. As conclusões foram fortemente convergentes
no núcleo e expuseram um único eixo de alto risco (o cliente universal).

## Decisão

Adota-se a seguinte stack de fundação. Cada eixo respeita "a solução mais
simples capaz de resolver o problema atual" e adia complexidade até haver
necessidade comprovada.

1. **Linguagem:** TypeScript de ponta a ponta (backend, web, mobile, contratos).
2. **Estrutura:** monorepo com workspaces e pacotes compartilhados de
   **domínio** e **contratos**. Turborepo é orquestrador opcional, não
   obrigatório no MVP.
3. **Backend:** **NestJS**, Modular Monolith, **um módulo por agregado**
   (Pet, Tutor, Parceiro-stub) mais módulos de suporte (auth, notifications).
   Sem microserviços.
4. **Banco:** **PostgreSQL único.** Recursos avançados (JSONB, full-text search,
   `pgvector`) são absorvidos pelo próprio Postgres antes de qualquer datastore
   adicional. **Broker, fila, cache ou novo datastore exigem ADR.**
5. **ORM:** **Prisma.** O `schema.prisma` é reescrito do zero **a partir do
   `DOMAIN_MODEL`** (não do legado), ~1:1 com as entidades; PKs UUID sustentam o
   Pet ID imutável. `$queryRaw` é o escape hatch para SQL fino sem trocar de ORM.
6. **Contrato de API:** **REST** (recursos no plural, métodos HTTP semânticos,
   `/api/v1`, JSON camelCase — `AI_CODING_RULES`). **Zod** é a fonte única de
   validação na borda; o **OpenAPI é publicado como contrato canônico de
   fronteira** (artefato de primeira classe, com **teste de contrato no CI**
   contra drift). O mecanismo concreto de geração do OpenAPI é detalhe de baixa
   reversibilidade a fechar no `TECHNOLOGY_STACK`.
7. **Auth/AuthZ:** **autenticação própria** — JWT (access + refresh), hashing
   **argon2**, Google OAuth. A identidade vive **no nosso Postgres** (soberania
   sobre dados de saúde sensíveis + princípio "Tutor é dono dos dados").
   Autorização por **RBAC + ownership por instância** derivado do vínculo
   `pet_tutors` (papel primário vs. autorizado). Auditoria via interceptor.
8. **Jobs / lembretes:** **cron in-process** (scheduler do Nest) com **advisory
   lock** no Postgres para idempotência, apoiado por tabela de jobs/outbox.
   BullMQ/Redis só com ADR, quando houver múltiplas réplicas. Um **lembrete
   cumprido gera um Evento na Timeline** — é transição de estado de domínio, não
   apenas um job.
9. **Storage (Carteira Digital):** **S3** (ou compatível) com **presigned
   URLs**; o backend fica fora do caminho do byte. Escopo, expiração e
   `content-type` explícitos por URL.
10. **Observabilidade:** **OpenTelemetry** (vendor-neutral) exportando para um
    serviço gerenciado; sem operar Prometheus/Grafana/Loki próprios no MVP.
11. **Testes:** unit + integração com Postgres efêmero (ex.: Testcontainers);
    contrato OpenAPI coberto por teste.
12. **Cliente mobile+web — decisão condicionada:** cliente **universal Expo +
    React Native (+ React Native Web)**, servindo iOS/Android/Web de um só
    código, **condicionado a um spike de validação obrigatório como
    pré-requisito** antes de construir a UI de produto. O spike valida as telas
    de maior risco — Timeline densa, viewer de documento, layout e usabilidade
    de **desktop**, acessibilidade. **Fallback nomeado:** se o spike reprovar,
    separa-se em **Expo (mobile) + Next.js (web)** compartilhando os pacotes de
    **domínio/contratos/lógica** (não a UI). Para preservar essa saída, os
    `packages/` de domínio e contratos nascem isolados da camada de UI desde o
    primeiro commit.

**Compromissos transversais (parte da decisão):**

- **LGPD como invariante de primeira classe.** A exclusão respeita retenção
  legal (**soft-delete/tombstone**, não DELETE físico); a **exportação** do
  Histórico (Timeline + Carteira Digital) é critério de **saída** do MVP;
  consentimento de compartilhamento e minimização de dados são modelados
  explicitamente.
- **Resolver "tutor primário vs. autorizado"** (questão em aberto no
  `DOMAIN_MODEL`) **antes** de desenhar a autorização fina — é pré-requisito do
  guard de ownership.
- **Modelagem das especializações de Parceiro** (herança vs. tabela-por-tipo vs.
  roles) permanece em aberto; Parceiros são Fase 2, então a decisão é adiável,
  mas fica **sinalizada** por ter alto custo de reversão em Prisma.
- **Anti-contaminação.** O legado é referência de capacidade, não fonte de
  código: schema, enums e interceptors são **re-derivados do `DOMAIN_MODEL`**;
  nada é copiado do marketplace (ADR-0001).
- **Disciplina de módulos.** O MVP tem três agregados; a **Timeline é projeção
  de Eventos**, não um agregado/módulo de primeira classe. Evitar
  over-modularização.

## Alternativas consideradas

### (a) Dois clientes separados desde o início (Expo + Next.js)

**Por que preterida (como default):** maximiza a duplicação de UI para um time
solo e contraria a premissa travada "mobile+web juntos + simplicidade". Mantida,
porém, como **fallback explícito** do spike-gate do cliente universal.

**Trade-off registrado:** entrega web idiomática e menor risco/maior
reversibilidade, ao custo de duplicar a camada de apresentação.

### (b) tRPC como contrato de API

**Por que preterida:** é RPC (procedures, não recursos), acopla cliente-servidor
em TypeScript e fecha a porta a clientes não-TS (Portal Empresas e APIs de
parceiros, Fase 3), violando o princípio API-First (#13) e o `AI_CODING_RULES`
(substantivos, plural, métodos HTTP semânticos).

**Trade-off registrado:** abre-se mão da ergonomia de tipos end-to-end "grátis"
em favor de um contrato HTTP padrão e portável.

### (c) ts-rest como espinha do contrato

**Por que preterida (como pilar):** lib de nicho, baixa densidade de exemplos em
corpus de treino (pior legibilidade-IA, justamente o eixo prioritário), com
OpenAPI **derivado** e não fonte ("REST de fachada") — concentra risco no eixo
mais crítico.

**Trade-off registrado:** abre-se mão de DX TS-first em favor de um OpenAPI
canônico mais "boring", estável e de fronteira clara para terceiros.

### (d) IdP gerenciado (Clerk / Auth0 / Supabase Auth)

**Por que preterida:** terceirizar a identidade de dados de saúde sensíveis
conflita com a soberania de dados ("Tutor é dono dos dados") e adiciona
dependência de fornecedor sobre o núcleo de confiança.

**Trade-off registrado:** aceita-se a **carga perpétua de segurança** do auth
próprio (rotação/revogação de chave, recuperação de acesso) em troca de
soberania de dados e maior legibilidade do fluxo.

### (e) Reconsiderar linguagem/ORM do zero (backend não-TS; Drizzle/Kysely)

**Por que preterida:** múltiplas linguagens violam simplicidade e legibilidade-IA;
o `schema.prisma` é declarativo e ~1:1 com o domínio, com altíssima densidade de
corpus. Query-builders dariam mais controle de SQL, mas a um custo de
previsibilidade.

**Trade-off registrado:** menos controle fino de SQL por padrão, mitigado por
`$queryRaw` sem troca de ORM.

### (f) Microserviços / event-driven desde já

**Por que preterida:** o `AGENTS.md` proíbe sem justificativa explícita e seria
otimização prematura. O Modular Monolith entrega as fronteiras de domínio sem o
custo operacional distribuído.

**Trade-off registrado:** eventual extração de serviços (se a escala exigir) será
um trabalho futuro, deliberadamente adiado.

## Consequências

**Positivas:**

- Núcleo "boring" e previsível, massivamente representado em corpus de LLM →
  loop gerar→ler→corrigir confiável, servindo diretamente o AI-first.
- Uma linguagem, um banco, contratos tipados de ponta a ponta → baixa carga
  cognitiva para um time solo, sem drift entre validação, tipos e documentação.
- Infra adiada com gatilhos de ADR → respeita "nunca otimizar prematuramente";
  custo operacional mínimo no MVP.
- API-First preservado (REST + OpenAPI canônico) → caminho aberto para Portal
  Empresas e parceiros (Fase 3) sem reescrever contratos.
- Ownership e LGPD tratados como regra de domínio, com soberania de dados via
  auth próprio.
- Máximo compartilhamento mobile+web alinhado à premissa, **com válvula de
  segurança** (spike-gate + fallback) que honra "validar a hipótese antes de
  aumentar a complexidade".

**Negativas / riscos:**

- **O cliente universal é o maior risco e o de menor reversibilidade.** O React
  Native Web pode entregar uma web "funcional, não excelente"; reverter para
  Next.js significaria reescrever a árvore de UI. **Mitigação:** spike-gate
  obrigatório como pré-requisito, fallback nomeado e `packages/` de
  domínio/contratos isolados desde o início.
- **Auth próprio = backlog de segurança perpétuo** sobre o time solo (rotação e
  revogação de chave, recuperação de acesso, e Sign in with Apple se houver
  login social em loja). Aceito conscientemente em troca de soberania.
- **OpenAPI gerado pode derivar do código** sem disciplina → mitigado por teste
  de contrato no CI.
- **Tooling do monorepo** (Metro + Expo + Nest) pode quebrar web e mobile juntos
  em upgrades de SDK → risco operacional concentrado; mitigado por manter a
  superfície mínima e pelo fallback.
- **Questões de domínio em aberto** (tutor primário; modelagem de Parceiro)
  precisam ser fechadas no momento certo para não gerar retrabalho de
  schema/autorização.

## Status

`Accepted` — 2026-06-27
