---
title: "ADR-0016: O diretório de CEPs fica atrás da nossa API"
status: stable
version: "1.0"
updated: 2026-09-12
scope: >
  Registra a primeira dependência de terceiro em runtime do PetDots: a busca de
  endereço por CEP. Decide que a chamada vive na nossa API atrás de uma porta
  (IPostalCodeGateway), com ViaCEP como adapter inicial, rota autenticada,
  timeout, cache limitado e duas falhas distintas — CEP inexistente e diretório
  inacessível. Não cobre validação de área de entrega, que continua em stores.
relates_to:
  - 02-architecture/SYSTEM_ARCHITECTURE.md
  - 03-engineering/SECURITY.md
  - 04-api/ERROR_MODEL.md
  - 06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md
  - 08-features/tutors/PERFIL_DO_TUTOR_E_PETS.md
type: decision
---

# ADR-0016: O diretório de CEPs fica atrás da nossa API

## Contexto

No teste manual da [`pd-14`](0015-perfil-do-tutor-e-pets-antes-da-reposicao.md)
o Victor pediu duas coisas sobre o formulário de endereço: que o CEP viesse
primeiro, e que **digitá-lo buscasse o endereço automaticamente**.

A primeira é ordem de campo. A segunda é uma decisão de arquitetura, porque até
aqui **o PetDots não fazia uma única chamada a serviço de terceiro em runtime** —
uma varredura em `apps/api/src` e `apps/app/src` em 12/09/2026 não encontrou
nenhuma. Tudo que a aplicação consome é o próprio Postgres.

Três forças:

1. **É conveniência, não requisito.** O endereço sempre pôde ser digitado à mão,
   e vai continuar podendo. Nada no MVP para de funcionar se a busca falhar.
2. **Mas cria superfície de falha nova.** Um serviço gratuito, sem SLA, sem
   contrato conosco, no caminho de uma tela do onboarding.
3. **E cria acoplamento.** Escolher um provedor hoje é escolher quem se troca
   depois — e o custo dessa troca depende inteiramente de onde a chamada mora.

## Decisão

**D1 — A chamada vive na nossa API, não no cliente.** O app chama
`GET /api/v1/postal-codes/{postalCode}`; quem fala com o terceiro é a API.
Decisão do Victor em 12/09/2026, sobre recomendação da IA.

**D2 — Atrás de uma porta.** `IPostalCodeGateway` no domínio do módulo, com
`ViaCepPostalCodeGateway` como adapter. **Trocar de provedor é trocar a classe
registrada em `POSTAL_CODE_GATEWAY`** — nada acima dessa linha muda, e o
cliente nunca aprende o nome do terceiro.

**D3 — Módulo próprio, `postal-codes`, sem tabela nenhuma.** É o primeiro
módulo que não é dono de dado: é dono de uma **fronteira**.

**D4 — A rota é autenticada** (sem `@Public()`), e **sem `@Roles()`**. Fechada
porque um endpoint aberto que repassa um parâmetro de caminho a um terceiro é um
proxy que qualquer um aponta para esse terceiro, no nosso IP e com a nossa
reputação. Sem papel porque quem preenche endereço hoje é tutor, mas o lojista
cadastrando o endereço da loja vai precisar, e ele não é `TUTOR`.

**D5 — Duas falhas distintas, e é o ponto do módulo existir:**

| Situação | Resposta |
|---|---|
| O diretório diz que o CEP não existe | `404 POSTAL_CODE_NOT_FOUND` |
| Não conseguimos perguntar (timeout, rede, forma inesperada) | `503 POSTAL_CODE_LOOKUP_UNAVAILABLE` |

Colapsar as duas diria a uma pessoa que o CEP dela está errado quando a verdade
é que nós é que não conseguimos perguntar.

**D6 — Timeout de 3 s, obrigatório.** Sem ele, um diretório que trava segura um
handler nosso pelo tempo que quiser, e a falha de uma *conveniência* vira a falha
da API.

**D7 — A resposta do terceiro é parseada com Zod, nunca convertida.** Inclui o
caso em que o ViaCEP responde **`200` com `{"erro": "true"}`** para CEP
inexistente, em vez de `404` — ler só o status transformaria "não existe" num
sucesso com todos os campos vazios.

**D8 — Cache em memória, limitado a 500 entradas.** Um CEP resolve para a mesma
rua por anos, e os CEPs de um bairro se repetem muito. Limitado porque mapa sem
teto alimentado por parâmetro de caminho é vazamento de memória com nome
público; ao encher, é esvaziado inteiro — para um cache deste tamanho, a
contabilidade de um LRU custa mais que os misses que evitaria.

**D9 — `street` e `neighborhood` podem vir vazios, e isso não é falha.** Um "CEP
único" cobre uma cidade inteira e não nomeia logradouro. O contrato diz isso, e
a tela só sobrescreve o que o diretório de fato sabe.

**D10 — No cliente, nenhuma falha da busca vira erro visível.** `404`, `503`,
rede caída: todos viram "não consegui", e o formulário segue digitável e
salvável. Conveniência que impede de salvar deixou de ser conveniência.

## Alternativas consideradas

- **Chamar o ViaCEP direto do navegador** — ~40 linhas e nenhuma mudança na API.
  **Rejeitado** por três motivos: o domínio do terceiro ficaria escrito no
  código do cliente (trocar de provedor viraria mudança de app, com todo o
  ciclo de release que isso implica); colidiria com a **CSP** que o app web
  ainda vai ganhar (já é item de vigilância do backlog); e não haveria onde
  cachear.
- **Não fazer nada agora** — registrar em `IDEIAS` e decidir depois. Defensável,
  e foi oferecido. O Victor escolheu implementar.
- **Base de CEPs própria (importar os Correios)** — resolve a dependência de vez
  e é o caminho de quem opera em escala. **Rejeitado como infraestrutura
  antecipada**: são milhões de linhas, atualização periódica e um pipeline de
  ingestão, para um piloto de um eixo de bairros. **Gatilho para reabrir:** o
  limite de uso gratuito do provedor virar problema real, medido.
- **Provedor pago com SLA** — não se justifica sem tráfego. Mesmo gatilho.
- **Deixar a rota pública** — seria um proxy aberto para o terceiro.
- **Usar a busca para validar área de entrega** — tentador, e **fora de escopo**:
  quem decide se uma loja entrega num endereço é `stores`/`delivery_areas`, com
  a função pura de `packages/domain`. O diretório diz onde fica o CEP, não quem
  atende lá.

## Consequências

**Positivas**

- Trocar de provedor é trocar uma classe.
- O contrato da busca é **nosso**, em Zod, como todo o resto da fronteira.
- O terceiro não aparece no cliente, e por isso não aparece na CSP futura.
- O cache reduz chamadas repetidas ao mesmo CEP — medido em 53 ms na segunda
  chamada, contra a latência de rede na primeira.
- O e2e injeta um diretório falso, então a suíte **não depende do uptime de
  ninguém** e roda offline.

**Negativas, aceitas**

- **Uma dependência de terceiro existe agora**, e antes não existia. É a
  primeira, e ela estabelece o precedente de como as próximas entram.
- **O ViaCEP não tem SLA nem contrato conosco.** Se sumir, a busca para de
  funcionar — o formulário não.
- **Sem rate limit nosso** sobre a rota. Ela é autenticada, o que limita o
  abuso a quem tem conta, mas não o elimina. **Vigilância do backlog, gatilho:
  deploy público** — o mesmo gatilho do rate limit da landing.
- **O cache é por processo e some no restart.** Com uma instância só, hoje, é
  irrelevante; com várias, cada uma terá o seu. Aceito.
- **Uma chamada de rede no caminho do onboarding.** Mitigada pelo timeout e por
  nunca bloquear o envio do formulário.

## Status

`accepted`
