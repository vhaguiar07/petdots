# Roadmap — PetDots

Visão de fases de desenvolvimento. O objetivo é ter um MVP funcional em produção o mais rápido possível, adicionando camadas de valor e escala nas fases seguintes.

---

## Fase 1 — MVP (Concluída)

Marketplace funcional de ponta a ponta para web, com backend completo.

- [x] Autenticação (e-mail/senha + Google OAuth)
- [x] Gestão de lojas com fluxo de aprovação pelo admin
- [x] Catálogo global de produtos com moderação
- [x] Produtos por loja (preço, estoque, descrição próprios)
- [x] Carrinho de compras e criação de pedidos
- [x] Máquina de estados do pedido
- [x] Rastreamento em tempo real via WebSocket (web)
- [x] Promoções, cupons e desconto automático no checkout
- [x] Reviews de produtos e lojas
- [x] Comparação de preços entre lojas
- [x] Alertas de preço (cadastro — trigger pendente)
- [x] Dashboard do lojista com analytics de 30 dias
- [x] Painel admin (aprovação, moderação, auditoria)
- [x] App mobile: telas do cliente (vitrine, produto, carrinho, pedidos)
- [x] Raio de entrega com geocodificação
- [x] Upload de imagens (S3-compatible)
- [x] Log de auditoria

---

## Fase 2 — Produção Real (Próxima)

Itens sem os quais o sistema não pode ser lançado com usuários reais.

- [ ] Integração de pagamento (PIX, cartão, boleto)
- [ ] "Esqueci minha senha" (e-mail de reset)
- [ ] Trigger de notificação para alertas de preço
- [ ] WebSocket conectado no mobile (tempo real)
- [ ] Telas do lojista no mobile (dashboard, pedidos, estoque)
- [ ] Tela de detalhe do pedido no mobile
- [ ] CI/CD (GitHub Actions) + Dockerfile de produção

---

## Fase 3 — Experiência e Retenção

Funcionalidades que aumentam a recorrência e o engajamento dos usuários.

- [ ] Push notifications (pedido, promoção, preço)
- [ ] Perfil dos pets do cliente (espécie, raça, idade)
- [ ] Filtro de produtos por tipo de pet
- [ ] Wishlist / Lista de desejos
- [ ] "Compre novamente" — recompra rápida pelo histórico
- [ ] Programa de fidelidade (pontos por compra)
- [ ] Listagens por categoria e busca avançada (web)
- [ ] Tag "Aberto agora" com horário real de funcionamento
- [ ] 2FA para lojistas e admins

---

## Fase 4 — Operação e Crescimento

Infraestrutura para suportar volume e expansão do negócio.

- [ ] Cache com Redis (ranking, catálogo, busca)
- [ ] Queue/workers para notificações (BullMQ)
- [ ] Monitoramento de erros (Sentry)
- [ ] Teste de carga e otimização de queries
- [ ] App dedicado para entregadores
- [ ] Assinatura de produtos (entrega recorrente)
- [ ] Variantes de produto (tamanho, sabor, etc.)
- [ ] Exportação de relatórios para lojistas (CSV/PDF)
- [ ] SEO — páginas de produto e loja indexáveis pelo Google
- [ ] Suporte a múltiplas lojas por lojista
