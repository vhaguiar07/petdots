/**
 * Canal de contato do aviso de privacidade (LGPD).
 *
 * Deixou de ser provisório na pd-19: até então o valor era
 * `contato@petdots.com.br (a definir)`, marcado assim de propósito para que
 * ninguém o confundisse com um endereço em operação (decisão P4 da pd-09, item
 * 4 da intervenção manual do BACKLOG).
 *
 * 🔴 **A caixa é criada fora do repositório.** O endereço não existe como conta
 * de e-mail: quem o faz funcionar é o Email Routing do Cloudflare, que
 * encaminha para uma caixa do Victor e só pode ser ligado depois que o DNS de
 * `petdots.com.br` estiver no Cloudflare (ADR-0020, E6). É **pré-condição de
 * go-live**, não de deploy — a página pode subir antes, mas o aviso promete um
 * canal que a LGPD manda oferecer ao titular, e prometer um endereço que
 * devolve a mensagem é pior do que não ter página.
 */
export const PRIVACY_CONTACT = 'contato@petdots.com.br';

/**
 * A data que a página mostra em "Última atualização".
 *
 * Uma constante, e não `new Date()`: o aviso muda quando **o texto** muda, e
 * uma data que anda sozinha diria ao titular que algo mudou toda vez que o
 * serviço fosse reiniciado. Trocar este valor é parte de mudar o texto.
 *
 * ⚠️ **Atualizar no dia da publicação** (pd-19, Etapa 2) e a cada revisão do
 * aviso — o §8 do texto promete exatamente isso.
 */
export const PRIVACY_UPDATED_AT = '2026-09-13';

/** `AAAA-MM-DD` → `DD/MM/AAAA`, o formato que o leitor brasileiro espera. */
export function formatPrivacyDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');

  return `${day}/${month}/${year}`;
}
