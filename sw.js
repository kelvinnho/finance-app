const CACHE_NAME = 'wealth-app-v1.9-stage1-m1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/store.js?v=1.9.1m1',
  './js/ui.js?v=1.9.1m1',
  './js/mod1_wallet.js?v=1.9.1m1',
  './js/app.js?v=1.9.1m1'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});