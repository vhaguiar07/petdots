import type { SVGProps } from 'react';

/**
 * Ícones de traço, inline — sem biblioteca (decisão da pd-09: sem UI kit).
 * Todos decorativos: quem os usa marca `aria-hidden`, e o texto ao lado é o
 * que o leitor de tela anuncia.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  focusable: false,
};

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9a6 6 0 0 1 12 0v4l1.6 2.4a1 1 0 0 1-.8 1.6H5.2a1 1 0 0 1-.8-1.6L6 13z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9h18v2.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-5 0z" />
      <path d="M5 13.5V20h14v-6.5" />
      <path d="M10 20v-4h4v4" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props} strokeWidth={2.4}>
      <path d="M5 12.5l4.2 4.2L19 7.5" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
