---
title: "Relatório — pd-03/chore/eslint-10-e-dep-check"
status: stable
version: 1.0
updated: 2026-09-08
scope: >
  Relatório de encerramento da tarefa pd-03: upgrade do ESLint para a major 10
  em todos os workspaces, regra nova de dependência não declarada
  (`import-x/no-extraneous-dependencies`) fechando o furo do hoisting do npm
  workspaces, reverificação dos itens de débito técnico travados por gatilho
  e atualização do item da credencial Google OAuth.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 07-process/BACKLOG.md
type: process
---

# pd-03/chore/eslint-10-e-dep-check

**Encerrada em:** 08/09/2026
**Merge:** `f724945` em `master` (squash via PR #2)
**ADR:** nenhum

---

## Objetivo

O Victor pediu uma triagem do backlog para evitar abrir uma branch por item:

> "Dos débitos técnicos, quantos se encaixam numa branch só? Pergunto isso pois
> não vale a pena pra mim abrir 8 branches só pra isso, prefiro matar em menos
> se possível" — 08/09/2026.

Da triagem: 3 itens seguiam travados por gatilho (Prisma 7, vuln
`deepmerge-ts`, NestJS 12), 2 não geravam branch (bug legado arquivado,
credencial — ação fora do repo), e 3 eram acionáveis e cabiam na mesma
superfície de arquivos (`package.json` × 4, `eslint.base.mjs`, sem tocar
`ci.yml`). Esta é a branch desses 3, mais a credencial, que o usuário decidiu
incluir no escopo no portão.

## Diagnóstico

| # | O que estava desatualizado | Como se sabe |
|---|---|---|
| 1 | ESLint pinado em 9.39.5; `npm ci` já avisava que saiu de suporte | Aviso do próprio `npm ci` no bootstrap (`pd-01`, 07/09/2026) |
| 2 | Nenhuma verificação impedia um workspace de importar pacote não declarado no próprio `package.json` (risco do hoisting do npm) | Consequência documentada no ADR-0005; nenhum tooling cobria isso |
| 3 | Credencial Google OAuth com hipótese em aberto sobre validade | Backlog registrava "falta medir se ainda é válida" desde 06/09/2026 |

## O que foi feito

- **`packages/config/package.json`** — `@eslint/js` 9.39.5 → 10.0.1;
  `typescript-eslint` 8.69.0 → 8.70.0; peer `eslint` `^9.39.0` → `^10.0.0`;
  adicionado `eslint-plugin-import-x@4.17.1` como dependency.
- **`apps/api`, `packages/contracts`, `packages/domain` (`package.json`)** —
  `eslint` 9.39.5 → 10.10.0 (só a versão do ESLint em si; esses três nunca
  declararam `@eslint/js` direto, só `packages/config` o faz).
- **`packages/config/eslint.base.mjs`** — importa `eslint-plugin-import-x` e
  registra a regra `import-x/no-extraneous-dependencies` no bloco de regras já
  existente, com `packageDir: tsconfigRootDir` (o mesmo diretório por
  workspace que a função já recebia) e `devDependencies` restrito a
  `['**/*.spec.ts', '**/*.e2e-spec.ts']`.
- **`package-lock.json`** — atualizado via `npm install`; revisado o diff:
  toda dependência nova/removida é da árvore transitiva do ESLint 10 (nova
  cadeia de cache — `cacheable`, `@keyv/*`, `hookified`, substituindo
  `lodash.merge`) e do `eslint-plugin-import-x` (`comment-parser`,
  `eslint-import-context`, `stable-hash-x`, `get-tsconfig`) — nada
  inesperado.
- **`docs/07-process/BACKLOG.md`** — removidos "Upgrade para ESLint 10" e
  "Hoisting do npm permite importar dependência não declarada" (resolvidos);
  reverificados com data de 08/09/2026 os itens que seguem travados (Prisma 7,
  vuln `deepmerge-ts`, NestJS 12 — nenhum gatilho mudou); credencial Google
  OAuth atualizada com o resultado da checagem do Victor no console
  (confirmada ativa, rotação registrada como próximo passo); adicionado um
  item novo sobre o `GH_TOKEN` (ver "Pendências geradas").

## Migrations

**Nenhuma.**

## Decisões tomadas

| Decisão | Quem |
|---|---|
| Numeração `pd-03` (não `pd-02`, já reservado ao spike-gate no `PROJECT_STATE` v4.0) | **Usuário** (portão, 08/09) |
| Incluir a verificação da credencial Google OAuth no escopo desta branch | **Usuário** (portão, 08/09) |
| Formato IA sozinha, modelo Sonnet (análise e implementação) | **Usuário** (portão, 08/09) |
| Checar dependência não declarada com `eslint-plugin-import-x` em vez de `depcheck`/`knip` como ferramenta separada | IA (Fase 1 — reaproveita o `npm run lint` já existente; `depcheck` sem publicar há 13 meses; `knip` varre o monorepo inteiro, mais ruído do que o problema pede) |
| `packageDir` da regra = diretório do próprio workspace | IA (Fase 1 — é o que força cada workspace a declarar no próprio `package.json`, fechando o furo do hoisting) |
| Sem ADR | IA (Fase 1 — upgrade de dependência pinada e regra de lint são trivialmente reversíveis) |
| Credencial ainda válida, rotação fica para depois (não nesta tarefa) | **Usuário** (encerramento, 08/09) |

## Validações

Todas após `npm install` (lockfile atualizado nesta branch).

| O quê | Resultado |
|---|---|
| Lint | **4/4 workspaces**, limpo — 0 violação pré-existente com a regra nova ativa |
| Checagem de tipos | **5/5 tasks** (turbo), exit 0 |
| Build | **3/3 tasks**, exit 0 |
| Testes | **2 suítes, 10 testes** — `domain` 8, `api` e2e 2 |
| Teste de contrato | **1 suíte, 1 teste** |
| `npm audit` | 3 `high`, mesma cadeia pré-existente `prisma → @prisma/config → deepmerge-ts` — sem regressão |
| **CI (run `34244918927`, push)** | **verde**, 58s |
| **CI (run `34245049149`, pull_request)** | **verde**, 1m29s |
| Smoke de boot | Coberto dentro dos runs de CI acima (step próprio do `ci.yml`); não executado localmente — não era necessário para esta mudança |

### Prova de vermelho

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| 1 | Import não declarado (`import 'lodash'`) adicionado temporariamente em `apps/api/src/main.ts` | `import-x/no-extraneous-dependencies` acusou: *"'lodash' should be listed in the project's dependencies"*. Revertido antes do commit; `git diff` confirmou zero resíduo |

## Pendências geradas

Registradas no [`BACKLOG.md`](../../BACKLOG.md):

- **Credencial Google OAuth** — confirmada **ativa** no console do Google
  Cloud (Victor, 08/09/2026). Rotação **não** feita nesta tarefa; fica como
  próximo passo, registrado no item.
- **`GH_TOKEN` fine-grained volta a aparecer no shell do agente** — item
  **novo**. A `pd-01` (07/09) havia registrado essa variável como removida do
  ambiente Windows, verificado com um PR de teste. Nesta tarefa, `gh pr
  create` falhou de novo com o mesmo erro de permissão, e `${GH_TOKEN:+yes}`
  confirmou a variável presente no shell do Bash tool. Contornado com `env -u
  GH_TOKEN` por chamada (a conta certa, `vhaguiar002`, já estava autenticada
  via keyring). Falta localizar onde a variável é setada para esse shell
  especificamente — a remoção da `pd-01` não cobriu esse caso.
- **Prisma 7, vuln `deepmerge-ts`, NestJS 12** — seguem travados por gatilho;
  reverificados com data de 08/09/2026, nenhuma mudança de estado.

Nenhuma pendência nova de código, migration ou deploy.

## Estado ao encerrar

`master` = `f724945`, CI verde nos dois runs (push e PR), branch removida
(local e remota), checkout de volta em `master`, árvore limpa antes do commit
final. Próxima tarefa candidata: **`pd-02` — spike-gate do cliente
universal**, ou **OTel** (backlog recomenda antes do primeiro módulo de
domínio).

> **Nota de processo — divergência de `master` no merge.** O `git status`
> local, conferido como pré-condição do portão Fase 1 → Fase 2, mostrava
> árvore limpa e `HEAD` em `431109c` — mas esse commit **nunca tinha sido
> empurrado para `origin`** (ficou local, de um trabalho anterior a esta
> conversa). Ao tentar sincronizar `master` local após o squash-merge do PR
> #2, o fast-forward falhou: `origin/master` (`f724945`) tinha como pai
> `7402af8`, não `431109c`. Verificado por diff de árvore completa que
> `f724945` já continha, em conteúdo, tudo o que `431109c` trazia (o squash
> merge do GitHub aplica o estado final da branch da PR, que já carregava
> `431109c` como ancestral) — nenhuma perda. Resolvido com `git reset --hard
> origin/master`. **Fica como observação**, não como item de backlog: foi
> resolvido no ato e não deixou trabalho pendente, mas reforça que o portão
> Fase 1 → Fase 2 poderia incluir `git fetch` + comparação com `origin/<base>`
> antes de criar a branch, não só o estado local.
