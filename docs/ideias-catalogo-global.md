# Ideias habilitadas pelo Catálogo Global de Produtos

O catálogo global (`CatalogProduct`) permite rastrear o mesmo produto físico sendo vendido por múltiplas lojas via `StoreProduct`. Isso abre possibilidades que não existiam quando cada produto era isolado por loja.

---

## 1. Comparação de Preços

**O que é:** O cliente pesquisa um produto (ex: "Ração Golden Adulto 15kg") e vê uma lista de todas as lojas que o vendem, com preços, frete e avaliações lado a lado.

**Por que funciona:** Hoje já existem todos os dados necessários — `catalogProductId` comum + `price` em cada `StoreProduct`. Falta apenas a UI.

**Impacto:** Alto. Influência direta na decisão de compra e diferencial competitivo do marketplace.

---

## 2. Reputação Global do Produto

**O que é:** Uma nota média calculada a partir de todas as avaliações do produto em todas as lojas, independente de quem vende.

**Situação atual:** As avaliações são por `StoreProduct` (combinação loja + produto). A reputação global seria uma agregação de todas as avaliações onde `storeProduct.catalogProductId` é o mesmo.

**Impacto:** Alto. Produtos bem avaliados globalmente transmitem mais confiança, especialmente para produtos novos em uma loja.

---

## 3. Histórico de Preços

**O que é:** Rastrear como o preço médio de um produto no marketplace evoluiu ao longo do tempo.

**Como implementar:** Tabela de snapshots de preço por `storeProductId` gerada periodicamente (ex: diariamente). A agregação por `catalogProductId` mostra a variação do preço de mercado.

**Impacto:** Médio. Útil para o cliente decidir se é um bom momento para comprar; depende de volume de dados para fazer sentido.

---

## 4. Alertas de Preço

**O que é:** O cliente "favorita" um `CatalogProduct` e recebe uma notificação quando qualquer loja baixar o preço abaixo de um valor definido por ele.

**Dependência:** Requer sistema de notificações (e-mail ou push) e uma tabela de alertas vinculada a `catalogProductId` + usuário.

**Impacto:** Médio-alto. Recurso de retenção e engajamento do cliente.

---

## 5. Ranking Global de Produtos Mais Vendidos

**O que é:** Um ranking dos produtos mais populares no marketplace inteiro, somando as vendas de todas as lojas que oferecem o mesmo produto.

**Situação atual:** Só é possível rankear por loja. Com o catálogo, dá para agregar `OrderItem` por `storeProduct.catalogProductId` e gerar rankings globais.

**Impacto:** Médio. Útil para a página inicial e campanhas promocionais do marketplace.

---

## Prioridade Sugerida

| # | Ideia | Esforço | Impacto |
|---|---|---|---|
| 1 | Comparação de preços | Baixo (dados prontos) | Alto |
| 2 | Reputação global do produto | Baixo (agregação de dados existentes) | Alto |
| 3 | Ranking global de mais vendidos | Baixo (query de agregação) | Médio |
| 4 | Alertas de preço | Alto (infra de notificações) | Médio-alto |
| 5 | Histórico de preços | Alto (snapshots periódicos) | Médio |
