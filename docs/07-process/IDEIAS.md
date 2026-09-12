---
title: Ideias e Melhorias
status: stable
version: 1.7
updated: 2026-09-12
scope: >
  Ideias, oportunidades e evoluções previstas do PetDots que não são
  pendências — não têm dono, prazo nem obrigação de acontecer. Mantido
  deliberadamente separado do BACKLOG para que a fila de trabalho não
  pareça maior do que é.
relates_to:
  - 07-process/DIRETRIZES_FLUXO_IA.md
  - 07-process/BACKLOG.md
  - 00-foundation/PRODUCT_ROADMAP.md
  - 01-product/MVP_SCOPE.md
  - 01-product/DOMAIN_MODEL.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
type: process
---

# Ideias e Melhorias — PetDots

> **Isto não é backlog.** Aqui vive o que foi imaginado, previsto ou deixado
> para depois **sem dono e sem prazo**. Backlog é só pendência real — coisa que
> alguém precisa resolver.
>
> A separação é deliberada: ideia misturada com pendência infla o backlog e faz
> a fila de trabalho parecer maior do que é. **Ideia que ganha dono e urgência
> migra para o [`BACKLOG.md`](BACKLOG.md)**; item de backlog que se revela
> desejo sem necessidade migra para cá.

Última revisão: 11/09/2026.

---

## Fora do MVP por decisão de escopo

> Estas capacidades estão **documentadas e decididas** como pertencentes a fases
> posteriores — não são esquecimento. A lista abaixo espelha
> [`01-product/MVP_SCOPE.md`](../01-product/MVP_SCOPE.md) §"Fora do escopo".
>
> ✅ **Espelho reconferido em 10/09/2026** (`pd-07`), depois da reescrita do
> `MVP_SCOPE` sob o ADR-0004. O aviso de suspeita que estava aqui saiu: a
> contradição foi resolvida. Duas coisas mudaram de lado na reconferência —
> **o marketplace saiu desta lista** (é o MVP) e **a carteira do pet entrou**
> (passou a ser fase 2).

### Carteira digital, timeline e histórico de saúde — fase 2
Era o MVP no desenho anterior; virou fase 2 com o ADR-0004. O `Pet ID` já nasce
imutável no MVP exatamente para receber esse histórico depois. Junto com ela
volta o compartilhamento de pet entre tutores (N:N).

### Clube de assinatura e mensalidade do painel — fase 2
Recompra recorrente e clube de descontos para o tutor; mensalidade SaaS do
painel para o lojista, só quando o valor estiver comprovado pelo próprio painel.
Cobrar a entrada de um clube sem valor provado é atrito fatal no pitch
(ADR-0003).

### Lado B2B do ecossistema — fase 3
Perfis de Parceiros — clínicas, veterinários, prestadores e laboratórios. É a
metade do ecossistema que a visão "toda a vida do pet em um único lugar"
pressupõe, e da qual dependem busca de profissionais, agendamento e reputação.
Exige base de tutores validada antes de fazer sentido — e é quando `stores`
passa a referenciar `partners`.

### Agendamento online e reputação de parceiros — fase 3
Tutor marca serviço direto pelo app; avaliação nasce do agendamento concluído,
não de formulário solto. As duas coisas se sustentam mutuamente — avaliação sem
transação verificada é o que degrada marketplace.

> ⚠️ **Não confundir com a avaliação de loja**, que é lacuna do MVP e está
> registrada mais abaixo, em "Lacunas para um marketplace completo". Reputação
> de parceiro de serviço é outra coisa.

### Portal empresarial e ERP para clínicas — fase 4
Aprofundamento B2B: a clínica passa a operar dentro do PetDots em vez de apenas
ser encontrada nele. É o passo que transforma o produto de canal em
infraestrutura — e o mais caro de todos.

### API pública para parceiros e integrações — fase 4
Só depois de a relação com os parceiros amadurecer. Abrir API cedo congela
contratos que ainda vão mudar muito.

### Retail media, fidelidade e campanhas patrocinadas — fase 4
Monetização adicional sobre um marketplace já ativo, sem cobrar mais take rate
do lojista.

### Alerta de bairro / pet perdido — sem fase
A "Joia 3" da ideação (§19): emocional e viral, mas não captura intenção de
compra e vira um produto inteiro (moderação, falsos alertas). Fica como *growth
hook* para quando houver base instalada num bairro.

---

## Lacunas para um marketplace completo

> **Levantamento de 08/09/2026**, por leitura cruzada de
> [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md) v2.0,
> [`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md) v2.0,
> [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) e
> [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md), com uma
> pergunta só: *o que falta para o PetDots ser um marketplace completo?*
> Registrado aqui por decisão do Victor, 08/09/2026.
>
> **A espinha transacional já está de pé** — catálogo mestre separado de oferta,
> pedido como registro contábil com snapshot, split no PSP com pagamento só no
> webhook, motor de reposição. O que segue é o que existe **em volta** dela em
> qualquer marketplace e ainda não existe aqui.
>
> ⚠️ **Nem tudo nesta seção é desejo.** O bloco "Dinheiro" descreve caminhos que
> o MVP do ADR-0004 **vai exigir para operar**: não há como cobrar por Pix e
> depois não ter como devolver. **Gatilho de migração para o
> [`BACKLOG.md`](BACKLOG.md):** o início da implementação do ADR-0004 — no dia em
> que o pedido existir em código, o bloco "Dinheiro" deixa de ser ideia e vira
> pendência (ou ADR).

### Dinheiro: os caminhos de volta não existem

**Estorno e ajuste de pedido.** O `DOMAIN_MODEL` (§Ownership de dados) manda
corrigir pedido "por novo registro (estorno/ajuste), nunca por edição" — mas
**esse registro não está modelado**: existe `PaymentStatus.REFUNDED` sem nada que
o produza, e nenhum caminho para reverter `commission_total_cents` nem o
`Payout`. Dois fluxos normais caem nisso no dia 1: (a) `ItemFulfillment`
`UNAVAILABLE`/`SUBSTITUTED`, já previsto no enum, com o Pix capturado **antes**
de a loja aceitar (fluxo 1 do `SYSTEM_ARCHITECTURE`) — o cliente paga R$ 100,
recebe R$ 80 e não há como devolver os R$ 20; (b) `REJECTED`, a loja recusando um
pedido já pago. Imutabilidade do pedido somada à substituição, sem entidade de
ajuste, é contradição interna do modelo.

**Prazo de aceite e auto-recusa.** `PLACED → ACCEPTED` não tem timer. Petshop de
bairro não fica olhando painel, e pedido pago que ninguém aceita é o pior cenário
possível: dinheiro do cliente preso sem saída. Somado a "sem horário de
funcionamento" e "sem estorno", forma a trinca que produz o pior pedido do
piloto.

**Extrato de repasse do lojista.** `Payout` é por pedido. A pergunta do lojista é
outra: "quanto recebi na semana, de quais pedidos, quanto de comissão". Sem
extrato ele não confia no split — e essa confiança **é** o produto do lado da
oferta.

**Cupom de aquisição.** O ADR-0003 #3 já decidiu que subsídio de entrega existe
"só como cupom de aquisição com verba e prazo definidos". Não há `Coupon`,
`Order` não tem `discount_cents`, e não está decidido **quem paga o desconto**
(plataforma × loja). É decisão de negócio aceita que ficou sem lugar no modelo.

**Obrigações fiscais do split.** Split mais taxa de serviço de R$ 1,99 ao cliente
(ADR-0003 #2) significa plataforma com receita de serviço e loja vendendo
mercadoria. Quem emite o quê não está em nenhum ADR. Mexe em contabilidade e no
contrato com o lojista: é decisão de ADR, não de implementação.

**Chargeback — gatilho: cartão de crédito entrar.** O ADR-0003 escolheu Pix-first
justamente por não haver chargeback, e cartão "entra depois do lançamento".
Legítimo estar fora; o que faltava era o gatilho nomeado. Quando cartão entrar,
disputa e responsabilidade pelo prejuízo precisam de modelo.

### Confiança: falta o que faz um marketplace ser marketplace

**Avaliação e reputação de loja.** Não existe `Review`, nem rating em `Store`. O
comparador **ordena só por preço** (fluxo 2 do `SYSTEM_ARCHITECTURE`): sem sinal
de qualidade, a plataforma premia quem entrega mal e barato. É coisa diferente da
"reputação de parceiro" da seção de fase 2 acima — aquela nasce de agendamento de
serviço; esta nasce de pedido entregue.

**Canal de atendimento no pedido.** O concorrente declarado é o WhatsApp da
própria loja (IDEACAO §5, citado no ADR-0003). Se o pedido dá problema e o único
canal é aquele WhatsApp, o tutor aprende a resolver direto com a dona — a
plataforma se desintermedia exatamente no momento em que mais importa.

**Política de cancelamento.** `CANCELLED` e `cancellation_reason` existem; janela
("posso cancelar até quando"), quem pode cancelar e o que acontece com o dinheiro,
não.

**Verificação de telefone.** Entrega hiperlocal depende de o telefone estar
certo. `User.phone` e `WaitlistEntry.phone` não têm verificação; sem OTP, o smoke
test coleta número falso e a entrega falha na porta.

### Operação: não existe back-office

**Console de administração.** `UserRole.ADMIN` existe no modelo e **nenhum dos
onze módulos** do ADR-0004 serve o admin. Sem tela para aprovar loja, curar
catálogo, alterar tabela de comissão, intervir em pedido ou emitir estorno, tudo
isso vira SQL na mão do Victor — que é o único fundador de rua.

**Ingestão do catálogo mestre.** O ADR-0004 já assume a curadoria centralizada
como "gargalo operacional da plataforma no piloto", mas não há decisão sobre **de
onde vêm os produtos**: digitação manual, base pública por EAN (GS1/Cosmos),
leitura de código de barras pelo lojista. E o comparador só existe se lojas
diferentes ofertarem o **mesmo** `product_id` — a ingestão é pré-requisito da
Joia 2, não detalhe operacional.

> 🔶 **Interino desde a `pd-11`:** um **seed versionado** em
> `apps/api/src/seed/data/`, idempotente e validado antes de escrever
> ([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md)).
> Destravou o comparador e **não resolve a lacuna**: os EANs continuam todos
> `null`, e um lojista não edita arquivo TypeScript. A decisão sobre a fonte dos
> produtos segue em aberto.

**Horário de funcionamento da loja.** `StoreStatus` tem `PAUSED`, mas não há
agenda semanal. A loja fecha às 19h e no domingo; sem horário, o pedido das 22h
entra e apodrece.

**Notificação transacional não tem onde morar.** O módulo `notifications` tem uma
tabela só, `reminders`, e `Reminder` exige `replenishment_schedule_id`. Mas o
fluxo crítico manda "notifica a Loja (WhatsApp + push)" no `PLACED`. Do jeito que
está, aviso de pedido aceito, despachado ou de pagamento falho vira campo
nullable numa tabela de reposição.

### Demanda e descoberta

**Regra de ranking do comparador.** ✅ **Decidida na `pd-11`**
([ADR-0010](../06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md)):
**preço entregue** (item + taxa) crescente, desempate por prazo e nome da loja.
O que este item previa continua valendo como alerta — ranking é política de
alocação de receita, vai ser o primeiro pedido de favor do lojista ("me põe em
cima") e o primeiro produto de mídia quando as campanhas patrocinadas entrarem.
**O que segue em aberto:** prazo ou reputação como critério **primário**, que
depende de existir dado de reputação (item "Avaliação e reputação de loja",
acima).

### Busca com "a partir de R$ X" por produto
Hoje `/precos` lista marca, nome e variante; o preço só aparece na página do
produto. Mostrar o menor preço na própria lista faria a busca responder a
pergunta real ("quanto custa?") uma tela antes. Custa uma agregação por linha da
listagem — ou uma coluna denormalizada com o menor preço vigente, que passa a
precisar de invalidação. Não é pendência: a página funciona sem isso.

### Página pública da loja (`/lojas/{slug}`)

> ✅ **Parcialmente atendida na `pd-13`** (12/09/2026): a vitrine **existe no
> app**, em `/loja/{id}` — nome, bairro, áreas de entrega e a prateleira —, e o
> comparador leva a ela pelo nome da loja. A API ganhou
> `GET /stores/{storeId}` e `GET /stores/{storeId}/offers`.
>
> **O que continua aqui, sem dono:** a página **SEO na landing**, por `slug` e
> não por id, indexável e com `sitemap`. É outra coisa: a do app serve quem já
> está navegando; a da landing serve quem busca "petshop no Méier" no Google. O
> backend dela já existe — falta a rota do Next e o `?slug=` no endpoint.

`Store` já tem `slug` desde a `pd-11`. A versão indexável seria um ativo de SEO
por bairro, além de algo concreto para mostrar ao lojista na abordagem de rua.
Sem dono nem prazo: o comparador é por produto, e é o produto que a pessoa
busca.

**Comparador de cesta × comparador de item.** Um pedido, uma loja (ADR-0004 #6) é
decisão boa, mas a consequência não está tratada: quem compra 4 itens no menor
preço de cada loja paga 4 taxas de entrega. Ou o produto ensina "sai mais barato
levar tudo na loja X" — comparação de cesta —, ou a promessa do comparador
decepciona na conta final.

**Histórico de preço.** O evento `offer.price_changed` está descrito como o que
"alimenta histórico do comparador", e nenhuma tabela guarda esse histórico:
`offers` tem só `price_updated_at`. Histórico é o que separa um comparador de uma
lista de preços — e é dado que só se acumula com o tempo, então começar tarde
custa.

**Carrinho persistente.** O módulo `orders` fala em "carrinho→pedido", mas
carrinho não é entidade. Se vive só no cliente, morre na troca de aparelho e não
existe carrinho abandonado — a alavanca de conversão mais barata que há.

### Legal e plataforma

**LGPD: exportação e exclusão.** O `DOMAIN_MODEL` declara que o tutor "pode
exportar e solicitar exclusão", respeitada a retenção fiscal dos pedidos. Não há
módulo, rota nem entidade que realize esse direito.

**Aceite de termos versionado.** Split move dinheiro de terceiro, e nada registra
qual versão dos termos o lojista e o tutor aceitaram, e quando. É o tipo de
ausência que só aparece quando dá briga.

---

## Produto

### Carteira digital do pet como âncora de retenção
A "vida do pet em um único lugar" — vacinas, exames, histórico — é a promessa da
marca e a razão de o tutor voltar quando não está comprando nada. O marketplace
traz frequência de compra; a carteira traz frequência de uso. Vale desenhar como
as duas se alimentam antes de construir qualquer uma das duas por inteiro.

### Recompra recorrente de ração
O item de maior previsibilidade da cesta é também o de menor margem
([ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md):
ração popular 15-20%). Assinatura ou lembrete de recompra atacaria retenção sem
depender de take rate maior — o inverso do movimento que o lojista rejeita.

### Sinal de estoque real do lojista de bairro
O concorrente invisível do PetDots é o WhatsApp da própria loja (IDEACAO_FASE1
§5), que ganha em uma coisa só: a dona sabe o que tem na prateleira. Qualquer
mecanismo que aproxime o catálogo do estoque real ataca a vantagem central do
concorrente.

---

## Engenharia

### Substituir o `nestjs-zod` por outra ponte Zod→OpenAPI
Hoje uma única biblioteca materializa o contrato REST + Zod → OpenAPI que o
[ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) definiu — e
ela está **parada desde 25/07/2026**, a ponto de o [ADR-0007](../06-decisions/ADR/0007-esm-nest-12-e-prisma-7.md)
ter precisado rodá-la fora do peer que declara para destravar o NestJS 12.
Trocar a ponte tira o contrato da dependência de um projeto sem manutenção.
**Não é pendência hoje**: o arranjo atual funciona, o contrato não mudou e há
teste guardando isso. Vira pendência se a biblioteca continuar parada quando o
Nest 13 sair, ou se o override deixar de segurar. Uma escolha nova aqui é
decisão de ADR, porque mexe num contrato já decidido.

### Cache remoto do Turborepo
O [ADR-0005](../06-decisions/ADR/0005-bootstrap-monorepo.md) adotou o Turborepo
com cache **local**. Cache remoto compartilharia artefatos entre a máquina do
Victor e o runner do CI, encurtando builds repetidos. **Não faz sentido hoje**:
com quatro workspaces e um CI de poucos minutos, o ganho é ruído. Gatilho
natural: o dia em que o CI passar a incomodar pelo tempo.

---

## Processo

### Aplicar o `check-frontmatter.sh` no CI
O [`scripts/check-frontmatter.sh`](../../scripts/check-frontmatter.sh) valida os
sete campos obrigatórios de frontmatter, mas roda **um arquivo por vez e a
pedido**. Um passo de CI varrendo `docs/**/*.md` transformaria a convenção em
garantia. Barato, e o script já existe.

### Índice de descoberta quando `docs/` crescer
Hoje a descoberta se apoia no [`docs/README.md`](../README.md), no
[`ADR/README.md`](../06-decisions/ADR/README.md) e em grep. Funciona nesta
escala. **Gatilho de reavaliação:** se `docs/` passar de ~40 arquivos, ou se em
alguma tarefa um documento existente comprovadamente deixar de ser consultado,
vale discutir algo mais estruturado.
