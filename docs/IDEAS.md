# Ideias para o PetDots

## Funcionalidades Já Implementadas

### Plataforma e Autenticação
- Marketplace de entrega de produtos pet (modelo iFood/Rappi para pet shops)
- Três perfis de usuário: Cliente, Lojista (`STORE_OWNER`) e Admin
- Autenticação via e-mail/senha com JWT (access token 15min + refresh 30 dias com rotação)
- Login social via Google OAuth 2.0 com vinculação a conta existente
- RBAC global (controle de acesso por papel)

### Lojas
- Criação de loja pelo lojista com fluxo de aprovação pelo admin
- Perfil completo da loja (nome, descrição, logo, horário, tipo de entrega)
- Raio de entrega configurável por loja (padrão: 10km) com geocodificação
- Suporte a provedores de entrega: própria (`SELF`) ou externa (`EXTERNAL`)
- Dashboard do lojista com analytics de 30 dias (receita, pedidos, top produtos)
- Avaliações e nota média da loja

### Catálogo e Produtos
- Catálogo global compartilhado (`CatalogProduct`) — evita duplicidade de produtos
- Produto por loja (`StoreProduct`) — cada loja define preço, estoque e descrição próprios
- Fluxo de aprovação de produto: lojista cria → admin aprova
- Taxonomia de categorias, marcas e tipos de pet
- Upload de imagens para S3-compatible (MinIO em dev, R2/S3 em prod)
- Comparação de preços do mesmo produto entre lojas
- Histórico de preços por produto por loja
- Ranking de produtos em destaque (score composto: avaliação + reviews + vendas recentes)
- Ranking global dos mais vendidos

### Compras e Pedidos
- Carrinho de compras (por loja)
- Fluxo completo de pedido com endereço de entrega
- Máquina de estados do pedido: `PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`
- Cancelamento de pedido com restauração automática de estoque
- Rastreamento em tempo real via WebSocket (Socket.IO)
- Múltiplos endereços de entrega com suporte a endereço padrão

### Promoções e Descontos
- Promoções por loja inteira ou por produto específico
- Descontos percentuais ou valor fixo
- Cupons com código, validade e cupom destacado por loja
- Aplicação automática da melhor promoção no checkout

### Reviews e Reputação
- Avaliação de produto e de loja (só após pedido entregue)
- Uma avaliação por cliente por produto/loja (upsert)
- Resposta do lojista às avaliações
- Reputação global do produto (agregado de todas as lojas)
- Médias desnormalizadas para performance

### Alertas e Notificações
- Alertas de preço: cliente define meta de preço e é notificado quando atingida

### Admin
- Aprovação e suspensão de lojas
- Moderação do catálogo de produtos
- Gestão de usuários (papéis e status)
- Log de auditoria paginável com filtros

### Infraestrutura
- Monorepo com `apps/api`, `apps/web`, `apps/mobile` e `packages/shared`
- Rate limiting (100 req/min global, 5/min no login)
- Logging centralizado (Loki/Grafana em produção)
- Docker Compose para desenvolvimento local

---

## Ideias e Sugestões

### Alta Prioridade (impacto direto no negócio)
- **Perfil dos pets do cliente** — cadastrar animais (nome, espécie, raça, idade, peso), permitir filtrar produtos por pet
- **Integração de pagamento** — PIX, cartão de crédito, boleto (sem isso não há receita real)
- **Push notifications** — alertas de status do pedido, promoções, alerta de preço (Firebase Cloud Messaging)
- **"Compre novamente"** — sugestão de recompra no histórico, com um toque para refazer o pedido

### Retenção e Engajamento
- **Wishlist / Lista de desejos** — salvar produtos para comprar depois
- **Programa de fidelidade** — pontos por compra, resgatáveis como desconto
- **Assinatura de produtos** — entrega recorrente (ex: ração mensal), com desconto para assinantes
- **Programa de indicação (referral)** — desconto para quem indica e para quem é indicado
- **Histórico de endereços frequentes** com sugestão automática

### Experiência do Lojista
- **Controle de estoque inteligente** — alerta quando estoque de um produto atingir nível mínimo
- **Variantes de produto** — mesmo produto com opções de tamanho, sabor, etc.
- **Exportação de relatórios** — CSV/PDF de vendas, estoque e clientes para o lojista
- **Múltiplas lojas por lojista** — um STORE_OWNER gerenciar mais de uma loja
- **Stories/destaques de promoções** — lojista posta banners temporários de ofertas

### Operacional
- **App dedicado para entregadores** — aceitar corridas, confirmar entrega, rastrear rota
- **Agendamento de entrega** — cliente escolhe janela de horário preferida
- **Chat em tempo real** entre cliente e lojista (pré e pós-venda)
- **Avaliação da entrega** — nota separada para o entregador/logística

### Técnico / Crescimento
- **SEO para a web** — páginas de produto e loja indexáveis pelo Google
- **Cache com Redis** — resultados de ranking, catálogo e busca
- **2FA para lojistas e admins** — segurança adicional para contas sensíveis
- **Modo escuro** no app mobile e web
- **Integração com clínicas veterinárias** — agendamento de consulta diretamente no app
- **Suporte multi-idioma** (pt-BR / en-US) para expansão futura
