---
title: Product Roadmap
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Define as fases de evolução do ecossistema PetDots, organizadas por
  prioridade de personas, capacidades entregues e marcos de sucesso.
  Alinhado à Jornada de Evolução de PERSONAS.md e ao Domain Model.
relates_to:
  - 00-foundation/PRODUCT_VISION.md
  - 00-foundation/BUSINESS_MODEL.md
  - 01-product/PERSONAS.md
  - 01-product/DOMAIN_MODEL.md
type: foundation
---

# Product Roadmap

---

## Objetivo

Este documento define as fases de evolução do PetDots ao longo do tempo.

Cada fase está alinhada à Jornada de Evolução descrita em
[PERSONAS.md](../01-product/PERSONAS.md), respeitando a mesma ordem de
prioridade: P1 (Tutores) → P2 (Saúde e Serviços) → P3 (Comércio) → P4
(Impacto Social).

A entrada de novas personas, capacidades e modelos de negócio acompanha a
maturidade do ecossistema e o crescimento da base de usuários.

---

## Princípios de priorização

- O Tutor é o principal beneficiado em todas as fases.
- Novas personas entram somente depois que a base da fase anterior estiver
  validada.
- O marketplace é uma capacidade futura — não é o núcleo do produto.
- IA é transversal: permeia todas as fases, mas se torna uma frente dedicada
  a partir da Fase 5.

---

## Fases

---

### Fase 1 — Fundação: Vida do Pet (Tutores)

**Personas atendidas:** Tutor de Pet, Tutor com Múltiplos Pets (P1)

**Horizonte:** MVP — produto inicial

#### Objetivo

Construir o núcleo do produto centrado na gestão completa da vida do pet pelo
tutor. Entregar valor imediato, gerar recorrência de uso e validar os
fundamentos do domínio (Pet, Timeline, Carteira Digital, Histórico).

#### Capacidades entregues

- Cadastro de pet (espécie, raça, data de nascimento, foto).
- Pet ID estável — identificador único e permanente do animal.
- Timeline cronológica de eventos (vacinas, consultas, cirurgias, exames,
  vermifugações, etc.).
- Carteira Digital — documentos, receitas, atestados, carteira de vacinação.
- Lembretes e alertas inteligentes (vacinas, medicamentos, consultas).
- Gerenciamento de múltiplos pets e compartilhamento com familiares.
- Histórico clínico centralizado.
- Autenticação segura e controle de acesso pelo tutor.

#### Marco

> O tutor consegue gerenciar toda a vida do seu pet a partir de um único
> lugar, sem perder nenhuma informação.

---

### Fase 2 — Ecossistema de Saúde e Serviços (Veterinários, Clínicas e Prestadores)

**Personas atendidas:** Médico Veterinário, Clínica Veterinária, Prestador de
Serviço (P2)

**Horizonte:** Expansão inicial do ecossistema

#### Objetivo

Integrar os profissionais de saúde e prestadores de serviço ao ecossistema,
gerando valor bilateral: o tutor encontra parceiros de confiança; o parceiro
conquista novos clientes e organiza sua operação.

#### Capacidades entregues

- Perfil profissional de veterinários e prestadores de serviço.
- Perfil de clínica veterinária com catálogo de serviços.
- Busca e descoberta de profissionais e serviços por localização.
- Agendamento online (tutor → parceiro).
- Avaliações e reputação de parceiros.
- Integração entre Agendamento e Timeline do Pet (eventos gerados
  automaticamente ao concluir um atendimento).
- Comunicação básica entre tutor e parceiro.
- Gestão de agenda para veterinários e prestadores.

#### Marco

> O tutor agenda um serviço pelo app e o evento é registrado automaticamente
> na Timeline do seu pet.

---

### Fase 3 — Aprofundamento B2B: ERP para Clínicas e Empresas

**Personas atendidas:** Clínica Veterinária (aprofundamento de ERP) (P2)

**Horizonte:** Maturação da relação com clínicas

#### Objetivo

Oferecer às clínicas e empresas veterinárias ferramentas de gestão operacional
(ERP), tornando o PetDots parte crítica da operação dos parceiros e
fortalecendo o efeito de rede via integração de dados.

#### Capacidades entregues

- Portal Empresarial para clínicas (dashboard, métricas, financeiro básico).
- ERP veterinário: gestão de pacientes, prontuários, agenda avançada,
  controle de estoque básico.
- Integração de prontuário clínico com o Histórico do Pet (com consentimento
  do tutor).
- Planos premium B2B: acesso a funcionalidades avançadas de gestão.
- Relatórios e análises de operação para clínicas.
- API para parceiros: integração com sistemas externos de clínicas.

#### Marco

> A clínica opera sua agenda, prontuários e financeiro pelo PetDots, e os
> dados chegam automaticamente ao histórico do pet com autorização do tutor.

---

### Fase 4 — Comércio: Pet Shops e Marketplace

**Personas atendidas:** Pet Shop (P3)

**Horizonte:** Monetização via comércio

#### Objetivo

Abrir o ecossistema para o comércio de produtos pet, integrando pet shops e
ampliando as fontes de receita da plataforma. O marketplace é construído sobre
a base de tutores já fidelizados nas fases anteriores.

#### Capacidades entregues

- Perfil e catálogo de produtos de pet shops.
- Marketplace de produtos: busca, compra e entrega.
- Promoções e campanhas patrocinadas.
- Programa de fidelidade integrado.
- Destaque patrocinado de parceiros comerciais.
- Comissão sobre transações do marketplace.
- Histórico de compras vinculado ao perfil do pet (ex.: ração comprada
  registrada no histórico).

#### Marco

> O tutor compra ração no marketplace e o produto fica registrado no perfil
> de alimentação do pet.

---

### Fase 5 — IA Transversal (Todas as Personas)

**Personas atendidas:** Tutor, Veterinários, Clínicas, Prestadores, Pet Shops
(P1–P3)

**Horizonte:** Diferenciação por inteligência

#### Objetivo

Tornar a IA uma camada de inteligência que permeia toda a experiência do
ecossistema — recomendações personalizadas, alertas proativos, assistência ao
veterinário e insights de negócio para parceiros.

#### Capacidades entregues

- Recomendações personalizadas de serviços, produtos e cuidados baseadas no
  perfil e histórico do pet.
- Alertas proativos inteligentes: predição de vacinas em atraso, medicamentos
  a vencer, exames recomendados por raça/idade.
- Assistente de saúde do pet: perguntas e respostas contextualizadas ao
  histórico do animal.
- Análise de prontuário assistida por IA para veterinários.
- Insights de operação para clínicas e pet shops (churn de clientes,
  produtos mais vendidos por perfil de pet).
- Busca semântica por histórico e eventos do pet.
- Geração automática de sumário de saúde do pet.

#### Marco

> O tutor recebe um alerta personalizado indicando que seu pet precisa de
> vermifugação com base no histórico e na raça do animal.

---

### Fase 6 — Impacto Social: ONGs e Expansões

**Personas atendidas:** ONG e novos parceiros sociais (P4)

**Horizonte:** Expansão de impacto

#### Objetivo

Ampliar o ecossistema para organizações de bem-estar animal, promovendo adoção,
campanhas de castração, divulgação de eventos e captação de voluntários.
Abre também a porta para expansões futuras (laboratórios, seguradoras e novos
parceiros).

#### Capacidades entregues

- Perfil institucional de ONGs.
- Divulgação de campanhas de adoção, castração e educação.
- Eventos comunitários no app (feiras de adoção, ações sociais).
- Captação de voluntários e doadores.
- Integração de adoção com cadastro de pet (Pet ID atribuído ao novo tutor).
- Infraestrutura para laboratórios veterinários (integração de resultados de
  exames ao Histórico do Pet) — expansão futura.
- Infraestrutura para seguradoras de pet — expansão futura.

#### Marco

> Um pet adotado via ONG já chega ao novo tutor com seu PetDots ativo,
> histórico migrado e carteira digital pronta para continuar.

---

## Visão temporal

| Fase   | Foco                              | Personas principais                   | Monetização                        |
| ------ | --------------------------------- | ------------------------------------- | ---------------------------------- |
| Fase 1 | Vida do Pet — MVP                 | Tutores                               | Nenhuma (crescimento)              |
| Fase 2 | Ecossistema de saúde e serviços   | Veterinários, Clínicas, Prestadores   | Comissão sobre agendamentos        |
| Fase 3 | ERP B2B para clínicas             | Clínicas                              | Planos premium B2B                 |
| Fase 4 | Marketplace de produtos           | Pet Shops                             | Comissão sobre marketplace         |
| Fase 5 | IA transversal                    | Todas (P1–P3)                         | Premium AI, insights B2B           |
| Fase 6 | Impacto social e expansões        | ONGs, Laboratórios, Seguradoras       | APIs comerciais, parcerias         |

---

## Relação com outros documentos

- **PERSONAS.md** — define a Jornada de Evolução que orienta a sequência das
  fases deste roadmap.
- **DOMAIN_MODEL.md** — define as entidades (Pet, Timeline, Carteira Digital,
  Parceiro, Agendamento) entregues nas fases.
- **PRODUCT_VISION.md** — orienta o propósito de cada fase.
- **BUSINESS_MODEL.md** — detalha fontes de receita e estratégia de
  monetização por horizonte temporal.

---

## Revisão Contínua

Este roadmap deve ser revisado sempre que houver mudança de prioridade
estratégica, validação (ou invalidação) de hipóteses de produto, ou entrada de
novos segmentos no ecossistema.

A sequência de fases pode ser acelerada, mesclada ou reordenada conforme
aprendizados do mercado — desde que o princípio de prioridade de personas
(P1 → P2 → P3 → P4) seja mantido.
