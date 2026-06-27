---
title: PetDots Documentation
status: stable
version: 2.0
updated: 2026-06-27
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

---

## Estrutura

```text
docs/
├── README.md                         (este arquivo — índice mestre)
│
├── 00-foundation/
│   ├── PRODUCT_PRINCIPLES.md         (stable)
│   ├── PRODUCT_VISION.md             (stable)
│   ├── BUSINESS_MODEL.md             (stable)
│   ├── GLOSSARY.md                   (stable)
│   ├── NAMING_CONVENTIONS.md         (stable)
│   ├── PRODUCT_ROADMAP.md            (draft)
│   ├── PROJECT_MANIFESTO.md          (planned)
│   └── SUCCESS_METRICS.md            (planned)
│
├── 01-product/
│   ├── PERSONAS.md                   (draft)
│   ├── DOMAIN_MODEL.md               (planned)
│   ├── CAPABILITIES.md               (planned)
│   ├── FEATURE_CATALOG.md            (planned)
│   ├── MVP_SCOPE.md                  (planned)
│   └── USER_JOURNEYS.md              (planned)
│
├── 02-architecture/
│   ├── TECHNICAL_VISION.md           (planned)
│   ├── ARCHITECTURAL_PRINCIPLES.md   (planned)
│   ├── SYSTEM_ARCHITECTURE.md        (planned)
│   ├── QUALITY_ATTRIBUTES.md         (planned)
│   └── TECHNOLOGY_STACK.md           (planned)
│
├── 03-engineering/
│   ├── DEVELOPMENT_GUIDE.md          (planned)
│   ├── CODING_STANDARDS.md           (planned)
│   ├── GIT_WORKFLOW.md               (planned)
│   ├── TESTING_STRATEGY.md           (planned)
│   ├── SECURITY.md                   (planned)
│   ├── OBSERVABILITY.md              (planned)
│   └── DEPLOYMENT.md                 (planned)
│
├── 04-api/
│   ├── API_GUIDELINES.md             (planned)
│   ├── AUTHENTICATION.md             (planned)
│   ├── ERROR_MODEL.md                (planned)
│   └── VERSIONING.md                 (planned)
│
├── 05-ai/
│   ├── AI_CONTEXT.md                 (draft)
│   ├── AI_DEVELOPMENT_GUIDE.md       (planned)
│   ├── AI_ARCHITECTURE_RULES.md      (planned)
│   ├── AI_CODING_RULES.md            (planned)
│   └── AI_DOMAIN_KNOWLEDGE.md        (planned)
│
├── 06-decisions/
│   ├── DECISION_LOG.md               (planned)
│   └── ADR/README.md                 (planned)
│
└── _templates/
    ├── foundation.md
    ├── product.md
    └── adr.md
```

Legenda de status:
- `stable` — conteúdo revisado e aprovado
- `draft` — rascunho em progresso, pode mudar
- `planned` — arquivo criado mas ainda sem conteúdo

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
| [PRODUCT_ROADMAP.md](00-foundation/PRODUCT_ROADMAP.md) | draft |
| [PROJECT_MANIFESTO.md](00-foundation/PROJECT_MANIFESTO.md) | planned |
| [SUCCESS_METRICS.md](00-foundation/SUCCESS_METRICS.md) | planned |

### 01-product — Documentação Funcional

Define comportamento esperado do sistema, personas e jornadas.

| Arquivo | Status |
|---|---|
| [PERSONAS.md](01-product/PERSONAS.md) | draft |
| [DOMAIN_MODEL.md](01-product/DOMAIN_MODEL.md) | planned |
| [CAPABILITIES.md](01-product/CAPABILITIES.md) | planned |
| [FEATURE_CATALOG.md](01-product/FEATURE_CATALOG.md) | planned |
| [MVP_SCOPE.md](01-product/MVP_SCOPE.md) | planned |
| [USER_JOURNEYS.md](01-product/USER_JOURNEYS.md) | planned |

### 02-architecture — Arquitetura do Sistema

Define como o sistema é construído. Não contém regras de negócio.

| Arquivo | Status |
|---|---|
| [TECHNICAL_VISION.md](02-architecture/TECHNICAL_VISION.md) | planned |
| [ARCHITECTURAL_PRINCIPLES.md](02-architecture/ARCHITECTURAL_PRINCIPLES.md) | planned |
| [SYSTEM_ARCHITECTURE.md](02-architecture/SYSTEM_ARCHITECTURE.md) | planned |
| [QUALITY_ATTRIBUTES.md](02-architecture/QUALITY_ATTRIBUTES.md) | planned |
| [TECHNOLOGY_STACK.md](02-architecture/TECHNOLOGY_STACK.md) | planned |

### 03-engineering — Guia de Engenharia

Padrões e práticas utilizados durante o desenvolvimento.

| Arquivo | Status |
|---|---|
| [DEVELOPMENT_GUIDE.md](03-engineering/DEVELOPMENT_GUIDE.md) | planned |
| [CODING_STANDARDS.md](03-engineering/CODING_STANDARDS.md) | planned |
| [GIT_WORKFLOW.md](03-engineering/GIT_WORKFLOW.md) | planned |
| [TESTING_STRATEGY.md](03-engineering/TESTING_STRATEGY.md) | planned |
| [SECURITY.md](03-engineering/SECURITY.md) | planned |
| [OBSERVABILITY.md](03-engineering/OBSERVABILITY.md) | planned |
| [DEPLOYMENT.md](03-engineering/DEPLOYMENT.md) | planned |

### 04-api — Contratos de API

Padronização de APIs, contratos e convenções.

| Arquivo | Status |
|---|---|
| [API_GUIDELINES.md](04-api/API_GUIDELINES.md) | planned |
| [AUTHENTICATION.md](04-api/AUTHENTICATION.md) | planned |
| [ERROR_MODEL.md](04-api/ERROR_MODEL.md) | planned |
| [VERSIONING.md](04-api/VERSIONING.md) | planned |

### 05-ai — Contexto para Agentes de IA

Documentação específica para agentes de IA compreenderem o projeto.

| Arquivo | Status |
|---|---|
| [AI_CONTEXT.md](05-ai/AI_CONTEXT.md) | draft |
| [AI_DEVELOPMENT_GUIDE.md](05-ai/AI_DEVELOPMENT_GUIDE.md) | planned |
| [AI_ARCHITECTURE_RULES.md](05-ai/AI_ARCHITECTURE_RULES.md) | planned |
| [AI_CODING_RULES.md](05-ai/AI_CODING_RULES.md) | planned |
| [AI_DOMAIN_KNOWLEDGE.md](05-ai/AI_DOMAIN_KNOWLEDGE.md) | planned |

### 06-decisions — Registro de Decisões

Registro permanente de decisões importantes. Architecture Decision Records (ADRs) vivem exclusivamente aqui — ver árvore acima.

| Arquivo | Status |
|---|---|
| [DECISION_LOG.md](06-decisions/DECISION_LOG.md) | planned |
| ADR index (ver árvore) | planned |

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
type: foundation         # foundation | product | adr
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

Documentos marcados com `(planned)` ainda não têm conteúdo — leia os disponíveis primeiro.

1. [PRODUCT_PRINCIPLES.md](00-foundation/PRODUCT_PRINCIPLES.md) — stable
2. [PRODUCT_VISION.md](00-foundation/PRODUCT_VISION.md) — stable
3. [BUSINESS_MODEL.md](00-foundation/BUSINESS_MODEL.md) — stable
4. [PRODUCT_ROADMAP.md](00-foundation/PRODUCT_ROADMAP.md) — draft
5. [GLOSSARY.md](00-foundation/GLOSSARY.md) — stable
6. [PERSONAS.md](01-product/PERSONAS.md) — draft
7. [AI_CONTEXT.md](05-ai/AI_CONTEXT.md) — draft
8. [DOMAIN_MODEL.md](01-product/DOMAIN_MODEL.md) — planned
9. [SYSTEM_ARCHITECTURE.md](02-architecture/SYSTEM_ARCHITECTURE.md) — planned
10. [DEVELOPMENT_GUIDE.md](03-engineering/DEVELOPMENT_GUIDE.md) — planned
