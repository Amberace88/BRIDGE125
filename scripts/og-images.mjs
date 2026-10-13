#!/usr/bin/env node
/**
 * Per-language Open Graph share images (1200×630) → public/og/<lang>.jpg, used by the pre-rendered SEO pages.
 *
 * One SVG template (logo mark from public/logo-mark.svg, the wordmark and the localized tagline SEO[lang].ogLine
 * from src/seo/strings.ts) is rasterized with headless Chromium, so every script (Latin, Cyrillic, Georgian,
 * Armenian) renders with the app's own embedded fonts. The output is committed — this is NOT part of `npm run build`
 * (the build must not depend on a browser). Re-run it after changing an ogLine:
 *
 *   npm run og                         (needs the `playwright` package + Chromium, e.g. `npx playwright install chromium`)
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs npm run og     (use a playwright installed elsewhere)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'og');
mkdirSync(outDir, { recursive: true });

/** Find node_modules/<pkg> walking up from the repo (works inside git worktrees too). */
function pkgDir(pkg) {
  for (let d = root; ; d = dirname(d)) {
    const p = join(d, 'node_modules', pkg);
    if (existsSync(p)) return p;
    if (dirname(d) === d) throw new Error(`og-images: ${pkg} not found — run npm install`);
  }
}

/** A fontsource CSS file with every url() inlined as a data: URI (woff2 only). */
function inlineFonts(pkg, file) {
  const dir = pkgDir(pkg);
  return readFileSync(join(dir, file), 'utf8')
    .replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, '')
    .replace(/url\(\.\/files\/([^)]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${readFileSync(join(dir, 'files', f)).toString('base64')})`);
}
const fontCss = [
  inlineFonts('@fontsource/golos-text', '500.css'),
  inlineFonts('@fontsource/golos-text', '700.css'),
  inlineFonts('@fontsource/noto-sans-georgian', '500.css'),
  inlineFonts('@fontsource/noto-sans-armenian', '500.css'),
].join('\n');

const logo = readFileSync(join(root, 'public', 'logo-mark.svg'), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The template. Faint card silhouettes + logo + wordmark + gold rule + tagline, matching public/og.jpg. */
const svg = line => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <radialGradient id="bg" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#176350"/><stop offset=".55" stop-color="#0D4639"/><stop offset="1" stop-color="#062A21"/></radialGradient>
  <linearGradient id="wm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DE9C"/><stop offset=".55" stop-color="#D4B160"/><stop offset="1" stop-color="#A27E2C"/></linearGradient>
  <linearGradient id="rule" x1="0" x2="1"><stop offset="0" stop-color="#C9A54C" stop-opacity="0"/><stop offset=".5" stop-color="#E3C67A"/><stop offset="1" stop-color="#C9A54C" stop-opacity="0"/></linearGradient>
  <style>${fontCss}
    .wm{font:700 104px 'Golos Text',sans-serif;letter-spacing:.13em}
    .tl{font:500 34px 'Golos Text','Noto Sans Georgian','Noto Sans Armenian',sans-serif;fill:#D6E8E0}
  </style>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<g fill="#FFFFFF" fill-opacity=".055">
  <rect x="20" y="10" width="150" height="210" rx="16" transform="rotate(-16 95 115)"/>
  <rect x="990" y="-10" width="150" height="210" rx="16" transform="rotate(18 1065 95)"/>
  <rect x="80" y="440" width="150" height="210" rx="16" transform="rotate(8 155 545)"/>
  <rect x="1020" y="420" width="150" height="210" rx="16" transform="rotate(-12 1095 525)"/>
</g>
<svg x="92" y="128" width="270" height="270" viewBox="0 0 200 200">${logo}</svg>
<text class="wm" x="390" y="306" fill="#F7F1E3">BRIDGE <tspan fill="url(#wm)">125</tspan></text>
<rect x="520" y="452" width="160" height="3" rx="1.5" fill="url(#rule)"/>
<text id="tl" class="tl" x="600" y="520" text-anchor="middle">${esc(line)}</text>
</svg>`;

const pwModule = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright';
const { chromium } = await import(pwModule).catch(() => { console.error('og-images: the `playwright` package is required (see the header of this script)'); process.exit(1); });

const server = await createServer({ root, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
const browser = await chromium.launch();
try {
  const { SEO } = await server.ssrLoadModule('/src/seo/strings.ts');
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [lang, s] of Object.entries(SEO)) {
    await page.setContent(`<!doctype html><html lang="${lang}"><body style="margin:0;background:#062A21">${svg(s.ogLine)}</body></html>`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      // shrink long taglines to fit (max 1040px wide)
      const t = document.getElementById('tl');
      for (let size = 34; size > 22 && t.getComputedTextLength() > 1040; size -= 1) t.style.fontSize = `${size - 1}px`;
    });
    writeFileSync(join(outDir, `${lang}.jpg`), await page.screenshot({ type: 'jpeg', quality: 86 }));
    console.log(`og/${lang}.jpg  ${s.ogLine}`);
  }
} finally {
  await browser.close();
  await server.close();
}
