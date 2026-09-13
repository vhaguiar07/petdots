---
title: "ADR-0015: Perfil do tutor e pets antes da reposição"
status: stable
version: "1.0"
updated: 2026-09-12
scope: >
  Registra como o perfil de consumo do tutor foi ao banco na pd-14: tabela
  tutors 1:1 com users criada num passo separado do cadastro, endereço padrão
  como colunas planas, celular vivendo na identidade e escrito por um caso de
  uso do identity, pets como sub-recurso com posse verificada por 404, e o
  singleton PUT /tutors/me idempotente. Explica por que a calculadora de
  consumo (capacidade 9) ficou de fora e o que o endereço entrega de valor
  sozinho. Não cobre orders, payments nem os direitos LGPD do tutor.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 01-product/USER_JOURNEYS.md
  - 03-engineering/SECURITY.md
  - 04-api/API_GUIDELINES.md
  - 04-api/AUTHENTICATION.md
  - 06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md
  - 06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md
  - 08-features/tutors/PERFIL_DO_TUTOR_E_PETS.md
type: decision
---

# ADR-0015: Perfil do tutor e pets antes da reposição

## Contexto

A [J1](../../01-product/USER_JOURNEYS.md) — "tutor cadastra pet e recebe a
projeção de quando a ração acaba" — estava parada no primeiro passo. A
[`pd-12`](0011-autenticacao-propria-antes-da-escrita.md) entregou a
autenticação e a `pd-13` a sessão do cliente universal, mas **não havia tela de
cadastro**: a única forma de criar uma conta era `curl`. E mesmo com conta, não
havia onde dizer quem é a pessoa nem para onde entregar.

Três forças em jogo:

1. **O pedido precisa de destino.** `orders` (a `pd-15`) grava
   `delivery_address`, e a elegibilidade de entrega é decidida por bairro e CEP.
   Sem perfil, o checkout teria que coletar endereço no meio da compra.
2. **O peso do pet é o insumo da Joia 1**, mas a regra que o consome — peso +
   embalagem → gramas/dia → data projetada — **não está escrita em documento
   nenhum do repositório**. `IDEACAO_FASE1 §17`, `DOMAIN_MODEL`, `MVP_SCOPE` e
   `GLOSSARY` a nomeiam e nenhum a define. Inventá-la violaria `AGENTS.md`
   ("nunca invente regra de negócio").
3. **O ADR-0011 (A10) decidiu que o cadastro cria `User` e mais nada.** `Tutor`
   é perfil de consumo, não identidade, e reabrir isso exigiria um ADR que
   substituísse o 0011 — sem motivo novo.

A tensão é que o pet **sozinho não entrega valor no primeiro uso**: a J1 diz que
o truque de onboarding é a projeção, e ela depende de uma fórmula que não
existe. A pergunta que este ADR responde é o que a `pd-14` pode entregar de
valor imediato sem inventar nada.

## Decisão

**D1 — `Tutor` é tabela própria (`tutors`), 1:1 com `users` (`user_id` único),
criada num passo separado do cadastro.** `POST /auth/register` continua criando
só `User`. O `register` nem tem campo `name`.

**D2 — O endereço padrão são colunas planas de `tutors`** (`street`,
`street_number`, `complement`, `neighborhood`, `postal_code`, `reference`) — não
uma tabela `addresses` nem JSONB. O `DOMAIN_MODEL` chama `default_address` de
value object, o MVP tem **um** endereço por tutor, e `neighborhood`/`postal_code`
são **consultados**. O pedido grava snapshot próprio, então histórico de endereço
não precisa de tabela.

**D3 — Obrigatórios: rua, número, bairro e CEP.** Complemento e referência são
opcionais. "Endereço padrão" é o destino da entrega; um endereço sem rua não
entrega nada, e pedir rua e número depois criaria um segundo formulário de
endereço no checkout.

**D4 — O celular vive em `users.phone`** e é escrito pelo fluxo do perfil
através de `UpdateUserPhoneUseCase`, exportado pelo `IdentityModule`. O módulo
`tutors` **nunca toca a tabela `users`**. `AuthenticatedUser` ganha `phone`.

**D5 — Pets em `pets`, sub-recurso `/tutors/me/pets`.** `PetSpecies { DOG, CAT }`;
`birth_date` nulo permitido; `weight_grams INT` com `CHECK > 0`. **Toda leitura
e escrita filtra por `tutor_id` na própria query**, e pet de outro tutor responde
**`404 PET_NOT_FOUND`**, nunca `403`. Exclusão é física.

**D6 — `PUT /tutors/me` é upsert idempotente e responde `200` sempre**, sem
`Location`; `GET /tutors/me` responde `404 TUTOR_NOT_FOUND` enquanto o perfil não
existe — é o que diz ao app "perfil incompleto → onboarding".

**D7 — `@Roles('TUTOR')` nas duas classes de controller.** É a primeira rota
real com `@Roles()` no projeto.

**D8 — O comparador pré-preenche o CEP do tutor logado.** É o valor de primeiro
uso que a `pd-14` entrega sem inventar a calculadora: quem acaba de cadastrar o
endereço abre um produto e já vê quem entrega na casa dela e por quanto. CEP e
não bairro porque o CEP é exato e o bairro depende de bater com o nome dos chips.

**D9 — Onboarding guiado, nunca bloqueante.** Cadastro → `/conta/endereco` →
`/conta/pets/novo` → `/conta`, com "Fazer depois" em cada tela. Forçar o
onboarding trancaria `admin@dev` (sem papel `TUTOR`) e quem só quer olhar preço.

**D10 — Sem checkbox de consentimento no cadastro.** A base legal de uma conta é
a execução do contrato, não consentimento; o checkbox da lista de espera existe
porque lá o contato posterior é que exige consentimento. A tela traz uma frase
apontando o aviso de privacidade.

**D11 — A calculadora de consumo fica fora**, na capacidade 9, e exige ADR
próprio com a fonte da tabela de consumo.

## Alternativas consideradas

- **O cadastro criar `Tutor` junto** — contraria o ADR-0011 A10, que é decisão
  aceita e não foi reaberta. Também obrigaria a pedir nome e endereço na tela de
  criar conta, que é exatamente o atrito que "poucas telas, pouco esforço"
  (`PERSONAS`) evita.
- **Tabela `addresses`** — normalizaria um value object de ocorrência única.
  Mesma lógica que manteve `postal_code_ranges` como JSONB na `pd-11`.
  **Gatilho para reabrir:** segundo endereço por tutor virar requisito
  (registrado em `IDEIAS`).
- **Endereço em JSONB** — `neighborhood` e `postal_code` são consultados (o
  pré-preenchimento hoje, a elegibilidade de entrega na `pd-15`), e consultar
  dentro de JSONB troca um índice comum por um caminho de GIN sem ganho algum.
- **`phone` em `tutors`** — duplicaria em duas tabelas o dado que o
  `DOMAIN_MODEL` põe em `User`, e o lojista (que também tem telefone e pode não
  ter perfil de tutor) ficaria sem lugar para o dele.
- **`POST /tutors` com `409` quando já existe** — um `POST` repetido num celular
  com rede ruim daria conflito onde o `PUT` dá o mesmo resultado. E o cliente
  **não distingue** criar de editar num singleton, por desenho.
- **`403` para pet de outro tutor** — confirma que o id existe e pertence a
  alguém, que é exatamente o fato que um estranho não pode sondar.
- **Soft-delete de pet** — carregaria um `deleted_at` por toda consulta para um
  caso que não existe: nada referencia `pets` ainda. **Gatilho:**
  `replenishment_schedules` referenciar `pets`, quando a decisão cascata ×
  soft-delete precisa ser tomada com uma agenda na mão.
- **Calculadora com fórmula "provisória"** — inventar regra de negócio, e
  fórmula provisória vira produção.
- **Onboarding bloqueante** — trancaria quem não tem papel `TUTOR` e quem só
  quer comparar preço.

## Consequências

**Positivas**

- A J1 anda até o pet: cadastro, endereço e peso existem pela interface.
- O endereço está pronto para a `pd-15` — o pedido tem destino e o tutor tem
  telefone, sem um segundo formulário no checkout.
- O comparador ficou pessoal para quem tem conta (D8), que é valor real
  entregue sem nenhuma regra inventada.
- Primeiro teste de posse e primeiro `403` de papel da API, com o padrão que
  `orders` vai copiar.

**Negativas, aceitas**

- **O pet fica sem projeção até a capacidade 9.** `weight_grams` é dado morto
  por pelo menos uma tarefa. É o preço de não inventar a fórmula.
- **`PUT /tutors/me` escreve em duas tabelas de dois módulos sem transação
  compartilhada.** Perfil salvo com o celular falhando deixa `users.phone`
  velho. Mitigado pela ordem (tutor primeiro) e pela idempotência: repetir
  corrige. Uma transação distribuída entre módulos compraria consistência ao
  preço da fronteira que os separa.
- **Exclusão física de pet** é irreversível e terá de ser reavaliada quando
  algo referenciar `pets`.
- **A sessão guardada antes da `pd-14` é descartada uma vez**, porque o `user`
  armazenado passou a exigir `phone`. É o comportamento desenhado pelo ADR-0012
  ("tudo é parseado com Zod ao carregar") e acontece uma vez só.
- **Exportação e exclusão de dados do tutor (LGPD, capacidade 14) seguem fora.**
  Esta é a primeira escrita de dado pessoal de gente de fora, e os direitos do
  titular continuam não implementados — declarado no doc de feature.

## Status

`accepted`
