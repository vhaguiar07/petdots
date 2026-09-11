---
title: Bugs Conhecidos
status: stable
version: 1.2
updated: 2026-09-11
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

⚠️ **Escopo, atualizado em 07/09/2026: o protótipo legado foi arquivado.** A
tag `legacy-marketplace` (commit `8a9625b`) guarda o histórico; as branches
`develop` e `feat/ai-first` foram apagadas, `master` passou a ser a linha
AI-first e o código saiu do disco ([ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md)).
**Não há mais código vivo com este defeito, e ele não será corrigido** —
`apps/web/components/header.tsx` não existe em nenhuma branch.

O registro **permanece** porque a premissa que o mantinha aqui mudou de forma,
não de valor. A hipótese de reaproveitar o legado foi **descartada** (o
compromisso anti-contaminação do ADR-0002 vale, e o ADR-0005 registra que
revertê-lo exigiria um ADR que o substitua), então o defeito não chega mais ao
MVP pelo código. Chega pela repetição: o comparador de preços do MVP terá a
mesma pressão de layout no mesmo header, e a saída fácil será a mesma. A lição
—  **"responsividade não é esconder o que não cabe"** — é o que se leva adiante,
e está ligada à linha correspondente no [`BACKLOG.md`](BACKLOG.md).

### 🔶 O gatilho disparou na `pd-11` (11/09/2026) — falta a medição

O gatilho registrado era **"desenhar a J2 de produto"**, e a `pd-11` a desenhou:
`/precos` (busca) e `/precos/{productSlug}` (comparação) na landing.

**Como a repetição foi evitada por desenho:**

| Pressão de layout | Como o legado resolveu | Como a `pd-11` resolve |
|---|---|---|
| Campo de busca no header estreito | `hidden md:block` — **some** | O formulário de busca **não fica no header**: é um bloco próprio da página `/precos`, com o input em `flex: 1 1 14rem` e quebra de linha para o botão |
| Tabela de ofertas em tela estreita | (não existia) | Abaixo de 640px cada linha vira **cartão empilhado**, por CSS, com o rótulo de cada coluna restituído por `::before`. Sem rolagem horizontal e sem segunda marcação |

Nenhum elemento das páginas novas usa `display: none` por breakpoint para
esconder função.

⚠️ **O registro continua em Abertos porque a medição não foi feita.** "Sem
rolagem horizontal a 390px" só se verifica renderizando, e a IA não abriu
navegador. A conferência é o **passo 10 do roteiro de testes manuais da
`pd-11`**, executado pelo Victor. Passando, este item move-se para
**Resolvidos** como `BUG-R01`, com a data e o commit.

## A validar

**Nenhum.**

## Resolvidos

**Nenhum.**

---

> **Sobre o escopo do que está registrado aqui, em 07/09/2026.**
>
> O monorepo foi bootstrapado em 07/09/2026 (`pd-01`), mas o que existe é
> **fiação**: workspace, health check, contrato e testes. **Nenhum módulo de
> domínio foi implementado**, então ainda não há bug de produto a registrar.
>
> O `BUG-001` é do **protótipo legado**, agora arquivado na tag
> `legacy-marketplace` e fora do disco. Ele permanece registrado como lição de
> UX, não como trabalho pendente — a hipótese de reaproveitar aquele código foi
> descartada (ADR-0002/ADR-0005).
>
> Ausência de outros registros **não é evidência de ausência de defeito** no
> legado: aquele código nunca passou por este processo e nunca foi auditado.
> Como ele saiu de circulação, auditá-lo deixou de fazer sentido — o que
> aparecer daqui em diante é do código novo.
