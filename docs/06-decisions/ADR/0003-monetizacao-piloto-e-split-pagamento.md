---
title: "ADR-0003: Monetização do piloto e pagamento via split"
status: accepted
version: 1.0
updated: 2026-09-02
scope: >
  Define o modelo de monetização do piloto da fase 1 (marketplace de petshops
  de bairro) e a forma de pagamento. Decisão de negócio tomada pelo fundador
  em 2026-09-02, com base na modelagem da Parte 5 da IDEACAO_FASE1.
relates_to:
  - docs/00-foundation/IDEACAO_FASE1.md
  - docs/00-foundation/BUSINESS_MODEL.md
type: decision
---

# ADR-0003: Monetização do piloto e pagamento via split

## Contexto

A modelagem da economia por pedido (IDEACAO_FASE1 §25-§26) mostrou que a margem
do petshop varia demais por categoria (ração popular 15-20%; saúde/granel
40-55%) para um take rate único: 12% consome 43% da margem de uma cesta mista e
67% da margem de ração popular. Ao mesmo tempo, o lojista de bairro é sensível a
custo fixo e o concorrente invisível (WhatsApp da própria loja, §5) entrega sem
taxa nenhuma. No pagamento, o dilema era custo (Pix direto ~zero) versus
garantia de recebimento da comissão e visibilidade do GMV.

## Decisão

**Monetização do piloto:**

1. **Take rate por categoria, governado pela "regra do ⅓":** a comissão nunca
   consome mais de um terço da margem bruta do lojista na categoria. Faixas
   iniciais: ração popular 5-6%; premium 8-10%; higiene 8%; saúde (venda livre)
   e acessórios 12-15%.
2. **Taxa de serviço do cliente:** R$ 1,99 por pedido no piloto (teto R$ 2,99).
3. **Taxa de entrega repassada** integralmente a quem entrega; subsídio só como
   cupom de aquisição com verba e prazo definidos.
4. **Comissão zero em pedido de cliente próprio do lojista** (via link/QR da
   loja).
5. **Sem mensalidade durante o piloto.** Mensalidade SaaS só na fase 2, com
   valor comprovado pelo painel.

**Ressalva do fundador (parte integrante da decisão):** as faixas de take rate
são hipóteses, não tabela final. Há risco real de a cobrança ser barreira de
entrada para o lojista — isso só se descobre a campo. A calibração com lojistas
reais (margens verdadeiras deles, reação ao pitch) precede o congelamento da
tabela.

**Pagamento: PSP com split desde o dia 1.** O dinheiro passa pela plataforma e
o PSP divide na liquidação (comissão retida por construção, sem cobrança manual
ao lojista). Pix como meio principal no lançamento (~1,2-1,5% de custo,
liquidação instantânea, sem chargeback); cartão de crédito entra depois do
lançamento, com a operação rodando. Due diligence começa pelo Asaas (subcontas
via API, precificação pública), com Mercado Pago como alternativa.

## Alternativas consideradas

- **Take rate único (modelo iFood):** descartado — mata a economia do lojista
  nas categorias de margem baixa, que são justamente as que trazem o cliente.
- **Mensalidade SaaS no piloto:** descartada — cobra a entrada de um clube sem
  valor provado; atrito fatal no pitch de porta de loja.
- **Pix direto ao lojista + fatura semanal de comissão:** descartada — economiza
  ~R$ 2/pedido ao preço de transformar a plataforma em cobradora do próprio
  parceiro (inadimplência e atrito na relação mais frágil do negócio) e de
  perder visibilidade do GMV.
- **Pagamento na entrega:** mantido apenas como fallback operacional, não como
  modelo.

## Consequências

**Positivas:** comissão garantida por construção; pitch ao lojista defensável
("quase não cobro na ração; sem mensalidade; cliente seu = comissão zero");
Pix-first eleva a contribuição por pedido em ~R$ 2,50-3,00 versus a premissa de
3,2% de cartão; regulatório resolvido pelo PSP (KYC, licença).

**Negativas / custos aceitos:** integração de API de pagamento no MVP (não dá
para lançar sem); onboarding do lojista exige documentos e subconta; take rate
por categoria adiciona lógica de precificação ao catálogo (mitigado: o catálogo
mestre por EAN já carrega categoria); a tabela de take rate pode precisar cair
se o campo mostrar barreira de entrada — o modelo precisa sobreviver a takes
menores.

**Gates de validação do piloto:** contribuição ≥ R$ 5/pedido no mix real;
margem do lojista pós-comissão ≥ ⅔ da original; taxas ao cliente ≤ ~8% do
ticket.

## Status

`accepted`
