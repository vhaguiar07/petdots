---
title: "ADR-0022: A identidade visual é a escala Biscoito"
status: stable
version: "1.0"
updated: 2026-09-14
scope: >
  Fecha a identidade visual do PetDots: a cor da marca é a escala Biscoito (a
  cor do grão de ração), a tipografia é Gabarito, o logo leva três pontos sob o
  "o" de Dots, e a fileira de pontos vira o medidor. Registra as seis rodadas de
  exploração, por que o amarelo Gema perdeu na final, e as regras de contraste
  que a escolha obriga. É decisão de marca, tomada pelo Victor; não implementa
  nada — a aplicação nos frontends é tarefa própria.
relates_to:
  - 00-foundation/BRAND_IDENTITY.md
  - 00-foundation/PRODUCT_VISION.md
  - 01-product/PERSONAS.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md
type: decision
---

# ADR-0022: A identidade visual é a escala Biscoito

## Contexto

O PetDots chegou à `pd-19` com sete capacidades do MVP entregues, um fluxo
completo dos dois lados e **nenhuma identidade visual**. O que existia era o
vocabulário de UI nascido no spike-gate
([ADR-0008](0008-cliente-universal-expo-react-native-web.md)): oito componentes
acessíveis e um arquivo de tema com cores escolhidas **por contraste, não por
marca**. A landing, nascida depois, tinha ganhado uma paleta própria de papel e
verde — ou seja, **dois frontends com duas marcas diferentes**, por acidente.

O pedido do Victor, em 13/09/2026:

> "Não dá para levar a campo o app do jeito que está, para mim ele não difere
> muito de um HTML puro."

Não havia documento de marca, logo, paleta oficial nem tipografia. A palavra
"PetDots" aparecia em texto puro.

### O que se decidiu antes de olhar cor

Marca não começa em logo. A primeira rodada fixou **o significado do nome**: o
projeto tinha "Dots" como sonoridade, sem sentido definido, e o Victor
explicitou não ter vaidade nisso. A análise propôs **ligar os pontos**, que
serve aos dois níveis do `PRODUCT_VISION` sem forçar nenhum: hoje o PetDots liga
os pontos do bairro, amanhã os pontos da vida do pet. E "ponto" já é palavra de
bairro em português — o ponto comercial, o ponto de encontro.

A rodada 2 corrigiu o tom depois de o Victor reprovar as três primeiras
propostas por serem **adultas demais**: a personalidade passou a **direto,
divertido, do bairro**.

## Decisão

### D1 — A cor é a escala Biscoito, a cor do grão de ração

| Tom | Hex | Papel |
|---|---|---|
| Creme | `#FBEBD3` | Fundo de campo |
| **Biscoito** | `#E0A045` | **A marca** |
| Chocolate | `#6B3E14` | O texto de cor |
| Preto quente | `#1A1410` | Estrutura e contorno |
| Branco | `#FFFFFF` | As telas de uso |

**Por quê:** é a única cor testada que **é literalmente a cor do produto que o
app vigia**. Com ela, o medidor (D4) deixa de ser um gráfico abstrato e vira
ração na tela. E ela resolve dois problemas práticos que as alternativas não
resolviam: dá o **melhor texto de cor** de todas as opções (chocolate, 9,03
sobre branco) e **não briga com a prateleira** — saco de ração amarelo, vermelho
e azul é comum; caramelo se apoia neles em vez de disputar.

### D2 — A tipografia é Gabarito, em três pesos

900 para título, 500 para texto, 800 em caixa alta para rótulo. Uma família só:
a personalidade vem do peso e da cor, não de uma segunda voz tipográfica.
Redonda sem ser infantil.

### D3 — O logo leva três pontos sob o "o" de Dots

**PetD⬤ts**, com o "o" como disco Biscoito de contorno preto e **três pontos
alinhados abaixo dele**. Os três são **o pet, o tutor e a loja** — e leem-se
também como o "…" do WhatsApp, alguém digitando.

A forma foi **pedida pelo Victor** na rodada 3, e é o que transformou um
exercício de cor em logo: o ícone de app passa a ser só o `D` com o "o" e os
pontos.

### D4 — A fileira de pontos é o medidor, e é elemento próprio

O que os três pontos viram quando crescem: dias de ração (redondo), passos do
pedido (quadrado, porque não é ração, é etapa) e carregando (três pontos, o logo
em movimento). É o que permite dizer "12 dias de ração" **sem gráfico e sem
número grande**.

### D5 — Quatro regras que não se quebram

1. 🔴 **Biscoito nunca é texto** — falha o contraste sobre branco (2,26). Quem
   precisa de cor em texto usa Chocolate.
2. **O preto é `#1A1410`, não `#000`** — preto puro ao lado desta família fica
   azulado.
3. **A cor vive na marca e no topo; as telas de uso são brancas** — é o que
   impede o caramelo de cansar e o painel do lojista de parecer brinquedo.
4. **Cor de estado não sai desta escala** — sucesso, aviso e erro têm paleta
   própria. Biscoito não é aviso; chocolate não é erro.

### D6 — Uma marca só, dois volumes

O painel do lojista usa a **mesma** paleta e a **mesma** voz, com menos
expressividade e mais tabela. Não existe sub-marca para o lado da loja. É o que
a capacidade 11 do `MVP_SCOPE` já pressupunha ao pôr o painel "no mesmo app".

## Alternativas consideradas

Seis rodadas, dezoito propostas. As que chegaram perto:

- **🥇 Gema, o amarelo `#F5C518`** — finalista, e a favorita do Victor até a
  última rodada. Chama mais de longe (amarelo é a cor mais visível em luz de
  dia) e ninguém no mercado pet é amarelo. **Perdeu por três medições:** não é a
  cor do produto; seu texto escuro (mel, `#8A6508`) dá 5,32 contra os 9,03 do
  chocolate; e **briga com a prateleira**, porque embalagem de ração amarela é
  comum.
- **Mescla de Gema e Biscoito** — recomendada pela análise na rodada 6, e
  **preterida pelo Victor**. Era a única com hierarquia de cor: biscoito como
  corpo, gema reservada ao que precisa brilhar (menor preço, hoje, prazo
  correndo). Custava uma regra a mais — 🔴 **gema e biscoito têm 1,39 de
  contraste entre si e não se separam sem contorno preto** —, duas cores no
  adesivo de vitrine e uma decisão a mais por tela. **Fica registrada como a
  evolução natural** se um dia faltar hierarquia: a gema já tem papel definido.
- **Bolinha, o verde-limão de bola de tênis** — o objeto mais reconhecível do
  mundo do cachorro, e livre no mercado pet. Preterida por ser **cachorro-primeiro**
  (gato não busca bolinha) e por cansar em área grande.
- **Açaí, o roxo `#5B2A86`** — a mais carioca e a mais ousada; permitia que a
  cor da marca fosse texto, simplificando o sistema. Preterida por ser a aposta
  de maior risco e por o tom claro dela encostar no lilás da Petlove.
- **Petróleo, turquesa escuro** — a mais confiável e a menos divertida. Cor de
  fintech e de plano de saúde.
- **Laser (noite e vermelho), Melancia, Campo, Água, Tinta (preto e branco com
  pontos vermelhos), Calçada, Quintal, Compasso** — descartadas nas rodadas 1 a
  5, cada uma com o motivo anotado nas pranchas de estudo.
- **Recuperar o CSS do protótipo legado** (Tailwind 4, banners, carrossel) —
  descartada por duas razões independentes: o [ADR-0001](0001-refundacao-ecossistema-ai-first.md)
  arquivou o legado com regra de anti-contaminação, e aquilo era **Tailwind sobre
  DOM**, enquanto `apps/app` é React Native Web, que não renderiza DOM nem aceita
  classe CSS.

**Território cromático dos concorrentes, verificado em 13/09/2026:** Petz é
azul; Petlove é azul com rosa e lilás; Cobasi é laranja. O caramelo não colide
com nenhum dos três.

## Consequências

**Positivas**

- O projeto passa a ter uma fonte da verdade de marca
  ([`BRAND_IDENTITY`](../../00-foundation/BRAND_IDENTITY.md)): qualquer pessoa ou
  agente produz tela, texto ou peça sem inventar.
- **As duas marcas acidentais acabam.** Landing e app passam a beber da mesma
  escala.
- A marca carrega um elemento gráfico próprio, o medidor, derivado do logo e
  ligado à Joia 1 — coisa que nenhuma paleta sozinha daria.
- A cor **não briga com foto de produto**, que é o que o comparador e a vitrine
  da loja mostram o tempo todo.

**Negativas, aceitas**

- **Chama menos de longe que o amarelo.** Numa vitrine concorrida, a Gema
  ganharia. Aceito em troca da cor do produto e do texto melhor.
- **Marrom depende de execução precisa.** Um grau mais escuro e vira papelão. O
  tom está fixado em `#E0A045` e não se ajusta "no olho".
- **A marca ainda não existe em vetor.** Todas as provas foram feitas em HTML e
  CSS; o logo em SVG, o favicon e os ícones de loja são trabalho a fazer.
- **Nada está aplicado.** Os três frontends seguem com o vocabulário neutro do
  spike até a tarefa de aplicação acontecer.
- **A escolha não foi testada com embalagem real na mão** nem com a marca em
  corpo pequeno no celular. São os dois testes que nenhuma prancha faz.

## Status

`accepted` — 14/09/2026. Decisão do **Victor**, ao fim de seis rodadas, contra a
recomendação da análise na última (que propunha a mescla). Nenhuma linha de
código: a aplicação nos frontends é tarefa própria.
