import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/service-worker';

export const metadata: Metadata = {
  title: {
    default: 'CampusGuard — Register. Report. Recover.',
    template: '%s · CampusGuard',
  },
  description:
    'A campus property registry and recovery platform: register your devices, report them missing, and help campus security verify what moves.',
  applicationName: 'CampusGuard',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'CampusGuard', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#4f46e5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
