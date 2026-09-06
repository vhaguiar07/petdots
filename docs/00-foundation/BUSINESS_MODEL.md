---
title: PetDots — Business Model
status: stable
version: 2.0
updated: 2026-09-02
scope: >
  Descreve o modelo de negócio do PetDots: a cunha da fase 1 (marketplace
  hiperlocal de petshops de bairro), sua monetização decidida no ADR-0003,
  e a evolução planejada para o ecossistema completo.
relates_to:
  - 00-foundation/PRODUCT_VISION.md
  - 00-foundation/PRODUCT_PRINCIPLES.md
  - 00-foundation/IDEACAO_FASE1.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - README.md
type: foundation
---

# PetDots — Business Model

> **v2.0 (2026-09-02):** reescrito para refletir a estratégia alinhada entre os
> sócios: o marketplace hiperlocal é o produto inicial (IDEACAO_FASE1, Parte 4)
> e a monetização do piloto está decidida (ADR-0003). A v1.0 tratava o
> marketplace como capacidade de longo prazo; essa premissa foi substituída.

---

# Objetivo

Este documento descreve como o PetDots gera e captura valor: o modelo ativo da
fase 1, quem paga o quê, e como o modelo evolui rumo ao ecossistema completo
descrito na PRODUCT_VISION.

---

# Visão Geral

A visão de longo prazo permanece: **toda a vida do pet em um único lugar** — um
ecossistema que conecta tutores, petshops, veterinários, prestadores de serviço
e ONGs.

A estratégia para chegar lá mudou de forma deliberada: ecossistemas vencedores
nascem de **uma cunha que vence primeiro**. A cunha do PetDots é um
**marketplace hiperlocal de petshops de bairro** — um bairro por vez, com
entrega rápida e duas "joias" que geram uso recorrente:

1. **Reposição inteligente** — o app sabe quando a ração/areia/antipulgas do
   pet vai acabar e avisa (captura a intenção de compra no momento exato).
2. **Comparador de preços do bairro** — quanto custa a ração perto de você
   (captura a intenção no momento mais quente).

Posicionamento em uma frase: **"saiba quando a ração acaba e onde comprar mais
barato no seu bairro."**

---

# Participantes — Fase 1

## Tutores (demanda)

Valor recebido: nunca deixar faltar ração/areia/medicação do pet; comparar
preços do bairro sem rodar de loja em loja; comprar com entrega rápida da
petshop vizinha.

## Petshops de bairro (oferta)

Valor recebido: canal digital de vendas sem custo fixo (sem mensalidade no
piloto); clientes novos do bairro; e-commerce grátis para a própria carteira
(pedido de cliente próprio = comissão zero); catálogo montado pela plataforma
(marca "tenho" e põe preço); painel mínimo de pedidos e repasses.

## Entregadores

Motoboy do próprio lojista ou parceiro fixo do bairro, remunerado pela taxa de
entrega paga pelo cliente. A plataforma não mantém frota.

**Participantes das fases futuras** (clínicas, veterinários, banho e tosa,
hotéis, ONGs): entram quando a base de tutores e a densidade local
justificarem — na ordem definida pelo PRODUCT_ROADMAP, não antes.

---

# Fontes de Receita

## Fase 1 — Piloto (decidido, ADR-0003)

| Fonte | Mecânica |
|---|---|
| **Take rate por categoria** | Regra do ⅓: a comissão nunca consome mais de um terço da margem do lojista na categoria. Faixas iniciais: ração popular 5-6%; premium 8-10%; higiene 8%; saúde (venda livre) e acessórios 12-15%. Calibração a campo antes de congelar a tabela. |
| **Taxa de serviço do cliente** | R$ 1,99 por pedido no piloto (teto R$ 2,99). |
| **Taxa de entrega** | Paga pelo cliente, repassada a quem entrega (neutra para a plataforma no piloto). |
| **Comissão zero p/ cliente próprio** | Pedido vindo do link/QR do lojista não paga comissão — neutraliza o conflito de canal. |
| **Sem mensalidade** | Nenhum custo fixo para o lojista durante o piloto. |

Pagamento: **on-line via PSP com split** (Pix primeiro; cartão na sequência).
A comissão é retida na liquidação — não existe cobrança manual ao lojista.

Meta econômica da fase 1: **contribuição positiva por pedido** (≥ R$ 5 no mix
real; margem do lojista pós-comissão ≥ ⅔ da original) — não lucro operacional.

## Fase 2 — Consolidação local

* Mensalidade SaaS do painel do lojista (quando o valor estiver comprovado).
* Clube de assinatura do tutor (desconto + frete grátis, modelo Petlove).
* Cartão de crédito e antecipação de repasse como serviços.

## Longo prazo — Ecossistema

* Comissão sobre serviços (banho e tosa, vet, hotel).
* Retail media (destaque pago de lojas e marcas).
* Serviços financeiros para o lojista.
* APIs e serviços B2B.

---

# Estratégia de Crescimento

Densidade hiperlocal, nunca "para todos":

```text
Um bairro escolhido a dedo
        ↓
5-10 petshops com relacionamento pessoal (oferta primeiro)
        ↓
Demanda disparada com data marcada (tráfego local + lojista como canal + lista de espera)
        ↓
Joia 1 transforma compradores em recorrentes (agenda de reposição)
        ↓
Densidade → entrega mais barata → preços melhores → mais demanda
        ↓
Replicar no próximo bairro com o playbook validado
```

O lojista é o canal de aquisição mais barato (QR no balcão + WhatsApp da
carteira dele), viabilizado pela comissão zero em cliente próprio.

---

# Princípios do Modelo de Negócio

* **A cunha vence primeiro.** O marketplace hiperlocal é o produto inicial; o
  ecossistema é a consequência, não o ponto de partida.
* **A margem do lojista é o recurso escasso.** Regra do ⅓ sempre; monetização
  adicional vem do cliente (taxa de serviço, clube) e de serviços, não de
  espremer o parceiro.
* **Recorrência é desenhada, não esperada.** Lembrete e assinatura, não
  torcida.
* **Sem subsídio estrutural.** Cupom é custo de aquisição com verba e prazo;
  frete e comissão precisam parar em pé por pedido.
* **Conflito de canal vira aliança.** O WhatsApp do lojista é concorrente
  invisível; a comissão zero o transforma em canal.
* **Receita é consequência da transação recorrente** — a métrica-mãe da fase 1
  é pedido recorrente por tutor, não downloads nem audiência.

---

# Revisão Contínua

Este documento deve ser revisado a cada mudança de fase, recalibração da tabela
de take rate (pós-campo) ou introdução de nova fonte de receita. Decisões de
monetização são registradas em ADR (ver ADR-0003).
