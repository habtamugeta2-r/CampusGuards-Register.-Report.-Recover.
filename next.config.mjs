/** @type {import('next').NextConfig} */
const PREVIEW_ORIGINS = ['*.e2b.app', '*.arena.ai', '*.arena.ai'];

const isPreview = process.env.ALLOW_PREVIEW_EMBED === '1';

// Security headers.
// NOTE ON FRAMING: production deployments should deny framing entirely
// (`frame-ancestors 'none'` + X-Frame-Options: DENY). The hosted dev preview is
// rendered inside an iframe, so framing is relaxed *only* when
// ALLOW_PREVIEW_EMBED=1. Never set that flag in production.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for styles and (in dev) eval for fast refresh.
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "font-src 'self'",
      "media-src 'self' blob: mediastream:",
      "worker-src 'self' blob:",
      isPreview ? "frame-ancestors 'self' https://*.e2b.app https://*.arena.ai" : "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

if (!isPreview) {
  securityHeaders.push({ key: 'X-Frame-Options', value: 'DENY' });
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev preview is served from a generated hostname; Next 15 blocks
  // cross-origin Server Action / dev requests from unknown origins unless they
  // are allow-listed here.
  allowedDevOrigins: PREVIEW_ORIGINS,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // The service worker must never be cached by the browser or a CDN.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;
