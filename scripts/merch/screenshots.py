"""Screenshot the merch screen through the dev harness.

    npx vite --port 4177 --host 127.0.0.1 &      # serves /scripts/merch/harness.html
    python3 scripts/merch/screenshots.py [out_dir]
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:4177/scripts/merch/harness.html')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/merch-shots'
os.makedirs(OUT, exist_ok=True)

SHOTS = [
    ('mobile-top', 390, 844, '', None),
    ('mobile-grid', 390, 844, '', 'grid'),
    ('mobile-detail-deck', 390, 844, '?item=deck', None),
    ('mobile-detail-tee', 390, 844, '?item=tee-queen', None),
    ('mobile-notify', 390, 844, '?item=tee-queen', 'notify'),
    ('mobile-lv', 390, 844, '?lang=lv', 'grid'),
    ('desktop-top', 1440, 900, '', None),
    ('desktop-grid', 1440, 900, '', 'grid'),
    ('desktop-detail', 1440, 900, '?item=poster-riga', None),
    ('desktop-detail-tee', 1440, 900, '?item=hoodie-bluff&lang=ru', None),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h, q, action in SHOTS:
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2 if w < 500 else 1)
        pg.goto(BASE + q)
        pg.wait_for_load_state('networkidle')
        pg.wait_for_timeout(1400)
        if action == 'grid':
            pg.evaluate("document.querySelector('.mx-filters').scrollIntoView()")
            pg.wait_for_timeout(900)
        if action == 'notify':
            pg.click('.mx-sizes button:nth-child(3)')
            pg.click('.mx-notify .btn')
            pg.fill('.mx-field input', 'eddie@example')
            pg.click('.mx-field .btn')
            pg.wait_for_timeout(400)
            pg.evaluate("document.querySelector('.mx-sheet').scrollTo(0, 99999)")
            pg.wait_for_timeout(500)
        pg.screenshot(path=os.path.join(OUT, name + '.png'))
        pg.close()
        print(name)
    b.close()
