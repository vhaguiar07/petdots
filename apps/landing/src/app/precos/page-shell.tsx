import Link from 'next/link';
import type { ReactNode } from 'react';

import styles from './precos.module.css';

/**
 * A moldura das páginas do comparador — o mesmo topo e rodapé da home, sem
 * repetir a marcação em duas páginas. Não virou `layout.tsx` porque o rodapé da
 * home fala de lista de espera e o daqui fala de preço.
 *
 * ⚠️ **Usada também por `/privacidade`** desde a pd-19, que passa o próprio
 * `footer`: a página do aviso não deve terminar dizendo "confirme o preço com a
 * loja". É por isso que o rodapé é um parâmetro e não uma constante.
 */
export function PageShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
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
          {footer ?? (
            <p>
              Os preços vêm das petshops do Grande Méier e podem mudar. Confirme com a loja antes de
              comprar. <Link href="/privacidade">Aviso de privacidade</Link>.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
