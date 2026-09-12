import { Link, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { HealthIndicator } from '../api/health-indicator';
import { useSession } from '../session/session-context';
import { Body, Heading, Landmark } from './primitives';
import { Colors, DesktopMinWidth, MaxContentWidth, Spacing } from './theme';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link href={href} style={[styles.navLink, active && styles.navLinkActive]}>
      {label}
    </Link>
  );
}

/**
 * Chrome shared by every screen: navigation with real `<a href>` links (so
 * back/forward, reload and open-in-new-tab have something to act on), and the
 * API health badge.
 *
 * 🔴 The session link shows **nothing** while the session is `restoring`.
 * Reading the storage happens after mount (ADR-0012, A7), so rendering "Entrar"
 * by default would flash it at someone who is signed in, on every single page
 * load. Waiting until the answer is known costs one frame and removes the
 * flicker entirely (A19).
 */
export function AppShell({
  title,
  subtitle,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const { width } = useWindowDimensions();
  const desktop = width >= DesktopMinWidth;
  const { state } = useSession();

  // One place sets the document title for every screen. Without it the browser
  // tab, the history entry and the bookmark are all nameless (axe: document-title).
  const head = (
    <Head>
      <title>{`${title} — PetDots`}</title>
      <meta name="description" content={subtitle ?? 'PetDots — marketplace pet do seu bairro'} />
    </Head>
  );

  const header = (
    <Landmark role="banner" style={styles.header}>
      <View style={[styles.headerInner, desktop && styles.headerInnerDesktop]}>
        <View style={styles.brandBlock}>
          <Heading level={1} style={styles.brand}>
            PetDots
          </Heading>
          <Body muted>Eixo Grande Méier</Body>
        </View>

        <Landmark role="navigation" label="Navegação principal" style={styles.nav}>
          <NavLink href="/" label="Comparador" />
          {state.kind === 'signedIn' ? <NavLink href="/conta" label="Minha conta" /> : null}
          {state.kind === 'signedOut' ? <NavLink href="/entrar" label="Entrar" /> : null}
        </Landmark>

        <View style={styles.headerAside}>
          <HealthIndicator />
        </View>
      </View>
    </Landmark>
  );

  const titleBlock = (
    <View style={styles.titleBlock}>
      <Heading level={2}>{title}</Heading>
      {subtitle ? <Body muted>{subtitle}</Body> : null}
    </View>
  );

  const body = (
    <View style={styles.contentOuter}>
      <Landmark role="main" label={title} style={styles.content}>
        {titleBlock}
        {children}
      </Landmark>
    </View>
  );

  if (!scroll) {
    return (
      <View style={styles.screen}>
        {head}
        {header}
        <View style={styles.flexBody}>{body}</View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {head}
      {header}
      <ScrollView contentContainerStyle={styles.scrollContent}>{body}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flexBody: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxl },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerInnerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: { gap: 2 },
  brand: { fontSize: 22 },
  nav: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  navLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  navLinkActive: { backgroundColor: Colors.accentSoft },
  headerAside: { alignItems: 'flex-start', gap: Spacing.xs },
  contentOuter: { width: '100%', alignItems: 'center' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  titleBlock: { gap: 2 },
});
