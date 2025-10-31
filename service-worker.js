// Smarter caching to avoid stale GitHub Pages
const VERSION = 'v3';                      // ← bump this when you deploy
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

// Files safe to cache long-term (avoid HTML here)
const PRECACHE_URLS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  // Install immediately on first load
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  // Become active immediately and clean old caches
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== STATIC_CACHE && k !== RUNTIME_CACHE) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache the service worker file itself
  if (url.pathname.endsWith('/service-worker.js')) {
    event.respondWith(fetch(req));
    return;
  }

  // For navigations / HTML: network-first, fallback to cache when offline
  const isHTML = req.mode === 'navigate' ||
                (req.destination === 'document') ||
                (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        // Optionally keep a copy in runtime cache for offline
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Offline fallback: last index.html if present
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
        throw err;
      }
    })());
    return;
  }

  // For static assets: cache-first, then network to fill
  if (['style','script','image','font','audio','video'].includes(req.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const resp = await fetch(req);
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, resp.clone());
      return resp;
    })());
    return;
  }

  // Default: just pass-through
  event.respondWith(fetch(req));
});
