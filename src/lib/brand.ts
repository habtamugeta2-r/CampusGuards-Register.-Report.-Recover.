import type { CSSProperties } from 'react';

/**
 * Per-tenant branding.
 *
 * An organisation prints labels, sends email and puts a public status page in
 * front of its own people. Those should look like the organisation, not like a
 * product it rented. The setting is deliberately one hex per tenant — asking a
 * university registrar to design an eleven-step palette is how a settings
 * screen ends up unused — and every other shade is derived here.
 *
 * The palette is applied as CSS custom properties (--brand-50 … --brand-950)
 * on a wrapper element, which is why tailwind.config.ts reads them from
 * var(...) with the platform defaults as fallbacks: a tenant that never sets a
 * colour renders exactly as it did before.
 */

export const DEFAULT_BRAND = '#145ce1';

const SHADE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type BrandShade = (typeof SHADE_STEPS)[number];

export const BRAND_FALLBACKS: Record<BrandShade, string> = {
  50: '#eef7ff',
  100: '#d9edff',
  200: '#bce0ff',
  300: '#8ecdff',
  400: '#59b0ff',
  500: '#3291ff',
  600: '#1b73f6',
  700: DEFAULT_BRAND,
  800: '#174bb6',
  900: '#19428f',
  950: '#142957',
};

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * The pattern API routes validate against: six-digit hex only, so one colour
 * means one thing everywhere and a malformed value is rejected at the edge
 * before it can reach the database constraint.
 */
export const BRAND_COLOUR = /^#[0-9a-fA-F]{6}$/;

export function isBrandColour(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX.test(value.trim());
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let v = hex.trim().replace('#', '');
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 220, s: 0, l: l * 100 };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lig = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;

  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];

  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/**
 * Derive the full ramp from one colour.
 *
 * The tenant's colour is always the 700 step, which is the shade the interface
 * uses for primary actions and headings. Lighter steps are interpolated toward
 * near-white rather than lightened by a fixed amount, so a dark navy and a
 * bright orange both produce a usable 50 and 100.
 */
export function brandShades(hex: string | null | undefined): Record<BrandShade, string> {
  if (!isBrandColour(hex)) return { ...BRAND_FALLBACKS };
  const { h, s, l } = hexToHsl(hex);

  const toward = (target: number, amount: number) => l + (target - l) * amount;
  const softer = (amount: number) => s * (1 - 0.25 * amount);

  return {
    50: hslToHex(h, softer(0.9), toward(97, 0.9)),
    100: hslToHex(h, softer(0.78), toward(96, 0.78)),
    200: hslToHex(h, softer(0.6), toward(94, 0.6)),
    300: hslToHex(h, softer(0.4), toward(90, 0.4)),
    400: hslToHex(h, softer(0.2), toward(82, 0.2)),
    500: hslToHex(h, softer(0.08), toward(70, 0.12)),
    600: hslToHex(h, s, toward(60, 0.06)),
    700: hslToHex(h, s, l),
    800: hslToHex(h, Math.min(100, s * 1.02), l * 0.86),
    900: hslToHex(h, Math.min(100, s * 1.05), l * 0.74),
    950: hslToHex(h, Math.min(100, s * 1.08), l * 0.58),
  };
}

/**
 * Inline style that re-points the brand palette at this organisation's colour.
 * Pass it to any element that wraps branded UI — the app shell, a printed
 * label, the public status page.
 */
export function brandStyle(hex: string | null | undefined): CSSProperties {
  const shades = brandShades(hex);
  const vars: Record<string, string> = {};
  for (const step of SHADE_STEPS) vars[`--brand-${step}`] = shades[step];
  return vars as CSSProperties;
}

/**
 * Black or white text on the brand colour, by relative luminance. A tenant is
 * allowed to pick a pale yellow; the buttons on its public page still have to
 * be readable.
 */
export function onBrandText(hex: string | null | undefined): string {
  if (!isBrandColour(hex)) return '#ffffff';
  const value = hex.trim().replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
  return luminance > 0.45 ? '#0f172a' : '#ffffff';
}
