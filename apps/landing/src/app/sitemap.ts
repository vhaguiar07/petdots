import type { MetadataRoute } from 'next';

import { listAllProducts } from '../lib/api';
import { SITE_URL } from '../lib/site';

/**
 * ISR de 5 minutos. Sem isto o sitemap seria congelado no `next build` — e um
 * build feito com a API fora publicaria para sempre um sitemap de duas URLs.
 */
export const revalidate = 300;

/**
 * O comparador é o único ativo de aquisição orgânica do MVP (ADR-0004 #13), e
 * uma página por produto só é indexada se o buscador souber que ela existe.
 *
 * Se a API estiver fora no momento do build, o sitemap sai com as duas rotas
 * fixas em vez de falhar: meia listagem é melhor que nenhuma página.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/precos`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ];

  try {
    const products = await listAllProducts();

    return [
      ...fixed,
      ...products.map((product) => ({
        url: `${SITE_URL}/precos/${product.slug}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return fixed;
  }
}
