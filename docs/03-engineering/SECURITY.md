---
title: Security
status: draft
version: "1.5"
updated: 2026-09-12
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

> ✅ **De pé desde a `pd-12`** (12/09/2026, [ADR-0011](../06-decisions/ADR/0011-autenticacao-propria-antes-da-escrita.md)):
> `users`, `refresh_tokens`, cadastro, login, refresh rotacionado, logout,
> `AuthGuard` e `RolesGuard`. A implementação de argon2 é `@node-rs/argon2` —
> binário pré-compilado, sem node-gyp (A5); o algoritmo é o que este documento
> fixa e não se reabre.
>
> ⏳ **Ainda não existe, e a dívida é nominal:** Google OAuth (A3), recuperação
> de acesso (A4) e `StoreScopeGuard` (A2). Os três estão no `BACKLOG` com
> gatilho nomeado.
>
> 🔴 **Duas regras que a implementação estabeleceu e que não se afrouxam:**
> (a) toda credencial inválida devolve a **mesma** resposta e paga o **mesmo**
> custo de hashing — mensagem, status e tempo, os três; (b) o seed de usuários
> de desenvolvimento **se recusa a rodar com `NODE_ENV=production`**. A senha
> desses usuários está em arquivo versionado num repositório público, e só é
> tolerável enquanto essa recusa existir.

### Onde a sessão fica no cliente, e o risco aceito

Desde a `pd-13` existe login pela interface no `apps/app`, e com ele uma
decisão de segurança que este documento precisa registrar
([ADR-0012](../06-decisions/ADR/0012-sessao-do-cliente-universal-e-guards-globais.md)):

| Plataforma | Onde a sessão fica |
|---|---|
| Nativo | `expo-secure-store` (keychain / keystore) |
| **Web** | `localStorage`, chave `petdots.session` |

🔴 **No web o risco aceito é XSS.** Um script executando nesta origem lê a
sessão inteira — access token e refresh token. Não há como evitá-lo guardando
em outro lugar do navegador: `expo-secure-store` não existe lá, e o cookie
`httpOnly` foi descartado no ADR-0011 (A6) porque o app é export estático e não
tem servidor para recebê-lo.

As mitigações, nomeadas em vez de presumidas:

- **O React Native Web escapa todo texto que renderiza.** Não há
  `dangerouslySetInnerHTML` com dado de usuário no `apps/app` — o único uso é o
  CSS estático de `+html.tsx`.
- **A rotação do refresh token limita a janela:** uma cópia roubada morre na
  próxima renovação legítima do cliente de verdade.
- **CSP no deploy do app web** é a mitigação que ainda falta. Está no `BACKLOG`,
  na vigilância, com gatilho **deploy do app web**.

E a regra que decide quando uma sessão morre: **só a API pode encerrá-la**. Um
`401` no refresh limpa o armazenamento; uma falha de rede **não**, porque a
sessão continua válida no servidor e deslogar por queda de conexão é um defeito,
não uma precaução.

---

## Autorização: RBAC + escopo por instância

- **Escopo de loja por instância** é a defesa central: todo acesso a dado de uma
  loja passa pelo **`StoreScopeGuard`**, que verifica o vínculo
  **`store_members`** (papel `OWNER` vs. `OPERATOR`) — `SYSTEM_ARCHITECTURE`, P7.
- **RBAC** complementa com papéis (`TUTOR`, `STORE_MEMBER`, `ADMIN`); a permissão
  fina deriva do vínculo Usuário–Loja e da posse do pedido pelo tutor.
  ✅ O `RolesGuard` existe desde a `pd-12`, e **verifica interseção, não
  igualdade**: os papéis se acumulam num mesmo humano.
- ✅ **Os guards são globais desde a `pd-13`** (`APP_GUARD` no
  `IdentityModule`): **toda rota nasce fechada**, e as abertas se declaram com
  `@Public()`. A postura importa mais que o mecanismo — o esquecimento agora
  falha fechando, não abrindo. O que impede a inversão de derrubar o comparador
  público é um teste-sentinela sobre as rotas abertas.
- **Invariante de segurança:** **0 acesso a pedido ou preço de outra loja**
  (meta de `QUALITY_ATTRIBUTES` #1) — coberto por teste (`TESTING_STRATEGY`).
- **Assimetria deliberada:** o **preço** de uma loja é público (é o produto do
  comparador); o **histórico de vendas** dela não é visível a nenhuma outra loja.
- ✅ **Pré-requisito de domínio — FECHADO em 12/09/2026**
  ([ADR-0013](../06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md)). A
  distinção `OWNER` × `OPERATOR` era pré-requisito declarado da autorização
  fina, e era o que travava o `StoreScopeGuard`. Decisão do Victor:

  | Capacidade | `OWNER` | `OPERATOR` |
  |---|---|---|
  | Aceitar, recusar, despachar pedido; marcar item indisponível | ✅ | ✅ |
  | Marcar **disponibilidade** de oferta | ✅ | ✅ |
  | **Alterar preço** de oferta | ✅ | 🔴 não |
  | **Ver repasse e faturamento** | ✅ | 🔴 não |
  | Editar área de entrega, taxa e prazo; pausar a loja | ✅ | 🔴 não |
  | Convidar ou remover membro | ✅ | 🔴 não |

  🔴 **Preço e disponibilidade são permissões separadas**, e é a linha que
  carrega o dinheiro: preço é decisão comercial numa margem que não absorve
  erro, e o pedido é registro imutável com snapshot — a venda com prejuízo não
  se desfaz. Disponibilidade é fato de prateleira, e travá-la na dona produz o
  pedido pago de item inexistente.

  **Toda loja tem ao menos um `OWNER`**; remover o último é proibido. E
  **`StoreRole` não vai no token**: o JWT diz só que a pessoa opera *alguma*
  loja; qual e com que poder é o vínculo `store_members`, lido a cada
  requisição. O rationale completo está no ADR-0013; a implementação é a
  `pd-16`.

---

## LGPD e privacidade

> 🔴 **Desde a `pd-14` (12/09/2026) isto deixou de ser teórico.** Até ali a API
> só guardava dado de gente da equipe e leads de campanha; agora ela guarda o
> **nome, o celular, o endereço e o nome do pet de uma pessoa de fora**
> (ADR-0015). O que a entrega fez a respeito, e o que continua em aberto:
>
> - ✅ **Posse verificada em toda operação**, com o `tutor_id` no `where` da
>   própria consulta, e **coberta por teste de acesso negado** — pet de outro
>   tutor responde `404`, nunca `403`, porque `403` confirmaria que o id existe
>   e tem dono.
> - ✅ **Minimização no log:** as linhas do módulo `tutors` carregam **só ids**
>   (`tutorId`, `petId`, `userId`). Nome, celular, rua e nome do pet **nunca**
>   aparecem — é o que `NAMING_CONVENTIONS` §Logs proíbe nominalmente.
> - ✅ **Nada além do dono enxerga o dado:** não há rota que liste tutores ou
>   pets de terceiros. O que a loja vai ver do tutor nasce com `orders`.
> - ⬜ **Exportação e exclusão a pedido do titular continuam não existindo** —
>   são a capacidade 14, e nada da `pd-14` as substitui. O doc de feature
>   declara isso explicitamente.
> - ⚠️ **A exclusão de pet é física** (`DELETE`), o que hoje é coerente com a
>   regra abaixo porque nada referencia `pets` e um pet não está sob retenção
>   fiscal. Quando `replenishment_schedules` referenciar `pets`, a escolha entre
>   cascata e soft-delete precisa ser refeita — está na vigilância do
>   `BACKLOG` com esse gatilho.

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

> ⚠️ **A `pd-14` também não criou `audit_log`, e pelo mesmo critério.**
> Nenhuma das quatro mutações abaixo nasce no perfil do tutor: ele não altera
> preço, pedido, comissão nem categoria. O que a entrega pôs no lugar foi
> `created_at`/`updated_at` em `tutors` e `pets` (respondem "quando mudou"),
> log estruturado só com ids, e a posse verificada e testada. A tabela e o
> interceptor continuam nascendo com a escrita de ofertas.

> ⚠️ **A `pd-12` não criou `audit_log`, e é deliberado.** Nenhuma das quatro
> mutações abaixo nasceu com a autenticação — ela cria identidade, não altera
> preço, pedido, comissão nem categoria. A tabela e o interceptor nascem com a
> **primeira delas**, que é a escrita de ofertas. Em troca, os eventos de
> autenticação (login concedido, login negado, refresh rotacionado, logout) vão
> para o logger estruturado, **sem senha, hash, token ou e-mail**.

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
- ✅ **`JWT_SECRET` é obrigatória e não tem default** (`pd-12`): segredo com
  default é segredo que vai para produção. A API se recusa a subir sem ela,
  nomeando a variável e **sem ecoar o valor**.
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
- [x] Autenticação própria **implementada** — argon2, JWT + refresh rotacionado, `JWT_SECRET` obrigatória (`pd-12`, ADR-0011).
- [x] RBAC por papéis **implementado** (`RolesGuard`, por interseção) — `pd-12`.
- [x] Guards **globais**, com as rotas abertas marcadas `@Public()` e cobertas por sentinela e2e — `pd-13`, ADR-0012.
- [x] Onde a sessão fica no cliente e o risco XSS do `localStorage` registrados, com as mitigações nomeadas — `pd-13`.
- [ ] CSP no app web. *(Aberto — vigilância do `BACKLOG`, gatilho: deploy do app web.)*
- [ ] Google OAuth implementado. *(Aberto — ADR-0011, A3.)*
- [ ] Recuperação de acesso implementada. *(Aberto — ADR-0011, A4; sem ela, quem esquece a senha fica trancado.)*
- [ ] `StoreScopeGuard` e `store_members` implementados. *(Aberto: bloqueado pelo critério abaixo e pela ausência de `StoreMember` no schema.)*
- [ ] `audit_log` e o Audit interceptor. *(Aberto: nascem com a primeira mutação que exige rastro — a escrita de oferta.)*
- [x] Distinção de permissão `OWNER` × `OPERATOR` fechada antes da autorização fina — 12/09/2026, [ADR-0013](../06-decisions/ADR/0013-papeis-de-loja-owner-e-operator.md).
