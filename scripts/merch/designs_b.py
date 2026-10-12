"""Bridge 125 merch — designs 7–10 (poster / sub-line art). Registers into designs.DESIGNS."""
from __future__ import annotations

import math

from designs import GOLDDEF, both, court_card, design, sym
from svgkit import (CLUB, FELT, FELT2, FELT_D, GOLD, GOLD_HI, GOLD_LO, INK, IVORY, RUBY, RUBY_D, SPADE, font, lin,
                    mirror_x, rad, spade, suit, svg)

PAPER = '#F2EAD7'


# ================================================================================================ 7 · Riga Jugendstil
@design('riga-jugendstil')
def jugendstil():
    W, H = 1200, 1600
    defs = (lin('gp', [(0, '#D9BC72'), (.5, '#B8913A'), (1, '#8A6A24')])
            + rad('field', [(0, FELT2), (.7, FELT), (1, FELT_D)], cy=.45, r=.75)
            + rad('sun', [(0, '#2C7A62'), (1, FELT2, 0)])
            + rad('paper', [(0, '#F7F1E2'), (1, '#E8DCC0')], r=.8)
            + lin('inkg', [(0, '#24262E'), (1, '#0E0F13')]))
    portal = sym((600, 150), [((880, 150), (1060, 320), (1060, 560)), ((1060, 800), (1060, 1040), (1060, 1260)),
                              ((900, 1260), (760, 1260), (600, 1260))])
    inner = sym((600, 184), [((860, 184), (1026, 340), (1026, 566)), ((1026, 800), (1026, 1040), (1026, 1226)),
                             ((880, 1226), (740, 1226), (600, 1226))])
    clip = f'<clipPath id="pc"><path d="{inner}"/></clipPath>'
    cy = 720
    rays = ''.join(
        f'<path d="M600 {cy}L{600 + 1400 * math.sin(math.radians(a - 2.2)):.1f} {cy - 1400 * math.cos(math.radians(a - 2.2)):.1f}'
        f'L{600 + 1400 * math.sin(math.radians(a + 2.2)):.1f} {cy - 1400 * math.cos(math.radians(a + 2.2)):.1f}Z" fill="{GOLD}" opacity=".13"/>'
        for a in range(0, 360, 10))
    sun = (f'<circle cx="600" cy="{cy}" r="330" fill="url(#sun)"/>'
           f'<circle cx="600" cy="{cy}" r="318" fill="none" stroke="{GOLD}" stroke-width="3" opacity=".8"/>'
           f'<circle cx="600" cy="{cy}" r="296" fill="none" stroke="{GOLD}" stroke-width="1.5" stroke-dasharray="2 9" opacity=".8"/>')

    # lilies climbing the jambs (left half, mirrored)
    def leaf(x, y, ang, L=70, Wd=22, fill=GOLD, op=.95):
        return (f'<path transform="translate({x} {y}) rotate({ang})" d="M0 0C{L * .3} {-Wd} {L * .75} {-Wd} {L} 0C{L * .75} {Wd * .6} {L * .3} {Wd * .6} 0 0Z" '
                f'fill="{fill}" opacity="{op}"/>'
                f'<path transform="translate({x} {y}) rotate({ang})" d="M4 0C{L * .4} -4 {L * .7} -4 {L - 6} 0" stroke="{FELT_D}" stroke-width="2" fill="none" opacity=".6"/>')
    stem = f'<path d="M226 1210C210 1080 246 960 226 840C212 760 234 690 226 620" fill="none" stroke="{GOLD}" stroke-width="5" stroke-linecap="round"/>'
    leaves = ''.join(leaf(x, y, a) for x, y, a in ((224, 1130, -30), (230, 1010, -150), (224, 900, -35), (228, 780, -148), (226, 700, -40)))
    bloom = (f'<g transform="translate(226 610)">'
             f'<path d="M0 0C-14 -30 -10 -70 0 -96C10 -70 14 -30 0 0Z" fill="{IVORY}"/>'
             f'<path d="M0 0C-20 -20 -52 -36 -70 -30C-56 -12 -28 0 0 0Z" fill="{IVORY}" opacity=".92"/>'
             f'<path d="M0 0C20 -20 52 -36 70 -30C56 -12 28 0 0 0Z" fill="{IVORY}" opacity=".92"/>'
             f'<path d="M0 -6V-58M-6 -10L-18 -48M6 -10L18 -48" stroke="{GOLD_LO}" stroke-width="2.5" stroke-linecap="round"/>'
             f'<circle cy="-58" r="5" fill="{GOLD}"/><circle cx="-18" cy="-48" r="4" fill="{GOLD}"/><circle cx="18" cy="-48" r="4" fill="{GOLD}"/>'
             '</g>')
    lilies = both(stem + leaves + bloom)

    # whiplash base curves
    whip = both(f'<path d="M150 1226C300 1226 300 1090 430 1080C520 1074 540 1150 600 1150" fill="none" stroke="{INK}" stroke-width="12" stroke-linecap="round"/>'
                f'<path d="M150 1206C290 1200 290 1066 430 1058C510 1054 548 1112 574 1126" fill="none" stroke="{GOLD}" stroke-width="3" stroke-linecap="round"/>'
                f'<path d="M430 1080C400 1110 410 1150 450 1150C476 1150 480 1124 462 1116" fill="none" stroke="{GOLD}" stroke-width="3" stroke-linecap="round"/>')

    # the spade with Jugendstil tracery
    S = 500
    k = S / 100
    sx, sy = 600 - S / 2, cy - S / 2 + 10
    spade_body = (f'<g transform="translate({sx} {sy}) scale({k})">'
                  f'<path d="{SPADE}" fill="url(#inkg)" stroke="url(#gp)" stroke-width="{6 / k:.2f}"/>'
                  f'<path transform="translate(9 11) scale(.82)" d="{SPADE}" fill="none" stroke="{GOLD}" stroke-width="{2 / k / .82:.2f}" opacity=".8"/>'
                  '</g>')
    tr_y = sy  # spade top in px
    trace = both(
        f'<path d="M600 {tr_y + 470}C600 {tr_y + 400} 598 {tr_y + 330} 600 {tr_y + 250}" fill="none" stroke="{GOLD}" stroke-width="4"/>'
        f'<path d="M600 {tr_y + 300}C566 {tr_y + 270} 490 {tr_y + 270} 470 {tr_y + 220}C452 {tr_y + 172} 496 {tr_y + 140} 528 {tr_y + 162}C552 {tr_y + 180} 540 {tr_y + 214} 512 {tr_y + 206}" fill="none" stroke="{GOLD}" stroke-width="4" stroke-linecap="round"/>'
        f'<path d="M600 {tr_y + 360}C560 {tr_y + 340} 530 {tr_y + 346} 510 {tr_y + 360}C532 {tr_y + 382} 570 {tr_y + 382} 600 {tr_y + 360}Z" fill="{GOLD}" opacity=".9"/>'
        f'<circle cx="470" cy="{tr_y + 300}" r="7" fill="{GOLD}"/><circle cx="446" cy="{tr_y + 282}" r="5" fill="{GOLD}"/><circle cx="452" cy="{tr_y + 318}" r="4" fill="{GOLD}"/>'
    )
    fc = tr_y + 196
    petals = ''.join(f'<ellipse cx="600" cy="{fc - 34}" rx="15" ry="34" transform="rotate({a} 600 {fc})" fill="{IVORY}" opacity=".95"/>' for a in range(0, 360, 45))
    flower = petals + f'<circle cx="600" cy="{fc}" r="20" fill="url(#gp)"/>' + ''.join(
        f'<circle cx="{600 + 10 * math.cos(math.radians(a)):.1f}" cy="{fc + 10 * math.sin(math.radians(a)):.1f}" r="2.5" fill="{FELT_D}"/>' for a in range(0, 360, 60))

    medal = (f'<circle cx="600" cy="166" r="62" fill="url(#gp)" stroke="{INK}" stroke-width="6"/>'
             f'<circle cx="600" cy="166" r="50" fill="none" stroke="{IVORY}" stroke-width="2" opacity=".8"/>')
    cg = font('corm700')
    m125, _ = cg.text('125', 600, 186, 56, anchor='middle')
    medal += f'<path d="{m125}" fill="{INK}"/>'

    # typography
    bridge, bw = cg.text('BRIDGE', 0, 0, 150, tracking=.12)
    n125, nw = cg.text('125', 0, 0, 150, tracking=.12)
    gap = 120
    x0 = 600 - (bw + gap + nw) / 2
    t1, _ = cg.text('BRIDGE', x0, 1440, 150, tracking=.12)
    t2, _ = cg.text('125', x0 + bw + gap, 1440, 150, tracking=.12)
    g6 = font('golos600')
    small, _ = g6.text('RĪGA  ·  JUGENDSTIL  ·  CARD CLUB', 600, 1512, 26, tracking=.42, anchor='middle')
    type_ = (f'<path d="{t1}" fill="{INK}"/><path d="{t2}" fill="url(#gp)"/>' + spade(x0 + bw + gap / 2 - 4, 1392, 64, RUBY)
             + f'<path d="{small}" fill="{INK}" opacity=".75"/>')
    frame = (f'<rect x="40" y="40" width="{W - 80}" height="{H - 80}" fill="none" stroke="{INK}" stroke-width="4"/>'
             f'<rect x="56" y="56" width="{W - 112}" height="{H - 112}" fill="none" stroke="url(#gp)" stroke-width="2"/>'
             + both('<path d="M56 96H96V56" fill="none" stroke="#B8913A" stroke-width="2"/><circle cx="76" cy="76" r="6" fill="#B8913A"/>')
             + both('<path d="M56 1504H96V1544" fill="none" stroke="#B8913A" stroke-width="2"/><circle cx="76" cy="1524" r="6" fill="#B8913A"/>'))
    body = (f'<rect width="{W}" height="{H}" fill="url(#paper)"/>' + frame
            + f'<path d="{portal}" fill="url(#inkg)"/>'
            + f'<path d="{inner}" fill="url(#field)" stroke="url(#gp)" stroke-width="4"/>'
            + f'<g clip-path="url(#pc)">{rays}{sun}{lilies}{whip}</g>'
            + spade_body + trace + flower + medal + type_)
    return svg(W, H, body, defs + clip, 'Riga Jugendstil — Bridge 125')


# ================================================================================================ 8 · 70s sunset
@design('sunset-70s')
def sunset():
    CREAM, MUST, ORNG, BRWN, PLUM = '#F6E7C8', '#EBA93B', '#DD6B2C', '#4A2618', '#7A2440'
    defs = (lin('sunG', [(0, '#F4C65A'), (.35, MUST), (.6, ORNG), (.85, RUBY), (1, PLUM)])
            + '<mask id="bands"><rect width="1200" height="1400" fill="#fff"/>'
            + ''.join(f'<rect x="0" y="{y}" width="1200" height="{h}" fill="#000"/>' for y, h in ((560, 9), (612, 13), (668, 17), (728, 21), (792, 25), (858, 29)))
            + '</mask>' + lin('card', [(0, '#FFF6E2'), (1, '#F1DFBC')]))
    sun = f'<circle cx="600" cy="600" r="380" fill="url(#sunG)" mask="url(#bands)"/>'
    stripes = ''.join(f'<rect x="90" y="{y}" width="1020" height="34" rx="17" fill="{c}"/>' for y, c in ((910, MUST), (954, ORNG), (998, RUBY), (1042, BRWN)))
    c7 = font('corm700')

    def card(rot, rank, s, big=False):
        x, y, w, h = 600 - 145, 520, 290, 414
        col = RUBY if s in 'HD' else BRWN
        idx, _ = c7.text(rank, x + 40, y + 70, 64, anchor='middle')
        inner = (f'<path d="{idx}" fill="{col}"/>' + suit(s, x + 40, y + 102, 32, col)
                 + suit(s, 600, y + h / 2 + 6, 170 if big else 120, col))
        return (f'<g transform="rotate({rot} 600 1040)">'
                f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="26" fill="url(#card)" stroke="{BRWN}" stroke-width="9"/>'
                f'<rect x="{x + 18}" y="{y + 18}" width="{w - 36}" height="{h - 36}" rx="14" fill="none" stroke="{MUST}" stroke-width="3"/>'
                + inner + '</g>')
    cards = card(-16, 'K', 'H') + card(16, 'Q', 'D') + card(0, 'A', 'S', True)
    ci = font('corm700i')
    t, _ = ci.text('Bridge 125', 600, 1240, 170, tracking=-.01, anchor='middle')
    shadow = ''.join(f'<path d="{t}" transform="translate({o} {o})" fill="{c}"/>' for o, c in ((15, BRWN), (10, RUBY), (5, ORNG)))
    g7 = font('golos700')
    sub, _ = g7.text('GOOD HANDS ONLY', 600, 1340, 36, tracking=.34, anchor='middle')
    body = (sun + stripes + cards + shadow + f'<path d="{t}" fill="{CREAM}"/>' + f'<path d="{sub}" fill="{MUST}"/>')
    return svg(1200, 1400, body, defs, '70s sunset — Bridge 125')


# ================================================================================================ 9 · Line-art hand
@design('line-art-hand')
def line_hand():
    LW = 7
    ink = INK
    sk = f'stroke="{ink}" stroke-width="{LW}" stroke-linecap="round" stroke-linejoin="round"'
    st = 'fill="none" ' + sk
    PAPERW = '#FBF8F0'
    c7 = font('corm600')
    px, py = 600, 1000
    w, h = 300, 430

    def card(rot, rank, s, ace=False):
        x, y = px - w / 2, py - h + 30
        col = RUBY if s in 'HD' else ink
        idx, _ = c7.text(rank, x + 40, y + 72, 64, anchor='middle')
        k = 34 / 100
        mark = (f'<g transform="translate({x + 40 - 17} {y + 86}) scale({k})"><path d="{suit_d(s)}" fill="none" stroke="{col}" stroke-width="{4 / k:.1f}" stroke-linejoin="round"/></g>')
        center = ''
        if ace:
            K = 150 / 100
            center = f'<g transform="translate({px - 75} {y + h / 2 - 85}) scale({K})"><path d="{suit_d(s)}" fill="none" stroke="{col}" stroke-width="{LW / K:.2f}" stroke-linejoin="round"/></g>'
        return (f'<g transform="rotate({rot} {px} {py})">'
                f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="24" fill="{PAPERW}" {sk}/>'
                f'<path d="{idx}" fill="{col}"/>' + mark + center + '</g>')

    def suit_d(s):
        from svgkit import SUITS
        return SUITS[s]

    palm = (f'<path d="M462 1110C448 1180 462 1240 496 1290C506 1310 510 1340 510 1380H650C650 1336 656 1306 668 1284C700 1226 716 1140 700 1050L600 990Z" fill="{PAPERW}"/>'
            f'<path d="M462 1110C448 1180 462 1240 496 1290C506 1310 510 1340 510 1380" {st}/>'
            f'<path d="M700 1050C716 1140 700 1226 668 1284C656 1306 650 1336 650 1380" {st}/>')
    fingers = (f'<path d="M754 958C776 966 786 990 776 1010C768 1026 748 1028 734 1018" {st}/>')
    cards = ''.join(card(r, rk, s, ace) for r, rk, s, ace in ((-32, '7', 'C', False), (-16, '8', 'H', False), (0, '9', 'S', False), (16, 'J', 'D', False), (32, 'A', 'S', True)))
    thumb = (f'<path d="M462 1112C474 1046 540 974 604 934C630 918 660 922 662 946C664 966 646 980 624 996C596 1016 572 1046 560 1086" fill="{PAPERW}"/>'
             f'<path d="M462 1112C474 1046 540 974 604 934C630 918 660 922 662 946C664 966 646 980 624 996C596 1016 572 1046 560 1086" {st}/>'
             f'<path d="M616 942C628 932 646 932 650 946C648 958 634 964 622 960" fill="none" stroke="{ink}" stroke-width="4" stroke-linecap="round"/>'
             f'<path d="M520 1034C530 1026 542 1024 552 1030" fill="none" stroke="{ink}" stroke-width="4" stroke-linecap="round"/>')
    cuff = f'<path d="M490 1380H672" {st}/><path d="M486 1398H676" fill="none" stroke="{ink}" stroke-width="3" stroke-linecap="round" opacity=".6"/>'
    ci = font('corm600i')
    t, _ = ci.text('good hand.', 600, 230, 130, anchor='middle')
    g6 = font('golos600')
    sub, _ = g6.text('BRIDGE 125', 600, 300, 28, tracking=.42, anchor='middle')
    body = (palm + fingers + cards + thumb + cuff + f'<path d="{t}" fill="{ink}"/>' + f'<path d="{sub}" fill="{RUBY}"/>')
    return svg(1200, 1420, body, '', 'Good hand — line art — Bridge 125')


# ================================================================================================ 10 · Seven next draws one (mug wrap)
@design('seven-rules')
def seven():
    W, H = 2550, 1050
    g8, g7, g6 = font('golos800'), font('golos700'), font('golos600')
    c7 = font('corm700')
    defs = lin('card', [(0, '#FFFFFF'), (1, '#F2EBDA')]) + GOLDDEF

    def mini(x, y, w, rank, s, rot=0):
        h = w * 1.4
        col = RUBY if s in 'HD' else INK
        idx, _ = c7.text(rank, x + w * .2, y + h * .24, w * .3, anchor='middle')
        return (f'<g transform="rotate({rot} {x + w / 2} {y + h / 2})">'
                f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{w * .1}" fill="url(#card)" stroke="{INK}" stroke-width="{max(3, w * .03):.1f}"/>'
                f'<path d="{idx}" fill="{col}"/>' + suit(s, x + w * .2, y + h * .34, w * .15, col)
                + suit(s, x + w / 2, y + h * .58, w * .42, col) + '</g>')

    # front panel (left of the handle) — the headline, centred on x = W/4
    FX = W / 4
    seven_card = mini(FX - 400, 200, 210, '7', 'C', -9)
    badge = (f'<circle cx="{FX - 200}" cy="220" r="66" fill="{RUBY}"/><circle cx="{FX - 200}" cy="220" r="56" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="3 9"/>')
    p1, _ = g8.text('+1', FX - 200, 245, 70, anchor='middle')
    badge += f'<path d="{p1}" fill="#fff"/>'
    tx = FX - 120
    h1, w1 = g8.text('SEVEN?', tx, 330, 124, tracking=-.01)
    h2, _ = g8.text('NEXT', tx + 4, 428, 76, tracking=.02)
    h3, w3 = g8.text('DRAWS ONE.', tx + 4, 520, 76, tracking=.02)
    under = f'<path d="M{tx + 6} 566H{tx + max(w1, w3)}" stroke="{GOLD}" stroke-width="9" stroke-linecap="round"/>'
    suits_row = ''.join(suit(sv, FX - 135 + i * 90, 700, 54, RUBY if sv in 'HD' else INK) for i, sv in enumerate('SHDC'))
    foot, fw = g6.text('BRIDGE 125  ·  HOUSE RULES', FX + 20, 820, 28, tracking=.4, anchor='middle')
    left = (seven_card + badge + f'<path d="{h1}" fill="{RUBY}"/><path d="{h2}" fill="{INK}"/><path d="{h3}" fill="{INK}"/>' + under
            + suits_row + f'<path d="{foot}" fill="{INK}" opacity=".55"/>' + spade(FX + 20 - fw / 2 - 26, 810, 30, GOLD))

    # back panel (right of the handle) — the house rules as tiles, centred on x = 3W/4
    tiles = [('A', 'S', 'SKIP', FELT), ('6', 'H', 'COVER IT', GOLD_LO), ('8', 'C', '+2', RUBY),
             ('9', 'D', 'ANY SUIT', FELT), ('J', 'S', 'PICK SUIT', GOLD_LO), ('Q', 'S', '+5', RUBY)]
    tw, th, gap = 240, 270, 20
    tx0, ty0 = 3 * W / 4 - (3 * tw + 2 * gap) / 2, 120
    tl = ''
    for i, (rk, s, cap, col) in enumerate(tiles):
        cx_ = tx0 + (i % 3) * (tw + gap)
        cy_ = ty0 + (i // 3) * (th + gap)
        capd, cw = g7.text(cap, cx_ + tw / 2, cy_ + th - 32, 30, tracking=.06, anchor='middle')
        pill_w = cw + 40
        tl += (f'<rect x="{cx_}" y="{cy_}" width="{tw}" height="{th}" rx="32" fill="{IVORY}"/>'
               + mini(cx_ + tw / 2 - 58, cy_ + 30, 116, rk, s, (i % 2 * 2 - 1) * 5)
               + f'<rect x="{cx_ + tw / 2 - pill_w / 2}" y="{cy_ + th - 76}" width="{pill_w}" height="60" rx="30" fill="{col}"/>'
               + f'<path d="{capd}" fill="#fff"/>')
    by = ty0 + 2 * (th + gap)
    kings = ''.join(mini(tx0 + 40 + i * 60, by + 22, 86, 'K', s, (i - 1.5) * 7) for i, s in enumerate('SHCD'))
    kd, _ = g7.text('×4 = RESET', tx0 + 360, by + 92, 46, tracking=.04)
    b1, _ = g6.text('EXACTLY 125 BURNS TO 0', tx0 + 360, by + 134, 24, tracking=.12)
    tl += (f'<rect x="{tx0}" y="{by}" width="{3 * tw + 2 * gap}" height="168" rx="32" fill="{IVORY}"/>' + kings
           + f'<path d="{kd}" fill="{INK}"/><path d="{b1}" fill="{RUBY}"/>')
    body = left + tl
    return svg(W, H, body, defs, 'Seven? Next draws one — Bridge 125 mug wrap')
