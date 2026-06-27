# Regras de Negócio — PetDots

## Usuários e Autenticação

- Existem três papéis: `CUSTOMER`, `STORE_OWNER` e `ADMIN`. O papel é definido no cadastro e só pode ser alterado por um `ADMIN`.
- Access token expira em **15 minutos**; refresh token expira em **30 dias** com rotação a cada uso.
- Reutilização de um refresh token já consumido invalida toda a sessão (proteção contra roubo de token).
- O login via Google OAuth pode ser vinculado a uma conta existente se o e-mail coincidir.
- Rate limiting: máximo de **5 tentativas de login por minuto** por IP; **100 requisições/minuto** para as demais rotas.
- Uploads de imagem aceitam apenas **jpeg, png ou webp** com tamanho máximo de **5 MB**.

---

## Lojas

- Um `STORE_OWNER` só pode ter **uma loja** cadastrada.
- Toda loja criada entra com status `PENDING_APPROVAL` e só começa a aceitar pedidos após aprovação de um `ADMIN` (status `ACTIVE`).
- Um `ADMIN` pode suspender (`SUSPENDED`) ou reativar (`ACTIVE`) uma loja a qualquer momento.
- Loja `SUSPENDED` ou `PENDING_APPROVAL` **não aparece nas listagens públicas** e não aceita novos pedidos.
- Cada loja define seu **raio de entrega em km** (padrão: 10 km). Pedidos com distância do cliente acima do raio configurado são recusados.
- A nota média (`avgRating`) e o contador de avaliações (`reviewCount`) da loja são atualizados atomicamente a cada nova avaliação.

---

## Catálogo e Produtos

- O catálogo global (`CatalogProduct`) é compartilhado entre todas as lojas. Não há duplicação de produto na plataforma.
- Cada loja tem seus próprios `StoreProduct`: define preço, estoque, descrição e ativa/desativa o produto independentemente.
- Um lojista pode criar um novo produto no catálogo; esse produto entra com status `PENDING_REVIEW`.
- Um `ADMIN` aprova (`ACTIVE`) ou rejeita (`REJECTED`) produtos do catálogo. Somente produtos `ACTIVE` podem ser ofertados pelas lojas.
- Produtos são **soft-deleted** (`isActive = false`). O histórico de pedidos que referencia o produto é preservado.
- A cada mudança de preço de um `StoreProduct`, o valor anterior é registrado em `PriceHistory`.

---

## Carrinho e Pedidos

- O carrinho é **por loja**: ao adicionar um produto de outra loja, o carrinho anterior é substituído (cliente é avisado).
- Um pedido exige ao menos **1 item** e um **endereço de entrega válido** cadastrado pelo cliente.
- O sistema aplica automaticamente o **melhor desconto disponível** (maior economia entre promoções por loja e por produto) no checkout. Cupons manuais sobrescrevem a promoção automática caso sejam mais vantajosos.
- O estoque de cada item é **reservado no momento da criação do pedido** e só é definitivamente consumido em `DELIVERED`.

### Máquina de estados do pedido

```
PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
    ↓           ↓           ↓
 CANCELLED  CANCELLED  CANCELLED
```

- Transições de status são realizadas pelo lojista (exceto cancelamento pelo cliente).
- Cancelamento pelo cliente só é permitido nos estados `PENDING`, `CONFIRMED` ou `PREPARING`.
- Ao cancelar, o estoque de todos os itens do pedido é **restaurado**.
- Um pedido `CANCELLED` ou `DELIVERED` não pode mudar de estado.

---

## Reviews e Avaliações

- Um cliente só pode avaliar um `StoreProduct` ou uma `Store` se tiver ao menos um pedido com status `DELIVERED` contendo aquele produto/loja.
- É permitida **uma avaliação por cliente por produto** e **uma por cliente por loja** (operação de upsert: atualiza se já existir).
- O lojista pode responder a qualquer avaliação de seus produtos ou loja, mas **não pode alterar a nota do cliente**.
- Um `ADMIN` pode remover qualquer avaliação que viole as políticas da plataforma.
- A nota média e o contador de avaliações do produto (`StoreProduct`) são atualizados atomicamente a cada avaliação.

---

## Promoções e Cupons

- Uma promoção pode ser aplicada a uma **loja inteira** ou a um **produto específico**.
- O desconto pode ser **percentual** (ex: 10%) ou **valor fixo** (ex: R$ 5,00).
- As datas de início (`startDate`) e fim (`endDate`) são opcionais; promoções sem data de fim são válidas indefinidamente.
- Cada loja pode ter no máximo **um cupom destacado** por vez (exibido em destaque na vitrine da loja).
- Um cupom é validado antes do checkout; se inválido (expirado, não encontrado), o pedido é criado sem o desconto.
- Promoções inativas não aparecem para o cliente, mas são preservadas para histórico.

---

## Alertas de Preço

- Um cliente pode cadastrar um alerta para qualquer `CatalogProduct`, definindo o **preço-alvo** desejado.
- Apenas um alerta ativo por cliente por produto (upsert).
- Quando o preço de qualquer `StoreProduct` daquele catálogo cair abaixo do alerta, o sistema deve notificar o cliente (trigger pendente de implementação — ver `TODO.md`).

---

## Moderação e Auditoria

- Toda ação sensível (aprovação de loja, mudança de papel de usuário, moderação de produto, etc.) é registrada automaticamente em `AuditLog` com usuário, IP, user-agent, entidade afetada, valor anterior e novo valor.
- O log de auditoria é somente leitura para `ADMIN` e **nunca pode ser deletado**.
