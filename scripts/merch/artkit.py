"""Bridge 125 merch — art kit for the colourful multi-market collection (collection.py, cities.py).

Adds display fonts (scripts/merch/fonts, SIL OFL), pop palettes, halftone / riso / grain helpers, comic bursts,
ribbons, flat playing cards and a deterministic RNG. Everything ends up as plain SVG with text as outlines.
"""
from __future__ import annotations

import math
import os
import random

import svgkit
from svgkit import CLUB, DIAMOND, HEART, ROOT, SPADE, SUITS, font, lin, rad

HERE = os.path.dirname(os.path.abspath(__file__))
LOCAL = os.path.join(HERE, 'fonts')
NM = os.path.join(ROOT, 'node_modules', '@fontsource')


def _loc(*names):
    return [os.path.join(LOCAL, n) for n in names]


# Absolute paths: os.path.join(FS, abs) keeps the absolute path, so svgkit.Font loads them as is.
svgkit.FONT_FILES.update({
    'anton': _loc('anton-latin-400-normal.woff', 'anton-latin-ext-400-normal.woff'),
    'abril': _loc('abril-fatface-latin-400-normal.woff', 'abril-fatface-latin-ext-400-normal.woff'),
    'bangers': _loc('bangers-latin-400-normal.woff', 'bangers-latin-ext-400-normal.woff'),
    'monoton': _loc('monoton-latin-400-normal.woff', 'monoton-latin-ext-400-normal.woff'),
    'shrikhand': _loc('shrikhand-latin-400-normal.woff', 'shrikhand-latin-ext-400-normal.woff'),
    'pacifico': _loc('pacifico-latin-400-normal.woff', 'pacifico-latin-ext-400-normal.woff', 'pacifico-cyrillic-400-normal.woff'),
    'unb900': _loc('unbounded-latin-900-normal.woff', 'unbounded-latin-ext-900-normal.woff', 'unbounded-cyrillic-900-normal.woff'),
    'unb700': _loc('unbounded-latin-700-normal.woff', 'unbounded-latin-ext-700-normal.woff', 'unbounded-cyrillic-700-normal.woff'),
    'dela': _loc('dela-gothic-one-latin-400-normal.woff', 'dela-gothic-one-latin-ext-400-normal.woff', 'dela-gothic-one-cyrillic-400-normal.woff'),
    'golos800c': [os.path.join(NM, 'golos-text/files', f) for f in (
        'golos-text-latin-800-normal.woff', 'golos-text-latin-ext-800-normal.woff', 'golos-text-cyrillic-800-normal.woff')],
    'golos600c': [os.path.join(NM, 'golos-text/files', f) for f in (
        'golos-text-latin-600-normal.woff', 'golos-text-latin-ext-600-normal.woff', 'golos-text-cyrillic-600-normal.woff')],
    'geo800': [os.path.join(NM, 'noto-sans-georgian/files', 'noto-sans-georgian-georgian-800-normal.woff')],
    'arm800': [os.path.join(NM, 'noto-sans-armenian/files', 'noto-sans-armenian-armenian-800-normal.woff')],
})

# ------------------------------------------------------------------------------------------------ palettes
POP = dict(yellow='#FFD23F', pink='#FF3E8A', cyan='#19B5F0', red='#EE2B36', blue='#2346D8', orange='#FF7A1A',
           green='#19B37A', purple='#7B3FE4', cream='#FFF4DE', ink='#121318', white='#FFFFFF')
RISO = dict(pink='#FF48B0', blue='#0078BF', yellow='#FFE800', teal='#00A95C', orange='#FF6C2F', paper='#F6F0E2')
FOLK = dict(red='#D83A2A', mustard='#F2B32A', cobalt='#2348A8', green='#2C8C5A', cream='#FBF1DE', ink='#1C1B22', rose='#F28C9B')


def rng(seed: str | int) -> random.Random:
    return random.Random(f'b125-{seed}')


def text(fontname, s, x, y, size, tracking=0.0, anchor='start', sx=1.0):
    return font(fontname).text(s, x, y, size, tracking=tracking, anchor=anchor, sx=sx)


def fit_text(fontname, s, x, y, max_w, size, tracking=0.0, anchor='middle', sx=1.0):
    """Outlined text shrunk (if needed) so it is at most max_w wide → (d, width, size)."""
    _, w = font(fontname).text(s, 0, 0, size, tracking=tracking, sx=sx)
    if w > max_w:
        size *= max_w / w
    d, w = font(fontname).text(s, x, y, size, tracking=tracking, anchor=anchor, sx=sx)
    return d, w, size


def P(d, fill='none', stroke=None, sw=0, extra=''):
    st = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"' if stroke else ''
    return f'<path d="{d}" fill="{fill}"{st} {extra}/>'


def outlined(d, fill, stroke, sw, shadow=None, dx=0, dy=0, extra=''):
    """Sticker-style lettering: optional offset shadow, fat outline underneath, fill on top."""
    out = ''
    if shadow:
        out += f'<g transform="translate({dx} {dy})">' + P(d, shadow, shadow, sw) + '</g>'
    out += P(d, stroke, stroke, sw) + P(d, fill, extra=extra)
    return out


def suit_path(s: str, x: float, y: float, size: float) -> str:
    """A suit glyph as a transform group string (centre x,y, width size) — returns the <path> with no fill."""
    k = size / 100
    return f'transform="translate({x - size / 2:.2f} {y - size / 2:.2f}) scale({k:.4f})" d="{SUITS[s]}"'


def suit_el(s, x, y, size, fill, stroke=None, sw=0, extra=''):
    st = f' stroke="{stroke}" stroke-width="{sw * 100 / size:.2f}" stroke-linejoin="round"' if stroke else ''
    return f'<path {suit_path(s, x, y, size)} fill="{fill}"{st} {extra}/>'


def star(cx, cy, r_out, r_in, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(rot + i * 180 / n)
        pts.append(f'{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}')
    return 'M' + 'L'.join(pts) + 'Z'


def burst(cx, cy, r_out, r_in, n=14, seed=1, jitter=.18):
    """Comic explosion: an irregular star."""
    R = rng(f'burst{seed}')
    pts = []
    for i in range(n * 2):
        base = r_out if i % 2 == 0 else r_in
        r = base * (1 + R.uniform(-jitter, jitter))
        a = math.radians(-90 + i * 180 / n + R.uniform(-4, 4))
        pts.append(f'{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}')
    return 'M' + 'L'.join(pts) + 'Z'


def sparkle(cx, cy, r):
    k = r * .22
    return (f'M{cx} {cy - r}C{cx + k * .3} {cy - k} {cx + k} {cy - k * .3} {cx + r} {cy}'
            f'C{cx + k} {cy + k * .3} {cx + k * .3} {cy + k} {cx} {cy + r}'
            f'C{cx - k * .3} {cy + k} {cx - k} {cy + k * .3} {cx - r} {cy}'
            f'C{cx - k} {cy - k * .3} {cx - k * .3} {cy - k} {cx} {cy - r}Z')


def rays(cx, cy, r, n, fill, width_deg=None, offset=0.0, opacity=1.0, r0=0):
    w = width_deg if width_deg is not None else 180 / n
    out = ''
    for i in range(n):
        a = offset + i * 360 / n
        a0, a1 = math.radians(a - w / 2), math.radians(a + w / 2)
        out += (f'<path d="M{cx + r0 * math.cos(a0):.1f} {cy + r0 * math.sin(a0):.1f}L{cx + r * math.cos(a0):.1f} {cy + r * math.sin(a0):.1f}'
                f'L{cx + r * math.cos(a1):.1f} {cy + r * math.sin(a1):.1f}L{cx + r0 * math.cos(a1):.1f} {cy + r0 * math.sin(a1):.1f}Z" fill="{fill}" opacity="{opacity}"/>')
    return out


def halftone_pattern(id_, color, step=14, r=4.2, angle=45):
    return (f'<pattern id="{id_}" width="{step}" height="{step}" patternUnits="userSpaceOnUse" patternTransform="rotate({angle})">'
            f'<circle cx="{step / 2}" cy="{step / 2}" r="{r}" fill="{color}"/></pattern>')


def halftone_field(x0, y0, x1, y1, color, step=18, rmax=7.5, fn=None, angle=0, seed=0):
    """Real halftone: dot radius follows fn(u, v) in 0..1 (u, v = position in the box). Returns circles."""
    out = []
    ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    diag = math.hypot(x1 - x0, y1 - y0) / 2 + step
    n = int(diag / step) + 1
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            gx, gy = i * step, j * step
            x = cx + gx * ca - gy * sa
            y = cy + gx * sa + gy * ca
            if not (x0 - step <= x <= x1 + step and y0 - step <= y <= y1 + step):
                continue
            u, v = (x - x0) / (x1 - x0), (y - y0) / (y1 - y0)
            k = fn(u, v) if fn else 1
            if k <= .04:
                continue
            out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rmax * min(1, k):.2f}"/>')
    return f'<g fill="{color}">' + ''.join(out) + '</g>'


GRAIN = ('<filter id="grain" x="0" y="0" width="100%" height="100%">'
         '<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="11" result="n"/>'
         '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 .9"/>'
         '<feComposite in2="SourceGraphic" operator="in"/></filter>')
"""Riso speckle: knocks small random holes out of whatever it is applied to (use as filter on a group)."""

SPECKLE = ('<filter id="speckle" x="0" y="0" width="100%" height="100%">'
           '<feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="5" result="n"/>'
           '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 16 -10.6" result="m"/>'
           '<feComposite in="SourceGraphic" in2="m" operator="out"/></filter>')


def ribbon(cx, y, w, h, fill, edge, tail_fill=None, curve=26, sw=8, tails=True):
    """Tattoo / varsity banner: a gently arched band with folded tails. Returns (svg, centre-line path for text)."""
    x0, x1 = cx - w / 2, cx + w / 2
    top = f'M{x0} {y}Q{cx} {y - curve * 2} {x1} {y}'
    band = (f'M{x0} {y}Q{cx} {y - curve * 2} {x1} {y}L{x1} {y + h}Q{cx} {y + h - curve * 2} {x0} {y + h}Z')
    tf = tail_fill or edge
    t = ''
    if tails:
        tw = h * 1.1
        t = (f'<path d="M{x0 + 6} {y + h * .3}L{x0 - tw} {y + h * .3}L{x0 - tw * .55} {y + h * .8}L{x0 - tw} {y + h * 1.3}L{x0 + 6} {y + h * 1.3}Z" fill="{tf}" stroke="{POP["ink"]}" stroke-width="{sw}" stroke-linejoin="round"/>'
             f'<path d="M{x1 - 6} {y + h * .3}L{x1 + tw} {y + h * .3}L{x1 + tw * .55} {y + h * .8}L{x1 + tw} {y + h * 1.3}L{x1 - 6} {y + h * 1.3}Z" fill="{tf}" stroke="{POP["ink"]}" stroke-width="{sw}" stroke-linejoin="round"/>')
    band_el = f'<path d="{band}" fill="{fill}" stroke="{POP["ink"]}" stroke-width="{sw}" stroke-linejoin="round"/>'
    del top
    return t + band_el


def arched_text(fontname, s, cx, cy, r, size, tracking=0.0, top=True):
    """Text on a circle, readable left→right: on the top (baseline at r) or the bottom (cap tops toward the centre)."""
    f = font(fontname)
    if top:
        return f.text_arc(s, cx, cy, r, size, tracking=tracking, top=True)
    glyphs, w = f.layout(s, size, tracking)
    R = r + f.cap_height(size)
    ds = []
    for ch, fi, gn, gx, adv in glyphs:
        if ch == ' ':
            continue
        mid = gx + adv / 2 - w / 2
        ang = mid / R
        px, py = cx + R * math.sin(ang), cy + R * math.cos(ang)
        rot = -math.degrees(ang)
        tx, ty = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        ds.append(f.glyph_d(fi, gn, px - tx * adv / 2, py - ty * adv / 2, size, rot=rot))
    return ' '.join(ds)


def flat_card(x, y, w, h, rank, s, rot=0, pivot=None, face='#FFFDF6', red='#E8323C', black='#15161B', edge='#15161B',
              sw=6, big=True, fontname='abril', corner=True, pip_scale=.36, back=None):
    """Flat, bold-outlined playing card (pop / tattoo / riso designs). back=(fill, stripe) draws a card back instead."""
    col = red if s in 'HD' else black
    r = w * .08
    px, py = pivot or (x + w / 2, y + h / 2)
    g = f'<g transform="rotate({rot} {px} {py})">'
    g += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{face if not back else back[0]}" stroke="{edge}" stroke-width="{sw}"/>'
    if back:
        fill, stripe = back
        g += (f'<clipPath id="bk{int(x)}{int(y)}{int(rot)}"><rect x="{x + w * .1}" y="{y + w * .1}" width="{w * .8}" height="{h - w * .2}" rx="{r * .6}"/></clipPath>'
              f'<g clip-path="url(#bk{int(x)}{int(y)}{int(rot)})">'
              + ''.join(f'<path d="M{x - h + k * w * .09} {y}l{h} {h}" stroke="{stripe}" stroke-width="{w * .03:.1f}"/>' for k in range(0, 40))
              + '</g>'
              f'<rect x="{x + w * .1}" y="{y + w * .1}" width="{w * .8}" height="{h - w * .2}" rx="{r * .6}" fill="none" stroke="{stripe}" stroke-width="{sw * .6}"/>')
    else:
        if corner:
            d, _ = font(fontname).text(rank, x + w * .15, y + h * .165, h * .13, anchor='middle')
            cg = P(d, col) + suit_el(s, x + w * .15, y + h * .235, w * .105, col)
            g += cg + f'<g transform="rotate(180 {x + w / 2} {y + h / 2})">{cg}</g>'
        if big:
            g += suit_el(s, x + w / 2, y + h / 2, w * pip_scale * 1.25, col)
    return g + '</g>'


def frame_svg(w, h, body, defs='', title='', bg=None):
    return svgkit.svg(w, h, body, defs, title, bg)


__all__ = ['POP', 'RISO', 'FOLK', 'rng', 'text', 'fit_text', 'P', 'outlined', 'suit_el', 'star', 'burst', 'sparkle', 'rays',
           'halftone_pattern', 'halftone_field', 'GRAIN', 'SPECKLE', 'ribbon', 'arched_text', 'flat_card', 'frame_svg',
           'lin', 'rad', 'SPADE', 'HEART', 'DIAMOND', 'CLUB']
