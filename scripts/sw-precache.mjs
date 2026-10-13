#!/usr/bin/env node
/**
 * Post-build step (`npm run build` runs it after prerender): the service worker's precache list.
 *
 * Reads Vite's build manifest (dist/.vite/manifest.json, `build.manifest: true`), walks every chunk reachable from the
 * entry — static AND dynamic imports, so each lazily loaded screen and every game in src/games/registry.ts is in it
 * automatically — plus their CSS / fonts and the files their code points at (`new Worker(new URL(...))` workers are
 * not in the manifest, so the emitted JS/CSS is scanned for `assets/<file>` references). The result is injected into
 * dist/sw.js in place of the `/*__B125_PRECACHE__*\/` marker:
 *
 *   core  — must all be cached for the install to succeed (app shell, every game, fonts, icons)
 *   lazy  — cached best-effort in the background (the language packs nobody needs until they switch language)
 *
 * Big media (merch mockups, OG images, print files, deck art, the neural voice model under /tts/) are never listed:
 * the worker caches them at runtime (stale-while-revalidate, capped) or not at all (/tts/ has its own cache).
 * The manifest file itself is deleted afterwards so it is never deployed.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Same-origin files from public/ the shell needs offline (the HTML shell is '/'). */
export const PUBLIC_CORE = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', '/logo-mark.svg'];

/** Language packs: precached lazily (the current language is fetched by the page itself anyway). */
const LAZY_SRC = /(^|\/)src\/(i18n\/)?locales\/[a-z]{2}\.ts$/;
/** Never precached: legacy font format (every supported browser takes woff2) and source maps. */
const SKIP = /\.(woff|map)$/i;
/** A single file this big goes to the lazy tier instead of blocking the install. */
const MAX_CORE_BYTES = 1.5 * 1024 * 1024;
const REF = /assets\/[\w.-]+?\.(?:js|mjs|css|woff2|png|jpe?g|webp|svg|wasm|json)\b/g;

/**
 * @param {Record<string, {file: string, css?: string[], assets?: string[], imports?: string[], dynamicImports?: string[], isEntry?: boolean}>} manifest
 * @param {{ read?: (file: string) => string | null, size?: (file: string) => number, publicFiles?: string[] }} io
 * @returns {{ core: string[], lazy: string[] }}  absolute URLs ('/assets/x.js')
 */
export function collectPrecache(manifest, io = {}) {
  const read = io.read ?? (() => null);
  const size = io.size ?? (() => 0);
  const core = new Set(), lazy = new Set();
  const seenKeys = new Set();
  const add = (file, isLazy) => {
    if (!file || SKIP.test(file)) return;
    const url = '/' + file.replace(/^\/+/, '');
    if (isLazy || size(file) > MAX_CORE_BYTES) { if (!core.has(url)) lazy.add(url); }
    else { core.add(url); lazy.delete(url); }
  };
  const walk = (key, isLazy) => {
    const id = key + (isLazy ? '#lazy' : '');
    if (seenKeys.has(id) || seenKeys.has(key)) return;
    seenKeys.add(id);
    const c = manifest[key];
    if (!c) return;
    const lz = isLazy || LAZY_SRC.test(c.src ?? key);
    add(c.file, lz);
    for (const f of c.css ?? []) add(f, lz);
    for (const f of c.assets ?? []) add(f, lz);
    for (const k of c.imports ?? []) walk(k, lz);
    for (const k of c.dynamicImports ?? []) walk(k, lz);
  };
  const entries = Object.keys(manifest).filter(k => manifest[k].isEntry);
  for (const k of entries) walk(k, false);
  // shared chunks reached from both a lazy pack and the core graph must be core: walk core first, then fix up
  for (const u of [...lazy]) if (core.has(u)) lazy.delete(u);

  // files referenced from code but unknown to the manifest (module workers, wasm …), transitively
  const scan = (set, isLazy) => {
    const queue = [...set];
    const seen = new Set(queue);
    while (queue.length) {
      const url = queue.shift();
      if (!/\.(m?js|css)$/.test(url)) continue;
      const text = read(url.slice(1));
      if (!text) continue;
      for (const m of text.matchAll(REF)) {
        const u = '/' + m[0];
        if (seen.has(u) || SKIP.test(u) || core.has(u) || lazy.has(u)) continue;
        if (read(m[0]) === null && size(m[0]) === 0) continue;   // not an emitted file
        seen.add(u);
        add(m[0], isLazy);
        queue.push(u);
      }
    }
  };
  scan(core, false);
  scan(lazy, true);

  for (const p of io.publicFiles ?? PUBLIC_CORE) core.add(p);
  return { core: [...core].sort(), lazy: [...lazy].filter(u => !core.has(u)).sort() };
}

/** Version = hash of the shell + the list (hashed file names change with their content). */
export function precacheVersion(list, shellHtml = '') {
  return createHash('sha256').update(shellHtml).update('\n').update([...list.core, '|', ...list.lazy].join('\n')).digest('hex').slice(0, 12);
}

export const MARKER = '/*__B125_PRECACHE__*/';
export function injectPrecache(swSource, data) {
  if (!swSource.includes(MARKER)) throw new Error('sw.js: precache marker not found');
  return swSource.replace(MARKER, `self.__B125_PRECACHE = ${JSON.stringify(data)};`);
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const dist = join(root, 'dist');
  const mf = join(dist, '.vite', 'manifest.json');
  if (!existsSync(mf)) { console.error('sw-precache: dist/.vite/manifest.json missing — build with `build.manifest: true`'); process.exit(1); }
  const manifest = JSON.parse(readFileSync(mf, 'utf8'));
  const fileOf = f => join(dist, f.replace(/^\/+/, ''));
  const list = collectPrecache(manifest, {
    read: f => { try { const p = fileOf(f); return /\.(m?js|css)$/.test(f) ? readFileSync(p, 'utf8') : (existsSync(p) ? '' : null); } catch { return null; } },
    size: f => { try { return statSync(fileOf(f)).size; } catch { return 0; } },
  });
  const missing = [...list.core, ...list.lazy].filter(u => u !== '/' && !existsSync(fileOf(u)));
  if (missing.length) { console.error('sw-precache: listed files missing from dist/: ' + missing.join(', ')); process.exit(1); }
  const shell = readFileSync(join(dist, 'index.html'), 'utf8');
  const swPath = join(dist, 'sw.js');
  const swSource = readFileSync(swPath, 'utf8');
  // a change to the worker's own code is a new version too (fresh cache name)
  const version = precacheVersion(list, shell + '\n' + swSource);
  writeFileSync(swPath, injectPrecache(swSource, { version, core: list.core, lazy: list.lazy }));
  rmSync(join(dist, '.vite'), { recursive: true, force: true });
  const bytes = urls => urls.reduce((n, u) => n + (u === '/' ? shell.length : statSync(fileOf(u)).size), 0);
  const mb = n => (n / 1048576).toFixed(2) + ' MB';
  console.log(`sw-precache: v${version} — core ${list.core.length} files (${mb(bytes(list.core))}), lazy ${list.lazy.length} files (${mb(bytes(list.lazy))})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
