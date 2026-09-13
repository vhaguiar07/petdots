---
title: Feature — Perfil do Tutor e Pets
status: stable
version: "1.1"
updated: 2026-09-12
scope: >
  Visão transversal do perfil do tutor no PetDots — banco, API e cliente numa
  leitura só: as tabelas tutors e pets, as sete rotas de /tutors, a posse por
  404, as quatro telas do apps/app e o onboarding guiado, o pré-preenchimento
  do comparador, o que a feature deliberadamente ainda não faz (calculadora de
  consumo, agenda, segundo endereço, exportação e exclusão LGPD) e como o
  Victor opera isso hoje.
relates_to:
  - 01-product/USER_JOURNEYS.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 04-api/API_GUIDELINES.md
  - 04-api/ERROR_MODEL.md
  - 03-engineering/SECURITY.md
  - 06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md
  - 06-decisions/ADR/0016-diretorio-de-ceps-atras-da-nossa-api.md
  - 08-features/identity/IDENTIDADE_E_ACESSO.md
type: product
---

# Feature — Perfil do Tutor e Pets

> Leitura transversal de **uma** feature: banco → API → cliente, o que ela não
> faz, e como operá-la. O detalhe de cada camada continua nos documentos
> canônicos — [`DOMAIN_MODEL`](../../01-product/DOMAIN_MODEL.md) para as
> entidades, [`API_GUIDELINES`](../../04-api/API_GUIDELINES.md) para a
> convenção do singleton `/me`, [`SECURITY`](../../03-engineering/SECURITY.md)
> para posse e LGPD, e o
> [ADR-0015](../../06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md)
> para o porquê de cada escolha.

---

## O que é

Quem é o tutor, para onde entregar, e quais pets ele tem.

Entregue na **`pd-14`** (12/09/2026). É a **capacidade 2** do
[`MVP_SCOPE`](../../01-product/MVP_SCOPE.md) e os **três primeiros passos da
J1** — a jornada de onboarding. Com ela, criar conta deixou de depender de
`curl`: a tela `/cadastro` fecha a lacuna que a `pd-13` deixou de propósito.

**O que ela existe para destravar:** o pedido (`orders`) precisa de destino de
entrega, e a reposição inteligente precisa do peso do pet. Os dois insumos
nascem aqui.

> ⚠️ **A projeção "seu saco dura N dias" não faz parte desta feature.** Ver
> "O que esta feature **não** faz ainda".

---

## Banco

Duas tabelas, migration `create_tutors_and_pets` — a **quarta** do projeto.

| Tabela | O que guarda |
|---|---|
| `tutors` | O perfil de consumo: `user_id` (**único**), `name`, e o endereço padrão em colunas planas — `street`, `street_number`, `complement`, `neighborhood`, `postal_code`, `reference` |
| `pets` | `tutor_id`, `name`, `species` (`DOG`/`CAT`), `birth_date` (nulo permitido), `weight_grams` |

### As constraints que carregam regra

| Constraint | O que ela significa |
|---|---|
| `tutors_user_id_key` (único) | **Um perfil por identidade.** É ela que faz `PUT /tutors/me` ser um upsert sem nada a reconciliar — o repositório não lê antes de escrever, deixa o índice decidir |
| `pets_weight_grams_check` (`> 0`) | O peso é o que a calculadora vai **dividir**. O contrato recusa na borda e o domínio reconfere no caso de uso; esta é a única das três que vale também para um seed, um script ou o `prisma studio` |
| `tutors_postal_code_check` (oito dígitos) | `CHAR(8)` sozinho aceitaria `2072-000`. É o `CHECK` que faz a coluna significar "um CEP" em vez de "oito caracteres" — e `postal_code` é consultado para decidir quem entrega |
| `pets_tutor_id_idx` | Toda consulta de pet filtra por dono; sem o índice, a posse custaria varredura |

As três primeiras foram **provadas em vermelho**: comentadas na migration ou no
código, o teste que as protege cai.

### Por que o endereço não é uma tabela

`default_address` é um **value object** do tutor (`DOMAIN_MODEL`), e o MVP tem
**um** endereço por tutor. Tabela filha para um valor único normalizaria o que
não tem vida própria. Colunas e não JSONB porque `neighborhood` e `postal_code`
são **consultados** — o pré-preenchimento do comparador hoje, a elegibilidade de
entrega em `orders`. E histórico não pede tabela: o pedido grava
`delivery_address` como **snapshot próprio**.

**Gatilho para criar `addresses`:** segundo endereço por tutor virar requisito.

### Por que o celular não está em `tutors`

`users.phone` é onde o `DOMAIN_MODEL` o põe, porque é como a plataforma alcança
uma **pessoa** — o lojista também tem telefone e pode não ter perfil de tutor.
Quem **coleta** é o formulário de perfil; quem **escreve** é
`UpdateUserPhoneUseCase`, exportado pelo `IdentityModule`. O módulo `tutors`
nunca toca a tabela `users`.

⚠️ **Consequência aceita:** `PUT /tutors/me` escreve em duas tabelas de dois
módulos **sem transação compartilhada**. Se a segunda escrita falhar, o perfil
fica salvo com o celular velho. A ordem é tutor primeiro, celular depois, e a
rota é idempotente — repetir corrige.

---

## API

Sete rotas sob `/api/v1/tutors`. **Todas fechadas**, todas com
`@Roles('TUTOR')` — as primeiras rotas reais com `@Roles()` do projeto.

| Rota | Status | O que faz |
|---|---|---|
| `GET /tutors/me` | `200` / `404` | O perfil de quem está com o token. `404 TUTOR_NOT_FOUND` enquanto não existe |
| `PUT /tutors/me` | `200` | **Upsert idempotente.** Cria ou substitui, e responde `200` sempre. Sem `Location` |
| `POST /tutors/me/pets` | `201` | Cria o pet, com `Location` apontando para a rota de leitura |
| `GET /tutors/me/pets` | `200` | `{ items }`, sem paginação — um tutor tem um punhado de pets |
| `GET /tutors/me/pets/{petId}` | `200` / `404` | |
| `PATCH /tutors/me/pets/{petId}` | `200` / `404` | Parcial; corpo vazio é `422` |
| `DELETE /tutors/me/pets/{petId}` | `204` / `404` | Exclusão **física**. O segundo `DELETE` do mesmo id é `404` |

### `404 TUTOR_NOT_FOUND` não é erro

O cadastro cria `User` e mais nada (ADR-0011, A10), então **toda conta começa
assim**. É o que diz ao app "perfil incompleto → onboarding", e o cliente trata
esse código — e só esse — como "ainda não há perfil". Qualquer outra falha
continua sendo falha.

### Posse: `404`, nunca `403`

Pet de outro tutor responde `404 PET_NOT_FOUND`, igual a um pet que nunca
existiu. `403` diria "existe, e não é seu" — confirmando ao mesmo tempo que o id
é real e que tem dono, que é o que um estranho sondaria.

🔴 **A posse está no `where` da própria consulta**, não numa checagem antes
dela: `findFirst({ where: { id: petId, tutorId } })`. Não existe caminho em que
a linha alheia chega à mão e só depois é escondida. E o `tutorId` **nunca vem da
requisição** — é derivado do token, em tempo de requisição.

O teste T11 do `tutors.e2e-spec.ts` é o primeiro teste de posse da API, e o
padrão que `orders` vai copiar.

### Por que `PUT` e não `POST`

Um singleton não tem segundo estado. Uma tela só — o formulário, vazio ou
preenchido — serve criar e editar; um `POST` repetido num celular com rede ruim
daria `409` onde o `PUT` repetido dá o mesmo resultado. A convenção está
registrada em [`API_GUIDELINES`](../../04-api/API_GUIDELINES.md) §"O singleton
do usuário corrente".

---

## Cliente (`apps/app`)

Quatro telas novas, todas dentro do grupo privado exceto `/cadastro`.

| Rota | Tela | O que faz |
|---|---|---|
| `/cadastro` | Criar conta | E-mail e senha, e nada mais. Sucesso → onboarding |
| `/conta/endereco` | Seu endereço | Nome, celular e o endereço padrão. Cria **e** edita |
| `/conta/pets/novo` | Seu pet | Nome, espécie (chips), nascimento e peso |
| `/conta/pets/{petId}` | Editar pet | O mesmo formulário, mais "Excluir pet" |

`/conta` deixou de ser `conta.tsx` e virou `conta/index.tsx`, para as rotas
aninhadas coexistirem.

### O onboarding é guiado e **nunca** bloqueante

```
/cadastro → /conta/endereco?onboarding=1 → /conta/pets/novo?onboarding=1 → /conta
```

Cada tela do fluxo traz **"Fazer depois"**, que leva direto a `/conta`. Forçar o
onboarding trancaria `admin@dev` (que não tem papel `TUTOR`) e quem só quer
olhar preço. Em `/conta`, quem não tem perfil vê um convite para completá-lo;
quem não é `TUTOR` não vê nada disso.

A ordem não é preferência estética: o pet pendura no perfil, então
`POST /tutors/me/pets` responde `TUTOR_NOT_FOUND` sem endereço. A regra está
isolada em `src/onboarding/next-step.ts` e é a **única** lógica do app com teste
unitário nesta entrega — as telas seguem sem teste de renderização, por decisão
registrada (ADR-0012, A11).

### Conversões que o domínio faz, e a tela não

| A pessoa digita | O contrato carrega | Quem converte |
|---|---|---|
| Peso `12,5` (kg) | `weightGrams: 12500` | `kilogramsToGrams` — aceita vírgula e ponto, arredonda para grama inteira |
| Nascimento `12/03/2021` | `birthDate: "2021-03-12"` | `parseBrazilianDate` — e é ele que recusa `31/02` |
| CEP `20720-000` | `postalCode: "20720000"` | `normalizePostalCode`, **no caso de uso** |
| Celular `(21) 99999-0001` | `phone: "+5521999990001"` | `normalizeBrazilianMobilePhone`, **no caso de uso** |

As duas primeiras acontecem na tela porque são entrada; as duas últimas no
servidor, porque a borda **valida** e o caso de uso **normaliza** — é o que faz
o tipo de entrada e o de saída do OpenAPI coincidirem.

### O CEP vem primeiro, e busca o endereço sozinho

O CEP é o campo que **identifica** a rua e o bairro, então abre o bloco de
endereço. Com oito dígitos, a tela chama `GET /api/v1/postal-codes/{cep}` e
preenche **Rua** e **Bairro**; o número e o complemento continuam sendo da
pessoa, porque nenhum diretório sabe em que apartamento ela mora.

A chamada vai à **nossa API**, que fala com o diretório de terceiro por trás de
uma porta (`IPostalCodeGateway`, hoje ViaCEP) — o app nunca aprende o nome do
provedor, e trocá-lo é trocar uma classe (ADR-0016).

🔴 **A busca nunca impede de salvar.** CEP inexistente (`404`), diretório fora
do ar (`503`), rede caída: tudo vira "não consegui", e o formulário segue
digitável exatamente como antes. Conveniência que impede de salvar deixou de ser
conveniência.

Rua e bairro são **sobrescritos** quando a busca acerta — o CEP define os dois,
então um CEP novo torna os valores antigos errados —, e continuam editáveis. Um
"CEP único", que cobre uma cidade inteira sem nomear logradouro, devolve string
vazia, e aí **nada é sobrescrito**.

### Celular e CEP são mascarados enquanto se digita

`formatBrazilianPhone` e `formatPostalCode` vivem em `packages/domain`, ao lado
dos normalizadores: **formatar e normalizar são as duas direções da mesma
regra**, e separá-las é como uma tela acaba com a sua própria ideia particular
do que é um CEP. As duas são **progressivas** — formatam o que já existe, sem
recusar nada, porque um número incompleto não é erro enquanto a pessoa digita;
recusar é trabalho do `isPostalCode`/`isBrazilianMobilePhone`, no envio.

🔴 O que `applyMask` (`apps/app/src/ui/masks.ts`) acrescenta é o **backspace
sobre o separador**. Como a máscara deriva dos dígitos, apagar o `-` de
`20720-000` deixa os mesmos oito dígitos e a formatação devolve o hífen na hora:
a tecla parece não fazer nada e o campo vira armadilha. Quando o texto encurtou
mas os dígitos não, a pessoa apagou um separador, e um dígito é descartado no
lugar dela.

O valor que vai para a API é a **string formatada** — o contrato a aceita
(a validação ignora pontuação) e o caso de uso normaliza. Ao carregar um perfil
existente, o celular volta em E.164 e a máscara **descarta o `+55`**: sem isso o
campo mostraria `(55) 21999-9900` e a pessoa "corrigiria" um número que já
estava certo.

### O valor de primeiro uso: o comparador já sabe onde você mora

Com sessão e papel `TUTOR`, `/precos/{slug}` chama `GET /tutors/me` **uma vez** e
pré-preenche o **CEP** — desde que a pessoa ainda não tenha mexido no bairro nem
no CEP. Resultado: quem acabou de cadastrar o endereço abre um produto e já vê
quem entrega na casa dela e por quanto.

CEP e não bairro porque o CEP é exato; o bairro só funciona se bater com o nome
de um dos chips. Sem perfil, ou com a chamada falhando, **nada acontece** — é
conveniência, e nunca pode ser o motivo de um comparador público mostrar erro.

### A exclusão de pet confirma em duas etapas na própria tela

"Excluir pet" troca por "Confirmar exclusão" + "Cancelar", sem `Alert` nativo —
que no web vira `window.confirm`, que nenhum estilo alcança e que um teste por
teclado não atravessa.

---

## Regras

- **Obrigatórios no endereço:** rua, número, bairro e CEP. Complemento e
  referência são opcionais.
- **Nascimento é opcional** — muitos tutores não sabem a data, e travar o
  cadastro por isso contraria "poucas telas, pouco esforço" (`PERSONAS`).
- **Peso entre 0,1 kg e 120 kg.** É sanidade de dado, **não** regra de negócio:
  cobre de gato filhote a dogue alemão, e existe para pegar o erro de digitação.
  Reversível.
- **O Pet ID é imutável** — é o que a carteira do pet da fase 2 vai pendurar.
- **Nenhum evento de domínio é emitido.** `tutor.created` e `pet.created` estão
  no `DOMAIN_MODEL` e não têm barramento nem consumidor; publicar no vazio é
  infraestrutura antecipada (mesma decisão da `pd-09` e da `pd-12`).
- **Log só com ids.** `tutorId`, `petId`, `userId` — nunca nome, celular,
  endereço ou nome do pet.
- **Sem checkbox de consentimento no cadastro:** a base legal de uma conta é a
  execução do contrato. A tela aponta o aviso de privacidade.

---

## O que esta feature **não** faz ainda

| Não faz | Onde entra |
|---|---|
| **Calculadora de consumo** — "seu saco de 15 kg dura 42 dias" | **Capacidade 9.** A regra "peso + embalagem → gramas/dia" **não está definida em documento nenhum** do repositório; escrevê-la é decisão de domínio e **exige ADR próprio** com a fonte da tabela de consumo. Até lá `weight_grams` é dado coletado e não consumido |
| Agenda de reposição e lembretes | Capacidade 9 / 10 |
| Produto que o pet consome | Capacidade 9 — é a outra metade do insumo da calculadora |
| **Segundo endereço por tutor** | `IDEIAS.md`. Gatilho: virar requisito; aí nasce a tabela `addresses` |
| **Exportar e excluir os dados do tutor (LGPD)** | **Capacidade 14.** ⚠️ Esta feature é a primeira que guarda dado pessoal de pessoa de fora, e o titular ainda **não** tem como exercer nenhum dos dois direitos |
| Verificação do telefone | Sem dono. `IDEIAS.md` — e o vão ficou **maior** com esta entrega, porque agora `users.phone` é escrito |
| Soft-delete de pet | Vigilância do backlog. Gatilho: `replenishment_schedules` referenciar `pets` |
| Foto do pet | Fora do MVP — não há upload de arquivo no projeto |

---

## Como o Victor opera hoje

**Criar uma conta pela tela** (o caminho que a `pd-14` abriu):

```bash
npm run dev -w @petdots/api     # 3001
npm run dev -w @petdots/app     # 8081
# http://localhost:8081 → "Criar conta"
```

> ⚠️ **A sessão guardada antes da `pd-14` é descartada uma vez.** O `user` da
> sessão passou a exigir `phone`, e o app parseia com Zod ao carregar: ao abrir
> depois de atualizar, você estará deslogado. É o comportamento desenhado
> (ADR-0012) e acontece **uma vez**.

Os três usuários semeados continuam valendo (`IDENTIDADE_E_ACESSO`).
`lojista@dev.petdots.local` tem papel `TUTOR` além de `STORE_MEMBER`, então
**também** enxerga o perfil e os pets — é o caso de interseção do RBAC.
`admin@dev.petdots.local` não tem `TUTOR` e recebe `403` em `/tutors/*`.

**Olhar os dados:**

```bash
npx prisma studio      # tabelas tutors e pets
```

`postal_code` com oito dígitos, `users.phone` em E.164, `weight_grams` inteiro,
`birth_date` como data pura.

**Por `curl`:**

```bash
TOKEN=$(curl -s localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"tutor@dev.petdots.local","password":"petdots-dev-2026"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')

curl -s localhost:3001/api/v1/tutors/me -H "Authorization: Bearer $TOKEN"
```
