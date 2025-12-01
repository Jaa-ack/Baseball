// 每次更新程式碼後，請手動修改這裡的版本號 (例如 v4 -> v5)
const CACHE_NAME = 'baseball-app-v4';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png'
];

// 安裝階段：刪除舊快取
self.addEventListener('install', (e) => {
  self.skipWaiting(); // 強制新的 Service Worker 立即接管
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 啟用階段：清理舊版本快取
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

// 抓取請求：優先使用網路 (Network First)，網路不通才用快取
self.addEventListener('fetch', (e) => {
  // 對於 HTML 檔案，永遠優先去網路抓最新的
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
          // 沒網路時，才讀取快取
          return caches.match(e.request).then((resp) => resp || caches.match('./index.html'));
        })
    );
    return;
  }

  // 其他靜態資源 (圖片、CSS)，可以使用快取優先
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
