---
title: PetDots — Glossary
status: stable
version: 1.0
updated: 2026-06-27
scope: >
  Define a terminologia oficial e a linguagem ubíqua do domínio PetDots.
  Todo conceito com significado específico no produto deve ter definição aqui.
relates_to:
  - 00-foundation/NAMING_CONVENTIONS.md
  - 00-foundation/PRODUCT_VISION.md
  - README.md
type: foundation
---

# PetDots — Glossary

---

# Objetivo

Este documento define a terminologia oficial utilizada pelo projeto PetDots.

Seu objetivo é garantir que todas as pessoas envolvidas no desenvolvimento do produto — incluindo desenvolvedores, designers, product managers, arquitetos e agentes de Inteligência Artificial — utilizem exatamente os mesmos conceitos e definições.

Sempre que um termo possuir significado específico dentro do domínio do PetDots, sua definição deverá constar neste documento.

Este glossário representa a linguagem ubíqua (Ubiquitous Language) do domínio do produto.

---

# Regras Gerais

* Cada conceito possui um único significado oficial.
* Evite criar sinônimos para o mesmo conceito.
* Utilize sempre a nomenclatura definida neste documento.
* Caso um novo conceito seja criado, este documento deverá ser atualizado.
* O código-fonte deverá, sempre que possível, utilizar a mesma nomenclatura definida aqui.

---

# Conceitos Fundamentais

## Ecossistema

Conjunto de participantes que interagem por meio do PetDots.

Inclui:

* Tutores
* Pets
* Clínicas
* Veterinários
* Pet Shops
* Prestadores de Serviço
* ONGs
* Laboratórios
* Seguradoras
* Parceiros

O PetDots existe para conectar esses participantes.

---

## Tutor

Pessoa responsável por um ou mais pets.

O tutor é o proprietário das informações relacionadas aos seus animais e possui controle sobre compartilhamento, permissões e acesso aos dados.

Um tutor pode possuir múltiplos pets.

Um pet também poderá possuir múltiplos tutores autorizados.

---

## Pet

Animal cadastrado na plataforma.

É a principal entidade do domínio.

Toda a plataforma é construída ao redor do pet.

Exemplos:

* Cachorro
* Gato
* Ave
* Coelho
* Peixe
* Réptil
* Outros animais suportados futuramente.

---

## Pet ID

Identificador permanente e único atribuído a cada pet.

O Pet ID acompanha o animal durante toda sua vida dentro do ecossistema.

Mesmo que o tutor seja alterado ou novos parceiros sejam integrados, o Pet ID permanece o mesmo.

---

## Histórico do Pet

Conjunto de todas as informações registradas durante a vida do animal.

Inclui:

* Vacinas
* Consultas
* Exames
* Cirurgias
* Medicamentos
* Alergias
* Peso
* Eventos
* Documentos

---

## Timeline

Representação cronológica do histórico do pet.

Todo evento importante gera automaticamente um registro na Timeline.

A Timeline representa a memória digital da vida do animal.

---

## Evento

Qualquer ocorrência relevante registrada na vida do pet.

Exemplos:

* Vacina
* Consulta
* Cirurgia
* Banho
* Tosa
* Vermifugação
* Exame
* Internação
* Adoção

---

## Carteira Digital

Área da plataforma responsável por armazenar documentos e registros importantes do pet.

Exemplos:

* Carteira de vacinação
* Receitas
* Exames
* Atestados
* Documentos
* Imagens

---

# Participantes do Ecossistema

## Clínica

Empresa responsável pela prestação de serviços veterinários.

Uma clínica pode possuir diversos veterinários e colaboradores.

---

## Veterinário

Profissional habilitado responsável pelo atendimento clínico dos pets.

Pode atuar de forma independente ou vinculado a uma clínica.

---

## Pet Shop

Empresa responsável pela comercialização de produtos e/ou prestação de serviços relacionados ao mercado pet.

---

## Prestador de Serviço

Pessoa física ou empresa que oferece serviços aos tutores.

Exemplos:

* Dog Walker
* Cat Sitter
* Banho e Tosa
* Hotel
* Transporte
* Adestramento
* Fotografia

---

## Parceiro

Qualquer organização ou profissional participante do ecossistema PetDots.

Exemplos:

* Clínicas
* Veterinários
* Pet Shops
* Prestadores de Serviço
* Laboratórios
* ONGs

---

## ONG

Organização dedicada ao bem-estar animal.

Pode divulgar:

* Eventos
* Adoções
* Campanhas
* Castrações
* Projetos sociais

---

## Laboratório

Empresa responsável pela realização de exames veterinários.

Futuramente poderá integrar automaticamente resultados ao histórico do pet.

---

# Serviços

## Agendamento

Processo de reservar um horário para realização de um serviço.

Pode envolver:

* Consultas
* Banho
* Tosa
* Hospedagem
* Transporte
* Adestramento

---

## Serviço

Qualquer atividade contratável oferecida por um parceiro.

Exemplos:

* Consulta
* Exame
* Banho
* Hotel
* Transporte
* Adestramento

---

## Marketplace

Capacidade da plataforma responsável por conectar tutores a parceiros comerciais.

O marketplace não representa o objetivo principal do PetDots.

É apenas uma das capacidades do ecossistema.

---

# Inteligência

## Recomendação

Sugestão gerada automaticamente pela plataforma utilizando informações cadastradas.

Exemplos:

* Próxima vacina
* Check-up
* Cuidados específicos
* Produtos
* Serviços

---

## Assistente Inteligente

Componente responsável por auxiliar o tutor utilizando Inteligência Artificial.

O assistente fornece orientações, resumos e recomendações.

Não realiza diagnósticos médicos.

---

## Inteligência Artificial

Conjunto de capacidades utilizadas para enriquecer a experiência do usuário e auxiliar parceiros.

A IA nunca substitui profissionais habilitados.

---

# Plataforma

## Aplicativo Mobile

Principal interface utilizada pelos tutores.

Disponível para Android e iOS.

---

## Portal Web

Interface acessível por navegadores.

Utilizada por tutores e parceiros.

---

## Portal Empresarial

Área administrativa destinada a empresas parceiras.

Permite gestão operacional e relacionamento com clientes.

---

## API

Camada responsável pela comunicação entre aplicações e integrações externas.

Toda capacidade da plataforma deverá estar disponível por meio de APIs sempre que aplicável.

---

# Engenharia

## Capacidade (Capability)

Grande área funcional do sistema.

Exemplos:

* Gestão de Pets
* Marketplace
* Agenda
* Carteira Digital
* Timeline

Capacidades agrupam funcionalidades relacionadas.

---

## Funcionalidade (Feature)

Comportamento específico pertencente a uma capacidade.

Exemplo:

Capacidade:

Gestão de Pets

Funcionalidades:

* Cadastro
* Edição
* Exclusão
* Upload de foto

---

## Domínio

Conjunto de regras de negócio relacionadas ao ecossistema pet.

Representa o conhecimento central do produto.

---

## AI First

Princípio segundo o qual toda documentação, arquitetura e desenvolvimento devem ser concebidos considerando a colaboração entre humanos e agentes de Inteligência Artificial.

---

# Convenções de Terminologia

Para manter consistência entre documentação, APIs e código-fonte, adotar as seguintes convenções:

| Português        | Inglês         |
| ---------------- | -------------- |
| Tutor            | Tutor          |
| Pet              | Pet            |
| Pet ID           | PetId          |
| Clínica          | Clinic         |
| Veterinário      | Veterinarian   |
| Pet Shop         | PetShop        |
| Parceiro         | Partner        |
| Serviço          | Service        |
| Agendamento      | Appointment    |
| Consulta         | Consultation   |
| Timeline         | Timeline       |
| Evento           | Event          |
| Carteira Digital | Digital Wallet |

---

# Evolução

Este glossário deverá evoluir continuamente conforme novos conceitos forem incorporados ao domínio.

Nenhum termo novo deverá ser utilizado em documentação, APIs ou código antes de possuir uma definição oficial neste documento.
