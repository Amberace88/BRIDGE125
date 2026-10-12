"""Bridge 125 — the real 36-card deck (6 … A in four suits) + card back + tuck-box panels.

Print spec: poker size 2.5 × 3.5 in (63.5 × 88.9 mm) at 300 dpi = 750 × 1050 px trim,
with 1/8 in (37.5 px) bleed on every side → 825 × 1125 px canvas. Keep text inside the 36 px safe zone.
"""
from __future__ import annotations

import math
import os

from designs import GOLDDEF, both, logo_mark, queen_card, wordmark
from svgkit import (FELT, FELT2, FELT_D, GOLD, GOLD_HI, GOLD_LO, INK, IVORY, ROOT, RUBY, RUBY_D, SUITS, font, lin, rad,
                    rot180, spade, suit, svg, write)

OUT = os.path.join(ROOT, 'public', 'merch', 'designs', 'deck')
B = 37.5                     # bleed
TW, TH = 750, 1050           # trim
W, H = TW + 2 * B, TH + 2 * B
CX, CY = W / 2, H / 2
RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
SUIT_ORDER = 'SHDC'
SUIT_NAMES = {'S': 'spades', 'H': 'hearts', 'D': 'diamonds', 'C': 'clubs'}

FACE_DEFS = (GOLDDEF
             + lin('paper', [(0, '#FFFBF1'), (1, '#F1E8D3')])
             + rad('feltR', [(0, FELT2), (.75, FELT), (1, FELT_D)], cy=.6, r=.75)
             + rad('rubyR', [(0, '#D8455A'), (.7, RUBY), (1, RUBY_D)], cy=.6, r=.75))


def colour(s):
    return RUBY if s in 'HD' else INK


def index(rank, s):
    """Top-left index (rank over suit) in canvas coords; mirrored copy added by caller."""
    c = font('corm700')
    size = 112 if rank != '10' else 100
    sx = 1 if rank != '10' else .82
    d, _ = c.text(rank, B + 72, B + 128, size, anchor='middle', sx=sx)
    return f'<path d="{d}" fill="{colour(s)}"/>' + suit(s, B + 72, B + 178, 54, colour(s))


def corners(rank, s):
    i = index(rank, s)
    return i + rot180(i, CX, CY)


def base():
    return (f'<rect width="{W}" height="{H}" fill="url(#paper)"/>'
            f'<rect x="{B + 22}" y="{B + 22}" width="{TW - 44}" height="{TH - 44}" rx="26" fill="none" stroke="{GOLD}" stroke-width="2" opacity=".55"/>')


PIP_ROWS = {
    '6': [('L', 0), ('R', 0), ('L', .5), ('R', .5), ('L', 1), ('R', 1)],
    '7': [('L', 0), ('R', 0), ('C', .25), ('L', .5), ('R', .5), ('L', 1), ('R', 1)],
    '8': [('L', 0), ('R', 0), ('C', .25), ('L', .5), ('R', .5), ('C', .75), ('L', 1), ('R', 1)],
    '9': [('L', 0), ('R', 0), ('L', 1 / 3), ('R', 1 / 3), ('C', .5), ('L', 2 / 3), ('R', 2 / 3), ('L', 1), ('R', 1)],
    '10': [('L', 0), ('R', 0), ('C', 1 / 6), ('L', 1 / 3), ('R', 1 / 3), ('L', 2 / 3), ('R', 2 / 3), ('C', 5 / 6), ('L', 1), ('R', 1)],
}


def pip_card(rank, s):
    xs = {'L': CX - 150, 'C': CX, 'R': CX + 150}
    y0, y1 = CY - 330, CY + 330
    pips = ''
    for col, t in PIP_ROWS[rank]:
        x, y = xs[col], y0 + (y1 - y0) * t
        p = suit(s, x, y, 118, colour(s))
        pips += rot180(p, x, y) if y > CY + 1 else p
    return base() + pips + corners(rank, s)


def ace(s):
    c = colour(s)
    rings = (f'<circle cx="{CX}" cy="{CY}" r="250" fill="none" stroke="url(#g)" stroke-width="4"/>'
             f'<circle cx="{CX}" cy="{CY}" r="232" fill="none" stroke="{GOLD}" stroke-width="1.5" stroke-dasharray="2 8"/>')
    rays = ''.join(
        f'<path d="M{CX + 262 * math.cos(math.radians(a)):.1f} {CY + 262 * math.sin(math.radians(a)):.1f}L{CX + (300 if a % 30 == 0 else 284) * math.cos(math.radians(a)):.1f} {CY + (300 if a % 30 == 0 else 284) * math.sin(math.radians(a)):.1f}" stroke="{GOLD}" stroke-width="3" stroke-linecap="round"/>'
        for a in range(0, 360, 10))
    if s == 'S':
        g6 = font('golos600')
        word = wordmark(CX, CY + 380, 40, ivory=INK)
        sub, _ = g6.text('36 CARDS · 6 TO ACE', CX, CY - 342, 20, tracking=.4, anchor='middle')
        mid = (f'<circle cx="{CX}" cy="{CY}" r="226" fill="url(#feltR)"/>'
               + suit('S', CX, CY + 6, 290, 'url(#g)', f'stroke="{INK}" stroke-width="2"')
               + word + f'<path d="{sub}" fill="{INK}" opacity=".6"/>')
    else:
        mid = suit(s, CX, CY + 4, 270, c)
    return base() + rays + rings + mid + corners('A', s)


EMBLEM = {
    # crown, tiara, plumed cap — all drawn in a 120 x 70 box centred at 0,0
    'K': 'M-60 34L-52 -22L-24 6L0 -34L24 6L52 -22L60 34Z',
    'Q': 'M-56 34C-44 4 -24 -8 0 -8C24 -8 44 4 56 34ZM-10 -12L0 -36L10 -12Z',
    'J': 'M-58 34C-58 0 -30 -20 4 -20C26 -20 40 -12 50 -2C60 -18 62 -34 56 -44C74 -30 74 0 58 34Z',
}


def court(rank, s):
    if rank == 'Q' and s == 'S':
        return queen_face()
    c = colour(s)
    fill = 'url(#rubyR)' if s in 'HD' else 'url(#feltR)'
    ax0, ax1, ay = CX - 175, CX + 175, CY - 330
    arch_d = f'M{ax0} {CY}V{ay + 175}A175 175 0 0 1 {ax1} {ay + 175}V{CY}Z'
    clip = f'<clipPath id="ac"><path d="{arch_d}"/></clipPath>'
    acx, acy = CX, ay + 220
    rays = ''.join(
        f'<path d="M{acx} {acy}L{acx + 700 * math.sin(math.radians(a - 3)):.1f} {acy - 700 * math.cos(math.radians(a - 3)):.1f}'
        f'L{acx + 700 * math.sin(math.radians(a + 3)):.1f} {acy - 700 * math.cos(math.radians(a + 3)):.1f}Z" fill="{GOLD}" opacity=".18"/>'
        for a in range(-90, 271, 15))
    cm = font('corm700')
    mono, _ = cm.text(rank, CX, CY - 48, 205, anchor='middle')
    emb = f'<path transform="translate({CX} {ay + 76}) scale(1.05)" d="{EMBLEM[rank]}" fill="url(#g)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    jewels = ''.join(f'<circle cx="{CX + dx}" cy="{ay + 106}" r="5" fill="{IVORY}"/>' for dx in (-36, -18, 0, 18, 36))
    pip = both(suit(s, CX + 120, CY - 60, 44, IVORY, 'opacity=".9"'), CX)
    top = (f'<path d="{arch_d}" fill="{fill}"/>'
           f'<g clip-path="url(#ac)">{rays}</g>'
           + emb + jewels + pip
           + f'<path d="{mono}" fill="{IVORY}" stroke="{GOLD_LO}" stroke-width="2"/>'
           + f'<path d="M{ax0} {CY}V{ay + 175}A175 175 0 0 1 {ax1} {ay + 175}V{CY}" fill="none" stroke="url(#g)" stroke-width="6"/>')
    band = (f'<path d="M{B + 60} {CY}H{W - B - 60}" stroke="url(#g)" stroke-width="4"/>'
            f'<path d="M{CX} {CY - 46}L{CX + 46} {CY}L{CX} {CY + 46}L{CX - 46} {CY}Z" fill="{IVORY}" stroke="url(#g)" stroke-width="5"/>'
            + suit(s, CX, CY + 1, 40, c))
    frame = f'<rect x="{CX - 205}" y="{CY - 362}" width="410" height="724" rx="26" fill="none" stroke="{GOLD}" stroke-width="3"/>'
    return clip + base() + frame + top + rot180(top, CX, CY) + band + corners(rank, s)


def queen_face():
    """Q♠ — the full art-deco portrait from the hero design, on an ink card."""
    defs, card = queen_card()
    defs = defs.replace(GOLDDEF, '')
    k = (TH + 6) / 1258
    tx = CX - 600 * k
    ty = CY - 750 * k
    return (f'<defs>{defs}</defs><rect width="{W}" height="{H}" fill="#121318"/>'
            f'<g transform="translate({tx:.2f} {ty:.2f}) scale({k:.4f})">{card}</g>')


def back():
    lattice = ''
    for i in range(-20, 21):
        x = CX + i * 44
        lattice += (f'<path d="M{x - 700} {CY - 700}L{x + 700} {CY + 700}" stroke="{GOLD}" stroke-width="1.2" opacity=".2"/>'
                    f'<path d="M{x + 700} {CY - 700}L{x - 700} {CY + 700}" stroke="{GOLD}" stroke-width="1.2" opacity=".2"/>')
    clip = f'<clipPath id="bc"><rect x="{B + 58}" y="{B + 58}" width="{TW - 116}" height="{TH - 116}" rx="18"/></clipPath>'
    rays = ''.join(
        f'<path d="M{CX + 190 * math.cos(math.radians(a)):.1f} {CY + 190 * math.sin(math.radians(a)):.1f}L{CX + 236 * math.cos(math.radians(a)):.1f} {CY + 236 * math.sin(math.radians(a)):.1f}" stroke="{GOLD}" stroke-width="3" stroke-linecap="round"/>'
        for a in range(0, 360, 10))
    medal = (f'<circle cx="{CX}" cy="{CY}" r="250" fill="{FELT_D}"/>' + rays
             + f'<circle cx="{CX}" cy="{CY}" r="180" fill="url(#feltR)" stroke="url(#g)" stroke-width="5"/>'
             + f'<circle cx="{CX}" cy="{CY}" r="250" fill="none" stroke="url(#g)" stroke-width="3"/>'
             + logo_mark(CX, CY + 6, 300))
    ends = (spade(CX, B + 130, 46, 'url(#g)') + rot180(spade(CX, B + 130, 46, 'url(#g)'), CX, CY))
    return (clip + f'<rect width="{W}" height="{H}" fill="url(#feltR)"/>'
            f'<g clip-path="url(#bc)">{lattice}</g>'
            f'<rect x="{B + 30}" y="{B + 30}" width="{TW - 60}" height="{TH - 60}" rx="26" fill="none" stroke="url(#g)" stroke-width="5"/>'
            f'<rect x="{B + 58}" y="{B + 58}" width="{TW - 116}" height="{TH - 116}" rx="18" fill="none" stroke="{GOLD}" stroke-width="2"/>'
            + medal + ends)


# ------------------------------------------------------------------------------------------------ tuck box
BOX_D = 260  # 22 mm deep box at 300 dpi


def box_front():
    g6 = font('golos600')
    l1, _ = g6.text('PLAYING CARDS', CX, CY + 300, 34, tracking=.42, anchor='middle')
    l2, _ = g6.text('36 CARDS  ·  6 TO ACE  ·  2–4 PLAYERS', CX, H - B - 92, 22, tracking=.26, anchor='middle')
    return (back()
            + f'<rect x="{CX - 300}" y="{CY + 236}" width="600" height="96" fill="{FELT_D}"/>'
            + f'<path d="{l1}" fill="url(#g)"/>'
            + f'<rect x="{CX - 330}" y="{H - B - 136}" width="660" height="66" fill="{FELT_D}"/>'
            + f'<path d="{l2}" fill="{IVORY}" opacity=".85"/>'
            + f'<rect x="{CX - 300}" y="{B + 160}" width="600" height="110" fill="{FELT_D}"/>'
            + wordmark(CX, B + 240, 62))


def box_back():
    g6, g5 = font('golos600'), font('golos500')
    cm = font('corm700')
    t, _ = cm.text('How to play', CX, B + 190, 74, anchor='middle')
    lines = [('Goal', 'Shed your cards, collect the fewest points.'),
             ('125', 'Land on exactly 125 and burn back to 0.'),
             ('7 · 8', 'Next player draws one · draws two.'),
             ('Q♠', 'Next player draws five and skips.'),
             ('J ×4', 'Finish on jacks: everyone else ×2 to ×5.'),
             ('K ×4', 'Four kings in a row reset every score.')]
    body = ''
    for i, (k, v) in enumerate(lines):
        y = B + 300 + i * 92
        kd, _ = g6.text(k.replace('♠', ''), B + 110, y, 30, tracking=.08)
        vd, _ = g5.text(v, B + 250, y, 24)
        body += f'<path d="{kd}" fill="url(#g)"/><path d="{vd}" fill="{IVORY}" opacity=".9"/>'
        if '♠' in k:
            body += spade(B + 172, y - 11, 26, 'url(#g)')
        body += f'<path d="M{B + 110} {y + 32}H{W - B - 110}" stroke="{GOLD}" stroke-width="1" opacity=".3"/>'
    url, _ = g6.text('PLAY FREE ONLINE  ·  BRIDGE 125', CX, H - B - 110, 24, tracking=.3, anchor='middle')
    return (f'<rect width="{W}" height="{H}" fill="url(#feltR)"/>'
            f'<rect x="{B + 30}" y="{B + 30}" width="{TW - 60}" height="{TH - 60}" rx="26" fill="none" stroke="url(#g)" stroke-width="5"/>'
            + f'<path d="{t}" fill="{IVORY}"/>' + body + logo_mark(CX, H - B - 200, 110)
            + f'<path d="{url}" fill="{IVORY}" opacity=".7"/>')


def box_side():
    g6 = font('golos600')
    w, h = BOX_D + 2 * B, H
    t = f'<g transform="translate({w / 2 + 18} {h / 2}) rotate(-90)">{wordmark(0, 0, 52)}</g>'
    return (f'<rect width="{w}" height="{h}" fill="url(#feltR)"/>'
            f'<rect x="{B + 24}" y="{B + 30}" width="{BOX_D - 48}" height="{TH - 60}" rx="16" fill="none" stroke="url(#g)" stroke-width="4"/>'
            + t + spade(w / 2, B + 110, 44, 'url(#g)') + spade(w / 2, h - B - 110, 44, 'url(#g)')), w, h


def box_top():
    w, h = W, BOX_D + 2 * B
    return (f'<rect width="{w}" height="{h}" fill="url(#feltR)"/>'
            f'<rect x="{B + 30}" y="{B + 24}" width="{TW - 60}" height="{BOX_D - 48}" rx="16" fill="none" stroke="url(#g)" stroke-width="4"/>'
            + logo_mark(w / 2, h / 2, 160)), w, h


def build():
    files = []
    for s in SUIT_ORDER:
        for r in RANKS:
            if r == 'A':
                body = ace(s)
            elif r in 'JQK':
                body = court(r, s)
            else:
                body = pip_card(r, s)
            name = f'{r}{s}'
            write(os.path.join(OUT, f'{name}.svg'), svg(W, H, body, FACE_DEFS, f'Bridge 125 — {r} of {SUIT_NAMES[s]}'))
            files.append(name)
    write(os.path.join(OUT, 'back.svg'), svg(W, H, back(), FACE_DEFS, 'Bridge 125 — card back'))
    write(os.path.join(OUT, 'box-front.svg'), svg(W, H, box_front(), FACE_DEFS, 'Bridge 125 — tuck box front'))
    write(os.path.join(OUT, 'box-back.svg'), svg(W, H, box_back(), FACE_DEFS, 'Bridge 125 — tuck box back'))
    b, w, h = box_side()
    write(os.path.join(OUT, 'box-side.svg'), svg(w, h, b, FACE_DEFS, 'Bridge 125 — tuck box side'))
    b, w, h = box_top()
    write(os.path.join(OUT, 'box-top.svg'), svg(w, h, b, FACE_DEFS, 'Bridge 125 — tuck box top'))
    return files + ['back', 'box-front', 'box-back', 'box-side', 'box-top']


if __name__ == '__main__':
    print(len(build()), 'deck files')
