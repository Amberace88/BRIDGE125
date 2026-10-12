"""Bridge 125 merch — tiny SVG toolkit.

Text is converted to outlines with fontTools (from the @fontsource .woff files in node_modules), so every
design SVG is self-contained and print-ready: no fonts needed by the print shop.
"""
from __future__ import annotations

import math
import os
from functools import lru_cache

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FS = os.path.join(ROOT, 'node_modules', '@fontsource')

# brand palette
FELT, FELT2, FELT_D = '#0B3B30', '#17614D', '#062A21'
GOLD, GOLD_HI, GOLD_LO = '#C9A85A', '#F3DE9C', '#A27E2C'
IVORY, INK, RUBY, RUBY_D = '#F4EEDF', '#15161B', '#C23347', '#7E1626'

SPADE = 'M50 4C38 22 8 38 8 60C8 74 19 84 32 84C40 84 46 80 49 75C48 86 44 94 34 98L66 98C56 94 52 86 51 75C54 80 60 84 68 84C81 84 92 74 92 60C92 38 62 22 50 4Z'
HEART = 'M50 96C44 88 6 62 6 34C6 18 18 6 32 6C41 6 47 11 50 18C53 11 59 6 68 6C82 6 94 18 94 34C94 62 56 88 50 96Z'
DIAMOND = 'M50 2L90 50L50 98L10 50Z'
CLUB = ('M50 4C38 4 29 13 29 25C29 30 31 35 34 39C31 37 27 36 24 36C12 36 4 46 4 57C4 69 13 78 25 78'
        'C35 78 43 72 47 64C46 80 42 90 32 98L68 98C58 90 54 80 53 64C57 72 65 78 75 78C87 78 96 69 96 57'
        'C96 46 88 36 76 36C73 36 69 37 66 39C69 35 71 30 71 25C71 13 62 4 50 4Z')
SUITS = {'S': SPADE, 'H': HEART, 'D': DIAMOND, 'C': CLUB}


def suit(s: str, x: float, y: float, size: float, fill: str, extra: str = '') -> str:
    """Suit glyph whose 100x100 box is centred on (x, y) with width `size`."""
    k = size / 100
    return f'<path transform="translate({x - size / 2:.2f} {y - size / 2:.2f}) scale({k:.4f})" d="{SUITS[s]}" fill="{fill}" {extra}/>'


def spade(x, y, size, fill, extra=''):
    return suit('S', x, y, size, fill, extra)


# ------------------------------------------------------------------------------------------------ fonts
FONT_FILES = {
    'golos600': ['golos-text/files/golos-text-latin-600-normal.woff', 'golos-text/files/golos-text-latin-ext-600-normal.woff'],
    'golos700': ['golos-text/files/golos-text-latin-700-normal.woff', 'golos-text/files/golos-text-latin-ext-700-normal.woff'],
    'golos800': ['golos-text/files/golos-text-latin-800-normal.woff', 'golos-text/files/golos-text-latin-ext-800-normal.woff'],
    'golos500': ['golos-text/files/golos-text-latin-500-normal.woff', 'golos-text/files/golos-text-latin-ext-500-normal.woff'],
    'corm600': ['cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff', 'cormorant-garamond/files/cormorant-garamond-latin-ext-600-normal.woff'],
    'corm700': ['cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff', 'cormorant-garamond/files/cormorant-garamond-latin-ext-700-normal.woff'],
    'corm700i': ['cormorant-garamond/files/cormorant-garamond-latin-700-italic.woff', 'cormorant-garamond/files/cormorant-garamond-latin-ext-700-italic.woff'],
    'corm600i': ['cormorant-garamond/files/cormorant-garamond-latin-600-italic.woff', 'cormorant-garamond/files/cormorant-garamond-latin-ext-600-italic.woff'],
}


class Font:
    def __init__(self, files):
        self.fonts = [TTFont(os.path.join(FS, f)) for f in files]
        self.cmaps = [f.getBestCmap() for f in self.fonts]
        self.gs = [f.getGlyphSet() for f in self.fonts]
        self.upm = self.fonts[0]['head'].unitsPerEm
        self.kern = [self._kern_table(f) for f in self.fonts]
        self.lnum = [self._single_subst(f, 'lnum') for f in self.fonts]

    @staticmethod
    def _single_subst(f, tag):
        """GSUB single substitutions for one feature (used for lining figures in Cormorant)."""
        out: dict[str, str] = {}
        if 'GSUB' not in f:
            return out
        t = f['GSUB'].table
        idx = set()
        for fr in t.FeatureList.FeatureRecord:
            if fr.FeatureTag == tag:
                idx.update(fr.Feature.LookupListIndex)
        for i in idx:
            lk = t.LookupList.Lookup[i]
            for st in lk.SubTable:
                if lk.LookupType == 7:
                    st = st.ExtSubTable
                if getattr(st, 'mapping', None):
                    out.update(st.mapping)
        return out

    @staticmethod
    def _kern_table(f):
        """Pair kerning (GPOS lookup type 2, format 1 + 2) → {(left, right): xAdvance}."""
        out: dict[tuple[str, str], int] = {}
        if 'GPOS' not in f:
            return out
        gpos = f['GPOS'].table
        for lk in gpos.LookupList.Lookup:
            subs = []
            for st in lk.SubTable:
                if lk.LookupType == 9:
                    if st.ExtensionLookupType == 2:
                        subs.append(st.ExtSubTable)
                elif lk.LookupType == 2:
                    subs.append(st)
            for st in subs:
                cov = st.Coverage.glyphs
                if st.Format == 1:
                    for i, left in enumerate(cov):
                        for pvr in st.PairSet[i].PairValueRecord:
                            v = getattr(pvr.Value1, 'XAdvance', 0) if pvr.Value1 else 0
                            if v:
                                out.setdefault((left, pvr.SecondGlyph), v)
                elif st.Format == 2:
                    c1 = st.ClassDef1.classDefs
                    c2 = st.ClassDef2.classDefs
                    by2: dict[int, list[str]] = {}
                    for g, c in c2.items():
                        by2.setdefault(c, []).append(g)
                    for left in cov:
                        rec = st.Class1Record[c1.get(left, 0)]
                        for cls2, r2 in enumerate(rec.Class2Record):
                            v = getattr(r2.Value1, 'XAdvance', 0) if r2.Value1 else 0
                            if v and cls2 in by2:
                                for right in by2[cls2]:
                                    out.setdefault((left, right), v)
        return out

    def _find(self, ch):
        for i, cm in enumerate(self.cmaps):
            if ord(ch) in cm:
                return i, cm[ord(ch)]
        raise KeyError(f'glyph missing: {ch!r}')

    def layout(self, s: str, size: float, tracking: float = 0.0):
        """→ list of (char, fontIndex, glyphName, x, advance) in px, total width."""
        k = size / self.upm
        x, out, prev = 0.0, [], None
        for ch in s:
            fi, gn = self._find(ch)
            gn = self.lnum[fi].get(gn, gn)
            if prev is not None and prev[0] == fi:
                x += self.kern[fi].get((prev[1], gn), 0) * k
            adv = self.fonts[fi]['hmtx'][gn][0] * k
            out.append((ch, fi, gn, x, adv))
            x += adv + tracking * size
            prev = (fi, gn)
        width = x - tracking * size if s else 0
        return out, width

    def glyph_d(self, fi, gn, x, y, size, rot=0.0, sx=1.0):
        """Glyph outline placed with its origin (baseline-left) at x, y, optional rotation around that origin."""
        k = size / self.upm
        pen = SVGPathPen(self.gs[fi], ntos=lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
        c, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        # font units → px: scale k*sx in x, -k in y, then rotate, then translate
        a, b = k * sx * c, k * sx * s_
        cc, d = k * s_, -k * c
        tp = TransformPen(pen, (a, b, cc, d, x, y))
        self.gs[fi][gn].draw(tp)
        return pen.getCommands()

    def text(self, s, x, y, size, tracking=0.0, anchor='start', sx=1.0):
        """Outlined text → (path d, width). y is the baseline."""
        glyphs, w = self.layout(s, size, tracking)
        w *= sx
        x0 = x - (w / 2 if anchor == 'middle' else w if anchor == 'end' else 0)
        ds = [self.glyph_d(fi, gn, x0 + gx * sx, y, size, sx=sx) for ch, fi, gn, gx, adv in glyphs if ch != ' ']
        return ' '.join(d for d in ds if d), w

    def text_arc(self, s, cx, cy, r, size, tracking=0.0, top=True, baseline_shift=0.0):
        """Text centred on the top (or bottom) of a circle; glyphs stand upright relative to the arc."""
        glyphs, w = self.layout(s, size, tracking)
        ds = []
        for ch, fi, gn, gx, adv in glyphs:
            if ch == ' ':
                continue
            mid = gx + adv / 2 - w / 2                      # arc length from the centre of the text
            if top:
                rr = r + baseline_shift
                ang = mid / rr                                # radians clockwise from 12 o'clock
                px, py = cx + rr * math.sin(ang), cy - rr * math.cos(ang)
                rot = math.degrees(ang)
            else:
                rr = r - baseline_shift
                ang = mid / rr
                px, py = cx - rr * math.sin(ang), cy + rr * math.cos(ang)
                rot = -math.degrees(ang)
            # glyph origin = arc point minus half advance along the tangent
            tx, ty = math.cos(math.radians(rot)), math.sin(math.radians(rot))
            ox, oy = px - tx * adv / 2, py - ty * adv / 2
            ds.append(self.glyph_d(fi, gn, ox, oy, size, rot=rot))
        return ' '.join(ds)

    def cap_height(self, size):
        f = self.fonts[0]
        ch = getattr(f['OS/2'], 'sCapHeight', 0) or 700
        return ch * size / self.upm


@lru_cache(None)
def font(name: str) -> Font:
    return Font(FONT_FILES[name])


# ------------------------------------------------------------------------------------------------ svg helpers
def gold_grad(id_='gold', x1=0, y1=0, x2=0, y2=1, stops=None):
    stops = stops or [(0, GOLD_HI), (.5, GOLD), (1, GOLD_LO)]
    st = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{st}</linearGradient>'


def lin(id_, stops, x1=0, y1=0, x2=0, y2=1, units=''):
    st = ''.join(
        f'<stop offset="{s[0]}" stop-color="{s[1]}"' + (f' stop-opacity="{s[2]}"' if len(s) > 2 else '') + '/>' for s in stops)
    u = f' gradientUnits="{units}"' if units else ''
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"{u}>{st}</linearGradient>'


def rad(id_, stops, cx=.5, cy=.5, r=.5, fx=None, fy=None, units=''):
    st = ''.join(
        f'<stop offset="{s[0]}" stop-color="{s[1]}"' + (f' stop-opacity="{s[2]}"' if len(s) > 2 else '') + '/>' for s in stops)
    f = (f' fx="{fx}"' if fx is not None else '') + (f' fy="{fy}"' if fy is not None else '')
    u = f' gradientUnits="{units}"' if units else ''
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}"{f}{u}>{st}</radialGradient>'


def svg(w, h, body, defs='', title='', bg=None):
    t = f'<title>{title}</title>' if title else ''
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{t}'
            f'<defs>{defs}</defs>{b}{body}</svg>\n')


def mirror_x(g: str, cx: float) -> str:
    return f'<g transform="translate({2 * cx} 0) scale(-1 1)">{g}</g>'


def rot180(g: str, cx: float, cy: float) -> str:
    return f'<g transform="rotate(180 {cx} {cy})">{g}</g>'


def pts(ps):
    return ' '.join(f'{x:.2f},{y:.2f}' for x, y in ps)


def write(path: str, content: str):
    if path.endswith('.svg'):
        import xml.etree.ElementTree as ET
        ET.fromstring(content)  # must be well-formed XML: print shops and <img> are strict
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(content)
