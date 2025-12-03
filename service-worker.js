// 每次更新程式碼後，請手動修改這裡的版本號
// V8: 修復 UI 視窗重疊問題
const CACHE_NAME = 'baseball-app-v8';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); 
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] 移除舊快取:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate' || e.request.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(e.request).then((resp) => resp || caches.match('./index.html'));
        })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});