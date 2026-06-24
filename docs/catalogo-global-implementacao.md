# Catálogo Global de Produtos — Documentação Técnica

## Visão Geral

O PetDots opera com duas entidades separadas para produtos:

- **`CatalogProduct`** — o produto físico real, existente uma única vez no sistema. Criado por um lojista e revisado pelo admin antes de estar disponível globalmente.
- **`StoreProduct`** — a oferta de uma loja específica para um produto do catálogo. Cada loja define seu próprio preço, estoque e descrição customizada.

Essa separação permite que o mesmo produto (ex: "Ração Golden Adulto 15kg") seja vendido por várias lojas sem duplicar dados, e habilita funcionalidades de marketplace que não existiriam com produtos isolados por loja.

---

## Modelo de Dados

```
CatalogProduct          StoreProduct
──────────────          ────────────
id                      id
name                    storeId ──────────→ Store
brandId ───────→ Brand  catalogProductId ──→ CatalogProduct
categoryId ────→ Category price
petTypeId ─────→ PetType stock
barcode                 customDescription
description             isActive
status                  avgRating
createdByStoreId        reviewCount
                        priceHistory[] ───→ PriceHistory
```

### Status do CatalogProduct

| Status | Significado |
|---|---|
| `PENDING_REVIEW` | Criado por lojista, aguardando aprovação do admin |
| `ACTIVE` | Aprovado — disponível para reutilização por outras lojas |
| `REJECTED` | Reprovado — não aparece na busca do catálogo |

> O lojista que criou o produto continua vendendo normalmente independente do status. A revisão afeta apenas a disponibilidade no catálogo global para outras lojas.

---

## Fluxo de Cadastro de Produtos

### 1. Lojista cria produto novo
```
POST /products
{
  storeId, name, brandId, categoryId, petTypeId,
  barcode, description, images[], price, stock
}
```
- Cria um `CatalogProduct` com `status: PENDING_REVIEW`
- Cria um `StoreProduct` vinculado
- Produto já aparece na loja imediatamente

### 2. Lojista reutiliza produto do catálogo
```
POST /products
{ storeId, catalogProductId, price, stock, customDescription? }
```
- Apenas cria um `StoreProduct` vinculado ao catálogo existente
- Disponível somente para produtos com `status: ACTIVE`

### 3. Lojista busca no catálogo antes de cadastrar
```
GET /products/catalog-search?search=golden
```
- Retorna `CatalogProduct[]` com `status: ACTIVE`
- Ordenado por número de lojas que vendem (mais popular primeiro)

---

## Moderação pelo Admin

Painel: `/admin` → aba **Catálogo**

| Ação | Endpoint |
|---|---|
| Listar por status | `GET /admin/catalog?status=PENDING_REVIEW&page=1&pageSize=20` |
| Aprovar | `PATCH /admin/catalog/:id/status` `{ status: "ACTIVE" }` |
| Rejeitar | `PATCH /admin/catalog/:id/status` `{ status: "REJECTED" }` |
| Reverter rejeição | `PATCH /admin/catalog/:id/status` `{ status: "ACTIVE" }` |

---

## Entidades de Suporte

### Brand (Marca)
Marcas são entidades gerenciadas, não texto livre.

| Endpoint | Acesso |
|---|---|
| `GET /brands` | Público |
| `POST /brands` | Admin |
| `PATCH /brands/:id` | Admin |
| `DELETE /brands/:id` | Admin |

Gerenciamento: `/admin` → aba **Marcas**

---

## Funcionalidades Habilitadas pelo Catálogo

### 1. Comparação de Preços
```
GET /products/catalog/:catalogProductId/compare
```
Retorna todos os `StoreProduct` ativos do mesmo produto, ordenados por preço (menor primeiro). Inclui promoções ativas de cada loja.

**Resposta:**
```json
[
  {
    "id": "sp_1",
    "price": "34.90",
    "stock": 15,
    "store": { "name": "PetShop Central", "avgRating": 4.8 },
    "promotions": []
  },
  {
    "id": "sp_2",
    "price": "39.90",
    "store": { "name": "Miau & Au", "avgRating": 4.5 }
  }
]
```

---

### 2. Reputação Global do Produto
```
GET /products/catalog/:catalogProductId/reputation
```
Agrega todas as avaliações do produto em todas as lojas que o vendem.

**Resposta:**
```json
{
  "catalogProductId": "cp_abc",
  "avgRating": 4.6,
  "totalReviews": 142,
  "distribution": [
    { "rating": 5, "count": 89 },
    { "rating": 4, "count": 38 },
    { "rating": 3, "count": 10 },
    { "rating": 2, "count": 3 },
    { "rating": 1, "count": 2 }
  ]
}
```

---

### 3. Ranking Global de Mais Vendidos
```
GET /products/catalog/rankings?limit=20
```
Soma as vendas de todas as lojas por `catalogProductId`, ordenado por volume total.

**Resposta:**
```json
[
  {
    "totalSold": 1240,
    "catalogProduct": { "name": "Ração Golden Adulto 15kg", "brand": { "name": "Golden" } }
  }
]
```

---

### 4. Alertas de Preço
O cliente define um preço-alvo para um produto do catálogo. Quando qualquer loja baixar o preço abaixo do alvo, o alerta é disparado (`notifiedAt` é preenchido).

| Endpoint | Descrição |
|---|---|
| `PUT /price-alerts` | Cria ou atualiza alerta |
| `GET /price-alerts` | Lista alertas ativos do usuário |
| `DELETE /price-alerts/:id` | Remove alerta |

**Criar alerta:**
```json
{ "catalogProductId": "cp_abc", "targetPrice": 35.00 }
```

> O disparo do alerta (`notifiedAt`) acontece automaticamente no backend quando um lojista atualiza o preço de um produto. A entrega da notificação ao usuário (e-mail, push) é responsabilidade de um serviço externo que pode consultar os alertas com `notifiedAt IS NOT NULL`.

---

### 5. Histórico de Preços
```
GET /products/:storeProductId/price-history
```
Retorna o histórico de variações de preço de um `StoreProduct` específico, em ordem cronológica.

Cada vez que um lojista atualiza o preço de um produto (e o valor realmente muda), um registro é gravado automaticamente em `price_history`.

**Resposta:**
```json
[
  { "price": "49.90", "recordedAt": "2026-01-10T10:00:00Z" },
  { "price": "44.90", "recordedAt": "2026-03-15T14:30:00Z" },
  { "price": "39.90", "recordedAt": "2026-06-20T09:00:00Z" }
]
```

---

## Raio de Entrega por Loja

### Motivação

Sem restrição de raio, uma loja em Niterói poderia receber pedidos de clientes em Copacabana — dentro do raio de visibilidade do marketplace (20km), mas fora da capacidade de entrega do lojista.

### Como funciona

Cada loja possui um campo `deliveryRadiusKm` (padrão: **10 km**). Ao criar um pedido, o backend calcula a distância em linha reta entre o endereço da loja e o endereço de entrega do cliente. Se a distância exceder o raio configurado, o pedido é recusado com erro `400`.

> A validação só ocorre quando **ambos** os lados têm coordenadas geocodificadas. Se a loja ou o endereço do cliente não tiver coordenadas, o pedido segue normalmente.

### Configuração pelo lojista

O campo é exposto nos endpoints de criação e atualização de loja:

```
POST /stores        → { ..., deliveryRadiusKm: 15 }
PATCH /stores/:id   → { deliveryRadiusKm: 20 }
```

| Campo | Tipo | Mín | Máx | Padrão |
|---|---|---|---|---|
| `deliveryRadiusKm` | float | 1 km | 100 km | 10 km |

### Erro retornado ao cliente

```json
{
  "statusCode": 400,
  "message": "Esta loja não realiza entregas neste endereço (distância: 14.3 km, raio máximo: 10 km)"
}
```

### Migration

```sql
ALTER TABLE "stores"
  ADD COLUMN "deliveryRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 10;
```

---

## Produtos em Destaque ("Premium Choice")

### Motivação

A seção "Destaques da Semana" da home exibia os 3 produtos com maior `avgRating` calculado no cliente — o que favorecia produtos com poucas avaliações e ignorava relevância recente.

### Endpoint

```
GET /products/featured?limit=6
```

Público, sem autenticação. `limit` máximo: 20.

### Score composto

Para cada `StoreProduct` ativo, com estoque > 0, `avgRating ≥ 3.5` e `reviewCount ≥ 3`:

```
score = avgRating × 0.5
      + ln(reviewCount + 1) × 0.3
      + vendasÚltimos7Dias × 0.2
```

- **`avgRating × 0.5`** — qualidade percebida pelo cliente
- **`ln(reviewCount + 1) × 0.3`** — credibilidade: cresce rápido no início e desacelera, evitando que 1 avaliação perfeita bata 300 avaliações de 4.8★
- **`vendasÚltimos7Dias × 0.2`** — relevância atual: produtos com tração recente sobem no ranking

O resultado é ordenado pelo score e os primeiros `limit` são retornados na ordem do ranking.

---

## Paginação nas Rotas Admin

Todas as rotas de listagem do admin suportam `page` e `pageSize` via query string e retornam `PaginatedResult`:

```
GET /admin/stores?status=PENDING_APPROVAL&page=1&pageSize=20
GET /admin/users?role=STORE_OWNER&page=2&pageSize=20
GET /admin/catalog?status=PENDING_REVIEW&page=1&pageSize=10
GET /admin/audit-logs?entity=CatalogProduct&page=1&pageSize=20
```

**Resposta padrão:**
```json
{
  "items": [...],
  "total": 87,
  "page": 1,
  "pageSize": 20
}
```
