"""Dev helper: build designs and render small previews (PREV dir, default /tmp/merchprev)."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import designs  # noqa: E402
import designs_b  # noqa: E402,F401
from render import browser, render_svg  # noqa: E402
from svgkit import write  # noqa: E402

OUT = os.environ.get('PREV', '/tmp/merchprev')
names = sys.argv[1:] or list(designs.DESIGNS)
bg = os.environ.get('BG', '#1c1d22')
with browser() as b:
    for n in names:
        p = os.path.join(designs.OUT, n + '.svg')
        write(p, designs.DESIGNS[n]())
        render_svg(b, p, os.path.join(OUT, n + '.png'), int(os.environ.get('W', 800)), bg=bg)
        print(n, os.path.getsize(p))
