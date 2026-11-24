const CACHE_NAME = 'wealth-pwa-v1.9-stage1-r12';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/store.js?v=1.9-stage1-r12',
  './js/ui.js?v=1.9-stage1-r12',
  './js/mod1_wallet.js?v=1.9-stage1-r12',
  './js/mod3_ledger.js?v=1.9-stage1-r12',
  './js/app.js?v=1.9-stage1-r12'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-First: 確保推上 GitHub 後立即取得最新版本，離線時自動回退快取
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
