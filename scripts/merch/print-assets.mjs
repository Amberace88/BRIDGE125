// Publish the merch print files for the print-on-demand providers (run by `npm run build`, after `vite build`).
//
//   merch-print/<path>  →  dist/print/<sha256-24 of the file>/<path>
//   dist/print/manifest.json  { "files": { "<path>": "/print/<hash>/<path>" } }   (read by the Worker, never served)
//
// Only print-ready rasters are published (png / jpg / pdf); SVG sources and mockups stay out.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'merch-print');
const out = join(root, 'dist', 'print');
const EXT = /\.(png|jpe?g|pdf)$/i;

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) files.push(...walk(p));
    else if (EXT.test(name)) files.push(p);
  }
  return files;
}

if (!existsSync(join(root, 'dist'))) { console.error('print-assets: run vite build first (dist/ missing)'); process.exit(1); }
rmSync(out, { recursive: true, force: true });
const files = existsSync(src) ? walk(src) : [];
const manifest = {};
let bytes = 0;
for (const f of files) {
  const rel = relative(src, f).split(sep).join('/');
  if (!/^[\w./-]+$/.test(rel)) { console.warn(`print-assets: skipping ${rel} (use only letters, digits, - _ . / in print file names)`); continue; }
  const buf = readFileSync(f);
  if (buf.length > 24 * 1024 * 1024) { console.warn(`print-assets: skipping ${rel} (> 24 MB, Workers asset limit is 25 MiB)`); continue; }
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 24);
  const dest = join(out, hash, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(f, dest);
  manifest[rel] = `/print/${hash}/${rel}`;
  bytes += buf.length;
}
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ generated: new Date().toISOString(), files: manifest }, null, 1));
console.log(`print-assets: ${Object.keys(manifest).length} print files (${(bytes / 1048576).toFixed(1)} MB) → dist/print/`);
