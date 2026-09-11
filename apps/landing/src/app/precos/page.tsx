import type { Metadata } from 'next';
import Link from 'next/link';

import { ApiUnavailableError, searchProducts } from '../../lib/api';
import { PageShell } from './page-shell';
import styles from './precos.module.css';

export const metadata: Metadata = {
  title: 'Comparador de preços de ração e produtos pet no Grande Méier | PetDots',
  description:
    'Busque a ração do seu pet e veja o preço nas petshops que entregam no seu bairro, ' +
    'com a taxa de entrega somada.',
};

interface SearchPageProps {
  // No App Router do Next 16, `searchParams` é uma Promise (ver
  // node_modules/next/dist/docs) — ler síncrono é o Next 14 da memória.
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const term = params.q?.trim() ?? '';
  const page = pageOf(params.page);

  let result;

  try {
    result = await searchProducts({ q: term || undefined, page });
  } catch (error) {
    if (!(error instanceof ApiUnavailableError)) {
      throw error;
    }

    return (
      <PageShell>
        <SearchForm term={term} />
        <p className={styles.empty} role="status">
          Não conseguimos carregar o catálogo agora. Tente de novo em instantes.
        </p>
      </PageShell>
    );
  }

  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <PageShell>
      <header className={styles.head}>
        <h1 className={styles.title}>Quanto custa no seu bairro</h1>
        <p className={styles.lead}>
          Busque a ração, a areia ou o antipulgas do seu pet e veja o preço em cada petshop que
          entrega na sua rua.
        </p>
      </header>

      <SearchForm term={term} />

      {result.items.length === 0 ? (
        <p className={styles.empty} role="status">
          Nenhum produto encontrado — tente outra marca ou tamanho.
        </p>
      ) : (
        <>
          <p className={styles.count} role="status">
            {result.total === 1 ? '1 produto' : `${String(result.total)} produtos`}
            {term ? ` para “${term}”` : ''}
          </p>

          <ul className={styles.results}>
            {result.items.map((product) => (
              <li key={product.id}>
                <Link className={styles.result} href={`/precos/${product.slug}`}>
                  <span className={styles.resultBrand}>{product.brand}</span>
                  <span className={styles.resultName}>{product.name}</span>
                  <span className={styles.resultVariant}>{product.variant}</span>
                </Link>
              </li>
            ))}
          </ul>

          {lastPage > 1 && (
            <nav className={styles.pager} aria-label="Paginação dos resultados">
              {page > 1 ? (
                <Link
                  className={styles.pagerLink}
                  href={hrefFor(term, page - 1)}
                  aria-label="Página anterior"
                >
                  ← Anterior
                </Link>
              ) : (
                <span className={styles.pagerLinkOff}>← Anterior</span>
              )}

              <span className={styles.pagerState}>
                Página {String(page)} de {String(lastPage)}
              </span>

              {page < lastPage ? (
                <Link
                  className={styles.pagerLink}
                  href={hrefFor(term, page + 1)}
                  aria-label="Próxima página"
                >
                  Próxima →
                </Link>
              ) : (
                <span className={styles.pagerLinkOff}>Próxima →</span>
              )}
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}

/**
 * Formulário GET puro: sem Server Action e sem JavaScript de cliente.
 *
 * A URL que sai daqui — `/precos?q=golden` — é compartilhável, indexável e
 * funciona com o JS desligado, que é exatamente o que uma página de aquisição
 * orgânica precisa ser (ADR-0004 #13, ADR-0010 A18).
 */
function SearchForm({ term }: { term: string }) {
  return (
    <form className={styles.search} method="get" action="/precos" role="search">
      <label className={styles.searchLabel} htmlFor="q">
        O que seu pet usa
      </label>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          id="q"
          name="q"
          type="search"
          defaultValue={term}
          placeholder="Ex.: golden 15 kg, areia, antipulgas"
          maxLength={80}
        />
        <button className={styles.searchButton} type="submit">
          Buscar
        </button>
      </div>
    </form>
  );
}

function hrefFor(term: string, page: number): string {
  const query = new URLSearchParams();

  if (term) {
    query.set('q', term);
  }

  if (page > 1) {
    query.set('page', String(page));
  }

  const suffix = query.toString();

  return suffix ? `/precos?${suffix}` : '/precos';
}

function pageOf(raw: string | undefined): number {
  const page = Number(raw);

  return Number.isInteger(page) && page > 0 ? page : 1;
}
