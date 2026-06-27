---
title: PetDots — Personas
status: draft
version: "1.1"
updated: 2026-06-27
scope: product
relates_to:
  - 05-ai/AI_CONTEXT.md
  - 01-product/DOMAIN_MODEL.md
type: product
---

# PetDots — Personas

---

# Objetivo

Este documento descreve as principais personas do ecossistema PetDots.

As personas representam os perfis de usuários para os quais o produto será desenvolvido.

Toda funcionalidade proposta deve beneficiar pelo menos uma das personas descritas neste documento.

Caso uma funcionalidade não gere valor claro para nenhuma persona, sua necessidade deverá ser reavaliada.

---

# Visão Geral

O PetDots é um ecossistema composto por diferentes participantes.

Cada participante possui objetivos, necessidades e expectativas distintas.

As personas estão divididas em dois grandes grupos:

* Usuários finais (B2C)
* Empresas e profissionais (B2B)

---

# Persona 1 — Tutor de Pet

## Descrição

É a principal persona do PetDots.

Representa qualquer pessoa responsável pelos cuidados de um ou mais animais.

Todo o produto é construído priorizando esta persona.

---

## Objetivos

* Organizar toda a vida do pet.
* Nunca esquecer vacinas ou medicamentos.
* Encontrar serviços confiáveis.
* Ter acesso rápido ao histórico do animal.
* Receber recomendações úteis.
* Facilitar a rotina de cuidados.

---

## Dores

* Informações espalhadas entre diferentes clínicas.
* Carteiras de vacinação físicas.
* Esquecimento de vacinas e consultas.
* Dificuldade para encontrar bons profissionais.
* Falta de um histórico único do pet.

---

## Necessidades

* Organização.
* Simplicidade.
* Segurança.
* Confiança.
* Facilidade de uso.

---

## Funcionalidades mais importantes

* Cadastro do pet.
* Timeline.
* Carteira Digital.
* Agenda Inteligente.
* Histórico Clínico.
* Recomendações.
* Busca de serviços.

---

## Frequência de Uso

Muito alta.

Idealmente diária.

---

# Persona 2 — Tutor com Múltiplos Pets

## Descrição

Tutor responsável por diversos animais.

Pode possuir cães, gatos ou outras espécies.

---

## Objetivos

* Gerenciar vários pets simultaneamente.
* Compartilhar responsabilidades com familiares.
* Organizar calendários individuais.
* Evitar esquecimentos.

---

## Necessidades

* Gestão centralizada.
* Compartilhamento.
* Organização.
* Visão consolidada.

---

## Funcionalidades mais importantes

* Múltiplos pets.
* Compartilhamento.
* Agenda.
* Dashboard.
* Alertas.

---

# Persona 3 — Médico Veterinário

## Descrição

Profissional responsável pelo atendimento clínico dos pets.

Pode atuar de forma independente ou vinculado a uma clínica.

---

## Objetivos

* Atender pacientes.
* Organizar agenda.
* Manter prontuários.
* Fidelizar clientes.
* Reduzir trabalho administrativo.

---

## Dores

* Agenda desorganizada.
* Histórico incompleto.
* Muito trabalho manual.
* Baixa presença digital.

---

## Necessidades

* Organização.
* Agendamento.
* Histórico integrado.
* Comunicação com tutores.

---

## Funcionalidades mais importantes

* Agenda.
* Prontuário.
* Histórico.
* Perfil profissional.

---

# Persona 4 — Clínica Veterinária

## Descrição

Empresa responsável pela prestação de serviços veterinários.

---

## Objetivos

* Captar novos clientes.
* Melhorar a operação.
* Digitalizar processos.
* Organizar agenda.
* Gerenciar pacientes.

---

## Necessidades

* ERP.
* Agenda.
* Clientes.
* Financeiro.
* Marketing.

---

## Funcionalidades mais importantes

* Portal Empresarial.
* Agenda.
* ERP.
* Marketplace de Serviços.

---

# Persona 5 — Pet Shop

## Descrição

Empresa que comercializa produtos e serviços relacionados ao mercado pet.

---

## Objetivos

* Aumentar vendas.
* Atrair clientes.
* Divulgar promoções.
* Participar do marketplace.

---

## Necessidades

* Visibilidade.
* Marketplace.
* Promoções.
* Fidelização.

---

## Funcionalidades mais importantes

* Catálogo.
* Marketplace.
* Promoções.
* Programa de Fidelidade.

---

# Persona 6 — Prestador de Serviço

## Descrição

Profissional autônomo ou pequena empresa.

Exemplos:

* Dog Walker
* Cat Sitter
* Hotel
* Banho e Tosa
* Transporte
* Adestrador

---

## Objetivos

* Conseguir novos clientes.
* Organizar agenda.
* Construir reputação.
* Receber avaliações.

---

## Necessidades

* Visibilidade.
* Agenda.
* Perfil profissional.
* Avaliações.

---

## Funcionalidades mais importantes

* Perfil.
* Agenda.
* Avaliações.
* Contratação online.

---

# Persona 7 — ONG

## Descrição

Organização voltada para proteção animal.

---

## Objetivos

* Divulgar adoções.
* Promover campanhas.
* Organizar eventos.
* Captar voluntários.

---

## Necessidades

* Visibilidade.
* Divulgação.
* Comunicação.

---

## Funcionalidades mais importantes

* Eventos.
* Campanhas.
* Adoção.
* Perfil institucional.

---

# Priorização das Personas

> **Tabela canônica de prioridade.** A Jornada de Evolução (seção abaixo) deriva desta tabela.

Nem todas as personas possuem a mesma prioridade.

| Prioridade | Grupo                                      | Personas                                        | Foco estratégico            |
| ---------- | ------------------------------------------ | ----------------------------------------------- | --------------------------- |
| P1         | Tutores                                    | Tutor de Pet, Tutor com Múltiplos Pets          | Core do produto             |
| P2         | Profissionais de saúde e serviços          | Médico Veterinário, Clínica Veterinária, Prestador de Serviço | Expansão do ecossistema |
| P3         | Comércio pet                               | Pet Shop                                        | Monetização e crescimento   |
| P4         | Impacto social                             | ONG                                             | Impacto social              |

---

# Jornada de Evolução

> **Deriva da tabela canônica de Priorização das Personas acima.** A sequência de fases respeita a mesma ordem de prioridade: P1 → P2 → P3 → P4.

A entrada de novas personas acompanha a evolução do roadmap.

| Fase   | Prioridade | Personas                                          |
| ------ | ---------- | ------------------------------------------------- |
| Fase 1 | P1         | Tutor de Pet, Tutor com Múltiplos Pets            |
| Fase 2 | P2         | Médico Veterinário, Clínica Veterinária e Prestadores de Serviço |
| Fase 3 | P2         | Clínicas e Empresas utilizando ERP — aprofundamento (ERP) |
| Fase 4 | P3         | Pet Shops                                         |
| Fase 5 | P1–P3      | IA para todas as personas — transversal           |
| Fase 6 | P4         | ONGs e novos parceiros sociais                    |

> Laboratórios e Seguradoras são expansões futuras do ecossistema, ainda fora das 7 personas descritas.

---

# Princípios

Toda funcionalidade desenvolvida deve responder às seguintes perguntas:

* Qual persona será beneficiada?
* Qual problema dessa persona será resolvido?
* Como será medida a melhoria para essa persona?
* Essa funcionalidade simplifica sua rotina?
* Essa funcionalidade aumenta o valor do ecossistema?

Caso essas perguntas não possam ser respondidas de forma objetiva, a funcionalidade deverá ser reavaliada.

---

# Evolução

Novas personas poderão ser adicionadas conforme a plataforma evoluir.

Entretanto, a prioridade do produto permanecerá inalterada:

> **O Tutor é a principal persona do PetDots.**

Todas as demais personas existem para fortalecer a experiência do tutor e aumentar o valor do ecossistema como um todo.
