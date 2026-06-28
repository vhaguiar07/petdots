---
title: Authentication
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Fluxo de autenticação da API do PetDots: JWT access/refresh, Google OAuth,
  header de autorização, ciclo de vida e revogação de token, e como a autorização
  por ownership é aplicada na borda. Complementa SECURITY (postura/porquê) sem
  duplicá-la. Deriva do ADR-0002. Não define o formato de erro (ERROR_MODEL) nem
  as convenções gerais de REST (API_GUIDELINES).
relates_to:
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 03-engineering/SECURITY.md
  - 04-api/API_GUIDELINES.md
  - 04-api/ERROR_MODEL.md
  - 01-product/DOMAIN_MODEL.md
type: api
---

# PetDots — Authentication

> Este documento descreve o **fluxo** de autenticação da API. A **postura e o
> porquê** (auth própria, soberania de dados, LGPD, gestão de segredos) vivem em
> [`SECURITY`](../03-engineering/SECURITY.md) — **complementam-se, não se
> duplicam**. Deriva do [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md).

---

## Objetivo

Definir **como um cliente se autentica na API do PetDots** e como cada requisição
prova identidade e permissão. A identidade é **própria** (no nosso PostgreSQL),
não terceirizada (ADR-0002).

**Não cobre:** a postura de segurança e LGPD → [`SECURITY`](../03-engineering/SECURITY.md);
o formato das respostas `401`/`403` → [`ERROR_MODEL`](./ERROR_MODEL.md); as
convenções gerais de REST → [`API_GUIDELINES`](./API_GUIDELINES.md).

---

## Mecanismo

- **Tokens JWT:** um **access token** curto e um **refresh token** longo.
- **Senhas** com hashing **argon2**; nunca trafegam nem são logadas.
- **Google OAuth** como login social, resolvido para a identidade no nosso banco.
- **Header de autorização:** `Authorization: Bearer <accessToken>` em toda
  requisição autenticada.

### Claims do access token

O payload identifica o **Tutor** e seus papéis, sem dados sensíveis:

- `sub` — `id` (UUID) do Tutor.
- `roles` — papéis para o RBAC (ver `SECURITY`).
- `exp` / `iat` — expiração curta (constante `JWT_EXPIRATION_TIME` —
  `NAMING_CONVENTIONS`).

A autorização **fina por instância** (quais Pets o Tutor acessa) **não** vive no
token: deriva do vínculo `pet_tutors` em tempo de requisição (ver abaixo).

---

## Fluxos

| Fluxo | Endpoint (forma) | Resultado |
|-------|------------------|-----------|
| Cadastro | `POST /api/v1/auth/register` | cria `Tutor` (`tutor.created`) e emite tokens |
| Login (senha) | `POST /api/v1/auth/login` | valida argon2; emite access + refresh |
| Login (Google) | `POST /api/v1/auth/google` | valida OAuth; resolve/cria o `Tutor`; emite tokens |
| Renovar | `POST /api/v1/auth/refresh` | troca refresh válido por novo access (+ refresh rotacionado) |
| Logout / revogar | `POST /api/v1/auth/logout` | revoga o refresh token corrente |
| Recuperar acesso | `POST /api/v1/auth/password-reset` | inicia recuperação (backlog perpétuo de segurança — `SECURITY`) |

> Os caminhos acima ficam sob `/api/v1/auth` e seguem `API_GUIDELINES` na base
> versionada e no JSON camelCase, sobre o contrato OpenAPI canônico. **Exceção
> consciente:** fluxos de autenticação são **ações** (login, refresh, logout), não
> recursos CRUD — exceção pragmática e comum em REST à regra "sem verbos na URL"
> do `API_GUIDELINES`/`NAMING_CONVENTIONS`.

---

## Ciclo de vida e revogação do token

- **Access token** é curto; expira sem necessidade de revogação ativa.
- **Refresh token** é persistido/rastreado para permitir **revogação** (logout,
  troca de senha, suspeita de comprometimento) e **rotação** a cada uso.
- **Rotação/revogação de chave de assinatura** faz parte do backlog perpétuo de
  segurança do auth próprio (ADR-0002 / `SECURITY`).

---

## Autorização na borda (authn × authz)

A autenticação prova **quem é**; a autorização decide **o que pode**:

- **AuthGuard** valida o JWT → `401` se ausente/inválido.
- **OwnershipGuard** verifica o vínculo `pet_tutors` (papel primário vs.
  autorizado) para todo acesso a dado de Pet → `403` se sem permissão
  (`SECURITY`, `SYSTEM_ARCHITECTURE`).
- O **formato** dessas respostas de falha é o do [`ERROR_MODEL`](./ERROR_MODEL.md).

> A regra **tutor primário vs. autorizado** (questão em aberto no `DOMAIN_MODEL`)
> precisa ser fechada antes da autorização fina (ADR-0002).

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define o mecanismo (JWT access/refresh, argon2, Google OAuth, header Bearer).
- [x] Lista os fluxos de auth como recursos sob `/api/v1/auth`, coerentes com `API_GUIDELINES`.
- [x] Descreve ciclo de vida, rotação e revogação de token.
- [x] Separa authn de authz (AuthGuard/OwnershipGuard → 401/403), remetendo postura a `SECURITY` e formato a `ERROR_MODEL`.
- [ ] Regra "tutor primário vs. autorizado" fechada no domínio antes da autorização fina.
