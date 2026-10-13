/**
 * Print files for the providers. `npm run build` copies merch-print/** into dist/print/<content-hash>/<path>
 * (scripts/merch/print-assets.mjs) and writes dist/print/manifest.json. The hash makes every URL immutable — a
 * provider that caches files by URL (Printful does) always gets the current artwork after a change — and
 * unguessable without the file itself. The manifest is never served publicly; the Worker reads it from ASSETS.
 *
 * Alternative host: set MERCH_PRINT_BASE_URL (e.g. a public Supabase Storage bucket) → `${base}/<path>`.
 */
import type { MerchEnv } from './merchTypes';

let manifest: Promise<Record<string, string> | null> | null = null;
let loadedAt = 0;

async function loadManifest(env: MerchEnv): Promise<Record<string, string> | null> {
  if (!env.ASSETS) return null;
  try {
    const r = await env.ASSETS.fetch(new Request('https://assets.invalid/print/manifest.json'));
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    const j = await r.json() as { files?: Record<string, string> };
    return j.files && typeof j.files === 'object' ? j.files : null;
  } catch { return null; }
}

export function resetPrintManifest() { manifest = null; }

/** Public https URL of a print file (path relative to merch-print/), or null when it was not published. */
export async function printUrl(env: MerchEnv, file: string): Promise<string | null> {
  if (!/^[\w./-]+$/.test(file) || file.includes('..')) return null;
  if (env.MERCH_PRINT_BASE_URL) return `${env.MERCH_PRINT_BASE_URL.replace(/\/+$/, '')}/${file.split('/').map(encodeURIComponent).join('/')}`;
  if (!manifest || Date.now() - loadedAt > 10 * 60_000) { manifest = loadManifest(env); loadedAt = Date.now(); }
  const m = await manifest;
  if (!m) { manifest = null; return null; }
  const p = m[file];
  if (!p) return null;
  const origin = (env.PUBLIC_ORIGIN || 'https://bridge125.com').replace(/\/+$/, '');
  return `${origin}${p}`;
}

/** GET /print/* — hashed files only; the manifest and anything unknown → 404 (never the SPA shell). */
export async function servePrint(req: Request, env: MerchEnv): Promise<Response> {
  const path = new URL(req.url).pathname;
  if (!env.ASSETS || req.method !== 'GET' && req.method !== 'HEAD' || !/^\/print\/[0-9a-f]{16,64}\/[\w./-]+$/.test(path) || path.includes('..')) {
    return new Response('not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
  }
  const r = await env.ASSETS.fetch(req);
  const type = r.headers.get('content-type') ?? '';
  if (!r.ok || type.includes('text/html')) return new Response('not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
  const h = new Headers(r.headers);
  h.set('Cache-Control', 'public, max-age=31536000, immutable');
  h.set('X-Robots-Tag', 'noindex, nofollow');
  h.set('Access-Control-Allow-Origin', '*');
  return new Response(r.body, { status: r.status, headers: h });
}
