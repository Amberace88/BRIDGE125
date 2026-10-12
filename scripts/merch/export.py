"""Export print-ready PNGs for the POD upload.

    python3 scripts/merch/export.py            # designs (4000 px wide) + deck (300 dpi, with bleed)
    python3 scripts/merch/export.py --deck     # deck only
    python3 scripts/merch/export.py --designs  # designs only

Designs are rendered with a transparent background (except the poster, which is full-bleed artwork).
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from PIL import Image  # noqa: E402

import deck  # noqa: E402
import designs  # noqa: E402
import designs_b  # noqa: E402,F401
from render import MERCH, browser, render_svg  # noqa: E402
from svgkit import write  # noqa: E402

PRINT = os.path.join(MERCH, 'print')
FULL_BLEED = {'riga-jugendstil'}


def optimise(path: str, dpi: int = 300):
    im = Image.open(path)
    im.save(path, optimize=True, dpi=(dpi, dpi))


def export_designs(b):
    for name, fn in designs.DESIGNS.items():
        src = os.path.join(designs.OUT, name + '.svg')
        write(src, fn())
        out = os.path.join(PRINT, name + '.png')
        render_svg(b, src, out, 4000)
        if name in FULL_BLEED:   # opaque poster art: a high-quality JPEG is a third of the size
            jpg = out[:-4] + '.jpg'
            Image.open(out).convert('RGB').save(jpg, quality=93, optimize=True, dpi=(300, 300))
            os.remove(out)
            out = jpg
        else:
            optimise(out)
        print('design', name, os.path.getsize(out) // 1024, 'KB')


def export_deck(b):
    for name in deck.build():
        src = os.path.join(deck.OUT, name + '.svg')
        out = os.path.join(PRINT, 'deck', name + '.png')
        w = 825 if not name.startswith('box-side') else deck.BOX_D + 75
        render_svg(b, src, out, int(w), bg='#ffffff')
        optimise(out)
    print('deck done')


if __name__ == '__main__':
    args = set(sys.argv[1:])
    with browser() as br:
        if not args or '--designs' in args:
            export_designs(br)
        if not args or '--deck' in args:
            export_deck(br)
