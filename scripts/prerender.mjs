#!/usr/bin/env node
/**
 * Post-build step (`npm run build` runs it after `vite build`): writes the static, crawlable SEO pages into dist/.
 *
 *   dist/<lang>/index.html   → served at /<lang>/       (landing page)
 *   dist/<lang>/rules.html   → served at /<lang>/rules  (full rules)
 *   dist/sitemap.xml         → all of the above with hreflang alternates
 *
 * The HTML itself is produced by src/seo/render.ts, loaded through Vite's SSR module loader so it can import the
 * app's TypeScript locale packs directly. This script only gathers build facts (hashed entry/CSS/font files, which
 * per-language OG images exist) and writes files. Usage: `node scripts/prerender.mjs` (after `vite build`).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const shellPath = join(dist, 'index.html');
if (!existsSync(shellPath)) { console.error('prerender: dist/index.html not found — run `vite build` first'); process.exit(1); }
const shell = readFileSync(shellPath, 'utf8');

// the app's entry script + stylesheets → <link rel=prefetch> so "Play" opens instantly
const prefetch = [
  ...[...shell.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)].map(m => ({ href: m[1], as: 'script' })),
  ...[...shell.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(m => ({ href: m[1], as: 'style' })),
];

// @font-face rules from the built CSS: the landing pages use the very same (hashed, immutable) font files
const WANT = /font-family:\s*['"]?(Golos Text|Cormorant Garamond|Noto Sans Georgian|Noto Sans Armenian)['"]?/;
const WEIGHT_OK = /font-weight:\s*(400|600|700)\b/;
const faces = new Set();
for (const href of prefetch.filter(p => p.as === 'style').map(p => p.href)) {
  const css = readFileSync(join(dist, href.replace(/^\//, '')), 'utf8');
  for (const m of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    const f = m[0];
    if (!WANT.test(f) || !WEIGHT_OK.test(f) || /font-style:\s*italic/.test(f) || /vietnamese|greek/.test(f)) continue;
    faces.add(f.replace(/,\s*url\([^)]*\.woff\)\s*format\(["']woff["']\)/g, ''));   // woff2 is enough for every browser we support
  }
}
const fontCss = [...faces].join('');

const ogDir = join(dist, 'og');
const ogLangs = existsSync(ogDir) ? readdirSync(ogDir).filter(f => /^[a-z]{2}\.jpg$/.test(f)).map(f => f.slice(0, 2)) : [];

const server = await createServer({
  root, configFile: join(root, 'vite.config.ts'), logLevel: 'error', appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] },
});
try {
  const seo = await server.ssrLoadModule('/src/seo/render.ts');
  const pages = seo.renderAll({ prefetch, fontCss, ogLangs });
  for (const p of pages) {
    const out = join(dist, p.file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, p.html);
  }
  writeFileSync(join(dist, 'sitemap.xml'), seo.sitemapXml());
  const kb = Math.round(pages.reduce((n, p) => n + p.html.length, 0) / pages.length / 1024);
  console.log(`prerender: ${pages.length} pages (~${kb} kB each), sitemap.xml, ${ogLangs.length} localized OG images, ${faces.size} font faces`);
} finally {
  await server.close();
}
