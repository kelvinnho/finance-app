const CACHE_NAME = 'wealth-app-v1.9-stage1-r9';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './js/store.js?v=1.9-stage1-r9', './js/ui.js?v=1.9-stage1-r9', './js/mod1_wallet.js?v=1.9-stage1-r9', './js/mod3_ledger.js?v=1.9-stage1-r9', './js/app.js?v=1.9-stage1-r9'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});