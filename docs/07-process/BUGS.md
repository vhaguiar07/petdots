---
title: Bugs Conhecidos
status: stable
version: 1.4
updated: 2026-09-12
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

### BUG-V01 — campo `string | null` vira `array de string` no `openapi.json`

**Encontrado em 12/09/2026**, na `pd-14`, lendo o `openapi.json` recém-gerado
(varredura por propriedades com `type: 'array'` e `items` escalar). **Não
reproduzido em runtime** — e a suspeita é de que não seja reproduzível pelo
comportamento da API, só pelo contrato publicado. Ver "Impacto".

**O que acontece.** Um campo declarado `z.string().nullable()` sai no contrato
como um **array de strings** quando é propriedade de **topo** de um
`createZodDto`:

```jsonc
// AuthenticatedUserDto_Output.phone — errado
{ "type": "array", "items": { "type": "string" } }

// AuthTokensDto_Output.user.phone — o MESMO schema, aninhado: correto
{ "type": ["string", "null"] }
```

**Onde e quantos.** Quatro propriedades hoje, e o bug é **anterior à `pd-14`**:

| Campo | Entrou em |
|---|---|
| `WaitlistEntryDto_Output.petFoodDeclared` | `pd-09` |
| `ProductDto_Output.ean` | `pd-11` |
| `AuthenticatedUserDto_Output.phone` | `pd-14` |
| `TutorProfileDto_Output.phone` | `pd-14` |

**Causa provável.** `nestjs-zod@5.5.0` emite a sintaxe OpenAPI 3.1 para
nulabilidade — `type: [T, 'null']` —, e o pipeline de metadados de
`@nestjs/swagger@12.0.1` parece ler esse array como "o tipo é array" ao montar o
schema de topo. O caminho aninhado não passa por esse pipeline, e por isso
acerta.

**Impacto.** Apenas no **contrato publicado**, não no comportamento: a API
continua devolvendo `string | null`, porque quem serializa é o schema Zod. Quem
pagaria é um cliente gerado a partir do `openapi.json`, que tiparia o campo como
`string[]`. Nenhum cliente do repositório faz isso hoje — `apps/app` e
`apps/landing` importam os schemas de `@petdots/contracts` diretamente.

**Por que não foi corrigido na `pd-14` (gatilho nomeado).** Não há
pós-processamento seguro possível em `buildOpenApiDocument`: depois que a
informação se perde, um `z.array(z.string())` legítimo e um
`z.string().nullable()` são **indistinguíveis** no documento — `roles` e `phone`
só diferem porque `roles` tem `minItems` e um `enum` nos `items`, o que não vale
no caso geral. Corrigir exige mudar a biblioteca.
**Gatilho:** `nestjs-zod` ou `@nestjs/swagger` preservarem `type: [T, 'null']`
no schema de topo de um `createZodDto` — **ou** o projeto passar a gerar um
cliente a partir do `openapi.json`, que é quando o defeito deixa de ser
cosmético.

**O que falta medir:** confirmar em qual das duas bibliotecas o array é
achatado, para abrir a issue no repositório certo.

## Resolvidos

### BUG-R01 — `/conta` travava em "Carregando sua sessão…" para sempre

**Corrigido em 12/09/2026**, na própria `pd-13` que o introduziu.

**O que acontecia:** a tela `/conta` do `apps/app` podia ficar indefinidamente
no texto *"Carregando sua sessão…"*, sem erro, sem timeout e sem saída. Nenhuma
ação do usuário a destravava — só recarregar a página.

**Onde:** `apps/app/src/screens/account-screen.tsx`, no `catch` da chamada a
`GET /auth/me`. Ele tratava **apenas** `ApiUnavailableError`; qualquer outra
falha não chamava `setLoad`, e o estado permanecia `loading` para sempre.
Atingia, entre outros, um `500` na renovação do token e uma resposta que
falhasse o parse do schema.

**Como foi encontrado:** **reproduzido pelo Victor** nos testes manuais da Fase 3
(12/09/2026), depois de vários minutos parado na mesma tela. Não foi leitura de
código — foi observado na aplicação.

**Impacto para o usuário:** a conta fica inacessível e a tela não distingue
"carregando" de "quebrado". A sessão continuava válida no aparelho, então o
prejuízo era a tela, não a identidade.

**A correção:** **toda** falha passa a cair num estado desenhado ("não
conseguimos falar com o servidor", mantendo a sessão). Uma tela que trava é pior
que uma que diz a coisa errada.

**Por que passou pelos testes:** as telas do `apps/app` não têm teste de
renderização por decisão registrada (ADR-0012, A11) — a verificação de tela é o
roteiro manual, e foi exatamente ele que pegou. O caso reforça o item de
vigilância "sem teste automatizado de interface".

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
