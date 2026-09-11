import type { Metadata } from 'next';
import Link from 'next/link';

import { PageShell } from './page-shell';
import styles from './precos.module.css';

export const metadata: Metadata = {
  title: 'Produto não encontrado | PetDots',
};

export default function ProductNotFound() {
  return (
    <PageShell>
      <header className={styles.head}>
        <h1 className={styles.title}>Não encontramos esse produto</h1>
        <p className={styles.lead}>
          Ele pode ter saído do catálogo do piloto, ou o endereço tem um erro de digitação.
        </p>
      </header>

      <p>
        <Link className={styles.topbarLink} href="/precos">
          Voltar para a busca
        </Link>
      </p>
    </PageShell>
  );
}
