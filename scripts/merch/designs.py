"""Bridge 125 merch — original print designs, drawn in code.

    python3 scripts/merch/designs.py           # writes public/merch/designs/*.svg

Every design is a self-contained vector SVG (text converted to outlines, no external refs).
"""
from __future__ import annotations

import math
import os
import random

from svgkit import (CLUB, DIAMOND, FELT, FELT2, FELT_D, GOLD, GOLD_HI, GOLD_LO, HEART, INK, IVORY, ROOT, RUBY, RUBY_D,
                    SPADE, font, lin, mirror_x, rad, rot180, spade, suit, svg, write)

OUT = os.path.join(ROOT, 'merch-print', 'designs')   # vector print sources (not deployed)
DESIGNS: dict[str, callable] = {}


def design(name):
    def deco(fn):
        DESIGNS[name] = fn
        return fn
    return deco


def m(x, cx=600):
    return 2 * cx - x


def sym(p0, segs, cx=600):
    """Closed symmetric path: right half given as cubic segments from a point on the axis (p0) to a point on the
    axis; the left half is mirrored automatically."""
    d = [f'M{p0[0]:.1f} {p0[1]:.1f}']
    for c1, c2, p in segs:
        d.append(f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p[0]:.1f} {p[1]:.1f}')
    starts = [p0] + [s[2] for s in segs[:-1]]
    for (c1, c2, p), s in zip(reversed(segs), reversed(starts)):
        d.append(f'C{m(c2[0], cx):.1f} {c2[1]:.1f} {m(c1[0], cx):.1f} {c1[1]:.1f} {m(s[0], cx):.1f} {s[1]:.1f}')
    return ' '.join(d) + 'Z'


def both(el: str, cx=600):
    return el + mirror_x(el, cx)


GOLDDEF = lin('g', [(0, GOLD_HI), (.48, GOLD), (1, GOLD_LO)])
GOLDH = lin('gh', [(0, GOLD_LO), (.25, GOLD), (.5, GOLD_HI), (.75, GOLD), (1, GOLD_LO)], x2=1, y2=0)


# ================================================================================================ 1 · Queen of Spades
def queen_card():
    """Art-deco double-ended Queen of Spades → (defs, card group in 'card space' x 160..1040, y 121..1379)."""
    G = 'url(#g)'
    defs = GOLDDEF + GOLDH + (
        lin('ink', [(0, '#22232B'), (1, '#0E0F13')])
        + rad('arch', [(0, FELT2), (.75, FELT), (1, FELT_D)], cy=.62, r=.7)
        + lin('skin', [(0, '#FBF6EA'), (1, '#E9DDC3')])
        + lin('neck', [(0, '#CDBE9E'), (.35, '#EADFC6'), (1, '#F1E8D3')])
        + rad('blush', [(0, RUBY, .32), (1, RUBY, 0)])
        + lin('rub', [(0, '#D8455A'), (1, RUBY_D)])
        + '<clipPath id="archclip"><path d="M380 750V410A220 220 0 0 1 820 410V750Z"/></clipPath>'
    )

    # --- top half (card space: card spans x 160..1040, y 121..1379, divider at y 750)
    rays = ''.join(
        f'<path d="M600 430L{600 + 900 * math.sin(math.radians(a - 3.2)):.1f} {430 - 900 * math.cos(math.radians(a - 3.2)):.1f}'
        f'L{600 + 900 * math.sin(math.radians(a + 3.2)):.1f} {430 - 900 * math.cos(math.radians(a + 3.2)):.1f}Z" fill="{GOLD}" opacity=".16"/>'
        for a in range(-90, 271, 15))
    arch = (f'<path d="M380 750V410A220 220 0 0 1 820 410V750Z" fill="url(#arch)"/>'
            f'<g clip-path="url(#archclip)">{rays}'
            + ''.join(f'<circle cx="600" cy="430" r="{r}" fill="none" stroke="{GOLD}" stroke-opacity=".22" stroke-width="2"/>' for r in (150, 190, 230))
            + '</g>')
    arch_frame = (f'<path d="M380 750V410A220 220 0 0 1 820 410V750" fill="none" stroke="{G}" stroke-width="7"/>'
                  f'<path d="M398 750V410A202 202 0 0 1 802 410V750" fill="none" stroke="{GOLD}" stroke-width="2" opacity=".7"/>')

    # fan collar behind the neck: alternating wedges
    fan = ''
    n = 13
    for i in range(n):
        a0 = math.radians(-90 - 78 + i * 156 / n)
        a1 = math.radians(-90 - 78 + (i + 1) * 156 / n)
        R = 150
        fan += (f'<path d="M600 640L{600 + R * math.cos(a0):.1f} {640 + R * math.sin(a0):.1f}'
                f'A{R} {R} 0 0 1 {600 + R * math.cos(a1):.1f} {640 + R * math.sin(a1):.1f}Z" '
                f'fill="{G if i % 2 == 0 else INK}" stroke="{GOLD}" stroke-width="1.5"/>')
    fan += f'<path d="M450 640A150 150 0 0 1 750 640" fill="none" stroke="{GOLD_HI}" stroke-width="3"/>'

    # shoulders / bodice
    bodice = sym((600, 596), [((636, 596), (668, 608), (704, 624)), ((770, 652), (806, 690), (816, 750)),
                              ((760, 750), (650, 750), (600, 750))])
    vneck = 'M574 598L626 598L600 690Z'
    chevrons = ''.join(both(f'<path d="M{648 + k * 30} {640 + k * 10}L{700 + k * 26} {690 + k * 6}" stroke="{GOLD}" stroke-width="3" fill="none" opacity=".75"/>')
                       for k in range(4))
    necklace = (f'<path d="M566 622C578 650 622 650 634 622" fill="none" stroke="{G}" stroke-width="4"/>'
                + spade(600, 662, 30, 'url(#rub)', f'stroke="{GOLD_HI}" stroke-width="5"'))

    neck = f'<path d="M572 490L567 586C580 594 620 594 633 586L628 490Z" fill="url(#neck)"/>'
    face = sym((600, 346), [((646, 346), (666, 386), (664, 428)), ((662, 474), (636, 512), (600, 518))])
    hair = sym((600, 294), [((664, 294), (716, 338), (714, 414)), ((713, 456), (705, 492), (692, 526)),
                            ((680, 516), (668, 506), (658, 496)), ((668, 456), (668, 404), (648, 380)),
                            ((634, 364), (618, 356), (600, 358))])
    waves = ''.join(both(
        f'<path d="M{606 + k * 3} {308 + k * 13}C{652 - k * 2} {310 + k * 14} {700 - k * 10} {346 + k * 10} {702 - k * 11} {410 + k * 4}'
        f'C{704 - k * 11} {446 + k * 2} {698 - k * 10} {478 - k * 2} {688 - k * 9} {506 - k * 6}" fill="none" stroke="{GOLD}" stroke-width="2.6" opacity=".8"/>')
        for k in range(3))
    part = f'<path d="M600 300C598 320 600 340 600 358" stroke="{GOLD}" stroke-width="2" opacity=".6" fill="none"/>'
    features = (
        both(f'<path d="M609 404C623 393 643 393 657 401" fill="none" stroke="{INK}" stroke-width="3.2" stroke-linecap="round"/>')
        + both(f'<path d="M610 428C622 417 642 417 653 425C641 437 622 437 610 428Z" fill="{FELT2}" opacity=".55"/>')
        + both(f'<path d="M610 428C622 439 641 439 653 426" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>')
        + both(''.join(f'<path d="M{x} {y}l{dx} 8" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>'
                       for x, y, dx in ((617, 433, -2), (625, 436, -1), (634, 437, 0), (643, 435, 1), (650, 431, 2))))
        + f'<path d="M606 436C609 452 611 462 606 470" fill="none" stroke="#A7987A" stroke-width="2.2" stroke-linecap="round"/>'
        + f'<path d="M592 472C597 477 603 477 608 472" fill="none" stroke="#9C8B6C" stroke-width="2.2" stroke-linecap="round"/>'
        + both('<ellipse cx="636" cy="466" rx="20" ry="13" fill="url(#blush)"/>')
        + f'<path d="{sym((600, 485), [((606, 478), (614, 479), (624, 488)), ((614, 497), (608, 501), (600, 501))])}" fill="url(#rub)"/>'
        + f'<path d="M578 488C592 491 608 491 622 488" fill="none" stroke="{RUBY_D}" stroke-width="2"/>'
    )
    tiara = (
        f'<path d="M546 330C566 302 634 302 654 330C632 318 568 318 546 330Z" fill="{G}"/>'
        + spade(600, 266, 58, G, f'stroke="{INK}" stroke-width="4"')
        + both(f'<g transform="rotate(16 640 296)">{spade(640, 296, 34, G, f"stroke=\"{INK}\" stroke-width=\"5\"")}</g>')
        + ''.join(f'<circle cx="{600 + dx}" cy="{318 - (1 - (dx / 54) ** 2) * 9:.1f}" r="4.2" fill="{IVORY}" stroke="{GOLD_LO}" stroke-width="1"/>'
                  for dx in range(-48, 49, 12))
    )
    earrings = both(f'<path d="M691 524L691 546" stroke="{G}" stroke-width="3"/><circle cx="691" cy="524" r="5" fill="{G}"/>'
                    + spade(691, 566, 30, 'url(#rub)', f'stroke="{GOLD_HI}" stroke-width="5"'))

    q = font('corm700')
    qd, _ = q.text('Q', 256, 318, 150, anchor='middle')
    index = f'<path d="{qd}" fill="{G}"/>' + spade(256, 366, 56, G)
    # stepped deco corner ornament (top right) and side pinstripes
    steps = ''.join(f'<path d="M{1000 - k * 22} 161V{183 + k * 22}H1000" fill="none" stroke="{GOLD}" stroke-width="2.5" opacity="{.9 - k * .18:.2f}"/>'
                    for k in range(5))
    pins = ''.join(f'<path d="M{x} 470V720" stroke="{GOLD}" stroke-width="2" opacity=".35"/>' for x in (212, 232, 252, 948, 968, 988))
    dots = ''.join(f'<circle cx="{x}" cy="450" r="5" fill="{GOLD}" opacity=".7"/>' for x in (232, 968))

    lift = 'translate(0 750) scale(1 1.1) translate(0 -750)'
    top = (arch + f'<g transform="{lift}">' + fan + f'<path d="{bodice}" fill="url(#ink)" stroke="{G}" stroke-width="4"/>' + chevrons
           + '</g>' + neck + f'<g transform="{lift}"><path d="{vneck}" fill="url(#neck)"/>' + necklace + '</g>'
           + f'<path d="{face}" fill="url(#skin)"/>' + features
           + f'<path d="{hair}" fill="url(#ink)" stroke="{G}" stroke-width="3.5"/>' + waves + part + tiara + earrings
           + arch_frame + index + steps + pins + dots)

    # divider band with a diamond medallion
    band = (f'<rect x="188" y="742" width="824" height="16" fill="{INK}"/>'
            f'<path d="M188 742H1012M188 758H1012" stroke="{G}" stroke-width="3"/>'
            f'<path d="M600 700L652 750L600 800L548 750Z" fill="{INK}" stroke="{G}" stroke-width="5"/>'
            + spade(600, 751, 44, G))
    card = (f'<rect x="160" y="121" width="880" height="1258" rx="58" fill="url(#ink)"/>'
            f'<rect x="166" y="127" width="868" height="1246" rx="53" fill="none" stroke="{G}" stroke-width="10"/>'
            f'<rect x="188" y="149" width="824" height="1202" rx="36" fill="none" stroke="{GOLD}" stroke-width="2" opacity=".75"/>'
            + top + rot180(top, 600, 750) + band)
    return defs, card


@design('queen-of-spades')
def queen():
    """The hero design: the art-deco Queen of Spades card with a title lockup."""
    G = 'url(#g)'
    defs, card = queen_card()
    # composition on the shirt: card + title lockup
    s = .80
    tx = 600 - 600 * s
    ty = 40 - 121 * s
    g = font('golos600')
    title, _ = g.text('QUEEN OF SPADES', 600, 1186, 58, tracking=.2, anchor='middle')
    sub, _ = g.text('DRAW FIVE  ·  SKIP A TURN', 600, 1262, 25, tracking=.34, anchor='middle')
    brand, _ = g.text('BRIDGE', 600 - 22, 1350, 30, tracking=.16, anchor='end')
    brand2, _ = g.text('125', 600 + 22, 1350, 30, tracking=.16, anchor='start')
    lock = (f'<path d="{title}" fill="{G}"/>'
            f'<path d="M330 1215H560M640 1215H870" stroke="{GOLD}" stroke-width="2.5"/>' + spade(600, 1214, 30, G)
            + f'<path d="{sub}" fill="{IVORY}" opacity=".88"/>'
            f'<path d="{brand}" fill="{IVORY}"/>' + spade(600, 1340, 22, G) + f'<path d="{brand2}" fill="{G}"/>')
    body = f'<g transform="translate({tx} {ty}) scale({s})">{card}</g>' + lock
    return svg(1200, 1400, body, defs, 'Queen of Spades — Bridge 125')


# ================================================================================================ 2 · 125 → 0
def flame(x, base, w, h, sway=0.0):
    """A licking flame: teardrop with a curling, swaying tip."""
    tx = x + sway * w
    return (f'M{x - w / 2:.1f} {base:.1f}'
            f'C{x - w * .62:.1f} {base - h * .38:.1f} {tx - w * .38:.1f} {base - h * .58:.1f} {tx - w * .08:.1f} {base - h * .78:.1f}'
            f'C{tx + w * .06:.1f} {base - h * .88:.1f} {tx + w * .02:.1f} {base - h * .95:.1f} {tx - w * .06:.1f} {base - h:.1f}'
            f'C{tx + w * .34:.1f} {base - h * .9:.1f} {x + w * .62:.1f} {base - h * .52:.1f} {x + w * .5:.1f} {base - h * .2:.1f}'
            f'C{x + w * .46:.1f} {base - h * .08:.1f} {x + w * .48:.1f} {base:.1f} {x + w / 2:.1f} {base:.1f}Z')


@design('burn-125')
def burn():
    rnd = random.Random(125)
    g8, g6 = font('golos800'), font('golos600')
    defs = GOLDDEF + (
        lin('numg', [(0, RUBY), (.3, '#E0873A'), (.62, GOLD), (1, GOLD_LO)])
        + lin('fl1', [(0, RUBY_D), (.5, RUBY), (1, '#F08A3C', 0)], y1=1, y2=0)
        + lin('fl2', [(0, '#E0873A'), (.6, '#F3B95A'), (1, GOLD_HI, 0)], y1=1, y2=0)
        + lin('fl3', [(0, GOLD_HI), (1, '#FFF4CF', 0)], y1=1, y2=0)
        + rad('glow', [(0, '#F3B95A', .55), (.6, RUBY, .12), (1, RUBY, 0)])
        + rad('zero', [(0, GOLD_HI), (.7, GOLD), (1, GOLD_LO)], cy=.35, r=.75)
    )
    size = 400
    d125, w125 = g8.text('125', 600, 730, size, tracking=-.02, anchor='middle')
    top = 730 - size * .72
    fl = ''
    for layer, (grad, hmin, hmax, wmin, wmax, n) in enumerate((('fl1', 200, 340, 80, 120, 10), ('fl2', 140, 250, 56, 86, 12), ('fl3', 70, 140, 28, 44, 11))):
        for i in range(n):
            t = (i + rnd.uniform(-.3, .3)) / (n - 1)
            x = 600 - w125 / 2 + 50 + (w125 - 100) * t
            env = .45 + .55 * math.sin(math.pi * min(max(t, 0), 1))
            fl += f'<path d="{flame(x, top + 60 + layer * 10, rnd.uniform(wmin, wmax), rnd.uniform(hmin, hmax) * env, rnd.uniform(-.35, .35))}" fill="url(#{grad})"/>'
    embers = ''
    for _ in range(46):
        x = rnd.uniform(600 - w125 / 2 - 40, 600 + w125 / 2 + 40)
        y = rnd.uniform(110, top + 40)
        r = rnd.uniform(2.5, 7) * (1 - (top - y) / 700)
        c = rnd.choice([GOLD_HI, '#F3B95A', '#E0873A', RUBY])
        embers += f'<path d="M{x:.1f} {y - r * 1.6:.1f}L{x + r:.1f} {y:.1f}L{x:.1f} {y + r * 1.6:.1f}L{x - r:.1f} {y:.1f}Z" fill="{c}" opacity="{rnd.uniform(.45, 1):.2f}"/>'
    lede, _ = g6.text('LAND ON EXACTLY', 600, 120, 34, tracking=.42, anchor='middle')
    nums = (f'<ellipse cx="600" cy="{top + 40}" rx="{w125 * .6:.0f}" ry="150" fill="url(#glow)"/>' + fl
            + f'<path d="{d125}" fill="url(#numg)"/>')
    arrow = (f'<path d="M600 780V858" stroke="url(#g)" stroke-width="6" stroke-linecap="round"/>'
             f'<path d="M578 838L600 864L622 838" fill="none" stroke="{GOLD}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>')
    d0, _ = g8.text('0', 600, 1170, 250, anchor='middle')
    zc = 1170 - 250 * .72 / 2
    rings = ''.join(f'<circle cx="600" cy="{zc}" r="{r}" fill="none" stroke="{GOLD}" stroke-width="2" opacity="{o}"/>'
                    for r, o in ((140, .55), (160, .32), (180, .16)))
    rays = ''.join(
        f'<path d="M{600 + 198 * math.cos(math.radians(a)):.1f} {zc + 198 * math.sin(math.radians(a)):.1f}L{600 + 224 * math.cos(math.radians(a)):.1f} {zc + 224 * math.sin(math.radians(a)):.1f}" stroke="{GOLD}" stroke-width="3" stroke-linecap="round" opacity=".45"/>'
        for a in range(0, 360, 15) if not 240 <= a <= 300)
    zero = rings + rays + f'<path d="{d0}" fill="url(#zero)"/>'
    tag, _ = g6.text('AND BURN BACK TO ZERO', 600, 1330, 34, tracking=.36, anchor='middle')
    body = (embers + nums + f'<path d="{lede}" fill="{IVORY}" opacity=".9"/>' + arrow + zero
            + f'<path d="{tag}" fill="{IVORY}" opacity=".9"/>')
    return svg(1200, 1400, body, defs, '125 → 0 — Bridge 125')


# ================================================================================================ 3 · Jacks ×5
def court_card(x, y, w, h, rank, s, rot=0, pivot=None, deco=True):
    """Minimal ivory court card used in several designs."""
    col = RUBY if s in 'HD' else INK
    r = w * .085
    ci = font('corm700')
    big, _ = ci.text(rank, x + w / 2, y + h * .64, h * .42, anchor='middle')
    crown = (f'<path transform="translate({x + w / 2 - w * .15} {y + h * .2}) scale({w * .3 / 34:.4f})" '
             f'd="M2 16 L4 4 L11 10 L17 2 L23 10 L30 4 L32 16 Z" fill="{GOLD}"/>')
    idx, _ = ci.text(rank, x + w * .13, y + h * .155, h * .13, anchor='middle')
    px, py = pivot or (x + w / 2, y + h)
    corner = f'<path d="{idx}" fill="{col}"/>' + suit(s, x + w * .13, y + h * .205, w * .085, col)
    return (f'<g transform="rotate({rot} {px} {py})">'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="url(#card)" stroke="#BFB394" stroke-width="2"/>'
            + (f'<rect x="{x + w * .2}" y="{y + h * .14}" width="{w * .6}" height="{h * .72}" rx="{r * .5}" fill="{GOLD}" opacity=".13"/>' if deco else '')
            + f'<rect x="{x + w * .2}" y="{y + h * .14}" width="{w * .6}" height="{h * .72}" rx="{r * .5}" fill="none" stroke="{GOLD}" stroke-width="3"/>'
            + crown + f'<path d="{big}" fill="{col}"/>'
            + suit(s, x + w / 2, y + h * .75, w * .16, col)
            + corner + rot180(corner, x + w / 2, y + h / 2)
            + '</g>')


@design('jacks-x5')
def jacks():
    defs = GOLDDEF + lin('card', [(0, '#FFFBF1'), (1, '#EADFC6')]) + lin('x5', [(0, GOLD_HI), (.5, GOLD), (1, GOLD_LO)])
    w, h = 330, 472
    px, py = 600, 1030
    cards = ''
    for s, rot in zip('SHCD', (-27, -9, 9, 27)):
        cards += court_card(px - w / 2, py - h - 60, w, h, 'J', s, rot, (px, py))
    g8, g6 = font('golos800'), font('golos600')
    x5, _ = g8.text('×5', 600, 1220, 300, tracking=-.03, anchor='middle')
    head, _ = g6.text('FINISH ON FOUR JACKS', 600, 150, 40, tracking=.3, anchor='middle')
    foot, _ = g6.text('EVERYONE ELSE PAYS FIVE TIMES', 600, 1330, 30, tracking=.3, anchor='middle')
    halo = ''.join(f'<circle cx="600" cy="680" r="{r}" fill="none" stroke="{GOLD}" stroke-width="2" opacity="{o}"/>' for r, o in ((420, .25), (450, .15)))
    sparks = ''.join(
        f'<path d="M{600 + rr * math.cos(math.radians(a)):.1f} {680 + rr * math.sin(math.radians(a)):.1f}l0 -14l4 10l10 4l-10 4l-4 10l-4 -10l-10 -4l10 -4Z" fill="{GOLD_HI}" opacity=".8"/>'
        for a, rr in ((-150, 470), (-30, 470), (-100, 500), (-70, 440), (200, 480), (-20, 420)))
    body = (halo + sparks + cards
            + f'<path d="{x5}" fill="none" stroke="{INK}" stroke-width="26" stroke-linejoin="round"/>'
            + f'<path d="{x5}" fill="url(#x5)"/>'
            + f'<path d="{head}" fill="url(#g)"/>' + f'<path d="{foot}" fill="{IVORY}" opacity=".85"/>')
    return svg(1200, 1400, body, defs, 'Jacks ×5 — Bridge 125')


# ================================================================================================ 4 · Logo mark
def logo_mark(cx, cy, size, card_fill='#0F1C18', grad='url(#g)'):
    """The 'Modern Fan' mark (public/logo-mark.svg geometry) centred on cx, cy at `size` px."""
    k = size / 200
    cards = ''.join(f'<g transform="rotate({a} 100 182)"><rect x="62" y="28" width="76" height="112" rx="11" fill="{card_fill}" stroke="{grad}" stroke-width="7"/></g>'
                    for a in (-22, 22, 0))
    sp = f'<g transform="translate(80 64) scale(.4)"><path d="{SPADE}" fill="{grad}"/></g>'
    return f'<g transform="translate({cx - size / 2} {cy - size / 2}) scale({k:.4f})">{cards}{sp}</g>'


def wordmark(cx, y, size, ivory=IVORY, grad='url(#g)'):
    g = font('golos600')
    _, w1 = g.text('BRIDGE ', 0, 0, size, tracking=.16)
    _, w2 = g.text('125', 0, 0, size, tracking=.16)
    x0 = cx - (w1 + w2) / 2
    a, _ = g.text('BRIDGE', x0, y, size, tracking=.16)
    b, _ = g.text('125', x0 + w1 + size * .16, y, size, tracking=.16)
    return f'<path d="{a}" fill="{ivory}"/><path d="{b}" fill="{grad}"/>'


@design('logo-mark')
def logo():
    body = logo_mark(600, 470, 720) + wordmark(600, 1020, 120)
    return svg(1200, 1100, body, GOLDDEF, 'Bridge 125 — logo mark')


# ================================================================================================ 5 · Varsity
@design('varsity-club')
def varsity():
    g8 = font('golos800')
    arc = g8.text_arc('BRIDGE CLUB', 600, 1150, 940, 150, tracking=.05)
    est, _ = g8.text('EST.', 320, 560, 96, anchor='middle')
    n125, _ = g8.text('125', 880, 560, 96, anchor='middle')
    foot, _ = g8.text('PLAY · BURN · REPEAT', 600, 840, 54, tracking=.16, anchor='middle')

    def lettered(d, fill=IVORY, edge=RUBY):
        return (f'<path d="{d}" fill="none" stroke="{IVORY}" stroke-width="34" stroke-linejoin="round"/>'
                f'<path d="{d}" fill="none" stroke="{edge}" stroke-width="22" stroke-linejoin="round"/>'
                f'<path d="{d}" fill="{fill}"/>')
    sp = f'<g transform="translate(445 290) scale(3.1)">' + (
        f'<path d="{SPADE}" fill="none" stroke="{IVORY}" stroke-width="{34 / 3:.2f}" stroke-linejoin="round"/>'
        f'<path d="{SPADE}" fill="none" stroke="{RUBY}" stroke-width="{22 / 3:.2f}" stroke-linejoin="round"/>'
        f'<path d="{SPADE}" fill="{FELT}"/>') + '</g>'
    big = sp
    stars = ''.join(f'<path transform="translate({x} 712) scale(.9)" d="M0 -22L6 -7L22 -7L9 3L14 19L0 9L-14 19L-9 3L-22 -7L-6 -7Z" fill="{IVORY}"/>' for x in (520, 600, 680))
    rule = f'<path d="M250 714H460M740 714H950" stroke="{IVORY}" stroke-width="6" stroke-linecap="round"/>'
    body = lettered(arc) + big + lettered(est) + lettered(n125) + stars + rule + lettered(foot, RUBY, IVORY)
    return svg(1200, 920, body, GOLDDEF, 'Bridge Club est. 125 — Bridge 125')


# ================================================================================================ 6 · Bluff neon
def neon(d, col, core='#FFF3F5', width=9.0, on=1.0):
    return (f'<g opacity="{on}"><path d="{d}" fill="none" stroke="{col}" stroke-width="{width * 4}" stroke-linejoin="round" opacity=".5" filter="url(#glowR)"/>'
            f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{width * 1.8}" stroke-linejoin="round" filter="url(#glowS)"/>'
            f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{core}" stroke-width="{width * .38}" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/></g>')


NEON_DEFS = ('<filter id="glowR" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="2400"><feGaussianBlur stdDeviation="16"/></filter>'
             '<filter id="glowS" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="2400"><feGaussianBlur stdDeviation="5"/></filter>')


@design('bluff-neon')
def bluff():
    c = font('corm700i')
    g = font('golos600')
    glyphs, w = c.layout('Bluff', 420, -.01)
    letters = [c.glyph_d(fi, gn, 600 - w / 2 + gx, 860, 420) for ch, fi, gn, gx, adv in glyphs]
    pink, gold = '#FF4F78', '#FFD47A'
    word_g = ''.join(neon(d, pink, on=(.45 if i == 2 else 1)) for i, d in enumerate(letters))
    spade_neon = f'<g transform="translate(455 130) scale(2.9)">{neon(SPADE, gold, "#FFFBEA", 3.2)}</g>'
    sub, _ = g.text('NEVER BLUFF AT 124', 600, 1080, 64, tracking=.2, anchor='middle')
    body = (spade_neon + word_g + neon(sub, gold, '#FFFBEA', 3.2)
            + neon('M210 1150H990', gold, '#FFFBEA', 4))
    return svg(1200, 1300, body, NEON_DEFS, 'Bluff — neon — Bridge 125')
