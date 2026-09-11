---
title: "ADR-0010: Comparador público antes do checkout"
status: stable
version: "1.0"
updated: 2026-09-11
scope: >
  Registra as decisões que permitiram publicar o comparador de preços (J2)
  antes de existirem pagamento, autenticação e painel do lojista: quais lojas
  aparecem, como as ofertas são ranqueadas, como o catálogo é ingerido
  (seed versionado, interino), como a busca é feita e qual a forma de
  paginação da API.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 01-product/USER_JOURNEYS.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 04-api/API_GUIDELINES.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 08-features/comparador/COMPARADOR_DE_PRECOS.md
type: decision
---

# ADR-0010: Comparador público antes do checkout

## Contexto

A jornada **J2 — comparar preço no bairro** é **leitura**: busca de produto,
endereço, ofertas ordenadas. Ela não depende do ciclo do dinheiro, que ainda não
existe — não há PSP integrado, não há `orders`, não há `payments`. Também não
existe `identity`: a capacidade 1 do `MVP_SCOPE` não foi implementada, então não
há autenticação nem painel do lojista.

Ao mesmo tempo, a `pd-09` entregou uma landing pública cujo único conteúdo era o
formulário da lista de espera. O `MVP_SCOPE` #5 e o ADR-0004 #13 pedem páginas
indexáveis, e o comparador é **o único ativo de aquisição orgânica do MVP**:
quem busca "preço de ração Golden 15 kg no Méier" precisa encontrar uma página
nossa. Construir a J2 agora dá à landing um motivo de existir além do
formulário, e dá ao smoke test um produto para mostrar.

Cinco forças precisavam ser resolvidas ao mesmo tempo:

1. **Quem aparece?** A invariante do `DOMAIN_MODEL` condiciona `Store.ACTIVE` a
   ter `psp_recipient_id`. Sem PSP, nenhuma loja é `ACTIVE`.
2. **Quem popula as ofertas?** Não há painel do lojista nem console admin.
3. **Como ordenar?** Ordenação é política de alocação de receita, não detalhe.
4. **Como buscar?** O `SYSTEM_ARCHITECTURE` previa full-text (`tsvector`).
5. **Que forma de paginação?** O `API_GUIDELINES` deixou a escolha em aberto
   para "o primeiro endpoint de coleção" — que é este.

## Decisão

### 1. Loja aparece no comparador quando `status ≠ PAUSED`

Entra na listagem toda loja que **não** esteja `PAUSED`, tenha ao menos uma
`DeliveryArea` ativa cobrindo o endereço e uma `Offer` disponível. `PROSPECT` e
`ONBOARDING` aparecem.

**`ACTIVE` governa o pedido (J3), não a listagem (J2).** Antes do checkout, o
produto é um guia de preços do bairro; exigir `ACTIVE` tornaria toda loja
invisível até o PSP existir, e não haveria comparador nenhum. `PAUSED` passa a
ser o único status que significa "não me mostre".

### 2. Ingestão por seed versionado — **interino**

Catálogo, lojas, áreas e ofertas entram por `apps/api/src/seed/`, em arquivos
versionados no Git, aplicados por `npm run db:seed`. O seed é **idempotente**
(upsert por chave natural) e **valida tudo antes de escrever**, com as mesmas
funções do domínio e dos contratos que a API usa.

É a resposta **interina** à lacuna "ingestão do catálogo mestre" e "console de
administração" do `BACKLOG`: o console segue pendente. O Git é o rastro de quem
mudou qual preço.

### 3. Ranking por preço entregue

Com endereço: **`priceCents + deliveryFeeCents` crescente**, desempate por prazo
crescente e depois por nome da loja em pt-BR. Sem endereço: `priceCents`
crescente, e `deliveryArea`/`landedCents` vêm `null`.

Ordenar só pelo item promoveria a loja que cobra a corrida — que é exatamente o
erro que o comparador existe para evitar. Reputação ou prazo como critério
**primário** continua decisão em aberto.

### 4. Busca por coluna normalizada + `LIKE`, não `tsvector`

`products.search_text` guarda `marca + nome + variante` sem acento e em
minúsculas, escrito por `normalizeSearchText`; o termo do visitante passa pela
**mesma função** e vira tokens AND-ados por `contains`.

**Gatilho para `tsvector`/`pg_trgm`:** catálogo acima de ~500 SKUs, ou qualidade
de busca ruim medida.

### 5. Paginação por offset, `?page=&pageSize=`

`page ≥ 1` (default 1), `pageSize` de 1 a 50 (default 20), resposta
`{ items, page, pageSize, total }`. Vale para `GET /products`.
`GET /offers?productId=` **não é paginado**: o universo é o número de lojas do
piloto.

### 6. `CommissionRate` e `StoreCommissionRate` ficam fora do banco

Quem lê a tabela de comissão é o cálculo do pedido (`orders`), não o comparador.
E o ADR-0003 registra que as faixas de take rate "são hipóteses, não tabela
final" — congelá-las num seed agora seria fingir uma decisão que o campo ainda
não tomou.

### 7. Cobertura de entrega resolvida em memória

O caso de uso carrega todas as áreas ativas de lojas não pausadas e filtra com
`areaCoversAddress`, função pura de `packages/domain`. Põe a regra onde o
ADR-0004 #12 quer as regras e evita SQL sobre JSONB.
**Gatilho para mover ao SQL:** mais de ~200 áreas ativas.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| **Só loja `ACTIVE` aparece** | Invisibilizaria **todas** as lojas até existir PSP. O comparador não poderia nascer antes do ciclo do dinheiro — exatamente o que esta tarefa se propôs a evitar. |
| **Campo `listed` novo em `Store`** | Inventa um atributo que ninguém escreve nem opera, para expressar o que `status ≠ PAUSED` já expressa. |
| **`status ∈ {ONBOARDING, ACTIVE}`** | Oferecida no portão e não escolhida: exigiria um passo de onboarding que não existe antes de a loja poder ser mostrada. |
| **`tsvector` + `unaccent` agora** | Para dezenas de SKUs é infraestrutura antecipada (`AGENTS.md`). `unaccent` não é `IMMUTABLE`, então exigiria uma função wrapper só para viabilizar a coluna gerada. A coluna normalizada resolve acento e caixa de forma determinística e testável em `packages/domain`. |
| **Paginação por cursor** | Cursor resolve feed infinito, que não existe aqui. A página de busca tem links numerados e precisa saltar para a página 4. |
| **Ranking por prazo ou reputação** | Não há dado de reputação, e prazo como critério primário premiaria quem promete rápido. Fica como decisão futura, com o ranking mínimo explícito agora. |
| **Endpoint administrativo de escrita, sem auth** | Buraco de segurança óbvio enquanto `identity` não existe: qualquer um poderia alterar o preço de qualquer loja. |
| **Esperar os dados de campo do Victor (Trilha B, B4)** | Travaria a branch atrás de trabalho de rua. Sem dado nenhum o comparador não renderiza e o roteiro manual é impossível. |
| **Tabela filha para `postal_code_ranges`** | As faixas são **valores** da área, sempre lidas e escritas junto com ela. Tabela filha seria normalizar um value object. |
| **Criar `CommissionRate` vazia agora** | Esquema sem consumidor, com valores que o ADR-0003 já declara hipotéticos. |

## Consequências

### Positivas

- **O comparador existe antes do dinheiro.** A J2 fica navegável e a landing
  ganha conteúdo indexável — `/precos` e uma página por produto — meses antes do
  checkout.
- **SEO desde já.** `sitemap.xml`, `robots.txt` e canonical por produto entram
  com a primeira página pública.
- **As regras ficam testáveis.** Cobertura, ranking e ofertabilidade são funções
  puras em `packages/domain`, com teste unitário; nenhuma delas está presa a SQL.
- **O banco sustenta as invariantes de dinheiro.** `CHECK` de centavos positivos
  e índice único `(store_id, product_id)` são constraints reais, provadas em
  vermelho.
- **Nenhuma escrita exposta.** Os quatro endpoints são `GET` públicos; não há
  superfície de escrita para proteger enquanto não há autenticação.

### Negativas e custos assumidos

- **O seed é gargalo operacional.** Todo preço novo exige editar um arquivo,
  buildar e rodar `npm run db:seed`. Não serve para um lojista, e por isso o
  console de administração continua no backlog — este ADR não o resolve, apenas
  destrava o comparador enquanto ele não existe.
- **Preço de loja que não assinou nada fica público.** É o que todo comparador
  faz, e o Victor foi avisado: é ele quem entra na loja depois. Decisão dele, no
  portão de 11/09/2026.
- **O ranking premia quem entrega mal.** Ordenar por preço entregue favorece a
  loja barata e lenta. A reavaliação depende de haver dado de reputação.
- **`LIKE` não faz stemming nem corrige digitação.** "raçoes" não acha "ração".
  Aceitável no piloto; o gatilho está registrado.
- **Sem auditoria de alteração de preço.** O `SECURITY` exige rastro para
  mutação de preço de oferta; não há mutação pela API, e o Git é o rastro do
  seed. O interceptor nasce com o primeiro endpoint de escrita de oferta.
- **Dados fictícios no seed.** As 8 lojas do piloto são placeholder do spike da
  `pd-08`, marcadas no topo do arquivo, e **não podem ir a deploy público**.

## Status

`accepted` — 2026-09-11 (`pd-11`).
