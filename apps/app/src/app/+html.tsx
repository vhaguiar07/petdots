import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML of every statically rendered page. It runs only on the server, at
 * export time — no browser API and no React state here.
 *
 * Two of the things it carries are corrections to React Native Web defaults,
 * and both are paid exactly once for the whole app:
 *
 * - `lang`: the Expo template ships `en`, and a wrong language is a real
 *   accessibility violation for a Brazilian product;
 * - the focus ring below: RNW gives focusable roles no visible focus of their
 *   own. Fixing that per component would be the "perpetual tax" the gate is
 *   looking for; fixing it here is one CSS rule.
 */
const RESET = `
  /* RNW gives focusable roles no focus ring of their own (B7). */
  :focus-visible {
    outline: 2px solid #0B62D6;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* The page title is NOT set here: expo-router injects its own empty
            `<title data-rh>` ahead of anything this file writes, and the empty
            one wins. `AppShell` sets it per screen through `expo-router/head`. */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: RESET }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
