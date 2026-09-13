---
title: PetDots — AI Context
status: stable
version: "3.3"
updated: 2026-09-12
scope: >
  Ponto de entrada rápido para agentes de IA: identidade, o que o produto é na
  fase 1, público-alvo, estado atual, ordem de leitura da documentação e
  diretrizes essenciais. Deve permanecer curto; os detalhes vivem nos
  documentos especializados.
relates_to:
  - README.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 05-ai/AI_DOMAIN_KNOWLEDGE.md
  - 05-ai/AI_DEVELOPMENT_GUIDE.md
  - 06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
type: ai
---

# PetDots — AI Context

> **v3.0 (2026-09-10).** Reescrito na `pd-07`. A v2.1 (jun/2026) descrevia o
> produto "Vida do Pet" e listava Pet Shops em 5º no público-alvo. Como este é
> o primeiro documento que um agente lê, era o ponto de entrada mais
> desatualizado do repositório.

Contexto resumido para agentes de IA que participam do desenvolvimento do
PetDots. É ponto de entrada — não substitui a documentação especializada.

---

# Identidade do Projeto

**Nome:** PetDots

**Tipo:** ecossistema digital para o mercado pet

**Filosofia:** AI First

---

# O que o PetDots é

Duas coisas, e as duas importam:

**Na fase 1 (agora)** — um **marketplace hiperlocal de petshops de bairro**,
operando em um território (o eixo Grande Méier, no Rio), com duas capacidades
que dão valor ao app antes de haver volume de transação:

1. **Reposição inteligente** — o app sabe quando a ração, a areia ou o
   antipulgas do pet vai acabar e avisa no dia certo.
2. **Comparador de preços do bairro** — quanto custa aquele produto nas lojas
   que entregam no seu endereço.

Posicionamento: *"saiba quando a ração acaba e onde comprar mais barato no seu
bairro."*

**No longo prazo** — a principal infraestrutura digital do ecossistema pet
brasileiro, sob a estrela-guia *toda a vida do pet em um único lugar*.

O marketplace é a **cunha**, não o teto: a fatia que vence primeiro e financia o
ecossistema. Decisão registrada no
[ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) e no
[BUSINESS_MODEL](../00-foundation/BUSINESS_MODEL.md) v2.0.

> ⚠️ **Se você encontrar documento que descreva o MVP como Timeline, Carteira
> Digital ou histórico de saúde, ele está desatualizado** — aquilo é fase 2.
> Reporte em vez de seguir.

---

# Público-Alvo

O produto da fase 1 tem **dois lados**, e ambos são P1:

1. **Tutor de pet de bairro** — demanda.
2. **Lojista de petshop de bairro** — oferta.

Fases seguintes, nesta ordem: prestadores de serviço e veterinários (fase 3),
clínicas em profundidade (fases 3-4), ONGs e laboratórios (fase 6). Detalhe em
[`PERSONAS`](../01-product/PERSONAS.md).

Consequência prática para qualquer proposta: ela serve a um dos dois lados
**sem prejudicar o outro**? Recurso que agrada o tutor às custas da margem ou do
tempo do lojista destrói a oferta que o sustenta.

---

# Estado Atual

Fundação greenfield, com a documentação como fonte da verdade
([ADR-0001](../06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md)).

O monorepo está bootstrapado e a API tem health check, contrato Zod→OpenAPI,
testes no CI e OpenTelemetry instrumentado.

**A implementação do MVP começou.** Existem **seis** módulos de domínio na API —
`waitlist` (`pd-09`), `catalog`, `stores` e `offers` (`pd-11`), `identity`
(`pd-12`) e `tutors` (`pd-14`) —, **quatro** migrations, e **quatro** features
entregues: a captura da lista de espera, o comparador público de preços,
identidade & acesso e o perfil do tutor. `Tutor` e `Pet` estão no banco desde a
`pd-14`. O `apps/app` lê a API de verdade desde a `pd-13`, e desde a `pd-14`
**escreve**: criar conta, salvar endereço e cadastrar pet acontecem pela tela. **O que existe no
código está catalogado em [`08-features/`](../08-features/)** — é a primeira
parada para saber o que já foi construído, antes de reler o produto pretendido
nas camadas 00–06.

O que **não** existe: pedido, pagamento, painel do lojista. Ou seja, nenhuma
**escrita** do ciclo do dinheiro. Também não existe a **calculadora de consumo**
(capacidade 9): o peso do pet é coletado, mas a regra que o transforma em
projeção não está escrita em documento nenhum e exige ADR próprio.

> ⚠️ **Correção da v3.2.** Até aqui esta frase dizia que **autenticação** não
> existia — errado desde a `pd-12`, que a construiu. Desde a `pd-13` os guards
> da API são **globais**: toda rota nasce fechada e as abertas se declaram com
> `@Public()` (ADR-0012). Um controller novo responde `401` até ser marcado.

> O estado detalhado e o **próximo passo concreto** vivem em
> [`PROJECT_STATE.md`](../../PROJECT_STATE.md). Não duplicar aqui: aquele
> documento é atualizado a cada tarefa encerrada.

---

# Ordem de leitura

Para entrar no projeto, nesta ordem:

1. [`AGENTS.md`](../../AGENTS.md) — como você deve se comportar.
2. [`docs/07-process/DIRETRIZES_FLUXO_IA.md`](../07-process/DIRETRIZES_FLUXO_IA.md) — como o trabalho anda (três fases, portões, `pd-NN`).
3. [`PROJECT_STATE.md`](../../PROJECT_STATE.md) — onde o projeto está e qual é o próximo passo.
4. [`docs/README.md`](../README.md) — índice mestre e a **ordem canônica de autoridade**.
5. [ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md) e [ADR-0003](../06-decisions/ADR/0003-monetizacao-piloto-e-split-pagamento.md) — o que o MVP é e como ele se paga.
6. [`DOMAIN_MODEL`](../01-product/DOMAIN_MODEL.md) — entidades, agregados, invariantes e eventos.
7. [`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md) — módulos e fluxos.
8. [`MVP_SCOPE`](../01-product/MVP_SCOPE.md) — o que está dentro e fora.
9. [`AI_DOMAIN_KNOWLEDGE`](./AI_DOMAIN_KNOWLEDGE.md) — o domínio destilado para geração de código.

Antes de escrever código, também: [`CODING_STANDARDS`](../03-engineering/CODING_STANDARDS.md)
e [`API_GUIDELINES`](../04-api/API_GUIDELINES.md).

---

# Diretrizes para IA

Sempre:

* preservar a visão do produto;
* respeitar os princípios do projeto;
* usar a linguagem definida no [`GLOSSARY`](../00-foundation/GLOSSARY.md);
* propor soluções simples;
* justificar decisões importantes;
* evitar aumentar a complexidade sem necessidade.

Nunca:

* contradizer documentos oficiais;
* **inventar regras de negócio** — quando a fonte cala, perguntar;
* alterar nomenclaturas estabelecidas;
* introduzir tecnologias sem justificativa (troca de tecnologia exige ADR).

Específico do domínio da fase 1 — dinheiro e fronteira de dados:

* dinheiro em **centavos inteiros**, percentuais em **pontos-base**; nunca ponto
  flutuante;
* pedido é **registro contábil imutável** com snapshot; nunca recalcular valor
  de pedido existente;
* pagamento só é confirmado pelo **webhook do PSP**, nunca pelo retorno do
  cliente;
* um lojista **jamais** lê pedido ou preço de outra loja.

A lista completa do que não fazer está em
[`AI_DOMAIN_KNOWLEDGE`](./AI_DOMAIN_KNOWLEDGE.md).

---

# Estilo de Desenvolvimento

Abordagem incremental, com esta ordem de prioridade:

1. Produto.
2. Domínio.
3. Arquitetura.
4. Engenharia.
5. Implementação.

Nunca inverter essa ordem.

---

# Próximo Objetivo

O próximo passo concreto está em
[`PROJECT_STATE.md`](../../PROJECT_STATE.md) §"Próxima Atividade" — consultar lá,
que é onde ele é mantido atualizado.

Este documento aponta o rumo, não o passo.

---

# Atualização

Este documento deve permanecer **curto** e atualizado. Seu papel é dar contexto
inicial; os detalhes são sempre consultados na documentação especializada.

Atualizar quando: o produto mudar de fase, a ordem de leitura mudar, ou uma
diretriz nova valer para todo agente.
