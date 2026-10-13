"""Bridge 125 merch — the colourful collection (2026): universal card-game designs drawn in code.

Registers into designs.DESIGNS (written to merch-print/designs/*.svg by export.py). Pop-art, risograph, synthwave,
tattoo flash, folk-modern and Swiss minimal — all original vector art, text converted to outlines.
"""
from __future__ import annotations

import math

import artkit as K
from artkit import FOLK, POP, RISO, P, burst, fit_text, flat_card, halftone_field, outlined, rays, rng, sparkle, star, suit_el, text
from designs import design, flame, queen_card
from svgkit import GOLD, GOLD_HI, GOLD_LO, lin, rad, svg

INK = POP['ink']
CREAM = POP['cream']

# Designs that are full-bleed artwork (posters / covers / mats): exported opaque on this background.
BACKGROUNDS: dict[str, str] = {}


# ================================================================================================ The Lady (pop art)
@design('pop-lady')
def pop_lady():
    W, H = 1200, 1500
    qdefs, qcard = queen_card()
    defs = qdefs + K.GRAIN
    panel = 'M60 60H1140V1440H60Z'
    clip = f'<clipPath id="panel"><path d="{panel}"/></clipPath>'
    # sunburst + Ben-Day dots
    bg = (f'<path d="{panel}" fill="{POP["yellow"]}"/>'
          f'<g clip-path="url(#panel)">' + rays(600, 760, 1300, 22, '#FFB21A', opacity=1)
          + halftone_field(60, 60, 1140, 1440, POP['pink'], step=30, rmax=11.5,
                           fn=lambda u, v: (math.hypot(u - .5, (v - .5) * 1.2) * 2.1) ** 1.6, angle=45)
          + '</g>')
    # the card, tilted, with a hard comic shadow
    s = .6
    cw, ch = 880 * s, 1258 * s
    cx, cy = 600, 830
    card = (f'<g transform="rotate(-7 {cx} {cy})">'
            f'<rect x="{cx - cw / 2 + 26}" y="{cy - ch / 2 + 26}" width="{cw}" height="{ch}" rx="{58 * s}" fill="{INK}"/>'
            f'<g transform="translate({cx - 600 * s} {cy - 750 * s}) scale({s})">{qcard}</g>'
            f'<rect x="{cx - cw / 2}" y="{cy - ch / 2}" width="{cw}" height="{ch}" rx="{58 * s}" fill="none" stroke="{INK}" stroke-width="14"/>'
            '</g>')
    # speech bubble
    bub = ('M610 92C850 92 1010 170 1010 270C1010 360 880 430 720 444L760 540L640 446C420 440 230 372 230 270'
           'C230 168 380 92 610 92Z')
    l1, _, _ = fit_text('bangers', 'DRAW FIVE,', 620, 262, 640, 118, tracking=.03)
    l2, _, _ = fit_text('bangers', 'DARLING.', 620, 380, 560, 118, tracking=.03)
    bubble = (f'<g transform="translate(14 14)"><path d="{bub}" fill="{INK}"/></g>'
              f'<path d="{bub}" fill="#fff" stroke="{INK}" stroke-width="14" stroke-linejoin="round"/>'
              + P(l1, INK) + P(l2, POP['red']))
    # SKIP! burst
    bx, by = 945, 1190
    b = burst(bx, by, 205, 132, n=13, seed=3)
    sk, _, _ = fit_text('bangers', 'SKIP!', bx, by + 42, 250, 120, tracking=.02)
    boom = (f'<g transform="translate(14 14)"><path d="{b}" fill="{INK}"/></g>'
            f'<path d="{b}" fill="{POP["red"]}" stroke="{INK}" stroke-width="12" stroke-linejoin="round"/>'
            f'<g transform="rotate(-10 {bx} {by})">' + outlined(sk, POP['yellow'], INK, 16) + '</g>')
    # caption box
    cap = 'M96 1262H640V1404H96Z'
    t1, _, _ = fit_text('bangers', 'THE LADY', 122, 1352, 500, 106, tracking=.04, anchor='start')
    t2, _, _ = fit_text('golos800', 'QUEEN OF SPADES · BRIDGE 125', 124, 1388, 500, 25, tracking=.16, anchor='start')
    caption = (f'<g transform="translate(12 12)"><path d="{cap}" fill="{INK}"/></g>'
               f'<path d="{cap}" fill="{CREAM}" stroke="{INK}" stroke-width="10"/>' + P(t1, INK) + P(t2, POP['pink']))
    frame = f'<path d="{panel}" fill="none" stroke="{INK}" stroke-width="18"/>'
    body = clip + bg + card + bubble + boom + caption + frame
    return svg(W, H, body, defs, 'The Lady — pop art Queen of Spades — Bridge 125')


# ================================================================================================ Bluff (risograph)
@design('bluff-riso')
def bluff_riso():
    W, H = 1200, 1500
    pink, blue, yel = RISO['pink'], RISO['blue'], RISO['yellow']
    defs = K.SPECKLE
    BACKGROUNDS['bluff-riso'] = RISO['paper']
    word, ww, size = fit_text('anton', 'BLUFF', 600, 760, 1060, 640, tracking=-.01)
    top = 760 - size * .74
    # yellow halftone sun behind the word
    sun = halftone_field(170, 120, 1030, 980, yel, step=22, rmax=10,
                         fn=lambda u, v: 1.05 - math.hypot(u - .5, v - .5) * 2.0, angle=15)
    ink_blue = (f'<g style="mix-blend-mode:multiply" filter="url(#speckle)">' + P(word, blue)
                + '</g>')
    ink_pink = (f'<g style="mix-blend-mode:multiply" filter="url(#speckle)" transform="translate(16 12)">'
                + P(word, pink, extra='opacity=".92"') + '</g>')
    # three cards: one honest, one face down, one ... questionable
    cards = ''
    cw, chh = 270, 388
    for i, (rank, s, rot, fill, back) in enumerate((('A', 'S', -16, '#FFF', None), ('?', 'H', 2, '#FFF', (pink, '#FFF')),
                                                    ('K', 'D', 18, '#FFF', None))):
        x = 600 - cw / 2 + (i - 1) * 230
        y = 850 + abs(i - 1) * 26
        cards += (f'<g style="mix-blend-mode:multiply">'
                  + flat_card(x, y, cw, chh, rank, s, rot, (x + cw / 2, y + chh), face='#FFFFFF', red=pink, black=blue,
                              edge=blue, sw=8, fontname='anton', back=back if back else None)
                  + '</g>')
    t1, _, _ = fit_text('golos800', 'I NEVER', 600, top - 78, 600, 64, tracking=.5)
    note, _, _ = fit_text('anton', '*EXCEPT AT 124.', 600, 1405, 760, 96, tracking=.06)
    small, _, _ = fit_text('golos800', 'RISO EDITION · BRIDGE 125', 600, 1460, 600, 26, tracking=.4)
    body = (sun + ink_pink + ink_blue + cards
            + f'<g style="mix-blend-mode:multiply" filter="url(#speckle)">' + P(t1, blue) + P(note, pink) + P(small, blue) + '</g>')
    return svg(W, H, f'<g style="isolation:isolate">{body}</g>', defs, 'Bluff — risograph — Bridge 125')


# ================================================================================================ 125 → 0 (synthwave)
@design('burn-synth')
def burn_synth():
    W, H = 1200, 1400
    mag, cyan, purple = '#FF2E88', '#2DE2FF', '#2A0E5C'
    defs = (lin('sunG', [(0, '#FFF27A'), (.45, '#FF9A1F'), (1, mag)])
            + lin('chrome', [(0, '#F4FCFF'), (.38, '#8FDCFF'), (.5, '#1E1350'), (.53, '#3A1E7A'), (.75, '#FF5FB0'), (1, '#FFE0F4')])
            + lin('fl1', [(0, mag), (.6, '#FF7A1A'), (1, '#FFD23F', 0)], y1=1, y2=0)
            + lin('fl2', [(0, '#FFD23F'), (1, '#FFFBE0', 0)], y1=1, y2=0)
            + lin('floor', [(0, purple, .0), (.08, purple, .95), (1, '#12052E', .95)])
            + '<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" result="b"/>'
              '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>')
    cx, cy, R = 600, 600, 340
    sun_mask = '<mask id="sunm"><rect width="1200" height="1400" fill="#fff"/>' + ''.join(
        f'<rect x="0" y="{cy + 40 + k * k * 9 + k * 26}" width="1200" height="{6 + k * 4}" fill="#000"/>' for k in range(8)) + '</mask>'
    sun = sun_mask + f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#sunG)" mask="url(#sunm)"/>'
    # perspective grid floor
    hz = 820
    grid = f'<rect x="80" y="{hz}" width="1040" height="330" fill="url(#floor)"/>'
    lines = ''
    for i in range(-14, 15):
        x2 = 600 + i * 150
        lines += f'<path d="M{600 + i * 18} {hz}L{x2} 1150" stroke="{mag}" stroke-width="3"/>'
    for k in range(1, 9):
        y = hz + (k / 8) ** 2.1 * 330
        lines += f'<path d="M80 {y:.1f}H1120" stroke="{mag}" stroke-width="{2 + k * .5:.1f}"/>'
    floor_clip = f'<clipPath id="fc"><path d="M80 {hz}H1120L1120 1150H80Z"/></clipPath>'
    floor = floor_clip + f'<g clip-path="url(#fc)">{grid}<g filter="url(#glow)" opacity=".95">{lines}</g></g>'
    floor += f'<path d="M80 {hz}H1120" stroke="{cyan}" stroke-width="5" filter="url(#glow)"/>'
    # chrome 125 with flames
    d125, w125, sz = fit_text('unb900', '125', 600, 830, 940, 330, tracking=-.04)
    top = 830 - sz * .74
    R2 = rng('synth')
    fl = ''
    for layer, (grad, hmin, hmax, wmin, wmax, n) in enumerate((('fl1', 170, 280, 70, 110, 11), ('fl2', 90, 160, 34, 56, 12))):
        for i in range(n):
            t = (i + R2.uniform(-.3, .3)) / (n - 1)
            x = 600 - w125 / 2 + 60 + (w125 - 120) * t
            env = .5 + .5 * math.sin(math.pi * min(max(t, 0), 1))
            fl += f'<path d="{flame(x, top + 50 + layer * 12, R2.uniform(wmin, wmax), R2.uniform(hmin, hmax) * env, R2.uniform(-.35, .35))}" fill="url(#{grad})"/>'
    skew = 'transform="translate(110 0) skewX(-8)"'
    num = (f'<g {skew}>' + P(d125, '#12052E', '#12052E', 30)
           + P(d125, 'url(#chrome)', '#FFFFFF', 4) + '</g>')
    # script overlay
    bi, _, _ = fit_text('pacifico', 'Burn it down', 600, 1000, 820, 150)
    script = (f'<g transform="rotate(-7 600 960)">' + P(bi, '#12052E', '#12052E', 22)
              + f'<g filter="url(#glow)">' + P(bi, mag) + '</g>' + P(bi, '#FFE6F2', extra='opacity=".35"') + '</g>')
    # → 0
    d0, _, _ = fit_text('unb900', '0', 600, 1300, 200, 150)
    zero = (f'<circle cx="600" cy="1245" r="92" fill="none" stroke="{cyan}" stroke-width="8" filter="url(#glow)"/>'
            + f'<g filter="url(#glow)">' + P(d0, 'none', cyan, 7) + '</g>')
    ar = f'<path d="M600 1070V1130M578 1110L600 1136L622 1110" stroke="{cyan}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>'
    lede, _, _ = fit_text('golos800', 'LAND ON EXACTLY 125', 600, 168, 700, 38, tracking=.42)
    tag, _, _ = fit_text('golos800', 'AND BURN BACK TO ZERO', 300, 1258, 330, 24, tracking=.3)
    tag2, _, _ = fit_text('golos800', 'BRIDGE 125', 900, 1258, 230, 24, tracking=.4)
    stars = ''.join(f'<path d="{sparkle(x, y, r)}" fill="{c}" filter="url(#glow)"/>' for x, y, r, c in
                    ((180, 300, 22, cyan), (1030, 250, 30, '#FFF27A'), (960, 420, 14, cyan), (230, 520, 14, mag), (1060, 640, 18, mag), (140, 720, 20, '#FFF27A')))
    body = (sun + floor + stars + fl + num + script + ar + zero + P(lede, cyan, extra='opacity=".95"')
            + P(tag, '#FFE6F2', extra='opacity=".8"') + P(tag2, '#FFE6F2', extra='opacity=".8"'))
    return svg(W, H, body, defs, '125 → 0 — synthwave — Bridge 125')


# ================================================================================================ Never the Durak (varsity)
def jester_cap(cx, cy, s, fills, edge, sw):
    """Three-pointed jester cap with bells, centred on (cx, cy), unit size s (~200 px wide at s=1)."""
    k = s
    band = f'M{cx - 90 * k} {cy + 40 * k}Q{cx} {cy + 70 * k} {cx + 90 * k} {cy + 40 * k}L{cx + 84 * k} {cy + 82 * k}Q{cx} {cy + 112 * k} {cx - 84 * k} {cy + 82 * k}Z'
    left = f'M{cx - 86 * k} {cy + 44 * k}C{cx - 120 * k} {cy - 10 * k} {cx - 150 * k} {cy - 50 * k} {cx - 190 * k} {cy - 40 * k}C{cx - 120 * k} {cy - 90 * k} {cx - 40 * k} {cy - 40 * k} {cx - 20 * k} {cy + 50 * k}Z'
    mid = f'M{cx - 30 * k} {cy + 52 * k}C{cx - 40 * k} {cy - 40 * k} {cx - 20 * k} {cy - 110 * k} {cx} {cy - 140 * k}C{cx + 20 * k} {cy - 110 * k} {cx + 40 * k} {cy - 40 * k} {cx + 30 * k} {cy + 52 * k}Z'
    right = (
        f'M{cx + 86 * k} {cy + 44 * k}C{cx + 120 * k} {cy - 10 * k} {cx + 150 * k} {cy - 50 * k} {cx + 190 * k} {cy - 40 * k}C{cx + 120 * k} {cy - 90 * k} {cx + 40 * k} {cy - 40 * k} {cx + 20 * k} {cy + 50 * k}Z')
    bells = ''.join(f'<circle cx="{x}" cy="{y}" r="{16 * k}" fill="{fills[3]}" stroke="{edge}" stroke-width="{sw}"/>'
                    for x, y in ((cx - 196 * k, cy - 40 * k), (cx, cy - 150 * k), (cx + 196 * k, cy - 40 * k)))
    return (P(left, fills[0], edge, sw) + P(right, fills[0], edge, sw) + P(mid, fills[1], edge, sw)
            + P(band, fills[2], edge, sw) + bells)


def laurel(cx, cy, r, fill, edge, sw, n=9, side=1, start=200, end=330):
    out = ''
    for i in range(n):
        a = math.radians(start + (end - start) * i / (n - 1))
        x, y = cx + side * r * math.cos(a), cy + r * math.sin(a)
        ang = math.degrees(a) + (90 if side > 0 else -90)
        ang = ang if side > 0 else 180 - math.degrees(a) - 90
        L, Wd = 74, 30
        leaf = f'M0 0C{L * .3} {-Wd} {L * .75} {-Wd * .8} {L} 0C{L * .75} {Wd * .8} {L * .3} {Wd} 0 0Z'
        out += f'<path transform="translate({x:.1f} {y:.1f}) rotate({ang + (-35 if side > 0 else 35):.1f})" d="{leaf}" fill="{fill}" stroke="{edge}" stroke-width="{sw}" stroke-linejoin="round"/>'
    return out


@design('never-durak')
def never_durak():
    W, H = 1200, 1300
    org, blu, cr, red = '#FF6A13', '#2147C9', '#FFF1D6', '#E8323C'
    cx, cy = 600, 560
    # wreath
    wr = ''
    for side in (1, -1):
        for i in range(10):
            a = math.radians(115 + i * 15) if side > 0 else math.radians(65 - i * 15)
            x, y = cx + 400 * math.cos(a), cy + 400 * math.sin(a)
            tang = math.degrees(a) + (90 if side > 0 else -90)
            L, Wd = 92, 34
            leaf = f'M0 0C{L * .3} {-Wd} {L * .75} {-Wd * .8} {L} 0C{L * .75} {Wd * .8} {L * .3} {Wd} 0 0Z'
            for off in (-38, 38):
                wr += (f'<path transform="translate({x:.1f} {y:.1f}) rotate({tang + off + (180 if side > 0 else 0):.1f})" d="{leaf}" '
                       f'fill="{cr}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>')
    arc = K.arched_text('unb700', 'NEVER THE', cx, cy + 40, 300, 70, tracking=.18, top=True)
    cap = jester_cap(cx, cy + 10, .95, (blu, org, cr, '#FFD23F'), INK, 7)
    no = (f'<circle cx="{cx}" cy="{cy}" r="150" fill="none" stroke="{red}" stroke-width="22"/>'
          f'<path d="M{cx - 106} {cy + 106}L{cx + 106} {cy - 106}" stroke="{red}" stroke-width="22" stroke-linecap="round"/>')
    word, _, sz = fit_text('unb900', 'DURAK', cx, 1000, 1080, 250, tracking=.0)
    big = (f'<g transform="translate(16 16)">' + P(word, blu, blu, 34) + '</g>' + P(word, INK, INK, 34) + P(word, cr, cr, 18)
           + P(word, org))
    rib = K.ribbon(cx, 1070, 760, 96, cr, blu, tail_fill=org, curve=-14, sw=7)
    rt, _, _ = fit_text('unb700', 'ATTACK · DEFEND · WIN', cx, 1132, 640, 42, tracking=.08)
    foot, _, _ = fit_text('golos800', 'EST. AT THE KITCHEN TABLE · BRIDGE 125', cx, 1262, 760, 26, tracking=.3)
    body = (wr + P(arc, cr, INK, 14) + P(arc, cr) + f'<circle cx="{cx}" cy="{cy}" r="150" fill="{cr}" opacity=".0"/>'
            + cap + no + big + rib + P(rt, blu) + P(foot, cr))
    return svg(W, H, body, '', 'Never the Durak — Bridge 125')


# ================================================================================================ Lielais (Zolīte, folk-modern)
def folk_band(x0, x1, y, h, cols, seed=0):
    """A woven folk band: diamonds + zigzag edges (generic geometric, not a national symbol)."""
    red, mus, cob, grn = cols
    out = f'<rect x="{x0}" y="{y}" width="{x1 - x0}" height="{h}" fill="{red}"/>'
    n = int((x1 - x0) / h)
    step = (x1 - x0) / n
    for i in range(n):
        cx = x0 + step * (i + .5)
        cy = y + h / 2
        r = h * .36
        out += f'<path d="M{cx} {cy - r}L{cx + r} {cy}L{cx} {cy + r}L{cx - r} {cy}Z" fill="{mus if i % 2 == 0 else cob}"/>'
        out += f'<path d="M{cx} {cy - r * .45}L{cx + r * .45} {cy}L{cx} {cy + r * .45}L{cx - r * .45} {cy}Z" fill="{FOLK["cream"]}"/>'
    zz_t = ''.join(f'L{x0 + step * (i + .5) / 1:.1f} {y - h * .16}L{x0 + step * (i + 1):.1f} {y}' for i in range(n))
    zz_b = ''.join(f'L{x0 + step * (i + .5):.1f} {y + h + h * .16}L{x0 + step * (i + 1):.1f} {y + h}' for i in range(n))
    out += f'<path d="M{x0} {y}{zz_t}Z" fill="{grn}"/><path d="M{x0} {y + h}{zz_b}Z" fill="{grn}"/>'
    return out


@design('lielais')
def lielais():
    W, H = 1200, 1500
    red, mus, cob, grn, cr, ink, rose = FOLK['red'], FOLK['mustard'], FOLK['cobalt'], FOLK['green'], FOLK['cream'], FOLK['ink'], FOLK['rose']
    BACKGROUNDS['lielais'] = cr
    cx, cy = 600, 650
    out = folk_band(80, 1120, 70, 74, (red, mus, cob, grn)) + folk_band(80, 1120, 1356, 74, (red, mus, cob, grn))
    # medallion: petals, triangles, inner ring
    petals = ''
    n = 16
    for i in range(n):
        a = i * 360 / n
        L = 330
        petal = f'M0 -120C38 -170 44 -250 0 -{L}C-44 -250 -38 -170 0 -120Z'
        petals += f'<path transform="translate({cx} {cy}) rotate({a})" d="{petal}" fill="{red if i % 2 == 0 else mus}" stroke="{ink}" stroke-width="5"/>'
        petals += f'<circle transform="translate({cx} {cy}) rotate({a})" cx="0" cy="-{L + 26}" r="12" fill="{cob if i % 2 == 0 else grn}"/>'
    tri = ''
    for i in range(24):
        a = math.radians(i * 15)
        a2 = math.radians(i * 15 + 7.5)
        a3 = math.radians(i * 15 + 15)
        r1, r2 = 150, 196
        tri += (f'<path d="M{cx + r1 * math.cos(a):.1f} {cy + r1 * math.sin(a):.1f}L{cx + r2 * math.cos(a2):.1f} {cy + r2 * math.sin(a2):.1f}'
                f'L{cx + r1 * math.cos(a3):.1f} {cy + r1 * math.sin(a3):.1f}Z" fill="{cob}"/>')
    inner = (f'<circle cx="{cx}" cy="{cy}" r="200" fill="{cr}" stroke="{ink}" stroke-width="6"/>' + tri
             + f'<circle cx="{cx}" cy="{cy}" r="148" fill="{grn}" stroke="{ink}" stroke-width="6"/>'
             + f'<circle cx="{cx}" cy="{cy}" r="126" fill="none" stroke="{cr}" stroke-width="4" stroke-dasharray="3 12" stroke-linecap="round"/>')
    # the four queens (trump order ♣ ♠ ♥ ♦) as suits in a cross + a little crown
    qs = ''.join(suit_el(s, cx + dx, cy + dy, 74, c, cr, 6) for s, dx, dy, c in
                 (('C', 0, -62, ink), ('S', -62, 4, ink), ('H', 62, 4, red), ('D', 0, 70, red)))
    crown = (f'<path d="M{cx - 30} {cy + 18}L{cx - 34} {cy - 12}L{cx - 14} {cy}L{cx} {cy - 22}L{cx + 14} {cy}L{cx + 34} {cy - 12}L{cx + 30} {cy + 18}Z" '
             f'fill="{mus}" stroke="{ink}" stroke-width="4" stroke-linejoin="round"/>')
    # little side flowers
    def flower(x, y, s, c1, c2):
        f = ''.join(f'<ellipse transform="translate({x} {y}) rotate({a})" cx="0" cy="{-18 * s}" rx="{10 * s}" ry="{18 * s}" fill="{c1}" stroke="{ink}" stroke-width="3"/>' for a in range(0, 360, 60))
        return f + f'<circle cx="{x}" cy="{y}" r="{9 * s}" fill="{c2}" stroke="{ink}" stroke-width="3"/>'
    flowers = ''.join(flower(x, y, s, c1, c2) for x, y, s, c1, c2 in
                      ((170, 300, 1.3, rose, mus), (1030, 300, 1.3, rose, mus), (180, 1000, 1.1, mus, red), (1020, 1000, 1.1, mus, red),
                       (140, 650, .9, cob, mus), (1060, 650, .9, cob, mus)))
    vines = (f'<path d="M170 340C150 460 200 560 140 650C90 740 200 880 180 960" fill="none" stroke="{grn}" stroke-width="7" stroke-linecap="round"/>'
             f'<path d="M1030 340C1050 460 1000 560 1060 650C1110 740 1000 880 1020 960" fill="none" stroke="{grn}" stroke-width="7" stroke-linecap="round"/>')
    title, _, _ = fit_text('abril', 'LIELAIS', cx, 1200, 900, 210, tracking=.04)
    sub, _, _ = fit_text('golos800c', 'ZOLĪTE · AR VISĀM DĀMĀM · BRIDGE 125', cx, 1278, 900, 30, tracking=.22)
    body = (out + vines + flowers + petals + inner + qs + crown
            + f'<g transform="translate(8 8)">{P(title, ink)}</g>' + P(title, red) + P(sub, cob))
    return svg(W, H, body, '', 'Lielais — Zolīte folk — Bridge 125')


# ================================================================================================ Lucky Jack (tattoo flash)
def rose(x, y, r, red, leaf, ink, sw=6, rot=0):
    petals = (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{red}" stroke="{ink}" stroke-width="{sw}"/>'
              f'<path d="M{x - r * .55} {y - r * .1}C{x - r * .5} {y - r * .7} {x + r * .55} {y - r * .7} {x + r * .55} {y - r * .05}" fill="none" stroke="{ink}" stroke-width="{sw * .8}" stroke-linecap="round"/>'
              f'<path d="M{x - r * .3} {y + r * .05}C{x - r * .25} {y - r * .4} {x + r * .3} {y - r * .4} {x + r * .3} {y}C{x + r * .3} {y + r * .3} {x - r * .1} {y + r * .3} {x - r * .1} {y + r * .05}" fill="none" stroke="{ink}" stroke-width="{sw * .8}" stroke-linecap="round"/>'
              f'<path d="M{x - r * .85} {y + r * .3}C{x - r * .4} {y + r * .85} {x + r * .4} {y + r * .85} {x + r * .85} {y + r * .3}" fill="none" stroke="{ink}" stroke-width="{sw * .8}" stroke-linecap="round"/>'
              f'<path d="M{x - r * .5} {y - r * .55}C{x - r * .2} {y - r * .75} {x - r * .1} {y - r * .7} {x} {y - r * .55}" fill="none" stroke="#fff" stroke-width="{sw * .9}" stroke-linecap="round" opacity=".7"/>')
    leaves = ''
    for a in (-35, 35, 160):
        L = r * 1.35
        leaves += (f'<path transform="translate({x} {y}) rotate({a + rot})" d="M{r * .7} 0C{r * .9} {-r * .5} {L} {-r * .45} {L + r * .4} 0C{L} {r * .45} {r * .9} {r * .5} {r * .7} 0Z" '
                   f'fill="{leaf}" stroke="{ink}" stroke-width="{sw}" stroke-linejoin="round"/>')
    return leaves + petals


@design('lucky-jack')
def lucky_jack():
    W, H = 1200, 1400
    red, yel, teal, cr = '#D7263D', '#F6C343', '#1B998B', '#FFF1D6'
    cx, cy = 600, 620
    # dashed glory rays
    glory = ''.join(
        f'<path d="M{cx + 330 * math.cos(math.radians(a)):.1f} {cy + 330 * math.sin(math.radians(a)):.1f}L{cx + 520 * math.cos(math.radians(a)):.1f} {cy + 520 * math.sin(math.radians(a)):.1f}" '
        f'stroke="{INK}" stroke-width="7" stroke-dasharray="26 16" stroke-linecap="round"/>' for a in range(-180, 1, 15))
    # horseshoe (opening up)
    ro, ri = 400, 290
    shoe = (f'M{cx - ro} {cy - 120}C{cx - ro} {cy + 280} {cx - 200} {cy + ro} {cx} {cy + ro}C{cx + 200} {cy + ro} {cx + ro} {cy + 280} {cx + ro} {cy - 120}'
            f'L{cx + ro - 26} {cy - 175}L{cx + ri} {cy - 175}L{cx + ri} {cy - 120}C{cx + ri} {cy + 200} {cx + 150} {cy + ri} {cx} {cy + ri}'
            f'C{cx - 150} {cy + ri} {cx - ri} {cy + 200} {cx - ri} {cy - 120}L{cx - ri} {cy - 175}L{cx - ro + 26} {cy - 175}Z')
    nails = ''.join(f'<rect x="{cx + (ro + ri) / 2 * math.cos(math.radians(a)) - 9:.1f}" y="{cy + (ro + ri) / 2 * math.sin(math.radians(a)) - 14:.1f}" width="18" height="28" rx="5" fill="{INK}" transform="rotate({a + 90} {cx + (ro + ri) / 2 * math.cos(math.radians(a)):.1f} {cy + (ro + ri) / 2 * math.sin(math.radians(a)):.1f})"/>'
                    for a in (-10, 20, 50, 80, 100, 130, 160, 190))
    horseshoe = (f'<g transform="translate(12 12)">' + P(shoe, INK) + '</g>' + P(shoe, yel, INK, 12)
                 + f'<path d="{shoe}" fill="#fff" opacity=".18" transform="translate(-6 -6) scale(1)" clip-path="none"/>' + nails)
    # the card
    cw, chh = 420, 600
    x, y = cx - cw / 2, cy - chh / 2 - 30
    card = (f'<g transform="rotate(-6 {cx} {cy})">'
            f'<rect x="{x + 16}" y="{y + 16}" width="{cw}" height="{chh}" rx="34" fill="{INK}"/>'
            f'<rect x="{x}" y="{y}" width="{cw}" height="{chh}" rx="34" fill="{cr}" stroke="{INK}" stroke-width="12"/>'
            f'<rect x="{x + 34}" y="{y + 34}" width="{cw - 68}" height="{chh - 68}" rx="18" fill="none" stroke="{red}" stroke-width="6"/>')
    jd, _, _ = fit_text('abril', 'J', cx, cy + 120, 300, 400)
    card += P(jd, INK, INK, 18) + P(jd, red) + suit_el('H', cx, cy - 175, 90, red, INK, 7)
    for (px, py, rr) in ((x + 64, y + 82, 0), (x + cw - 64, y + chh - 82, 180)):
        cdd, _, _ = fit_text('abril', 'J', px, py + 18, 80, 64)
        card += f'<g transform="rotate({rr} {px} {py})">' + P(cdd, red) + suit_el('H', px, py + 50, 40, red) + '</g>'
    card += '</g>'
    roses = rose(cx - 300, cy + 300, 78, red, teal, INK, rot=10) + rose(cx + 300, cy + 300, 78, red, teal, INK, rot=-10)
    stars = ''.join(P(star(sx, sy, r, r * .45), yel, INK, 6) for sx, sy, r in ((170, 200, 46), (1030, 190, 40), (120, 640, 30), (1080, 620, 34), (300, 120, 24), (900, 110, 26)))
    rib = K.ribbon(cx, 1020, 860, 150, cr, red, tail_fill=red, curve=-30, sw=10)
    rt, _, _ = fit_text('shrikhand', 'Lucky Jack', cx, 1135, 760, 120)
    foot, _, _ = fit_text('golos800', 'BRIDGE 125 · TATTOO FLASH', cx, 1330, 600, 30, tracking=.36)
    body = (glory + horseshoe + card + roses + stars + rib + P(rt, red, INK, 10) + P(rt, red) + P(foot, INK, '#fff', 10) + P(foot, INK))
    return svg(W, H, body, '', 'Lucky Jack — tattoo flash — Bridge 125')


# ================================================================================================ Seven? Draw two. (Swiss)
def seven_layout(W, H, wrap=False):
    red, blue, yel = '#EE2B36', '#2346D8', '#FFD23F'
    out = ''
    if not wrap:
        sev, sw, ssz = fit_text('anton', '7', 70, 1080, 760, 1260, anchor='start')
        out += P(sev, red)
        q, _, _ = fit_text('anton', '?', 640, 640, 320, 560, anchor='start')
        out += P(q, blue)
        cards = (flat_card(820, 120, 200, 286, '7', 'H', 12, None, face='#FFFFFF', red=red, black=INK, edge=INK, sw=7, fontname='anton')
                 + flat_card(900, 200, 200, 286, '7', 'C', 24, None, face='#FFFFFF', red=red, black=INK, edge=INK, sw=7, fontname='anton'))
        out += cards
        d1, _, _ = fit_text('anton', 'SEVEN?', 640, 870, 480, 200, anchor='start')
        d2, _, _ = fit_text('anton', 'DRAW', 640, 1100, 480, 230, anchor='start')
        d3, _, _ = fit_text('anton', 'TWO.', 640, 1330, 480, 230, anchor='start')
        out += P(d1, INK) + P(d2, INK) + P(d3, red)
        n1, _, _ = fit_text('golos800', 'TWO SEVENS. OBVIOUSLY.', 80, 1260, 500, 30, tracking=.2, anchor='start')
        n2, _, _ = fit_text('golos800', 'HOUSE RULES · BRIDGE 125', 80, 1310, 500, 30, tracking=.2, anchor='start')
        out += P(n1, INK) + P(n2, blue)
        out += f'<rect x="80" y="1180" width="120" height="22" fill="{yel}"/>'
        out += ''.join(f'<circle cx="{660 + i * 42}" cy="1390" r="11" fill="{[red, blue, yel, INK][i % 4]}"/>' for i in range(11))
    else:
        # 8.5 × 3.5 in mug wrap: the 7 left of the handle-side seam, text right; repeat on the back
        for ox in (0, W / 2):
            sev, _, _ = fit_text('anton', '7', ox + 90, 930, 420, 980, anchor='start')
            q, _, _ = fit_text('anton', '?', ox + 470, 600, 200, 380, anchor='start')
            d1, _, _ = fit_text('anton', 'SEVEN?', ox + 690, 360, 470, 230, anchor='start')
            d2, _, _ = fit_text('anton', 'DRAW TWO.', ox + 690, 640, 500, 230, anchor='start')
            n1, _, _ = fit_text('golos800', 'TWO SEVENS. OBVIOUSLY.', ox + 694, 760, 470, 34, tracking=.2, anchor='start')
            out += P(sev, red) + P(q, blue) + P(d1, INK) + P(d2, red) + P(n1, blue)
            out += f'<rect x="{ox + 694}" y="820" width="140" height="24" fill="{yel}"/>'
            out += ''.join(f'<circle cx="{ox + 714 + i * 44}" cy="920" r="12" fill="{[red, blue, yel, INK][i % 4]}"/>' for i in range(10))
    return out


@design('seven-two')
def seven_two():
    BACKGROUNDS['seven-two'] = '#F7F0E1'
    return svg(1200, 1500, seven_layout(1200, 1500), '', 'Seven? Draw two. — Bridge 125')


# ================================================================================================ Think in nines (Sudoku)
def sudoku_solution(seed=9):
    base = [[(i * 3 + i // 3 + j) % 9 + 1 for j in range(9)] for i in range(9)]
    R = rng(f'sudoku{seed}')
    digits = list(range(1, 10))
    R.shuffle(digits)
    return [[digits[v - 1] for v in row] for row in base]


@design('sudoku-nines')
def sudoku_nines():
    W, H = 1200, 1500
    BACKGROUNDS['sudoku-nines'] = '#F7F0E1'
    cols = ['#EE2B36', '#FFD23F', '#2346D8', '#19B37A', '#FF7A9A', INK]
    sol = sudoku_solution()
    x0, y0, c = 114, 110, 108
    out = ''
    R = rng('nines')
    painted = {}
    # Bauhaus blocks: a diagonal of 3x3 boxes and a few bars
    for (bi, bj, col) in ((0, 0, 0), (1, 1, 1), (2, 2, 2)):
        for i in range(3):
            for j in range(3):
                if (i + j) % 2 == 0:
                    painted[(bi * 3 + i, bj * 3 + j)] = cols[col]
    for (i, j, col) in ((0, 6, 3), (0, 7, 3), (0, 8, 3), (8, 0, 4), (7, 0, 4), (6, 0, 4), (4, 7, 5), (3, 1, 5), (5, 5, 0)):
        painted[(i, j)] = cols[col]
    for (i, j), col in painted.items():
        out += f'<rect x="{x0 + j * c}" y="{y0 + i * c}" width="{c}" height="{c}" fill="{col}"/>'
    # circles + quarter circles in some cells
    for (i, j, col) in ((1, 4, 2), (2, 7, 0), (6, 3, 1), (7, 6, 2), (4, 4, 0)):
        out += f'<circle cx="{x0 + j * c + c / 2}" cy="{y0 + i * c + c / 2}" r="{c * .38}" fill="{cols[col]}"/>'
    givens = set()
    for i in range(9):
        for j in range(9):
            if R.random() < .34:
                givens.add((i, j))
    g = K.font('golos800')
    for (i, j) in givens:
        d, _ = g.text(str(sol[i][j]), x0 + j * c + c / 2, y0 + i * c + c * .68, c * .5, anchor='middle')
        fill = '#F7F0E1' if painted.get((i, j)) in (cols[0], cols[2], cols[5], cols[3]) else INK
        out += P(d, fill)
    grid = ''
    for k in range(10):
        wdt = 8 if k % 3 == 0 else 2.5
        grid += f'<path d="M{x0 + k * c} {y0 - (4 if k % 3 == 0 else 0)}V{y0 + 9 * c + (4 if k % 3 == 0 else 0)}" stroke="{INK}" stroke-width="{wdt}"/>'
        grid += f'<path d="M{x0 - (4 if k % 3 == 0 else 0)} {y0 + k * c}H{x0 + 9 * c + (4 if k % 3 == 0 else 0)}" stroke="{INK}" stroke-width="{wdt}"/>'
    t, _, _ = fit_text('anton', 'THINK IN NINES.', 600, 1300, 972, 190, tracking=.01)
    s, _, _ = fit_text('golos800', 'SUDOKU · 9 × 9 · BRIDGE 125 GAMES', 600, 1380, 972, 30, tracking=.3)
    return svg(W, H, out + grid + P(t, INK) + P(s, cols[0]), '', 'Think in nines — Sudoku — Bridge 125')


# ================================================================================================ Patience (Solitaire)
@design('patience')
def patience():
    W, H = 1200, 1500
    BACKGROUNDS['patience'] = '#F3ECE0'
    pal = {'S': '#1F2A5C', 'H': '#F05A4F', 'D': '#F2B32A', 'C': '#1E9E8A'}
    out = ''
    # foundations: four aces on a rail
    for i, s in enumerate('SHDC'):
        x = 120 + i * 250
        out += (f'<rect x="{x}" y="110" width="210" height="300" rx="18" fill="{pal[s]}"/>'
                + suit_el(s, x + 105, 250, 110, '#FFF8EC'))
        d, _ = K.font('abril').text('A', x + 34, 170, 52, anchor='middle')
        out += P(d, '#FFF8EC')
    # tableau: cascades (only the top strip of each card shows)
    ranks = ['K', 'Q', 'J', '10', '9', '8', '7', '6']
    for col in range(5):
        x = 110 + col * 204
        n = 3 + col % 3 + (1 if col == 2 else 0)
        for k in range(n):
            y = 480 + k * 64
            s = 'SHDC'[(col + k) % 4]
            last = k == n - 1
            hh = 250 if last else 64 + 18
            out += f'<rect x="{x}" y="{y}" width="180" height="{hh}" rx="14" fill="{pal[s] if (col + k) % 2 else "#FFF8EC"}" stroke="{INK}" stroke-width="4"/>'
            fg = '#FFF8EC' if (col + k) % 2 else pal[s]
            d, _ = K.font('abril').text(ranks[(k + col) % len(ranks)], x + 34, y + 46, 38, anchor='middle')
            out += P(d, fg) + suit_el(s, x + 150, y + 30, 30, fg)
            if last:
                out += suit_el(s, x + 90, y + 160, 80, fg)
    t, _, _ = fit_text('abril', 'patience.', 600, 1290, 980, 230)
    s2, _, _ = fit_text('golos800', 'SOLITAIRE · ONE CARD AT A TIME · BRIDGE 125', 600, 1380, 980, 28, tracking=.26)
    return svg(W, H, out + P(t, INK) + P(s2, pal['H']), '', 'Patience — Solitaire — Bridge 125')


# ================================================================================================ Four suits (pop tiles) + coasters
SUIT_TILES = {'S': ('#FF3E8A', '#FFD23F', '#C21F66'), 'H': ('#19B5F0', '#EE2B36', '#0B7DB0'),
              'D': ('#FFD23F', '#2346D8', '#E0A800'), 'C': ('#FF7A1A', '#19B37A', '#D35400')}


def suit_tile(s, x, y, size, rx=40, sw=12):
    bg, fg, dot = SUIT_TILES[s]
    cid = f'tile{s}{int(x)}{int(y)}'
    out = (f'<clipPath id="{cid}"><rect x="{x}" y="{y}" width="{size}" height="{size}" rx="{rx}"/></clipPath>'
           f'<rect x="{x}" y="{y}" width="{size}" height="{size}" rx="{rx}" fill="{bg}"/>'
           f'<g clip-path="url(#{cid})">' + halftone_field(x, y, x + size, y + size, dot, step=size / 18, rmax=size / 46,
                                                         fn=lambda u, v: (u + v) * .62, angle=45) + '</g>')
    cx, cy = x + size / 2, y + size / 2 + size * .02
    out += f'<g transform="translate({size * .035} {size * .035})">' + suit_el(s, cx, cy, size * .66, INK, INK, sw) + '</g>'
    out += suit_el(s, cx, cy, size * .66, fg, INK, sw)
    out += f'<path d="{sparkle(cx - size * .14, cy - size * .16, size * .05)}" fill="#fff" opacity=".9"/>'
    out += f'<rect x="{x}" y="{y}" width="{size}" height="{size}" rx="{rx}" fill="none" stroke="{INK}" stroke-width="{sw}"/>'
    return out


@design('four-suits')
def four_suits():
    W = 1200
    out = ''
    for i, s in enumerate('SHDC'):
        x = 40 + (i % 2) * 580
        y = 40 + (i // 2) * 580
        out += suit_tile(s, x, y, 540)
    return svg(W, W, out, '', 'Four Suits — pop tiles — Bridge 125')


def _coaster(s):
    def fn():
        BACKGROUNDS[f'coaster-{s}'] = SUIT_TILES[s][0]
        return svg(1200, 1200, suit_tile(s, 0, 0, 1200, rx=0, sw=0), '', f'Four Suits coaster {s} — Bridge 125')
    return fn


for _s in 'SHDC':
    design(f'coaster-{_s}')(_coaster(_s))


# ================================================================================================ 125 cap (embroidery)
@design('cap-125')
def cap_125():
    """Embroidery-safe: 3 thread colours, no gradients, no hairlines (min. stroke ~1.5 mm at 5.5 cm wide)."""
    gold, red = '#E2B547', '#E8323C'
    d, w, sz = fit_text('unb900', '125', 600, 760, 1000, 520, tracking=-.03)
    fl = ''
    for x, h, sway in ((420, 300, -.2), (600, 380, .1), (780, 290, .25)):
        fl += P(flame(x, 400, 170, h, sway), red)
    return svg(1200, 900, fl + P(d, gold), '', '125 — embroidered cap mark — Bridge 125')


# ================================================================================================ The table (play mats)
def playmat(theme):
    W, H = 2400, 1400
    if theme == 'felt':
        bg = rad('mat', [(0, '#1C7A5E'), (.65, '#0E4D3B'), (1, '#062A21')], cy=.5, r=.8)
        line, acc, txt = '#E2BD62', '#F3DE9C', '#F4EEDF'
        suits = {'S': '#F4EEDF', 'H': '#E8576A', 'D': '#E8576A', 'C': '#F4EEDF'}
    else:
        bg = rad('mat', [(0, '#3B1580'), (.65, '#1D0A45'), (1, '#0C0322')], cy=.5, r=.8)
        line, acc, txt = '#FF3E8A', '#2DE2FF', '#FFE6F2'
        suits = {'S': '#2DE2FF', 'H': '#FF3E8A', 'D': '#FFD23F', 'C': '#19E39A'}
    defs = bg + ('<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/>'
                 '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' if theme != 'felt' else '')
    glow = ' filter="url(#glow)"' if theme != 'felt' else ''
    out = f'<rect width="{W}" height="{H}" fill="url(#mat)"/>'
    out += f'<rect width="{W}" height="{H}" filter="url(#fnoise)" opacity=".18"/>'
    defs += ('<filter id="fnoise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="4"/>'
             '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 0"/></filter>')
    out += f'<rect x="60" y="60" width="{W - 120}" height="{H - 120}" rx="70" fill="none" stroke="{line}" stroke-width="6"{glow}/>'
    out += f'<rect x="84" y="84" width="{W - 168}" height="{H - 168}" rx="54" fill="none" stroke="{line}" stroke-width="2" stroke-dasharray="4 14" stroke-linecap="round"/>'
    cx, cy = W / 2, H / 2
    # centre: draw pile + discard zones
    out += f'<ellipse cx="{cx}" cy="{cy}" rx="500" ry="350" fill="none" stroke="{line}" stroke-width="5"{glow}/>'
    out += f'<ellipse cx="{cx}" cy="{cy}" rx="470" ry="322" fill="none" stroke="{line}" stroke-width="2" opacity=".6"/>'
    for dx, lab in ((-150, 'DRAW'), (150, 'PLAY')):
        out += f'<rect x="{cx + dx - 95}" y="{cy - 135}" width="190" height="270" rx="20" fill="none" stroke="{acc}" stroke-width="4" stroke-dasharray="14 10"{glow}/>'
        d, _ = K.font('golos800').text(lab, cx + dx, cy + 175, 30, tracking=.4, anchor='middle')
        out += P(d, txt, extra='opacity=".85"')
    arc = K.font('golos800').text_arc('BRIDGE 125 · THE SALON', cx, cy, 262, 30, tracking=.3, top=True)
    out += P(arc, acc)
    # four seats with suits
    for (sx, sy, s) in ((cx, 230, 'S'), (W - 300, cy, 'H'), (cx, H - 230, 'D'), (300, cy, 'C')):
        out += f'<circle cx="{sx}" cy="{sy}" r="96" fill="none" stroke="{line}" stroke-width="4"{glow}/>'
        out += suit_el(s, sx, sy, 100, suits[s])
    # corner scoreboard ticks: 125 marks
    for (x, y, a) in ((200, 200, 0), (W - 200, 200, 90), (W - 200, H - 200, 180), (200, H - 200, 270)):
        d, _ = K.font('unb900').text('125', 0, 0, 60, anchor='middle')
        out += f'<g transform="translate({x} {y}) rotate({a - 45})"><path d="{d}" fill="{acc}" transform="translate(0 22)"/></g>'
    return svg(W, H, out, defs, f'The Table — play mat ({theme}) — Bridge 125')


@design('mat-felt')
def mat_felt():
    return playmat('felt')


@design('mat-night')
def mat_night():
    return playmat('night')


for _n in ('mat-felt', 'mat-night', 'coaster-S', 'coaster-H', 'coaster-D', 'coaster-C'):
    BACKGROUNDS.setdefault(_n, '#000000')
BACKGROUNDS.update({'mat-felt': '#0E4D3B', 'mat-night': '#1D0A45'})
del GOLD, GOLD_HI, GOLD_LO
