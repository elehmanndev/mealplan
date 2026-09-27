import type { Config } from 'tailwindcss';

// Token names map 1:1 onto UIKit semantic colors (see globals.css):
//   bg        → systemGroupedBackground
//   surface   → secondarySystemGroupedBackground (cells, cards)
//   surface-2 → tertiary grouped / search-field fill
//   text      → label, text-muted → secondaryLabel
//   accent    → systemBlue (tint)
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: rgb('bg'),
        surface: rgb('surface'),
        'surface-2': rgb('surface-2'),
        text: rgb('text'),
        'text-muted': rgb('text-muted'),
        'text-tertiary': rgb('text-tertiary'),
        accent: rgb('accent'),
        favorite: rgb('favorite'),
        danger: rgb('danger'),
        success: rgb('success'),
        warning: rgb('warning'),
        separator: 'var(--separator)',
        fill: 'var(--fill)',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        rounded: ['ui-rounded', 'SF Pro Rounded', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Apple HIG Dynamic Type sizes at the default (Large) setting.
      fontSize: {
        'large-title': ['34px', { lineHeight: '41px', letterSpacing: '0.4px', fontWeight: '700' }],
        title1: ['28px', { lineHeight: '34px', letterSpacing: '0.38px', fontWeight: '700' }],
        title2: ['22px', { lineHeight: '28px', letterSpacing: '-0.26px', fontWeight: '700' }],
        title3: ['20px', { lineHeight: '25px', letterSpacing: '-0.45px', fontWeight: '600' }],
        headline: ['17px', { lineHeight: '22px', letterSpacing: '-0.43px', fontWeight: '600' }],
        body: ['17px', { lineHeight: '22px', letterSpacing: '-0.43px' }],
        callout: ['16px', { lineHeight: '21px', letterSpacing: '-0.31px' }],
        subhead: ['15px', { lineHeight: '20px', letterSpacing: '-0.23px' }],
        footnote: ['13px', { lineHeight: '18px', letterSpacing: '-0.08px' }],
        caption1: ['12px', { lineHeight: '16px' }],
        caption2: ['11px', { lineHeight: '13px', letterSpacing: '0.06px' }],
      },
      borderRadius: {
        // iOS 26 inset-grouped list sections.
        cell: '26px',
        // iOS 26 floating sheet corners (≈ device corner radius).
        sheet: '38px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      boxShadow: {
        glass: 'var(--glass-shadow)',
        soft: '0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.08)',
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
