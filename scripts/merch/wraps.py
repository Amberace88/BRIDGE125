"""Mug wraps (2550 × 1050 px = 8.5 × 3.5 in at 300 dpi): two copies of a design, one each side of the handle.

Registers  <design>-wrap  into designs.DESIGNS. The source design is nested as an inner <svg>, so the wrap stays a
self-contained vector file with text as outlines.
"""
from __future__ import annotations

import re

import cities
import collection  # noqa: F401  (registers the source designs)
from designs import DESIGNS, design

WW, WH = 2550, 1050


def inner(name: str) -> tuple[str, float, float]:
    s = DESIGNS[name]()
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', s)
    w, h = float(m.group(1)), float(m.group(2))
    body = re.sub(r'^<svg[^>]*>', '', s.strip())
    body = re.sub(r'</svg>\s*$', '', body)
    body = re.sub(r'<title>.*?</title>', '', body)
    # keep ids unique per copy
    return body, w, h


def wrap(src: str, bg: str | None = None, margin=70):
    body, w, h = inner(src)
    th = WH - 2 * margin
    tw = th * w / h
    out = f'<rect width="{WW}" height="{WH}" fill="{bg}"/>' if bg else ''
    for i, cx in enumerate((WW * .25, WW * .75)):
        b = re.sub(r'id="([^"]+)"', lambda m: f'id="{m.group(1)}_{i}"', body)
        b = re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{m.group(1)}_{i})', b)
        out += f'<svg x="{cx - tw / 2:.1f}" y="{margin}" width="{tw:.1f}" height="{th:.1f}" viewBox="0 0 {w:g} {h:g}">{b}</svg>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WW} {WH}" width="{WW}" height="{WH}">'
            f'<title>{src} — mug wrap — Bridge 125</title>{out}</svg>\n')


WRAPS = {'pop-lady': '#FFFFFF', 'lucky-jack': '#FFFFFF', 'seven-two': '#FFFFFF'}
WRAPS.update({f'badge-{c}': '#FFFFFF' for c in cities.CITY_IDS})

for _src, _bg in WRAPS.items():
    design(f'{_src}-wrap')(lambda _s=_src, _b=_bg: wrap(_s, _b))
    collection.BACKGROUNDS[f'{_src}-wrap'] = _bg
