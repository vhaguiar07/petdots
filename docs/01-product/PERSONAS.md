---
title: PetDots — Personas
status: stable
version: "2.0"
updated: 2026-09-10
scope: >
  Descreve as personas do PetDots com a prioridade da estratégia vigente: o
  Tutor de pet de bairro e o Lojista de petshop de bairro como P1 (os dois lados
  do marketplace da fase 1), e as personas das fases seguintes com a fase de
  entrada. Responde "para quem construímos"; não define funcionalidades
  (FEATURE_CATALOG) nem jornadas (USER_JOURNEYS).
relates_to:
  - 00-foundation/PRODUCT_ROADMAP.md
  - 00-foundation/BUSINESS_MODEL.md
  - 00-foundation/IDEACAO_FASE1.md
  - 01-product/MVP_SCOPE.md
  - 01-product/USER_JOURNEYS.md
  - 05-ai/AI_CONTEXT.md
type: product
---

# PetDots — Personas

> **v2.0 (2026-09-10).** Reescrito na `pd-07`. A v1.1 tinha sete personas
> ordenadas P1 tutores → P2 saúde → P3 comércio → P4 impacto, com o Pet Shop em
> P3 e um aviso de defasagem no topo. A estratégia vigente inverte isso: o
> **Lojista de petshop de bairro é P1**, ao lado do Tutor — os dois lados do
> marketplace da fase 1. As personas de saúde e serviços permanecem, agora com a
> fase de entrada do [PRODUCT_ROADMAP](../00-foundation/PRODUCT_ROADMAP.md) v2.0.
>
> Duas mudanças de estrutura: **"Tutor com Múltiplos Pets" deixa de ser persona
> própria** (na fase 1 um pet pertence a um tutor; múltiplos pets é atributo do
> Tutor, não outro perfil), e **o Entregador não é persona** — é papel
> operacional, descrito dentro do Lojista, porque não há app nem login de
> entregador no MVP.

---

## Objetivo

Descreve os perfis de usuário para os quais o produto é construído.

Toda funcionalidade proposta deve beneficiar pelo menos uma persona descrita
aqui. Se não gerar valor claro para nenhuma, sua necessidade deve ser
reavaliada.

**Não cobre:** as fases → [`PRODUCT_ROADMAP`](../00-foundation/PRODUCT_ROADMAP.md);
as funcionalidades → [`FEATURE_CATALOG`](FEATURE_CATALOG.md); os fluxos →
[`USER_JOURNEYS`](USER_JOURNEYS.md).

---

## Visão geral

O PetDots é um marketplace de dois lados na fase 1. **As duas personas P1 são um
lado cada**, e o produto só funciona se as duas estiverem servidas ao mesmo
tempo — é o que diferencia este documento de uma lista de perfis por segmento.

| Prioridade | Persona | Lado | Fase de entrada |
|---|---|---|---|
| **P1** | Tutor de pet de bairro | Demanda | 1 |
| **P1** | Lojista de petshop de bairro | Oferta | 1 |
| P2 | Prestador de serviço de bairro | Oferta | 3 |
| P2 | Veterinário | Oferta | 3 |
| P3 | Clínica veterinária | Oferta (B2B profundo) | 3-4 |
| P4 | ONG | Institucional | 6 |

Laboratórios e seguradoras são expansões da fase 6, ainda fora das personas
descritas.

---

# Persona 1 — Tutor de pet de bairro (P1)

## Descrição

Pessoa responsável por um ou mais animais, moradora do território do piloto.
Compra produto recorrente para o pet — ração, areia, antipulgas, vermífugo — e
faz isso quase sempre na loja perto de casa ou pelo WhatsApp dela.

É a persona principal do PetDots, na fase 1 e em todas as seguintes.

## Objetivos

* Nunca deixar faltar o que o pet consome.
* Pagar menos por uma compra cara que se repete todo mês.
* Não carregar 15 kg de ração do balcão até casa.
* Resolver a compra em minutos, sem ligar para três lojas.

## Dores

* A ração acaba sem aviso — descobre quando já faltou.
* Não sabe se o preço que paga é bom: comparar exige ligar ou rodar de loja em
  loja.
* O WhatsApp da loja funciona, mas é lento: manda mensagem, espera resposta, não
  sabe se tem o produto nem quanto vai custar até alguém responder.
* Não sabe qual loja do bairro entrega no seu endereço, nem por quanto.

## Necessidades

* Previsibilidade.
* Preço transparente.
* Simplicidade — poucas telas, pouco esforço.
* Confiança de que o pedido chega.

## Funcionalidades mais importantes

* Calculadora de consumo e agenda de reposição (Joia 1).
* Lembrete no dia certo.
* Comparador de preços do bairro (Joia 2).
* Compra com entrega e acompanhamento do pedido.
* Recompra em poucos toques.

## Frequência de uso

**Compra:** mensal, por item recorrente. **Consulta:** semanal ou eventual
(comparador, status de pedido, agenda).

A frequência de compra baixa é a razão de existir a Joia 1: sem lembrete, o app
é esquecido entre duas compras.

## Evolução nas fases seguintes

Na fase 2 ganha a carteira do pet e o histórico, o que traz frequência de **uso**
além da de compra; na fase 3, agendamento de serviços do bairro.

---

# Persona 2 — Lojista de petshop de bairro (P1)

## Descrição

Dono ou operador de petshop independente no território do piloto. Loja de dono
presente, mil a cinco mil itens em prateleira, motoboy próprio ou parceiro fixo,
WhatsApp como principal canal digital.

É a persona da **oferta** — e, na fase 1, o lado frágio do marketplace: sem ele
ativo, não há produto para o tutor comprar.

## Objetivos

* Vender mais sem custo fixo.
* Alcançar clientes do bairro que hoje não sabem que a loja existe.
* Não perder a própria carteira de clientes para a plataforma nem para o
  concorrente.
* Continuar operando do jeito que já opera — sem virar operador de software.

## Dores

* Margem apertada, sobretudo em ração popular — não cabe taxa de marketplace
  tradicional.
* Baixa presença digital: quem mora perto compra em rede grande por hábito.
* O WhatsApp dá conta mas não escala: pedido se perde na conversa, preço é
  repetido a cada cliente, ninguém registra nada.
* Medo concreto de "entregar meus clientes ao concorrente" ao entrar numa
  plataforma.
* Desconfiança de plataforma: já ouviu falar de comissão alta e mensalidade.

## Necessidades

* Custo variável, nunca fixo — nada de mensalidade no piloto.
* Comissão que caiba na margem da categoria (regra do ⅓).
* Painel simples, "régua de WhatsApp, não de ERP".
* Repasse claro e automático, sem ter que cobrar ninguém.
* Manter o cliente próprio como cliente próprio — daí a comissão zero via
  link/QR da loja.

## Funcionalidades mais importantes

* Marcar "tenho" e informar preço sobre o catálogo mestre (sem cadastrar
  produto).
* Receber, aceitar ou recusar pedido.
* Marcar item indisponível e oferecer substituição.
* Despachar e acompanhar a entrega.
* Ver repasses por pedido.
* QR e link de indicação do balcão.
* Áreas de entrega e taxas que ele mesmo define.

## Frequência de uso

**Diária**, em rajadas: cada pedido exige resposta rápida. É a persona cujo tempo
de resposta o tutor sente diretamente.

## Papel operacional: Entregador

Quem entrega é o motoboy da própria loja ou um parceiro fixo do bairro,
remunerado pela taxa de entrega paga pelo cliente. A plataforma **não** mantém
frota.

Na fase 1 o entregador **não tem app, login nem perfil** — aparece no pedido como
nome e telefone informados pela loja. Por isso é papel operacional descrito aqui,
e não persona: não existe funcionalidade construída para ele.

## Observação estrutural do piloto

Todo o trabalho de campo com esta persona — visitar, explicar, coletar preço,
resolver problema — passa por **um único fundador de rua**, com emprego em
horário comercial (IDEACAO §33). Coorte pequena e ritmo de onboarding se
dimensionam por essa capacidade real, não pela ambição de mercado.

---

# Personas das fases seguintes

> Permanecem no documento com a fase de entrada. Não são público da fase 1, e
> nenhuma funcionalidade do MVP se justifica por elas.

## Prestador de serviço de bairro — fase 3 (P2)

Banho e tosa, hotel, dog walker, cat sitter, transporte, adestramento. Autônomo
ou pequena empresa.

**Objetivos:** conseguir clientes, organizar agenda, construir reputação.
**Necessidades:** visibilidade, agenda, perfil, avaliações.
**Funcionalidades:** perfil, catálogo de serviços, agendamento, reputação.

É a extensão natural da relação de bairro que a fase 1 constrói com o lojista.

## Veterinário — fase 3 (P2)

Profissional habilitado, autônomo ou vinculado a clínica.

**Objetivos:** atender, organizar agenda, manter prontuário, fidelizar,
reduzir trabalho administrativo.
**Dores:** agenda desorganizada, histórico incompleto, baixa presença digital.
**Funcionalidades:** perfil, agenda, prontuário, histórico do pet integrado.

## Clínica veterinária — fase 3 e 4 (P3)

Empresa de serviços veterinários.

**Objetivos:** captar clientes, digitalizar processo, organizar operação.
**Necessidades:** agenda, prontuário, financeiro, gestão de pacientes.
**Funcionalidades:** perfil e catálogo (fase 3); portal empresarial e ERP
(fase 4).

## ONG — fase 6 (P4)

Organização de proteção animal.

**Objetivos:** divulgar adoções, promover campanhas, organizar eventos, captar
voluntários.
**Funcionalidades:** perfil institucional, campanhas, adoção com transferência
do Pet ID.

---

## Princípios

Toda funcionalidade desenvolvida deve responder a:

* Qual persona será beneficiada?
* Qual problema dessa persona será resolvido?
* Como será medida a melhoria para ela?
* Essa funcionalidade simplifica sua rotina?
* Ela aumenta o valor do ecossistema?

**Na fase 1, uma pergunta a mais:** a funcionalidade serve a **um dos dois lados
sem prejudicar o outro**? Recurso que agrada o tutor às custas da margem ou do
tempo do lojista destrói a oferta que o sustenta — e vice-versa.

Se essas perguntas não puderem ser respondidas objetivamente, a funcionalidade
deve ser reavaliada.

---

## Evolução

Novas personas podem ser adicionadas conforme a plataforma evoluir, na ordem do
[PRODUCT_ROADMAP](../00-foundation/PRODUCT_ROADMAP.md).

O que não muda:

> **O Tutor é a principal persona do PetDots.**

Todas as demais existem para fortalecer a experiência do tutor e aumentar o
valor do ecossistema. Na fase 1 isso tem uma consequência direta: o Lojista é
P1 **porque** sem oferta no bairro não há nada a entregar ao tutor.
