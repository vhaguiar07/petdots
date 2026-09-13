---
title: Aviso de Privacidade
status: stable
version: "1.0"
updated: 2026-09-13
scope: >
  Texto proposto para a página pública /privacidade da landing, que a pd-19
  materializa e que fecha de uma vez os itens 4, 12 e 15 da intervenção manual
  do BACKLOG: o canal de contato do titular, a base legal do cadastro (e o
  destino do link do /cadastro) e a declaração de transferência internacional
  que o hosting nos Estados Unidos exige (ADR-0020, E10). Redigido pela IA a
  partir do que o sistema de fato coleta hoje, aprovado pelo Victor em
  13/09/2026 e publicado pela pd-19; a leitura jurídica segue por fazer. Também
  traz as frases curtas que substituíram o texto provisório da landing e do app.
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

> ✅ **Aprovado pelo Victor em 13/09/2026 e materializado na `pd-19`.** A Parte
> 1 abaixo é **o texto da página `/privacidade`**, palavra por palavra —
> `apps/landing/src/app/privacidade/page.tsx`. As três frases da Parte 2 já
> substituíram o texto provisório no rodapé da home, no rodapé de `/precos` e na
> tela `/cadastro` do app.
>
> 🔴 **Mudar uma frase aqui exige mudar a página junto, e vice-versa.** Um
> documento canônico que descreve um texto jurídico diferente do publicado é
> pior do que não existir: é dele que a próxima revisão parte.
>
> ⏳ **O que continua pendente e não trava a publicação:** a **leitura jurídica**
> (premissa A5) e a confirmação do prazo fiscal com o contador (A7). As duas
> estão na intervenção manual do [`BACKLOG`](../07-process/BACKLOG.md).

---

## Parte 1 — O texto da página `/privacidade`

### Aviso de Privacidade do PetDots

*Última atualização: a data de `PRIVACY_UPDATED_AT` em
`apps/landing/src/content/privacy.ts` — trocada a cada revisão deste texto,
como o §8 promete.*

O PetDots é um serviço para quem tem pet no Grande Méier, no Rio de Janeiro:
compara preços entre as petshops que entregam na sua rua e, em breve, permite
fazer o pedido e receber em casa. Para isso, guardamos alguns dados seus. Este
aviso explica **quais, para quê, com quem e por quanto tempo**, e como você
exerce os seus direitos.

**Quem é responsável pelos seus dados:** o PetDots está em fase piloto e ainda
não tem empresa constituída. Até que tenha, o responsável é o fundador do
projeto, que você alcança pelo canal abaixo.

**Fale com a gente sobre seus dados:** contato@petdots.com.br. Respondemos em
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
- **quando o pagamento existir**, ele será processado por um parceiro de
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
  Usamos para segurança e para diagnosticar erros. Esses registros são apagados
  em até **14 dias**;
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
- **O parceiro de pagamento**, quando existir.
- **Autoridades**, se a lei exigir.

**Não vendemos seus dados** e **não os usamos para publicidade de terceiros**.

#### 3. Seus dados saem do Brasil

Como os servidores ficam nos Estados Unidos, os seus dados são **transferidos
para fora do Brasil**. A Lei Geral de Proteção de Dados permite isso com
salvaguardas, e nós as adotamos: os contratos com os provedores incluem as
garantias contratuais previstas na lei, e os dados são protegidos em trânsito e
em repouso. Se o PetDots passar a hospedar os dados no Brasil, este aviso será
atualizado.

#### 4. Por quanto tempo guardamos

- **Lista de espera:** até você pedir para sair, ou até **12 meses** depois
  de o PetDots chegar ao seu bairro, o que vier antes.
- **Conta, endereço e pets:** enquanto a conta existir. Se você pedir para
  apagá-la, **removemos os seus dados pessoais**; o que ficar em pedidos
  passados é **anonimizado**, não apagado, porque o registro de venda precisa
  ser mantido pela lei fiscal por **5 anos**.
- **Registros técnicos:** até 14 dias.

#### 5. Seus direitos

A lei garante a você, sobre os seus dados: **saber se os temos**, **acessá-los**,
**corrigi-los**, **pedir a anonimização ou a exclusão**, **levá-los para outro
serviço**, **saber com quem foram compartilhados** e **retirar um
consentimento** que tenha dado. Para exercer qualquer um deles, escreva para
contato@petdots.com.br a partir do e-mail ou do celular cadastrado, para que
possamos confirmar que é você. Respondemos em até 15 dias.

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

## Premissas do texto, e quem as confirmou

> Estado em 13/09/2026, no fecho da `pd-19`. **Duas seguem abertas** — A5 e A7 —
> e nenhuma das duas trava a publicação: as duas são verificações externas de
> prazos que o texto já declara.

| # | Onde | O que o texto assume | Estado |
|---|---|---|---|
| A1 | Cabeçalho | O responsável é o fundador enquanto não há CNPJ (item 14 da intervenção manual). Ao sair, o cabeçalho troca para razão social e CNPJ | ✅ **Aprovado pelo Victor** (portão da `pd-19`, P1). A troca do cabeçalho fica em "Pendências de produção" do `BACKLOG` |
| A2 | Cabeçalho, §5 | O canal é `contato@petdots.com.br`, **encaminhado para uma caixa que o Victor já lê** pelo Email Routing do Cloudflare, sem custo | ⏳ **Publicado no texto; o encaminhamento é da Etapa 2** — exige o DNS já no Cloudflare (ADR-0020, E6) e o Victor dizer qual caixa recebe. 🔴 É **pré-condição de go-live**: a página promete um canal que a LGPD manda oferecer ao titular |
| A3 | §1 | Base legal da conta = execução de contrato; da lista de espera = consentimento | ✅ **Aprovado pelo Victor em 13/09/2026.** Fecha o item 12 da intervenção manual, junto com o link do `/cadastro` |
| A4 | §1 e §4, registros técnicos | Retenção de **até 14 dias** | ✅ **Resolvido, e o número mudou.** O rascunho dizia 7 dias, que é o histórico de log do Railway Hobby. Com o [ADR-0021](../06-decisions/ADR/0021-destino-da-telemetria-do-piloto.md) o **trace** também passou a ser registro técnico, e um span de HTTP pode carregar o endereço do chamador: o Grafana Cloud o retém **14 dias**. O aviso declara o **maior** dos dois, que é o prazo que o titular precisa saber |
| A5 | §3 | Os provedores oferecem garantias contratuais compatíveis com o art. 33 da LGPD e a Resolução CD/ANPD nº 19/2024 | 🔴 **ABERTA — não verificada.** O texto publicado afirma isso; os termos do Railway e do Cloudflare precisam ser lidos na contratação. Se não houver cláusula compatível, o gatilho (b) do ADR-0020 E11 dispara e a saída nomeada é o Fly.io em São Paulo. Está na intervenção manual do `BACKLOG` |
| A6 | §4 | Lista de espera apagada **12 meses** após o lançamento no bairro | ✅ **Aprovado pelo Victor** (P1) |
| A7 | §4 | Retenção fiscal de pedidos por **5 anos** — prazo usual de guarda de documentos fiscais no Brasil | ⏳ **ABERTA — confirmar com o contador** quando o CNPJ sair (item 14). Publicada porque ainda não há pedido pago: o prazo só passa a valer sobre dado real com a `pd-17`. Está na intervenção manual do `BACKLOG` |
| A8 | §5 | Prazo de resposta de **15 dias**, o da LGPD (art. 19) | ✅ **Aceito pelo Victor** (P1), com o custo declarado: **o atendimento é manual**. Não existe tela de exportação nem de exclusão (capacidade 14), e apagar uma conta com pedido **falha no banco** por construção (vigilância do `BACKLOG`). Até lá o Victor cumpre o pedido por SQL. O aviso promete o direito; a operação é dele |
| A9 | §7 | Maiores de 18. Não há verificação de idade no cadastro, e não haverá no MVP | ✅ **Aprovado pelo Victor** (P1) |
| A10 | §1 e §2, pagamento | Os trechos "quando o pagamento existir" | ✅ **Decidido no portão da `pd-19` (P2): entram como estão.** Não nomeiam o Asaas, descrevem o que vai acontecer, e poupam uma republicação do aviso — com troca de data — na `pd-17`. O nome do parceiro e o link da política dele entram quando a conta existir |

## O que a `pd-19` fez com isto

✅ **Feito na Etapa 1** (código, mergeado na `develop`):

1. A rota `/privacidade` existe na landing, com a Parte 1 e sem nenhum ⚠️ —
   `apps/landing/src/app/privacidade/page.tsx`.
2. `PRIVACY_CONTACT` deixou de ser `contato@petdots.com.br (a definir)` e virou
   o endereço real; as três frases da Parte 2 substituíram o texto provisório no
   rodapé da home, no rodapé de `/precos` e na tela `/cadastro` do app, esta
   última agora um **link** para a página.
3. `/privacidade` entrou nas rotas fixas do `sitemap.xml` — e é uma das duas
   únicas URLs que o sitemap publica enquanto o comparador está fora do menu.
4. Este documento virou `stable`, com o texto igual ao publicado.

⏳ **Etapa 2 (montagem), e o que ainda depende do Victor:**

5. Ligar o **Email Routing** de `contato@petdots.com.br` para a caixa que ele
   indicar — 🔴 pré-condição de go-live (A2).
6. Trocar `PRIVACY_UPDATED_AT` para a data da publicação, no mesmo commit que
   promover `develop` → `master`.
7. A **leitura jurídica** (A5) e a confirmação do prazo fiscal (A7).

Com isso saem os itens **4**, **12** e **15** da intervenção manual do
`BACKLOG`: o canal de contato real, a base legal do cadastro com destino para o
link, e a declaração de transferência internacional.
