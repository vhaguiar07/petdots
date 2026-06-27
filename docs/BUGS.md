# Bugs e Limitações Conhecidas — PetDots

> **Status:** Nenhum bug confirmado identificado na análise estática do código até 2026-06-26.

---

## Bugs Confirmados

_Nenhum até o momento._

---

## Limitações e Comportamentos Incompletos

Estes itens **não são bugs** no sentido estrito (o código funciona conforme implementado), mas representam funcionalidades ausentes ou comportamentos que podem surpreender usuários e devem ser resolvidos antes do lançamento.

### PriceAlert — trigger de notificação não implementado
- A entidade `PriceAlert` existe no banco e a API permite criar/listar/deletar alertas, mas o mecanismo que detecta quedas de preço e notifica o cliente **não está implementado**. O cliente cria o alerta mas nunca recebe a notificação.
- **Impacto:** Funcionalidade divulgada não funciona de ponta a ponta.
- **Referência:** `apps/api/src/price-alerts/`

### Tag "Aberto agora" — valor mockado
- A tag "Aberto agora" exibida na vitrine de lojas é calculada com base em um horário hardcoded (08h–19h, seg–sáb), ignorando o horário de funcionamento real cadastrado pela loja.
- **Impacto:** Lojas podem aparecer como abertas fora do horário real ou fechadas quando estão abertas.

### WebSocket no mobile — não conectado
- O app mobile possui o cliente Socket.IO instalado, mas **não está conectado ao gateway de pedidos**. Atualizações de status em tempo real não chegam ao cliente mobile.
- **Impacto:** Cliente mobile precisa recarregar manualmente para ver o status atualizado do pedido.
- **Referência:** `apps/mobile/src/`

### "Esqueci minha senha" — fluxo ausente
- Não existe endpoint de recuperação de senha (`/auth/forgot-password` ou `/auth/reset-password`). Um usuário que perdeu a senha **não consegue recuperar o acesso**.
- **Impacto:** Bloqueador para usuários reais.

### Checkout sem pagamento real
- O fluxo de pedido é concluído sem integração com gateway de pagamento. Pedidos são criados com status `PENDING` mas não há cobrança real.
- **Impacto:** Sistema não pode ser usado em produção sem integração de pagamento.

---

## Como Registrar um Novo Bug

Ao encontrar um bug, adicione uma seção aqui com:

```markdown
### [Nome curto do bug]
- **Descrição:** O que acontece vs. o que deveria acontecer.
- **Como reproduzir:** Passos para reproduzir.
- **Impacto:** Severidade e quem é afetado.
- **Referência:** Arquivo/módulo relacionado.
- **Status:** `aberto` | `em andamento` | `resolvido`
```
