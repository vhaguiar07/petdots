/**
 * Se o comparador de preços é **anunciado** ao visitante.
 *
 * 🔴 Não é uma chave que liga ou desliga a feature: as rotas `/precos` e
 * `/precos/[slug]` respondem sempre, e é de propósito — o Victor precisa poder
 * demonstrar o comparador por um link direto antes de ele existir para o
 * público. O que isto governa é a **descoberta**: os dois links da home, as
 * URLs no `sitemap.xml` e o `noindex` das páginas.
 *
 * **Por que ele começa escondido** (ADR-0020, E9): o catálogo de produção sobe
 * **vazio**. As oito lojas do seed são fictícias, herdadas do spike, e não
 * podem ir a um ambiente público antes do censo de rua (item 3b do `BACKLOG`).
 * Um comparador que responde "nenhum produto encontrado" a toda busca, para
 * quem chegou por campanha paga, é pior do que não ter o link — e uma página de
 * produto vazia indexada pelo buscador é um prejuízo que sobrevive ao conserto.
 *
 * **Falha fechado.** Esquecer a variável em produção **esconde** o comparador;
 * nunca o expõe. O inverso — anunciar por omissão — seria a única forma de este
 * arquivo causar dano.
 *
 * ⚠️ **Lida no build, não a cada requisição.** A home é pré-renderizada, então
 * mudar a variável no painel do Railway só tem efeito no redeploy que a mudança
 * dispara. É o comportamento desejado: ligar o comparador é um ato, não uma
 * configuração que escorrega.
 */
export function isComparadorListed(env: NodeJS.ProcessEnv = process.env): boolean {
  // Em desenvolvimento ele é sempre anunciado, sem exigir um `.env` que a
  // landing não carrega: os roteiros manuais da pd-11 pressupõem os links no
  // lugar, e um roteiro que começa com "defina uma variável" não é percorrido.
  return env.PETDOTS_COMPARADOR_PUBLICO === 'true' || env.NODE_ENV === 'development';
}
