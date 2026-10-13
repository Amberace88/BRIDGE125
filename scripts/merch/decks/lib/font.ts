/**
 * Text → SVG outlines, straight from the @fontsource WOFF files in node_modules (no font needed at the print shop).
 *
 * A tiny, dependency-free TrueType reader: WOFF 1.0 container (zlib tables), cmap 4/12, hmtx, loca/glyf (simple +
 * composite glyphs), GPOS pair kerning ('kern' feature, PairPos format 1 + 2, extension lookups) and GSUB single
 * substitutions for a requested feature (Cormorant's old-style digits → lining figures via 'lnum').
 * Every fontsource family ships per-script subsets; a Face chains them (latin → latin-ext → cyrillic → …).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const FS = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', '..', 'node_modules', '@fontsource');

class Reader {
  b: Buffer;
  constructor(b: Buffer) { this.b = b; }
  u8(o: number) { return this.b.readUInt8(o); }
  u16(o: number) { return this.b.readUInt16BE(o); }
  i16(o: number) { return this.b.readInt16BE(o); }
  u32(o: number) { return this.b.readUInt32BE(o); }
}

function woffTables(file: Buffer): Map<string, Buffer> {
  if (file.toString('latin1', 0, 4) !== 'wOFF') throw new Error('not a WOFF 1.0 file');
  const n = file.readUInt16BE(12);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20;
    const tag = file.toString('latin1', o, o + 4);
    const off = file.readUInt32BE(o + 4), comp = file.readUInt32BE(o + 8), orig = file.readUInt32BE(o + 12);
    const raw = file.subarray(off, off + comp);
    out.set(tag, comp < orig ? inflateSync(raw) : Buffer.from(raw));
  }
  return out;
}

type Coverage = (g: number) => number; // → coverage index or -1
function coverage(r: Reader, o: number): Coverage {
  const fmt = r.u16(o);
  if (fmt === 1) {
    const n = r.u16(o + 2), m = new Map<number, number>();
    for (let i = 0; i < n; i++) m.set(r.u16(o + 4 + i * 2), i);
    return g => m.get(g) ?? -1;
  }
  const n = r.u16(o + 2), ranges: [number, number, number][] = [];
  for (let i = 0; i < n; i++) { const p = o + 4 + i * 6; ranges.push([r.u16(p), r.u16(p + 2), r.u16(p + 4)]); }
  return g => { for (const [s, e, si] of ranges) if (g >= s && g <= e) return si + g - s; return -1; };
}

function classDef(r: Reader, o: number): (g: number) => number {
  const fmt = r.u16(o);
  if (fmt === 1) {
    const start = r.u16(o + 2), n = r.u16(o + 4);
    return g => (g >= start && g < start + n ? r.u16(o + 6 + (g - start) * 2) : 0);
  }
  const n = r.u16(o + 2), ranges: [number, number, number][] = [];
  for (let i = 0; i < n; i++) { const p = o + 4 + i * 6; ranges.push([r.u16(p), r.u16(p + 2), r.u16(p + 4)]); }
  return g => { for (const [s, e, c] of ranges) if (g >= s && g <= e) return c; return 0; };
}

const popcount = (v: number) => { let c = 0; while (v) { c += v & 1; v >>= 1; } return c; };

/** Lookups (resolving extension subtables) of a GSUB/GPOS feature. → list of [lookupType, subtableOffset]. */
function featureSubtables(r: Reader, tag: string, extType: number): [number, number][] {
  const featList = r.u16(6), lookList = r.u16(8);
  const idx = new Set<number>();
  const nf = r.u16(featList);
  for (let i = 0; i < nf; i++) {
    const rec = featList + 2 + i * 6;
    if (r.b.toString('latin1', rec, rec + 4) !== tag) continue;
    const f = featList + r.u16(rec + 4);
    const n = r.u16(f + 2);
    for (let k = 0; k < n; k++) idx.add(r.u16(f + 4 + k * 2));
  }
  const out: [number, number][] = [];
  for (const li of [...idx].sort((a, b) => a - b)) {
    const l = lookList + r.u16(lookList + 2 + li * 2);
    const type = r.u16(l), n = r.u16(l + 4);
    for (let k = 0; k < n; k++) {
      const st = l + r.u16(l + 6 + k * 2);
      if (type === extType) out.push([r.u16(st + 2), st + r.u32(st + 4)]);
      else out.push([type, st]);
    }
  }
  return out;
}

export class Font {
  upm: number;
  capHeight: number;
  private cmap = new Map<number, number>();
  private adv: number[] = [];
  private glyf: Buffer;
  private loca: number[] = [];
  private kerners: ((a: number, b: number) => number | null)[] = [];
  private subst = new Map<number, number>();

  constructor(file: string, features: string[] = []) {
    const t = woffTables(readFileSync(file));
    const head = new Reader(t.get('head')!);
    this.upm = head.u16(18);
    const longLoca = head.i16(50) === 1;
    const numGlyphs = new Reader(t.get('maxp')!).u16(4);
    const nhm = new Reader(t.get('hhea')!).u16(34);
    const hmtx = new Reader(t.get('hmtx')!);
    for (let i = 0; i < numGlyphs; i++) this.adv.push(hmtx.u16(4 * Math.min(i, nhm - 1)));
    const loca = new Reader(t.get('loca')!);
    for (let i = 0; i <= numGlyphs; i++) this.loca.push(longLoca ? loca.u32(i * 4) : loca.u16(i * 2) * 2);
    this.glyf = t.get('glyf')!;
    const os2 = t.get('OS/2');
    this.capHeight = os2 && os2.readUInt16BE(0) >= 2 ? os2.readInt16BE(88) : this.upm * 0.7;
    this.readCmap(new Reader(t.get('cmap')!));
    if (t.has('GPOS')) this.readKern(new Reader(t.get('GPOS')!));
    if (t.has('GSUB')) for (const f of features) this.readSubst(new Reader(t.get('GSUB')!), f);
  }

  private readCmap(r: Reader) {
    const n = r.u16(2);
    let best = -1, bestFmt = 0;
    for (let i = 0; i < n; i++) {
      const p = r.u16(4 + i * 8), e = r.u16(6 + i * 8), off = r.u32(8 + i * 8);
      const fmt = r.u16(off);
      if ((fmt === 12 && (p === 3 || p === 0)) || (fmt === 4 && (p === 3 || p === 0) && bestFmt !== 12)) {
        if (p === 3 && e !== 1 && e !== 10) continue;
        best = off; bestFmt = fmt;
      }
    }
    if (best < 0) throw new Error('no unicode cmap');
    if (bestFmt === 12) {
      const groups = r.u32(best + 12);
      for (let g = 0; g < groups; g++) {
        const p = best + 16 + g * 12;
        const s = r.u32(p), e = r.u32(p + 4), gid = r.u32(p + 8);
        for (let c = s; c <= e; c++) this.cmap.set(c, gid + c - s);
      }
      return;
    }
    const segX2 = r.u16(best + 6), seg = segX2 / 2;
    const ends = best + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
    for (let i = 0; i < seg; i++) {
      const e = r.u16(ends + i * 2), s = r.u16(starts + i * 2), d = r.i16(deltas + i * 2), ro = r.u16(ranges + i * 2);
      for (let c = s; c <= e && c !== 0xffff; c++) {
        let g: number;
        if (ro === 0) g = (c + d) & 0xffff;
        else {
          const gp = ranges + i * 2 + ro + (c - s) * 2;
          g = r.u16(gp);
          if (g) g = (g + d) & 0xffff;
        }
        if (g) this.cmap.set(c, g);
      }
    }
  }

  private readKern(r: Reader) {
    for (const [type, st] of featureSubtables(r, 'kern', 9)) {
      if (type !== 2) continue;
      const fmt = r.u16(st), cov = coverage(r, st + r.u16(st + 2));
      const vf1 = r.u16(st + 4), vf2 = r.u16(st + 6);
      const s1 = popcount(vf1) * 2, s2 = popcount(vf2) * 2;
      const xa = vf1 & 4 ? popcount(vf1 & 3) * 2 : -1;
      if (fmt === 1) {
        this.kerners.push((a, b) => {
          const ci = cov(a);
          if (ci < 0) return null;
          const ps = st + r.u16(st + 10 + ci * 2), n = r.u16(ps);
          for (let k = 0; k < n; k++) {
            const p = ps + 2 + k * (2 + s1 + s2);
            if (r.u16(p) === b) return xa < 0 ? 0 : r.i16(p + 2 + xa);
          }
          return null;
        });
      } else if (fmt === 2) {
        const cd1 = classDef(r, st + r.u16(st + 8)), cd2 = classDef(r, st + r.u16(st + 10));
        const c2n = r.u16(st + 14);
        this.kerners.push((a, b) => {
          if (cov(a) < 0) return null;
          const p = st + 16 + (cd1(a) * c2n + cd2(b)) * (s1 + s2);
          return xa < 0 ? 0 : r.i16(p + xa);
        });
      }
    }
  }

  private readSubst(r: Reader, tag: string) {
    for (const [type, st] of featureSubtables(r, tag, 7)) {
      if (type !== 1) continue;
      const fmt = r.u16(st), covOff = st + r.u16(st + 2);
      // enumerate the coverage glyphs
      const cf = r.u16(covOff), glyphs: number[] = [];
      if (cf === 1) { const n = r.u16(covOff + 2); for (let i = 0; i < n; i++) glyphs.push(r.u16(covOff + 4 + i * 2)); }
      else { const n = r.u16(covOff + 2); for (let i = 0; i < n; i++) { const p = covOff + 4 + i * 6; for (let g = r.u16(p); g <= r.u16(p + 2); g++) glyphs.push(g); } }
      glyphs.forEach((g, i) => {
        const to = fmt === 1 ? (g + r.i16(st + 4)) & 0xffff : r.u16(st + 6 + i * 2);
        if (!this.subst.has(g)) this.subst.set(g, to);
      });
    }
  }

  glyphOf(cp: number): number | undefined {
    const g = this.cmap.get(cp);
    return g === undefined ? undefined : this.subst.get(g) ?? g;
  }
  advance(g: number) { return this.adv[g] ?? 0; }
  kern(a: number, b: number) {
    for (const k of this.kerners) { const v = k(a, b); if (v !== null) return v; }
    return 0;
  }

  /** Contours of a glyph in font units: arrays of {x, y, on}. */
  contours(g: number, depth = 0): { x: number; y: number; on: boolean }[][] {
    const s = this.loca[g], e = this.loca[g + 1];
    if (e <= s || depth > 6) return [];
    const r = new Reader(this.glyf);
    const nc = r.i16(s);
    if (nc >= 0) {
      const endPts: number[] = [];
      for (let i = 0; i < nc; i++) endPts.push(r.u16(s + 10 + i * 2));
      const np = nc ? endPts[nc - 1] + 1 : 0;
      let p = s + 10 + nc * 2;
      p += 2 + r.u16(p);
      const flags: number[] = [];
      while (flags.length < np) {
        const f = r.u8(p++);
        flags.push(f);
        if (f & 8) { let rep = r.u8(p++); while (rep-- > 0) flags.push(f); }
      }
      const xs: number[] = [], ys: number[] = [];
      let v = 0;
      for (const f of flags) {
        if (f & 2) { const d = r.u8(p++); v += f & 16 ? d : -d; }
        else if (!(f & 16)) { v += r.i16(p); p += 2; }
        xs.push(v);
      }
      v = 0;
      for (const f of flags) {
        if (f & 4) { const d = r.u8(p++); v += f & 32 ? d : -d; }
        else if (!(f & 32)) { v += r.i16(p); p += 2; }
        ys.push(v);
      }
      const out: { x: number; y: number; on: boolean }[][] = [];
      let start = 0;
      for (const end of endPts) {
        const c = [];
        for (let i = start; i <= end; i++) c.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) });
        out.push(c);
        start = end + 1;
      }
      return out;
    }
    // composite
    const out: { x: number; y: number; on: boolean }[][] = [];
    let p = s + 10, more = true;
    while (more) {
      const flags = r.u16(p), gi = r.u16(p + 2);
      p += 4;
      let dx: number, dy: number;
      if (flags & 1) { dx = r.i16(p); dy = r.i16(p + 2); p += 4; } else { dx = r.b.readInt8(p); dy = r.b.readInt8(p + 1); p += 2; }
      let a = 1, b = 0, c = 0, d = 1;
      const f2 = (o: number) => r.i16(o) / 16384;
      if (flags & 8) { a = d = f2(p); p += 2; }
      else if (flags & 0x40) { a = f2(p); d = f2(p + 2); p += 4; }
      else if (flags & 0x80) { a = f2(p); b = f2(p + 2); c = f2(p + 4); d = f2(p + 6); p += 8; }
      for (const ct of this.contours(gi, depth + 1)) out.push(ct.map(q => ({ x: a * q.x + c * q.y + dx, y: b * q.x + d * q.y + dy, on: q.on })));
      more = !!(flags & 0x20);
    }
    return out;
  }
}

const fmt = (v: number) => {
  const s = (Math.round(v * 10) / 10).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s === '-0' ? '0' : s;
};

/** A family = one weight/style across the script subsets fontsource ships. */
export class Face {
  fonts: Font[];
  constructor(files: string[], features: string[] = []) { this.fonts = files.map(f => new Font(join(FS, f), features)); }
  get upm() { return this.fonts[0].upm; }
  capHeight(size: number) { return (this.fonts[0].capHeight * size) / this.upm; }

  private find(cp: number): [number, number] {
    for (let i = 0; i < this.fonts.length; i++) { const g = this.fonts[i].glyphOf(cp); if (g !== undefined) return [i, g]; }
    throw new Error(`glyph missing: ${String.fromCodePoint(cp)} (U+${cp.toString(16)})`);
  }

  layout(s: string, size: number, tracking = 0) {
    const k = size / this.upm;
    let x = 0, prev: [number, number] | null = null;
    const out: { ch: string; fi: number; g: number; x: number; adv: number }[] = [];
    for (const ch of s) {
      const [fi, g] = this.find(ch.codePointAt(0)!);
      if (prev && prev[0] === fi) x += this.fonts[fi].kern(prev[1], g) * k;
      const adv = this.fonts[fi].advance(g) * k;
      out.push({ ch, fi, g, x, adv });
      x += adv + tracking * size;
      prev = [fi, g];
    }
    return { glyphs: out, width: s ? x - tracking * size : 0 };
  }

  width(s: string, size: number, tracking = 0) { return this.layout(s, size, tracking).width; }

  /** One glyph's outline: origin (baseline-left) at x, y; affine (a b c d) applied in px space. */
  glyphPath(fi: number, g: number, x: number, y: number, size: number, m: [number, number, number, number] = [1, 0, 0, 1]): string {
    const k = size / this.upm;
    const P = (q: { x: number; y: number }) => {
      const px = q.x * k, py = -q.y * k;
      return [x + m[0] * px + m[2] * py, y + m[1] * px + m[3] * py] as const;
    };
    let d = '';
    for (const c of this.fonts[fi].contours(g)) {
      if (!c.length) continue;
      // start at an on-curve point (or the midpoint of two off-curve points)
      let si = c.findIndex(q => q.on);
      let pts = c;
      if (si < 0) {
        const mid = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2, on: true };
        pts = [mid, ...c.slice(1), c[0]];
        si = 0;
      } else pts = [...c.slice(si), ...c.slice(0, si)];
      const [sx, sy] = P(pts[0]);
      d += `M${fmt(sx)} ${fmt(sy)}`;
      const n = pts.length;
      for (let i = 1; i <= n; i++) {
        const q = pts[i % n];
        if (q.on) { const [qx, qy] = P(q); d += `L${fmt(qx)} ${fmt(qy)}`; continue; }
        const nx = pts[(i + 1) % n];
        const end = nx.on ? nx : { x: (q.x + nx.x) / 2, y: (q.y + nx.y) / 2 };
        const [cx, cy] = P(q), [ex, ey] = P(end);
        d += `Q${fmt(cx)} ${fmt(cy)} ${fmt(ex)} ${fmt(ey)}`;
        if (nx.on) i++;
      }
      d += 'Z';
    }
    return d;
  }

  /** Outlined text → path d + width. y is the baseline. sx squeezes horizontally (narrow "10"). */
  text(s: string, x: number, y: number, size: number, o: { tracking?: number; anchor?: 'start' | 'middle' | 'end'; sx?: number } = {}) {
    const { glyphs, width } = this.layout(s, size, o.tracking ?? 0);
    const sx = o.sx ?? 1, w = width * sx;
    const x0 = x - (o.anchor === 'middle' ? w / 2 : o.anchor === 'end' ? w : 0);
    const d = glyphs.filter(gl => gl.ch.trim()).map(gl => this.glyphPath(gl.fi, gl.g, x0 + gl.x * sx, y, size, [sx, 0, 0, 1])).join('');
    return { d, width: w };
  }

  /** Text centred on the top (or bottom) of a circle, glyphs upright to the arc. */
  arc(s: string, cx: number, cy: number, r: number, size: number, o: { tracking?: number; bottom?: boolean } = {}) {
    const { glyphs, width } = this.layout(s, size, o.tracking ?? 0);
    let d = '';
    for (const gl of glyphs) {
      if (!gl.ch.trim()) continue;
      const mid = gl.x + gl.adv / 2 - width / 2;
      const ang = mid / r;
      let px: number, py: number, rot: number;
      if (!o.bottom) { px = cx + r * Math.sin(ang); py = cy - r * Math.cos(ang); rot = ang; }
      else { px = cx - r * Math.sin(ang); py = cy + r * Math.cos(ang); rot = -ang; }
      const c = Math.cos(rot), sn = Math.sin(rot);
      const ox = px - c * gl.adv / 2, oy = py - sn * gl.adv / 2;
      d += this.glyphPath(gl.fi, gl.g, ox, oy, size, [c, sn, -sn, c]);
    }
    return d;
  }
}

const SUBSETS = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'];
const fam = (dir: string, prefix: string, weight: number, style = 'normal', subsets = SUBSETS) =>
  subsets.map(s => `${dir}/files/${prefix}-${s}-${weight}-${style}.woff`);

const cache = new Map<string, Face>();
export type FaceKey = 'golos500' | 'golos600' | 'golos700' | 'golos800' | 'golos900' | 'corm600' | 'corm700' | 'corm700i' | 'corm500' | 'corm600i';
export function face(key: FaceKey): Face {
  let f = cache.get(key);
  if (f) return f;
  const m = /^(golos|corm)(\d+)(i?)$/.exec(key)!;
  const weight = +m[2], style = m[3] ? 'italic' : 'normal';
  f = m[1] === 'golos'
    ? new Face(fam('golos-text', 'golos-text', weight, style))
    : new Face(fam('cormorant-garamond', 'cormorant-garamond', weight, style), ['lnum']);
  cache.set(key, f);
  return f;
}
