---
title: "Relatório — pd-14/feat/perfil-do-tutor-e-pets"
status: stable
version: "1.0"
updated: 2026-09-12
scope: >
  Relatório de encerramento da pd-14: o perfil do tutor, o endereço padrão e os
  pets — a quarta migration, o sexto módulo da API, as quatro telas novas do
  apps/app e a primeira escrita de domínio pelo cliente. Registra as decisões,
  as validações com números reais, a prova de vermelho das quatro mutações, o
  saldo do backlog e o que deliberadamente não entrou.
relates_to:
  - 06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md
  - 08-features/tutors/PERFIL_DO_TUTOR_E_PETS.md
  - 07-process/BACKLOG.md
type: process
---

# pd-14/feat/perfil-do-tutor-e-pets

**Encerrada em:** 12/09/2026
**Merge:** _(a preencher no squash)_ em `develop`
**ADR:** [0015 — Perfil do tutor e pets antes da reposição](../../../06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md)
e [0016 — O diretório de CEPs fica atrás da nossa API](../../../06-decisions/ADR/0016-diretorio-de-ceps-atras-da-nossa-api.md)

---

## Objetivo

Nas palavras do Victor, abrindo a Fase 1:

> "quero que um tutor consiga criar conta pelo app, informar endereço padrão
> (bairro e CEP) e cadastrar o pet com peso, como a J1 descreve. Fora: a
> calculadora de reposição e a agenda ficam para a capacidade 9, salvo se a
> análise mostrar que o pet sem projeção não entrega valor no primeiro uso."

**Contexto.** Era o próximo item da sequência acordada em 12/09/2026: *"`tutors`
— perfil, endereço padrão e pets (capacidade 2). É o que o pedido precisa para
ter destino de entrega. Inclui a tela de cadastro, que a `pd-13` deixou de fora
de propósito"*. A `pd-13` entregou o login pela interface e o primeiro endpoint
autenticado; **criar conta só existia por `curl`**.

## Diagnóstico

A condição do briefing — *"salvo se a análise mostrar que o pet sem projeção não
entrega valor no primeiro uso"* — foi investigada e a resposta é **sim, o pet
sozinho não entrega esse valor**. A J1 diz que o truque de onboarding é a
calculadora. **Mas a calculadora não podia entrar.**

| # | O que estava errado | Como se sabe |
|---|---|---|
| 1 | A regra de consumo ("peso + embalagem → gramas/dia") **não existe em documento nenhum** do repositório | `grep` por "gramas/dia", "consumo" e "projeção" em `IDEACAO_FASE1`, `DOMAIN_MODEL`, `MVP_SCOPE` e `GLOSSARY`: os quatro **nomeiam** a regra, nenhum a **define**. Não há tabela de consumo, tratamento de filhote × adulto nem definição de produto consumido |
| 2 | A J1 estava documentada como "parcial" sem dizer o que faltava, e o `DOMAIN_MODEL` **contradizia o código pretendido** | `DOMAIN_MODEL` §Tutor dizia "⏳ ainda não está no banco" e §Usuário dizia "ninguém escreve em `phone` ainda"; `IDENTIDADE_E_ACESSO` listava "cadastro pela interface" em "o que **não** faz" |
| 3 | O `RolesGuard` existia desde a `pd-12` e **nenhuma rota real o usava** | `grep -rn "@Roles(" apps/api/src` antes da branch: só `apps/api/test/guards.e2e-spec.ts`, sobre um controller descartável |

**Conclusão:** inventar a fórmula violaria `AGENTS.md` ("nunca invente regra de
negócio"), e fórmula provisória vira produção. O valor que a `pd-14` **pode**
entregar sem inventar nada é ligar o endereço ao comparador que já existe — e é
o que ela faz (ADR-0015, D8).

**Dois achados que não eram da tarefa** estão na seção "Pendências geradas".

## O que foi feito

### `packages/domain` — as regras puras

- **`pet-weight.ts`** — `MIN_PET_WEIGHT_GRAMS = 100`, `MAX_PET_WEIGHT_GRAMS =
  120_000`, `assertPetWeightIsPlausible`, `isPlausiblePetWeight` e
  `kilogramsToGrams('12,5') → 12500`. Os limites são **sanidade de dado, não
  regra de negócio** — cobrem gato filhote a dogue alemão e existem para pegar
  a digitação errada; o comentário no arquivo diz isso e que são reversíveis.
  A conversão vive aqui para a capacidade 9 reusá-la, e para `12,5` e `12.5`
  não poderem significar pesos diferentes.
- **`calendar-date.ts`** — `parseBrazilianDate('12/03/2021') → '2021-03-12'`,
  `isCalendarDate` e `isNotAfterToday`. O calendário é conferido à mão, **sem
  `Date`**: `new Date('2021-02-31')` rola silenciosamente para março, e
  `Date.UTC(21, …)` mapeia ano de dois dígitos para 1921.

### `packages/contracts`

- **`identity.ts`** — `authenticatedUserSchema` ganhou `phone: string | null`.
  ⚠️ Isso muda `/auth/me`, o `user` de todo `AuthTokens` e a sessão guardada no
  app.
- **`tutors.ts`** (novo) — os dez schemas do perfil e dos pets. Validação na
  borda, **normalização no caso de uso** (padrão da `pd-09`), sem `transform`,
  para o tipo de entrada e o de saída do OpenAPI coincidirem.

### Banco — a quarta migration

`tutors` (1:1 com `users`) e `pets`, mais o enum `pet_species`. Os dois `CHECK`
foram escritos à mão no SQL, porque o Prisma não os modela.

### `apps/api` — o sexto módulo

- **`modules/tutors/`** nas quatro camadas do `CODING_STANDARDS`, com sete
  rotas. 🔴 **A posse está no `where` da própria consulta** —
  `findFirst({ where: { id: petId, tutorId } })` —, não numa checagem anterior:
  não existe caminho em que a linha alheia chega à mão e só depois é escondida.
- **`@Roles('TUTOR')` nas duas classes de controller** — a primeira rota real
  com `@Roles()` do projeto.
- **`identity`** ganhou `UpdateUserPhoneUseCase` e passou a exportar dois casos
  de uso. O módulo `tutors` **não toca a tabela `users`**;
  `grep -n "prisma\.user" apps/api/src/modules/tutors/` devolve vazio, e
  `grep -n "prisma\.\(tutor\|pet\)" apps/api/src/modules/identity/` também (C12).

### `apps/app` — a primeira escrita de domínio pelo cliente

- **`api/http.ts`** ganhou `putJson`, `patchJson` e `deleteJson`, **todos por
  `request()`** — mesmo caminho de `Bearer`, renovação proativa e repetição
  reativa. Um write que atalhasse para `fetch` seria a única chamada que
  deslogaria alguém num token só prestes a expirar.
- **Quatro telas novas** e a reorganização de `conta.tsx` → `conta/index.tsx`.
- **`onboarding/next-step.ts`** — a ordem dos passos como função pura e
  testada: o endereço vem antes do pet porque o pet pendura no perfil, não por
  preferência estética.
- **`product-compare-screen.tsx`** — o pré-preenchimento do CEP (A10), com um
  `touched` que garante que quem mexeu manda.
- **Máscara de celular e CEP ao digitar** — `formatBrazilianPhone` e
  `formatPostalCode` em `packages/domain` (ao lado dos normalizadores: são as
  duas direções da mesma regra) e `applyMask` em `apps/app/src/ui/masks.ts`,
  que é o que faz o **backspace sobre o separador** apagar um dígito em vez de
  parecer travado. ⚠️ **Veio do teste manual do Victor**, não do plano: *"Campos
  celular e CEP não formatam corretamente com a digitação, preciso disso"*. Pela
  regra §3.2 foi resolvido na própria tarefa. De quebra, removeu duas cópias
  locais das mesmas funções que a `account-screen.tsx` carregava.

### O módulo `postal-codes` — escopo acrescentado no teste manual

Também veio do Victor, no mesmo momento: *"O CEP pode vir primeiro, e ao
digitá-lo, a aplicação busca o endereço automaticamente"*.

⚠️ **Não era escopo do plano, e não é uma mudança de tela:** seria a **primeira
chamada a serviço de terceiro em runtime** do PetDots — uma varredura em
`apps/api/src` e `apps/app/src` confirmou **zero** antes desta entrega. Por
isso foi levada de volta a ele como decisão, com três opções, e ele escolheu
**pela nossa API**. O porquê de cada escolha está no
[ADR-0016](../../../06-decisions/ADR/0016-diretorio-de-ceps-atras-da-nossa-api.md).

- **Módulo `postal-codes`**, o primeiro **sem tabela nenhuma**: é dono de uma
  fronteira, não de dado. `IPostalCodeGateway` no domínio,
  `ViaCepPostalCodeGateway` na infra — trocar de provedor é trocar a classe
  registrada, e o cliente nunca aprende o nome do terceiro.
- **Rota autenticada, sem `@Roles()`.** Fechada porque um endpoint aberto que
  repassa um parâmetro de caminho a um terceiro é um proxy que qualquer um
  aponta para ele, no nosso IP. Sem papel porque o lojista cadastrando o
  endereço da loja vai precisar, e ele não é `TUTOR`.
- **Duas falhas distintas**, que é o ponto do módulo existir:
  `404 POSTAL_CODE_NOT_FOUND` ("esse CEP não existe") × `503
  POSTAL_CODE_LOOKUP_UNAVAILABLE` ("não conseguimos perguntar"). Colapsá-las
  acusaria o usuário de um erro nosso.
- **Timeout de 3 s**, resposta do terceiro **parseada com Zod** (o ViaCEP
  responde `200` com `{"erro":"true"}` para CEP inexistente — ler só o status
  viraria sucesso com tudo vazio), e **cache limitado a 500 entradas**, esvaziado
  inteiro ao encher.
- **No cliente, nenhuma falha vira erro visível** — o formulário segue digitável
  e salvável. E **rua e bairro só são sobrescritos quando o diretório sabe**: um
  "CEP único" devolve string vazia e nada é apagado.

### Docs

**Vinte e três documentos** na mesma entrega. Os dois que **contradiziam** o
código, e não só o desatualizavam, eram `DOMAIN_MODEL` (§Tutor e §Usuário) e
`IDENTIDADE_E_ACESSO` ("cadastro pela interface" em "o que não faz") — quem os
lesse restauraria premissas falsas. Nasceu
[`08-features/tutors/PERFIL_DO_TUTOR_E_PETS.md`](../../../08-features/tutors/PERFIL_DO_TUTOR_E_PETS.md).

## Migrations

| Migration | O que muda | Aplicada em |
|---|---|---|
| `20260913001522_create_tutors_and_pets` | Tabelas `tutors` e `pets`, enum `pet_species`, índice único `tutors_user_id_key`, índice `pets_tutor_id_idx`, FKs com `ON DELETE CASCADE`, e dois `CHECK` à mão (`pets.weight_grams > 0`, `tutors.postal_code` de oito dígitos) | **Postgres local** (5437) em 12/09/2026 e o **Postgres efêmero** dos testes a cada run. **Nenhum ambiente remoto** — não existe deploy |

**Seed: sem mudança.** Nenhum tutor nem pet é semeado, de propósito — criar o
perfil e o pet pela tela **é** o roteiro.

## Decisões tomadas

| Decisão | Quem |
|---|---|
| A1–A18 do plano (escopo, forma da tabela, onde o celular vive, posse por `404`, singleton `/me`, onboarding não bloqueante, sem evento, sem seed…) | IA, na Fase 1 |
| **P1 — a calculadora fica fora da `pd-14`** | **Victor**, 12/09/2026 ("Sim, vamos com suas recomendações. Pode iniciar") |
| **P1b — `orders` continua sendo a `pd-15`** (a alternativa era puxar a capacidade 9) | **Victor**, 12/09/2026, **reconfirmado no encerramento desta branch**. Ver abaixo |
| **P2 — o celular entra já, no perfil** | **Victor**, 12/09/2026 |
| **P3 — rua, número, bairro e CEP obrigatórios** | **Victor**, 12/09/2026 |
| **P4 — escrever o ADR-0015** | **Victor**, 12/09/2026 |
| **P5 — Opus, IA sozinha** | **Victor**, 12/09/2026 |
| Reparar o checksum de `_prisma_migrations` em vez de `migrate reset` | IA — ver "Pendências geradas" |

> **Sobre o P1b.** O plano registrava uma tensão real: o ADR-0014 mergeou
> **minutos depois** da aprovação em bloco e destravou `orders`, refutando um
> dos dois argumentos da recomendação original ("`orders` ainda espera os ADRs
> do ciclo do dinheiro"). Havia duas decisões do mesmo dia apontando para lados
> diferentes. **Perguntado no encerramento, o Victor manteve `orders` como
> `pd-15`.** Os motivos que sustentam: as travas de `orders` caíram e as da
> capacidade 9 **não** — ela ainda espera o ADR da fórmula, que não existe.
> **Custo assumido e registrado:** `pets.weight_grams` fica sendo dado morto até
> a capacidade 9 entrar.

## Validações

Todos os números abaixo são de execução real em 12/09/2026, com `--force` (sem
cache do Turborepo).

| O quê | Resultado |
|---|---|
| Lint | **5 tarefas**, verde |
| Checagem de tipos | **5 tarefas**, verde |
| Build | **5 tarefas**, verde |
| Testes | **39 suítes, 383 testes** — todos verdes |
| Teste de contrato | **1 suíte, 1 teste** — snapshot regenerado, e o diff do `openapi.json` **só acrescenta** (630 linhas, zero remoções) |
| `format:check` | Verde no repositório inteiro |
| `check-frontmatter.sh` | **OK** em todos os `.md` criados ou alterados |
| Smoke de boot | Subido em **`PORT=3999`** para não colidir com o processo do Victor, medido e **derrubado na mesma resposta** |

### Baseline × depois

| Workspace | Antes (`develop`) | Depois | Δ |
|---|---|---|---|
| `domain` | 10 suítes / 84 testes | **12 / 127** | +2 / +43 |
| `contracts` | 5 / 56 | **6 / 75** | +1 / +19 |
| `app` | 3 / 28 | **5 / 40** | +2 / +12 |
| `api` | 14 / 115 | **16 / 141** | +2 / +26 |
| **Total** | **32 / 283** | **39 / 383** | **+7 / +100** |

O baseline foi medido na `develop` antes de criar a branch e bateu exatamente
com o que o plano previa.

### Smoke de boot (subido, medido e derrubado)

| Rota | Esperado | Obtido |
|---|---|---|
| `GET /api/v1/health` | `200` | ✅ `200` |
| `GET /api/v1/tutors/me` sem token | `401` | ✅ `401` |
| `GET /api/v1/tutors/me/pets` sem token | `401` | ✅ `401` |
| `GET /api/v1/products` | `200` | ✅ `200` |
| `GET /api/v1/delivery-areas` | `200` | ✅ `200` |

O boot é o que prova a fiação de módulos que o `tsc` não pega: `TutorsModule`
importa `IdentityModule`, que precisa exportar os dois casos de uso — esquecer
daria erro de DI só ao subir.

### O adapter contra o ViaCEP de verdade

O e2e injeta um diretório **falso**, de propósito: uma suíte que dependesse do
uptime de terceiro falharia por motivos que não são nosso código, seria inútil
offline e nos tornaria gerador de carga de um serviço gratuito. Mas isso deixa
**uma** coisa sem prova — que o adapter entende o que o ViaCEP realmente
responde. Conferido à parte, contra o serviço real, com a API de pé em 3999:

| Consulta | Resultado |
|---|---|
| `20720-010` | `200` — `Rua Dias da Cruz`, `Méier`, `Rio de Janeiro`, `RJ` |
| `99999999` | `404 POSTAL_CODE_NOT_FOUND` |
| `2072` (malformado) | `422`, **sem** chamar o diretório |
| sem token | `401`, **sem** chamar o diretório |
| segunda chamada ao mesmo CEP | **53 ms** — veio do cache |

⚠️ **Isso corrigiu um erro do roteiro manual:** o plano usava `20720-000` como
"Rua Dias da Cruz, Méier", e o diretório diz que esse CEP é **Rua Barão de Santo
Ângelo, Engenho de Dentro**. O CEP certo da Rua Dias da Cruz é **`20720-010`**,
e o roteiro foi corrigido. Sem a busca automática o erro teria passado — o campo
aceitava qualquer CEP de oito dígitos.

### Log sem PII (C8)

Com `LOG_LEVEL=debug`, um `PUT /tutors/me` (`200`) e um `POST /tutors/me/pets`
(`201`) reais. Varredura nas **59 linhas** de log geradas:

| Termo procurado | Ocorrências |
|---|---|
| `Victor` (nome), `Thor` (pet) | **0** |
| `99999`, `+5521999990001` (celular) | **0** |
| `Dias da Cruz`, `Meier`, `20720` (endereço) | **0** |
| e-mail, senha | **0** |

As três linhas do módulo saíram assim — **só ids**:

```
user phone updated (userId=1a703c7d-…)
tutor profile saved (tutorId=2ff6a7a2-…, userId=1a703c7d-…)
pet registered (petId=e84d6554-…, tutorId=2ff6a7a2-…)
```

⚠️ O smoke gravou uma conta de teste no Postgres local; ela foi **apagada ao
final**, e a checagem pós-exclusão (`3 users, 0 tutors, 0 pets`) também provou o
`ON DELETE CASCADE` das duas FKs novas.

### Prova de vermelho

Quatro mutações, cada uma aplicada e revertida, com `diff` confirmando a
restauração byte a byte.

| # | Mutação aplicada | Testes que caíram |
|---|---|---|
| a | `CREATE UNIQUE INDEX "tutors_user_id_key"` comentado **na migration** | **T14(a)** — "refuses a second tutor profile for the same user". (10 falhas no total: sem o índice único, o `upsert` por `userId` também deixa de funcionar) |
| b | `CHECK ("weight_grams" > 0)` comentado **na migration** | **T14(b)** — "refuses a pet of zero grams". 1 falha, cirúrgica |
| c | `tutorId` removido do `where` de `findByIdForTutor`/`updateForTutor`/`deleteForTutor` | 🔴 **T11 — o teste de posse.** Tutor B passou a ler, editar e apagar o pet do tutor A. (3 falhas: T11 e as duas que dependem do pet de A continuar existindo) |
| d | `@Roles('TUTOR')` removido de `TutorsController` | 🔴 **T6** — "an ADMIN without the TUTOR role is forbidden". 1 falha |

⚠️ As mutações de constraint foram feitas **no SQL da migration**, nunca no
`schema.prisma` — lição da `pd-09`: mexer no schema não muda o banco que os
testes migram.

### O que **não** rodou

- **Nenhum teste de renderização das telas.** É decisão registrada (ADR-0012,
  A11) e vale igual aqui: as nove telas do `apps/app` não têm teste de
  renderização. A verificação delas é o **roteiro manual**, blocos A e B. O
  único teste de app que nasceu nesta branch é de lógica pura
  (`next-onboarding-step`).
- **Nenhum build nativo.** O `expo-secure-store` continua só conferido pelo
  `tsc` (vigilância do backlog).
- **Os blocos A e B do roteiro manual** — são do Victor, e são o que falta para
  o encerramento.

## Saldo do backlog

| | Antes | Depois |
|---|---|---|
| Fila (acionável) | 1 | **1** |
| Vigilância (com gatilho) | 23 | **25** |

**Saíram da fila:** nenhum — a fila tem um item só (revogar o OAuth client do
protótipo legado) e ele depende de acesso ao console do Google Cloud, não de
código.

**Resolvidos dentro da tarefa, sem virar linha de backlog** (regra §3.2 — nunca
estiveram na fila):

- `IDENTIDADE_E_ACESSO` não estava indexado em `docs/README.md` desde a `pd-13`;
- a `pd-13` nunca foi registrada em "Aguardando promoção para `master`";
- o inventário documental do `PROJECT_STATE` estava defasado em **18 arquivos**
  (o PR #13 subiu onze documentos sem atualizá-lo) — reconferido contra o
  frontmatter de cada um.

**Entraram na vigilância, e por que não couberam aqui:**

| Item | Gatilho que falta | Quem/o que destrava |
|---|---|---|
| Exclusão de pet é física | `replenishment_schedules` referenciar `pets` | A capacidade 9. Hoje **nada** referencia `pets`, e um `deleted_at` carregado por toda consulta para um caso inexistente é especulação. A escolha cascata × soft-delete precisa de uma agenda na mão |
| `BUG-V01` — `string \| null` vira `array de string` no `openapi.json` | `nestjs-zod`/`@nestjs/swagger` preservarem `type: [T, 'null']` no schema de topo, **ou** o projeto gerar cliente pelo contrato | Biblioteca de terceiros. **Não há correção possível deste lado:** depois que a informação se perde, um `z.array(z.string())` legítimo e um `z.string().nullable()` são indistinguíveis no documento |

**Item ampliado, não duplicado:** "Evento `waitlist.joined` documentado mas não
emitido" virou "**Três** eventos de domínio documentados e não emitidos", agora
cobrindo `tutor.created` e `pet.created`. Mesmo gatilho e mesmo motivo — fundir
era o certo; abrir um item novo teria inflado a lista sem acrescentar trabalho.

## Pendências geradas

- **`BUG-V01`** em [`BUGS.md`](../../BUGS.md) §"A validar", com a linha-ponteiro
  correspondente na vigilância do [`BACKLOG.md`](../../BACKLOG.md). ⚠️ **É
  pré-existente** — atinge `petFoodDeclared` (`pd-09`) e `ean` (`pd-11`) além
  dos dois campos novos; só foi **encontrado** aqui, lendo o `openapi.json`
  regenerado.
- **Item 12 da intervenção manual** — confirmar a base legal do cadastro (sem
  checkbox, por execução de contrato) e o texto do aviso de privacidade linkado
  em `/cadastro`.
- **Item 3 da intervenção manual ampliado** — a copy das quatro telas novas e as
  mensagens de erro.
- **`IDEIAS.md`** — "Segundo endereço por tutor (tabela `addresses`)", com
  gatilho; e duas notas que **corrigem premissas**: a verificação de telefone
  ficou **mais** necessária (agora `users.phone` é escrito de verdade), e o
  aceite de termos versionado é outra coisa do que o checkbox ausente.

### ⚠️ Uma intervenção fora do código, que precisa ser dita

O `prisma migrate dev` recusou-se a rodar no início da branch:
*"the migration `20260912001114_create_users_and_refresh_tokens` was modified
after it was applied"*, propondo `migrate reset` — que **apagaria os dados
locais do Victor**.

**Diagnóstico:** o checksum gravado em `_prisma_migrations` (`87d3a62f…`) não
batia com o do arquivo em Git (`edbb5220…`). Os bytes do arquivo mudaram
**depois** de ele ter sido aplicado, durante a `pd-12`. **O schema aplicado
confere com o arquivo** — as duas `CHECK`, os índices e a FK foram conferidos um
a um no banco —, ou seja, só a escrituração estava velha, não o banco.

**Ação tomada:** um `UPDATE` de uma linha corrigindo o checksum para o valor real
do arquivo, em vez do reset. Reversível (o valor anterior está registrado acima),
e não toca dado nenhum.

**Alcance:** só o Postgres local (5437). Os testes e2e sobem container efêmero e
gravam checksum novo; o CI nunca viu isso. **Não virou item de backlog** porque
não é defeito de código nem sobrou pendência — é escrituração de um banco de
desenvolvimento, corrigida.

---

## Avaliações obrigatórias da Fase 1

**Auditoria — não se aplica**, e o motivo fica registrado. O `SECURITY` nomeia
as quatro mutações que exigem rastro no MVP — preço de oferta, aceite/recusa de
pedido, tabela de comissão, categoria de produto — e **nenhuma nasce aqui**.
`audit_log` e o `Audit` interceptor continuam nascendo com a escrita de ofertas.
Em troca: `created_at`/`updated_at` nas duas tabelas, log estruturado só com
ids, e posse verificada **e testada**.

⚠️ **O que muda de verdade não é auditoria, é LGPD.** Esta é a **primeira
escrita de dado pessoal de pessoa de fora da equipe** na API. A minimização está
feita e medida (C8 acima); **exportação e exclusão a pedido do titular
continuam não existindo** — são a capacidade 14, e o doc de feature declara isso
explicitamente em vez de deixar implícito.

**Documentação:** 23 documentos, dois dos quais **contradiziam** o código.

**Testes que nasceram:** unidade em `packages/domain` (2 suítes) e
`packages/contracts` (1); o e2e `tutors` com o **primeiro teste de posse** e o
**primeiro `403` de papel** em rota real; três sentinelas de constraint com
prova de vermelho; `public-routes` estendido às duas rotas novas;
`identity` afirmando `phone`; contrato regenerado; e um teste de lógica pura no
app. **As telas seguem sem teste de renderização** — o vão está declarado acima.
