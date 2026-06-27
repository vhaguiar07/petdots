# PetDots — Project Context

> **Versão:** 1.0
> **Status:** Living Document

---

# Objetivo

Este documento apresenta uma visão geral do projeto PetDots.

Seu objetivo é permitir que qualquer pessoa ou agente de Inteligência Artificial compreenda rapidamente:

* o propósito do projeto;
* seu estágio atual;
* como a documentação está organizada;
* quais documentos devem ser utilizados como fonte oficial da verdade.

Este deve ser o primeiro documento lido por qualquer novo integrante do projeto.

---

# O que é o PetDots?

O PetDots é um ecossistema digital desenvolvido para centralizar toda a vida do pet em um único lugar.

Mais do que um marketplace, o PetDots busca conectar tutores, clínicas veterinárias, pet shops, prestadores de serviço, laboratórios, ONGs e demais participantes do mercado pet por meio de uma plataforma integrada.

O principal objetivo é simplificar a vida do tutor enquanto fortalece todo o ecossistema pet.

---

# Visão do Produto

> Toda a vida do pet em um único lugar.

Essa frase representa a principal direção estratégica do projeto.

Todas as decisões de produto, arquitetura e engenharia devem contribuir para fortalecer essa visão.

---

# Filosofia do Projeto

O PetDots segue uma abordagem **AI First**.

Isso significa que:

* toda documentação deve ser compreensível por humanos e agentes de IA;
* toda decisão importante deve estar documentada;
* o conhecimento do projeto pertence ao repositório, não às conversas.

---

# Organização da Documentação

A documentação está organizada em áreas especializadas.

```text
docs/

00-foundation/
01-product/
02-architecture/
03-engineering/
04-api/
05-ai/
06-decisions/
```

Cada diretório possui um propósito específico.

---

# Ordem Recomendada de Leitura

1. PROJECT_CONTEXT.md
2. docs/README.md
3. PRODUCT_VISION.md
4. PRODUCT_PRINCIPLES.md
5. BUSINESS_MODEL.md
6. PRODUCT_ROADMAP.md
7. GLOSSARY.md
8. NAMING_CONVENTIONS.md
9. PERSONAS.md

Após esses documentos, seguir para arquitetura e engenharia.

---

# Fonte Oficial da Verdade

A prioridade entre documentos é:

1. PRODUCT_PRINCIPLES.md
2. PRODUCT_VISION.md
3. BUSINESS_MODEL.md
4. PRODUCT_ROADMAP.md
5. DOMAIN_MODEL.md
6. Demais documentos

Sempre que houver conflito entre documentos, essa ordem deverá ser respeitada.

---

# Como Trabalhar Neste Projeto

Antes de implementar qualquer funcionalidade:

* compreender o domínio;
* consultar os princípios do produto;
* verificar se a funcionalidade já está prevista no roadmap;
* validar impacto arquitetural;
* registrar decisões relevantes.

---

# AI First

Qualquer ferramenta de IA utilizada neste projeto deverá:

* utilizar esta documentação como contexto;
* evitar assumir informações não documentadas;
* propor melhorias quando identificar inconsistências;
* manter consistência com os princípios do produto;
* respeitar a linguagem ubíqua definida no Glossary.

---

# Estado Atual

O estado atual do projeto está documentado em:

PROJECT_STATE.md

Esse documento deve ser consultado antes de iniciar qualquer nova atividade.

---

# Próximo Passo

A evolução do projeto sempre deverá seguir o próximo item pendente definido em PROJECT_STATE.md.
