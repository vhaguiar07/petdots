---
title: Feature — Lista de Espera
status: stable
version: "1.0"
updated: 2026-09-11
scope: >
  Visão transversal da captura da lista de espera do PetDots — banco, API e
  landing numa leitura só: a tabela waitlist_entries e sua migration, o endpoint
  POST /api/v1/waitlist-entries com os códigos que devolve, a landing pública em
  Next.js que alimenta a captura, o que a feature deliberadamente ainda não faz,
  e como o Victor lê os dados coletados hoje. Materializa a jornada J9 e a
  capacidade 12 do MVP_SCOPE.
relates_to:
  - 01-product/USER_JOURNEYS.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 04-api/API_GUIDELINES.md
  - 04-api/ERROR_MODEL.md
  - 03-engineering/SECURITY.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
type: product
---

# Feature — Lista de Espera

> **Primeira feature implementada do PetDots** (`pd-09`, 11/09/2026), e por isso
> a primeira a estrear esta camada `08-features/`. Cada arquivo aqui é a leitura
> transversal de **uma** feature: banco → API → cliente, o que ela não faz, e
> como operá-la. O detalhe de cada camada continua nos documentos canônicos —
> aqui está a costura entre eles.

---

## O que é

A captura que sustenta o **smoke test** do piloto: uma página pública onde uma
pessoa deixa nome, celular, bairro e CEP para ser avisada quando o PetDots
chegar à sua região. É a jornada **J9** do
[`USER_JOURNEYS`](../../01-product/USER_JOURNEYS.md) e a **capacidade 12** do
[`MVP_SCOPE`](../../01-product/MVP_SCOPE.md).

**Para que serve, na prática:** o dado que escolhe o **próximo bairro**. O
Victor é o único fundador de rua, o piloto começa no eixo Grande Méier, e a
contagem de pessoas por bairro é o que informa para onde ir. Por isso a feature
conta **pessoas**, não submissões — ver a invariante do telefone abaixo.

Enquanto não houver nenhuma loja `ACTIVE`, **todo visitante está fora de área**:
não existe caminho de compra, e a lista de espera é a única saída do funil. Foi
o que dispensou modelar `DeliveryArea` nesta entrega.

---

## Banco

Tabela **`waitlist_entries`**, criada pela **primeira migration do projeto**:
`prisma/migrations/20260911155642_create_waitlist_entries/`.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | `UUID` | PK, `DEFAULT gen_random_uuid()` — gerado **no Postgres**, para que um `INSERT` manual também funcione |
| `name` | `VARCHAR(120)` | |
| `phone` | `VARCHAR(16)` | **E.164 e `UNIQUE`** — a identidade do lead |
| `neighborhood` | `VARCHAR(80)` | Texto livre; a landing só **sugere** os bairros do eixo |
| `postal_code` | `CHAR(8)` | Oito dígitos, sem hífen |
| `pet_food_declared` | `VARCHAR(120)` | Nulo permitido |
| `source` | `waitlist_source` | Enum: `CAMPAIGN`, `OUT_OF_AREA`, `STORE_QR` |
| `consent_at` | `TIMESTAMPTZ` | Consentimento LGPD, carimbado **pelo servidor** |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Auditoria padrão (`NAMING_CONVENTIONS`) |

**A constraint que carrega a regra:**
`CREATE UNIQUE INDEX "waitlist_entries_phone_key" ON "waitlist_entries"("phone")`.

Ela não é detalhe de banco — **é a regra**. O telefone é normalizado para E.164
(`+55DDDNNNNNNNNN`) antes de chegar aqui, então `(21) 99999-9999`,
`21999999999` e `+55 21 99999-9999` colidem na mesma linha e a mesma pessoa
nunca é contada duas vezes. Sem isso a contagem por bairro infla, e o duplo
clique vira dois leads.

Por isso o teste de integração aplica **as migrations reais** num Postgres
efêmero, em vez de empurrar o schema: quem valida a invariante é o Postgres.

---

## API

**`POST /api/v1/waitlist-entries`** — o endpoint é **único**: não há `GET`.

| Resposta | Código de erro | Quando |
|---|---|---|
| `201` | — | Criada. O corpo é a representação completa da entrada, já normalizada |
| `409` | `WAITLIST_ENTRY_ALREADY_EXISTS` | O telefone já está na lista |
| `422` | `VALIDATION_FAILED` | Schema recusou o corpo; `details[]` aponta o campo |

**Sem header `Location`** no `201`, por exceção consciente à convenção do
[`API_GUIDELINES`](../../04-api/API_GUIDELINES.md): não existe rota de leitura
do recurso para onde apontar, e um `Location` apontando para o vazio seria pior
que a ausência.

**Por que não há `GET`:** a lista é PII sem leitura pública. Quem precisa ler é
o Victor, e o faz fora da API (abaixo). Um console de administração é lacuna
registrada no backlog.

Módulo em `apps/api/src/modules/waitlist/`, nas quatro camadas do
[`CODING_STANDARDS`](../../03-engineering/CODING_STANDARDS.md) — é o **primeiro
módulo real** do projeto e o padrão que os próximos copiam. A normalização de
telefone e CEP mora em `packages/domain` (`phone.ts`, `postal-code.ts`), e o
contrato Zod em `packages/contracts/src/waitlist.ts` valida na borda **com as
mesmas funções** — uma fonte só para "o que é um telefone válido".

**Nada de PII em log**, em nenhum nível: nem o corpo, nem o telefone, nem as
mensagens de erro do domínio, que falam em quantidade de dígitos e nunca no
número (`SECURITY` §LGPD).

---

## Landing

`apps/landing`, Next.js 16.3.4 (App Router), uma página só (`/`), em
`localhost:3002` no desenvolvimento.

- **A API é chamada pelo servidor**, numa Server Action (`src/app/actions.ts`) —
  nunca pelo navegador. Não há CORS a configurar, a URL interna não vai ao
  cliente, e o honeypot é checado antes de qualquer requisição sair.
  `PETDOTS_API_URL` tem default `http://localhost:3001`; em desenvolvimento não
  é preciso definir nada.
- **Consentimento obrigatório:** checkbox marcado é o que produz o `consent_at`.
  O rodapé traz o aviso de privacidade e o canal de contato
  (`src/content/privacy.ts` — **valor provisório**, a definir pelo Victor).
- **Anti-abuso: só honeypot.** Campo oculto fora do fluxo visual e do tab order;
  preenchido, a action **finge sucesso** sem chamar a API — recusar ensinaria ao
  robô o que mudar. É mitigação fraca por desenho; rate limit vem com o deploy
  público, e está no backlog com esse gatilho.
- **Estados do formulário:** sucesso, "esse telefone já está na lista",
  erro por campo (em português, vindo do próprio contrato) e indisponibilidade
  genérica — sem stack trace nem URL interna.
- **Bairros sugeridos** em `src/content/neighborhoods.ts`: constante editável do
  eixo Grande Méier, não regra de domínio. O campo aceita texto livre, e é
  justamente quem mora fora da lista que informa o próximo bairro.

---

## O que esta feature **não** faz ainda

Tudo abaixo é ausência deliberada, não esquecimento:

| Não faz | Por quê |
|---|---|
| `source = OUT_OF_AREA` | Nasce no checkout fora da área de entrega, que não existe. O enum já tem o valor para a coluna não precisar mudar depois |
| `source = STORE_QR` | Idem, pelo QR na loja |
| Leitura da lista pela API | PII sem leitura pública; o console de administração é lacuna registrada no backlog |
| Emitir `waitlist.joined` | O `USER_JOURNEYS` §J9 prevê o evento, mas não há barramento in-process nem consumidor. Está no backlog, com gatilho |
| Rate limit | Decisão do deploy público. No backlog, com gatilho |
| Auditoria | A única mutação é uma criação anônima; `created_at` + `source` são rastro suficiente, e não há ator autenticado a registrar |

---

## Como o Victor lê os dados hoje

Não há tela nem endpoint de leitura. Com o Postgres local de pé
(`npm run db:up`), na raiz do repositório:

```bash
# Interface visual, tabela waitlist_entries
npx prisma studio

# Ou direto no banco — a contagem por bairro, que é a pergunta real
docker exec petdots-mvp-postgres-1 psql -U petdots -d petdots \
  -c "SELECT neighborhood, count(*) FROM waitlist_entries GROUP BY 1 ORDER BY 2 DESC;"
```
