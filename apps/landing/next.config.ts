import type { NextConfig } from 'next';

/**
 * Cabeçalhos de segurança da landing, aplicados a tudo que ela serve.
 *
 * ⚠️ **Sem Content-Security-Policy, de propósito.** A landing não tem sessão,
 * não lê `localStorage` e não guarda token nenhum — o estrago de um XSS aqui é
 * pequeno —, e uma CSP no Next exige nonce por middleware, que é código novo
 * numa app que hoje não tem nenhum. O app web é outra história: a sessão dele
 * vive no `localStorage` (ADR-0012), e por isso **ele** ganhou CSP nesta mesma
 * tarefa, servida pelo `_headers` do Cloudflare Pages.
 *
 * `Strict-Transport-Security` só tem efeito sob HTTPS, então é inerte em
 * desenvolvimento e vale a partir do primeiro acesso ao domínio publicado.
 */
const SECURITY_HEADERS = [
  // O navegador para de adivinhar o tipo do conteúdo — é o que impede um
  // arquivo servido como texto de ser executado como script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Ninguém embute a landing num iframe: não há nada aqui para clickjacking
  // roubar hoje, e o formulário de lista de espera é um alvo barato demais.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // A landing não usa nenhuma delas.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The header advertises the framework to anyone scanning; nothing needs it.
  poweredByHeader: false,
  headers: () => Promise.resolve([{ source: '/:path*', headers: SECURITY_HEADERS }]),
};

export default nextConfig;
