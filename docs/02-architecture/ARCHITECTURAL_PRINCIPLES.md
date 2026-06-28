---
title: Architectural Principles
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Princípios arquiteturais canônicos do PetDots — padrões adotados e princípios
  acionáveis (com racional, como aplicar e sinal de violação) que guiam toda
  decisão de design. É a fonte canônica da qual o eco operacional para agentes
  (05-ai/AI_ARCHITECTURE_RULES.md) deriva. Não cobre a visão de longo prazo
  (TECHNICAL_VISION), o inventário de stack (ADR-0002/TECHNOLOGY_STACK), os
  componentes (SYSTEM_ARCHITECTURE) nem as metas mensuráveis (QUALITY_ATTRIBUTES).
relates_to:
  - 02-architecture/TECHNICAL_VISION.md
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 02-architecture/QUALITY_ATTRIBUTES.md
  - 05-ai/AI_ARCHITECTURE_RULES.md
  - 06-decisions/ADR/0002-stack-tecnologica-fundacao.md
type: architecture
---

# PetDots — Architectural Principles

---

## Objetivo

Este documento é a **fonte canônica** dos princípios arquiteturais do PetDots:
os padrões adotados e os princípios acionáveis que guiam **toda decisão de
design**. Cada princípio traz *por quê*, *como aplicar* e *sinal de violação*,
para ser útil a humanos e a agentes.

**Cadeia normativa:** [`AGENTS.md`](../../AGENTS.md) + [`PRODUCT_PRINCIPLES`](../00-foundation/PRODUCT_PRINCIPLES.md)
→ **este documento** → [`AI_ARCHITECTURE_RULES`](../05-ai/AI_ARCHITECTURE_RULES.md)
(eco operacional/checklist para a IA, que deriva daqui — não o contrário).

**Não cobre** (aponta para o irmão, evitando sobreposição): a visão de longo
prazo e o porquê → [`TECHNICAL_VISION`](./TECHNICAL_VISION.md); as tecnologias
concretas → [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) e
`TECHNOLOGY_STACK.md`; os componentes e interações → `SYSTEM_ARCHITECTURE.md`;
as metas mensuráveis → `QUALITY_ATTRIBUTES.md`.

---

## Padrões arquiteturais adotados

Fonte canônica da tabela (o `AI_ARCHITECTURE_RULES` a referencia, não a
redefine). Vigentes até decisão explícita em ADR.

| Padrão | Status | Racional |
|--------|--------|----------|
| **Modular Monolith** | Adotado | Fronteiras de domínio sem o custo operacional distribuído; extração de serviço só sob força real, via ADR. |
| **API-first** | Adotado | Toda capacidade é serviço reutilizável; o contrato REST/OpenAPI é a superfície de produto para todos os canais. |
| **DDD leve** | Adotado | Linguagem ubíqua, agregados e eventos `domain.action`; o domínio guia o código. |
| **Clean Architecture** | Quando paga | Aplicar a separação de camadas só onde ela defende uma invariante real; não por padrão. |
| **Event-Driven (interno)** | Condicional | Eventos de domínio integram módulos no monolito; mensageria externa (broker/fila) só com ADR. |
| **Microserviços** | Proibido sem ADR | Otimização prematura nesta fase; o Modular Monolith atende. |

---

## Princípios acionáveis

### P1 — Domínio no centro; as dependências apontam para o domínio

- **Por quê:** o núcleo Pet/Tutor/Timeline é estável; a técnica serve o domínio, não o contrário.
- **Como aplicar:** regras de negócio não dependem de framework, ORM ou HTTP; o módulo expõe casos de uso, não tabelas.
- **Sinal de violação:** lógica de domínio dentro de controller/repository; uma entidade "conhece" Prisma ou Express.

### P2 — Módulos comunicam por contrato ou evento; nunca por banco compartilhado

- **Por quê:** acoplamento por tabela destrói as fronteiras e impede evolução e eventual extração.
- **Como aplicar:** um módulo só lê/escreve as próprias tabelas; integra com outro via caso de uso ou evento de domínio.
- **Sinal de violação:** um módulo faz JOIN nas tabelas de outro; FK cruzando fronteira sem contrato.

### P3 — Contrato antes da implementação; a API é a fronteira pública do módulo

- **Por quê:** API-first — o contrato REST/OpenAPI serve aplicação, parceiros e integrações futuras.
- **Como aplicar:** definir o recurso/contrato (Zod → OpenAPI) antes do handler; validar na borda; publicar o OpenAPI como contrato canônico.
- **Sinal de violação:** endpoint sem contrato/validação; resposta divergindo do OpenAPI publicado.

### P4 — Invariantes de domínio têm dono explícito; não vivem só em testes

- **Por quê:** invariantes (Pet ID imutável; Pet sempre ≥1 Tutor; ownership por instância) são regras de negócio, não asserts.
- **Como aplicar:** a raiz do agregado garante a invariante; toda mutação passa por ela.
- **Sinal de violação:** invariante checada só num teste ou espalhada em `if`s; é possível criar um Pet sem Tutor.

### P5 — Simplicidade e complexidade adiada; infra nova só com ADR

- **Por quê:** "a solução mais simples capaz de resolver o problema atual"; sustentabilidade > sofisticação.
- **Como aplicar:** usar o que a stack do [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) já oferece (Postgres absorve JSONB/FTS/`pgvector`; cron in-process); broker, fila, cache ou novo datastore só com ADR.
- **Sinal de violação:** abstração "para o futuro"; Redis/fila/serviço adicionado sem ADR.

### P6 — Legibilidade para humanos e agentes

- **Por quê:** AI-first — a documentação é a fonte-da-verdade e o código é construído com agentes.
- **Como aplicar:** estrutura previsível (módulo por agregado), baixa "magia", nomes do `GLOSSARY`, contratos declarativos.
- **Sinal de violação:** meta-programação opaca no ponto de uso; nome fora do `GLOSSARY`; comportamento divergente escondido (ex.: sufixos de plataforma não documentados).

### P7 — LGPD e segurança por padrão

- **Por quê:** "O Tutor é o dono dos dados", e os dados de saúde do pet são sensíveis.
- **Como aplicar:** ownership por instância (vínculo `pet_tutors`) no guard; auditoria por interceptor; exclusão com retenção legal (soft-delete/tombstone); exportação como capacidade; minimização de dados.
- **Sinal de violação:** acesso a dado de Pet sem checar o vínculo; DELETE físico de dado sob retenção legal; identidade/segredo fora do nosso domínio sem ADR.

### P8 — Observabilidade desde o início

- **Por quê:** todo componente importante deve ser observável (`AGENTS.md`).
- **Como aplicar:** logs estruturados (com `petId` no contexto quando houver Pet), métricas, tracing (OpenTelemetry) e health checks.
- **Sinal de violação:** caminho crítico sem log/trace; falha silenciosa.

### P9 — Reversibilidade consciente; isolar o que é caro de reverter

- **Por quê:** decisões irreversíveis concentram risco e um ADR é imutável após aceito.
- **Como aplicar:** isolar domínio/contratos da UI (`packages/` limpos — eco do spike-gate do ADR-0002); preferir o trocável atrás de fronteiras (repositórios, adapters); decisão cara passa por ADR e, sob incerteza, por validação/spike antes de cravar.
- **Sinal de violação:** regra de domínio dentro do componente de UI; escolha de alto custo de reversão cravada sem ADR nem validação.

---

## Quando uma decisão vira ADR

Os gatilhos operacionais e o checklist vivem em
[`AI_ARCHITECTURE_RULES`](../05-ai/AI_ARCHITECTURE_RULES.md) e o processo em
[`ADR/README`](../06-decisions/ADR/README.md) — este documento **não os recopia**.
Em resumo: registre um ADR quando a decisão impacta o domínio/estrutura de
módulos, introduz tecnologia/dependência/infraestrutura, altera uma convenção
estabelecida, ou resolve uma "questão em aberto" do `DOMAIN_MODEL`.

---

## Relação com os docs irmãos

- [`TECHNICAL_VISION`](./TECHNICAL_VISION.md) — o porquê e o para-onde; este documento dá o *como decidir*.
- [`AI_ARCHITECTURE_RULES`](../05-ai/AI_ARCHITECTURE_RULES.md) — o eco operacional/checklist para agentes, **derivado** daqui.
- [ADR-0002](../06-decisions/ADR/0002-stack-tecnologica-fundacao.md) / `TECHNOLOGY_STACK.md` — as tecnologias concretas.
- `SYSTEM_ARCHITECTURE.md` — os componentes e suas interações.
- `QUALITY_ATTRIBUTES.md` — as metas mensuráveis.

---

## Critérios

Este documento é considerado pronto quando:

- [x] Define os padrões adotados com racional, como fonte canônica.
- [x] Cada princípio tem enunciado, *por quê*, *como aplicar* e *sinal de violação*.
- [x] Não duplica `TECHNICAL_VISION`, ADR-0002, `SYSTEM_ARCHITECTURE` nem `QUALITY_ATTRIBUTES`.
- [x] O `AI_ARCHITECTURE_RULES` referencia este documento como fonte (eco operacional).
- [ ] Revisado contra `SYSTEM_ARCHITECTURE` quando este for escrito.
