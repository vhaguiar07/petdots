import { Platform } from 'react-native';

export const Colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F5',
  border: '#DCE0E6',
  borderStrong: '#B9C0CA',
  text: '#12161C',
  textMuted: '#5B6472',
  accent: '#0B62D6',
  accentSoft: '#E7F0FD',
  positive: '#0E7A3C',
  positiveSoft: '#E3F5EA',
  warning: '#A86300',
  warningSoft: '#FDF2DE',
  danger: '#B3261E',
  dangerSoft: '#FBE9E7',
  focus: '#0B62D6',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = { sm: 4, md: 8, lg: 12 } as const;

export const FontFamily = Platform.select({
  web: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  default: 'System',
});

export const MonoFamily = Platform.select({
  web: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  default: 'monospace',
});

/**
 * The comparator is judged maximised at 1920: a narrow centred column is the
 * "mobile stretched" failure the gate exists to catch (B1). The cap sits above
 * 1920 on purpose — a common desktop uses the whole window, and the limit only
 * bites on ultrawide monitors, where an unbounded table would be unreadable.
 */
export const MaxContentWidth = 2100;

/** Breakpoint above which the layout is treated as desktop. */
export const DesktopMinWidth = 1024;
export const TabletMinWidth = 720;

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
