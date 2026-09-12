---
title: "ADR-0011: Autenticação própria antes da escrita"
status: stable
version: "1.0"
updated: 2026-09-12
scope: >
  Registra as decisões que puseram de pé a capacidade 1 do MVP_SCOPE —
  identidade e acesso: o recorte entre autenticação e autorização fina, a forma
  dos tokens (JWT curto no header Bearer + refresh opaco persistido e
  rotacionado), a escolha da implementação de argon2, o que ficou
  deliberadamente de fora (Google OAuth, recuperação de acesso, StoreScopeGuard,
  perfil de Tutor) e a semente de usuários de desenvolvimento que se recusa a
  rodar em produção.
relates_to:
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 03-engineering/SECURITY.md
  - 04-api/AUTHENTICATION.md
  - 04-api/ERROR_MODEL.md
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
  - 06-decisions/ADR/0004-arquitetura-mvp-marketplace.md
  - 06-decisions/ADR/0008-cliente-universal-expo.md
  - 06-decisions/ADR/0010-comparador-publico-antes-do-checkout.md
type: decision
---

# ADR-0011: Autenticação própria antes da escrita

## Contexto

A pergunta que originou o trabalho foi operacional, do Victor, em 11/09/2026:

> "Como eu logo na aplicação, agora que a home virou a sala de espera?"

A resposta era que **não se loga**. A capacidade 1 do `MVP_SCOPE` — identidade e
acesso — nunca tinha sido implementada: a busca por `@UseGuards`, JWT, sessão ou
`passport` em `apps/api`, `apps/landing` e `packages/` voltava vazia, e o schema
não tinha model `User`. O login que ele lembrava era do protótipo legado
arquivado na tag `legacy-marketplace`.

Daí veio a segunda pergunta, que é a que decide o desenho:

> "Precisamos arrumar alguma alternativa para isso. Como vou testar as telas no
> período de desenvolvimento?"

Três forças se encontravam aqui ao mesmo tempo:

1. **Nenhuma tela é travada hoje.** As três rotas da landing (`/`, `/precos`,
   `/precos/[productSlug]`) são públicas **por desenho** (ADR-0010) — o
   comparador é o ativo de aquisição orgânica e precisa ser indexável. Não
   existe, portanto, uma tela esperando por login.
2. **O próximo passo de produto exige escrita autenticada.** O item de maior
   valor do backlog é o lojista atualizar o próprio preço, e não há como abrir
   uma escrita de oferta sem saber quem escreve.
3. **A alternativa fácil é a errada.** Um bypass de desenvolvimento
   (`AUTH_DISABLED`, header `X-Dev-User`, guard que devolve `true` em dev) é um
   caminho de código que **não existe em produção** — e um caminho de código que
   ninguém exercita a sério é onde a falha de segurança mora.

O `AUTHENTICATION` já descrevia o fluxo alvo, mas com `status: draft` e **duas
afirmações que contradizem o `DOMAIN_MODEL`** (ver A9 e A10).

## Decisão

Implementar **autenticação própria (authn) + RBAC grosso**, e nada além disso.

### Recorte

| # | Decisão | Por quê |
|---|---|---|
| **A1** | Escopo = model `User`, cadastro, login por e-mail/senha, refresh, logout, `AuthGuard`, `RolesGuard` e usuários de desenvolvimento no seed | É o corte que responde à pergunta do Victor e destrava a escrita de ofertas, sem esbarrar em nenhuma decisão pendente |
| **A2** | **`StoreScopeGuard` fica de fora** | Dois motivos independentes. (a) `StoreMember` **não existe no schema** — nasce no onboarding de loja (ADR-0010). (b) O `SECURITY` tem pré-requisito declarado e **aberto**: a distinção `OWNER` × `OPERATOR` deve ser fechada *antes* de desenhar a autorização fina. Implementá-la agora violaria um pré-requisito que o próprio repositório registra |
| **A3** | **Google OAuth fica de fora** | Exige um OAuth client novo no Google Cloud — trabalho manual que bloquearia a branch — e há um client legado **pendente de revogação** no mesmo console. Levanta ainda uma decisão de produto não tomada: a mesma pessoa entrando por Google e por senha com o mesmo e-mail vira **um** `User` ou dois? Vinculação de conta é decisão, não detalhe |
| **A4** | **Recuperação de acesso fica de fora** | Exige canal de notificação transacional, que é decisão de modelagem pendente no `BACKLOG` e pede ADR próprio. Sem canal, "recuperar senha" não existe de verdade. ⚠️ Não é gratuito — ver Consequências |
| **A10** | **Cadastro cria `User` e mais nada** | O `AUTHENTICATION` diz que o cadastro cria `Tutor`, mas `Tutor` é a **capacidade 2** do `MVP_SCOPE` — perfil de consumo com pets, endereços e agendas. Criá-lo aqui arrastaria tudo isso para dentro desta entrega |

### Forma da solução

| # | Decisão | Por quê |
|---|---|---|
| **A5** | argon2 via **`@node-rs/argon2`**, não via o pacote `argon2` | O algoritmo é fixado pelo `SECURITY` e não se reabre; o que se escolhe é a implementação. O pacote `argon2` compila via **node-gyp**, exigindo Visual Studio Build Tools — o desenvolvimento acontece em **Windows**, e o repositório não tem hoje nenhuma dependência que compile localmente. `@node-rs/argon2` é Rust com binário pré-compilado por plataforma, e funciona igual no CI Linux |
| **A6** | Token no header **`Authorization: Bearer`**, não em cookie `httpOnly` | A superfície logada do MVP é `apps/app` (Expo, ADR-0008), onde Bearer + armazenamento seguro do dispositivo é o caminho natural. A landing **permanece pública e sem login** (ADR-0010). Não há tela server-rendered autenticada no MVP, que é o único caso em que o cookie ganharia |
| **A7** | Refresh token **persistido e rotacionado a cada uso** | Sem persistir, logout não revoga nada — vira mentira de API. A rotação é o que faz uma cópia roubada parar de valer na próxima renovação legítima. A revogação é um `UPDATE … WHERE revoked_at IS NULL`: só a condição no próprio comando impede que dois replays do mesmo token ganhem os dois |
| **A9** | **`sub` do JWT é o `User.id`** | ⚠️ **Contradição resolvida.** O `AUTHENTICATION` (draft) diz que o payload identifica o **Tutor**. O `DOMAIN_MODEL` diz que **`User` é a identidade autenticável** e `Tutor` é *"perfil de consumo de um Usuário"*, entidade separada com `user_id`. Pela ordem canônica de `docs/README.md`, o `DOMAIN_MODEL` prevalece — e o `AUTHENTICATION` foi corrigido nesta entrega |
| **A11** | **Nenhum evento de domínio é emitido** | Mesma decisão e mesmo motivo da `pd-09` com `waitlist.joined`: não existe barramento in-process, não há consumidor, e instalar um para evento sem ouvinte é infraestrutura antecipada (`AGENTS.md`) |
| **A8** | Usuários de desenvolvimento no seed versionado, num arquivo próprio, que **se recusa a rodar com `NODE_ENV=production`** | É a alternativa que o Victor pediu, e é a única honesta: o seed já é versionado, idempotente e valida tudo antes de escrever. A recusa é **inegociável** — sem ela, semear usuário com senha conhecida tem exatamente o risco de vazamento do bypass que a análise descartou |

### Detalhes que a implementação fechou

- **Uma só resposta para toda credencial inválida.** E-mail inexistente, e-mail
  malformado e senha errada devolvem o **mesmo** `401`, com o mesmo corpo — e
  pagam o **mesmo custo de hashing**, verificando contra um hash argon2 de um
  valor que ninguém conhece. Sem isso, o cronômetro desfaz o que a mensagem
  idêntica protege. Distinguir os casos entregaria ao atacante um oráculo de
  "este e-mail tem conta aqui", que numa plataforma de bairro **é** o dado
  pessoal.
- **O cadastro decide o papel; o corpo da requisição não.** `register` é
  endpoint aberto: um campo `roles` no corpo estaria a uma requisição da
  escalação de privilégio. Quem se cadastra é `TUTOR`.
- **O refresh token é aleatório e opaco, não um JWT**, e só o SHA-256 dele chega
  ao banco. Aleatório porque nada precisa ser lido de dentro dele — ele é
  procurado em `refresh_tokens`. SHA-256 e não argon2 porque a entrada já tem
  256 bits de entropia: o custo do argon2 existe para retardar adivinhação de
  senha humana, e aqui não há o que adivinhar.
- **Duas check constraints escritas à mão**, no precedente da `pd-11`:
  `email = lower(email)` — que é o que faz o índice único significar "uma
  pessoa, uma conta", e não "uma grafia, uma conta" — e `roles` não vazio, já
  que um conjunto vazio nunca intersecta e a linha autenticaria para ser negada
  em todo lugar.
- **Os guards nascem disponíveis, não globais.** Hoje **todo** endpoint é
  público por desenho (`catalog`, `stores`, `offers`, `waitlist`, `health`).
  Torná-los globais obrigaria a marcar `@Public()` em tudo que já existe e
  arriscaria o comparador. O decorator `@Public()` já existe e o `AuthGuard` já
  o honra, então a inversão é uma linha em `app.module.ts` quando o primeiro
  endpoint autenticado chegar.
- **Auditoria não se aplica nesta entrega.** O `SECURITY` nomeia as quatro
  mutações que exigem rastro no MVP — preço de oferta, aceite/recusa de pedido,
  tabela de comissão, categoria de produto — e **nenhuma nasce aqui**. A tabela
  `audit_log` e o `Audit` interceptor nascem com a primeira delas. Em troca, os
  eventos de authn (login concedido, login negado, refresh rotacionado, logout)
  vão para o logger estruturado, **sem senha, hash, token ou e-mail**.

### Defaults reversíveis

- Access token: **15 minutos**. Refresh: **30 dias**. Ambos por variável de
  ambiente, com esses defaults.
- Senha: **mínimo 10 caracteres**, sem exigência de composição. Comprimento
  supera composição quando o hash é forte, e regra de composição empurra o
  usuário para `Senha@123`. Máximo de 128 caracteres, porque argon2 processa
  bytes e entrada ilimitada é trabalho grátis para o atacante.
- E-mail normalizado (trim + minúsculas) antes de gravar e comparar. Sem remoção
  de pontos nem de `+tag`: são regras de aliasing específicas de provedor, e
  aplicá-las fundiria dois endereços que o dono considera distintos.

## Alternativas consideradas

- **Bypass de autenticação em desenvolvimento** (`AUTH_DISABLED`, header
  `X-Dev-User`, guard que devolve `true`) — descartado. É caminho de código que
  não existe em produção; o dia em que a variável vaza para o ambiente errado é
  o dia em que a API não tem autenticação. Os usuários semeados dão o mesmo
  conforto exercitando **o código real**.
- **Puxar Google OAuth ou a autorização fina para dentro da `pd-12`** —
  descartado pelo Victor no portão. Teria reaberto decisão de segurança dentro
  da implementação (vinculação de conta; `OWNER` × `OPERATOR`).
- **Cookie `httpOnly` em vez de Bearer** — descartado por A6. Ganharia se
  houvesse tela server-rendered autenticada, e não há.
- **Refresh token sem persistência (JWT auto-contido)** — descartado por A7:
  torna o logout decorativo.
- **Pacote `argon2` com node-gyp** — descartado por A5. Fica registrado como o
  plano B **se** o binário pré-compilado falhar em alguma plataforma de deploy;
  o que não se troca é o algoritmo.
- **Senha aleatória por usuário no seed, impressa no fim da execução** —
  descartada pelo Victor (P2): atrito diário sem ganho, num arquivo que é
  público de qualquer forma.
- **Marcar `@Public()` em todos os endpoints existentes e tornar os guards
  globais agora** — descartado; ver R3 nas consequências.

## Consequências

**Positivas**

- A pergunta que originou a tarefa tem resposta: três contas de
  desenvolvimento, com papéis diferentes, criadas pelo seed versionado.
- A escrita de ofertas pelo lojista deixa de estar bloqueada por falta de
  identidade.
- `AuthGuard` e `RolesGuard` chegam **testados** — inclusive contra token
  autêntico com claims que não são nossas — antes de existir o primeiro endpoint
  que depende deles.
- Duas contradições do `AUTHENTICATION` com o `DOMAIN_MODEL` foram corrigidas em
  vez de propagadas.

**Negativas, aceitas**

- 🔴 **Login sem recuperação de acesso** (A4). Quem esquece a senha fica
  trancado. Aceito por prazo limitado — no piloto os usuários são semeados e o
  Victor tem acesso ao banco — e registrado no backlog com gatilho **"primeiro
  usuário real fora do seed"**, não como "algum dia".
- **`@node-rs/argon2` é dependência com binário por plataforma.** Funciona no
  Windows do desenvolvimento e no Linux do CI; um alvo de deploy exótico pode
  exigir o plano B.
- **Guards não-globais podem ser esquecidos** (R3): o primeiro endpoint
  autenticado pode nascer sem `@UseGuards` e ninguém perceber. Registrado no
  backlog com gatilho *primeiro endpoint autenticado*, para reavaliar a
  inversão.
- **`JWT_SECRET` é obrigatória e sem default**, então quem não atualizar o
  `.env` local **não sobe a API**. É deliberado: segredo com default é segredo
  que vai para produção. A API falha rápido nomeando a variável, sem ecoar
  valor.
- **A senha de desenvolvimento está num repositório público.** É aceitável
  exatamente — e somente — enquanto a recusa em produção existir. Se essa
  recusa cair, a senha vira credencial real exposta e precisa ser trocada na
  hora.

## Status

`stable`
