---
title: "Re-fundação AI-first do PetDots — Estrutura da Documentação"
status: draft
version: 1.0
updated: 2026-06-27
scope: >
  Define o modelo de operação AI-first do PetDots, a arquitetura de informação
  da documentação, a convenção de metadados, o plano de correção dos docs
  existentes e os documentos prioritários a criar. NÃO cobre scaffold de código
  nem a escolha de stack tecnológica.
relates_to: [AGENTS.md, docs/README.md, PROJECT_STATE.md, PRODUCT_VISION.md]
type: design-spec
---

# Re-fundação AI-first do PetDots — Estrutura da Documentação

## 1. Contexto e problema

Uma auditoria completa da documentação (2026-06-27) revelou que o PetDots
tinha uma **arquitetura de informação ambiciosa** (taxonomia `00→06`) e
**alguns documentos de fundação excelentes**, mas montados sobre duas
contradições não resolvidas e muito esqueleto vazio:

- **Contradição de escopo:** docs estratégicos descrevem um *ecossistema*
  ("toda a vida do pet"), enquanto o `README` raiz e o código descreviam um
  *marketplace de petshops same-day*.
- **Contradição de estado:** `PROJECT_STATE`/`AI_CONTEXT` declaravam
  "desenvolvimento não iniciado / planejamento", mas o HEAD do Git continha um
  marketplace completo (NestJS + Prisma + ~20 migrations + auth + catálogo).
- **70% dos arquivos vazios:** 31 dos 44 `.md` são placeholders de 0 byte
  (clusters `02`, `03`, `04` inteiros; `06` inteiro; 4/5 de `05-ai`).
- **`PRODUCT_ROADMAP.md` é cópia byte-a-byte do `BUSINESS_MODEL.md`** (md5
  idêntico) — não existe roadmap real.
- **Cinco listas divergentes de "fonte da verdade"** (AGENTS, PROJECT_CONTEXT,
  docs/README, PRODUCT_PRINCIPLES, AI_CONTEXT).
- **Metadados obrigatórios violados por 100% dos docs** (o próprio `docs/README`
  exige Escopo/Data/Relação, e nenhum doc cumpre).

O estado do Git esclarece a intenção: o working tree da branch `feat/ai-first`
**apaga todo o marketplace** (`apps/`, `packages/`, `turbo.json`,
`docker-compose.yml`, `package.json` — 307 deleções) e o substitui por um
esqueleto de documentação. É uma **re-fundação guiada por documentação**.

## 2. Decisões fundamentais (confirmadas com o usuário)

| # | Decisão | Escolha |
|---|---|---|
| D1 | Direção | **Greenfield no ecossistema.** A visão "toda a vida do pet" vence; o marketplace antigo é referência histórica no Git, não é minerado. |
| D2 | Escopo desta iniciativa | **Sistema AI-first + correção dos docs + docs prioritários** (ADR-0001, DOMAIN_MODEL, roadmap real, SUCCESS_METRICS, MVP_SCOPE). Sem scaffold de código. |
| D3 | Modelo AI-first | **Docs-SSOT leve.** Documentação como fonte única da verdade + carta de agente; **sem pipeline formal prescrito** (SDD/Compozy ficam para depois). |
| D4 | Carta de agente | **`AGENTS.md` canônico (tool-agnostic) + `CLAUDE.md` fino** que apenas referencia o AGENTS.md. |
| D5 | Arquivos vazios | **Stubs honestos:** frontmatter com `status: planned` + Objetivo de uma linha, em vez de 0 byte. |
| D6 | Fronteira da entrega | **Design → spec → plano.** A execução (aplicar correções + escrever docs prioritários) é um passo seguinte, aprovado à parte. |

Estas decisões **colapsam as cinco contradições** numa única narrativa:
*PetDots é um ecossistema pet, em fase de fundação greenfield, cuja
documentação lidera a construção.*

## 3. Princípios da documentação AI-first

1. **Docs são a fonte única da verdade** — o produto nasce dos docs; o código os segue.
2. **Cada documento responde a UMA pergunta** — sem sobreposição.
3. **Referenciar, não duplicar** — conteúdo compartilhado mora em um lugar e é linkado.
4. **Machine-readable onde conta** — frontmatter YAML em todo doc.
5. **Honestidade de estado** — nada de placeholder que finge cobertura; `status` explícito.
6. **Proporcionalidade** — profundidade acompanha a maturidade da fase (domínio antes de engenharia/API).

## 4. Arquitetura de informação

Mantém-se a taxonomia de 7 clusters (é boa). Correções estruturais:

```text
docs/
├── README.md            # índice fiel + convenções + ordem de leitura + fonte da verdade única
├── 00-foundation/       # identidade (estável)
├── 01-product/          # o quê / para quem (funcional)
├── 02-architecture/     # como é construído
├── 03-engineering/      # como trabalhamos no código
├── 04-api/              # contratos
├── 05-ai/               # camada de operação do agente (keystone AI-first)
├── 06-decisions/        # ADRs + DECISION_LOG (ÚNICO lugar de ADR)
└── _templates/          # esqueletos por tipo de doc
```

Correções pontuais:
- `ADR/` passa a existir **somente** em `06-decisions` (hoje duplicado em `02`).
- `AI_BOOTSTRAP.md` sai de `01-product` → seu papel ("comece aqui" do agente) é **absorvido pelo `AI_CONTEXT.md`** e o arquivo é removido (evita sobreposição de responsabilidade).
- `docs/README.md` reescrito: índice lista **todos** os arquivos reais com seu `status`; a árvore ASCII mostra arquivos; a ordem de leitura não aponta para docs `planned` sem sinalizá-los.

## 5. Camada de operação do agente (coração do AI-first)

### 5.1 `AGENTS.md` (raiz, canônico)
Mantém a estrutura atual (boa) e **corrige**:
- Remove o gate obsoleto "enquanto TECHNOLOGY_STACK.md não existir".
- Remove "nunca modelar tabelas antes do DOMAIN_MODEL" como regra absoluta → reformula como "o DOMAIN_MODEL precede a modelagem de dados nesta fundação greenfield".
- Substitui a lista própria de fonte-da-verdade por **um link** para a lista canônica única (§7).
- Aponta o agente para `docs/05-ai/AI_CONTEXT.md` como entrada.

### 5.2 `CLAUDE.md` (raiz, fino)
Arquivo curto cujo único papel é: *"Este projeto usa `AGENTS.md` como carta de
agente. Leia-o primeiro."* — para o Claude Code carregar o contexto
automaticamente sem duplicar conteúdo.

### 5.3 `docs/05-ai/` — papéis distintos (sem sobreposição)
| Arquivo | Pergunta que responde |
|---|---|
| `AI_CONTEXT.md` | Qual o contexto mínimo para um agente começar? (corrigido: greenfield, sem a frase "não existe implementação") |
| `AI_DOMAIN_KNOWLEDGE.md` | Que conhecimento de domínio destilado o agente precisa? (derivado de DOMAIN_MODEL + GLOSSARY) |
| `AI_ARCHITECTURE_RULES.md` | Que guardrails arquiteturais a IA deve respeitar ao propor design? |
| `AI_CODING_RULES.md` | Que regras de código a IA aplica? (derivado de NAMING + CODING_STANDARDS) |
| `AI_DEVELOPMENT_GUIDE.md` | Como o agente trabalha aqui? **Forma de trabalho leve:** ler contexto → propor → validar vs. princípios → implementar → atualizar docs/DECISION_LOG. **Não** é um pipeline pesado. |

## 6. Convenção de metadados (frontmatter YAML)

Todo documento passa a abrir com:

```yaml
---
title: <Título legível>
status: stable | draft | planned
version: <semver simples, ex. 1.0>
updated: <YYYY-MM-DD>
scope: <o que entra e o que não entra>
relates_to: [<docs relacionados>]
type: foundation | product | architecture | engineering | api | ai | decision | design-spec
---
```

Isso satisfaz a regra do `docs/README` (Título, Objetivo via `scope`, Data,
Versão, Relação) **e** torna o doc parseável por agentes. Substitui o bloco
`> Versão / Status` atual.

## 7. Fonte da verdade única

Uma só hierarquia, definida **uma vez** em `docs/README.md` e *linkada* nos
demais (AGENTS, AI_CONTEXT, PRODUCT_PRINCIPLES deixam de redefinir):

```text
1. PRODUCT_PRINCIPLES.md
2. PRODUCT_VISION.md
3. BUSINESS_MODEL.md
4. PRODUCT_ROADMAP.md
5. DOMAIN_MODEL.md
6. demais documentos
```

## 8. Plano de correção dos docs existentes

| Documento | Ação |
|---|---|
| `PROJECT_STATE.md` | Reescrever para a verdade greenfield-ecossistema: marketplace antigo = referência; backlog fiel ao disco; próximo doc = ADR-0001 → DOMAIN_MODEL. |
| `README.md` (raiz) | Substituir o setup de marketplace/Turborepo (inexistente) por um README de ecossistema; seção de setup marcada "a definir após escolha de stack". O setup antigo vira nota de referência histórica. |
| `PRODUCT_ROADMAP.md` | Substituir a duplicata por roadmap real (doc prioritário, §9). |
| `AGENTS.md` | Correções da §5.1. |
| `docs/README.md` | Índice fiel, ADR só em `06`, ordem de leitura honesta, adotar frontmatter, fonte-da-verdade única (§7). |
| `AI_CONTEXT.md` | Remover "ainda não existe implementação"; apontar para a lista única; frontmatter. |
| `PERSONAS.md` | Reconciliar a tabela "Priorização" (4 níveis) com a "Jornada de Evolução" (6 fases) e com a ordem do AI_CONTEXT. |
| `GLOSSARY.md` | Remover a decisão "Modular Monolith" (vai para ADR/arquitetura); manter linguagem ubíqua; frontmatter. |
| `NAMING_CONVENTIONS.md` | Alinhar prefixo de branch `feature/` → `feat/` (prática real); frontmatter. |
| `PRODUCT_VISION`, `PRODUCT_PRINCIPLES`, `BUSINESS_MODEL` | Apenas adicionar frontmatter e remover redeclarações de fonte-da-verdade/visão (referenciar). |
| Demais 0-byte | Converter em stub honesto (`status: planned` + Objetivo). |

## 9. Documentos prioritários a criar (em ordem)

1. **`docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md`** +
   **template de ADR** + seed do `DECISION_LOG.md`.
   - Contexto (pivô: marketplace no HEAD × árvore esvaziada); Decisão (PetDots =
     ecossistema; código antigo = referência; modelo Docs-SSOT leve; fonte-da-verdade
     única); Consequências; Status `Accepted`, data 2026-06-27.
2. **`docs/01-product/DOMAIN_MODEL.md`** — keystone.
   - Entidades centrais (Pet, Tutor, Timeline, Evento, Carteira Digital,
     Parceiro...), agregados, relacionamentos, ownership de dados, eventos de
     domínio. Consistente com `GLOSSARY`. Centrado no Pet (não em Store/Order).
3. **`docs/00-foundation/PRODUCT_ROADMAP.md`** — fases reais alinhadas à
   "Jornada de Evolução" das personas.
4. **`docs/00-foundation/SUCCESS_METRICS.md`** — North Star + métricas por fase
   (recorrência, ativação, efeito de rede) derivadas do BUSINESS_MODEL.
5. **`docs/01-product/MVP_SCOPE.md`** — o que entra/não entra no primeiro
   recorte (provável: Tutor + gestão da vida do pet), in/out explícitos.

## 10. Templates e stubs

- `docs/_templates/` com esqueletos por tipo: `foundation.md`, `product.md`,
  `architecture.md`, `adr.md` — todos com o frontmatter da §6 e seções padrão.
- Stubs `planned` seguem o template, com corpo mínimo: `## Objetivo` + nota
  "🚧 Pendente — ver PRODUCT_ROADMAP".

## 11. Fora de escopo (YAGNI)

- Scaffold de código (`backend/`, `frontend/`, `mobile/`, `infrastructure/`).
- `TECHNOLOGY_STACK.md` (vem depois de domínio + arquitetura).
- Pipeline SDD / Compozy.
- Conteúdo de `03-engineering` e `04-api` (ficam `planned`).
- Decisão de stack tecnológica.

## 12. Critérios de sucesso (Definition of Done do design)

- As cinco contradições do relatório de auditoria deixam de existir (uma
  narrativa única: ecossistema greenfield).
- `find docs -name '*.md' -size 0` retorna **zero** (sem placeholders 0-byte).
- Existe **uma** lista de fonte-da-verdade; as outras quatro foram substituídas
  por links.
- 100% dos docs com frontmatter válido.
- `PRODUCT_ROADMAP` ≠ `BUSINESS_MODEL` (md5 distinto).
- Um agente que lê `AGENTS.md` → `AI_CONTEXT.md` → docs linkados consegue
  responder "o que é o PetDots, em que estado está e o que fazer a seguir" sem
  contradição.

## 13. Sequenciamento da execução (passo seguinte, aprovado à parte)

1. Fundação do sistema: frontmatter + `docs/README` + AGENTS/CLAUDE + fonte-da-verdade única.
2. ADR-0001 + template de ADR + DECISION_LOG seed.
3. Correções dos docs de fundação/produto existentes (§8).
4. Stubs honestos para todos os vazios.
5. Docs prioritários: DOMAIN_MODEL → PRODUCT_ROADMAP → SUCCESS_METRICS → MVP_SCOPE.
6. Preencher `05-ai` (AI_CONTEXT corrigido, AI_DOMAIN_KNOWLEDGE, AI_*_RULES, AI_DEVELOPMENT_GUIDE).
