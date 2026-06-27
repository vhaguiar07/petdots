# Re-fundação AI-first do PetDots — Plano de Implementação (Documentação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar a documentação do PetDots para um modelo AI-first coerente (greenfield ecossistema), corrigindo contradições, padronizando metadados e criando os documentos prioritários.

**Architecture:** Documentação como fonte única da verdade, taxonomia `docs/00→06` mantida, carta de agente em `AGENTS.md` (+ `CLAUDE.md` fino), camada de operação do agente em `docs/05-ai`, metadados em frontmatter YAML. Sem pipeline SDD formal (Docs-SSOT leve).

**Tech Stack:** Markdown + YAML frontmatter. Verificação via shell (`find`, `grep`, `md5sum`) e um validador de frontmatter em Python (sem dependências externas).

**Spec de origem:** `docs/superpowers/specs/2026-06-27-refundacao-ai-first-docs-design.md`

## Verificação (adaptação para projeto de documentação)

Não há testes unitários. Cada task termina com **comandos de verificação determinísticos** e o resultado esperado. Onde o template pediria "teste falhando primeiro", a checagem de aceitação é declarada antes de escrever o doc, e roda APÓS a escrita confirmando o critério.

Validador de frontmatter reutilizável (criado na Task 1, usado em todas as demais):

```bash
# uso: bash scripts/check-frontmatter.sh <arquivo.md>
```

## Global Constraints

Toda task herda implicitamente o que segue (valores copiados verbatim do spec):

- **Frontmatter obrigatório em todo doc** com chaves: `title`, `status` (`stable|draft|planned`), `version`, `updated`, `scope`, `relates_to`, `type` (`foundation|product|architecture|engineering|api|ai|decision|design-spec`).
- **Data corrente:** `updated: 2026-06-27`.
- **Fonte da verdade única** (definida só no `docs/README.md`, linkada nos demais): `PRODUCT_PRINCIPLES > PRODUCT_VISION > BUSINESS_MODEL > PRODUCT_ROADMAP > DOMAIN_MODEL > demais`.
- **Domínio centrado em Pet/Tutor/Timeline** — nunca em Store/Product/Order (marketplace antigo = referência histórica).
- **Prefixos de branch:** `feat/ fix/ hotfix/ release/ docs/ refactor/` (o `NAMING_CONVENTIONS` será alinhado de `feature/` → `feat/`).
- **`ADR/` existe somente em `docs/06-decisions/`.**
- **Fora de escopo:** scaffold de código, `TECHNOLOGY_STACK.md`, pipeline SDD/Compozy, conteúdo de `03-engineering` e `04-api` (ficam `planned`).
- **Git (crítico):** o working tree tem **307 deleções não-commitadas** (a re-fundação). **NUNCA** usar `git add .` ou `git add -A`. Commitar **apenas** os caminhos listados em cada task. A estratégia para as 307 deleções (commit próprio antes? junto?) deve ser **confirmada com o usuário no início da execução** (Task 0).

---

### Task 0: Confirmar estratégia de Git e baseline

**Files:** nenhum (decisão operacional)

**Interfaces:**
- Produces: decisão sobre como tratar as 307 deleções (commit dedicado da re-fundação vs. manter unstaged durante o trabalho de docs).

- [ ] **Step 1: Mostrar o estado**

Run: `git status --short | awk '{print $1}' | sort | uniq -c`
Expected: ~307 `D`, ~12 `??`, 1 `M`.

- [ ] **Step 2: Perguntar ao usuário** se deve (a) commitar as deleções como `refactor: remove marketplace legado (re-fundação)` antes de iniciar, ou (b) deixá-las unstaged enquanto avançamos nos docs. **Aguardar resposta.** Não prosseguir sem decisão.

- [ ] **Step 3: Registrar a decisão** como comentário no topo deste plano (linha `> Git baseline: <opção escolhida>`).

---

### Task 1: Convenção de frontmatter + validador + templates

**Files:**
- Create: `scripts/check-frontmatter.sh`
- Create: `docs/_templates/foundation.md`
- Create: `docs/_templates/product.md`
- Create: `docs/_templates/adr.md`

**Interfaces:**
- Produces: `scripts/check-frontmatter.sh` (sai 0 se todas as chaves obrigatórias presentes; 1 caso contrário) — usado por todas as tasks seguintes.

- [ ] **Step 1: Escrever o validador**

`scripts/check-frontmatter.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
f="${1:?uso: check-frontmatter.sh <arquivo.md>}"
req=(title status version updated scope relates_to type)
# extrai bloco entre as duas primeiras linhas '---'
fm="$(awk 'NR==1&&$0!="---"{exit 1} NR==1{next} $0=="---"{exit} {print}' "$f")" || { echo "FALHA: $f não inicia com frontmatter ---"; exit 1; }
miss=()
for k in "${req[@]}"; do echo "$fm" | grep -qE "^${k}:" || miss+=("$k"); done
if ((${#miss[@]})); then echo "FALHA: $f faltando: ${miss[*]}"; exit 1; fi
echo "OK: $f"
```

- [ ] **Step 2: Tornar executável e testar contra o spec (que já tem frontmatter)**

Run: `chmod +x scripts/check-frontmatter.sh && bash scripts/check-frontmatter.sh docs/superpowers/specs/2026-06-27-refundacao-ai-first-docs-design.md`
Expected: `OK: docs/superpowers/specs/...`

- [ ] **Step 3: Testar que detecta falha**

Run: `printf '# sem frontmatter\n' > /tmp/bad.md && bash scripts/check-frontmatter.sh /tmp/bad.md; echo "exit=$?"`
Expected: `FALHA: ... não inicia com frontmatter` e `exit=1`.

- [ ] **Step 4: Criar os 3 templates** (cada um com o frontmatter da Global Constraint + esqueleto de seções)

`docs/_templates/foundation.md` — frontmatter (`type: foundation`, `status: planned`) + seções `## Objetivo` · `## Conteúdo` · `## Relação com outros documentos`.
`docs/_templates/product.md` — frontmatter (`type: product`) + `## Objetivo` · `## Escopo` · `## Conteúdo` · `## Critérios`.
`docs/_templates/adr.md` — frontmatter (`type: decision`) + `## Contexto` · `## Decisão` · `## Alternativas consideradas` · `## Consequências` · `## Status`.

- [ ] **Step 5: Verificar os templates**

Run: `for t in docs/_templates/*.md; do bash scripts/check-frontmatter.sh "$t"; done`
Expected: 3 linhas `OK:`.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-frontmatter.sh docs/_templates/foundation.md docs/_templates/product.md docs/_templates/adr.md
git commit -m "docs: adiciona convenção de frontmatter, validador e templates"
```

---

### Task 2: Reescrever `docs/README.md` (índice fiel + fonte da verdade única)

**Files:**
- Modify: `docs/README.md`

**Interfaces:**
- Consumes: convenção de frontmatter (Task 1).
- Produces: a **única** definição da ordem de fonte-da-verdade (demais docs linkam para cá).

- [ ] **Step 1: Checagem de aceitação (declarar)**

A nova `docs/README.md` deve: (a) ter frontmatter; (b) listar **todos** os arquivos reais de cada cluster com seu `status`; (c) conter a lista de fonte-da-verdade única; (d) listar `ADR/` apenas sob `06-decisions`; (e) a "Ordem de leitura" marcar docs `planned`.

- [ ] **Step 2: Reescrever o arquivo** com:
  - frontmatter (`type: design-spec`? não — usar `type: foundation`, `title: PetDots Documentation`).
  - Seção "Estrutura": listar por cluster os arquivos atuais (puxar de `find docs -name '*.md'`), cada um com marcador `(stable|draft|planned)`.
  - Seção "Fonte da verdade (canônica)": o bloco da Global Constraint, com nota "esta é a única definição; demais docs referenciam".
  - Seção "Convenções": apontar para `docs/_templates/` e o frontmatter obrigatório.
  - Remover a duplicação de `ADR/` (só em `06-decisions`).
  - Árvore ASCII mostrando os arquivos (não só clusters).

- [ ] **Step 3: Verificar**

```bash
bash scripts/check-frontmatter.sh docs/README.md
grep -c "ADR/" docs/README.md            # esperado: 1
grep -q "PRODUCT_PRINCIPLES > PRODUCT_VISION" docs/README.md && echo "SOT OK"
```
Expected: `OK:`, `1`, `SOT OK`.

- [ ] **Step 4: Commit**

```bash
git add docs/README.md
git commit -m "docs: reescreve índice com estrutura fiel e fonte da verdade única"
```

---

### Task 3: Corrigir `AGENTS.md` + criar `CLAUDE.md` fino

**Files:**
- Modify: `AGENTS.md`
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: fonte-da-verdade única (Task 2).

- [ ] **Step 1: Checagem de aceitação**

`AGENTS.md` não deve mais conter o gate obsoleto nem a regra absoluta de tabelas; deve linkar a fonte-da-verdade única em vez de redefini-la. `CLAUDE.md` deve apenas apontar para `AGENTS.md`.

- [ ] **Step 2: Editar `AGENTS.md`**
  - Remover a linha "Enquanto TECHNOLOGY_STACK.md não existir, nunca assumir tecnologias específicas." → substituir por: "A stack será definida em `docs/02-architecture/TECHNOLOGY_STACK.md` (ainda `planned`); até lá, proponha alternativas com trade-offs."
  - Reformular "Nunca modelar tabelas antes da definição do DOMAIN_MODEL.md." → "Nesta fundação greenfield, o `DOMAIN_MODEL.md` precede a modelagem de dados."
  - Substituir a seção "Fonte Oficial da Verdade" (lista de 12) por: "A ordem canônica vive em `docs/README.md` (seção Fonte da verdade). Não a redefina aqui."
  - Apontar a entrada do agente para `docs/05-ai/AI_CONTEXT.md`.

- [ ] **Step 3: Criar `CLAUDE.md`**

```markdown
# CLAUDE.md

Este projeto usa **`AGENTS.md`** como carta canônica de agente (tool-agnostic).
Leia `AGENTS.md` primeiro e siga a documentação em `docs/` (comece por
`docs/05-ai/AI_CONTEXT.md`).
```

- [ ] **Step 4: Verificar**

```bash
grep -q "Enquanto TECHNOLOGY_STACK.md não existir" AGENTS.md && echo "AINDA OBSOLETO" || echo "obsoleto removido"
grep -q "AGENTS.md" CLAUDE.md && echo "pointer OK"
```
Expected: `obsoleto removido`, `pointer OK`.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md CLAUDE.md
git commit -m "docs: corrige AGENTS.md (instruções obsoletas) e adiciona CLAUDE.md pointer"
```

---

### Task 4: ADR-0001 (re-fundação) + seed do DECISION_LOG

**Files:**
- Create: `docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md`
- Modify: `docs/06-decisions/DECISION_LOG.md` (hoje 0 byte)
- Modify: `docs/06-decisions/ADR/README.md` (hoje 0 byte)

**Interfaces:**
- Produces: registro canônico da decisão de re-fundação (referenciado por PROJECT_STATE, AI_CONTEXT, GLOSSARY).

- [ ] **Step 1: Checagem de aceitação**

ADR-0001 não-vazio, frontmatter `type: decision status: stable`, seções Contexto/Decisão/Alternativas/Consequências/Status `Accepted`. DECISION_LOG referencia ADR-0001.

- [ ] **Step 2: Escrever ADR-0001** (a partir de `docs/_templates/adr.md`), conteúdo:
  - **Contexto:** marketplace completo no HEAD × working tree esvaziado; auditoria de 2026-06-27.
  - **Decisão:** PetDots = ecossistema "toda a vida do pet"; marketplace antigo = referência histórica no Git; modelo Docs-SSOT leve; fonte-da-verdade única; domínio centrado em Pet.
  - **Alternativas consideradas:** evoluir o marketplace; greenfield minerando o código antigo (registrar por que foram preteridas).
  - **Consequências:** docs corrigidos; stack/engenharia adiados; PROJECT_STATE volta a "greenfield verdadeiro".
  - **Status:** `Accepted` — 2026-06-27.

- [ ] **Step 3: Preencher `ADR/README.md`** — explica o que é um ADR, numeração, link para o template, índice (ADR-0001).

- [ ] **Step 4: Preencher `DECISION_LOG.md`** — frontmatter + tabela cronológica com a primeira linha: `2026-06-27 | ADR-0001 | Re-fundação ecossistema AI-first | Accepted`.

- [ ] **Step 5: Verificar**

```bash
for f in docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md docs/06-decisions/ADR/README.md docs/06-decisions/DECISION_LOG.md; do test -s "$f" && bash scripts/check-frontmatter.sh "$f"; done
grep -q "0001" docs/06-decisions/DECISION_LOG.md && echo "log OK"
```
Expected: 3× `OK:`, `log OK`.

- [ ] **Step 6: Commit**

```bash
git add docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md docs/06-decisions/ADR/README.md docs/06-decisions/DECISION_LOG.md
git commit -m "docs: registra ADR-0001 (re-fundação ecossistema AI-first) e inicia DECISION_LOG"
```

---

### Task 5: Frontmatter + dedup nos docs de fundação/produto existentes

**Files:**
- Modify: `docs/00-foundation/PRODUCT_VISION.md`, `PRODUCT_PRINCIPLES.md`, `BUSINESS_MODEL.md`, `GLOSSARY.md`, `NAMING_CONVENTIONS.md`

**Interfaces:**
- Consumes: fonte-da-verdade única (Task 2), ADR de arquitetura (Task 4 — para onde vai "Modular Monolith").

- [ ] **Step 1: Checagem de aceitação**

Os 5 arquivos com frontmatter válido; `PRODUCT_PRINCIPLES` deixa de redefinir a ordem de fonte-da-verdade (linka); `GLOSSARY` sem a entrada "Modular Monolith"; `NAMING` com `feat/` no lugar de `feature/`.

- [ ] **Step 2: Adicionar frontmatter** (`type: foundation`, `status: stable`/`draft`) substituindo o bloco `> Versão/Status` em cada um.
- [ ] **Step 3: PRODUCT_PRINCIPLES** — na seção "Como Tomar Decisões", trocar a lista por "ver Fonte da verdade em `docs/README.md`".
- [ ] **Step 4: GLOSSARY** — remover a subseção "## Modular Monolith" (decisão migra para ADR/arquitetura `planned`); manter os demais termos.
- [ ] **Step 5: NAMING_CONVENTIONS** — no bloco "Branches Git", trocar `feature/` por `feat/` e o exemplo `feature/pet-timeline` por `feat/pet-timeline`.

- [ ] **Step 6: Verificar**

```bash
for f in docs/00-foundation/PRODUCT_VISION.md docs/00-foundation/PRODUCT_PRINCIPLES.md docs/00-foundation/BUSINESS_MODEL.md docs/00-foundation/GLOSSARY.md docs/00-foundation/NAMING_CONVENTIONS.md; do bash scripts/check-frontmatter.sh "$f"; done
grep -q "Modular Monolith" docs/00-foundation/GLOSSARY.md && echo "AINDA TEM MM" || echo "MM removido"
grep -qE "^\s*feature/" docs/00-foundation/NAMING_CONVENTIONS.md && echo "AINDA feature/" || echo "feat/ OK"
```
Expected: 5× `OK:`, `MM removido`, `feat/ OK`.

- [ ] **Step 7: Commit**

```bash
git add docs/00-foundation/PRODUCT_VISION.md docs/00-foundation/PRODUCT_PRINCIPLES.md docs/00-foundation/BUSINESS_MODEL.md docs/00-foundation/GLOSSARY.md docs/00-foundation/NAMING_CONVENTIONS.md
git commit -m "docs: padroniza frontmatter da fundação e remove duplicações/decisões fora de lugar"
```

---

### Task 6: Reescrever `PROJECT_STATE.md` + frontmatter no `PROJECT_CONTEXT.md`

**Files:**
- Modify: `PROJECT_STATE.md`
- Modify: `PROJECT_CONTEXT.md`

**Interfaces:**
- Consumes: ADR-0001 (Task 4).

- [ ] **Step 1: Checagem de aceitação**

`PROJECT_STATE` reflete greenfield-ecossistema verdadeiro (sem afirmar produto construído), referencia ADR-0001, próximo doc = DOMAIN_MODEL; backlog fiel ao disco. `PROJECT_CONTEXT` com frontmatter e linkando a fonte-da-verdade única.

- [ ] **Step 2: Reescrever `PROJECT_STATE.md`**
  - frontmatter (`type: foundation`, `status: stable`).
  - "Situação Atual": Fundação (greenfield); marketplace anterior arquivado como referência (ver ADR-0001).
  - "Documentação Concluída/Em Andamento": fiel ao disco após esta leva.
  - "Próximo Documento": DOMAIN_MODEL.md.
  - "Decisões Arquiteturais": ADR-0001 registrado.

- [ ] **Step 3: `PROJECT_CONTEXT.md`** — frontmatter; substituir a seção "Fonte Oficial da Verdade" por link para `docs/README.md`.

- [ ] **Step 4: Verificar**

```bash
bash scripts/check-frontmatter.sh PROJECT_STATE.md && bash scripts/check-frontmatter.sh PROJECT_CONTEXT.md
grep -q "ADR-0001" PROJECT_STATE.md && echo "ref ADR OK"
grep -qi "ainda não iniciado" PROJECT_STATE.md && echo "REVISAR" || echo "estado coerente"
```
Expected: 2× `OK:`, `ref ADR OK`, `estado coerente`.

- [ ] **Step 5: Commit**

```bash
git add PROJECT_STATE.md PROJECT_CONTEXT.md
git commit -m "docs: alinha PROJECT_STATE/CONTEXT à re-fundação greenfield (ADR-0001)"
```

---

### Task 7: Reescrever `README.md` raiz (ecossistema)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Checagem de aceitação**

README descreve o ecossistema (não "marketplace same-day"); setup operacional marcado "a definir após escolha de stack (`TECHNOLOGY_STACK.md` planned)"; instruções antigas de `apps/`/Turborepo movidas para uma seção "Referência histórica (marketplace legado)".

- [ ] **Step 2: Reescrever** com frontmatter; visão + link para `docs/`; seção de setup com nota de pendência; bloco de referência histórica resumido (sem os comandos como se fossem atuais).

- [ ] **Step 3: Verificar**

```bash
bash scripts/check-frontmatter.sh README.md
grep -qi "Marketplace de petshops com entrega no mesmo dia" README.md && echo "REVISAR título antigo" || echo "escopo atualizado"
grep -q "apps/api" README.md && grep -qi "referência histórica\|legado" README.md && echo "histórico isolado OK"
```
Expected: `OK:`, `escopo atualizado`, `histórico isolado OK`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: reescreve README raiz para o ecossistema; isola setup do marketplace legado"
```

---

### Task 8: Corrigir `AI_CONTEXT.md` e remover `AI_BOOTSTRAP.md`

**Files:**
- Modify: `docs/05-ai/AI_CONTEXT.md`
- Delete: `docs/01-product/AI_BOOTSTRAP.md`

- [ ] **Step 1: Checagem de aceitação**

`AI_CONTEXT` sem a frase "Ainda não existe implementação oficial"; estado = greenfield-fundação; linka fonte-da-verdade única; frontmatter. `AI_BOOTSTRAP.md` deixa de existir.

- [ ] **Step 2: Editar `AI_CONTEXT.md`** — frontmatter (`type: ai`); "Estado Atual" → "Fundação greenfield; docs são a fonte da verdade (ver ADR-0001)"; "Documentos Obrigatórios" → link para `docs/README.md`.

- [ ] **Step 3: Remover `AI_BOOTSTRAP.md`**

Run: `git rm docs/01-product/AI_BOOTSTRAP.md`

- [ ] **Step 4: Verificar**

```bash
bash scripts/check-frontmatter.sh docs/05-ai/AI_CONTEXT.md
grep -qi "não existe implementação" docs/05-ai/AI_CONTEXT.md && echo "REVISAR" || echo "estado coerente"
test ! -e docs/01-product/AI_BOOTSTRAP.md && echo "bootstrap removido"
```
Expected: `OK:`, `estado coerente`, `bootstrap removido`.

- [ ] **Step 5: Commit**

```bash
git add docs/05-ai/AI_CONTEXT.md
git commit -m "docs: corrige AI_CONTEXT (greenfield) e remove AI_BOOTSTRAP redundante"
```

---

### Task 9: Reconciliar `PERSONAS.md`

**Files:**
- Modify: `docs/01-product/PERSONAS.md`

- [ ] **Step 1: Checagem de aceitação**

Frontmatter presente; a "Priorização das Personas", a "Jornada de Evolução" e a ordem usada no `AI_CONTEXT` passam a contar a **mesma** sequência (uma tabela canônica, as outras referenciam).

- [ ] **Step 2: Editar** — adicionar frontmatter; transformar "Priorização" na tabela canônica e fazer "Jornada de Evolução" referenciá-la (mesmas fases), eliminando divergências de ordem.

- [ ] **Step 3: Verificar**

```bash
bash scripts/check-frontmatter.sh docs/01-product/PERSONAS.md
```
Expected: `OK:`.

- [ ] **Step 4: Commit**

```bash
git add docs/01-product/PERSONAS.md
git commit -m "docs: reconcilia priorização e jornada de personas"
```

---

### Task 10: Criar `DOMAIN_MODEL.md` (keystone)

**Files:**
- Modify: `docs/01-product/DOMAIN_MODEL.md` (hoje 0 byte)

**Interfaces:**
- Consumes: `GLOSSARY.md` (linguagem ubíqua), `NAMING_CONVENTIONS.md` (eventos `domain.action`).
- Produces: base para `AI_DOMAIN_KNOWLEDGE` (Task 14) e MVP_SCOPE (Task 13).

- [ ] **Step 1: Checagem de aceitação**

Doc não-vazio, frontmatter `type: product status: draft`, com: entidades, agregados, relacionamentos, ownership, eventos de domínio. **Centrado em Pet** — não conter Store/Product/Order como núcleo.

- [ ] **Step 2: Escrever o conteúdo** (a partir de `docs/_templates/product.md`):
  - **Entidades** (do GLOSSARY): Tutor, Pet, PetId, Evento, Timeline, Carteira Digital, Histórico, Parceiro, Clínica, Veterinário, PetShop, Prestador de Serviço, ONG, Laboratório, Serviço, Agendamento.
  - **Agregados:** raiz `Pet` (Timeline, Eventos, Carteira); raiz `Tutor` (vínculos com Pets); raiz `Parceiro` (Serviços, Agendamentos).
  - **Relacionamentos:** Tutor N:N Pet (tutores autorizados); Pet 1:N Evento; Pet 1:1 Timeline; Parceiro 1:N Serviço; Agendamento liga Tutor↔Parceiro↔Pet.
  - **Ownership de dados:** o Tutor é dono dos dados do Pet (Princípio "O Tutor é o Dono dos Dados").
  - **Eventos de domínio** (formato `domain.action` do NAMING): `pet.created`, `pet.updated`, `appointment.scheduled`, `appointment.cancelled`, `vaccination.registered`, `timeline.event.created`.
  - Nota explícita: marketplace/produtos são **capacidade futura**, não o núcleo do domínio.

- [ ] **Step 3: Verificar**

```bash
bash scripts/check-frontmatter.sh docs/01-product/DOMAIN_MODEL.md
grep -qiE "Store|Order|Product" docs/01-product/DOMAIN_MODEL.md && echo "REVISAR núcleo marketplace" || echo "núcleo Pet OK"
for kw in Pet Tutor Timeline Evento Agregado Ownership "pet.created"; do grep -q "$kw" docs/01-product/DOMAIN_MODEL.md || echo "FALTA: $kw"; done
test -z "$(find docs/01-product/DOMAIN_MODEL.md -size 0)" && echo "não-vazio OK"
```
Expected: `OK:`, `núcleo Pet OK`, nenhuma linha `FALTA:`, `não-vazio OK`.

- [ ] **Step 4: Commit**

```bash
git add docs/01-product/DOMAIN_MODEL.md
git commit -m "docs: cria DOMAIN_MODEL do ecossistema (centrado em Pet/Tutor/Timeline)"
```

---

### Task 11: Substituir `PRODUCT_ROADMAP.md` (roadmap real)

**Files:**
- Modify: `docs/00-foundation/PRODUCT_ROADMAP.md` (hoje duplicata do BUSINESS_MODEL)

**Interfaces:**
- Consumes: "Jornada de Evolução" de `PERSONAS.md` (Task 9).

- [ ] **Step 1: Checagem de aceitação**

`md5sum` de `PRODUCT_ROADMAP.md` ≠ `BUSINESS_MODEL.md`; frontmatter; fases temporais alinhadas às fases de personas.

- [ ] **Step 2: Escrever o roadmap** — frontmatter (`type: foundation`); fases (Fase 1 Tutor / vida do pet → … → fases B2B → IA → demais parceiros), cada fase com objetivo, capacidades e marco. Sem copiar o Business Model.

- [ ] **Step 3: Verificar**

```bash
bash scripts/check-frontmatter.sh docs/00-foundation/PRODUCT_ROADMAP.md
a=$(md5sum docs/00-foundation/PRODUCT_ROADMAP.md | cut -d' ' -f1); b=$(md5sum docs/00-foundation/BUSINESS_MODEL.md | cut -d' ' -f1)
[ "$a" != "$b" ] && echo "duplicata resolvida" || echo "AINDA DUPLICATA"
grep -qi "Business Model" docs/00-foundation/PRODUCT_ROADMAP.md && echo "REVISAR título" || echo "título OK"
```
Expected: `OK:`, `duplicata resolvida`, `título OK`.

- [ ] **Step 4: Commit**

```bash
git add docs/00-foundation/PRODUCT_ROADMAP.md
git commit -m "docs: substitui PRODUCT_ROADMAP duplicado por roadmap real por fases"
```

---

### Task 12: Criar `SUCCESS_METRICS.md`

**Files:**
- Modify: `docs/00-foundation/SUCCESS_METRICS.md` (hoje 0 byte)

- [ ] **Step 1: Checagem de aceitação**

Não-vazio, frontmatter; North Star + métricas por fase derivadas do BUSINESS_MODEL (recorrência, ativação de tutor, efeito de rede).

- [ ] **Step 2: Escrever** — frontmatter (`type: foundation`); North Star (ex.: tutores ativos recorrentes com a vida do pet centralizada); métricas de ativação, recorrência, retenção, crescimento de ecossistema; metas por fase do roadmap.

- [ ] **Step 3: Verificar**

```bash
bash scripts/check-frontmatter.sh docs/00-foundation/SUCCESS_METRICS.md
test -z "$(find docs/00-foundation/SUCCESS_METRICS.md -size 0)" && echo "não-vazio OK"
grep -qiE "north star|métrica" docs/00-foundation/SUCCESS_METRICS.md && echo "conteúdo OK"
```
Expected: `OK:`, `não-vazio OK`, `conteúdo OK`.

- [ ] **Step 4: Commit**

```bash
git add docs/00-foundation/SUCCESS_METRICS.md
git commit -m "docs: define SUCCESS_METRICS (North Star + métricas por fase)"
```

---

### Task 13: Criar `MVP_SCOPE.md`

**Files:**
- Modify: `docs/01-product/MVP_SCOPE.md` (hoje 0 byte)

**Interfaces:**
- Consumes: `DOMAIN_MODEL.md` (Task 10), `PRODUCT_ROADMAP.md` (Task 11).

- [ ] **Step 1: Checagem de aceitação**

Não-vazio, frontmatter; listas explícitas **In scope** e **Out of scope**; recorte provável = Tutor + gestão da vida do pet (Pet, Timeline, Carteira, lembretes).

- [ ] **Step 2: Escrever** — frontmatter (`type: product`); objetivo do MVP; tabela In/Out; critérios de saída do MVP; ligação às métricas (Task 12).

- [ ] **Step 3: Verificar**

```bash
bash scripts/check-frontmatter.sh docs/01-product/MVP_SCOPE.md
for kw in "In scope\|Dentro" "Out of scope\|Fora"; do grep -qiE "$kw" docs/01-product/MVP_SCOPE.md || echo "FALTA recorte"; done
test -z "$(find docs/01-product/MVP_SCOPE.md -size 0)" && echo "não-vazio OK"
```
Expected: `OK:`, sem `FALTA recorte`, `não-vazio OK`.

- [ ] **Step 4: Commit**

```bash
git add docs/01-product/MVP_SCOPE.md
git commit -m "docs: define MVP_SCOPE (Tutor + gestão da vida do pet)"
```

---

### Task 14: Preencher a camada `docs/05-ai`

**Files:**
- Modify: `docs/05-ai/AI_DOMAIN_KNOWLEDGE.md`, `AI_ARCHITECTURE_RULES.md`, `AI_CODING_RULES.md`, `AI_DEVELOPMENT_GUIDE.md` (todos 0 byte hoje)

**Interfaces:**
- Consumes: `DOMAIN_MODEL` (Task 10), `GLOSSARY`/`NAMING` (Task 5), princípios.

- [ ] **Step 1: Checagem de aceitação**

Os 4 não-vazios, frontmatter `type: ai`, papéis distintos (sem sobreposição), referenciando os docs-fonte (não copiando).

- [ ] **Step 2: Escrever**
  - `AI_DOMAIN_KNOWLEDGE.md` — domínio destilado (entidades-chave, regras, eventos) com link ao DOMAIN_MODEL/GLOSSARY.
  - `AI_ARCHITECTURE_RULES.md` — guardrails (modularidade, simplicidade, sem microserviços/infra antecipada; decisões → ADR).
  - `AI_CODING_RULES.md` — regras de código com link ao NAMING/CODING_STANDARDS (idioma código=EN; convenções).
  - `AI_DEVELOPMENT_GUIDE.md` — a forma de trabalho leve: ler contexto → propor → validar vs. princípios → implementar → atualizar docs/DECISION_LOG. Deixar explícito que **não** é pipeline pesado.

- [ ] **Step 3: Verificar**

```bash
for f in docs/05-ai/AI_DOMAIN_KNOWLEDGE.md docs/05-ai/AI_ARCHITECTURE_RULES.md docs/05-ai/AI_CODING_RULES.md docs/05-ai/AI_DEVELOPMENT_GUIDE.md; do bash scripts/check-frontmatter.sh "$f" && test -z "$(find "$f" -size 0)" || echo "FALHA $f"; done
```
Expected: 4× `OK:`, sem `FALHA`.

- [ ] **Step 4: Commit**

```bash
git add docs/05-ai/AI_DOMAIN_KNOWLEDGE.md docs/05-ai/AI_ARCHITECTURE_RULES.md docs/05-ai/AI_CODING_RULES.md docs/05-ai/AI_DEVELOPMENT_GUIDE.md
git commit -m "docs: preenche camada 05-ai (domínio, regras de arquitetura/código, guia de dev AI)"
```

---

### Task 15: Converter todos os arquivos vazios restantes em stubs honestos

**Files:**
- Modify: todos os `.md` de 0 byte restantes em `docs/` (ex.: `00-foundation/PROJECT_MANIFESTO.md`; clusters `02-architecture/*`, `03-engineering/*`, `04-api/*`; `01-product/{CAPABILITIES,FEATURE_CATALOG,USER_JOURNEYS}.md`).

- [ ] **Step 1: Listar os vazios restantes**

Run: `find docs -name '*.md' -size 0 | sort`
Expected: lista dos placeholders ainda não preenchidos pelas tasks anteriores.

- [ ] **Step 2: Aplicar stub honesto a cada um** — frontmatter com `status: planned`, `title`/`type` adequados ao cluster, `scope` de uma linha, + corpo: `## Objetivo` (1 linha) e `> 🚧 Pendente — ver PRODUCT_ROADMAP`. (Usar o template do cluster correspondente.)

Exemplo de stub (`docs/04-api/VERSIONING.md`):
```markdown
---
title: API Versioning
status: planned
version: 0.1
updated: 2026-06-27
scope: Como a API é versionada e como mudanças incompatíveis são tratadas.
relates_to: [API_GUIDELINES, DOMAIN_MODEL]
type: api
---

## Objetivo
Definir a estratégia de versionamento da API do PetDots.

> 🚧 Pendente — ver PRODUCT_ROADMAP.
```

- [ ] **Step 3: Verificar (DoD §12)**

```bash
echo "vazios restantes: $(find docs -name '*.md' -size 0 | wc -l)"   # esperado: 0
for f in $(find docs -name '*.md'); do bash scripts/check-frontmatter.sh "$f" >/dev/null || echo "SEM FRONTMATTER: $f"; done
```
Expected: `vazios restantes: 0`; nenhuma linha `SEM FRONTMATTER`.

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs: converte placeholders vazios em stubs honestos (status: planned)"
```
> Nota: aqui `git add docs` é aceitável porque só há arquivos de docs sendo adicionados/modificados; ainda assim, conferir `git status` antes para garantir que nenhuma deleção do legado entre no commit.

---

### Task 16: Verificação final de coerência (Definition of Done)

**Files:** nenhum (somente verificação)

- [ ] **Step 1: Rodar todas as checagens do DoD**

```bash
echo "== 1. zero vazios =="; find docs -name '*.md' -size 0 | wc -l
echo "== 2. roadmap != business model =="; \
  [ "$(md5sum docs/00-foundation/PRODUCT_ROADMAP.md|cut -d' ' -f1)" != "$(md5sum docs/00-foundation/BUSINESS_MODEL.md|cut -d' ' -f1)" ] && echo OK || echo FALHA
echo "== 3. frontmatter em todos =="; n=0; for f in $(find docs -name '*.md'); do bash scripts/check-frontmatter.sh "$f">/dev/null||{ echo "FALHA $f"; n=1; }; done; [ $n = 0 ] && echo OK
echo "== 4. fonte da verdade única (só em docs/README) =="; grep -rl "PRODUCT_PRINCIPLES > PRODUCT_VISION" docs AGENTS.md | wc -l   # esperado: 1
echo "== 5. ADR só em 06 =="; find docs -type d -name ADR
```
Expected: `0`; `OK`; `OK`; `1`; só `docs/06-decisions/ADR`.

- [ ] **Step 2: Checagem de coerência por agente** — dispatch de um subagent (read-only) que lê `AGENTS.md` → `docs/05-ai/AI_CONTEXT.md` → docs linkados e responde: "o que é o PetDots, em que estado está, qual o próximo passo". Aceitação: resposta sem contradição (ecossistema, greenfield-fundação, próximo = implementar a partir do DOMAIN_MODEL/MVP).

- [ ] **Step 3: Commit (se houver ajustes do Step 1/2)**

```bash
git add <arquivos ajustados>
git commit -m "docs: ajustes finais de coerência da re-fundação AI-first"
```

---

## Self-Review (cobertura do spec)

- **§3 princípios** → embutidos nas convenções (Tasks 1, 2) e na camada 05-ai (Task 14). ✔
- **§4 arquitetura de informação** → Tasks 2 (índice), 4 (ADR só em 06), 8 (AI_BOOTSTRAP removido). ✔
- **§5 camada de agente** → Tasks 3 (AGENTS+CLAUDE), 8 (AI_CONTEXT), 14 (05-ai). ✔
- **§6 frontmatter** → Task 1 (validador/templates) + aplicado em todas. ✔
- **§7 fonte da verdade única** → Task 2 define; Tasks 3,5,6 linkam; Task 16 verifica unicidade. ✔
- **§8 correções doc a doc** → Tasks 3,5,6,7,8,9,11. ✔
- **§9 docs prioritários** → Tasks 4 (ADR-0001), 10 (DOMAIN_MODEL), 11 (ROADMAP), 12 (SUCCESS_METRICS), 13 (MVP_SCOPE). ✔
- **§10 templates/stubs** → Tasks 1 e 15. ✔
- **§11 YAGNI** → nenhuma task cria código/stack/SDD. ✔
- **§12 DoD** → Task 16. ✔
- **§13 sequência** → ordem das tasks (A→F) segue o spec. ✔

Sem placeholders TBD/TODO; comandos de verificação concretos; nomes de arquivos/eventos consistentes entre tasks (ex.: `pet.created`, `0001-refundacao-ecossistema-ai-first.md`, `check-frontmatter.sh`).
