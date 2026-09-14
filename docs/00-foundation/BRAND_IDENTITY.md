---
title: Brand Identity
status: stable
version: "1.0"
updated: 2026-09-14
scope: >
  Fonte canônica da identidade da marca PetDots: a plataforma (essência,
  personalidade, tom de voz), a escala de cor Biscoito com o papel e o contraste
  medido de cada tom, a tipografia, o logo com os três pontos, o medidor como
  elemento gráfico próprio, as regras que não se quebram e as aplicações. É o
  "como a marca se parece e como ela fala". Não define os tokens de código
  (nascem com a aplicação), nem o conteúdo das telas (01-product), nem os
  padrões de código (03-engineering).
relates_to:
  - 00-foundation/PRODUCT_VISION.md
  - 00-foundation/PRODUCT_PRINCIPLES.md
  - 01-product/PERSONAS.md
  - 06-decisions/ADR/0022-identidade-visual-biscoito.md
type: foundation
---

# PetDots — Brand Identity

> **Decidida em 14/09/2026** pelo Victor, ao fim de seis rodadas de exploração
> visual ([ADR-0022](../06-decisions/ADR/0022-identidade-visual-biscoito.md)).
> Este documento é a fonte da verdade da marca. Mudança de cor, de fonte ou de
> logo exige ADR novo.
>
> ⚠️ **Nada disto está implementado.** Os três frontends seguem com o
> vocabulário neutro do spike. A aplicação é tarefa própria — ver §"O que falta".

---

## Objetivo

Definir **como o PetDots se parece e como ele fala**, de modo que qualquer
pessoa ou agente possa produzir uma tela, um texto ou uma peça impressa sem
inventar nada.

**Não cobre:** o que o produto é → [`PRODUCT_VISION`](PRODUCT_VISION.md); para
quem → [`PERSONAS`](../01-product/PERSONAS.md); os tokens em código, que nascem
com a aplicação; o conteúdo das telas → `01-product`.

---

## A plataforma da marca

| | |
|---|---|
| **Essência** | O vizinho que liga os pontos |
| **Personalidade** | Direto · divertido · do bairro |
| **O que o ponto significa** | Os três que a marca liga: **o pet, o tutor e a loja**. E o "…" de quem está resolvendo |
| **O limite** | **Divertido no jeito, sério no dinheiro** |

A essência tem dois níveis, os mesmos do `PRODUCT_VISION`: hoje o PetDots liga
os pontos **do bairro** — o tutor e a loja que estavam a três quadras um do
outro e não se encontravam; amanhã, os pontos **da vida do pet**.

### A tensão que a marca resolve

O tutor quer ser acolhido; o lojista quer ser respeitado. **Uma voz só, dois
volumes:** no painel do lojista a mesma marca fala mais baixo — menos
expressividade, mais tabela — e **não muda de identidade**.

---

## Tom de voz

| Regra | Dizemos | Nunca dizemos |
|---|---|---|
| Fala como gente, não como app | "A gente preenche a rua e o bairro para você." | "Preenchimento automático habilitado" |
| Nomeia o lugar | "no Méier", "no seu bairro" | "na sua região", "em sua localidade" |
| Dinheiro é explícito e em primeira pessoa | "Nada foi cobrado." / "O valor volta." | "Transação processada", "estorno solicitado" |
| Erro é nosso, e diz o que fazer | "Não conseguimos falar com o servidor. Tente de novo." | "Ops! Algo deu errado", código de erro na tela |
| Loja é parceira | "sua loja", "a loja" | "vendedor", "estabelecimento", "seller" |
| Sem fofura forçada | "seu pet", "a ração dele" | "seu amiguinho", "pet lover", diminutivo em série |
| Português de verdade | "carrinho", "entrar", "sair" | "cart", "login", "logout" |

🔴 **Onde a piada para:** valor, prazo e o que aconteceu com o dinheiro são
ditos sem graça nenhuma. A diversão é no jeito, **nunca no número**.

**A marca nunca é:** uma loja grande de shopping, uma fintech, uma rede social
de pet. Não infantiliza o tutor. Não trata o lojista como fornecedor.

---

## Cor — a escala Biscoito

A cor da marca é a **cor do grão de ração**. Não é metáfora: é a mesma família
cromática do produto que o app vigia, e é isso que faz o medidor (abaixo) deixar
de ser gráfico e virar ração na tela.

| Tom | Hex | Papel |
|---|---|---|
| **Creme** | `#FBEBD3` | Fundo de campo, superfície suave |
| **Biscoito** | `#E0A045` | **A cor da marca.** Banda, ícone, medidor, chips ativos |
| **Chocolate** | `#6B3E14` | **O texto de cor.** Nome da loja, link, destaque tipográfico |
| **Preto quente** | `#1A1410` | Estrutura: texto principal, contorno do logo, botões |
| **Branco** | `#FFFFFF` | Onde se trabalha: toda tela de uso |

### Contraste medido (WCAG 2)

| Par | Razão | Veredito |
|---|---|---|
| Preto quente sobre Biscoito | **8,06** | passa AA |
| Chocolate sobre branco | **9,03** | passa AA |
| Biscoito sobre Preto quente | **8,06** | passa AA |
| Texto de apoio (`#5C5348`) sobre Creme | **6,43** | passa AA |
| 🔴 **Biscoito sobre branco** | **2,26** | **falha** |

### As regras que não se quebram

1. 🔴 **Biscoito nunca é texto.** Falha o contraste sobre branco e sobre creme.
   Ele é **fundo, forma e contorno** — nunca letra. Quem precisar de cor em
   texto usa **Chocolate**.
2. **O preto não é `#000`.** É `#1A1410`, um preto com marrom dentro. Preto puro
   ao lado desta família fica azulado e estranho; este pertence a ela.
3. **A cor vive na marca e no topo; as telas de uso são brancas.** É o que
   impede o caramelo de cansar e o painel do lojista de parecer brinquedo.
4. **Cor de estado é outra coisa.** Sucesso, aviso e erro têm a própria paleta e
   **não** saem desta escala. Biscoito não é aviso; chocolate não é erro.

### Por que caramelo, e não amarelo

O amarelo (`#F5C518`, chamado "Gema" nas rodadas) chama mais de longe e foi
finalista. Perdeu por três motivos medidos: **não é a cor do produto**, o texto
escuro dele (mel, `#8A6508`, 5,32) é bem pior que o chocolate (9,03), e ele
**briga com a prateleira** — saco de ração amarelo é comum, e a marca competiria
com o próprio produto na foto. O caramelo se apoia na prateleira em vez de
disputar com ela. Detalhe completo no ADR-0022.

---

## Tipografia

**Gabarito** (Google Fonts), em três pesos:

| Papel | Peso | Tratamento |
|---|---|---|
| Título | 900 | `letter-spacing: -0.045em`, `line-height` 0.98–1.0 |
| Texto | 500 | `line-height` 1.5 |
| Rótulo | 800 | caixa alta, `letter-spacing: 0.12em` |

É redonda sem ser infantil: sorri sem fazer careta. Uma família só, porque o
sistema não precisa de uma segunda voz tipográfica — a personalidade está no
peso e na cor.

**Fallback obrigatório:** `'Gabarito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.

---

## O logo

**PetD⬤ts** — o nome inteiro, com o "o" de *Dots* substituído por um **disco
Biscoito com contorno preto**, e **três pontos alinhados logo abaixo dele**.

- Os **três pontos** são o pet, o tutor e a loja. Também se leem como o "…" do
  WhatsApp: alguém digitando, alguma coisa vindo.
- O **ícone de app** é só o `D` com o "o" e os três pontos — nunca o nome
  inteiro espremido.
- **Duas versões, e só duas:** positiva (fundo Biscoito, letra preta) e negativa
  (fundo preto, letra Biscoito).
- O contorno preto do disco **não é opcional**: é ele que separa o disco de
  qualquer fundo claro da família.

---

## O medidor

O elemento gráfico próprio do PetDots, e o que os três pontos do logo viram
quando crescem: **uma fileira de pontos**.

| Uso | Forma | Regra |
|---|---|---|
| **Dias de ração** (Joia 1) | Redondo | Um ponto por dia. Cheio = Biscoito; hoje = branco com contorno; futuro = vazio |
| **Passos do pedido** | **Quadrado** | Feito, aceito, despachado, entregue. Quadrado porque não é ração, é etapa |
| **Carregando** | Redondo, três | Volta a ser três pontos: é o logo em movimento |

O medidor é o que permite dizer "12 dias de ração" **sem gráfico e sem número
grande**, em qualquer largura de tela.

---

## Aplicações

**Ícone de app.** O `D` com o "o" e os três pontos, nas duas versões.

**Adesivo de vitrine com QR.** O único material físico do piloto, e o que
transforma o WhatsApp do lojista em canal: o pedido que entra por ele não paga
comissão ([ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md)).
Imprime em **uma cor**, o que o mantém barato. Texto sugerido, sujeito à
aprovação de copy: *"Peça aqui. Sem comissão."*

---

## O que falta

| Item | Onde vive |
|---|---|
| **Aplicar nos três frontends** — tokens compartilhados, `apps/app`, `apps/landing` | Tarefa `pd-NN` própria; ver `BACKLOG` |
| **Logo em vetor** (SVG), favicon e ícones de app nas resoluções de loja | Mesma tarefa |
| **Cores de estado** (sucesso, aviso, erro) calibradas contra a escala | Mesma tarefa |
| **Teste com embalagem real** de ração na mão, e a marca em corpo pequeno no celular | Só se resolve fora da tela; trabalho de campo |
| **Aprovação final da copy** das telas | Item 3 da intervenção manual do `BACKLOG` |

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define a plataforma da marca (essência, personalidade, tom de voz) com exemplos.
- [x] Fixa a escala de cor com o papel de cada tom e o contraste medido.
- [x] Registra as regras que não se quebram, e o porquê de cada uma.
- [x] Define tipografia, logo e o medidor como elemento próprio.
- [ ] Aplicado no código, com tokens compartilhados entre os frontends.
- [ ] Logo em vetor e ícones de loja produzidos.
- [ ] Cores de estado calibradas contra a escala.
