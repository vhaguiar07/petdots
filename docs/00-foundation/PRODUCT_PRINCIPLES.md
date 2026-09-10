---
title: PetDots — Product Principles
status: stable
version: 1.1
updated: 2026-09-10
scope: >
  Define os princípios fundamentais que orientam todas as decisões do PetDots:
  produto, arquitetura, design, experiência do usuário e negócio.
relates_to:
  - 00-foundation/PRODUCT_VISION.md
  - 00-foundation/BUSINESS_MODEL.md
  - 00-foundation/PRODUCT_ROADMAP.md
  - 06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md
  - README.md
type: foundation
---

# PetDots — Product Principles

> **v1.1 (2026-09-10).** Emenda cirúrgica feita na `pd-07`. Dos quinze
> princípios, **um** mudou: o §8, que dizia "Marketplace é uma Consequência — o
> PetDots não nasce para vender produtos". A estratégia alinhada entre os sócios
> em 02/09/2026 decidiu o contrário — o marketplace hiperlocal **é** o produto
> inicial ([IDEACAO_FASE1](IDEACAO_FASE1.md), Parte 4;
> [BUSINESS_MODEL](BUSINESS_MODEL.md) v2.0;
> [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md)). O §8 foi
> reescrito para expressar a decisão sem perder o que ele protegia: a
> experiência do tutor continua acima da monetização. Os §4 e §9 receberam uma
> frase cada. Todos os demais princípios e os anti-princípios são os originais.

---

# Objetivo

Este documento define os princípios fundamentais que orientam todas as decisões relacionadas ao desenvolvimento do PetDots.

Esses princípios representam a identidade do produto e devem permanecer relativamente estáveis ao longo da evolução da plataforma.

Toda decisão de produto, arquitetura, design, experiência do usuário ou negócio deve respeitar estes princípios.

Quando houver conflito entre funcionalidades, prioridades ou soluções técnicas, este documento deve ser utilizado como referência para orientar a decisão.

---

# Nossa Filosofia

O PetDots não está sendo desenvolvido apenas como um software.

Estamos construindo um ecossistema digital para conectar todo o mercado pet, simplificando a vida dos tutores e fortalecendo a relação entre pessoas, empresas e profissionais.

Toda decisão deve contribuir para tornar o PetDots o principal ambiente digital da vida do pet.

---

# Princípios Fundamentais

## 1. Pet First

Toda decisão deve priorizar o bem-estar do animal.

O sucesso do produto depende da sua capacidade de contribuir positivamente para a qualidade de vida dos pets.

Quando houver conflito entre interesses comerciais e o bem-estar do animal, a prioridade será sempre o pet.

---

## 2. Tutor First

O tutor é o centro da experiência.

Todas as funcionalidades devem reduzir esforço, simplificar tarefas e facilitar o cuidado diário com seus animais.

O PetDots deve ser percebido como um aliado do tutor, nunca como uma plataforma complexa.

---

## 3. O Tutor é o Dono dos Dados

Os dados do pet pertencem ao tutor.

O PetDots atua apenas como guardião dessas informações.

O tutor possui controle sobre:

* Compartilhamento
* Permissões
* Histórico
* Exportação
* Exclusão de dados

---

## 4. Uma Única Fonte da Verdade

Toda a vida do pet deve estar centralizada em um único lugar.

Sempre que possível, informações duplicadas devem ser evitadas.

O PetDots deve representar o histórico completo do animal ao longo de toda a sua vida.

Na fase 1, o que se centraliza é a **compra recorrente do pet**: o que ele
consome, quando acaba e onde comprar. O histórico de saúde entra na fase 2, sobre
o mesmo Pet ID.

---

## 5. Dados Devem Gerar Inteligência

O objetivo da plataforma não é apenas armazenar informações.

Cada dado registrado deve ser utilizado para gerar valor.

Exemplos:

* Recomendações
* Alertas
* Lembretes
* Insights
* Histórico inteligente
* Organização automática

---

# Princípios de Produto

## 6. Simplicidade Acima de Funcionalidades

Uma funcionalidade somente deve existir se tornar a vida do usuário mais simples.

O PetDots nunca deve adicionar complexidade desnecessária.

Sempre que possível:

* menos telas;
* menos cliques;
* menos configurações;
* menos esforço cognitivo.

---

## 7. Recorrência Acima de Aquisição

Nosso objetivo não é apenas conquistar novos usuários.

Nosso objetivo principal é criar um produto que os usuários desejem utilizar continuamente.

Uma funcionalidade recorrente possui maior valor estratégico do que uma funcionalidade utilizada apenas uma vez.

---

## 8. A Cunha Vence Primeiro; o Ecossistema é a Consequência

O PetDots nasce como um **marketplace hiperlocal de petshops de bairro** — a
menor cunha capaz de gerar transação recorrente por si só.

Não é uma concessão nem um desvio da visão: ecossistemas vencedores nascem de
uma fatia que vence primeiro. A cunha traz o que o ecossistema precisa e não se
consegue de graça — transação recorrente, relacionamento com as lojas do bairro
e o dado de consumo do pet.

Consequências práticas deste princípio:

* **A margem do lojista é o recurso escasso.** A comissão nunca consome mais de
  um terço da margem dele na categoria (regra do ⅓,
  [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md)).
  Monetização adicional vem do cliente e de serviços, nunca de espremer o
  parceiro.
* **Densidade antes de alcance.** Um bairro por vez, com oferta suficiente para
  o tutor achar o que procura perto de casa.
* **A prioridade continua sendo a experiência do tutor.** Vender mais nunca
  justifica piorar o produto para quem compra — é o que este princípio protegia
  na v1.0 e continua protegendo.

O ecossistema completo (serviços, saúde, ONGs) é consequência da densidade que a
cunha cria — na ordem definida pelo
[PRODUCT_ROADMAP](PRODUCT_ROADMAP.md), não antes.

---

## 9. Ecossistema Acima de Plataforma

O PetDots conecta participantes.

Não compete com eles.

Nosso papel é fortalecer:

* **Petshops de bairro** (o parceiro da fase 1)
* Prestadores de serviço
* Veterinários
* Clínicas
* ONGs
* Empresas parceiras

Quanto maior o sucesso dos parceiros, maior será o sucesso da plataforma.

O caso mais concreto disso na fase 1: o WhatsApp da própria loja é o concorrente
invisível da plataforma — e a comissão zero para o cliente próprio do lojista
transforma esse conflito de canal em aliança, em vez de disputa.

---

# Princípios de Experiência

## 10. Experiência Consistente

O usuário deve encontrar a mesma experiência independentemente do dispositivo utilizado.

As versões Mobile, Web e futuras interfaces devem compartilhar os mesmos conceitos e comportamentos.

---

## 11. Inteligência Invisível

A tecnologia deve trabalhar em segundo plano.

O usuário não deve perceber a complexidade existente na plataforma.

O sistema deve antecipar necessidades e oferecer recomendações de forma natural.

---

## 12. Human in the Loop

O PetDots utiliza inteligência artificial como ferramenta de apoio.

A IA auxilia na organização das informações, geração de recomendações e automação de tarefas.

Entretanto, decisões clínicas e diagnósticos continuam sendo responsabilidade de profissionais habilitados.

A plataforma nunca substituirá o médico veterinário.

---

# Princípios Técnicos

## 13. API First

Toda capacidade desenvolvida deve considerar futuras integrações.

Mesmo funcionalidades inicialmente utilizadas apenas pela aplicação devem ser concebidas como serviços reutilizáveis.

---

## 14. AI First

O PetDots será desenvolvido considerando a inteligência artificial como parte integrante do processo de engenharia.

Toda documentação deverá ser escrita de forma compreensível tanto para pessoas quanto para agentes de IA.

Sempre que possível:

* documentação estruturada;
* contexto explícito;
* decisões registradas;
* nomenclatura consistente;
* domínio claramente definido.

---

## 15. Evolução Incremental

Nunca desenvolver soluções para problemas que ainda não existem.

A plataforma deve evoluir continuamente, sempre validando hipóteses antes de aumentar sua complexidade.

---

# Critérios para Novas Funcionalidades

Toda nova funcionalidade deve responder positivamente às seguintes perguntas:

1. Simplifica a vida do tutor?
2. Gera valor para o pet?
3. Fortalece o ecossistema?
4. Aumenta a recorrência de uso?
5. Está alinhada com a visão do produto?
6. Pode evoluir sem comprometer a simplicidade?
7. É consistente com os princípios deste documento?

Caso a maioria das respostas seja negativa, a funcionalidade deve ser reavaliada.

---

# Anti-Princípios

O PetDots não deve:

* Priorizar monetização em detrimento da experiência do usuário.
* Complicar tarefas simples.
* Duplicar informações desnecessariamente.
* Tornar-se dependente de um único parceiro.
* Competir diretamente com empresas que fazem parte do ecossistema.
* Substituir profissionais veterinários.
* Coletar dados sem transparência.
* Introduzir tecnologias apenas por tendência de mercado.
* Aumentar a complexidade técnica sem necessidade comprovada.

---

# Como Tomar Decisões

Sempre que houver dúvidas sobre qualquer decisão relacionada ao produto, consulte a ordem de prioridade definida na Fonte da Verdade canônica: ver [Fonte da Verdade em `docs/README.md`](../README.md#fonte-da-verdade-canônica).

Caso uma decisão entre em conflito com estes princípios, a decisão deverá ser revisada ou devidamente justificada.

---

# Revisão Contínua

Este documento deve evoluir com extrema cautela.

Novos princípios podem ser adicionados quando necessário.

Entretanto, princípios existentes somente devem ser modificados quando houver uma mudança significativa na visão estratégica do PetDots.

Sua estabilidade é fundamental para garantir consistência entre produto, arquitetura, engenharia e negócio ao longo da evolução da plataforma.
