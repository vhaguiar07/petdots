---
title: Bugs Conhecidos
status: stable
version: 1.0
updated: 2026-09-06
scope: >
  Registro detalhado dos bugs do PetDots, em três seções por grau de
  confirmação — Abertos (reproduzidos), A validar (só lidos no código) e
  Resolvidos. É a primeira das duas paradas obrigatórias de todo bug
  encontrado; a segunda é a linha-ponteiro no BACKLOG.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 07-process/BACKLOG.md
type: process
---

# Bugs Conhecidos — PetDots

> **Primeira das duas paradas obrigatórias** de todo bug encontrado. A segunda é
> **uma linha** no [`BACKLOG.md`](BACKLOG.md) apontando para o id daqui — sem
> ela o bug perde a fila, porque é o backlog que se consulta ao planejar
> trabalho. Regra completa em
> [`DIRETRIZES_FLUXO_IA.md`](DIRETRIZES_FLUXO_IA.md) §4.

## Como registrar

| Situação | Seção | Id |
|---|---|---|
| Reproduzido na aplicação (abriu a tela, viu acontecer) | **Abertos** | `BUG-NNN` |
| Só lido no código, não reproduzido | **A validar** | `BUG-VNN` |
| Corrigido | **Resolvidos** (mover, com data) | `BUG-RNN` |

**Conteúdo mínimo de cada registro:** o que acontece; onde (`arquivo:linha` e/ou
tela e passos para reproduzir); **como foi encontrado** — leitura de código ou
reprodução — e **quando**; impacto para o usuário; e, quando não reproduzido,
**o que falta medir** para confirmar.

**Severidade exige a medição que a sustenta.** Sem reprodução, o item nasce em
"A validar", nunca como crítico "por precaução".

**Bug encontrado e corrigido dentro da mesma tarefa nasce direto em
"Resolvidos"**, com a data e o commit, e **nunca recebe linha no backlog** —
nunca esteve na fila.

---

## Abertos

### BUG-001 — a busca de produtos some por completo em telas mobile

**Reproduzido pelo Victor em 06/09/2026**, abrindo a home do app web
(`localhost:3000`) em viewport estreita: o campo de pesquisa da home
desaparece. Relato dele: *"senti falta do campo de pesquisa da home na versão
desktop visualizada em telas mobile"*.

**Causa, confirmada no código.** O formulário de busca vive no header e nasce
escondido abaixo do breakpoint `md` (768px no default do Tailwind):

```
apps/web/components/header.tsx:73
<form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative hidden md:block">
```

**O agravante é que nada substitui.** Uma varredura de todos os `.tsx` de
`apps/web/` em 06/09/2026 encontrou:

| Verificação | Resultado |
|---|---|
| Inputs de busca no app inteiro | **2** — o do header (escondido no mobile) e um em `app/stores/[id]/page.tsx:459`, restrito aos produtos de **uma** loja |
| Menu mobile / hambúrguer | **nenhum** — zero ocorrências de `md:hidden`, `isMenuOpen`, `hamburger` ou equivalente em qualquer componente |

Ou seja: não é um campo que mudou de lugar no mobile, é a **única porta de
entrada da busca global desaparecendo sem substituto**. Abaixo de 768px o
usuário só consegue navegar por categorias e vitrines — não há como procurar um
produto pelo nome em lugar nenhum do site, exceto dentro da página de uma loja
específica que ele já tenha encontrado.

**Impacto.** Busca é o caminho principal de descoberta num marketplace, e o
tráfego do público-alvo (tutor de bairro) é majoritariamente mobile. O
`hidden md:block` foi quase certamente escolhido para o header não quebrar em
telas estreitas — a intenção era de layout, mas o efeito é funcional.

**Correção não é remover o `hidden`.** O header não tem espaço horizontal para o
campo inteiro abaixo de 768px; foi por isso que ele foi escondido. O trabalho é
dar ao mobile uma entrada própria — segunda linha abaixo do header, ícone de
lupa que expande, ou barra de busca fixa na home — e ela precisa ser desenhada,
não só destravada.

⚠️ **Escopo: este é o protótipo legado**, que vive nas branches `develop` e
`master`, não na linha AI-first. O [ADR-0001](../06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md)
o descontinuou, e o destino dele é **decisão pendente** no
[`BACKLOG.md`](BACKLOG.md). O registro fica aqui de qualquer forma por dois
motivos: o [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md)
trouxe o marketplace de volta como MVP, então este código é candidato a
reaproveitamento — e, se for reaproveitado, o defeito vem junto; e a lição
("responsividade não é esconder o que não cabe") vale para o MVP novo
independentemente do que aconteça com o legado.

## A validar

**Nenhum.**

## Resolvidos

**Nenhum.**

---

> **Sobre o escopo do que está registrado aqui, em 06/09/2026.**
>
> A linha AI-first (`feat/ai-first`) **não tem código** — o monorepo ainda não
> foi bootstrapado, conforme o item 🔴 no topo do [`BACKLOG.md`](BACKLOG.md).
> Logo, **não há nenhum bug do produto novo**, e não haverá até a implementação
> começar.
>
> O `BUG-001` é do **protótipo legado** (`develop`/`master`), encontrado ao
> executar aquela aplicação. Ele está aqui, e não descartado junto com o legado,
> porque o [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md)
> devolveu o marketplace à condição de MVP: o código é candidato a
> reaproveitamento, e defeito reaproveitado junto com o código é o pior tipo.
>
> Ausência de outros registros **não é evidência de ausência de defeito** no
> legado: aquele código nunca passou por este processo e nunca foi auditado. Uma
> varredura dele é trabalho próprio, e o que aparecer por leitura de código
> entra como `BUG-VNN` — não como `BUG-NNN`, que exige reprodução.
