import { PRIVACY_CONTACT } from '../content/privacy';
import { BellIcon, StoreIcon, TagIcon } from './icons';
import styles from './page.module.css';
import { WaitlistForm } from './waitlist-form';

const FEATURES = [
  {
    Icon: BellIcon,
    title: 'Aviso antes de a ração acabar',
    text: 'Na conta do que seu pet come por dia — não num lembrete fixo.',
  },
  {
    Icon: TagIcon,
    title: 'Preço comparado no seu bairro',
    text: 'Entre as petshops que entregam na sua rua, não no país inteiro.',
  },
  {
    Icon: StoreIcon,
    title: 'Entrega da petshop da esquina',
    text: 'Quem já conhece o seu pet é quem leva a ração até você.',
  },
];

export default function Home() {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <p className={styles.brand}>
          <span className={styles.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          PetDots
        </p>
        <span className={styles.pill}>Em breve no Grande Méier</span>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="titulo">
          <p className={styles.eyebrow}>Para quem tem pet no Rio</p>
          <h1 className={styles.title} id="titulo">
            Saiba quando a ração acaba e <mark>onde comprar mais barato</mark> no seu bairro
          </h1>
          <p className={styles.lead}>
            Estamos começando pelo Grande Méier. Deixe seu contato e avisamos assim que chegarmos à
            sua região.
          </p>

          <ul className={styles.features}>
            {FEATURES.map(({ Icon, title, text }) => (
              <li className={styles.feature} key={title}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <Icon />
                </span>
                <div>
                  <p className={styles.featureTitle}>{title}</p>
                  <p className={styles.featureText}>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.formCard} aria-labelledby="lista-de-espera">
          <div className={styles.formHead}>
            <h2 className={styles.formTitle} id="lista-de-espera">
              Entrar na lista de espera
            </h2>
            <p className={styles.formHint}>
              Leva menos de um minuto. Avisamos uma vez, quando chegarmos ao seu bairro.
            </p>
          </div>
          <WaitlistForm />
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerBrand}>PetDots</p>
          <p>
            Guardamos seu nome, celular, bairro e CEP apenas para avisar quando o PetDots chegar ao
            seu bairro. Não repassamos seus dados a terceiros. Para consultar ou apagar o que
            guardamos, fale com {PRIVACY_CONTACT}.
          </p>
        </div>
      </footer>
    </div>
  );
}
