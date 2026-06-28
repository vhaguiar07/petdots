---
title: PetDots — AI Context
status: draft
version: "2.1"
updated: 2026-06-27
scope: >
  Ponto de entrada rápido para agentes de IA: identidade, missão, visão, estado
  atual e diretrizes essenciais do PetDots, antes da consulta à documentação
  completa. Deve permanecer curto; os detalhes vivem nos docs especializados.
relates_to:
  - README.md
  - 01-product/DOMAIN_MODEL.md
  - 06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md
  - 05-ai/AI_DEVELOPMENT_GUIDE.md
type: ai
---

# PetDots — AI Context

Este documento fornece contexto resumido para agentes de Inteligência Artificial que participarão do desenvolvimento do PetDots.

Ele funciona como ponto de entrada rápido antes da consulta à documentação completa.

---

# Identidade do Projeto

Nome:

PetDots

Tipo:

Ecossistema Digital para o Mercado Pet

Filosofia:

AI First

---

# Missão

Centralizar toda a vida do pet em um único lugar.

---

# Visão

Ser a principal infraestrutura digital do ecossistema pet brasileiro.

---

# Público-Alvo

Prioridade:

1. Tutores
2. Clínicas
3. Veterinários
4. Prestadores de Serviço
5. Pet Shops
6. ONGs
7. Laboratórios

---

# Estado Atual

O projeto encontra-se em fundação greenfield.

A documentação é a fonte da verdade (ver ADR-0001: `docs/06-decisions/ADR/0001-refundacao-ecossistema-ai-first.md`).

A documentação fundacional (camadas 00–06, incluindo engenharia e API) está completa. A implementação do produto ainda não foi iniciada (ver `PROJECT_STATE.md`).

---

# Documentos de Referência

Consulte [`docs/README.md`](../README.md) como fonte única e ordenada de toda a documentação do projeto.

---

# Diretrizes para IA

Sempre:

* preservar a visão do produto;
* respeitar os princípios do projeto;
* utilizar a linguagem definida no Glossary;
* propor soluções simples;
* justificar decisões importantes;
* evitar aumentar a complexidade sem necessidade.

Nunca:

* contradizer documentos oficiais;
* inventar regras de negócio;
* alterar nomenclaturas estabelecidas;
* introduzir tecnologias sem justificativa.

---

# Estilo de Desenvolvimento

O projeto segue abordagem incremental.

A prioridade é:

1. Produto.
2. Domínio.
3. Arquitetura.
4. Engenharia.
5. Implementação.

Nunca inverter essa ordem.

---

# Próximo Objetivo

Iniciar a implementação do MVP (ver `PROJECT_STATE.md` e `docs/01-product/MVP_SCOPE.md`), começando pelo **spike-gate do cliente universal** (pré-requisito do ADR-0002), que valida as jornadas de maior risco J6/J3/J2 (`docs/01-product/USER_JOURNEYS.md`).

O detalhamento de cada frente vive na documentação especializada; este documento apenas aponta o rumo.

---

# Atualização

Este documento deve permanecer curto e atualizado.

Seu papel é fornecer contexto inicial.

Os detalhes sempre devem ser consultados na documentação especializada correspondente.
