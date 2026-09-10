---
title: Security
status: draft
version: "1.1"
updated: 2026-09-10
scope: >
  Fonte canônica das práticas de segurança do PetDots: postura de autenticação
  própria, autorização por escopo de loja (store_members), LGPD (retenção,
  soft-delete, exportação, consentimento, minimização), auditoria, gestão de
  segredos e a fronteira de pagamento (webhook do PSP). Deriva do ADR-0002 e
  realiza o atributo #1 de QUALITY_ATTRIBUTES. Não detalha o FLUXO de
  autenticação da API (AUTHENTICATION) nem o formato de erro.
relates_to:
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 02-architecture/QUALITY_ATTRIBUTES.md
  - 02-architecture/ARCHITECTURAL_PRINCIPLES.md
  - 04-api/AUTHENTICATION.md
  - 03-engineering/OBSERVABILITY.md
type: engineering
---

# PetDots — Security

> **Fonte canônica das práticas de segurança.** O **fluxo concreto** de
> autenticação da API (tokens, headers, OAuth, revogação) vive em
> [`AUTHENTICATION`](../04-api/AUTHENTICATION.md), que **complementa** este
> documento sem duplicá-lo. A postura aqui realiza o atributo de qualidade #1
> (Segurança e Privacidade) de [`QUALITY_ATTRIBUTES`](../02-architecture/QUALITY_ATTRIBUTES.md)
> e o princípio P7 de [`ARCHITECTURAL_PRINCIPLES`](../02-architecture/ARCHITECTURAL_PRINCIPLES.md).

---

## Objetivo

Estabelecer as **práticas de segurança e privacidade** do PetDots. Os eixos
condutores são o princípio de produto **"O Tutor é o dono dos dados"**, a regra
comercial **"a Loja é dona do seu preço"** e o fato de que o MVP **movimenta
dinheiro de terceiros** — segurança é invariante de primeira classe, não detalhe
de infra.

**Não cobre:** o fluxo de tokens/OAuth da API → [`AUTHENTICATION`](../04-api/AUTHENTICATION.md);
o formato das respostas de erro 401/403 → [`ERROR_MODEL`](../04-api/ERROR_MODEL.md);
o que é logado/auditado mecanicamente → [`OBSERVABILITY`](./OBSERVABILITY.md).

---

## Autenticação própria (postura)

Decisão do [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md):
**identidade própria, não terceirizada** — soberania sobre dados sensíveis.

- **JWT** (access + refresh), senhas com **argon2**, **Google OAuth** como login
  social. A identidade vive **no nosso PostgreSQL**.
- **Consequência aceita conscientemente:** auth próprio é um **backlog de segurança
  perpétuo** (rotação/revogação de chave, recuperação de acesso). Tratá-lo como
  trabalho contínuo, não "feito uma vez".
- O fluxo concreto (emissão, refresh, revogação, headers) está em `AUTHENTICATION`.

---

## Autorização: RBAC + escopo por instância

- **Escopo de loja por instância** é a defesa central: todo acesso a dado de uma
  loja passa pelo **`StoreScopeGuard`**, que verifica o vínculo
  **`store_members`** (papel `OWNER` vs. `OPERATOR`) — `SYSTEM_ARCHITECTURE`, P7.
- **RBAC** complementa com papéis (`TUTOR`, `STORE_MEMBER`, `ADMIN`); a permissão
  fina deriva do vínculo Usuário–Loja e da posse do pedido pelo tutor.
- **Invariante de segurança:** **0 acesso a pedido ou preço de outra loja**
  (meta de `QUALITY_ATTRIBUTES` #1) — coberto por teste (`TESTING_STRATEGY`).
- **Assimetria deliberada:** o **preço** de uma loja é público (é o produto do
  comparador); o **histórico de vendas** dela não é visível a nenhuma outra loja.
- **Pré-requisito de domínio:** a distinção de permissão entre `OWNER` e
  `OPERATOR` — quem altera preço, quem vê repasse — deve ser fechada **antes** de
  desenhar a autorização fina.

---

## LGPD e privacidade

LGPD é **invariante de primeira classe** (ADR-0002, "compromissos transversais"):

- **Exclusão com retenção fiscal:** **soft-delete / tombstone**, nunca `DELETE`
  físico de dado sob retenção. O **pedido é registro contábil** e não se apaga: a
  exclusão a pedido do tutor anonimiza o dado pessoal e preserva o registro.
- **Exportação / portabilidade:** o Tutor exporta seus dados — perfil, pets,
  agendas de reposição e pedidos — em formato legível: **critério de saída do
  MVP**.
- **Consentimento de compartilhamento:** o que a Loja vê do Tutor é o mínimo
  necessário para entregar o pedido (nome, telefone, endereço da entrega), nunca
  o histórico dele em outras lojas.
- **Minimização de dados:** coletar e expor apenas o necessário; não logar dado
  pessoal sensível (ver `OBSERVABILITY`).

---

## Auditoria

- As mutações sensíveis são registradas por um **Audit interceptor** na borda da
  API (`SYSTEM_ARCHITECTURE`), em `audit_log`. No MVP, as que **exigem** rastro
  são: **alteração de preço de oferta**, **aceite ou recusa de pedido**,
  **alteração da tabela de comissão** e **mudança de categoria de produto** (que
  é o que determina a comissão).
- A auditoria sustenta a verificação do invariante "0 acesso a dado de outra
  loja" e a rastreabilidade exigida pela LGPD. **Conteúdo sensível não entra no log** — os
  campos canônicos de log vivem em [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md)
  e a regra de minimização, em [`OBSERVABILITY`](./OBSERVABILITY.md).

---

## Gestão de segredos

- Segredos vivem em **variáveis de ambiente** `UPPER_SNAKE_CASE`
  (`NAMING_CONVENTIONS`): `JWT_SECRET`, `DATABASE_URL`, `PSP_API_KEY`,
  `PSP_WEBHOOK_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, etc.
- **Nunca** commitar segredos; `.env` é local e ignorado, com `.env.example`
  documentando as chaves (ver [`DEVELOPMENT_GUIDE`](./DEVELOPMENT_GUIDE.md)).
- **Rotação/revogação** de chave JWT e segredos é parte do backlog perpétuo de
  segurança; a entrega/armazenamento em produção é tratada no
  [`DEPLOYMENT`](./DEPLOYMENT.md).

---

## Fronteira de pagamento: o webhook do PSP

O endpoint que o PSP chama é a **única superfície pública não autenticada por
JWT** do sistema, e é ela que decide se um pedido está pago. Por isso:

- **Assinatura verificada** em toda requisição — sem assinatura válida, nada é
  processado.
- **Idempotente por `psp_payment_id`**: reentrega do mesmo evento não gera um
  segundo repasse.
- **Payload persistido** (`psp_payload`) para auditoria, **sem** dado de cartão.
- **Nunca confiar no retorno do cliente** para dar um pedido como pago.
- **Sem `payment.captured`, sem repasse** — é a regra que impede pagar a loja por
  pedido não pago.
- O identificador de subconta da loja no PSP (`psp_recipient_id`) é dado sensível
  de negócio: não aparece em log nem em resposta de API pública.

> **Não há storage de objeto no MVP** — não existe upload de documento (a
> Carteira Digital é fase 2). Quando voltar, volta com **presigned URLs** de
> escopo, expiração e `content-type` explícitos, o backend fora do caminho do
> byte, e o banco guardando apenas metadado e chave do objeto.

---

## Critérios

Este documento é considerado pronto quando:

- [x] É a fonte canônica da postura de segurança, derivada do ADR-0002.
- [x] Define autenticação própria, autorização por escopo de loja (`store_members`) e RBAC.
- [x] Trata LGPD (soft-delete/retenção fiscal, exportação, consentimento, minimização) e auditoria.
- [x] Cobre gestão de segredos e a fronteira de pagamento, remetendo o fluxo de auth ao `AUTHENTICATION`.
- [ ] Distinção de permissão `OWNER` × `OPERATOR` fechada antes da autorização fina.
