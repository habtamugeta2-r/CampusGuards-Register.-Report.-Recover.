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
          50: 'var(--brand-50, #eef2ff)',
          100: 'var(--brand-100, #e0e7ff)',
          200: 'var(--brand-200, #c7d2fe)',
          300: 'var(--brand-300, #a5b4fc)',
          400: 'var(--brand-400, #818cf8)',
          500: 'var(--brand-500, #6366f1)',
          600: 'var(--brand-600, #5457ee)',
          700: 'var(--brand-700, #4f46e5)',
          800: 'var(--brand-800, #4338ca)',
          900: 'var(--brand-900, #3730a3)',
          950: 'var(--brand-950, #1e1b4b)',
        },
        // The dark "ink" surface used by the sidebar, the landing hero and the
        // auth panel. Slightly blue-violet so it sits naturally next to brand.
        ink: {
          50: '#f4f5fb',
          100: '#e8eaf6',
          200: '#ccd0e9',
          300: '#a3aad4',
          400: '#747dba',
          500: '#535da1',
          600: '#414886',
          700: '#363b6d',
          800: '#23274a',
          900: '#171a36',
          950: '#0e1024',
        },
        ok: '#0f7b3f',
        warn: '#a16207',
        danger: '#b42318',
      },
      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          'Sora Variable',
          'Sora',
          'Inter Variable',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 16px -2px rgb(15 23 42 / 0.06)',
        lift: '0 2px 4px 0 rgb(15 23 42 / 0.05), 0 12px 32px -4px rgb(15 23 42 / 0.12)',
        glow: '0 0 0 1px rgb(255 255 255 / 0.06), 0 20px 60px -12px rgb(0 0 0 / 0.5)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
