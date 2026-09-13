import type { Metadata } from 'next';
import Link from 'next/link';

import { formatPrivacyDate, PRIVACY_CONTACT, PRIVACY_UPDATED_AT } from '../../content/privacy';
import { PageShell } from '../precos/page-shell';
import styles from '../precos/precos.module.css';
import prose from './privacidade.module.css';

export const metadata: Metadata = {
  title: 'Aviso de privacidade | PetDots',
  description:
    'Quais dados o PetDots guarda, para quê, com quem compartilha, por quanto tempo, ' +
    'e como você exerce os seus direitos.',
  alternates: { canonical: '/privacidade' },
  robots: { index: true, follow: true },
};

const CONTACT_HREF = `mailto:${PRIVACY_CONTACT}`;

/**
 * A página que a LGPD manda existir, e o endereço que o item 12 do backlog
 * mandava a tela de cadastro do app apontar.
 *
 * 🔴 **O texto é o do rascunho revisado pelo Victor** —
 * `docs/01-product/AVISO_DE_PRIVACIDADE.md`, aprovado em 13/09/2026 —, e não
 * uma redação nova. Mudar uma frase aqui sem mudar lá deixa o documento
 * canônico mentindo sobre o que está publicado, que é a pior forma de
 * defasagem para um texto jurídico.
 *
 * É JSX, e não dados tipados em `content/privacy.ts`, porque o texto tem
 * títulos, listas, trechos em negrito e links no meio de frases: descrevê-lo
 * como estrutura exigiria inventar uma marcação, e conferir essa marcação
 * contra o documento seria mais difícil do que conferir o texto.
 */
export default function PrivacyPage() {
  return (
    <PageShell footer={<Footer />}>
      <header className={styles.head}>
        <h1 className={styles.title}>Aviso de Privacidade do PetDots</h1>
        <p className={prose.updated}>Última atualização: {formatPrivacyDate(PRIVACY_UPDATED_AT)}</p>
        <p className={styles.lead}>
          O PetDots é um serviço para quem tem pet no Grande Méier, no Rio de Janeiro: compara
          preços entre as petshops que entregam na sua rua e, em breve, permite fazer o pedido e
          receber em casa. Para isso, guardamos alguns dados seus. Este aviso explica{' '}
          <strong>quais, para quê, com quem e por quanto tempo</strong>, e como você exerce os seus
          direitos.
        </p>
      </header>

      <div className={prose.contact}>
        <p>
          <strong>Quem é responsável pelos seus dados:</strong> o PetDots está em fase piloto e
          ainda não tem empresa constituída. Até que tenha, o responsável é o fundador do projeto,
          que você alcança pelo canal abaixo.
        </p>
        <p>
          <strong>Fale com a gente sobre seus dados:</strong>{' '}
          <a href={CONTACT_HREF}>{PRIVACY_CONTACT}</a>. Respondemos em até <strong>15 dias</strong>.
        </p>
      </div>

      <div className={prose.prose}>
        <section className={prose.section}>
          <h2 className={prose.sectionTitle}>1. O que guardamos, e por quê</h2>

          <p className={prose.subTitle}>
            Se você entrou na lista de espera (o formulário da página inicial):
          </p>
          <ul>
            <li>
              o que você digitou: <strong>nome, celular, bairro, CEP</strong> e, se quis informar,{' '}
              <strong>a ração que seu pet come</strong>;
            </li>
            <li>
              de onde veio o cadastro (campanha, QR code na loja, ou &ldquo;ainda não atendemos o
              seu bairro&rdquo;) e{' '}
              <strong>a data em que você marcou a caixa de consentimento</strong>.
            </li>
          </ul>
          <p>
            Usamos isso para <strong>uma coisa</strong>: avisar você quando o PetDots chegar ao seu
            bairro, e entender quais bairros e rações pedem prioridade. Guardamos porque{' '}
            <strong>você consentiu</strong>, e você pode retirar esse consentimento quando quiser,
            pelo canal acima. Retirado, apagamos o cadastro.
          </p>

          <p className={prose.subTitle}>Se você criou uma conta (no app):</p>
          <ul>
            <li>
              para a conta existir: <strong>e-mail</strong> e <strong>senha</strong>. A senha é
              guardada em forma embaralhada e irreversível; nem nós conseguimos lê-la;
            </li>
            <li>
              para comparar preços e entregar: <strong>nome, celular e endereço de entrega</strong>{' '}
              (rua, número, complemento, bairro, CEP e ponto de referência);
            </li>
            <li>
              sobre o seu pet: <strong>nome, espécie, data de nascimento e peso</strong>. O peso é o
              que vai alimentar o aviso de &ldquo;a ração está acabando&rdquo;, quando ele existir.
            </li>
          </ul>
          <p>
            Guardamos isso porque{' '}
            <strong>é o que permite prestar o serviço que você pediu ao criar a conta</strong>. Por
            isso não pedimos um consentimento à parte: sem endereço não há comparação por rua nem
            entrega; sem e-mail e senha não há conta.
          </p>

          <p className={prose.subTitle}>Se você fez um pedido:</p>
          <ul>
            <li>
              o pedido guarda <strong>uma cópia</strong> do seu nome, celular e endereço no momento
              da compra, os itens, os valores e o que aconteceu com ele (aceito, entregue, recusado,
              cancelado, devolvido). A cópia existe para que o pedido continue fiel mesmo que você
              mude o cadastro depois;
            </li>
            <li>
              a petshop que atende o pedido{' '}
              <strong>recebe o seu nome, celular, endereço e os itens</strong>. É o mínimo para
              separar e entregar;
            </li>
            <li>
              <strong>quando o pagamento existir</strong>, ele será processado por um parceiro de
              pagamento autorizado a operar no Brasil, que receberá os dados necessários para a
              cobrança e a devolução. <strong>Nós não guardamos dados de cartão.</strong> A política
              do parceiro será linkada aqui.
            </li>
          </ul>
          <p>
            Guardamos o pedido porque <strong>ele é o contrato entre você e a petshop</strong>, e
            porque <strong>a lei fiscal exige</strong> que registros de venda sejam mantidos.
          </p>

          <p className={prose.subTitle}>Se você opera uma petshop no PetDots:</p>
          <ul>
            <li>
              o <strong>e-mail</strong> da sua conta, <strong>qual loja</strong> você opera e com
              que papel;
            </li>
            <li>
              <strong>cada ação sua num pedido</strong> (aceitar, recusar, despachar, confirmar a
              entrega, cancelar, alterar preço) fica registrada com data e autor. É o que protege
              você e o tutor numa divergência.
            </li>
          </ul>

          <p className={prose.subTitle}>
            Registros técnicos, para qualquer pessoa que use o site ou o app:
          </p>
          <ul>
            <li>
              o servidor registra{' '}
              <strong>endereço IP, data, hora e a página ou rota acessada</strong>. Usamos para
              segurança e para diagnosticar erros. Esses registros são apagados em até{' '}
              <strong>14 dias</strong>;
            </li>
            <li>
              para você não precisar entrar de novo a cada tela, o app guarda{' '}
              <strong>no seu próprio aparelho ou navegador</strong> uma chave de sessão. Ela não sai
              dali para ninguém além do PetDots, e é apagada quando você sai da conta;
            </li>
            <li>
              <strong>não usamos cookies de publicidade</strong> nem rastreamento de terceiros. A
              página inicial não usa cookies.
            </li>
          </ul>
        </section>

        <section className={prose.section}>
          <h2 className={prose.sectionTitle}>2. Com quem compartilhamos</h2>
          <ul>
            <li>
              <strong>A petshop que atende o seu pedido</strong>, como descrito acima. Nenhuma outra
              loja vê os seus dados nem o seu histórico.
            </li>
            <li>
              <strong>Os provedores que hospedam o PetDots.</strong> Nossos servidores e banco de
              dados ficam com a <strong>Railway</strong>, nos Estados Unidos, e o endereço do site e
              parte das páginas passam pela <strong>Cloudflare</strong>, que tem servidores em
              vários países. Eles guardam os dados por nós e não podem usá-los para outra coisa.
            </li>
            <li>
              <strong>Um diretório público de CEPs</strong>, que recebe{' '}
              <strong>apenas o CEP</strong> para confirmarmos o bairro. Nenhum outro dado seu é
              enviado.
            </li>
            <li>
              <strong>O parceiro de pagamento</strong>, quando existir.
            </li>
            <li>
              <strong>Autoridades</strong>, se a lei exigir.
            </li>
          </ul>
          <p>
            <strong>Não vendemos seus dados</strong> e{' '}
            <strong>não os usamos para publicidade de terceiros</strong>.
          </p>
        </section>

        <section className={prose.section}>
          <h2 className={prose.sectionTitle}>3. Seus dados saem do Brasil</h2>
          <p>
            Como os servidores ficam nos Estados Unidos, os seus dados são{' '}
            <strong>transferidos para fora do Brasil</strong>. A Lei Geral de Proteção de Dados
            permite isso com salvaguardas, e nós as adotamos: os contratos com os provedores incluem
            as garantias contratuais previstas na lei, e os dados são protegidos em trânsito e em
            repouso. Se o PetDots passar a hospedar os dados no Brasil, este aviso será atualizado.
          </p>
        </section>

        <section className={prose.section}>
          <h2 className={prose.sectionTitle}>4. Por quanto tempo guardamos</h2>
          <ul>
            <li>
              <strong>Lista de espera:</strong> até você pedir para sair, ou até{' '}
              <strong>12 meses</strong> depois de o PetDots chegar ao seu bairro, o que vier antes.
            </li>
            <li>
              <strong>Conta, endereço e pets:</strong> enquanto a conta existir. Se você pedir para
              apagá-la, <strong>removemos os seus dados pessoais</strong>; o que ficar em pedidos
              passados é <strong>anonimizado</strong>, não apagado, porque o registro de venda
              precisa ser mantido pela lei fiscal por <strong>5 anos</strong>.
            </li>
            <li>
              <strong>Registros técnicos:</strong> até 14 dias.
            </li>
          </ul>
        </section>

        <section className={prose.section}>
          <h2 className={prose.sectionTitle}>5. Seus direitos</h2>
          <p>
            A lei garante a você, sobre os seus dados: <strong>saber se os temos</strong>,{' '}
            <strong>acessá-los</strong>, <strong>corrigi-los</strong>,{' '}
            <strong>pedir a anonimização ou a exclusão</strong>,{' '}
            <strong>levá-los para outro serviço</strong>,{' '}
            <strong>saber com quem foram compartilhados</strong> e{' '}
            <strong>retirar um consentimento</strong> que tenha dado. Para exercer qualquer um
            deles, escreva para <a href={CONTACT_HREF}>{PRIVACY_CONTACT}</a> a partir do e-mail ou
            do celular cadastrado, para que possamos confirmar que é você. Respondemos em até 15
            dias.
          </p>
        </section>

        <section className={prose.section}>
          <h2 className={prose.sectionTitle}>6. Como protegemos</h2>
          <p>
            Senhas guardadas de forma irreversível, comunicação sempre criptografada, acesso ao
            banco de dados restrito, e cada ação sobre um pedido registrada com autor e data. Nenhum
            sistema é infalível; se algum incidente atingir os seus dados, avisaremos você e a
            autoridade competente.
          </p>
        </section>

        <section className={prose.section}>
          <h2 className={prose.sectionTitle}>7. Idade mínima</h2>
          <p>
            O PetDots é para <strong>maiores de 18 anos</strong>. Se soubermos de uma conta criada
            por menor, ela será removida.
          </p>
        </section>

        <section className={prose.section}>
          <h2 className={prose.sectionTitle}>8. Mudanças neste aviso</h2>
          <p>
            Quando este aviso mudar, a data no topo muda junto. Mudança que altere para que usamos
            os seus dados será avisada a você pelo e-mail ou celular cadastrado.
          </p>
        </section>
      </div>
    </PageShell>
  );
}

function Footer() {
  return (
    <p>
      Dúvidas sobre os seus dados? Escreva para <a href={CONTACT_HREF}>{PRIVACY_CONTACT}</a>.{' '}
      <Link href="/">Voltar para a página inicial</Link>.
    </p>
  );
}
