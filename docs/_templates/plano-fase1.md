---
title: "Template — Plano de Fase 1 (handoff para a Fase 2)"
status: stable
version: 1.0
updated: 2026-09-06
scope: >
  Modelo do plano produzido pela Fase 1 e consumido pela Fase 2 em outro chat.
  Copiar para PLANS/plan-<letra>.md. O leitor do plano não viu a conversa de
  origem — escrever para ele.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
type: process
---

<!-- O bloco de frontmatter acima é do template. Em PLANS/ ele é opcional —
     a pasta é ignorada pelo Git e não passa pelo check-frontmatter. -->

# pd-NN — Título curto da tarefa

> Plano autossuficiente. **Quem lê isto não viu a conversa que o produziu** — a
> Fase 1 aconteceu em outro chat. Tudo que a Fase 2 precisa está aqui; se não
> está, o plano está incompleto.
> Análise: <modelo>, DD/MM/AAAA. Formato: <IA sozinha | time de agentes>.
> Temporário — descartar após o relatório de encerramento.

---

## 0. Como iniciar a Fase 2 neste chat

**Leia, nesta ordem:** `AGENTS.md` → `docs/07-process/DIRETRIZES_FLUXO_IA.md`
→ este plano inteiro → os documentos da seção 4.

**Modelo e formato decididos pelo usuário para a Fase 2:** <modelo>, <formato>.
Se a sessão não estiver nesse modelo: `/model <id>` antes do primeiro passo.

**Primeira mensagem sugerida para o usuário colar:**

> Executa `@PLANS/plan-X.md` — Fase 2 da pd-NN. A Fase 1 foi feita em outro
> chat; tudo que você precisa está no plano. Confira a seção 2 (estado do
> repositório) antes de qualquer coisa.

**O que já foi feito e NÃO deve ser refeito:** <lista — commits, branches,
tags, migrações de estado que a transição já executou>.

---

## 1. Briefing original

Nas palavras do usuário, entre aspas. Data.

---

## 2. Estado do repositório no handoff

| Item | Valor |
|---|---|
| Branch de trabalho | `pd-NN/categoria/nome` (criada a partir de `<base>` em `<sha>`) |
| Árvore | limpa / suja (o quê) |
| Transição já executada | commit `<sha>`, tag, push… |
| Serviços de pé | containers, portas, processos que importam |
| Toolchain verificado | Node x, npm y, Docker z, `gh` autenticado como … |

---

## 3. Decisões

### Tomadas pela análise (não reabrir sem motivo novo)

| # | Decisão | Por quê |
|---|---|---|

### Tomadas pelo usuário no portão (DD/MM/AAAA)

| # | Decisão | Decidido | Alternativas descartadas |
|---|---|---|---|

### Defaults assumidos (reversíveis, não exigiram portão)

---

## 4. Fontes que este plano materializa

Documentos a ler antes de codar, cada um com **o que** tirar dele.

---

## 5. Pré-condições (conferir antes do passo 1)

- [ ] …

---

## 6. Passos

Numerados, agrupados por frente. Cada passo diz o arquivo, o conteúdo essencial
e o porquê quando não for óbvio.

---

## 7. Critérios de aceitação

| # | Critério | Como provar |
|---|---|---|

---

## 8. Roteiro de testes manuais (entregar ao usuário antes do encerramento)

Passos concretos, resultado observável em cada um.

---

## 9. Riscos e armadilhas conhecidas

---

## 10. Encerramento

- Relatório em `docs/07-process/relatorios-de-branch/semana-<segunda>/<branch>.md`
  (template `_templates/relatorio-branch.md`).
- Backlog: remover <itens>; adicionar <itens>; corrigir <itens>.
- Documentos a atualizar na mesma entrega: <lista com caminhos>.
- Avaliações da Fase 1 a registrar no relatório: auditoria (<decisão e porquê>),
  documentação (<lista>), testes (<o que nasce>).
