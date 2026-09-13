---
title: Aviso de Privacidade
status: draft
version: "0.1"
updated: 2026-09-13
scope: >
  Texto proposto para a página pública /privacidade da landing, que a pd-19
  materializa e que fecha de uma vez os itens 4, 12 e 15 da intervenção manual
  do BACKLOG: o canal de contato do titular, a base legal do cadastro (e o
  destino do link do /cadastro) e a declaração de transferência internacional
  que o hosting nos Estados Unidos exige (ADR-0020, E10). Redigido pela IA a
  partir do que o sistema de fato coleta hoje; a verificação é do Victor, e a
  leitura jurídica está por fazer. Também traz as duas frases curtas que
  substituem o texto provisório da landing e do app.
relates_to:
  - 03-engineering/SECURITY.md
  - 01-product/DOMAIN_MODEL.md
  - 06-decisions/ADR/0015-perfil-do-tutor-e-pets-antes-da-reposicao.md
  - 06-decisions/ADR/0019-psp-do-piloto-asaas.md
  - 06-decisions/ADR/0020-hosting-do-piloto-railway-e-cloudflare.md
  - 07-process/BACKLOG.md
type: product
---

# Aviso de Privacidade

> **Status: rascunho da IA, 13/09/2026, à espera da verificação do Victor.**
> O texto descreve o que a API guarda **hoje** (`prisma/schema.prisma`) e o que
> o [`SECURITY`](../03-engineering/SECURITY.md) §"LGPD e privacidade" já
> prescreve. Onde o texto assume uma decisão que ainda não foi tomada, o trecho
> está marcado com ⚠️ e a decisão está listada em §"O que este texto assume".
> **Nenhuma linha daqui está publicada**: a página `/privacidade` é trabalho da
> `pd-19`.

---

## Parte 1 — O texto da página `/privacidade`

### Aviso de Privacidade do PetDots

*Última atualização: [data da publicação]*

O PetDots é um serviço para quem tem pet no Grande Méier, no Rio de Janeiro:
compara preços entre as petshops que entregam na sua rua e, em breve, permite
fazer o pedido e receber em casa. Para isso, guardamos alguns dados seus. Este
aviso explica **quais, para quê, com quem e por quanto tempo**, e como você
exerce os seus direitos.

⚠️ **Quem é responsável pelos seus dados:** PetDots, [razão social e CNPJ,
quando existirem]. Até lá, o responsável é o fundador do projeto, que você
alcança pelo canal abaixo.

**Fale com a gente sobre seus dados:** [contato@petdots.com.br]. Respondemos em
até **15 dias**.

#### 1. O que guardamos, e por quê

**Se você entrou na lista de espera** (o formulário da página inicial):

- o que você digitou: **nome, celular, bairro, CEP** e, se quis informar, **a
  ração que seu pet come**;
- de onde veio o cadastro (campanha, QR code na loja, ou "ainda não atendemos
  o seu bairro") e **a data em que você marcou a caixa de consentimento**.

Usamos isso para **uma coisa**: avisar você quando o PetDots chegar ao seu
bairro, e entender quais bairros e rações pedem prioridade. Guardamos porque
**você consentiu**, e você pode retirar esse consentimento quando quiser, pelo
canal acima. Retirado, apagamos o cadastro.

**Se você criou uma conta** (no app):

- para a conta existir: **e-mail** e **senha**. A senha é guardada em forma
  embaralhada e irreversível; nem nós conseguimos lê-la;
- para comparar preços e entregar: **nome, celular e endereço de entrega**
  (rua, número, complemento, bairro, CEP e ponto de referência);
- sobre o seu pet: **nome, espécie, data de nascimento e peso**. O peso é o que
  vai alimentar o aviso de "a ração está acabando", quando ele existir.

Guardamos isso porque **é o que permite prestar o serviço que você pediu ao
criar a conta**. Por isso não pedimos um consentimento à parte: sem endereço
não há comparação por rua nem entrega; sem e-mail e senha não há conta.

**Se você fez um pedido:**

- o pedido guarda **uma cópia** do seu nome, celular e endereço no momento da
  compra, os itens, os valores e o que aconteceu com ele (aceito, entregue,
  recusado, cancelado, devolvido). A cópia existe para que o pedido continue
  fiel mesmo que você mude o cadastro depois;
- a petshop que atende o pedido **recebe o seu nome, celular, endereço e os
  itens**. É o mínimo para separar e entregar;
- ⚠️ **quando o pagamento existir**, ele será processado por um parceiro de
  pagamento autorizado a operar no Brasil, que receberá os dados necessários
  para a cobrança e a devolução. **Nós não guardamos dados de cartão.** A
  política do parceiro será linkada aqui.

Guardamos o pedido porque **ele é o contrato entre você e a petshop**, e
porque **a lei fiscal exige** que registros de venda sejam mantidos.

**Se você opera uma petshop no PetDots:**

- o **e-mail** da sua conta, **qual loja** você opera e com que papel;
- **cada ação sua num pedido** (aceitar, recusar, despachar, confirmar a
  entrega, cancelar, alterar preço) fica registrada com data e autor. É o que
  protege você e o tutor numa divergência.

**Registros técnicos**, para qualquer pessoa que use o site ou o app:

- o servidor registra **endereço IP, data, hora e a página ou rota acessada**.
  Usamos para segurança e para diagnosticar erros. ⚠️ Esses registros são
  apagados em **7 dias**;
- para você não precisar entrar de novo a cada tela, o app guarda **no seu
  próprio aparelho ou navegador** uma chave de sessão. Ela não sai dali para
  ninguém além do PetDots, e é apagada quando você sai da conta;
- **não usamos cookies de publicidade** nem rastreamento de terceiros. A
  página inicial não usa cookies.

#### 2. Com quem compartilhamos

- **A petshop que atende o seu pedido**, como descrito acima. Nenhuma outra
  loja vê os seus dados nem o seu histórico.
- **Os provedores que hospedam o PetDots.** Nossos servidores e banco de dados
  ficam com a **Railway**, nos Estados Unidos, e o endereço do site e parte das
  páginas passam pela **Cloudflare**, que tem servidores em vários países. Eles
  guardam os dados por nós e não podem usá-los para outra coisa.
- **Um diretório público de CEPs**, que recebe **apenas o CEP** para
  confirmarmos o bairro. Nenhum outro dado seu é enviado.
- ⚠️ **O parceiro de pagamento**, quando existir.
- **Autoridades**, se a lei exigir.

**Não vendemos seus dados** e **não os usamos para publicidade de terceiros**.

#### 3. Seus dados saem do Brasil

Como os servidores ficam nos Estados Unidos, os seus dados são **transferidos
para fora do Brasil**. A Lei Geral de Proteção de Dados permite isso com
salvaguardas, e nós as adotamos: ⚠️ os contratos com os provedores incluem as
garantias contratuais previstas na lei, e os dados são protegidos em trânsito e
em repouso. Se o PetDots passar a hospedar os dados no Brasil, este aviso será
atualizado.

#### 4. Por quanto tempo guardamos

- **Lista de espera:** até você pedir para sair, ou ⚠️ até **12 meses** depois
  de o PetDots chegar ao seu bairro, o que vier antes.
- **Conta, endereço e pets:** enquanto a conta existir. Se você pedir para
  apagá-la, **removemos os seus dados pessoais**; o que ficar em pedidos
  passados é **anonimizado**, não apagado, porque o registro de venda precisa
  ser mantido pela lei fiscal ⚠️ por **5 anos**.
- **Registros técnicos:** 7 dias.

#### 5. Seus direitos

A lei garante a você, sobre os seus dados: **saber se os temos**, **acessá-los**,
**corrigi-los**, **pedir a anonimização ou a exclusão**, **levá-los para outro
serviço**, **saber com quem foram compartilhados** e **retirar um
consentimento** que tenha dado. Para exercer qualquer um deles, escreva para
[contato@petdots.com.br] a partir do e-mail ou do celular cadastrado, para
que possamos confirmar que é você. Respondemos em até 15 dias.

#### 6. Como protegemos

Senhas guardadas de forma irreversível, comunicação sempre criptografada,
acesso ao banco de dados restrito, e cada ação sobre um pedido registrada com
autor e data. Nenhum sistema é infalível; se algum incidente atingir os seus
dados, avisaremos você e a autoridade competente.

#### 7. Idade mínima

O PetDots é para **maiores de 18 anos**. Se soubermos de uma conta criada por
menor, ela será removida.

#### 8. Mudanças neste aviso

Quando este aviso mudar, a data no topo muda junto. Mudança que altere para que
usamos os seus dados será avisada a você pelo e-mail ou celular cadastrado.

---

## Parte 2 — As frases curtas que trocam o texto provisório

**Rodapé da página inicial da landing** (hoje termina em *"fale com
`contato@petdots.com.br (a definir)`"*):

> Guardamos seu nome, celular, bairro e CEP apenas para avisar quando o PetDots
> chegar ao seu bairro. Não repassamos seus dados a terceiros. Saiba mais no
> nosso [aviso de privacidade](/privacidade) ou escreva para
> contato@petdots.com.br.

**Rodapé de `/precos`** (hoje: *"Dúvidas sobre seus dados: … (a definir)"*):

> Os preços vêm das petshops do Grande Méier e podem mudar. Confirme com a loja
> antes de comprar. [Aviso de privacidade](/privacidade).

**Tela `/cadastro` do app** (hoje: *"Ao criar a conta você concorda com o aviso
de privacidade do PetDots."*, sem link):

> Ao criar a conta você aceita o [aviso de privacidade](https://petdots.com.br/privacidade)
> do PetDots.

A troca de "concorda com" por "aceita" é deliberada: a base legal da conta é a
**execução do contrato**, e "concordar" sugere um consentimento que a tela não
pede (e não deve pedir, ADR-0015 D10). O link abre no navegador, porque o aviso
vive na landing, não no app.

---

## O que este texto assume, e quem confirma

| # | Onde | O que o texto assume | Quem decide |
|---|---|---|---|
| A1 | Cabeçalho | O responsável é o fundador enquanto não há CNPJ (item 14 da intervenção manual). Ao sair, o cabeçalho troca para razão social e CNPJ | Victor; leitura jurídica recomendada |
| A2 | Cabeçalho, §5 | O canal é `contato@petdots.com.br`, **encaminhado para uma caixa que o Victor já lê**. Com o DNS no Cloudflare (ADR-0020, E6), o Email Routing faz o encaminhamento sem custo. ⚠️ **Falta o Victor dizer qual caixa recebe** | Victor |
| A3 | §1 | Base legal da conta = execução de contrato; da lista de espera = consentimento. ✅ **Aprovado pelo Victor em 13/09/2026** | — |
| A4 | §1, registros técnicos | Retenção de logs de **7 dias** — é o histórico de log do plano Hobby do Railway (ADR-0020). Se a observabilidade gerenciada (ADR-0006 #8) retiver mais, o número muda | Victor, na `pd-19` |
| A5 | §3 | Os provedores oferecem garantias contratuais compatíveis com o art. 33 da LGPD e a Resolução CD/ANPD nº 19/2024. ⚠️ **Não verificado**: os termos do Railway e do Cloudflare precisam ser lidos na contratação. Se não houver cláusula compatível, o gatilho (b) do ADR-0020 E11 dispara | Leitura jurídica |
| A6 | §4 | Lista de espera apagada **12 meses** após o lançamento no bairro | Victor |
| A7 | §4 | Retenção fiscal de pedidos por **5 anos** — prazo usual de guarda de documentos fiscais no Brasil. Confirmar com o contador quando o CNPJ sair | Contador |
| A8 | §5 | Prazo de resposta de **15 dias**, o da LGPD (art. 19). ⚠️ **Hoje o atendimento é manual**: não existe tela de exportação nem de exclusão (capacidade 14), e apagar uma conta com pedido **falha no banco** por construção (`BACKLOG`, vigilância). Até a capacidade 14, o Victor cumpre o pedido por SQL, anonimizando o pedido à mão. O aviso promete o direito; a operação é dele | Victor |
| A9 | §7 | Maiores de 18. Não há verificação de idade no cadastro, e não haverá no MVP | Victor |
| A10 | §1, pagamento | Trechos marcados "quando o pagamento existir" ficam **fora da primeira publicação** ou entram como estão, à escolha do Victor. O parceiro é o Asaas (ADR-0019), mas o nome só entra quando a conta existir | Victor, na `pd-19` |

## O que a `pd-19` faz com isto

1. Cria a rota `/privacidade` na landing com a Parte 1, sem os ⚠️.
2. Troca `PRIVACY_CONTACT` em `apps/landing/src/content/privacy.ts` pelo
   endereço real e aplica as três frases da Parte 2.
3. Acrescenta `/privacidade` às rotas fixas do `sitemap.xml`.
4. Ao mover o DNS para o Cloudflare, liga o Email Routing de
   `contato@petdots.com.br` para a caixa que o Victor indicar.
5. Fecha os itens 4, 12 e 15 da intervenção manual e remove este `draft`
   promovendo o documento a `stable`, com o texto igual ao publicado.
