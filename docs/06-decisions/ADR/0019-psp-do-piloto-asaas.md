---
title: "ADR-0019: O PSP do piloto é o Asaas"
status: stable
version: "1.0"
updated: 2026-09-13
scope: >
  Fecha a due diligence de PSP que o ADR-0003 deixou aberta: o piloto usa Asaas,
  com subconta por loja e split na liquidação. Registra o critério que decidiu
  (a autorização OAuth do Mercado Pago expira em seis meses e obrigaria cada
  lojista a reautorizar), a pré-condição que a escolha revelou (subconta exige
  CNPJ, que ainda não existe), e o que fica fora da avaliação. É decisão de
  fornecedor, tomada pelo Victor; não implementa nada — payments é a pd-17.
relates_to:
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - 06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md
  - 01-product/PERSONAS.md
  - 01-product/MVP_SCOPE.md
  - 03-engineering/SECURITY.md
  - 07-process/BACKLOG.md
type: decision
---

# ADR-0019: O PSP do piloto é o Asaas

## Contexto

O [ADR-0003](0003-monetizacao-piloto-e-split-pagamento.md) decidiu **PSP com
split desde o dia 1** e Pix como meio principal, mas deixou o fornecedor em
aberto: *"due diligence começa pelo Asaas (subcontas via API, precificação
pública), com Mercado Pago como alternativa"*. Era a única peça do desenho de
pagamento sem dono.

A pergunta ficou dormindo porque nada dependia dela. **Agora depende:** a
`pd-15` e a `pd-16` deixaram o ciclo do pedido completo dos dois lados e
**gratuito** — o tutor compra, a loja atende, e cada saída que não é entrega
grava um `Refund` de um pedido que nunca foi cobrado. A `pd-17` é o que fecha
isso, e ela não começa sem conta no PSP.

A due diligence foi feita em **13/09/2026**, por consulta à documentação pública
dos dois fornecedores.

### O que a avaliação encontrou antes de comparar preço

**Subconta exige CNPJ.** A documentação do Asaas é explícita: a criação de
subcontas é permitida **apenas para contas de pessoa jurídica**; conta de CPF
não cria subconta. Isso não é peculiaridade do fornecedor — é a forma do
produto, e a `IDEACAO_FASE1` §"Trilha C" já havia registrado *"CNPJ e acordo de
sócios — pré-requisito do split de pagamento (subconta exige CNPJ)"*.

⚠️ **O PetDots não tem CNPJ.** É o item **C-02** do backlog da estratégia,
`P0` e aberto. Esta decisão não o destrava; ela torna visível que **a `pd-17`
está atrás de uma pendência jurídica, não de engenharia**.

## Decisão

**O PSP do piloto é o Asaas**, com **subconta por loja** e split na liquidação.

### O critério que decidiu, e não foi o preço

| Eixo | Asaas | Mercado Pago (split 1:1) |
|---|---|---|
| Como a loja entra | O PetDots **cria a subconta pela API**; a loja envia documento de identificação e selfie | A loja precisa ter **conta própria** e **autorizar via OAuth** |
| Durabilidade do vínculo | Subconta permanente; o `walletId` é estável | 🔴 **O access token expira em seis meses** e o processo precisa ser repetido |
| Pix | até 0,99% | 0,99% |
| O que exige de nós | CNPJ + período de avaliação regulatória inicial, com limites | Uma aplicação integradora |

**O token de seis meses é o que decide.** A persona do lojista
([`PERSONAS`](../../01-product/PERSONAS.md)) quer *"continuar operando do jeito
que já opera — sem virar operador de software"*, e a necessidade declarada é
*"repasse claro e automático, sem ter que cobrar ninguém"*. Um arranjo em que,
a cada semestre, **cada loja** precisa reautorizar o marketplace, sob pena de
os pagamentos daquela loja pararem, é atrito recorrente exatamente no lado
frágil do marketplace. E a falha é silenciosa até alguém tentar pagar.

O Mercado Pago ganha em um ponto real: **o lojista provavelmente já tem conta**,
por causa da maquininha, o que removeria o maior atrito do onboarding. Não
compensa — o atrito do Asaas é **uma vez**, o do Mercado Pago é **para sempre**,
e quem administra a consequência é o único fundador de rua.

**O preço não separou os dois.** Pix a 0,99% nos dois, dentro da faixa de
1,2-1,5% que o ADR-0003 assumiu ao modelar a economia por pedido. ⚠️ **Taxa se
confirma na contratação**, não em página de marketing: a comparação acima serve
para escolher, não para fechar a planilha.

### O que esta decisão traz junto

| # | Decisão | Por quê |
|---|---|---|
| **E1** | **Subconta por loja, criada pela nossa API** no onboarding (J6) | É o que mantém a promessa do ADR-0003: comissão retida por construção, sem cobrança manual ao lojista |
| **E2** | **Assumimos o onboarding e o KYC da loja** — coletar documento e selfie, acompanhar aprovação | É a contrapartida de E1. O lojista não lida com o PSP; lida conosco. ⚠️ É **trabalho de campo do Victor**, não de software |
| **E3** | **O fornecedor fica atrás de uma porta**, no precedente do [ADR-0016](0016-diretorio-de-ceps-atras-da-nossa-api.md): `IPaymentGateway` no domínio de `payments`, com `AsaasPaymentGateway` como adapter | Trocar de PSP passa a ser trocar a classe registrada. O nome do fornecedor não vaza para o contrato nem para o cliente |
| **E4** | **O webhook é a única fonte de verdade do pagamento**, com assinatura verificada e idempotência por `psp_payment_id` | Já era regra do `SECURITY` e do ADR-0003; aqui só se nomeia quem a exerce |
| **E5** | **A escolha é reavaliável, e o gatilho é nomeado:** se o período de avaliação regulatória impuser limite incompatível com o piloto, ou se o onboarding de subconta reprovar lojas reais do eixo | Nenhum dos dois se descobre em documentação — só com CNPJ e loja de verdade |

### O que fica fora desta avaliação

**Pagar.me, Iugu, Efí e Celcoin não foram avaliados.** Os quatro fazem split no
Brasil, e nenhum foi olhado — deliberadamente. O ADR-0003 nomeou dois
candidatos, a comparação decidiu entre eles por um critério estrutural que não
depende de preço, e ampliar a lista adiaria a decisão **sem destravar nada**,
já que o gargalo real é o CNPJ. Se o gatilho de E5 disparar, a lista se amplia
aí.

## Alternativas consideradas

- **Mercado Pago, split 1:1** — preterida pelo token OAuth de seis meses. Fica
  registrada como a saída se o onboarding de subconta do Asaas se mostrar
  proibitivo para lojas do eixo, porque ela **inverte o problema**: o lojista
  faz o próprio KYC com quem ele já conhece.
- **Adiar a escolha até haver CNPJ** — descartada pelo Victor. A due diligence
  não depende do CNPJ, e fechá-la agora permite que o plano da `pd-17` seja
  escrito antes de a conta existir.
- **Ampliar a lista para cinco fornecedores** — descartada: mais informação,
  sem destravar o gargalo.
- **Pix direto ao lojista com fatura semanal de comissão** — já descartada pelo
  ADR-0003, e não se reabre: transforma a plataforma em cobradora do próprio
  parceiro.

## Consequências

**Positivas**

- A última peça em aberto do desenho de pagamento tem dono, e a `pd-17` pode ser
  **planejada** antes de a conta existir.
- O critério que decidiu está escrito. "Por que não Mercado Pago, se o lojista
  já tem?" é dúvida recorrente garantida, e a resposta não é preço.
- A porta de E3 mantém o custo de errar baixo: o fornecedor é uma classe.

**Negativas, aceitas**

- 🔴 **A `pd-17` está atrás de uma pendência jurídica.** CNPJ leva de duas a
  quatro semanas e custa de mil a dois mil reais (Trilha C), e o acordo de
  sócios anda junto. Some o período de avaliação regulatória do Asaas. **Quatro
  a oito semanas, nenhuma delas de engenharia.**
- **Assumimos o KYC das lojas** (E2). É trabalho manual do fundador de rua, na
  mesma pessoa que já faz censo, conversa e curadoria de catálogo.
- **A comparação vale para 13/09/2026.** Taxa e regra de subconta mudam, e a
  confirmação é na contratação.
- **Três fornecedores plausíveis não foram olhados**, por escolha.

## Status

`accepted` — 13/09/2026. Decisão do **Victor**, sobre recomendação e due
diligence da IA. Nenhuma linha de código: `payments` é a `pd-17`, e ela continua
travada pelo CNPJ.
