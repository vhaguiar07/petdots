# Ideação — Fase 1: Marketplace de Petshops de Bairro

> **Documento vivo de brainstorm.** Captura os pontos-chave das conversas de ideação
> sobre a fase 1 do produto: um marketplace que conecta petshops de bairro a
> clientes, com entrega rápida ("iFood de petshop"). Um produto só, dois lados:
> o lojista cadastra a loja e vende; o cliente compra. As ferramentas do lojista
> (pedidos, estoque, gráficos) são o painel dele *dentro* do marketplace, não um
> produto separado.

---

# Parte 1 — Análise do marketplace (resumo para lembrança)

1. **Caso Zee.Now:** não era marketplace — era 1P verticalizado (estoque
   próprio, dark stores, frota própria, frete grátis). Comprada pela Petz junto
   com a Zee.Dog por R$ 715M (ago/2021); integração declarada "frustrada" pelo
   presidente da Petz. O precedente condena o modelo verticalizado, não o
   marketplace asset-light — mas os problemas de demanda (frequência mensal,
   CAC longo) valem para nós também. Fontes:
   [CNN Brasil](https://www.cnnbrasil.com.br/economia/negocios/app-de-entrega-de-produtos-pet-cresce-600-e-zeedog-mira-expansao-para-os-eua/),
   [InfoMoney](https://www.infomoney.com.br/negocios/zee-now-os-proximos-passos-do-app-de-entrega-para-pets-apos-ter-sido-comprado-pela-petz/),
   [Brazil Journal](https://braziljournal.com/breaking-petz-compra-zeedog-por-r-715-milhoes/),
   [F&A](https://fusoesaquisicoes.com/hr/petz-aquisicoes-sobretudo-zee-dog-foram-frustradas-diz-presidente/).
2. **Frequência de compra:** comida é 1-3x/dia, ração ~1x/mês — CAC longo,
   usuário esquece o app. A recorrência precisa ser **desenhada** (lembrete,
   assinatura), não esperada.
3. **Urgência é exceção:** compra de ração é previsível (favorece assinatura,
   modelo Petlove). Entrega rápida é atributo, não a proposta de valor central.
4. **Unit economics do frete:** ração 15kg tem margem de 10-20% para o lojista —
   não cabe take rate de iFood (15-25%). Regra: fechar a conta por pedido na
   planilha antes de construir. Margem melhor em petiscos, areia, medicamentos,
   acessórios.
5. **Oportunidade:** petshops de bairro mal digitalizados. Mas o concorrente
   invisível é o WhatsApp da própria loja, que já entrega de graça.
6. **Cidades médias são território aberto** (Petz/Cobasi só cobrem capitais).
   Estratégia: densidade hiperlocal — um bairro/cidade, nunca "para todos".
7. **Validar antes de construir:** MVP concierge — um bairro, 3-5 lojas, 60-90
   dias, operação manual; o fundador faz todo o trabalho do lojista no cold
   start. Se não funcionar na unha, não funciona com app.
8. **Catálogo:** petshop tem 1.000-5.000 SKUs (restaurante: 30-80). Solução:
   **catálogo mestre por EAN** (lojista só marca "tenho" e põe preço) — o
   investimento técnico mais estruturante da fase 1.
9. **Estoque fantasma mata a confiança.** Paliativos: catálogo enxuto (200-300
   itens que giram), confirmação rápida, substituição assistida, e mecanismo de
   transferir o pedido para outra petshop próxima. Estoque em tempo real como
   diferencial defensável é fase 3.
10. **Entrega:** usar o motoboy que o petshop já tem; onde não houver, parceiro
    por pedido (Lalamove/Uber Direct). Frota própria é queimar dinheiro cedo.
11. **Painel do lojista:** mínimo absoluto (receber/aceitar/despachar pedido,
    ver repasse). Régua WhatsApp, não SAP.

---

# Parte 2 — A visão do sócio: produto-ponte antes do marketplace (resumo)

> Preocupação do sócio: lançar marketplace sem base de usuários é "queimar a
> largada". Proposta dele: outro produto na fase 1 (carteira do pet ou rede
> social) para criar base antes do marketplace. Diagnóstico correto (cold start
> é o problema central); a prescrição foi avaliada abaixo.

12. **Audiência não é demanda:** usuários engajados num contexto não viram
    compradores em outro. O produto-ponte resolve no máximo o lado da demanda —
    a oferta continua zerada quando o marketplace lançar.
13. **Rede social de pets: descartada com convicção.** Competir com
    TikTok/Instagram (onde conteúdo pet já domina), audiência menor para quem
    posta, e cold start ainda mais brutal que o do marketplace.
14. **Carteira do pet, por componente:** histórico/ID no vet recria o problema
    dos dois lados (vet já tem software próprio; é a fase 2, não a 1). O
    **lembrete de ração acabando é a joia**: captura intenção de compra no
    momento exato — é o funil de demanda do próprio marketplace.
15. **Síntese das duas visões:** fase 1 = concierge num bairro + lembrete de
    reposição como produto de captura. Ecossistemas vencedores nasceram de uma
    cunha que venceu primeiro; a pergunta da fase 1 é "qual a menor cunha que
    gera transação recorrente".

---

# Parte 3 — As joias da fase 1

> Contexto: o lembrete de reposição sozinho pode não ser suficiente como
> produto. A ideia é escolher 1-3 "joias" — poucas features de alto valor — sem
> cair na armadilha do app que tenta resolver 1000 problemas de uma vez e fica
> confuso, sem foco.

## 16. O teste das 4 perguntas

Critério objetivo para avaliar qualquer feature candidata a "joia":

1. **Tem valor sozinha no dia 1**, com zero lojas e zero outros usuários?
2. **Captura intenção de compra** (ou algo que vira compra depois)?
3. **Alimenta o marketplace futuro** com dados ou relacionamento?
4. **É barata de construir?**

## 17. Joia 1 — Reposição inteligente

- O lembrete não fica só na ração: o petshop vive de compras **recorrentes e
  previsíveis** — ração (mensal), areia (mensal), antipulgas e vermífugo
  (mensal/trimestral), vacina (anual).
- Tudo cabe na mesma mecânica: cadastra o pet (peso, idade, o que consome) →
  o app monta a agenda de reposição → avisa no dia certo.
- **A calculadora de consumo é o truque de onboarding:** o usuário não sabe
  quando a ração acaba, mas informando o peso do pet e o tamanho do saco, o app
  calcula os gramas/dia e projeta a data. Valor imediato no primeiro uso ("seu
  saco de 15kg dura 42 dias"), sem exigir disciplina do usuário.
- **Antipulgas/vermífugo dobram como cuidado de saúde:** o mesmo lembrete que
  protege o pet ("o NexGard do Thor vence sábado") é intenção de compra de
  produto caro e de margem alta. É o pedaço da "carteira do pet" que sobrevive
  ao teste — utilidade real, sem depender de veterinário no sistema.

## 18. Joia 2 — Comparador de preços do bairro

- "Quanto custa a Golden 15kg perto de você." O dono de pet é extremamente
  sensível a preço de ração — compra de valor alto e recorrente; hoje comparar
  significa ligar ou rodar de loja em loja.
- Passa no teste inteiro: valor sozinha desde o dia 1 (mesmo sem comprar pelo
  app, a pessoa consulta), captura a intenção no momento mais quente possível.
- **Força a construção dos dois ativos que o marketplace precisa:** o catálogo
  mestre por EAN (§8) e o relacionamento com as lojas do bairro (coletar e
  atualizar preços casa com a fase concierge, em que as lojas já estão sendo
  visitadas).
- Ímã de aquisição orgânica: "ração golden 15kg preço" é busca de Google com
  volume alto e resposta ruim hoje.

### Como as joias 1 e 2 se encaixam

- Joia 1 responde **quando comprar**; Joia 2 responde **onde e por quanto**.
- O marketplace, quando chegar, é só o botão que fecha o ciclo: "compre agora".
- O app nunca muda de identidade: nasce como "o app que cuida das compras do
  seu pet" e a compra dentro dele é evolução natural, não pivô.
- Posicionamento em uma frase: **"saiba quando a ração acaba e onde comprar
  mais barato no seu bairro"**.

## 19. Joia 3 (em observação) — Alerta de bairro / pet perdido

- Cartaz de pet perdido é o conteúdo mais compartilhado de grupo de WhatsApp de
  bairro. Um alerta hiperlocal ("pet perdido a 800m de você") é emocional,
  viral e reforça exatamente a densidade geográfica que a estratégia precisa.
- Ressalvas que a tiram do MVP: não captura intenção de compra, e é o tipo de
  feature que parece barata e vira um produto inteiro (moderação, falsos
  alertas, notificações).
- Guardar como **growth hook** para quando houver base instalada num bairro.

**Recomendação prática: lançar com as Joias 1 e 2 apenas.** Duas features, uma
frase de posicionamento, ambas trabalhando de graça para o marketplace que vem
depois.

---

# Parte 4 — Decisão de ponto de partida

> **Atualização 2026-09-02: decisão CONFIRMADA e alinhada entre os sócios.**
> O marketplace é o produto inicial; a Parte 2 permanece como registro
> histórico da discussão. O item A1 da fila estratégica (§32) está resolvido.

> **Decisão (estágio embrionário, sujeita a mudança):** atacar o marketplace
> logo de cara. Para mitigar o cold start: escolher um bairro (talvez de uma
> cidade pequena), convencer lojistas a usarem o app primeiro; com oferta
> montada, divulgar o app na região (tráfego pago, microinfluencers) para
> atrair clientes. Joias 1 e 2 fazem parte do MVP; Joia 3 sob análise.
> A sequência oferta → demanda é a ordem certa para marketplace hiperlocal.
> O concierge puro (item 7) foi substituído por esta decisão, mas dois
> resquícios dele continuam vivos: o smoke test e o concierge paralelo (§20).

## 20. Validação de demanda durante o desenvolvimento

A decisão "app primeiro" move o risco de lugar: a demanda só será comprovada
depois de meses de desenvolvimento. Duas mitigações baratas:

- **Smoke test durante o desenvolvimento:** landing page "chegando ao bairro X"
  + R$ 500-1.000 de tráfego pago geolocalizado + lista de espera. Mede custo de
  aquisição e apetite real *antes* do app existir, e constrói a base para o dia
  do lançamento. Se ninguém se inscrever, a descoberta custou R$ 1.000, não 6
  meses de código.
- **Concierge paralelo:** enquanto um sócio desenvolve, o outro já está na rua
  fechando lojistas — e esses lojistas podem começar a receber pedidos via
  WhatsApp intermediados pelos fundadores antes do app. Cada pedido manual é
  validação de demanda e treino da operação.

## 21. O vale entre oferta e demanda (risco operacional nº 1)

A sequência "fecha lojistas → depois divulga" tem uma armadilha de timing: o
lojista entra, passa 3-6 semanas sem receber pedido, e quando a demanda chega
ele já desengajou (não responde, não atualiza preço, esqueceu o app).
**Lojista assinado ≠ lojista ativo.** Mitigações:

- **Coorte pequena e quente:** 5-10 lojas com relacionamento pessoal, não 30
  com contrato frio.
- **Expectativa explícita:** "piloto de 90 dias, fase 1 é montarmos seu
  catálogo, pedidos começam em tal data".
- **Comprimir o vale:** só onboardar lojista quando a campanha de demanda
  estiver pronta para disparar semanas depois, não meses.
- **Garantir volume inicial na marra:** campanha amigos/família, os próprios
  fundadores comprando, cupom agressivo de primeiro pedido. O primeiro "sino
  tocando" no balcão vale mais que qualquer slide para reter o lojista.

## 22. A escolha do bairro/cidade é a decisão estratégica nº 1

Critérios:

- **Densidade de petshops:** 5-15 num raio entregável.
- **Cultura de delivery já instalada:** o iFood opera bem lá? Se opera, o
  hábito existe; se não, será preciso criar o hábito além do app — muito mais
  caro.
- **Renda média** que sustente ticket de R$ 80-120.
- **Proximidade física dos fundadores** (o critério mais subestimado): operação
  hiperlocal exige presença — visitar loja, resolver pepino de entrega,
  conhecer o dono pelo nome. O bairro certo provavelmente é onde um dos sócios
  mora ou tem rede de contatos.

Detalhe operacional de cidade pequena: **Lalamove/Uber Direct não operam lá** —
o fallback de entrega do item 10 desaparece; o motoboy do lojista (ou um
motoboy fixo parceiro) vira obrigatório, não opcional.

Trade-off honesto: cidade pequena tem menos concorrência e boca-a-boca
fortíssimo, mas valida menos ("funcionou em cidade de 40 mil hab." convence
menos do que "funcionou num bairro de Campinas"). Cidade média (100-300 mil
hab.) pode ser o meio-termo ideal: sem Petz/Cobasi, com iFood, com massa
crítica.

## 23. O lojista é o canal de aquisição mais barato

- QR code no balcão + lojista divulgando o app para a própria carteira de
  WhatsApp.
- Para neutralizar o medo de "entregar meus clientes ao concorrente": pedido
  vindo de cliente *dele* (link/código da loja) = comissão zero ou mínima.
- Ele ganha um e-commerce de graça, a plataforma ganha demanda sem CAC, e o
  conflito de canal vira aliança.

## 24. Cuidado com medicamentos no catálogo

- Antipulgas/vermífugo vendem livre, mas vários medicamentos veterinários
  **exigem receita** e há regulação envolvida.
- Definir desde o dia 1 o que entra no catálogo e como tratar itens com
  prescrição (excluir do MVP é o caminho mais simples).

---

# Parte 5 — Economia por pedido e modelo de receita

> Análise de 2026-09-02. A conta por pedido do §4 foi fechada com benchmarks
> reais e um simulador interativo (artifact "Conta por Pedido":
> https://claude.ai/code/artifact/629cf769-e6af-4ad0-9900-9d7a604d99cf).
> **Decisão de monetização ainda pendente** — recomendação registrada no §29.

## 25. Benchmarks levantados

- **iFood:** comissão de 12% (lojista entrega) ou 23% (iFood entrega), + 3,2%
  de pagamento on-line, + mensalidade de R$ 110-150 quando o faturamento passa
  de R$ 1.800/mês. Fontes: [Brendi](https://brendi.com.br/blog/taxas-ifood-2026/),
  [SisFood](https://www.sisfood.com.br/saiba-mais/gestao-financeira/quanto-custa-vender-ifood).
- **Margem de petshop varia muito por categoria** (corrige a premissa "10-20%"
  do §4, que só vale para ração popular): popular/standard 15-20%, premium
  25-35%, super premium 35-45%, medicamentosa 45-55%, granel 40-55%. Fontes:
  [Hashiko](https://www.hashiko.com.br/blog/quanto-colocar-margem-racao-pet-shop-2026),
  [SimplesVet](https://simples.vet/blog/financeiro/margem-de-lucro-de-um-pet-shop-como-calcular/).
- **Petlove (pesquisa pendente resolvida):** monetiza demanda com clube de
  assinatura — R$ 9,99-17,99/mês, descontos fixos de 15-25% por categoria,
  frete grátis sem mínimo, teleorientação veterinária. Fonte:
  [Petlove](https://www.petlove.com.br/clube-de-descontos).
- **Entrega:** R$ 6-15 por corrida via terceiros; motoboy fixo R$ 40-80/diária
  (precisa de 8-10 entregas/dia para custar menos que por corrida). Fontes:
  [Saipos](https://saipos.com/sistema/marmitaria/quanto-custa-contratar-um-motoboy-para-delivery-de-marmita),
  [Controle na Mão](https://controlenamao.com.br/blog/quanto-custa-um-motoboy-terceirizado-para-delivery/).

## 26. A conta fechada — três cenários

Premissas comuns: taxa de serviço R$ 2, taxa de entrega R$ 8 (cliente paga),
custo real de entrega R$ 9, pagamento on-line 3,2%.

| Cenário | Ticket | Margem lojista | Take rate | Comissão consome da margem | Contribuição PetDots/pedido |
|---|---|---|---|---|---|
| Ração pura | R$ 150 | 18% (R$ 27) | 6% | 33% (limite) | ~R$ 5 |
| Cesta mista | R$ 120 | 28% (R$ 34) | 12% | 43% (**insustentável**) | ~R$ 11 |
| Antipulgas & saúde | R$ 130 | 38% (R$ 49) | 15% | 39% (apertado) | ~R$ 16 |

Conclusões estruturais:

- **Take rate único está morto.** 12% (piso do iFood) consome 43% da margem de
  uma cesta mista e 67% da margem de ração popular. **Take rate por categoria**
  é obrigatório — e é barato, porque o catálogo mestre por EAN (§8) já carrega
  categoria por produto.
- **Regra de bolso adotada: a comissão não deve consumir mais de ⅓ da margem
  do lojista.** Acima disso ele sai da plataforma ou desvia o pedido para o
  WhatsApp. Na prática: ração 5-8%, categorias de margem média 10-12%, saúde e
  acessórios 12-15%.
- **Ração é isca, saúde é lucro.** A Joia 1 (reposição inteligente) já empurra
  exatamente as categorias de margem alta (antipulgas, vermífugo) — a estratégia
  de produto e a de monetização se reforçam.
- **A Fase 1 não paga a conta — e não precisa.** Com contribuição de R$ 5-16
  por pedido, cobrir um custo fixo de R$ 8 mil/mês exige ~500-1.600 pedidos/mês
  (~2-5 por dia por loja em 10 lojas). A meta da fase 1 é **contribuição
  positiva por pedido**, não lucro operacional.

## 27. Quem paga o quê (modelo proposto)

- **Cliente:** produtos + taxa de entrega (R$ 6-10, repassada a quem entrega) +
  taxa de serviço pequena (R$ 1,99-2,99). Sobrepreço total vs. WhatsApp da
  loja: ~R$ 10 (6-8% do ticket) — é o preço da conveniência, dentro do padrão
  iFood.
- **Lojista:** take rate por categoria (regra do ⅓); comissão zero em pedido de
  cliente próprio (§23) mantida; **sem mensalidade durante o piloto** (atrito
  zero para entrar; mensalidade tipo SaaS só na fase 2, quando o painel tiver
  valor comprovado).
- **PetDots:** comissão + taxa de serviço + eventual margem de entrega −
  custo de pagamento. Não subsidiar entrega estruturalmente (subsídio só como
  cupom de aquisição, com prazo e teto).

## 28. Pagamento: **decidido — PSP com split, Pix-first** (2026-09-02)

Decisão registrada no [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md).
O dinheiro passa pela plataforma; o PSP divide na liquidação (comissão retida
por construção). Pix como meio principal no lançamento — custo ~1,2-1,5% (taxa
fixa de R$ 0,99-1,99 no Asaas), liquidação instantânea, sem chargeback; cartão
de crédito entra depois do lançamento. O híbrido "Pix direto + fatura semanal"
foi descartado: economizava ~R$ 2/pedido ao preço de virar cobrador do próprio
parceiro. Due diligence de PSP: começar pelo Asaas; Mercado Pago como
alternativa.

## 29. Monetização do piloto: **decidido, com ressalva de campo** (2026-09-02)

Decisão registrada no [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md):
**take rate por categoria (regra do ⅓) + taxa de serviço do cliente (R$ 1,99) +
taxa de entrega repassada + comissão zero para cliente próprio do lojista + sem
mensalidade**. Gates de validação do piloto: contribuição por pedido ≥ R$ 5 no
mix real observado, e margem do lojista pós-comissão ≥ ⅔ da margem original.

**Ressalva do fundador (parte da decisão):** o tamanho da cobrança ao lojista
pode ser barreira de entrada — as faixas de take rate são hipóteses a calibrar
a campo, não tabela congelada. Ver §30.

## 30. Testando a barreira de entrada do lojista a campo

O medo (§29) é legítimo e só se resolve na porta da loja. Como transformá-lo em
teste barato durante o concierge paralelo (§20):

- **Descobrir a margem real antes de falar de comissão.** As faixas do §26 vêm
  de benchmark; a tabela final vem do lojista. Perguntas de descoberta no
  primeiro papo (antes do pitch): "quanto sobra numa Golden 15kg?", "qual
  produto te dá mais margem?", "quanto você paga de taxa na maquininha?" — a
  âncora da maquininha (2-5%) é ouro: se ele já aceita isso para receber
  cartão, a comissão vira comparável, não inédita.
- **Apresentar a comissão em reais, não em percentual.** "Nessa ração eu fico
  com R$ 8 e te trago um cliente novo" assusta menos que "6% de take rate".
  Percentual soa imposto; valor em reais soa comissão de vendedor.
- **Tarifa de fundador:** os 5-10 primeiros lojistas (a coorte quente do §21)
  entram com take rate reduzido travado por 12 meses. Custa pouco (o volume
  inicial é baixo de qualquer jeito), destrava a adesão e cria os cases que
  vendem para os próximos.
- **Medir a objeção, não a opinião.** Lojista dizendo "tá caro" não é dado;
  lojista recusando o piloto gratuito e sem mensalidade por causa da comissão
  futura é. Registrar cada conversa: margem declarada, reação à tabela, objeção
  principal, aceite/recusa. Com 10-15 conversas o padrão aparece.
- **Critério de recuo já definido:** se a maioria recusar pela comissão, o
  modelo cai primeiro para "tarifa de fundador para todos do piloto"; o modelo
  precisa sobreviver a takes menores (consequência aceita no ADR-0003).

---

## Pesquisas pendentes

- [x] **Zee.Now em profundidade:** respondido no §1 — modelo 1P verticalizado
      (estoque próprio, dark stores, frota própria, frete grátis), comprada pela
      Petz junto com a Zee.Dog por R$ 715M (ago/2021), integração declarada
      "frustrada" pelo presidente da Petz.
- [x] **Petlove hoje:** respondido no §25 — clube de assinatura R$ 9,99-17,99/mês
      com 15-25% de desconto e frete grátis. Falta detalhar Petz (cobertura por
      cidade, mecânica de frete) se virar relevante.

# Parte 6 — A fila estratégica

> Análise de 2026-09-02, substituindo a lista anterior de "próximos
> aprofundamentos" (que sequenciava tarefas de construção — PSP, catálogo —
> antes das de validação e de empresa; mentalidade de projeto de engenharia,
> não de startup). O princípio da fila nova: **atacar os riscos que matam a
> startup, em ordem de probabilidade, pelo caminho mais barato** — e as
> tarefas de código só depois dos sinais de validação.

## 31. Diagnóstico — o que mata a PetDots hoje, em ordem

1. ~~**Desalinhamento entre sócios não resolvido.**~~ **Resolvido em
   2026-09-02:** os sócios estão alinhados — marketplace é o produto inicial
   (ver atualização na Parte 4). Permanece o resíduo documental: PRODUCT_ROADMAP
   e MVP_SCOPE (jun/2026, canônicos) ainda descrevem a Fase 1 como "Vida do
   Pet" — tratado no item A3 da fila (avisos de defasagem aplicados em
   2026-09-02; re-sincronização completa pendente).
2. **Demanda nunca testada.** O smoke test (§20) foi desenhado, custa R$ 1.000,
   e nunca entrou na fila de execução.
3. **Oferta nunca testada.** Zero conversas com lojistas; a barreira da
   comissão (§29-30) é medo teórico até a décima conversa.
4. **Capital não dimensionado.** Sem orçamento até o lançamento + 6-12 meses de
   operação, não há como saber se o plano é viável com o bolso atual.
5. **Riscos técnicos (catálogo EAN, PSP, app).** Reais, porém subordinados:
   só merecem investimento depois dos sinais de 2 e 3.

O padrão do repositório confirma: ~45 documentos excelentes, zero contato com
o mercado. A documentação está anos-luz à frente da validação — a fila nova
inverte isso.

## 32. A fila nova (trilhas paralelas — são dois fundadores)

**Trilha A — Alinhamento e decisões (semanas 1-2):**

1. ~~**Conversa de alinhamento com o sócio**~~ — **feito (2026-09-02):**
   sócios alinhados, marketplace é o produto inicial (Parte 4). Pendências que
   eram da mesma conversa e seguem abertas: papéis (rua vs. código), dedicação
   e acordo societário em princípio — absorvidas pela Trilha C (item 8).
2. ~~**Escolha da cidade/bairro** (§22)~~ — **feito (2026-09-03):** eixo Grande
   Méier (§33).
3. **Sincronizar a fonte da verdade** (após 1): atualizar PRODUCT_ROADMAP,
   MVP_SCOPE e BUSINESS_MODEL para refletirem Parte 4 + ADR-0003, eliminando a
   contradição do §31.1.

**Trilha B — Validação de mercado (semanas 2-8, depende de A1-A2):**

4. **Roteiro de descoberta do lojista** (§30) e **10-15 conversas** no bairro
   escolhido — margens reais, reação à comissão, apetite pelo piloto.
5. **Smoke test de demanda** (§20): landing + R$ 500-1.000 de tráfego
   geolocalizado + lista de espera.
6. **Go/no-go com critérios definidos ANTES dos testes** (ex.: ≥ 5 lojistas
   aceitando o piloto; custo por lead na lista de espera abaixo do teto
   definido). Sem critério prévio, todo resultado "parece bom o suficiente".

**Trilha C — Fundação do negócio (paralela, sem urgência até o go):**

7. **Dimensionamento de capital**: orçamento até o lançamento + 6-12 meses;
   bootstrap vs. investimento.
8. **Estrutura jurídica mínima**: CNPJ e acordo de sócios com vesting —
   pré-requisito do split de pagamento (subconta exige CNPJ) e a apólice de
   seguro da relação societária.

**Trilha D — Construção (só depois do go/no-go do item 6):**

9. Due diligence do PSP (Asaas vs. Mercado Pago).
10. Desenho do catálogo mestre por EAN (informado pelas conversas do item 4).
11. Desenvolvimento do MVP.

O que mudou vs. a fila antiga: bairro mantém o topo; PSP e catálogo desceram
para depois da validação; entraram alinhamento societário, smoke test (o
esquecimento mais grave da fila antiga), go/no-go explícito, capital e
jurídico.

## 33. Território do piloto: **eixo Grande Méier** (decidido 2026-09-03)

**Decisão:** o piloto roda no eixo **Méier – Todos os Santos – Cachambi –
Engenho de Dentro – Engenho Novo** (Zona Norte do Rio), raio de ~3 km.

**Por quê:** o fundador de rua mora dentro do eixo. Campo Grande (onde ele
trabalha) foi avaliado e descartado como piloto — dá presença apenas em
horário de expediente, enquanto o pico da operação de delivery é noite e fim
de semana, e tornaria o piloto dependente do endereço do empregador. Fica como
território de expansão futura (mercado real: bairro mais populoso do Rio,
~330 mil hab.). Barra e Zona Sul descartadas por saturação
(Petz/Cobasi/Petlove).

**Concorrência mapeada:** uma megaloja Cobasi no NorteShopping/Cachambi (600m²)
— longe da saturação da Zona Sul. Petz e Cobasi são hoje a mesma empresa
(fusão), o que pressiona os petshops independentes e tende a torná-los mais
receptivos ao pitch da plataforma.

**Restrição estrutural revelada pela geografia dos fundadores:** o sócio mora em
**Aracaju (SE)**. Logo, **há um único fundador de rua** — todo trabalho
hiperlocal (visitar lojista, resolver pepino, coletar preço) passa por uma
pessoa, com emprego CLT, em noites e sábados. Duas consequências que o plano
precisa absorver:

- **Capacidade de campo é o gargalo do plano.** Dimensionar coorte, ritmo de
  onboarding e operação pela capacidade real de uma pessoa em tempo parcial —
  não pela ambição do mercado. Reforça a coorte pequena (5-10 lojas) do §21.
- **Assimetria de contexto com o sócio remoto.** Quem constrói o produto nunca
  pisou no bairro. Mitigações obrigatórias: notas/áudios de todas as conversas
  de descoberta compartilhados, participação por vídeo, e ao menos uma semana
  presencial no Rio antes do lançamento.

## 34. Mapa de entrega do piloto (pré-requisito do smoke test)

O "raio de 3 km" é aproximação de planejamento, não a área de operação. A área
real é um **polígono** desenhado com quem entrega, e ele define três coisas:
onde o app aceita pedido, quanto custa a entrega por faixa, e onde a campanha
de demanda é veiculada. Detalhamento operacional no documento da Trilha B.

Por que polígono e não círculo, no Grande Méier especificamente: a linha férrea
e as grandes avenidas (Dom Hélder Câmara, Amaro Cavalcanti, Linha Amarela)
cortam a região — distância em linha reta não é tempo de moto; e há áreas de
acesso restrito que os entregadores locais conhecem e o mapa não mostra.
Prometer entrega onde não se cumpre gera pedido cancelado, que queima cliente
e lojista de uma vez.
