import 'server-only';

import {
  type ComparedOffer,
  comparedOfferListSchema,
  type DeliveryAreaWithStore,
  deliveryAreaListSchema,
  type Product,
  productListSchema,
} from '@petdots/contracts';

/**
 * A API é chamada pelo servidor da landing, nunca pelo navegador (pd-09, A6):
 * não há CORS a configurar e a URL interna não vai para o cliente. Em
 * desenvolvimento o default basta; no deploy a plataforma injeta a variável.
 *
 * `server-only` faz o build quebrar se algum dia este módulo for importado por
 * um componente de cliente — que é como a URL interna vazaria.
 */
const API_URL = process.env.PETDOTS_API_URL ?? 'http://localhost:3001';

/** O catálogo muda por seed, não por requisição: 5 minutos de ISR bastam. */
const CATALOG_REVALIDATE_SECONDS = 300;

/** Trava do laço do sitemap: 50 páginas de 50 é catálogo demais para um piloto. */
const MAX_SITEMAP_PAGES = 50;

/**
 * Rede fora, API derrubada, resposta ilegível: tudo chega às páginas como este
 * erro, e elas mostram uma mensagem genérica. Nenhum detalhe técnico atravessa
 * a fronteira (SECURITY).
 */
export class ApiUnavailableError extends Error {
  constructor() {
    super('a API do PetDots não respondeu');
    this.name = 'ApiUnavailableError';
  }
}

interface SearchProductsInput {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductPage {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
}

export async function searchProducts(input: SearchProductsInput = {}): Promise<ProductPage> {
  const query = new URLSearchParams();

  if (input.q) {
    query.set('q', input.q);
  }

  if (input.page && input.page > 1) {
    query.set('page', String(input.page));
  }

  if (input.pageSize) {
    query.set('pageSize', String(input.pageSize));
  }

  const body = await getJson('/api/v1/products', query, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });

  return productListSchema.parse(body);
}

/**
 * Resolve a URL pública `/precos/{slug}` num produto. O `?slug=` da busca faz o
 * papel de lookup por identificador público — não há rota dedicada porque não
 * há uma segunda coisa que ela faria (API_GUIDELINES v1.3).
 */
export async function findProductBySlug(slug: string): Promise<Product | null> {
  const query = new URLSearchParams({ slug, pageSize: '1' });

  const body = await getJson('/api/v1/products', query, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });

  return productListSchema.parse(body).items[0] ?? null;
}

export async function listDeliveryAreas(): Promise<DeliveryAreaWithStore[]> {
  const body = await getJson('/api/v1/delivery-areas', new URLSearchParams(), {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });

  return deliveryAreaListSchema.parse(body).items;
}

interface CompareOffersInput {
  productId: string;
  neighborhood?: string;
  postalCode?: string;
}

export async function compareOffers(input: CompareOffersInput): Promise<ComparedOffer[]> {
  const query = new URLSearchParams({ productId: input.productId });

  if (input.neighborhood) {
    query.set('neighborhood', input.neighborhood);
  }

  if (input.postalCode) {
    query.set('postalCode', input.postalCode);
  }

  // Sem cache: o preço é o produto, e um valor de cinco minutos atrás é uma
  // informação errada na tela de quem vai decidir onde comprar.
  const body = await getJson('/api/v1/offers', query, { cache: 'no-store' });

  return comparedOfferListSchema.parse(body).items;
}

/** Todos os produtos ativos, paginando até esgotar o `total` — para o sitemap. */
export async function listAllProducts(): Promise<Product[]> {
  const products: Product[] = [];

  for (let page = 1; page <= MAX_SITEMAP_PAGES; page += 1) {
    const result = await searchProducts({ page, pageSize: 50 });

    products.push(...result.items);

    if (products.length >= result.total || result.items.length === 0) {
      break;
    }
  }

  return products;
}

async function getJson(
  path: string,
  query: URLSearchParams,
  init: RequestInit & { next?: { revalidate: number } },
): Promise<unknown> {
  const suffix = query.size > 0 ? `?${query.toString()}` : '';

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}${suffix}`, init);
  } catch {
    throw new ApiUnavailableError();
  }

  if (!response.ok) {
    throw new ApiUnavailableError();
  }

  try {
    return await response.json();
  } catch {
    throw new ApiUnavailableError();
  }
}
