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

## Pesquisas pendentes

- [x] **Zee.Now em profundidade:** respondido no §1 — modelo 1P verticalizado
      (estoque próprio, dark stores, frota própria, frete grátis), comprada pela
      Petz junto com a Zee.Dog por R$ 715M (ago/2021), integração declarada
      "frustrada" pelo presidente da Petz.
- [ ] **Petlove/Petz hoje:** como estruturam frete e assinatura (preços, prazos,
      cobertura por cidade, mecânica do clube/assinatura).

## Próximos aprofundamentos sugeridos

- Modelagem da economia por pedido (planilha com cenários de ticket, take rate,
  custo de entrega).
- Desenho do catálogo mestre (fontes de dados EAN, curadoria, modelo de dados).
