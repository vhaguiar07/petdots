import type { ComparedOffer, DeliveryAreaWithStore, Product } from '@petdots/contracts';
import { isPostalCode } from '@petdots/domain';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ApiUnavailableError,
  compareOffers,
  findProductBySlug,
  listDeliveryAreas,
} from '../../../lib/api';
import { distinctNeighborhoods, formatCents, formatMinutes } from '../../../lib/format';
import { PageShell } from '../page-shell';
import styles from '../precos.module.css';
import product from './produto.module.css';

interface ProductPageProps {
  // `params` e `searchParams` são Promises no App Router do Next 16.
  params: Promise<{ productSlug: string }>;
  searchParams: Promise<{ bairro?: string; cep?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ProductPageProps): Promise<Metadata> {
  const { productSlug } = await params;
  const found = await safeFindProduct(productSlug);

  if (!found) {
    return { title: 'Produto não encontrado | PetDots' };
  }

  const address = addressOf(await searchParams);
  const offers = await safeCompare(found.id, address);
  const cheapest = offers.at(0);

  const title = `Preço de ${found.name} ${found.variant} no Grande Méier | PetDots`;
  const description = cheapest
    ? `${String(offers.length)} ${offers.length === 1 ? 'petshop entrega' : 'petshops entregam'} ` +
      `${found.brand} ${found.variant} no Grande Méier, a partir de ` +
      `${formatCents(cheapest.priceCents)}.`
    : `Veja quais petshops do Grande Méier vendem ${found.name} ${found.variant} e por quanto.`;

  return {
    title,
    description,
    openGraph: { title, description, locale: 'pt_BR', type: 'website' },
    // Sem a query: `?bairro=` é a mesma página filtrada, não outra página.
    alternates: { canonical: `/precos/${found.slug}` },
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { productSlug } = await params;
  const query = await searchParams;

  const neighborhood = query.bairro?.trim() ?? '';
  const rawPostalCode = query.cep?.trim() ?? '';
  // CEP inválido não vira requisição: a mensagem sai daqui mesmo, com a mesma
  // função de domínio que a API usaria para recusá-lo (ADR-0010, A24).
  const postalCodeIsValid = rawPostalCode === '' || isPostalCode(rawPostalCode);
  const postalCode = postalCodeIsValid ? rawPostalCode : '';
  const hasAddress = Boolean(neighborhood || postalCode);

  let found: Product | null = null;
  let offers: ComparedOffer[] = [];
  let areas: DeliveryAreaWithStore[] = [];
  let unavailable = false;

  try {
    found = await findProductBySlug(productSlug);
  } catch (error) {
    if (!(error instanceof ApiUnavailableError)) {
      throw error;
    }

    unavailable = true;
  }

  // `notFound()` fica FORA do try, de propósito: ele sinaliza por exceção, e um
  // `catch` no caminho passa a depender da ordem do relance para não engolir o
  // sinal do framework — é a armadilha que o `unstable_rethrow` do Next existe
  // para tapar. Aqui o sinal simplesmente não atravessa `catch` nenhum.
  if (!unavailable && !found) {
    notFound();
  }

  if (found) {
    try {
      [offers, areas] = await Promise.all([
        compareOffers({
          productId: found.id,
          neighborhood: neighborhood || undefined,
          postalCode: postalCode || undefined,
        }),
        listDeliveryAreas(),
      ]);
    } catch (error) {
      if (!(error instanceof ApiUnavailableError)) {
        throw error;
      }

      unavailable = true;
    }
  }

  if (!found) {
    return (
      <PageShell>
        <p className={styles.empty} role="status">
          Não conseguimos carregar este produto agora. Tente de novo em instantes.
        </p>
        <p>
          <Link className={product.backLink} href="/precos">
            ← Voltar para a busca
          </Link>
        </p>
      </PageShell>
    );
  }

  const cheapest = offers.at(0);
  const where = neighborhood || (postalCode ? `CEP ${postalCode}` : '');

  return (
    <PageShell>
      <p>
        <Link className={product.backLink} href="/precos">
          ← Voltar para a busca
        </Link>
      </p>

      <header className={product.head}>
        <p className={product.brand}>{found.brand}</p>
        <h1 className={product.title}>{found.name}</h1>
        <p className={product.variant}>
          {found.variant} · {formatGrams(found.netWeightGrams)}
        </p>
      </header>

      <form className={product.filter} method="get" role="search">
        <div className={product.filterField}>
          <label className={product.filterLabel} htmlFor="bairro">
            Seu bairro
          </label>
          <select className={product.select} id="bairro" name="bairro" defaultValue={neighborhood}>
            <option value="">Escolha o bairro</option>
            {distinctNeighborhoods(areas).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className={product.filterField}>
          <label className={product.filterLabel} htmlFor="cep">
            ou seu CEP
          </label>
          <input
            className={product.input}
            id="cep"
            name="cep"
            type="text"
            inputMode="numeric"
            maxLength={9}
            defaultValue={rawPostalCode}
            placeholder="20720-000"
            aria-invalid={!postalCodeIsValid}
            aria-describedby={postalCodeIsValid ? undefined : 'cep-erro'}
          />
          {!postalCodeIsValid && (
            <p className={product.fieldError} id="cep-erro" role="alert">
              CEP deve ter 8 dígitos.
            </p>
          )}
        </div>

        <button className={product.filterButton} type="submit">
          Ver quem entrega
        </button>
      </form>

      {unavailable ? (
        <p className={styles.empty} role="status">
          Não conseguimos consultar os preços agora. Tente de novo em instantes.
        </p>
      ) : offers.length === 0 ? (
        <div className={product.emptyCard} role="status">
          <p className={product.emptyTitle}>
            {hasAddress
              ? `Nenhuma loja entrega em ${where} ainda`
              : 'Nenhuma petshop do piloto tem este item no momento'}
          </p>
          <p className={product.emptyText}>
            Estamos abrindo bairro por bairro no Grande Méier.{' '}
            <Link href="/#lista-de-espera">Entre na lista de espera e avisamos</Link> quando
            chegarmos ao seu.
          </p>
        </div>
      ) : (
        <OfferTable
          offers={offers}
          productName={`${found.name} ${found.variant}`}
          where={where}
          hasAddress={hasAddress}
          cheapestOfferId={cheapest?.offerId}
        />
      )}
    </PageShell>
  );
}

interface OfferTableProps {
  offers: ComparedOffer[];
  productName: string;
  where: string;
  hasAddress: boolean;
  cheapestOfferId: string | undefined;
}

function OfferTable({ offers, productName, where, hasAddress, cheapestOfferId }: OfferTableProps) {
  return (
    <div className={product.tableWrap}>
      <table className={product.table}>
        <caption className={product.caption}>
          {hasAddress
            ? `Ofertas para ${productName} — ${String(offers.length)} ${
                offers.length === 1 ? 'loja entrega' : 'lojas entregam'
              } em ${where}, da mais barata para a mais cara`
            : `Ofertas para ${productName} — ${String(offers.length)} ${
                offers.length === 1 ? 'loja vende' : 'lojas vendem'
              }, ordenadas pelo preço do item`}
        </caption>
        <thead>
          <tr>
            <th scope="col">Loja</th>
            <th scope="col">Bairro</th>
            <th scope="col">Preço</th>
            <th scope="col">Entrega</th>
            <th scope="col">Prazo</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr
              key={offer.offerId}
              className={offer.offerId === cheapestOfferId ? product.best : undefined}
            >
              <td data-label="Loja">
                <span className={product.storeName}>{offer.store.name}</span>
                {offer.offerId === cheapestOfferId && hasAddress && (
                  <span className={product.badge} aria-label="Menor preço total">
                    menor preço
                  </span>
                )}
              </td>
              <td data-label="Bairro">{offer.store.neighborhood}</td>
              <td data-label="Preço">{formatCents(offer.priceCents)}</td>
              <td data-label="Entrega">
                {offer.deliveryArea ? (
                  formatCents(offer.deliveryArea.deliveryFeeCents)
                ) : (
                  <span className={product.unknown}>informe seu bairro</span>
                )}
              </td>
              <td data-label="Prazo">
                {offer.deliveryArea ? (
                  formatMinutes(offer.deliveryArea.estimatedMinutes)
                ) : (
                  <span className={product.unknown}>informe seu bairro</span>
                )}
              </td>
              <td data-label="Total">
                {offer.landedCents === null ? (
                  <span className={product.unknown}>informe seu bairro</span>
                ) : (
                  <strong>{formatCents(offer.landedCents)}</strong>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!hasAddress && (
        <p className={product.note}>
          Preço do item; a taxa de entrega depende do endereço. Escolha o bairro acima para ver o
          total.
        </p>
      )}
    </div>
  );
}

function addressOf(query: { bairro?: string; cep?: string }): {
  neighborhood?: string;
  postalCode?: string;
} {
  const neighborhood = query.bairro?.trim();
  const postalCode = query.cep?.trim();

  return {
    neighborhood: neighborhood || undefined,
    postalCode: postalCode && isPostalCode(postalCode) ? postalCode : undefined,
  };
}

/** "15 kg" já está na variante; aqui o peso serve para comparar tamanhos. */
function formatGrams(grams: number): string {
  return grams >= 1000
    ? `${(grams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
    : `${String(grams)} g`;
}

/** O metadata não pode derrubar a página: sem API, ele cai no título genérico. */
async function safeFindProduct(slug: string) {
  try {
    return await findProductBySlug(slug);
  } catch {
    return null;
  }
}

async function safeCompare(
  productId: string,
  address: { neighborhood?: string; postalCode?: string },
): Promise<ComparedOffer[]> {
  try {
    return await compareOffers({ productId, ...address });
  } catch {
    return [];
  }
}
