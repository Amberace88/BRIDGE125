"""Dev helper: render the deck SVGs small and tile them (PREV dir)."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image  # noqa: E402

import deck  # noqa: E402
from render import browser, render_svg  # noqa: E402

OUT = os.environ.get('PREV', '/tmp/merchprev')
names = deck.build()
pick = sys.argv[1:] or names
w = 220
ims = []
with browser() as b:
    for n in pick:
        p = os.path.join(OUT, 'deck', n + '.png')
        render_svg(b, os.path.join(deck.OUT, n + '.svg'), p, w if 'side' not in n else 80, bg='#ffffff')
        ims.append(Image.open(p).convert('RGB'))
cols = 9
ch = max(i.height for i in ims)
sheet = Image.new('RGB', (cols * (w + 8), ((len(ims) + cols - 1) // cols) * (ch + 8)), (50, 50, 55))
for k, im in enumerate(ims):
    sheet.paste(im, ((k % cols) * (w + 8), (k // cols) * (ch + 8)))
sheet.save(os.path.join(OUT, 'deck-sheet.png'))
