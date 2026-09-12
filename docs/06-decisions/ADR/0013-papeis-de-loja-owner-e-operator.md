---
title: "ADR-0013: Papéis de loja — o que OWNER pode e OPERATOR não"
status: stable
version: "1.0"
updated: 2026-09-12
scope: >
  Fecha a distinção de permissão entre OWNER e OPERATOR que o SECURITY declarava
  pré-requisito da autorização fina: quem altera preço, quem marca
  disponibilidade, quem vê repasse, quem edita área de entrega e quem convida
  membro. Registra também o recorte do MVP — os dois papéis são modelados, mas a
  tela de convite não nasce agora — e as invariantes do vínculo StoreMember. É
  decisão de produto, tomada pelo Victor; não implementa nada: o StoreScopeGuard
  que a materializa é a pd-16.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 01-product/PERSONAS.md
  - 01-product/USER_JOURNEYS.md
  - 03-engineering/SECURITY.md
  - 04-api/AUTHENTICATION.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md
type: decision
---

# ADR-0013: Papéis de loja — o que OWNER pode e OPERATOR não

## Contexto

O [`SECURITY`](../../03-engineering/SECURITY.md) chama o escopo de loja por
instância de **defesa central** e fixa a invariante **0 acesso a pedido ou preço
de outra loja**. Ele também declara, desde a v1.1, um pré-requisito que nunca
foi cumprido:

> A distinção de permissão entre `OWNER` e `OPERATOR` — quem altera preço, quem
> vê repasse — deve ser fechada **antes** de desenhar a autorização fina.

O [ADR-0011](0011-autenticacao-propria-antes-da-escrita.md) (A2) tirou o
`StoreScopeGuard` do escopo da `pd-12` por dois motivos independentes, e este é
o segundo deles. Desde então a pendência vive como **item 10 da intervenção
manual** do [`BACKLOG`](../../07-process/BACKLOG.md), e é o que trava a `pd-16`
— o painel do lojista —, que por sua vez trava a **escrita de ofertas pelo
lojista**, o item de maior valor do backlog. Enquanto o preço depender do Victor
editar um arquivo de seed, não há operação de duas pontas.

**O que já estava decidido no papel, e que esta decisão não inventa:**

- o [`DOMAIN_MODEL`](../../01-product/DOMAIN_MODEL.md) já define `StoreMember`
  como o vínculo Usuário–Loja com `role` sendo `OWNER` ou `OPERATOR`;
- as [`USER_JOURNEYS`](../../01-product/USER_JOURNEYS.md) já atribuem ator por
  jornada: **J6** (onboarding da loja) é do *dono*, **J4** (atender o pedido) é
  do *dono ou operador*, **J8** (conferir repasses) é do *dono*;
- as [`PERSONAS`](../../01-product/PERSONAS.md) descrevem a persona da oferta
  como *"dono ou operador de petshop independente"*, com loja de dono presente,
  e registram que o **entregador não tem login** no MVP.

O que faltava era a linha que o guard lê: **o que cada papel pode fazer**.

Duas forças do território decidem o desenho, e as duas vêm da persona:

1. **A loja opera em rajada, e o tempo até o aceite é a métrica que o tutor
   sente.** Qualquer permissão que obrigue a dona a estar presente para o
   pedido andar mata a operação.
2. **Margem apertada, 15% a 20% em ração popular.** Preço errado não é
   inconveniente: o pedido é **registro contábil imutável com snapshot**
   (`DOMAIN_MODEL`), então a venda com prejuízo não se desfaz depois.

## Decisão

### A tabela de permissões

| Capacidade | `OWNER` | `OPERATOR` |
|---|---|---|
| Aceitar, recusar e despachar pedido | ✅ | ✅ |
| Marcar item do pedido como indisponível ou substituído | ✅ | ✅ |
| Marcar **disponibilidade** de uma oferta ("tenho" / "não tenho") | ✅ | ✅ |
| Ver a fila de pedidos da própria loja | ✅ | ✅ |
| **Alterar preço** de uma oferta | ✅ | 🔴 **não** |
| **Ver repasse e faturamento** | ✅ | 🔴 **não** |
| Editar áreas de entrega, taxa e prazo | ✅ | 🔴 **não** |
| Convidar ou remover membro da loja | ✅ | 🔴 **não** |
| Pausar ou reativar a loja | ✅ | 🔴 **não** |

### As decisões, uma a uma

| # | Decisão | Por quê |
|---|---|---|
| **B1** | **Preço e disponibilidade são permissões separadas.** Alterar preço é `OWNER`; marcar disponível/indisponível é dos dois | São coisas de natureza diferente que a palavra "oferta" esconde. **Preço é decisão comercial** sobre uma margem que não absorve erro, e o erro é irreversível pelo snapshot do pedido. **Disponibilidade é fato de prateleira**, e quem enxerga a prateleira é quem está no balcão. Exigir a dona para marcar "acabou a ração" produz o pior caso do piloto: pedido pago de item que não existe, com o Pix já capturado e sem estorno modelado |
| **B2** | **Repasse e faturamento são só do `OWNER`** | É o que a J8 já dizia. Faturamento é dado sensível **dentro da própria loja**: a dona não quer que um balconista rotativo saiba quanto ela recebe por semana. E a confiança no split é o produto do lado da oferta (ADR-0003) — ela é da dona, não do balcão |
| **B3** | **Pedido é dos dois papéis** | A J4 já dizia *"dono ou operador"*. A operação é em rajada e o tempo de aceite é o que o tutor sente. É também o que impede o cenário que o backlog nomeia como o pior possível: pedido pago que ninguém aceita |
| **B4** | **Área de entrega, taxa, prazo, pausar a loja e convidar membro são só do `OWNER`** | Todas são decisão comercial ou de acesso, não operação de balcão. Taxa de entrega é preço cobrado do cliente; convidar membro é dar a alguém a chave do dinheiro; pausar a loja tira a oferta inteira do comparador |
| **B5** | **Os dois papéis são modelados agora; a tela de convite não nasce no MVP.** O enum `StoreRole`, a coluna `role` e a regra do guard entram com a `pd-16`. O vínculo `StoreMember` é criado **no onboarding conduzido pelo Victor**, como o catálogo é semeado hoje | Destrava o guard sem construir back-office que ninguém usa: nenhuma loja do piloto pediu um segundo login ainda. Construir o convite agora custaria uma tela, um fluxo e provavelmente **e-mail transacional** — que é decisão de modelagem ainda aberta no backlog. A tela nasce no dia em que a primeira loja pedir o segundo acesso, e esse é o gatilho registrado |
| **B6** | **Toda loja tem ao menos um `OWNER`, e remover o último é proibido** | Loja sem dono é loja órfã: ninguém pode mudar preço, ver repasse nem convidar quem o faça. A regra vive no domínio, e a remoção do último `OWNER` falha com erro de domínio próprio |
| **B7** | **`StoreRole` não é `UserRole`, e o token não carrega `StoreRole`** | `UserRole.STORE_MEMBER` no JWT diz apenas *"esta pessoa opera alguma loja"* — é o RBAC grosso que o `RolesGuard` já verifica por interseção. **Qual** loja e **com que poder** é o vínculo `store_members`, lido **em tempo de requisição** pelo `StoreScopeGuard`. Pôr o papel de loja no token o tornaria uma foto de 15 minutos atrás de uma permissão que a dona pode ter acabado de revogar — e é exatamente o que o `AUTHENTICATION` já diz sobre autorização fina não viver no token |
| **B8** | **Uma pessoa pode ser membro de mais de uma loja, com papel diferente em cada** | O `StoreMember` já é N:N por construção. Duas unidades da mesma dona no bairro é caso real, e o guard resolve por `(user_id, store_id)`, nunca por "a loja do usuário" |

### O que esta decisão **não** faz

- **Não implementa nada.** O `StoreScopeGuard`, a tabela `store_members` e a
  migration correspondente nascem na **`pd-16`**, junto do painel do lojista.
  Este ADR é o pré-requisito que o `SECURITY` exigia, e ele passa a ser insumo
  daquele plano.
- **Não decide o onboarding da loja** (J6), que é capacidade 4 e tem as próprias
  pendências: `psp_recipient_id`, documentos e ativação.
- **Não cria a auditoria.** A alteração de preço é a **primeira das quatro
  mutações que o `SECURITY` manda rastrear**, e o `audit_log` com o `Audit`
  interceptor nasce com ela — na tarefa que abrir a escrita de oferta, não aqui.
  ⚠️ Com B1, o registro de auditoria passa a ter **duas informações distintas**
  a guardar: quem mudou o preço e quem mudou a disponibilidade.

## Alternativas consideradas

- **`OWNER` e `OPERATOR` podem tudo na oferta, preço incluído** — descartada
  pelo Victor. É a mais simples de implementar e de explicar ao lojista, e o
  custo dela é concreto: um funcionário digitando `7,10` no lugar de `71,00`
  vende a ração com prejuízo, e o pedido não se desfaz.
- **Só o `OWNER` toca em oferta, disponibilidade incluída** — descartada pelo
  Victor. Daria o máximo de controle à dona sobre o que aparece no comparador,
  ao custo de fazer "acabou o produto" esperar por ela. É o caminho mais curto
  para o pedido de item inexistente.
- **Repasse visível também ao `OPERATOR`** — descartada. Menos regra para
  explicar, mas expõe o faturamento da loja a quem está no balcão.
- **Só o dono aceita e despacha pedido** — descartada. Controle total sobre o
  que a loja assume, ao custo de o pedido pago esperar a dona olhar o painel.
- **Não modelar `OPERATOR` no MVP — uma loja, um login** — descartada. Seria o
  recorte mais enxuto, mas duas pessoas usando o mesmo login destroem a
  rastreabilidade de quem aceitou cada pedido, que é justamente o que a
  auditoria de aceite vai precisar registrar.
- **Modelar e já construir a tela de convite** — descartada por B5: back-office
  para um usuário que ainda não existe, e que esbarra no canal de notificação
  transacional, decisão ainda aberta.
- **Papel de loja dentro do JWT** — descartada por B7: permissão revogada
  continuaria valendo até o token expirar.

## Consequências

**Positivas**

- O pré-requisito que o `SECURITY` declarava aberto está **fechado**, e a
  `pd-16` deixa de depender de uma decisão que só o Victor podia tomar.
- A `pd-16` nasce com a tabela de permissões pronta, o que torna o
  `StoreScopeGuard` implementável sem reabrir discussão de produto.
- A separação de B1 dá ao teste de autorização um caso limpo e verificável: o
  mesmo `OPERATOR` **passa** ao marcar indisponibilidade e **é negado** ao mudar
  o preço da mesma oferta.

**Negativas, aceitas**

- **A dona vira gargalo do preço.** É deliberado, e é onde a margem mora. Se na
  operação real isso travar o dia a dia, a saída não é afrouxar o papel: é dar
  ao `OPERATOR` uma **sugestão de preço** que a dona aprova. Fica registrado
  aqui como o caminho de evolução, não como pendência.
- **Sem tela de convite, todo vínculo passa pelo Victor**, que é o único
  fundador de rua. Aceito enquanto a coorte for pequena; é o mesmo trato do
  catálogo por seed, e tem o mesmo gatilho de saída.
- **Nenhuma loja do piloto exercita `OPERATOR` no dia 1.** O papel existirá
  testado e sem uso real até o primeiro pedido de segundo login. O risco é o
  caminho de código pouco exercitado, mitigado por ele ser **a mesma rota** que
  o `OWNER` percorre, com uma verificação a mais.

## Status

`accepted` — 12/09/2026. Decisão do **Victor**, sobre recomendação da IA, em
conversa própria fora de branch de tarefa. Nenhuma linha de código foi escrita:
a implementação é da `pd-16`.
