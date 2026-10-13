/* Bridge 125 service worker v4 — offline play.
 *
 * Precache (versioned): the app shell '/', every JS/CSS chunk reachable from the entry (all screens and every game in
 * the registry), fonts and icons. The list is generated at build time from Vite's manifest (scripts/sw-precache.mjs)
 * and injected at the marker below; without it (dev) the worker only does runtime caching.
 *
 *   navigations     network first (3.5 s timeout) → cached SEO page (/<lang>/, /<lang>/rules) or the cached shell
 *   /assets/*       cache first (hashed, immutable): precache → runtime asset cache → network
 *   images / media  stale-while-revalidate in a capped runtime cache (merch mockups, OG images, deck art …)
 *   /api/*, /tts/*, /print/*, other origins (Supabase), non-GET: never touched
 *
 * Updates never swap assets under a running game: a new worker waits until the page asks it to take over
 * (postMessage {type: 'SKIP_WAITING'} from the "New version — tap to update" toast) or every tab is closed.
 * The neural voice cache `b125-voice-v1` is never deleted here.
 */
/*__B125_PRECACHE__*/
const PRE = self.__B125_PRECACHE || { version: 'dev', core: [], lazy: [] };
const APP = 'b125-app-' + PRE.version;          // this version's precache
const RT_ASSETS = 'b125-rt-assets';             // hashed assets not in the precache (other versions, lazy misses)
const MEDIA = 'b125-media';                     // images / media, stale-while-revalidate
const PAGES = 'b125-pages';                     // pre-rendered SEO pages, by path
const KEEP = new Set([APP, RT_ASSETS, MEDIA, PAGES, 'b125-voice-v1']);
const LIMITS = { [RT_ASSETS]: 120, [MEDIA]: 160, [PAGES]: 40 };
const MAX_ENTRY_BYTES = 6 * 1024 * 1024;
const NAV_TIMEOUT = 3500;
const SEO = /^\/[a-z]{2}\/(rules)?$/;

const isImmutable = u => u.startsWith('/assets/');

/** Fetch one precache URL into `cache`, reusing an identical immutable file from an older version's cache. */
async function precacheOne(cache, url) {
  if (isImmutable(url)) {
    const old = await caches.match(url, { ignoreVary: true });
    if (old && old.ok) { await cache.put(url, old); return; }
  }
  const r = await fetch(new Request(url, { cache: 'reload', credentials: 'same-origin' }));
  if (!r.ok) throw new Error(`precache ${url}: ${r.status}`);
  await cache.put(url, r);
}

async function pool(items, n, fn) {
  const queue = [...items];
  const errors = [];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) { const it = queue.shift(); try { await fn(it); } catch (e) { errors.push(e); } }
  }));
  return errors;
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(APP);
    const errs = await pool(PRE.core, 6, u => precacheOne(cache, u));
    // a second pass for flaky connections; still failing → the install fails and the old version stays
    if (errs.length) {
      const have = new Set((await cache.keys()).map(r => new URL(r.url).pathname));
      const again = await pool(PRE.core.filter(u => !have.has(u)), 3, u => precacheOne(cache, u));
      if (again.length) throw again[0];
    }
    // best effort: language packs etc.
    await pool(PRE.lazy, 4, u => precacheOne(cache, u));
    // first install (no page controlled yet): take over at once so the very first visit already works offline
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !KEEP.has(k) && (k.startsWith('b125-') && !k.startsWith('b125-voice'))).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch { /* */ } }
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  else if (d.type === 'VERSION' && e.ports && e.ports[0]) e.ports[0].postMessage({ version: PRE.version, core: PRE.core.length, lazy: PRE.lazy.length });
});

async function trim(name) {
  const max = LIMITS[name];
  if (!max) return;
  const c = await caches.open(name);
  const keys = await c.keys();
  // Cache.keys() is in insertion order: drop the oldest
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

function storable(r) {
  if (!r || !r.ok || r.type === 'opaque') return false;
  const len = Number(r.headers.get('content-length') || 0);
  return !(len > MAX_ENTRY_BYTES);
}

async function put(name, key, r) {
  if (!storable(r)) return;
  try { const c = await caches.open(name); await c.put(key, r); await trim(name); } catch { /* quota */ }
}

const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, err => { clearTimeout(t); rej(err); }); });

async function shell() {
  return (await caches.match('/', { cacheName: APP, ignoreSearch: true, ignoreVary: true })) || (await caches.match('/', { ignoreSearch: true, ignoreVary: true }));
}

async function navigate(e, u) {
  const seo = SEO.test(u.pathname);
  const net = (async () => {
    const pre = e.preloadResponse ? await e.preloadResponse.catch(() => null) : null;
    return pre || fetch(e.request);
  })();
  try {
    const r = await timeout(net, NAV_TIMEOUT);
    // keep the visited SEO pages for offline; the app shell in the cache stays the one matching this version's assets
    if (seo && r.ok) e.waitUntil(put(PAGES, u.pathname, r.clone()));
    return r;
  } catch {
    if (seo) {
      const lang = u.pathname.slice(0, 4);
      const hit = (await caches.match(u.pathname, { cacheName: PAGES, ignoreVary: true })) || (await caches.match(lang, { cacheName: PAGES, ignoreVary: true }));
      if (hit) return hit;
    }
    const s = await shell();
    if (s) return s;
    // nothing cached yet: give the network the rest of its chance
    return net;
  }
}

async function asset(e) {
  const hit = await caches.match(e.request, { ignoreSearch: true, ignoreVary: true });
  if (hit) return hit;
  const r = await fetch(e.request);
  e.waitUntil(put(RT_ASSETS, e.request, r.clone()));
  return r;
}

async function media(e) {
  const hit = await caches.match(e.request, { ignoreVary: true });
  const net = fetch(e.request).then(r => { e.waitUntil(put(MEDIA, e.request, r.clone())); return r; });
  if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
  return net;
}

async function other(e) {
  const pre = await caches.match(e.request, { cacheName: APP, ignoreSearch: true, ignoreVary: true });
  try {
    const r = await timeout(fetch(e.request), pre ? NAV_TIMEOUT : 15000);
    if (pre && r.ok) e.waitUntil(caches.open(APP).then(c => c.put(new URL(e.request.url).pathname, r.clone())).catch(() => {}));
    return r;
  } catch (err) {
    if (pre) return pre;
    const any = await caches.match(e.request, { ignoreVary: true });
    if (any) return any;
    throw err;
  }
}

const MEDIA_RE = /\.(png|jpe?g|webp|avif|gif|svg|mp3|ogg|m4a|wav)$/i;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;                         // Supabase, analytics, CDNs: never cached
  const p = u.pathname;
  if (p.startsWith('/api/') || p.startsWith('/tts/') || p.startsWith('/print/') || p === '/sw.js') return;
  if (req.headers.has('range')) return;
  if (req.mode === 'navigate') { e.respondWith(navigate(e, u)); return; }
  if (isImmutable(p)) { e.respondWith(asset(e)); return; }
  if (MEDIA_RE.test(p) && !PRE.core.includes(p)) { e.respondWith(media(e)); return; }
  e.respondWith(other(e));
});
