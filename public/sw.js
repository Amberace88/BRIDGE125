const C = 'b125-v2';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  const put = (key, r) => { if (r.ok) { const c = r.clone(); caches.open(C).then(x => x.put(key, c)); } return r; };
  // app shell: network first, fall back to the cached shell when offline
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => put('/', r)).catch(() => caches.match('/')));
    return;
  }
  // hashed build assets never change: cache first
  if (u.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => put(e.request, r))));
    return;
  }
  // everything else (icons, manifest, fonts): network first, cache as fallback
  e.respondWith(fetch(e.request).then(r => put(e.request, r)).catch(() => caches.match(e.request)));
});
