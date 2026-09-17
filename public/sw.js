const CACHE_VERSION = 'rota-da-justica-pwa-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const MAP_CACHE = `${CACHE_VERSION}-map`;

const APP_SHELL = [
  '/',
  '/jogo',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/rota-192.png',
  '/icons/rota-512.png',
  '/icons/apple-touch-icon.png',
  '/fundos/escritorio.png',
];

async function precacheAppShell() {
  const cache = await caches.open(STATIC_CACHE);

  // Um recurso opcional indisponível não pode impedir a instalação inteira do PWA.
  await Promise.allSettled(
    APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response && response.ok) {
          await cache.put(url, response.clone());
        }
      } catch {
        // O recurso será buscado normalmente em runtime.
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheAppShell().then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE, MAP_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const jogoShell = await caches.match('/jogo');
    if (jogoShell) return jogoShell;

    return caches.match('/index.html');
  }
}

async function staleWhileRevalidate(request, cacheName = RUNTIME_CACHE) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    const mapHosts = new Set([
      'tiles.openfreemap.org',
      'unpkg.com',
      'fonts.openmaptiles.org',
    ]);

    if (mapHosts.has(url.hostname)) {
      event.respondWith(staleWhileRevalidate(request, MAP_CACHE));
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  const cacheableDestinations = new Set([
    'script',
    'style',
    'image',
    'font',
    'audio',
    'video',
  ]);

  if (cacheableDestinations.has(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
