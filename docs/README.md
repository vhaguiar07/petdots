---
title: PetDots Documentation
status: stable
version: 2.8
updated: 2026-09-11
scope: >
  Índice mestre da documentação do PetDots. Define a estrutura completa,
  a ordem de fonte da verdade canônica e as convenções obrigatórias de
  todos os documentos. Esta é a única definição da hierarquia de autoridade
  no repositório; demais docs referenciam esta seção.
relates_to:
  - 00-foundation/PRODUCT_PRINCIPLES.md
  - 00-foundation/PRODUCT_VISION.md
  - _templates/foundation.md
type: foundation
---

# PetDots Documentation

Índice mestre da documentação oficial do **PetDots** — ecossistema pet AI-first.

Toda decisão estratégica, funcional, arquitetural e técnica está documentada aqui.
A documentação tem a mesma importância que o código-fonte; em caso de divergência,
a documentação é revisada ou a implementação corrigida.

---

## Fonte da Verdade (Canônica)

> **Esta é a única definição da ordem de autoridade no repositório.
> Todos os demais documentos referenciam esta seção quando precisarem citar hierarquia.**

Quando dois documentos divergirem, prevalece o de maior autoridade na ordem abaixo:

```
PRODUCT_PRINCIPLES > PRODUCT_VISION > BUSINESS_MODEL > PRODUCT_ROADMAP > DOMAIN_MODEL > demais
```

**Documento marcado como `outdated` não exerce autoridade** até ser
re-sincronizado — a posição dele na ordem acima vale para o conteúdo vigente,
não para conteúdo que já se declara defasado. Enquanto houver um `outdated` na
cadeia, o documento imediatamente abaixo prevalece, e a defasagem é item de
[`BACKLOG`](07-process/BACKLOG.md).

**ADR aceito é decisão, não documento de referência:** quando um ADR aceito
contradiz qualquer documento desta ordem, o documento é que precisa ser
corrigido — foi o que motivou a `pd-07`.

---

## Estrutura

```text
docs/
├── README.md                         (este arquivo — índice mestre)
│
├── 00-foundation/
│   ├── PRODUCT_PRINCIPLES.md              (stable)
│   ├── PRODUCT_VISION.md                  (stable)
│   ├── BUSINESS_MODEL.md                  (stable)
│   ├── GLOSSARY.md                        (stable)
│   ├── NAMING_CONVENTIONS.md              (stable)
│   ├── PRODUCT_ROADMAP.md                 (stable)
│   ├── PROJECT_MANIFESTO.md               (draft)
│   └── SUCCESS_METRICS.md                 (draft)
│
├── 01-product/
│   ├── PERSONAS.md                        (stable)
│   ├── DOMAIN_MODEL.md                    (stable)
│   ├── CAPABILITIES.md                    (stable)
│   ├── FEATURE_CATALOG.md                 (stable)
│   ├── MVP_SCOPE.md                       (stable)
│   └── USER_JOURNEYS.md                   (stable)
│
├── 02-architecture/
│   ├── TECHNICAL_VISION.md                (stable)
│   ├── ARCHITECTURAL_PRINCIPLES.md        (draft)
│   ├── SYSTEM_ARCHITECTURE.md             (stable)
│   ├── QUALITY_ATTRIBUTES.md              (draft)
│   └── TECHNOLOGY_STACK.md                (stable)
│
├── 03-engineering/
│   ├── DEVELOPMENT_GUIDE.md               (stable)
│   ├── CODING_STANDARDS.md                (draft)
│   ├── GIT_WORKFLOW.md                    (draft)
│   ├── TESTING_STRATEGY.md                (draft)
│   ├── SECURITY.md                        (draft)
│   ├── OBSERVABILITY.md                   (draft)
│   └── DEPLOYMENT.md                      (draft)
│
├── 04-api/
│   ├── API_GUIDELINES.md                  (draft)
│   ├── AUTHENTICATION.md                  (draft)
│   ├── ERROR_MODEL.md                     (draft)
│   └── VERSIONING.md                      (draft)
│
├── 05-ai/
│   ├── AI_CONTEXT.md                      (stable)
│   ├── AI_DEVELOPMENT_GUIDE.md            (draft)
│   ├── AI_ARCHITECTURE_RULES.md           (draft)
│   ├── AI_CODING_RULES.md                 (draft)
│   └── AI_DOMAIN_KNOWLEDGE.md             (stable)
│
├── 06-decisions/
│   ├── DECISION_LOG.md                    (stable)
│   └── ADR/README.md                      (stable)
│
├── 07-process/
│   ├── README.md                          (stable)
│   ├── DIRETRIZES_FLUXO_IA.md             (stable)
│   ├── BACKLOG.md                         (stable)
│   ├── BUGS.md                            (stable)
│   ├── IDEIAS.md                          (stable)
│   └── relatorios-de-branch/README.md     (stable)
│
├── 08-features/
│   ├── waitlist/LISTA_DE_ESPERA.md        (stable)
│   ├── comparador/COMPARADOR_DE_PRECOS.md (stable)
│   ├── identity/IDENTIDADE_E_ACESSO.md    (stable)
│   └── tutors/PERFIL_DO_TUTOR_E_PETS.md   (stable)
│
└── _templates/
    ├── foundation.md                      (stable)
    ├── product.md                         (stable)
    ├── adr.md                             (stable)
    ├── relatorio-branch.md                (stable)
    └── plano-fase1.md                     (stable)
```

Legenda de status:
- `stable` — conteúdo revisado e aprovado
- `draft` — rascunho em progresso, pode mudar
- `planned` — arquivo criado mas ainda sem conteúdo
- `outdated` — conteúdo defasado em relação ao estado atual; não usar como fonte
  sem conferir

Valores de `type`: `foundation` | `product` | `architecture` | `engineering` |
`api` | `ai` | `decision` | `design-spec` | `process`

---

## Clusters

### 00-foundation — Identidade do Projeto

Define a visão, princípios e modelo de negócio. Documentos com menor taxa de mudança.
São os de maior autoridade na hierarquia canônica.

| Arquivo | Status |
|---|---|
| [PRODUCT_PRINCIPLES.md](00-foundation/PRODUCT_PRINCIPLES.md) | stable |
| [PRODUCT_VISION.md](00-foundation/PRODUCT_VISION.md) | stable |
| [BUSINESS_MODEL.md](00-foundation/BUSINESS_MODEL.md) | stable |
| [GLOSSARY.md](00-foundation/GLOSSARY.md) | stable |
| [NAMING_CONVENTIONS.md](00-foundation/NAMING_CONVENTIONS.md) | stable |
| [PRODUCT_ROADMAP.md](00-foundation/PRODUCT_ROADMAP.md) | stable |
| [PROJECT_MANIFESTO.md](00-foundation/PROJECT_MANIFESTO.md) | draft |
| [SUCCESS_METRICS.md](00-foundation/SUCCESS_METRICS.md) | draft |

### 01-product — Documentação Funcional

Define comportamento esperado do sistema, personas e jornadas.

| Arquivo | Status |
|---|---|
| [PERSONAS.md](01-product/PERSONAS.md) | stable |
| [DOMAIN_MODEL.md](01-product/DOMAIN_MODEL.md) | stable |
| [CAPABILITIES.md](01-product/CAPABILITIES.md) | stable |
| [FEATURE_CATALOG.md](01-product/FEATURE_CATALOG.md) | stable |
| [MVP_SCOPE.md](01-product/MVP_SCOPE.md) | stable |
| [USER_JOURNEYS.md](01-product/USER_JOURNEYS.md) | stable |

### 02-architecture — Arquitetura do Sistema

Define como o sistema é construído. Não contém regras de negócio.

| Arquivo | Status |
|---|---|
| [TECHNICAL_VISION.md](02-architecture/TECHNICAL_VISION.md) | stable |
| [ARCHITECTURAL_PRINCIPLES.md](02-architecture/ARCHITECTURAL_PRINCIPLES.md) | draft |
| [SYSTEM_ARCHITECTURE.md](02-architecture/SYSTEM_ARCHITECTURE.md) | stable |
| [QUALITY_ATTRIBUTES.md](02-architecture/QUALITY_ATTRIBUTES.md) | draft |
| [TECHNOLOGY_STACK.md](02-architecture/TECHNOLOGY_STACK.md) | stable |

### 03-engineering — Guia de Engenharia

Padrões e práticas utilizados durante o desenvolvimento.

| Arquivo | Status |
|---|---|
| [DEVELOPMENT_GUIDE.md](03-engineering/DEVELOPMENT_GUIDE.md) | stable |
| [CODING_STANDARDS.md](03-engineering/CODING_STANDARDS.md) | draft |
| [GIT_WORKFLOW.md](03-engineering/GIT_WORKFLOW.md) | draft |
| [TESTING_STRATEGY.md](03-engineering/TESTING_STRATEGY.md) | draft |
| [SECURITY.md](03-engineering/SECURITY.md) | draft |
| [OBSERVABILITY.md](03-engineering/OBSERVABILITY.md) | draft |
| [DEPLOYMENT.md](03-engineering/DEPLOYMENT.md) | draft |

### 04-api — Contratos de API

Padronização de APIs, contratos e convenções.

| Arquivo | Status |
|---|---|
| [API_GUIDELINES.md](04-api/API_GUIDELINES.md) | draft |
| [AUTHENTICATION.md](04-api/AUTHENTICATION.md) | draft |
| [ERROR_MODEL.md](04-api/ERROR_MODEL.md) | draft |
| [VERSIONING.md](04-api/VERSIONING.md) | draft |

### 05-ai — Contexto para Agentes de IA

Documentação específica para agentes de IA compreenderem o projeto.

| Arquivo | Status |
|---|---|
| [AI_CONTEXT.md](05-ai/AI_CONTEXT.md) | stable |
| [AI_DEVELOPMENT_GUIDE.md](05-ai/AI_DEVELOPMENT_GUIDE.md) | draft |
| [AI_ARCHITECTURE_RULES.md](05-ai/AI_ARCHITECTURE_RULES.md) | draft |
| [AI_CODING_RULES.md](05-ai/AI_CODING_RULES.md) | draft |
| [AI_DOMAIN_KNOWLEDGE.md](05-ai/AI_DOMAIN_KNOWLEDGE.md) | stable |

### 06-decisions — Registro de Decisões

Registro permanente de decisões importantes. Architecture Decision Records (ADRs) vivem exclusivamente aqui — ver árvore acima.

| Arquivo | Status |
|---|---|
| [DECISION_LOG.md](06-decisions/DECISION_LOG.md) | stable |
| [Architecture Decision Records](06-decisions/) | stable |

---

### 07-process — Como o Trabalho Anda

Define o processo de trabalho com agentes de IA e guarda os registros vivos do
projeto. `AGENTS.md` define **comportamento**; esta camada define **processo**.

Diferente das camadas 00–06, que descrevem o **produto**, esta descreve o
**trabalho sobre o produto** — e seus arquivos mudam a cada entrega, não a cada
decisão de produto.

| Arquivo | O que é | Status |
|---|---|---|
| [README.md](07-process/README.md) | Índice da camada e as quatro regras que sustentam o resto | stable |
| [DIRETRIZES_FLUXO_IA.md](07-process/DIRETRIZES_FLUXO_IA.md) | As três fases, os portões, a recomendação de modelo, a numeração `pd-NN` | stable |
| [BACKLOG.md](07-process/BACKLOG.md) | Estoque de pendências reais, de onde saem as tarefas | stable |
| [BUGS.md](07-process/BUGS.md) | Bugs, em três seções por grau de confirmação | stable |
| [IDEIAS.md](07-process/IDEIAS.md) | Oportunidades sem dono nem prazo — deliberadamente fora do backlog | stable |
| [relatorios-de-branch/](07-process/relatorios-de-branch/) | O que foi feito em cada tarefa encerrada | stable |

---

### 08-features — O Que Já Está Implementado

A leitura **transversal** de cada feature entregue: banco → API → cliente numa
página só, mais o que a feature deliberadamente **não** faz e como operá-la.

Diferente das camadas 00–06, que descrevem o produto **pretendido**, esta
descreve o que **existe no código**. Um arquivo por feature, em
`08-features/<feature>/NOME_DA_FEATURE.md`; a camada nasceu na `pd-09`
(11/09/2026) junto com a primeira feature do MVP, exatamente como o gatilho no
backlog previa.

| Arquivo | O que é | Status |
|---|---|---|
| [waitlist/LISTA_DE_ESPERA.md](08-features/waitlist/LISTA_DE_ESPERA.md) | A captura do smoke test: tabela `waitlist_entries`, `POST /api/v1/waitlist-entries` e a landing pública | stable |
| [comparador/COMPARADOR_DE_PRECOS.md](08-features/comparador/COMPARADOR_DE_PRECOS.md) | O comparador público: `products`/`stores`/`delivery_areas`/`offers`, os quatro endpoints `GET` e as páginas `/precos` | stable |
| [identity/IDENTIDADE_E_ACESSO.md](08-features/identity/IDENTIDADE_E_ACESSO.md) | A autenticação: `users`/`refresh_tokens`, as cinco rotas de `/auth`, os guards globais e a sessão do cliente | stable |
| [tutors/PERFIL_DO_TUTOR_E_PETS.md](08-features/tutors/PERFIL_DO_TUTOR_E_PETS.md) | O perfil do tutor: `tutors`/`pets`, as sete rotas de `/tutors`, a posse por `404` e as quatro telas do onboarding | stable |

---

## Convenções

### Frontmatter obrigatório

Todo documento deve iniciar com um bloco YAML entre `---` contendo as chaves:

```yaml
---
title: ""
status: planned          # planned | draft | stable
version: 0.1
updated: YYYY-MM-DD
scope: >
  Uma frase descrevendo o escopo deste documento.
relates_to: []           # lista de caminhos relativos a docs/ relacionados
type: foundation         # foundation | product | architecture | engineering | api | ai | decision | design-spec
---
```

Use o validador para verificar um arquivo:

```bash
bash scripts/check-frontmatter.sh <arquivo.md>
```

### Templates

Os templates em [`_templates/`](_templates/) definem a estrutura base de cada tipo:

| Template | Uso |
|---|---|
| [_templates/foundation.md](_templates/foundation.md) | Documentos de 00-foundation |
| [_templates/product.md](_templates/product.md) | Documentos de 01-product a 04-api |
| [_templates/adr.md](_templates/adr.md) | Architecture Decision Records em 06-decisions |

### Princípios de qualidade

- Clareza e objetividade.
- Terminologia padronizada (ver [GLOSSARY.md](00-foundation/GLOSSARY.md) e [NAMING_CONVENTIONS.md](00-foundation/NAMING_CONVENTIONS.md)).
- Legível por humanos e interpretável por agentes de IA.
- Toda decisão arquitetural relevante registrada em ADR antes da implementação.
- A documentação evolui continuamente junto com o produto.

---

## Ordem de Leitura para Novos Colaboradores

Todas as camadas têm conteúdo (`draft` ou `stable`). Documentos `draft` podem
evoluir; leia na ordem abaixo para construir contexto do geral ao específico.

1. [PRODUCT_PRINCIPLES.md](00-foundation/PRODUCT_PRINCIPLES.md) — stable
2. [PRODUCT_VISION.md](00-foundation/PRODUCT_VISION.md) — stable
3. [BUSINESS_MODEL.md](00-foundation/BUSINESS_MODEL.md) — stable
4. [PRODUCT_ROADMAP.md](00-foundation/PRODUCT_ROADMAP.md) — stable
5. [GLOSSARY.md](00-foundation/GLOSSARY.md) — stable
6. [PERSONAS.md](01-product/PERSONAS.md) — stable
7. [AI_CONTEXT.md](05-ai/AI_CONTEXT.md) — stable
8. [DOMAIN_MODEL.md](01-product/DOMAIN_MODEL.md) — stable
9. [SYSTEM_ARCHITECTURE.md](02-architecture/SYSTEM_ARCHITECTURE.md) — stable
10. [DEVELOPMENT_GUIDE.md](03-engineering/DEVELOPMENT_GUIDE.md) — stable
