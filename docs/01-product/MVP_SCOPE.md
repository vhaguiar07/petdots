---
title: PetDots — MVP Scope
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Define o recorte do MVP do PetDots (Fase 1 — Fundação: Vida do Pet):
  o que está dentro e o que está fora do escopo, as capacidades entregues
  e os critérios de saída que validam o encerramento desta fase.
relates_to:
  - 00-foundation/PRODUCT_ROADMAP.md
  - 00-foundation/SUCCESS_METRICS.md
  - 01-product/DOMAIN_MODEL.md
  - 01-product/PERSONAS.md
type: product
---

# PetDots — MVP Scope

---

## Objetivo do MVP

O MVP do PetDots corresponde à **Fase 1 — Fundação: Vida do Pet** do
[PRODUCT_ROADMAP](../00-foundation/PRODUCT_ROADMAP.md).

O objetivo é construir o **núcleo do produto centrado na gestão completa da vida
do pet pelo Tutor**: cadastrar Pets, registrar Eventos na Timeline, organizar
documentos na Carteira Digital e receber lembretes e alertas. Tudo em um único
lugar, com o Tutor como dono dos dados.

> **Marco de sucesso:** o Tutor consegue gerenciar toda a vida do seu Pet a
> partir de um único lugar, sem perder nenhuma informação.

O MVP não inclui parceiros comerciais, marketplace, ERP, IA dedicada ou ONGs —
essas capacidades pertencem às fases seguintes do roadmap.

---

## Personas atendidas

| Persona                  | Prioridade |
| ------------------------ | ---------- |
| Tutor de Pet             | P1         |
| Tutor com Múltiplos Pets | P1         |

---

## Dentro do escopo (In scope)

Capacidades entregues no MVP, alinhadas ao Domínio (ver
[DOMAIN_MODEL](DOMAIN_MODEL.md)):

| # | Capacidade | Entidades de Domínio |
|---|-----------|----------------------|
| 1 | **Cadastro de Tutor** — registro, autenticação segura e controle de acesso | `Tutor` |
| 2 | **Cadastro de Pet** — espécie, raça, data de nascimento, foto, Pet ID estável | `Pet`, `PetId` |
| 3 | **Múltiplos Pets por Tutor** — gerenciamento de N pets em uma conta; compartilhamento com familiares | `Tutor ↔ Pet` (N:N) |
| 4 | **Timeline cronológica** — registro e visualização de Eventos (vacinas, consultas, cirurgias, exames, vermifugações, medicamentos, etc.) | `Timeline`, `Evento` |
| 5 | **Carteira Digital** — upload e organização de documentos, receitas, atestados, carteira de vacinação | `Carteira Digital` |
| 6 | **Histórico centralizado** — visão completa da vida do Pet (Timeline + Carteira Digital) | `Histórico do Pet` |
| 7 | **Lembretes e alertas** — configuração e disparo de alertas para vacinas, medicamentos e consultas; lembrete cumprido gera Evento na Timeline | `Evento` |
| 8 | **Autenticação e controle de acesso** — o Tutor controla quem acessa os dados de cada Pet | `Tutor` (ownership) |
| 9 | **Pet ID estável** — identificador único e permanente do animal, imutável ao longo da vida no ecossistema | `PetId` |

### Invariantes do domínio respeitadas no MVP

- Todo Pet tem exatamente uma Timeline e uma Carteira Digital.
- O Pet ID é imutável.
- O Tutor é o dono dos dados — acesso de terceiros requer autorização explícita.
- Um Pet deve ter ao menos um Tutor responsável a qualquer momento.

---

## Fora do escopo (Out of scope)

As capacidades abaixo **não fazem parte do MVP**. Pertencem a fases subsequentes
do [PRODUCT_ROADMAP](../00-foundation/PRODUCT_ROADMAP.md):

| Capacidade | Fase do Roadmap | Justificativa |
|-----------|-----------------|---------------|
| Perfis de Parceiros (Clínicas, Veterinários, Pet Shops, Prestadores de Serviço, Laboratórios) | Fase 2 | Lado B2B do ecossistema — exige base de Tutores validada |
| Busca e descoberta de profissionais/serviços | Fase 2 | Depende de catálogo de Parceiros |
| Agendamento online (Tutor → Parceiro) | Fase 2 | Depende de perfis de Parceiros |
| Avaliações e reputação de Parceiros | Fase 2 | Depende de Agendamentos concluídos |
| Portal Empresarial e ERP para Clínicas | Fase 3 | Aprofundamento B2B — fora do foco do MVP |
| API para parceiros e integrações externas | Fase 3 | Após maturação da relação com Clínicas |
| Marketplace de produtos e catálogo de Pet Shops | Fase 4 | Monetização via comércio — pós-fidelização |
| Programa de fidelidade e campanhas patrocinadas | Fase 4 | Depende de marketplace ativo |
| IA dedicada (recomendações personalizadas, assistente de saúde, alertas preditivos por IA) | Fase 5 | Diferenciação por inteligência — exige base de dados consolidada |
| Busca semântica por histórico e sumário de saúde gerado por IA | Fase 5 | Depende de IA transversal |
| Perfil institucional de ONGs e campanhas de adoção | Fase 6 | Impacto social — expansão futura |
| Integração de Laboratórios (resultados de exames automáticos) | Fase 6 | Infraestrutura para laboratórios veterinários — expansão futura |
| Seguradoras de pet | Fase 6 | Expansão futura |

> **Nota sobre IA no MVP:** embora o PetDots seja AI-first, a Fase 1 usa IA de
> forma **transversal e discreta** (ex.: sugestão de categorias de Evento, datas
> prováveis de próximas vacinas por histórico simples). Uma frente de IA dedicada
> — com recomendações personalizadas, assistente de saúde e alertas preditivos
> complexos — é Fase 5.

---

## Critérios de saída do MVP

O MVP é considerado **concluído e validado** quando os critérios abaixo forem
atendidos, alinhados às metas da Fase 1 em
[SUCCESS_METRICS](../00-foundation/SUCCESS_METRICS.md):

### Critérios funcionais (produto entregue)

- [ ] Tutor pode se cadastrar, autenticar e recuperar acesso.
- [ ] Tutor pode cadastrar ≥1 Pet com dados completos (espécie, raça, data de
      nascimento, foto).
- [ ] Tutor pode registrar Eventos na Timeline do Pet (categorias: vacina,
      consulta, cirurgia, exame, vermifugação, medicamento, outros).
- [ ] Tutor pode fazer upload de documentos na Carteira Digital do Pet.
- [ ] Tutor pode visualizar o Histórico completo do Pet (Timeline + Carteira
      Digital) de forma cronológica.
- [ ] Tutor pode configurar lembretes; lembrete cumprido gera Evento na Timeline.
- [ ] Tutor pode gerenciar múltiplos Pets e compartilhar acesso com familiares.
- [ ] Pet ID é gerado, persistido e imutável desde o cadastro.

### Critérios de ativação (North Star — Fase 1)

Referência: **North Star** = Tutores Ativos Recorrentes com a vida do pet
centralizada no PetDots (definição em SUCCESS_METRICS).

Um **Tutor Ativo Recorrente** é aquele que:

1. Possui ao menos um Pet com cadastro completo (espécie, raça, data de nascimento).
2. Registrou ao menos um Evento na Timeline do Pet nos últimos 30 dias.
3. Retornou à plataforma em pelo menos 2 semanas distintas no último mês.

| Critério | Meta direcional |
|---------|-----------------|
| **Pets com cadastro completo** | ≥ 80% dos Pets cadastrados com espécie + raça + data de nascimento |
| **Taxa de ativação D7** | Crescimento consistente semana a semana (baseline a definir nos primeiros 30 dias) |
| **Primeiro Evento registrado** | A definir — referência a ser estabelecida nos primeiros 30 dias |
| **NPS de Tutores** | Positivo (> 0) como indicador mínimo de satisfação |
| **North Star (recorrência)** | Crescimento consistente semana a semana após o lançamento |

### Critérios de qualidade e segurança

- [ ] Autenticação segura implementada e testada.
- [ ] Controle de acesso: apenas o Tutor e autorizados visualizam os dados do Pet.
- [ ] Dados de Pets e Eventos persistem corretamente (sem perda).
- [ ] Exportação básica do Histórico do Pet disponível ao Tutor (portabilidade).

### Sinal de saída

> O MVP está validado quando: (a) o produto está em produção com as capacidades
> funcionais acima; (b) os critérios de ativação estão sendo monitorados e
> mostram crescimento consistente; (c) o NPS de Tutores é positivo; e (d) não há
> bloqueadores críticos de qualidade ou segurança em aberto.

A partir da validação do MVP, o time está autorizado a iniciar o planejamento da
**Fase 2 — Ecossistema de Saúde e Serviços**.

---

## Relação com outros documentos

| Documento | Relação |
|-----------|---------|
| [PRODUCT_ROADMAP](../00-foundation/PRODUCT_ROADMAP.md) | O MVP = Fase 1 do roadmap. Delimita horizonte e capacidades. |
| [SUCCESS_METRICS](../00-foundation/SUCCESS_METRICS.md) | Define North Star e metas de ativação/recorrência usadas nos critérios de saída. |
| [DOMAIN_MODEL](DOMAIN_MODEL.md) | Define as entidades (Pet, Tutor, Timeline, Carteira Digital, Evento) entregues no MVP. |
| [PERSONAS](PERSONAS.md) | Personas P1 (Tutor) são as únicas atendidas no MVP. |
