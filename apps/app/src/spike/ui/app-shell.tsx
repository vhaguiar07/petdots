import { Link, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { cartItemCount, useCart } from '../cart/cart-context';
import { HealthIndicator } from '../health/health-indicator';
import { Body, Heading, Landmark } from './primitives';
import { Colors, DesktopMinWidth, MaxContentWidth, Spacing } from './theme';

const NAV = [
  { href: '/', label: 'Comparador' },
  { href: '/checkout', label: 'Checkout' },
  { href: '/painel', label: 'Painel do lojista' },
] as const;

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
 * Chrome shared by the three screens: navigation with real `<a href>` links
 * (so back/forward, reload and open-in-new-tab have something to act on) and
 * the API health indicator required by D4.
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
  const { cart } = useCart();
  const count = cartItemCount(cart);

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
          <Body muted>Eixo Grande Méier · spike do cliente universal</Body>
        </View>

        <Landmark role="navigation" label="Telas do spike" style={styles.nav}>
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </Landmark>

        <View style={styles.headerAside}>
          <Body muted>{count === 1 ? '1 item no carrinho' : `${count} itens no carrinho`}</Body>
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
