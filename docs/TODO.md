# TODO — Pendências do PetDots

> Itens ordenados por prioridade. Marque com `[x]` quando concluído.

---

## Bloqueadores para Produção

Sem esses itens, o sistema **não pode ser usado por usuários reais**.

- [ ] **Integração de pagamento** — PIX, cartão de crédito e boleto (ex: Stripe, Abacatepay ou PagSeguro). Hoje pedidos são criados sem cobrança real.
- [ ] **Fluxo de "Esqueci minha senha"** — endpoint de solicitação de reset + envio de e-mail + endpoint de redefinição. Sem isso, usuários que perdem a senha ficam bloqueados.
- [ ] **Trigger de alerta de preço** — detectar quando `StoreProduct.price` cai abaixo do alvo do `PriceAlert` e notificar o cliente.

---

## Mobile

- [ ] **Conectar WebSocket no mobile** — ligar o cliente Socket.IO ao gateway `/orders` para receber atualizações de pedido em tempo real sem precisar recarregar.
- [ ] **Tela de detalhe do pedido** — exibir itens, status, valor e rastreamento.
- [ ] **Telas do lojista no mobile** — dashboard de vendas, lista de pedidos pendentes, atualização de status, gestão de estoque.
- [ ] **Telas do admin no mobile** — aprovação de lojas e moderação de catálogo.

---

## Web

- [ ] **Listagens por categoria** — páginas de categoria com filtros (atualmente mockadas).
- [ ] **Filtros e busca avançada** — filtrar produtos por preço, avaliação, categoria, tipo de pet, entrega rápida.
- [ ] **Tag "Aberto agora" real** — calcular baseado no horário de funcionamento cadastrado pela loja, não no valor hardcoded.
- [ ] **Página de comparação de preços** — exibir visualmente o `GET /products/catalog/:id/compare` para o cliente.

---

## Funcionalidades Incompletas

- [ ] **Tag "Entrega Rápida" — Fase 2** — pesquisa pós-entrega para coletar tempo real de entrega.
- [ ] **Tag "Entrega Rápida" — Fase 3** — remoção automática da tag se a loja tiver menos de 70% de entregas no prazo.
- [ ] **2FA para lojistas e admins** — TOTP (Google Authenticator) ou SMS como segundo fator.
- [ ] **Resposta do admin a reviews** — hoje apenas o lojista pode responder; considerar se admin também deve poder.

---

## Infraestrutura e DevOps

- [ ] **CI/CD** — pipeline GitHub Actions: lint, testes, build e deploy automático.
- [ ] **Dockerfile de produção** — imagem otimizada para `apps/api` (multi-stage build).
- [ ] **Variáveis de ambiente documentadas** — arquivo `.env.example` completo para todos os apps.
- [ ] **Cache com Redis** — para consultas pesadas: ranking de produtos, catálogo, busca.
- [ ] **Queue/workers** — BullMQ para notificações assíncronas (e-mail, push, alertas de preço).
- [ ] **Monitoramento de erros** — integração com Sentry ou similar.
- [ ] **Push notifications** — Firebase Cloud Messaging para alertas de pedido, promoção e preço.

---

## Testes

- [ ] **Testes E2E** — Cypress (web) e Detox ou Maestro (mobile) para os fluxos críticos: cadastro, pedido, pagamento.
- [ ] **Cobertura de testes unitários** — garantir cobertura mínima nos módulos de pedido, promoção e pagamento.
- [ ] **Teste de carga** — validar comportamento sob pico de pedidos no WebSocket gateway.
