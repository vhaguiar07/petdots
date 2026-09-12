import type { Product } from '@petdots/contracts';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { searchProducts } from '../api/catalog';
import { ApiUnavailableError } from '../api/http';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Body, Button, Cell, Field, Table, TableHeader, TableRow } from '../ui/primitives';
import { Colors, Radius, Spacing } from '../ui/theme';

/** Long enough that typing a word is one request, short enough to feel live. */
const DEBOUNCE_MS = 300;

type Result =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready';
      readonly items: Product[];
      readonly total: number;
      readonly lastPage: number;
    }
  | { readonly kind: 'unavailable' };

/**
 * The first screen of J2: find the product, then compare it.
 *
 * 🔴 Two screens and paginated, never the spike's flat list of every offer —
 * that shape is what produced 36.7 s on a 400 kbps connection, and it is
 * written down as a rule precisely so it is not rebuilt by accident
 * (ADR-0012, A9).
 */
export function ProductSearchScreen() {
  const { http } = useSession();
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result>({ kind: 'loading' });

  /**
   * Stamps each request so a slow answer cannot overwrite a newer one. Typing
   * "golden" fires as the term settles; without the stamp, a response for
   * "gold" arriving late would replace the results for "golden".
   */
  const latest = useRef(0);

  useEffect(() => {
    const stamp = ++latest.current;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      void searchProducts(http, { q: term.trim() || undefined, page, signal: controller.signal })
        .then((body) => {
          if (stamp === latest.current) {
            setResult({
              kind: 'ready',
              items: body.items,
              total: body.total,
              lastPage: Math.max(1, Math.ceil(body.total / body.pageSize)),
            });
          }
        })
        .catch((error: unknown) => {
          if (stamp === latest.current && error instanceof ApiUnavailableError) {
            setResult({ kind: 'unavailable' });
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [http, term, page]);

  return (
    <AppShell
      title="Quanto custa no seu bairro"
      subtitle="Busque a ração, a areia ou o antipulgas do seu pet e veja o preço em cada petshop que entrega na sua rua."
    >
      <Field
        label="O que seu pet usa"
        value={term}
        onChangeText={(next) => {
          setTerm(next);
          // A new term starts a new result set; staying on page 3 would show
          // an empty page for a search with two results.
          setPage(1);
        }}
        placeholder="Ex.: golden 15 kg, areia, antipulgas"
        maxLength={80}
        autoCapitalize="none"
        returnKeyType="search"
        style={styles.search}
      />

      {result.kind === 'loading' ? <Skeleton /> : null}

      {result.kind === 'unavailable' ? (
        <Body muted>Não conseguimos carregar o catálogo agora. Tente de novo em instantes.</Body>
      ) : null}

      {result.kind === 'ready' && result.items.length === 0 ? (
        <Body muted>Nenhum produto encontrado — tente outra marca ou tamanho.</Body>
      ) : null}

      {result.kind === 'ready' && result.items.length > 0 ? (
        <>
          <Body muted>
            {result.total === 1 ? '1 produto' : `${String(result.total)} produtos`}
            {term.trim() ? ` para “${term.trim()}”` : ''}
          </Body>

          <Table label="Produtos encontrados">
            <TableHeader>
              <Cell width={2} header>
                Marca
              </Cell>
              <Cell width={5} header>
                Produto
              </Cell>
              <Cell width={2} header>
                Variante
              </Cell>
            </TableHeader>

            {result.items.map((product, index) => (
              <TableRow key={product.id} zebra={index % 2 === 1}>
                <Cell width={2}>{product.brand}</Cell>
                <Cell width={5}>
                  {/* A real `<a href>`: right-click, open in a new tab and the
                      back button all have something to act on. */}
                  <Link href={`/precos/${product.slug}`} style={styles.productLink}>
                    {product.name}
                  </Link>
                </Cell>
                <Cell width={2}>{product.variant}</Cell>
              </TableRow>
            ))}
          </Table>

          {result.lastPage > 1 ? (
            <View style={styles.pager} role="navigation" aria-label="Paginação dos resultados">
              <Button
                label="← Anterior"
                compact
                disabled={page <= 1}
                onPress={() => {
                  setPage((current) => Math.max(1, current - 1));
                }}
              />
              <Body muted>{`Página ${String(page)} de ${String(result.lastPage)}`}</Body>
              <Button
                label="Próxima →"
                compact
                disabled={page >= result.lastPage}
                onPress={() => {
                  setPage((current) => current + 1);
                }}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}

/** Three grey bars: the list is coming, and the layout does not jump. */
function Skeleton() {
  return (
    <View style={styles.skeleton} aria-label="Carregando produtos">
      {[0, 1, 2].map((line) => (
        <View key={line} style={styles.skeletonLine} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { maxWidth: 520 },
  productLink: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  pager: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  skeleton: { gap: Spacing.sm },
  skeletonLine: {
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
  },
});
