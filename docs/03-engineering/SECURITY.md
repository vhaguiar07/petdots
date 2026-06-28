---
title: Security
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Fonte canônica das práticas de segurança do PetDots: postura de autenticação
  própria, autorização por ownership (pet_tutors), LGPD (retenção, soft-delete,
  exportação, consentimento, minimização), auditoria, gestão de segredos e
  presigned URLs. Deriva do ADR-0002 e realiza o atributo #1 de QUALITY_ATTRIBUTES.
  Não detalha o FLUXO de autenticação da API (AUTHENTICATION) nem o formato de erro.
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

Estabelecer as **práticas de segurança e privacidade** do PetDots. O eixo
condutor é o princípio de produto **"O Tutor é o dono dos dados"** e o fato de que
**dados de saúde do pet são sensíveis** — segurança é invariante de primeira
classe, não detalhe de infra.

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

## Autorização: RBAC + ownership por instância

- **Ownership por instância** é a defesa central: todo acesso a dado de um Pet
  passa pelo **OwnershipGuard**, que verifica o vínculo **`pet_tutors`** (papel
  primário vs. autorizado) — `SYSTEM_ARCHITECTURE`, P7.
- **RBAC** complementa com papéis; a permissão fina deriva do vínculo Tutor–Pet.
- **Invariante de segurança:** **0 acesso a dado de Pet sem checagem de vínculo**
  (meta de `QUALITY_ATTRIBUTES` #1) — coberto por teste (`TESTING_STRATEGY`).
- **Pré-requisito de domínio:** a regra **tutor primário vs. autorizado** (questão
  em aberto no `DOMAIN_MODEL`) deve ser fechada **antes** de desenhar a
  autorização fina (ADR-0002).

---

## LGPD e privacidade

LGPD é **invariante de primeira classe** (ADR-0002, "compromissos transversais"):

- **Exclusão com retenção legal:** **soft-delete / tombstone**, nunca `DELETE`
  físico de dado sob retenção. Exclusão de documento coordena banco + objeto no S3.
- **Exportação / portabilidade:** o Tutor exporta o Histórico completo (Timeline +
  Carteira Digital) em formato legível — **critério de saída do MVP** (jornada J6).
- **Consentimento de compartilhamento:** acesso de terceiros/Parceiros é
  **concedido pelo Tutor**, nunca presumido (`DOMAIN_MODEL`, ownership).
- **Minimização de dados:** coletar e expor apenas o necessário; não logar dado
  pessoal sensível (ver `OBSERVABILITY`).

---

## Auditoria

- Acesso e mutação de dado de Pet são registrados por um **Audit interceptor** na
  borda da API (`SYSTEM_ARCHITECTURE`), em `audit_log`.
- A auditoria sustenta a verificação do invariante "0 acesso sem vínculo" e a
  rastreabilidade exigida pela LGPD. **Conteúdo sensível não entra no log** — os
  campos canônicos de log vivem em [`NAMING_CONVENTIONS`](../00-foundation/NAMING_CONVENTIONS.md)
  e a regra de minimização, em [`OBSERVABILITY`](./OBSERVABILITY.md).

---

## Gestão de segredos

- Segredos vivem em **variáveis de ambiente** `UPPER_SNAKE_CASE`
  (`NAMING_CONVENTIONS`): `JWT_SECRET`, `DATABASE_URL`, `S3_BUCKET`,
  `GOOGLE_OAUTH_CLIENT_ID`, etc.
- **Nunca** commitar segredos; `.env` é local e ignorado, com `.env.example`
  documentando as chaves (ver [`DEVELOPMENT_GUIDE`](./DEVELOPMENT_GUIDE.md)).
- **Rotação/revogação** de chave JWT e segredos é parte do backlog perpétuo de
  segurança; a entrega/armazenamento em produção é tratada no
  [`DEPLOYMENT`](./DEPLOYMENT.md).

---

## Storage: presigned URLs

- Documentos da Carteira Digital usam **presigned URLs** no S3; o backend fica
  **fora do caminho do byte** (ADR-0002 / `SYSTEM_ARCHITECTURE`).
- Cada URL tem **escopo, expiração e `content-type` explícitos** — sem URL
  permanente nem acesso público ao bucket.
- O banco guarda apenas o **metadado + a chave do objeto**; a exclusão LGPD
  coordena banco e objeto.

---

## Critérios

Este documento é considerado pronto quando:

- [x] É a fonte canônica da postura de segurança, derivada do ADR-0002.
- [x] Define autenticação própria, autorização por ownership (`pet_tutors`) e RBAC.
- [x] Trata LGPD (soft-delete/retenção, exportação, consentimento, minimização) e auditoria.
- [x] Cobre gestão de segredos e presigned URLs, remetendo o fluxo de auth ao `AUTHENTICATION`.
- [ ] Regra "tutor primário vs. autorizado" fechada no domínio antes da autorização fina.
