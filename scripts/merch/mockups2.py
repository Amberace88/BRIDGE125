"""Bridge 125 — mockups for the 2026 colourful collection + City editions (SVG scenes → Chromium → WebP 1200 px).

    python3 scripts/merch/mockups2.py                 # everything → public/merch/mockups/*.webp
    python3 scripts/merch/mockups2.py tee-lady-white  # one or more by name
    python3 scripts/merch/mockups2.py --list

Transparent product cut-outs with soft contact shadows (the store supplies the backdrop). The artwork is the real
vector design from merch-print/designs, so a mockup always matches its print file. Names: <product id>-<colour>[-n].
"""
from __future__ import annotations

import os
import pathlib
import re
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))

import mockups as M  # noqa: E402
from mockups import GARMENT, SIDE, art, page, shading  # noqa: E402
from render import browser, render_html  # noqa: E402

GARMENT.update({'white': ('#F2F2EF', '#FFFFFF'), 'navy': ('#1C2541', '#2B3A63'), 'sand': ('#E6DAC2', '#F3ECDD'),
                'natural': ('#E6DCC6', '#F1EADB')})


def aspect(design: str) -> float:
    head = pathlib.Path(M.DESIGNS, design + '.svg').read_text(encoding='utf-8')[:800]
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', head)
    return float(m.group(2)) / float(m.group(1))


# ------------------------------------------------------------------------------------------------ apparel
def tee(design, colour, art_w=330, art_y=262):
    return M.tee(design, colour, art_w=art_w, art_y=art_y, aspect=aspect(design))


def hoodie(design, colour, art_w=300, art_y=350):
    return M.hoodie(design, colour, art_w=art_w, art_y=art_y, aspect=aspect(design))


SWEAT = M.sym((500, 170), [((540, 170), (572, 168), (596, 164)), ((654, 180), (712, 198), (750, 222)),
                           ((806, 280), (836, 410), (852, 560)), ((858, 650), (864, 720), (866, 790)),
                           ((838, 800), (800, 806), (772, 806)), ((762, 700), (752, 620), (742, 560)),
                           ((738, 500), (736, 460), (734, 420)), ((736, 560), (740, 700), (742, 800)),
                           ((660, 808), (580, 812), (500, 812))], cx=500)


def sweat(design, colour, art_w=330, art_y=270):
    base, hi = GARMENT[colour]
    neck = 'M408 172C430 214 466 232 500 232C534 232 570 214 592 172C562 160 532 156 500 156C468 156 438 160 408 172Z'
    rib = 'M408 172C430 214 466 232 500 232C534 232 570 214 592 172'
    waist = 'M258 800C420 812 580 812 742 800L742 856C580 868 420 868 258 856Z'
    ribs = ''.join(f'<path d="M{x} 806V856" stroke="#000" stroke-width="2" opacity=".22"/>' for x in range(266, 740, 9))
    cuffs = (f'<path d="M772 806L866 790L870 850L776 860Z" fill="{base}"/><path d="M228 806L134 790L130 850L224 860Z" fill="{base}"/>')
    a = aspect(design)
    body = (f'<clipPath id="sc"><path d="{SWEAT}"/><path d="{waist}"/></clipPath>'
            f'<g filter="url(#drop)"><path d="{SWEAT}" fill="{base}"/><path d="{waist}" fill="{base}"/>{cuffs}</g>'
            f'<path d="{neck}" fill="#000" opacity=".45"/>'
            f'<image href="{art(design)}" x="{500 - art_w / 2}" y="{art_y}" width="{art_w}" height="{art_w * a}" opacity=".97"/>'
            + shading('sc', hi) + ribs
            + f'<path d="{rib}" stroke="{hi}" stroke-width="18" fill="none"/><path d="{rib}" stroke="#000" stroke-width="18" fill="none" opacity=".25" stroke-dasharray="2 3"/>'
            f'<g clip-path="url(#sc)"><path d="M300 520C330 640 320 740 300 800" stroke="#000" stroke-width="28" opacity=".2" filter="url(#blur18)" fill="none"/>'
            f'<path d="M700 500C670 620 690 720 680 800" stroke="#000" stroke-width="28" opacity=".18" filter="url(#blur18)" fill="none"/></g>')
    return page(body, SIDE)


def cap(design, colour, mark_w=200, mark_y=380):
    html = M.cap(colour)
    # swap the built-in logo embroidery for the given design (kept as an embroidered patch with a thread shadow)
    if design != 'logo-mark':
        a = aspect(design)
        html = re.sub(r'<g transform="translate\(410 380\) scale\(\.9\)".*?</g></g>',
                      f'<image href="{art(design)}" x="{500 - mark_w / 2}" y="{mark_y}" width="{mark_w}" height="{mark_w * a}" '
                      f'style="filter:drop-shadow(0 2px 1px rgba(0,0,0,.55))"/>', html, flags=re.S)
    return html


# ------------------------------------------------------------------------------------------------ wall art
def framed(design, frame):
    return M.framed_poster(design, frame, aspect=aspect(design))


def paper_poster(design, rot=-3):
    a = aspect(design)
    w = 560
    h = w * a
    x, y = 500 - w / 2, 500 - h / 2
    body = (f'<linearGradient id="curl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/>'
            f'<stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>'
            f'<g transform="rotate({rot} 500 500)">'
            f'<g filter="url(#drop)"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fff"/></g>'
            f'<image href="{art(design)}" x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#curl)"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" filter="url(#noise)" opacity=".06" style="mix-blend-mode:overlay"/>'
            + ''.join(f'<rect x="{cx - 34}" y="{y - 14}" width="68" height="30" fill="#F3EAD3" opacity=".85" transform="rotate({r} {cx} {y})"/>'
                      for cx, r in ((x + 70, -8), (x + w - 70, 7)))
            + '</g>')
    return page(body)


def canvas(design, size=520, depth=26):
    a = aspect(design)
    w, h = size, size * a
    x, y = 500 - w / 2, 500 - h / 2
    body = (f'<clipPath id="cv"><rect x="{x}" y="{y}" width="{w}" height="{h}"/></clipPath>'
            f'<g filter="url(#drop)"><rect x="{x}" y="{y}" width="{w + depth}" height="{h}" fill="#222"/></g>'
            # right edge (wrapped canvas, darker)
            f'<path d="M{x + w} {y}L{x + w + depth} {y + depth * .6}L{x + w + depth} {y + h + depth * .2}L{x + w} {y + h}Z" fill="#000" opacity=".55"/>'
            f'<image href="{art(design)}" x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice"/>'
            f'<g clip-path="url(#cv)"><rect x="{x}" y="{y}" width="{w}" height="{h}" filter="url(#weave)" opacity=".22" style="mix-blend-mode:overlay"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#side)" opacity=".35" style="mix-blend-mode:multiply"/></g>')
    return page(body, SIDE)


# ------------------------------------------------------------------------------------------------ drinkware
def mug11(wrap, view='front'):
    html = M.mug(view)
    return html.replace(art('seven-rules'), art(wrap))


def enamel(wrap, rim='#1B2440', view='front'):
    x0, x1, y0, y1 = 290, 690, 330, 720
    rx, ry = (x1 - x0) / 2, 34
    cx = (x0 + x1) / 2
    body_d = f'M{x0} {y0}V{y1 - 20}Q{x0} {y1 + ry} {cx} {y1 + ry}Q{x1} {y1 + ry} {x1} {y1 - 20}V{y0}A{rx} {ry} 0 0 1 {x0} {y0}Z'
    wrap_h = (y1 - y0) - 30
    wrap_w = wrap_h * 2550 / 1050
    offset = (x1 - x0) / 2 - (.25 if view == 'front' else .75) * wrap_w
    handle = (f'<path d="M{x1 - 6} 380C820 370 840 420 840 500C840 580 800 640 {x1 - 6} 650" fill="none" stroke="{rim}" stroke-width="30" stroke-linecap="round"/>'
              f'<path d="M{x1 - 6} 380C820 370 840 420 840 500C840 580 800 640 {x1 - 6} 650" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".35" transform="translate(-4 -4)"/>')
    body = (f'<clipPath id="ec"><path d="{body_d}"/></clipPath>'
            f'<linearGradient id="cyl" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".16" stop-color="#000" stop-opacity=".04"/>'
            f'<stop offset=".3" stop-color="#fff" stop-opacity=".75"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/>'
            f'<stop offset=".82" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>'
            f'<radialGradient id="inside" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#d6d4cf"/><stop offset="1" stop-color="#f6f5f2"/></radialGradient>'
            f'<ellipse cx="{cx}" cy="{y1 + ry + 6}" rx="{rx * 1.05}" ry="30" fill="#000" opacity=".35" filter="url(#blur18)"/>'
            + handle + f'<path d="{body_d}" fill="#F7F6F2"/>'
            f'<g clip-path="url(#ec)"><image href="{art(wrap)}" x="{x0 + offset}" y="{y0 + 20}" width="{wrap_w}" height="{wrap_h}"/>'
            f'<rect x="{x0}" y="0" width="{x1 - x0}" height="1000" fill="url(#cyl)"/>'
            f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="800" filter="url(#noise)" opacity=".06"/></g>'
            f'<path d="M{x0} {y1 - 20}Q{x0} {y1 + ry} {cx} {y1 + ry}Q{x1} {y1 + ry} {x1} {y1 - 20}" fill="none" stroke="{rim}" stroke-width="8"/>'
            f'<ellipse cx="{cx}" cy="{y0}" rx="{rx}" ry="{ry}" fill="url(#inside)"/>'
            f'<ellipse cx="{cx}" cy="{y0}" rx="{rx}" ry="{ry}" fill="none" stroke="{rim}" stroke-width="12"/>'
            f'<path d="M{x0 + 30} {y0 + 10}Q{cx} {y0 + ry + 10} {x1 - 30} {y0 + 10}" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>')
    return page(body)


# ------------------------------------------------------------------------------------------------ accessories
def tote(design, colour='natural', art_w=360, art_y=420):
    html = M.tote('line-art-hand')
    a = aspect(design)
    html = re.sub(r'<image href="[^"]+" x="[^"]+" y="410" width="350" height="[^"]+"/>',
                  f'<image href="{art(design)}" x="{500 - art_w / 2}" y="{art_y}" width="{art_w}" height="{art_w * a}"/>', html)
    if colour != 'natural':
        base, hi = GARMENT[colour]
        html = html.replace(GARMENT['natural'][0], base).replace(GARMENT['natural'][1], hi)
    return html


def phone(design, bg='#0B3B30', scale=1.1, y_off=150, cover=False):
    html = M.phone('jacks-x5')
    a = aspect(design)
    w = 330
    if cover:
        img = f'<image href="{art(design)}" x="335" y="165" width="{w}" height="670" preserveAspectRatio="xMidYMid slice"/>'
    else:
        aw = w * scale
        img = f'<image href="{art(design)}" x="{500 - aw / 2}" y="{165 + y_off}" width="{aw}" height="{aw * a}"/>'
    html = re.sub(r'<image href="[^"]+jacks-x5[^"]*" [^>]*/>', img, html)
    html = html.replace('url(#caseBg)', bg)
    html = re.sub(r'<path d="M[^"]+" stroke="#C9A85A" stroke-width="1" opacity="\.08"/>', '', html)
    return html


def notebook(design, cover='#F7F0E1', band='#E8323C'):
    a = 210 / 148
    w = 470
    h = w * a
    x, y = 500 - w / 2, 500 - h / 2
    body = (f'<g transform="rotate(-6 500 500)">'
            f'<g filter="url(#drop)"><rect x="{x + 6}" y="{y + 8}" width="{w}" height="{h}" rx="14" fill="#E9E3D6"/></g>'
            + ''.join(f'<rect x="{x + 6 + k * 2}" y="{y + 8 + k}" width="{w}" height="{h}" rx="14" fill="#fff" stroke="#ddd" stroke-width="1"/>' for k in (3, 2, 1))
            + f'<clipPath id="nb"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14"/></clipPath>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{cover}"/>'
            f'<g clip-path="url(#nb)"><image href="{art(design)}" x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice"/>'
            f'<rect x="{x}" y="{y}" width="26" height="{h}" fill="#000" opacity=".12"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#side)" opacity=".25" style="mix-blend-mode:multiply"/></g>'
            f'<rect x="{x + w - 70}" y="{y - 4}" width="22" height="{h + 8}" rx="6" fill="{band}"/>'
            f'<rect x="{x + w - 64}" y="{y - 4}" width="6" height="{h + 8}" fill="#fff" opacity=".25"/>'
            '</g>')
    return page(body, SIDE)


def coasters():
    items = [('coaster-S', 330, 360, -8), ('coaster-H', 640, 330, 6), ('coaster-D', 360, 660, 4), ('coaster-C', 670, 650, -5)]
    out = ''
    for name, cx, cy, rot in items:
        r = 175
        out += (f'<g transform="rotate({rot} {cx} {cy})">'
                f'<clipPath id="c{name}"><rect x="{cx - r}" y="{cy - r}" width="{2 * r}" height="{2 * r}" rx="34"/></clipPath>'
                f'<g filter="url(#dropS)"><rect x="{cx - r}" y="{cy - r + 8}" width="{2 * r}" height="{2 * r}" rx="34" fill="#C49A6C"/></g>'
                f'<rect x="{cx - r}" y="{cy - r}" width="{2 * r}" height="{2 * r}" rx="34" fill="#fff"/>'
                f'<g clip-path="url(#c{name})"><image href="{art(name)}" x="{cx - r}" y="{cy - r}" width="{2 * r}" height="{2 * r}"/>'
                f'<rect x="{cx - r}" y="{cy - r}" width="{2 * r}" height="{2 * r}" fill="url(#gloss)"/></g>'
                '</g>')
    gloss = ('<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/>'
             '<stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>')
    return page(out, gloss)


def stickers(items):
    sheet = '<g filter="url(#drop)"><rect x="140" y="110" width="720" height="800" rx="18" fill="#FBFAF6"/></g>'
    sheet += '<path d="M860 830L860 910L780 910Z" fill="#E7E3D8"/>'
    body = ''
    for name, cx, cy, size, rot in items:
        a = aspect(name)
        aw, ah = size, size * a
        if ah > size * 1.15:
            ah = size * 1.15
            aw = ah / a
        body += (f'<g transform="rotate({rot} {cx} {cy})" filter="url(#dropS)">'
                 f'<rect x="{cx - aw / 2 - 16}" y="{cy - ah / 2 - 16}" width="{aw + 32}" height="{ah + 32}" rx="30" fill="#fff"/>'
                 f'<image href="{art(name)}" x="{cx - aw / 2}" y="{cy - ah / 2}" width="{aw}" height="{ah}"/></g>')
    return page(sheet + body)


def playmat(design):
    a = aspect(design)
    w = 860
    h = w * a
    x, y = 500 - w / 2, 500 - h / 2
    cards = ''
    for i, (dx, dy, r) in enumerate(((-90, -10, -8), (90, 6, 7))):
        cx, cy = 500 + dx, 500 + dy
        cards += (f'<g transform="rotate({r} {cx} {cy})" filter="url(#dropS)"><rect x="{cx - 45}" y="{cy - 64}" width="90" height="128" rx="9" fill="#FFFDF6"/>'
                  f'<rect x="{cx - 39}" y="{cy - 58}" width="78" height="116" rx="6" fill="none" stroke="#C9A85A" stroke-width="2"/></g>')
    body = (f'<g transform="translate(0 40)"><clipPath id="pm"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="30"/></clipPath>'
            f'<g filter="url(#drop)"><rect x="{x}" y="{y + 6}" width="{w}" height="{h}" rx="30" fill="#111"/></g>'
            f'<g clip-path="url(#pm)"><image href="{art(design)}" x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" filter="url(#noise)" opacity=".12" style="mix-blend-mode:overlay"/></g>'
            f'<rect x="{x + 3}" y="{y + 3}" width="{w - 6}" height="{h - 6}" rx="28" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="6"/>'
            f'<rect x="{x + 3}" y="{y + 3}" width="{w - 6}" height="{h - 6}" rx="28" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-dasharray="5 4"/>'
            + cards + '</g>')
    return page(body)


# ------------------------------------------------------------------------------------------------ catalogue of renders
CITY_IDS = ['riga', 'tallinn', 'vilnius', 'warsaw', 'berlin', 'kyiv', 'bucharest', 'sofia', 'tbilisi', 'yerevan', 'baku',
            'almaty', 'tashkent', 'madrid', 'london', 'vienna', 'montecarlo']
FRAMES = {'black': '#141418', 'oak': '#8A6439'}

SCENES: dict[str, callable] = {
    # apparel
    'tee-lady-white': lambda: tee('pop-lady', 'white', 340, 250),
    'tee-lady-ink': lambda: tee('pop-lady', 'ink', 340, 250),
    'tee-bluff-white': lambda: tee('bluff-riso', 'white', 330, 250),
    'tee-bluff-sand': lambda: tee('bluff-riso', 'sand', 330, 250),
    'hoodie-burn-ink': lambda: hoodie('burn-synth', 'ink', 310, 318),
    'hoodie-burn-navy': lambda: hoodie('burn-synth', 'navy', 310, 318),
    'sweat-durak-navy': lambda: sweat('never-durak', 'navy', 350, 270),
    'sweat-durak-ink': lambda: sweat('never-durak', 'ink', 350, 270),
    'tee-lucky-ink': lambda: tee('lucky-jack', 'ink', 340, 255),
    'tee-lucky-white': lambda: tee('lucky-jack', 'white', 340, 255),
    'tee-seven-white': lambda: tee('seven-two', 'white', 320, 250),
    'tee-seven-natural': lambda: tee('seven-two', 'natural', 320, 250),
    'tee-lielais-natural': lambda: tee('lielais', 'natural', 330, 250),
    'tee-lielais-white': lambda: tee('lielais', 'white', 330, 250),
    'cap-125-ink': lambda: cap('cap-125', 'ink', 190, 410),
    'cap-125-navy': lambda: cap('cap-125', 'navy', 190, 410),
    # home
    'poster-lady-paper': lambda: paper_poster('pop-lady'),
    'poster-lady-black': lambda: framed('pop-lady', FRAMES['black']),
    'poster-lady-oak': lambda: framed('pop-lady', FRAMES['oak']),
    'poster-bluff-paper': lambda: paper_poster('bluff-riso', 3),
    'poster-bluff-black': lambda: framed('bluff-riso', FRAMES['black']),
    'poster-bluff-oak': lambda: framed('bluff-riso', FRAMES['oak']),
    'poster-seven-paper': lambda: paper_poster('seven-two', -2),
    'poster-seven-black': lambda: framed('seven-two', FRAMES['black']),
    'poster-seven-oak': lambda: framed('seven-two', FRAMES['oak']),
    'poster-patience-paper': lambda: paper_poster('patience', 2),
    'poster-patience-black': lambda: framed('patience', FRAMES['black']),
    'poster-patience-oak': lambda: framed('patience', FRAMES['oak']),
    'canvas-suits-white': lambda: canvas('four-suits', 560),
    'mug-sevens-white': lambda: mug11('seven-two-wrap', 'front'),
    'mug-sevens-white-2': lambda: mug11('seven-two-wrap', 'back'),
    'mug-lady-white': lambda: mug11('pop-lady-wrap', 'front'),
    'mug-lucky-white': lambda: enamel('lucky-jack-wrap', '#1B2440'),
    'coasters-suits-white': coasters,
    # accessories
    'notebook-nines-white': lambda: notebook('sudoku-nines', '#F7F0E1', '#2346D8'),
    'notebook-patience-white': lambda: notebook('patience', '#F3ECE0', '#F05A4F'),
    'tote-lielais-natural': lambda: tote('lielais', 'natural', 360, 410),
    'tote-suits-natural': lambda: tote('four-suits', 'natural', 360, 450),
    'phone-lady-white': lambda: phone('pop-lady', '#FFD23F', cover=True),
    'phone-lucky-ink': lambda: phone('lucky-jack', '#15161B', 1.1, 120),
    'stickers-pop-white': lambda: stickers([('pop-lady', 300, 300, 230, -6), ('four-suits', 650, 280, 220, 5), ('lucky-jack', 320, 640, 250, 4),
                                            ('never-durak', 660, 600, 280, -4), ('burn-synth', 470, 820, 200, 3), ('cap-125', 720, 830, 170, -8)]),
    'mat-table-felt': lambda: playmat('mat-felt'),
    'mat-table-night': lambda: playmat('mat-night'),
}

for _c in CITY_IDS:
    SCENES[f'cposter-{_c}-paper'] = (lambda c=_c: paper_poster(f'city-{c}', -2))
    SCENES[f'cposter-{_c}-black'] = (lambda c=_c: framed(f'city-{c}', FRAMES['black']))
    SCENES[f'cposter-{_c}-oak'] = (lambda c=_c: framed(f'city-{c}', FRAMES['oak']))
    SCENES[f'ctee-{_c}-white'] = (lambda c=_c: tee(f'badge-{c}', 'white', 300, 270))
    SCENES[f'ctee-{_c}-ink'] = (lambda c=_c: tee(f'badge-{c}', 'ink', 300, 270))
    SCENES[f'cmug-{_c}-white'] = (lambda c=_c: enamel(f'badge-{c}-wrap', '#1B2440'))


def main(names):
    tmp = tempfile.mkdtemp(prefix='merch2-')
    with browser() as b:
        for name in names:
            png = os.path.join(tmp, name + '.png')
            render_html(b, SCENES[name](), png, M.SIZE, M.SIZE, base=tmp)
            out = os.path.join(M.OUT, name + '.webp')
            M.to_webp(png, out, q=78)
            print(name, os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    if '--list' in sys.argv:
        print('\n'.join(SCENES))
    else:
        main(sys.argv[1:] or list(SCENES))
