/**
 * A tiny software compositor for product shots: a pinhole camera, perspective-correct texture mapping of flat
 * rectangles (cards, box faces, the table), soft blurred shadows and per-face lighting. Deterministic, no GPU.
 * World units are millimetres; z is up, the table is z = 0.
 */
import sharp from 'sharp';

export type V3 = [number, number, number];
export type P2 = [number, number];

export interface Img { data: Float32Array; w: number; h: number } // premultiplied RGBA 0..1

export async function loadImg(png: Buffer, width?: number): Promise<Img> {
  let s = sharp(png).ensureAlpha();
  if (width) s = s.resize({ width, kernel: 'lanczos3' });
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(info.width * info.height * 4);
  for (let i = 0; i < out.length; i += 4) {
    const a = data[i + 3] / 255;
    out[i] = (data[i] / 255) * a; out[i + 1] = (data[i + 1] / 255) * a; out[i + 2] = (data[i + 2] / 255) * a; out[i + 3] = a;
  }
  return { data: out, w: info.width, h: info.height };
}

/** Solve the homography mapping 4 points `from` → `to`. Returns m[0..7] (m8 = 1). */
export function homography(from: P2[], to: P2[]): number[] {
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i], [X, Y] = to[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  return b.map((v, i) => v / A[i][i]);
}
const applyH = (m: number[], x: number, y: number): P2 => {
  const w = m[6] * x + m[7] * y + 1;
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
};

// ------------------------------------------------------------------------------------------------ camera
export class Camera {
  private r: V3; private u: V3; private f: V3;
  eye: V3; focal: number; cx: number; cy: number;
  constructor(eye: V3, target: V3, focal: number, cx: number, cy: number) {
    this.eye = eye; this.focal = focal; this.cx = cx; this.cy = cy;
    const f = norm(sub(target, eye));
    const r = norm(cross(f, [0, 0, 1]));
    const u = cross(r, f);
    this.f = f; this.r = r; this.u = u;
  }
  project(p: V3): P2 {
    const d = sub(p, this.eye);
    const z = dot(d, this.f);
    return [this.cx + (this.focal * dot(d, this.r)) / z, this.cy - (this.focal * dot(d, this.u)) / z];
  }
  depth(p: V3) { return dot(sub(p, this.eye), this.f); }
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

/** Rotate around z then translate. */
export const place = (p: V3, deg: number, t: V3): V3 => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s + t[0], p[0] * s + p[1] * c + t[1], p[2] + t[2]];
};

// ------------------------------------------------------------------------------------------------ canvas
export type Shade = (u: number, v: number) => [number, number]; // → [multiply, add white]

export class Canvas {
  w: number; h: number; data: Float32Array;
  constructor(w: number, h: number) { this.w = w; this.h = h; this.data = new Float32Array(w * h * 4); }

  static async from(png: Buffer, w: number, h: number) {
    const c = new Canvas(w, h);
    const img = await loadImg(await sharp(png).resize(w, h, { fit: 'cover' }).png().toBuffer());
    c.data.set(img.data);
    return c;
  }

  /** Draw img mapped onto the screen quad (corners: image TL, TR, BR, BL). */
  quad(img: Img, q: P2[], shade?: Shade, opacity = 1) {
    const src: P2[] = [[0, 0], [img.w, 0], [img.w, img.h], [0, img.h]];
    const m = homography(q, src);
    const [x0, y0, x1, y1] = bbox(q, this.w, this.h);
    const D = this.data, S = img.data, W = img.w, Hh = img.h;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const [u, v] = applyH(m, x + 0.5, y + 0.5);
        if (u < -1 || v < -1 || u > W + 1 || v > Hh + 1) continue;
        // bilinear, transparent outside
        const fx = u - 0.5, fy = v - 0.5;
        const ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy;
        let r = 0, g = 0, b = 0, a = 0;
        for (let k = 0; k < 4; k++) {
          const sx = ix + (k & 1), sy = iy + (k >> 1);
          if (sx < 0 || sy < 0 || sx >= W || sy >= Hh) continue;
          const wgt = (k & 1 ? ax : 1 - ax) * (k >> 1 ? ay : 1 - ay);
          const o = (sy * W + sx) * 4;
          r += S[o] * wgt; g += S[o + 1] * wgt; b += S[o + 2] * wgt; a += S[o + 3] * wgt;
        }
        if (a <= 0.001) continue;
        if (shade) {
          const [mul, add] = shade(u / W, v / Hh);
          r = r * mul + add * a; g = g * mul + add * a; b = b * mul + add * a;
        }
        r *= opacity; g *= opacity; b *= opacity; a *= opacity;
        const o = (y * this.w + x) * 4, ia = 1 - a;
        D[o] = r + D[o] * ia; D[o + 1] = g + D[o + 1] * ia; D[o + 2] = b + D[o + 2] * ia; D[o + 3] = a + D[o + 3] * ia;
      }
    }
  }

  /** Soft shadow of a polygon (screen coords): darkens what is already drawn. */
  async shadow(poly: P2[], blur: number, opacity: number, dx = 0, dy = 0, color: [number, number, number] = [0, 0, 0]) {
    const mask = new Uint8Array(this.w * this.h);
    const p = poly.map(([x, y]) => [x + dx, y + dy] as P2);
    const [x0, y0, x1, y1] = bbox(p, this.w, this.h, Math.ceil(blur * 3));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let c = 0;
      for (let k = 0; k < 4; k++) if (inside(p, x + 0.25 + 0.5 * (k & 1), y + 0.25 + 0.5 * (k >> 1))) c++;
      mask[y * this.w + x] = c * 63.75;
    }
    const blurred = blur > 0.3
      ? await sharp(Buffer.from(mask), { raw: { width: this.w, height: this.h, channels: 1 } }).blur(blur).extractChannel(0).raw().toBuffer()
      : Buffer.from(mask);
    const D = this.data;
    for (let i = 0; i < blurred.length; i++) {
      const m = (blurred[i] / 255) * opacity;
      if (!m) continue;
      const o = i * 4;
      D[o] = D[o] * (1 - m) + color[0] * m * D[o + 3]; D[o + 1] = D[o + 1] * (1 - m) + color[1] * m * D[o + 3]; D[o + 2] = D[o + 2] * (1 - m) + color[2] * m * D[o + 3];
    }
  }

  async toPng(): Promise<Buffer> {
    const out = Buffer.alloc(this.w * this.h * 4);
    const D = this.data;
    for (let i = 0; i < D.length; i += 4) {
      const a = D[i + 3];
      const k = a > 0 ? 255 / a : 0;
      out[i] = clamp(D[i] * k); out[i + 1] = clamp(D[i + 1] * k); out[i + 2] = clamp(D[i + 2] * k); out[i + 3] = clamp(a * 255);
    }
    return sharp(out, { raw: { width: this.w, height: this.h, channels: 4 } }).png().toBuffer();
  }
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

function bbox(q: P2[], w: number, h: number, pad = 1): [number, number, number, number] {
  const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
  return [Math.max(0, Math.floor(Math.min(...xs)) - pad), Math.max(0, Math.floor(Math.min(...ys)) - pad),
    Math.min(w - 1, Math.ceil(Math.max(...xs)) + pad), Math.min(h - 1, Math.ceil(Math.max(...ys)) + pad)];
}

function inside(p: P2[], x: number, y: number) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  }
  return c;
}

/** Signed area (screen space): > 0 when the quad faces the camera (clockwise on screen). */
export const facing = (q: P2[]) => {
  let a = 0;
  for (let i = 0; i < q.length; i++) { const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % q.length]; a += x1 * y2 - x2 * y1; }
  return a > 0;
};
