import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE_URL } from '../lib/site';
import './globals.css';

const TITLE = 'PetDots — chegando ao Grande Méier';
const DESCRIPTION =
  'Saiba quando a ração do seu pet acaba e onde comprar mais barato no seu bairro. ' +
  'Entre na lista de espera e avisamos quando o PetDots chegar à sua região.';

export const metadata: Metadata = {
  // Base das URLs absolutas do `<head>`: sem ela, a canonical relativa das
  // páginas de produto quebra o build (Next 16).
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    locale: 'pt_BR',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
