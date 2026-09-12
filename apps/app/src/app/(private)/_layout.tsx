import { Redirect, Slot, usePathname } from 'expo-router';

import { useSession } from '@/session/session-context';
import { AppShell } from '@/ui/app-shell';
import { Body } from '@/ui/primitives';

/**
 * Everything under `(private)/` needs a session.
 *
 * 🔴 A layout that redirects, deliberately **not** `Stack.Protected`. It exists
 * in expo-router 57, but its own documentation says: "During static site
 * generation, no HTML files are created for protected routes". With
 * `web.output: "static"` (ADR-0008 #6) that means an F5 on `/conta` served by a
 * static host is a **404** — the page would simply not have been built.
 *
 * A redirect in a layout builds the HTML anyway. During the export the session
 * is `restoring` (the storage is only read after mount), so what gets written
 * to `conta.html` is the placeholder below, and the real decision happens in
 * the browser on the first render after mounting (ADR-0012, A7).
 */
export default function PrivateLayout() {
  const { state } = useSession();
  const pathname = usePathname();

  if (state.kind === 'restoring') {
    return (
      <AppShell title="Minha conta">
        <Body muted>Carregando sua sessão…</Body>
      </AppShell>
    );
  }

  if (state.kind === 'signedOut') {
    // `next` is what sends the person back where they were going, instead of
    // dropping them on the home page after they sign in.
    return <Redirect href={{ pathname: '/entrar', params: { next: pathname } }} />;
  }

  return <Slot />;
}
