---
title: Ideias e Melhorias
status: stable
version: 1.0
updated: 2026-09-06
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

Última revisão: 06/09/2026.

---

## Fora do MVP por decisão de escopo

> Estas capacidades estão **documentadas e decididas** como pertencentes a fases
> posteriores — não são esquecimento. A lista abaixo espelha
> [`01-product/MVP_SCOPE.md`](../01-product/MVP_SCOPE.md) §"Fora do escopo".
>
> ⚠️ **Este espelho está sob suspeita.** O `MVP_SCOPE` foi escrito para o
> produto "Vida do Pet" e contradiz o [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md)
> — que tornou o marketplace o MVP, quando o `MVP_SCOPE` o coloca na Fase 4.
> A contradição é item 🔴 do backlog. **Reconferir esta seção depois que a
> reescrita acontecer**: parte do que está aqui pode ter virado escopo, e parte
> do que era escopo pode ter vindo para cá.

### Lado B2B do ecossistema
Perfis de Parceiros — clínicas, veterinários, pet shops, prestadores e
laboratórios. É a metade do ecossistema que a visão "toda a vida do pet em um
único lugar" pressupõe, e da qual dependem busca de profissionais, agendamento e
reputação. Exige base de tutores validada antes de fazer sentido.

### Agendamento online e reputação de parceiros
Tutor marca serviço direto pelo app; avaliação nasce do agendamento concluído,
não de formulário solto. As duas coisas se sustentam mutuamente — avaliação sem
transação verificada é o que degrada marketplace.

### Portal empresarial e ERP para clínicas
Aprofundamento B2B: a clínica passa a operar dentro do PetDots em vez de apenas
ser encontrada nele. É o passo que transforma o produto de canal em
infraestrutura — e o mais caro de todos.

### API pública para parceiros e integrações
Só depois de a relação com as clínicas amadurecer. Abrir API cedo congela
contratos que ainda vão mudar muito.

### Programa de fidelidade e campanhas patrocinadas
Monetização adicional sobre um marketplace já ativo, sem cobrar mais take rate
do lojista.

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

### Reaproveitar o protótipo legado em vez de reescrever
As branches `master` e `develop` têm um marketplace funcional — API NestJS com
20 migrations (catálogo compartilhado, promoções, alertas de preço, raio de
entrega), front Next.js e app Expo —, verificado rodando em 06/09/2026. Como o
[ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) trouxe o
marketplace de volta como MVP, parte desse código pode ser ponto de partida em
vez de referência histórica. **Isto é ideia, não plano**: a avaliação de
aderência ao ADR-0004 nunca foi feita. A *decisão* sobre o destino do legado é
item de backlog; o *reaproveitamento* é esta ideia.

### Ambiente local em um comando
O `docker-compose.yml` do legado já sobe Postgres, MinIO, Loki e Grafana. Um
script único de bootstrap — subir stack, aplicar migrations, semear dados — vale
mais do que parece: foi a ausência dele que fez a primeira execução da aplicação
em 06/09/2026 exigir descobrir na mão que o Prisma Client não estava gerado.

### Observabilidade desde a primeira rota
`OpenTelemetry` já está na stack decidida ([ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md))
e o Grafana + Loki do legado já roda. Instrumentar desde a primeira rota custa
quase nada; retroinstrumentar um sistema pronto custa caro.

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
