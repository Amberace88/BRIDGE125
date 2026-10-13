const C = 'b125-v3';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && !k.startsWith('b125-voice')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/tts/')) return;
  const put = (key, r) => { if (r.ok) { const c = r.clone(); caches.open(C).then(x => x.put(key, c)); } return r; };
  // navigations: network first. The pre-rendered SEO pages (/de/, /de/rules) are real documents and are cached under
  // their own URL; everything else is the SPA shell, cached as '/' and used for any route when offline.
  if (e.request.mode === 'navigate') {
    const seo = /^\/[a-z]{2}\/(rules)?$/.test(u.pathname);
    e.respondWith(fetch(e.request).then(r => put(seo ? u.pathname : '/', r)).catch(() => (seo ? caches.match(u.pathname) : Promise.resolve(undefined)).then(hit => hit || caches.match('/'))));
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
