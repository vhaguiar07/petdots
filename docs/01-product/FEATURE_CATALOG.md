---
title: Feature Catalog
status: stable
version: "2.3"
updated: 2026-09-12
scope: >
  Catálogo cross-fase de funcionalidades do PetDots, agrupadas por capacidade e
  mapeadas à fase do roadmap. As funcionalidades da Fase 1 referenciam o
  MVP_SCOPE como fonte autoritativa (não as redefine). Responde "quais
  funcionalidades existem e em que fase"; não define capacidades
  (CAPABILITIES), critérios de aceite (MVP_SCOPE) nem jornadas (USER_JOURNEYS).
relates_to:
  - 01-product/CAPABILITIES.md
  - 01-product/MVP_SCOPE.md
  - 01-product/USER_JOURNEYS.md
  - 00-foundation/PRODUCT_ROADMAP.md
type: product
---

# PetDots — Feature Catalog

> **v2.0 (2026-09-10).** Reescrito na `pd-07`. A v1.0 (jun/2026) listava como
> Fase 1 as funcionalidades de Timeline, Carteira Digital e lembretes de vacina,
> e punha o marketplace na Fase 4. Nesta versão a Fase 1 é o marketplace
> hiperlocal ([ADR-0004](../06-decisions/ADR/0004-arquitetura-mvp-marketplace.md)),
> e as funcionalidades da v1.0 aparecem nas fases 2 e 3.

---

## Objetivo

Cataloga as **funcionalidades** — comportamentos específicos, no sentido do
[GLOSSARY](../00-foundation/GLOSSARY.md) — por **capacidade** e por **fase**.

> **Estado (12/09/2026):** a implementação **começou**. A `pd-09` entregou a
> primeira fatia da **C13** — a landing pública e a captura da lista de espera
> (`source = CAMPAIGN`). A `pd-11` entregou o **eixo do comparador** em leitura:
> fatias de **C3**, **C4**, **C5** e **C6**, com quatro endpoints `GET` públicos
> e duas páginas indexáveis na landing (ADR-0010). A `pd-12` entregou a
> autenticação na API, e a `pd-13` o **login pela interface** mais a mesma J2 no
> `apps/app` — fatias de **C1** e **C6**. Tudo que é **escrita de domínio** —
> onboarding de loja, preço pelo lojista, pedido, pagamento — segue não
> implementado, porque depende de `tutors`, do `StoreScopeGuard` e do PSP. A coluna "Fase" indica o
> horizonte planejado, **não** estado de desenvolvimento; o estado do que existe
> vive em [`08-features/`](../08-features/) e no
> [`PROJECT_STATE`](../../PROJECT_STATE.md).

> **Fonte autoritativa da Fase 1:** o recorte e os critérios de aceite vivem em
> [`MVP_SCOPE`](./MVP_SCOPE.md). Aqui as funcionalidades são **listadas e
> referenciadas**, não redefinidas — evita listas concorrentes.

---

## Fase 1 — MVP marketplace (autoritativo em `MVP_SCOPE`)

| Capacidade | Funcionalidades | Referência |
|---|---|---|
| **Identidade & Acesso** (C1) — ⏳ **parcialmente entregue** | ✅ Cadastro por e-mail/senha **pela API** (argon2, JWT + refresh rotacionado — `pd-12`); ✅ **login pela interface** em `apps/app` (`/entrar`, `/conta`, sessão persistida por plataforma — `pd-13`, ver [`IDENTIDADE_E_ACESSO`](../08-features/identity/IDENTIDADE_E_ACESSO.md)); ✅ papéis `TUTOR`/`STORE_MEMBER`/`ADMIN` com identidade única acumulando papéis (verificação por interseção); ⬜ **tela** de cadastro (`pd-14`, junto com endereço e pet); ⬜ login com Google; ⬜ recuperação de acesso | MVP_SCOPE #1 |
| **Perfil do Tutor & Pets** (C2) | Endereço padrão com bairro e CEP; cadastro de pet (espécie, nascimento, **peso**); edição e exclusão; Pet ID estável | MVP_SCOPE #2, #14 |
| **Catálogo Mestre** (C3) — ⏳ **parcialmente entregue** | ✅ Produto com marca, variante, peso líquido e categoria, em leitura pública (`pd-11` — ver [`COMPARADOR_DE_PRECOS`](../08-features/comparador/COMPARADOR_DE_PRECOS.md)); ✅ bloqueio de produto que exige receita (no domínio, exercido pelo seed); ⏳ ingestão **por seed versionado**, interina — sem tela de curadoria (ADR-0010); ⬜ EANs reais (todos `null`, a conferir); ⬜ tabela de comissão por categoria historizada (entra com `orders`) | MVP_SCOPE #3 |
| **Loja & Onboarding** (C4) — ⏳ **parcialmente entregue** | ✅ `Store` mínima (`slug`, nome, bairro, `status`) e `DeliveryArea` por bairro e faixa de CEP com taxa e prazo, **em leitura** (`pd-11`); ⬜ cadastro pelo lojista, documentos, subconta no PSP, membros com papel, ativação (`ACTIVE`), código de indicação e QR, tarifa de fundador — tudo depende de `identity` e `payments` | MVP_SCOPE #4 |
| **Oferta** (C5) — ⏳ **parcialmente entregue** | ✅ Oferta (loja × produto, preço, disponibilidade) **em leitura** (`pd-11`); ⏳ semeada por arquivo versionado, não pelo lojista; ⬜ marcar "tenho", informar/atualizar preço, marcar disponível/indisponível, edição em lote — dependem do painel e de `identity` | MVP_SCOPE #5 |
| **Comparador de Preços** (C6) — ⏳ **parcialmente entregue** | ✅ Busca de produto por marca, nome e variante (coluna normalizada + `LIKE`, não full-text); ✅ listagem das ofertas das lojas que entregam no endereço, com preço, taxa e prazo; ✅ **ordenação por preço entregue** (item + taxa); ✅ página pública indexável por produto, com `sitemap.xml` e canonical (`pd-11` — ver [`COMPARADOR_DE_PRECOS`](../08-features/comparador/COMPARADOR_DE_PRECOS.md)); ✅ **a mesma jornada em `apps/app`**, com vitrine da loja (`pd-13`); ⬜ página por bairro; ⬜ página **SEO** da loja na landing (`/lojas/{slug}`) | MVP_SCOPE #5 |
| **Pedido** (C7) | Montar carrinho de uma loja; validar disponibilidade, área de entrega e loja ativa; criar pedido com `Idempotency-Key`; calcular comissão por categoria com override e comissão zero; gravar snapshot; aceitar, recusar, despachar e concluir; marcar item indisponível e oferecer substituição; acompanhar status | MVP_SCOPE #6 |
| **Pagamento & Repasse** (C8) | Criar intenção de pagamento no PSP com regra de split; pagar por Pix; receber e validar webhook assinado, idempotente por `psp_payment_id`; persistir payload para auditoria; liquidar repasse após captura; conciliação diária com o extrato do PSP | MVP_SCOPE #7 |
| **Reposição Inteligente** (C9) | Calcular gramas/dia a partir do peso do pet e da embalagem; projetar data de término; criar agenda por consumo ou por intervalo fixo; recalcular a projeção a cada entrega; ativar e desativar agenda | MVP_SCOPE #9 |
| **Entrega** (C10) | Verificar elegibilidade do endereço contra as áreas ativas da loja; calcular taxa e prazo; registrar despacho, entrega e falha; registrar custo real quando conhecido | MVP_SCOPE #8 |
| **Notificações** (C11) | Agendar e enviar lembrete de reposição, idempotente por `dedupe_key`; avisar a loja de pedido novo (push e WhatsApp); avisar o tutor das transições do pedido | MVP_SCOPE #10 |
| **Painel do Lojista** (C12) | Fila de pedidos por status; aceitar/recusar; marcar indisponibilidade; despachar; ajustar preço e disponibilidade; consultar repasses por pedido | MVP_SCOPE #11 |
| **Aquisição & Lista de Espera** (C13) — ⏳ **parcialmente entregue** | ✅ Landing "chegando ao bairro X" e formulário de lista de espera (`pd-09`, 11/09/2026 — ver [`LISTA_DE_ESPERA`](../08-features/waitlist/LISTA_DE_ESPERA.md)); ⬜ captura de endereço fora da área de entrega (`OUT_OF_AREA`, depende do checkout); ⬜ QR da loja (`STORE_QR`); ⬜ atribuição de pedido ao código de indicação da loja | MVP_SCOPE #12 |
| **Operação & Soberania de Dados** (C14) | Curadoria do catálogo, manutenção da tabela de comissão e ativação de loja sob papel `ADMIN`; exportação dos dados do tutor; solicitação de exclusão respeitada a retenção fiscal | MVP_SCOPE #13, #14 |

> **Funcionalidades que o escopo assume e que ainda não têm modelagem** —
> estorno e ajuste, prazo de aceite, cancelamento, cupom, horário de
> funcionamento, extrato de repasse, console de administração — estão listadas em
> [`MVP_SCOPE`](./MVP_SCOPE.md) §"Pendências de modelagem", com o gatilho de
> migração para o backlog. **Não** as tratar como catalogadas aqui.

---

## Fases seguintes (planejado — detalhamento quando priorizadas)

| Fase | Capacidade | Funcionalidades (visão) |
|---|---|---|
| 2 | Carteira Digital & Histórico (C15) | Upload e organização de documento; timeline cronológica de eventos do pet; visão consolidada do histórico; exportação; compartilhamento de pet entre tutores |
| 2 | Assinatura & Clube (C16) | Recompra recorrente; clube de descontos com frete; mensalidade SaaS do painel; antecipação de repasse; cartão de crédito; cupom de aquisição estruturado |
| 3 | Serviços & Agendamento (C17) | Perfil de parceiro; catálogo de serviços; busca por localização; agendamento online; comunicação tutor↔parceiro; integração agendamento → histórico do pet |
| 3 | Reputação (C18) | Avaliação de parceiro a partir de serviço concluído; exibição da reputação na descoberta |
| 4 | Portal Empresarial & ERP (C19) | Dashboard, prontuário, agenda avançada, financeiro e estoque básico; integração do prontuário ao histórico com consentimento |
| 4 | Integrações & API Pública (C20) | API para parceiros; integração com sistemas externos de clínicas e lojas |
| 4 | Retail Media & Fidelidade (C21) | Destaque pago de loja e de marca; campanhas patrocinadas; programa de fidelidade |
| 5 | Inteligência (C22) | Recomendação personalizada de reposição e produto; previsão de demanda por loja; assistente do tutor; busca semântica; sumário de saúde |
| 6 | Impacto Social & Expansões (C23) | Perfil de ONG; campanhas de adoção; adoção com transferência do Pet ID; integração de laboratórios; seguradoras |

> As funcionalidades de fases futuras são intencionalmente de **alto nível** —
> evolução incremental: detalham-se quando a fase for priorizada, não antes.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Agrupa funcionalidades por capacidade e por fase.
- [x] Referencia o `MVP_SCOPE` como fonte autoritativa da Fase 1 (sem relistar critérios).
- [x] Mantém as fases futuras em alto nível (sem antecipar detalhe).
- [x] Não duplica `CAPABILITIES` (áreas) nem `USER_JOURNEYS` (fluxos).
- [x] Distingue funcionalidade catalogada de pendência de modelagem.
- [ ] Atualizado a cada fase priorizada, detalhando suas funcionalidades.
