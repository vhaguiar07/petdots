---
title: User Journeys
status: stable
version: "2.5"
updated: 2026-09-12
scope: >
  Jornadas passo a passo dos usuários do PetDots no MVP marketplace, para as
  duas personas P1 (tutor e lojista). Cada jornada lista ator, objetivo, passos,
  eventos de domínio disparados e capacidades envolvidas. Responde "como o
  usuário percorre o produto"; não descreve as personas (PERSONAS) nem as
  funcionalidades (FEATURE_CATALOG).
relates_to:
  - 01-product/PERSONAS.md
  - 01-product/CAPABILITIES.md
  - 01-product/FEATURE_CATALOG.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/MVP_SCOPE.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 02-architecture/TECHNOLOGY_STACK.md
type: product
---

# PetDots — User Journeys

> **v2.0 (2026-09-10).** Reescrito na `pd-07`. A v1.0 (jun/2026) descrevia seis
> jornadas do produto "Vida do Pet" (criar pet e ver a Timeline, registrar
> evento, guardar documento na Carteira, cumprir lembrete de vacina,
> compartilhar pet, exportar histórico) e disparava eventos que o
> [`DOMAIN_MODEL`](./DOMAIN_MODEL.md) v2.0 não tem. Nenhuma delas era de compra,
> comparação de preço ou reposição.
>
> ⚠️ **Atenção especial à última seção.** A v1.0 definia aqui as jornadas que o
> spike-gate do cliente universal deveria validar — e listava viewer de
> documento e Timeline densa, telas que o ADR-0004 tirou do escopo. O texto
> **autoritativo** do spike sempre foi o do
> [`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md); esta versão
> aponta para ele em vez de redefinir o critério.

---

## Objetivo

Descreve as **jornadas** — os fluxos passo a passo — das duas personas P1 do
MVP: o **tutor** e o **lojista**. O [`DOMAIN_MODEL`](./DOMAIN_MODEL.md) delega
explicitamente a este documento os fluxos de tela e jornadas.

**Não cobre:** quem são os perfis → [`PERSONAS`](./PERSONAS.md); o que são as
funcionalidades → [`FEATURE_CATALOG`](./FEATURE_CATALOG.md); as entidades →
`DOMAIN_MODEL`; a orquestração técnica →
[`SYSTEM_ARCHITECTURE`](../02-architecture/SYSTEM_ARCHITECTURE.md) §"Fluxos
principais".

Cada jornada segue o formato: **Ator · Objetivo · Passos · Eventos de domínio ·
Capacidades**.

> Os eventos citados são **exclusivamente** os da lista canônica do
> `DOMAIN_MODEL` §"Eventos de domínio". Jornada que precise de um evento que não
> existe lá é sinal de que falta modelagem — registrar, não inventar o nome.

---

## O ciclo que as jornadas formam

```
J6 (loja entra)  →  J2 (tutor compara)  →  J3 (tutor compra)  →  J4 (loja atende)
                                                                        │
                            J5 (lembrete traz o tutor de volta)  ←──────┘
```

J1 e J9 alimentam a entrada de tutores; J7 é a variante em que o próprio lojista
traz o cliente; J8 é o que mantém a loja confiando na plataforma.

---

## Jornadas do MVP — Tutor

### J1 — Onboarding: conta, pet e a primeira projeção

> ⏳ **Parcial — três dos seis passos.** ✅ **Cadastro, endereço e pet existem
> pela interface** desde a `pd-14` (ADR-0015): `/cadastro`, `/conta/endereco`,
> `/conta/pets/novo` e `/conta/pets/{id}` no `apps/app`. ⏳ **Produto consumido,
> projeção e agenda** continuam fora — são a capacidade 9. Ver
> [`PERFIL_DO_TUTOR_E_PETS`](../08-features/tutors/PERFIL_DO_TUTOR_E_PETS.md) e
> [`IDENTIDADE_E_ACESSO`](../08-features/identity/IDENTIDADE_E_ACESSO.md).

- **Ator:** Tutor · **Objetivo:** começar a usar o app e receber valor no primeiro uso.
- **Passos:** cadastra-se (e-mail/senha ou Google) → informa endereço com bairro e CEP → cadastra o pet (espécie, nascimento, **peso**) → informa o produto que o pet consome e o tamanho da embalagem → o app calcula os gramas/dia e mostra a projeção ("seu saco de 15 kg dura 42 dias") → a agenda de reposição é criada.
- **Eventos:** `tutor.created`, `pet.created`.
- **Capacidades:** C1 (Identidade & Acesso), C2 (Perfil & Pets), C9 (Reposição Inteligente).
- **Por que assim:** a calculadora é o truque de onboarding — entrega valor sem exigir que o tutor tenha disciplina nem que exista qualquer loja cadastrada.
- **Como ficou, e o que falta:**
  - o cadastro cria **`User` e mais nada** (ADR-0011, A10); o perfil é o passo
    seguinte, `PUT /tutors/me`, e o onboarding leva a pessoa até lá
    automaticamente — mas **nunca bloqueia**: toda tela tem "Fazer depois";
  - o endereço pede **rua, número, bairro e CEP** (complemento e referência
    opcionais), e não só bairro e CEP: é o destino da entrega de J3, e pedir a
    rua depois criaria um segundo formulário no checkout;
  - o **nascimento é opcional** — muitos tutores não sabem a data;
  - ✅ **o endereço já entrega valor sozinho:** quem tem perfil e abre um produto
    no comparador vê o **CEP pré-preenchido**, ou seja, quem entrega na casa dela
    e por quanto (ADR-0015, D8). É o valor de primeiro uso que esta metade da
    jornada consegue dar sem a calculadora;
  - ⚠️ **a projeção não existe, e não é esquecimento.** A regra "peso +
    embalagem → gramas/dia" **não está definida em documento nenhum** do
    repositório — `IDEACAO_FASE1 §17`, `DOMAIN_MODEL`, `MVP_SCOPE` e `GLOSSARY`
    só a nomeiam. Ela é a capacidade 9 e **exige ADR próprio com a fonte da
    tabela de consumo** antes de virar código. Até lá o peso do pet é dado
    coletado e não consumido.

### J2 — Comparar preço no bairro

> ✅ **Implementada na landing** (`pd-11`, 11/09/2026) — `/precos` (busca) e
> `/precos/{slug}` (comparação) — **e também em `apps/app`** (`pd-13`,
> 12/09/2026): `/`, `/precos/{slug}` e `/loja/{id}`, a vitrine da loja. Ver
> [`COMPARADOR_DE_PRECOS`](../08-features/comparador/COMPARADOR_DE_PRECOS.md).

- **Ator:** Tutor ou visitante não autenticado · **Objetivo:** saber quanto custa o produto perto de casa.
- **Passos:** busca o produto por nome ou marca (no app ou numa página pública da landing) → informa ou confirma o endereço → vê as ofertas das lojas que **entregam nesse endereço**, ordenadas por preço, cada uma com preço, taxa de entrega e prazo → escolhe uma loja.
- **Eventos:** nenhum — é leitura.
- **Capacidades:** C6 (Comparador), C5 (Oferta), C10 (Entrega).
- **Por que assim:** tem valor mesmo para quem não compra pelo app, e é a porta de entrada orgânica ("ração X 15 kg preço no Méier").
- **Como ficou, e o que falta:**
  - o endereço é **bairro ou CEP**, não endereço completo — é o que as áreas de entrega sabem responder;
  - "ordenadas por preço" virou **preço entregue** (item + taxa), porque ordenar só pelo item premiaria quem cobra a corrida (ADR-0010);
  - aparecem as lojas com `status ≠ PAUSED` — antes do checkout, o produto é um guia de preços, e exigir `ACTIVE` esconderia todas elas;
  - **"escolhe uma loja" já leva a algum lugar no app** desde a `pd-13`: o nome da loja abre `/loja/{id}`, com as áreas de entrega e a prateleira dela;
  - ⚠️ **mas ainda não leva a uma compra.** J3 não existe: sem carrinho, sem checkout, sem pagamento. A vitrine diz o preço e para aí.

### J3 — Comprar e receber

- **Ator:** Tutor · **Objetivo:** comprar sem sair de casa.
- **Passos:** monta o carrinho **de uma loja** → confirma o endereço (validado contra as áreas de entrega ativas da loja) → vê o total com taxa de entrega e taxa de serviço → paga por Pix → o pedido é criado e a loja é avisada → acompanha os status até a entrega.
- **Eventos:** `order.placed`, `payment.captured` (ou `payment.failed`), depois os de J4.
- **Capacidades:** C7 (Pedido), C8 (Pagamento & Repasse), C10 (Entrega), C11 (Notificações).
- **Não negociável:** o pedido só é dado como pago pelo **webhook** do PSP, nunca pelo retorno do cliente.
- **Fora do horário de funcionamento da loja, o pedido não é criado** — o checkout recusa antes de cobrar, dizendo quando ela abre ([ADR-0014](../06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md)). Cobrar para depois auto-recusar seria criar o problema que aquele ADR existe para evitar.
- **O tutor cancela livremente enquanto a loja não aceitou**, com devolução total automática. Depois do aceite, o cancelamento passa pela loja.

### J5 — Recomprar pelo lembrete

- **Ator:** Tutor · **Objetivo:** não deixar faltar.
- **Passos:** a projeção indica que o produto está acabando → o tutor recebe o lembrete (push ou WhatsApp) → abre e vê o item com o preço atual nas lojas do bairro → segue por J3 → após a entrega, a projeção é recalculada com a data real da compra.
- **Eventos:** `replenishment.due`, `reminder.sent`, depois os de J3; `order.delivered` fecha o ciclo recalculando a agenda.
- **Capacidades:** C9 (Reposição), C11 (Notificações), C6, C7.
- **Por que é a jornada mais importante do MVP:** é o motor **desenhado** da recorrência. Sem ela, a compra mensal faz o app ser esquecido entre duas compras.

### J7 — Comprar pelo QR da loja (cliente próprio)

- **Ator:** Tutor cliente de uma loja específica · **Objetivo:** comprar da "sua" loja pelo app.
- **Passos:** escaneia o QR do balcão ou abre o link que a loja mandou no WhatsApp → cai direto na vitrine daquela loja → segue por J3.
- **Eventos:** os mesmos de J3; o pedido nasce com `acquisition_channel = STORE_REFERRAL`.
- **Capacidades:** C13 (Aquisição), C7, C8.
- **Regra de negócio:** este pedido **não paga comissão**. É o que transforma o WhatsApp do lojista de concorrente em canal.

### J9 — Entrar na lista de espera

- **Ator:** Visitante · **Objetivo:** ser avisado quando o PetDots chegar ao seu bairro.
- **Passos:** chega pela landing "chegando ao bairro X" (ou tenta comprar e o endereço está fora de área) → deixa nome, telefone, bairro e CEP → é avisado quando houver cobertura.
- **Eventos:** `waitlist.joined`.
- **Capacidades:** C13 (Aquisição & Lista de Espera).
- **Para que serve:** mede apetite antes de o app existir e escolhe o próximo bairro.

---

## Jornadas do MVP — Lojista

### J6 — Onboarding da loja

- **Ator:** Lojista (dono) · **Objetivo:** colocar a loja para vender no app.
- **Passos:** cadastra a loja (`PROSPECT`) → envia dados e documentos, e a subconta é criada no PSP (`ONBOARDING`) → define as áreas de entrega (bairros e faixas de CEP, com taxa e prazo) → percorre o catálogo mestre marcando o que tem e informando preço → a loja é ativada (`ACTIVE`) quando há ao menos uma área ativa, uma oferta disponível e a subconta → recebe o código de indicação e o QR para o balcão.
- **Eventos:** `store.onboarded`; `offer.price_changed` e `offer.availability_changed` conforme trabalha as ofertas.
- **Capacidades:** C4 (Loja & Onboarding), C5 (Oferta), C10 (Entrega), C13.
- **Por que assim:** o lojista **não cadastra produto** — só declara "tenho" e o preço. É o atrito que o catálogo mestre existe para remover (mil a cinco mil SKUs por loja).

### J4 — Atender o pedido

- **Ator:** Lojista (dono ou operador) · **Objetivo:** vender e despachar.
- **Passos:** recebe o aviso do pedido novo (push e WhatsApp) → abre a fila do painel → **aceita** (ou recusa, com motivo) → separa os itens; se algum não tiver, marca indisponível ou oferece substituição → **despacha**, informando quem leva → confirma a **entrega**.
- **Eventos:** `order.accepted` ou `order.rejected` → `order.dispatched` → `order.delivered` → `payout.settled`.
- **Capacidades:** C12 (Painel do Lojista), C7 (Pedido), C10 (Entrega), C8 (Repasse), C11.
- **O que o tutor sente aqui:** o tempo até o aceite. É a métrica de oferta que mais afeta a experiência de quem comprou.
- ✅ **As pendências que esta jornada expunha foram decididas em 12/09/2026** ([ADR-0014](../06-decisions/ADR/0014-ciclo-do-dinheiro-no-pedido.md)): o Pix continua sendo capturado **antes** do aceite, e toda saída que não é entrega termina em **devolução automática**; a loja tem **agenda semanal** e **15 minutos** para aceitar, contados só com a loja aberta, com **auto-recusa** e devolução total no vencimento; item em falta vira **devolução parcial** e o pedido segue com o resto. ⏳ **Substituição assistida fica de fora** — exige um canal de conversa dentro do pedido, que o MVP não tem.

### J8 — Conferir os repasses

- **Ator:** Lojista (dono) · **Objetivo:** saber quanto vai receber, e por quê.
- **Passos:** abre a área de repasses do painel → vê a lista de pedidos com valor bruto, comissão retida, líquido e o status do repasse → confere um pedido específico item a item, com a comissão aplicada em cada linha.
- **Eventos:** nenhum — é leitura sobre `Payout` e `Order`.
- **Capacidades:** C12, C8.
- **Por que importa:** é o que sustenta a confiança do lado da oferta. O lojista aceita comissão que ele consegue conferir.
- ⚠️ **Pendência:** o MVP mostra repasse **por pedido**; extrato agregado por período não está modelado (`MVP_SCOPE` §"Pendências").

---

## Jornadas de maior risco de UX (o que o spike-gate validou)

O [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) condicionava
o cliente universal (Expo + React Native Web) a um **spike-gate**, com fallback
para Expo + Next.js. **O gate foi executado na `pd-08` e aprovado em
11/09/2026** — resultado e medições no
[ADR-0008](../06-decisions/ADR/0008-cliente-universal-expo-react-native-web.md).

> **O critério autoritativo do spike está em
> [`TECHNOLOGY_STACK`](../02-architecture/TECHNOLOGY_STACK.md) §"Spike-gate do
> cliente universal"**. Esta seção apenas **mapeia** aquele critério nas jornadas
> deste documento; em caso de divergência, vale o `TECHNOLOGY_STACK`.

| O que o spike validou | Jornada | Por que estressa o cliente universal | Como se saiu |
|---|---|---|---|
| Lista/busca de catálogo densa com comparador | **J2** | Lista longa com muitos itens, filtros e comparação lado a lado; é onde web desktop costuma ficar "mobile esticada" | 343 ofertas renderizadas sem virtualização, **60 fps** mediano; Ctrl+F alcança a última linha; tabela com `role="table"`/`row`/`cell` |
| Fluxo de checkout | **J3** | Formulário de endereço, seleção de pagamento, estados de espera do Pix | Endereço validado contra área de entrega ativa; espera do Pix com estado vivo; carrinho sobrevive a F5 |
| Painel de pedidos do lojista | **J4** | Fila com atualização frequente, ações rápidas, uso prolongado em tela grande | Fila de 40 pedidos com entrada a cada ~20 s, aceitar/recusar com motivo/item indisponível/despachar |

Em todas as três: **layout e usabilidade de desktop** e **acessibilidade** eram
parte do critério, não detalhe — e foram onde o gate se decidiu. Resultado:
**zero violações `serious`/`critical` do `axe-core`** nas três telas, ao custo de
**8 componentes-envelope** reutilizáveis e **nenhuma** anotação de acessibilidade
por elemento.

⚠️ As telas do spike (`apps/app/src/spike/`) são **descartáveis** — provaram a
plataforma, não são a UI de produto. O que sobrevive é `apps/app` e o vocabulário
de UI em `src/spike/ui/`, que as telas de produto herdam.

---

## Jornadas de fases futuras (visão)

Detalhadas quando as fases forem priorizadas:

- **Fase 2:** registrar vacina e exame no histórico do pet; guardar documento na
  carteira digital; assinar o clube; compartilhar o pet com um familiar.
- **Fase 3:** agendar banho e tosa ou consulta com um parceiro do bairro;
  avaliar o parceiro após o atendimento.
- **Fase 4:** a clínica operar agenda e prontuário no portal; a marca comprar
  destaque no comparador.
- **Fase 6:** adoção via ONG com transferência do Pet ID ao novo tutor.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Descreve as jornadas do MVP para **as duas personas P1**, com passos, eventos e capacidades.
- [x] Usa exclusivamente eventos da lista canônica do `DOMAIN_MODEL` v2.0.
- [x] Aponta as pendências de modelagem que as jornadas expõem, sem inventar mecânica.
- [x] Mapeia — sem redefinir — o critério de spike do `TECHNOLOGY_STACK`, e registra o resultado do gate (`pd-08`, 11/09/2026).
- [x] Não duplica `PERSONAS` (quem) nem `FEATURE_CATALOG` (o quê).
- [ ] Jornadas de fases futuras detalhadas quando priorizadas.
