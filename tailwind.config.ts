import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Read from CSS custom properties so an organisation's own colour can
        // re-point the whole palette (src/lib/brand.ts). The literal hex is the
        // platform default and the fallback for any tenant that never sets one.
        // No opacity modifier is used on brand-* anywhere in the app, which is
        // what makes plain var() safe here.
        brand: {
          50: 'var(--brand-50, #eef7ff)',
          100: 'var(--brand-100, #d9edff)',
          200: 'var(--brand-200, #bce0ff)',
          300: 'var(--brand-300, #8ecdff)',
          400: 'var(--brand-400, #59b0ff)',
          500: 'var(--brand-500, #3291ff)',
          600: 'var(--brand-600, #1b73f6)',
          700: 'var(--brand-700, #145ce1)',
          800: 'var(--brand-800, #174bb6)',
          900: 'var(--brand-900, #19428f)',
          950: 'var(--brand-950, #142957)',
        },
        ok: '#0f7b3f',
        warn: '#a16207',
        danger: '#b42318',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
