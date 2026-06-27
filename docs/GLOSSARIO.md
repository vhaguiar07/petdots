# Glossário de Domínio — PetDots

Termos usados no código, na documentação e nas conversas de produto. Manter consistência aqui evita confusão entre os times.

---

## Entidades Principais

### CatalogProduct (Produto do Catálogo)
Produto único no catálogo global da plataforma. É compartilhado entre todas as lojas — não existe duplicação. Criado por um lojista ou admin, passa por moderação antes de ficar ativo. Contém: nome, descrição genérica, marca, categoria, tipo de pet e imagens.

### StoreProduct (Produto da Loja)
Oferta específica de uma loja para um `CatalogProduct`. Cada loja define seu próprio preço, estoque, descrição complementar e se o produto está ativo. É o `StoreProduct` que aparece na vitrine da loja, não o `CatalogProduct` diretamente.

### Store (Loja)
Perfil de uma loja no marketplace, pertencente a um `STORE_OWNER`. Contém configurações de entrega, horário, raio de atuação e passa por aprovação de um `ADMIN` antes de ficar visível.

### Order (Pedido)
Registro de uma compra feita por um `CUSTOMER` em uma `Store`. Contém os itens, endereço de entrega, valores e o estado atual no fluxo de status.

### OrderItem (Item do Pedido)
Cada linha de um pedido: referência ao `StoreProduct`, quantidade e preço unitário no momento da compra (snapshot imutável).

### Delivery (Entrega)
Registro da logística associada a um pedido. Pode ser realizada pela própria loja (`SELF`) ou por um provedor externo (`EXTERNAL`).

### Promotion (Promoção)
Regra de desconto configurada por um lojista. Pode ser aplicada a toda a loja ou a um produto específico. O sistema aplica automaticamente a melhor promoção disponível no checkout.

### PriceAlert (Alerta de Preço)
Configuração de um cliente que define um preço-alvo para um `CatalogProduct`. Quando qualquer loja atingir esse preço, o cliente deve ser notificado.

### PriceHistory (Histórico de Preços)
Registro imutável de cada mudança de preço de um `StoreProduct`. Permite exibir o gráfico de histórico e detectar quedas para disparar alertas.

### AuditLog (Log de Auditoria)
Registro automático de ações sensíveis (aprovações, mudanças de papel, moderação). Inclui quem fez, quando, o que foi alterado (valor anterior e novo) e de onde (IP, user-agent).

---

## Papéis de Usuário

| Papel | Nome em código | Descrição |
|-------|----------------|-----------|
| Cliente | `CUSTOMER` | Compra produtos nas lojas. Acesso padrão ao app. |
| Lojista | `STORE_OWNER` | Gerencia uma loja, produtos, estoque, pedidos e promoções. |
| Administrador | `ADMIN` | Modera a plataforma: aprova lojas e produtos, gerencia usuários, visualiza auditoria. |

---

## Status de Loja

| Status | Descrição |
|--------|-----------|
| `PENDING_APPROVAL` | Loja recém-criada, aguardando aprovação de um admin. Não aparece para clientes. |
| `ACTIVE` | Loja aprovada e visível. Aceita pedidos. |
| `SUSPENDED` | Loja suspensa por violação de políticas. Não aceita pedidos. |

---

## Status de Produto do Catálogo

| Status | Descrição |
|--------|-----------|
| `PENDING_REVIEW` | Produto criado por lojista, aguardando moderação do admin. |
| `ACTIVE` | Produto aprovado. Pode ser ofertado pelas lojas. |
| `REJECTED` | Produto reprovado na moderação. |

---

## Status do Pedido

| Status | Quem transita | Descrição |
|--------|---------------|-----------|
| `PENDING` | — (criado automaticamente) | Pedido criado, aguardando confirmação da loja. |
| `CONFIRMED` | Lojista | Loja confirmou o recebimento do pedido. |
| `PREPARING` | Lojista | Loja está separando/embalando os itens. |
| `OUT_FOR_DELIVERY` | Lojista | Pedido saiu para entrega. |
| `DELIVERED` | Lojista | Entrega confirmada. Estoque consumido definitivamente. |
| `CANCELLED` | Cliente ou Lojista | Pedido cancelado. Estoque restaurado. Estado terminal. |

---

## Termos Técnicos

**Soft Delete** — Em vez de remover fisicamente um registro do banco, o campo `isActive` (ou similar) é definido como `false`. O histórico é preservado (ex: pedidos que referenciam um produto deletado continuam íntegros).

**Desnormalização** — Agregados como `avgRating` e `reviewCount` são mantidos diretamente nas tabelas de `Store` e `StoreProduct` para performance. São atualizados atomicamente em transação a cada operação de review.

**Upsert** — Operação que cria um registro se ele não existir ou atualiza se já existir. Usado em reviews (um por cliente/produto) e alertas de preço (um por cliente/produto).

**S3-Compatible Storage** — O sistema usa a interface S3 da AWS para armazenamento de imagens, compatível com MinIO (local), Cloudflare R2 e AWS S3 real, apenas mudando variáveis de ambiente.

**Token Rotation** — A cada uso do refresh token, um novo é emitido e o anterior é invalidado. Se o mesmo token for usado duas vezes (sinal de roubo), toda a sessão é revogada.
