import Link from 'next/link';
import type { ReactNode } from 'react';

import { PRIVACY_CONTACT } from '../../content/privacy';
import styles from './precos.module.css';

/**
 * A moldura das páginas do comparador — o mesmo topo e rodapé da home, sem
 * repetir a marcação em duas páginas. Não virou `layout.tsx` porque o rodapé da
 * home fala de lista de espera e o daqui fala de preço.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/">
          <span className={styles.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          PetDots
        </Link>
        <Link className={styles.topbarLink} href="/#lista-de-espera">
          Entrar na lista de espera
        </Link>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerBrand}>PetDots</p>
          <p>
            Os preços vêm das petshops do Grande Méier e podem mudar. Confirme com a loja antes de
            comprar. Dúvidas sobre seus dados: {PRIVACY_CONTACT}.
          </p>
        </div>
      </footer>
    </div>
  );
}
