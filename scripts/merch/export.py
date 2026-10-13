"""Export the merch print files.

    python3 scripts/merch/export.py --svg           # vector sources only → merch-print/designs/*.svg (fast)
    python3 scripts/merch/export.py --designs       # + print files → merch-print/print/*.png|jpg (4000 px wide, 300 dpi)
    python3 scripts/merch/export.py --deck          # the legacy 36-card deck → merch-print/deck/*.png
    python3 scripts/merch/export.py --designs pop-lady city-riga   # only these designs
    python3 scripts/merch/export.py                 # everything

Garment / sticker / mug artwork is exported with a transparent background. Full-bleed artwork (posters, canvas,
notebook covers, play mats, coasters — see collection.BACKGROUNDS) is flattened on its background and saved as a
high-quality JPEG (a quarter of the PNG size; print shops accept both).
Deterministic: the same code always produces the same files (seeded randomness, fonts vendored in scripts/merch/fonts).
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from PIL import Image  # noqa: E402

import cities  # noqa: E402,F401
import collection  # noqa: E402
import deck  # noqa: E402
import designs  # noqa: E402
import designs_b  # noqa: E402,F401
import wraps  # noqa: E402,F401
from render import browser, render_svg  # noqa: E402
from svgkit import ROOT, write  # noqa: E402

PRINT = os.path.join(ROOT, 'merch-print', 'print')
DECK_PRINT = os.path.join(ROOT, 'merch-print', 'deck')
FULL_BLEED = {'riga-jugendstil'} | {n for n in designs.DESIGNS if n.startswith('city-')} | {
    'bluff-riso', 'seven-two', 'sudoku-nines', 'patience', 'lielais', 'mat-felt', 'mat-night', 'coaster-S', 'coaster-H', 'coaster-D', 'coaster-C'}
# A full-bleed design is ALSO exported transparent when it goes on garments / totes too.
ALSO_TRANSPARENT = {'bluff-riso', 'seven-two', 'lielais'}
# Pixel width per print file (default 4000 px). Wraps = 8.5 in at 300 dpi; play mats = 61 cm; posters = 50 × 70 cm at 300 dpi.
WIDTH = {n: 2550 for n in designs.DESIGNS if n.endswith('-wrap')}
WIDTH.update({'mat-felt': 7200, 'mat-night': 7200})
WIDTH.update({n: 5906 for n in FULL_BLEED if n.startswith('city-') or n in ('bluff-riso', 'seven-two', 'patience', 'pop-lady', 'riga-jugendstil')})


def optimise(path: str, dpi: int = 300):
    im = Image.open(path)
    im.save(path, optimize=True, dpi=(dpi, dpi))


def write_svgs(names):
    for name in names:
        write(os.path.join(designs.OUT, name + '.svg'), designs.DESIGNS[name]())


def export_designs(b, names):
    for name in names:
        src = os.path.join(designs.OUT, name + '.svg')
        w = WIDTH.get(name, 4000)
        if name in FULL_BLEED:
            out = os.path.join(PRINT, name + '.png')
            render_svg(b, src, out, w, bg=collection.BACKGROUNDS.get(name, '#FFFFFF'))
            jpg = out[:-4] + '.jpg'
            Image.open(out).convert('RGB').save(jpg, quality=92, optimize=True, dpi=(300, 300))
            os.remove(out)
            print('design', name, os.path.getsize(jpg) // 1024, 'KB (jpg, full bleed)')
        if name not in FULL_BLEED or name in ALSO_TRANSPARENT:
            out = os.path.join(PRINT, name + ('-transparent' if name in FULL_BLEED else '') + '.png')
            render_svg(b, src, out, w)
            optimise(out)
            print('design', name, os.path.getsize(out) // 1024, 'KB')


def export_deck(b):
    for name in deck.build():
        src = os.path.join(deck.OUT, name + '.svg')
        out = os.path.join(DECK_PRINT, name + '.png')
        w = 825 if not name.startswith('box-side') else deck.BOX_D + 75
        render_svg(b, src, out, int(w), bg='#ffffff')
        optimise(out)
    print('deck done')


if __name__ == '__main__':
    flags = {a for a in sys.argv[1:] if a.startswith('--')}
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    names = only or list(designs.DESIGNS)
    write_svgs(names)
    if flags == {'--svg'}:
        print(len(names), 'SVGs written to', designs.OUT)
        sys.exit(0)
    with browser() as br:
        if not flags or '--designs' in flags:
            export_designs(br, names)
        if not flags or '--deck' in flags:
            export_deck(br)
