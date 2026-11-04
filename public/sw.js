/* CampusGuard service worker.
 *
 * Strategy, and why:
 *  - App shell + public pages: network-first with a cached fallback, so a fresh
 *    deploy is picked up when there is connectivity and the app still opens when
 *    there is none.
 *  - Static assets: cache-first (they are content-hashed by Next).
 *  - /api/*: NEVER cached. An officer's phone is a shared device; serving one
 *    officer's authenticated response to the next would be a data leak.
 *  - Offline scans are not handled here: the scanning console queues them in
 *    IndexedDB (encrypted) and uploads the queue when connectivity returns.
 */

const VERSION = 'campusguard-v2';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const SHELL_ROUTES = ['/', '/offline', '/login', '/found', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ROUTES).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authenticated data is never cached.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match('/offline');
          if (offline) return offline;
          return new Response('<h1>Offline</h1><p>CampusGuard cannot reach the network.</p>', {
            status: 503,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          });
        }),
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return response;
          }),
      ),
    );
  }
});
