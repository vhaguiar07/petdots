/**
 * O endereço público da landing, usado onde a URL precisa ser absoluta:
 * `sitemap.xml`, `robots.txt` e a canonical das páginas de produto.
 *
 * O default é a porta de desenvolvimento; no deploy a plataforma injeta
 * `PETDOTS_SITE_URL` (documentado em `.env.example`).
 */
export const SITE_URL = (process.env.PETDOTS_SITE_URL ?? 'http://localhost:3002').replace(
  /\/+$/,
  '',
);
