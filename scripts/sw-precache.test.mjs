import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { collectPrecache, injectPrecache, MARKER, PUBLIC_CORE, precacheVersion } from './sw-precache.mjs';

// a miniature Vite manifest: entry → lazy screens → games (registry) → shared chunks, language packs, a worker
const manifest = {
  'index.html': { file: 'assets/index-a1.js', isEntry: true, css: ['assets/index-c1.css'], imports: ['_react-r1.js'],
    dynamicImports: ['src/screens/LocalGame.tsx', 'src/games/sudoku/Screen.tsx', 'src/locales/de.ts', 'src/games/thousand/Screen.tsx'] },
  '_react-r1.js': { file: 'assets/react-r1.js' },
  '_shared-s1.js': { file: 'assets/shared-s1.js' },
  'src/screens/LocalGame.tsx': { file: 'assets/LocalGame-l1.js', isDynamicEntry: true, imports: ['_shared-s1.js'], css: ['assets/LocalGame-l2.css'] },
  'src/games/sudoku/Screen.tsx': { file: 'assets/Screen-q1.js', isDynamicEntry: true, imports: ['_shared-s1.js'] },
  'src/games/thousand/Screen.tsx': { file: 'assets/Thousand-t1.js', isDynamicEntry: true },
  'src/locales/de.ts': { src: 'src/locales/de.ts', file: 'assets/de-d1.js', isDynamicEntry: true, imports: ['_shared-s1.js'] },
  'node_modules/@fontsource/golos/latin.woff2': { file: 'assets/golos-latin-400-f1.woff2' },
  'unreached.ts': { file: 'assets/unreached-u1.js' },
};
manifest['index.html'].assets = ['assets/golos-latin-400-f1.woff2', 'assets/golos-latin-400-f1.woff'];

const files = {
  'assets/index-a1.js': 'import"./react-r1.js";',
  'assets/Screen-q1.js': 'new Worker(new URL("/assets/gen.worker-w1.js",import.meta.url),{type:"module"})',
  'assets/gen.worker-w1.js': 'self.onmessage=()=>{}; fetch("/assets/sub.worker-w2.js")',
  'assets/sub.worker-w2.js': '',
  'assets/index-c1.css': '@font-face{src:url(/assets/golos-latin-400-f1.woff2) format("woff2"),url(/assets/golos-latin-400-f1.woff) format("woff")}',
};
const io = { read: f => (f in files ? files[f] : (Object.values(manifest).some(c => c.file === f) || /\.(css|woff2?)$/.test(f) ? '' : null)), size: () => 1000 };

describe('service worker precache list', () => {
  const list = collectPrecache(manifest, io);

  it('contains the shell, every reachable chunk (lazy screens, every registered game), CSS, woff2 fonts and icons', () => {
    for (const u of ['/', '/manifest.webmanifest', '/icon-192.png', '/assets/index-a1.js', '/assets/react-r1.js', '/assets/LocalGame-l1.js',
      '/assets/LocalGame-l2.css', '/assets/Screen-q1.js', '/assets/Thousand-t1.js', '/assets/shared-s1.js', '/assets/index-c1.css',
      '/assets/golos-latin-400-f1.woff2']) expect(list.core).toContain(u);
    for (const p of PUBLIC_CORE) expect(list.core).toContain(p);
  });
  it('follows module workers the manifest does not know about (transitively)', () => {
    expect(list.core).toContain('/assets/gen.worker-w1.js');
    expect(list.core).toContain('/assets/sub.worker-w2.js');
  });
  it('puts language packs in the lazy tier, keeps shared chunks core, skips legacy woff and unreachable chunks', () => {
    expect(list.lazy).toEqual(['/assets/de-d1.js']);
    expect(list.core).not.toContain('/assets/de-d1.js');
    expect([...list.core, ...list.lazy]).not.toContain('/assets/golos-latin-400-f1.woff');
    expect([...list.core, ...list.lazy]).not.toContain('/assets/unreached-u1.js');
  });
  it('never lists big media (merch, OG images, voice model, print files)', () => {
    for (const u of [...list.core, ...list.lazy]) expect(u).not.toMatch(/^\/(merch|og|tts|print|screens)\//);
  });
  it('very large files go to the lazy tier', () => {
    const big = collectPrecache(manifest, { ...io, size: f => (f === 'assets/Thousand-t1.js' ? 9e6 : 1000) });
    expect(big.lazy).toContain('/assets/Thousand-t1.js');
    expect(big.core).not.toContain('/assets/Thousand-t1.js');
  });
  it('versions by content and injects into the worker', () => {
    const v1 = precacheVersion(list, '<html>1');
    expect(v1).toMatch(/^[0-9a-f]{12}$/);
    expect(precacheVersion(list, '<html>2')).not.toBe(v1);
    const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
    expect(sw).toContain(MARKER);
    const out = injectPrecache(sw, { version: v1, ...list });
    expect(out).not.toContain(MARKER);
    expect(out).toContain(`"version":"${v1}"`);
    expect(() => injectPrecache('no marker here', {})).toThrow();
  });
});
