---
title: PetDots — Success Metrics
status: draft
version: "1.0"
updated: 2026-06-27
scope: >
  Define as métricas de sucesso do PetDots: North Star, métricas de ativação,
  recorrência, retenção e crescimento do ecossistema. Metas indicativas
  alinhadas às fases do PRODUCT_ROADMAP. Valores numéricos são direcionais —
  serão calibrados conforme aprendizados de cada fase.
relates_to:
  - 00-foundation/PRODUCT_VISION.md
  - 00-foundation/BUSINESS_MODEL.md
  - 00-foundation/PRODUCT_ROADMAP.md
  - 00-foundation/PRODUCT_PRINCIPLES.md
type: foundation
---

# PetDots — Success Metrics

---

## Objetivo

Este documento define como o PetDots medirá seu sucesso ao longo da evolução
do ecossistema.

As métricas aqui descritas derivam diretamente da estratégia de negócio
(recorrência acima de aquisição, ecossistema acima de plataforma) e do modelo
de crescimento baseado em efeito de rede.

Métricas de vaidade — como downloads totais ou GMV isolado — **não são** o
headline do produto. O sucesso é medido pela profundidade de uso do tutor e
pelo fortalecimento do ecossistema ao longo do tempo.

---

## North Star

> **Tutores Ativos Recorrentes com a vida do pet centralizada no PetDots.**

### Definição

Um **Tutor Ativo Recorrente** é aquele que:

1. Possui pelo menos um pet com cadastro completo (espécie, raça, data de
   nascimento).
2. Registrou pelo menos um evento na Timeline do pet nos últimos 30 dias
   (consulta, vacina, medicamento, lembrete cumprido etc.).
3. Retornou à plataforma em pelo menos 2 semanas distintas no último mês.

Essa métrica captura simultaneamente:

- **Ativação**: o tutor cadastrou e estruturou a vida do pet.
- **Recorrência**: o tutor volta porque a plataforma faz parte da rotina.
- **Centralização**: o histórico do pet está de fato sendo construído.

### Por que esta métrica?

Seguindo o princípio _Recorrência Acima de Aquisição_ (PRODUCT_PRINCIPLES §7),
o PetDots não vence aumentando cadastros — vence criando hábito. Um tutor que
retorna regularmente para registrar e consultar a vida do seu pet é a prova
viva de que a proposta de valor funciona.

O North Star é um lagging indicator consolidado. Indicadores antecedentes
(leading indicators) são descritos nas seções de ativação e recorrência abaixo.

---

## Categorias de Métricas

---

### 1. Ativação

Mede se o tutor completou o setup mínimo para extrair valor da plataforma.

| Métrica | Definição | Indicador |
|---|---|---|
| Taxa de ativação D7 | % de tutores que, 7 dias após o cadastro, têm ≥1 pet com timeline iniciada | Leading do North Star |
| Pets com cadastro completo | % de pets com espécie + raça + data de nascimento preenchidos | Qualidade do dado |
| Primeiro evento registrado | % de novos tutores que registraram ≥1 evento em até 48h após o cadastro | Velocidade de ativação |
| Carteira Digital utilizada | % de tutores que enviaram ≥1 documento para a Carteira Digital (F1+) | Profundidade de ativação |

> **Meta direcional (Fase 1):** Taxa de ativação D7 superior à taxa de D30 da
> iteração anterior — crescimento relativo como sinal de melhoria de onboarding.
> Valor absoluto a definir após primeiras 4 semanas de dados reais.

---

### 2. Recorrência

Mede se os tutores voltam à plataforma por hábito genuíno.

| Métrica | Definição | Indicador |
|---|---|---|
| WAU/MAU ratio | Usuários ativos na semana / ativos no mês | Índice de hábito |
| D7 Retention | % de tutores que retornam 7 dias após o cadastro | Retenção precoce |
| D30 Retention | % de tutores que retornam 30 dias após o cadastro | Retenção de médio prazo |
| Eventos por pet/mês | Quantidade média de eventos registrados por pet ativo no mês | Profundidade de uso |
| Lembretes cumpridos | % de lembretes configurados que geraram um registro na Timeline | Conversão de alerta |

> **Meta direcional:** WAU/MAU > 0,35 como indicativo de produto com uso
> semanal frequente (benchmark informal para apps de gestão pessoal). Valor
> a ser revisado após primeiros dados.

---

### 3. Retenção

Mede a capacidade do produto de manter o tutor engajado no longo prazo.

| Métrica | Definição | Indicador |
|---|---|---|
| M3 Retention | % de tutores com atividade em M+3 após o cadastro | Retenção de longo prazo |
| Churn mensal de tutores | % de tutores que não tiveram atividade nos últimos 60 dias | Risco de abandono |
| NPS de tutores | Net Promoter Score coletado em momentos-chave | Percepção de valor |
| Pets com timeline ativa | % de pets cadastrados com ≥1 evento nos últimos 60 dias | Saúde do ecossistema de dados |

> Retenção M3 é o melhor proxy de "produto que virou hábito" para o perfil
> PetDots. A meta absoluta será definida após os primeiros 90 dias de produto
> em produção.

---

### 4. Crescimento do Ecossistema (Efeito de Rede)

Mede a expansão dos dois lados do ecossistema e a densidade de interações.

| Métrica | Definição | Indicador |
|---|---|---|
| Parceiros ativos | Clínicas/veterinários/prestadores com ≥1 agendamento concluído no mês (F2+) | Oferta do ecossistema |
| Taxa de conexão tutor–parceiro | % de tutores que realizaram ≥1 agendamento via plataforma (F2+) | Efeito de rede bilateral |
| Eventos gerados por integração | % de eventos na Timeline originárias de parceiros (não só do tutor) (F2+) | Profundidade da integração |
| Cobertura geográfica | Número de cidades/regiões com ≥N parceiros ativos | Expansão de oferta |
| Pets por tutor | Média de pets cadastrados por tutor ativo | Engajamento de tutores múltiplos |

> Métricas de efeito de rede só fazem sentido a partir da Fase 2.
> Na Fase 1, o foco é exclusivamente em ativação e recorrência de tutores.

---

## Metas por Fase do Roadmap

As metas abaixo são **indicativas e direcionais**. Não refletem projeções
financeiras ou compromissos. Serão revisadas ao final de cada fase com base
nos aprendizados reais.

---

### Fase 1 — Fundação: Vida do Pet

**Foco:** Validar que tutores ativam e retornam.

| Indicador | Meta direcional |
|---|---|
| North Star (tutores ativos recorrentes) | Crescimento consistente semana a semana após o lançamento |
| Taxa de ativação D7 | A definir — referência a ser estabelecida nos primeiros 30 dias |
| D30 Retention | Baseline a ser estabelecida; meta de melhoria incremental sprint a sprint |
| NPS de tutores | Positivo (>0) como indicador mínimo de satisfação |
| Pets com cadastro completo | ≥80% dos pets cadastrados têm dados básicos preenchidos |

> Nesta fase não há meta de parceiros ou efeito de rede — o produto ainda
> não tem esse lado do ecossistema.

---

### Fase 2 — Ecossistema de Saúde e Serviços

**Foco:** Validar o valor bilateral tutor–parceiro e o efeito de rede inicial.

| Indicador | Meta direcional |
|---|---|
| North Star | Crescimento da base de tutores recorrentes, impulsionado por agendamentos |
| Parceiros ativos | Pelo menos N clínicas/veterinários com agendamentos no mês (N a definir por mercado-piloto) |
| Taxa de conexão tutor–parceiro | ≥20% dos tutores ativos com ≥1 agendamento realizado |
| Eventos gerados por integração | ≥10% dos eventos da Timeline originados por parceiros |
| D30 Retention | Aumento mensurável em relação ao baseline da Fase 1 (hipótese: parceiros aumentam retenção) |

---

### Fase 3 — ERP B2B para Clínicas

**Foco:** Validar que clínicas dependem da plataforma para operar.

| Indicador | Meta direcional |
|---|---|
| Clínicas com ERP ativo | % de clínicas parceiras usando prontuário/agenda pelo PetDots |
| Integração prontuário → Timeline | % de prontuários clínicos com autorização do tutor e espelhamento no histórico |
| Planos premium B2B | Número de clínicas em plano pago (referência de willingness-to-pay) |
| North Star | Aceleração da métrica de tutores recorrentes por efeito indireto do ERP (mais clínicas → mais eventos no histórico) |

---

### Fase 4 — Marketplace de Produtos

**Foco:** Validar que o marketplace é consequência de tutores fidelizados.

| Indicador | Meta direcional |
|---|---|
| Tutores com ≥1 compra | % de tutores ativos recorrentes que realizaram ≥1 compra no marketplace |
| GMV por tutor recorrente | Valor médio de compras de tutores já recorrentes vs. novos | 
| Compras vinculadas ao pet | % de compras registradas no perfil do pet (ex.: alimentação) |
| Retenção pós-compra | % de compradores que mantêm recorrência de uso após a compra |

> O GMV absoluto não é o headline desta fase. O headline é: tutores fidelizados
> nas fases anteriores convertem naturalmente em compradores.

---

### Fase 5 — IA Transversal

**Foco:** Validar que a camada de IA aumenta recorrência e satisfação.

| Indicador | Meta direcional |
|---|---|
| Alertas proativos utilizados | % de alertas gerados por IA que resultaram em ação do tutor |
| Assistente de saúde engajado | % de tutores que utilizaram o assistente ≥1 vez no mês |
| NPS pós-IA | Variação de NPS entre tutores que usam IA vs. os que não usam |
| Recomendações convertidas | % de recomendações de serviço/produto aceitas pelo tutor |

---

### Fase 6 — Impacto Social

**Foco:** Validar que a plataforma amplifica o ecossistema de bem-estar animal.

| Indicador | Meta direcional |
|---|---|
| Pets adotados via ONG | Número de pets com Pet ID transferido via processo de adoção |
| ONGs ativas | Número de ONGs com ≥1 campanha publicada no mês |
| Campanhas com engajamento | % de campanhas com ≥N visualizações/interações (N a definir) |

---

## Princípios de Uso das Métricas

1. **O North Star é a bússola**: toda métrica de produto deve ser questionada
   quanto ao seu impacto no North Star.

2. **Métricas de vaidade são monitoradas, não otimizadas**: downloads, DAU
   bruto e visitas são monitorados para contexto, mas nunca são o alvo de
   decisões de produto.

3. **Metas numéricas evoluem por fase**: não existe um OKR fixo para todo o
   ciclo de vida — as metas são recalibradas conforme os dados reais de cada
   fase.

4. **Ausência de dado não é fracasso**: em produto greenfield, a primeira
   missão é estabelecer baselines. Metas absolutas pré-lançamento são
   hipóteses, não verdades.

5. **Recorrência precede monetização**: métricas de receita só entram como
   headline a partir do momento em que a recorrência estiver validada
   (alinhado a BUSINESS_MODEL.md — Estratégia de Monetização).

---

## Revisão Contínua

Este documento deve ser revisado:

- Ao final de cada fase do roadmap, com base nos dados coletados.
- Sempre que o modelo de negócio ou a estratégia de crescimento mudarem.
- Quando o North Star precisar ser refinado por aprendizados do mercado.

A evolução das métricas é esperada e saudável. O que não deve mudar é o
compromisso com recorrência, centralização e efeito de rede como fundamentos
do sucesso do ecossistema PetDots.
