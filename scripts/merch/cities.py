"""Bridge 125 merch — City editions: "Bridge 125 · <City> Salon" retro travel posters + round badges.

One poster (3:4, full bleed) and one badge (round, transparent — tees, mugs, totes, stickers) per Journey home city.
Landmarks are simplified original silhouettes; no flags, coats of arms or political symbols. Registers into
designs.DESIGNS as  city-<id>  (poster) and  badge-<id>  (badge).
"""
from __future__ import annotations

import math

import artkit as K
from artkit import P, fit_text, rng, sparkle, suit_el
from collection import BACKGROUNDS
from designs import design
from svgkit import font, lin, rad, svg

W, H = 1200, 1600
HZ = 1180          # horizon (water line) for most cities


# ------------------------------------------------------------------------------------------------ shape helpers
def R_(x, y, w, h, fill, rx=0, extra=''):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" {extra}/>'


def poly(pts, fill, extra=''):
    return f'<path d="M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + f'Z" fill="{fill}" {extra}/>'


def smooth(pts, close_to=None):
    """Catmull-Rom → cubic Bézier through pts; optionally close down to y=close_to."""
    d = f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    if close_to is not None:
        d += f'L{pts[-1][0]:.1f} {close_to}L{pts[0][0]:.1f} {close_to}Z'
    return d


def windows(x, y, w, h, cols, rows, fill, op=.6, arch=False, gx=.45, gy=.5):
    out = ''
    cw, rh = w / cols, h / rows
    ww, wh = cw * gx, rh * gy
    for i in range(cols):
        for j in range(rows):
            wx, wy = x + i * cw + (cw - ww) / 2, y + j * rh + (rh - wh) / 2
            if arch:
                out += f'<path d="M{wx:.1f} {wy + wh:.1f}V{wy + ww / 2:.1f}A{ww / 2:.1f} {ww / 2:.1f} 0 0 1 {wx + ww:.1f} {wy + ww / 2:.1f}V{wy + wh:.1f}Z" fill="{fill}" opacity="{op}"/>'
            else:
                out += f'<rect x="{wx:.1f}" y="{wy:.1f}" width="{ww:.1f}" height="{wh:.1f}" fill="{fill}" opacity="{op}"/>'
    return out


def spire(cx, base, w, h, fill, tiers=1):
    """Tower (w wide) with a tall pointed roof; total height h."""
    th = h * .45
    out = R_(cx - w / 2, base - th, w, th, fill)
    y = base - th
    rest = h - th
    if tiers > 1:
        for t in range(tiers - 1):
            tw = w * (.8 - t * .2)
            seg = rest * .22
            out += poly([(cx - w * .62 + t * w * .1, y), (cx - tw / 2, y - seg * .6), (cx - tw / 2, y - seg), (cx + tw / 2, y - seg), (cx + tw / 2, y - seg * .6), (cx + w * .62 - t * w * .1, y)], fill)
            y -= seg
            rest -= seg
            w = tw
    out += poly([(cx - w * .6, y), (cx, y - rest), (cx + w * .6, y)], fill)
    return out


def onion(cx, y, r, fill, extra_fill=None, drum=0.0, drum_fill=None):
    """Onion dome sitting on y (bottom of the bulb), optional drum below."""
    d = (f'M{cx - r * .55} {y}C{cx - r * 1.25} {y - r * .55} {cx - r * .9} {y - r * 1.25} {cx} {y - r * 2.05}'
         f'C{cx + r * .9} {y - r * 1.25} {cx + r * 1.25} {y - r * .55} {cx + r * .55} {y}Z')
    out = ''
    if drum:
        out += R_(cx - r * .62, y, r * 1.24, drum, drum_fill or fill)
        out += windows(cx - r * .5, y + drum * .15, r, drum * .7, 3, 1, '#000', .25, arch=True)
    out += P(d, fill)
    if extra_fill:
        out += P(f'M{cx - r * .2} {y - r * .3}C{cx - r * .6} {y - r * .8} {cx - r * .3} {y - r * 1.4} {cx - r * .05} {y - r * 1.7}', 'none', extra_fill, r * .12, 'opacity=".55"')
    out += f'<path d="M{cx} {y - r * 2.05}V{y - r * 2.55}" stroke="{fill}" stroke-width="{max(2, r * .09):.1f}" stroke-linecap="round"/>'
    out += f'<circle cx="{cx}" cy="{y - r * 2.15}" r="{r * .12:.1f}" fill="{fill}"/>'
    return out


def dome(cx, y, r, fill, lantern=True):
    out = f'<path d="M{cx - r} {y}A{r} {r * .95} 0 0 1 {cx + r} {y}Z" fill="{fill}"/>'
    if lantern:
        out += R_(cx - r * .13, y - r * .95 - r * .28, r * .26, r * .3, fill)
        out += poly([(cx - r * .16, y - r * 1.23), (cx, y - r * 1.48), (cx + r * .16, y - r * 1.23)], fill)
    return out


def cone_tower(cx, base, w, h, wall, roof, roof_h=None):
    rh = roof_h or w * 1.1
    return R_(cx - w / 2, base - h, w, h, wall) + poly([(cx - w * .62, base - h), (cx, base - h - rh), (cx + w * .62, base - h)], roof)


def gable_house(x, base, w, h, fill, roof, roof_h=None, win=None, kind='gable'):
    rh = roof_h if roof_h is not None else w * .5
    out = R_(x, base - h, w, h, fill)
    if kind == 'gable':
        out += poly([(x - 4, base - h), (x + w / 2, base - h - rh), (x + w + 4, base - h)], roof)
    elif kind == 'step':
        st = 4
        pts = [(x, base - h)]
        for i in range(st):
            yy = base - h - rh * (i + 1) / st
            pts += [(x + w * .5 * i / st, yy + rh / st * 0), (x + w * .5 * i / st, yy)]
        pts += [(x + w / 2 - w * .08, base - h - rh), (x + w / 2 + w * .08, base - h - rh)]
        for i in range(st - 1, -1, -1):
            yy = base - h - rh * (i + 1) / st
            pts += [(x + w - w * .5 * i / st, yy), (x + w - w * .5 * i / st, yy + rh / st)]
        out += poly(pts, fill)
    elif kind == 'curvy':
        out += P(f'M{x} {base - h}C{x} {base - h - rh * .6} {x + w * .25} {base - h - rh * .4} {x + w * .3} {base - h - rh * .75}'
                 f'C{x + w * .38} {base - h - rh * 1.1} {x + w * .62} {base - h - rh * 1.1} {x + w * .7} {base - h - rh * .75}'
                 f'C{x + w * .75} {base - h - rh * .4} {x + w} {base - h - rh * .6} {x + w} {base - h}Z', fill)
    elif kind == 'flat':
        out += R_(x - 4, base - h - 10, w + 8, 10, roof)
    if win:
        out += windows(x + w * .1, base - h + h * .08, w * .8, h * .78, win[0], win[1], win[2], win[3] if len(win) > 3 else .55, arch=len(win) > 4 and win[4])
    return out


def tree(cx, base, r, fill, trunk=None):
    out = ''
    if trunk:
        out += R_(cx - r * .1, base - r * 1.2, r * .2, r * 1.2, trunk)
    out += f'<circle cx="{cx}" cy="{base - r * 1.5}" r="{r}" fill="{fill}"/>'
    out += f'<circle cx="{cx - r * .6}" cy="{base - r * 1.15}" r="{r * .7}" fill="{fill}"/><circle cx="{cx + r * .6}" cy="{base - r * 1.2}" r="{r * .72}" fill="{fill}"/>'
    return out


def palm(cx, base, h, fill, lean=10):
    tx, ty = cx + lean, base - h
    trunk = P(f'M{cx - 9} {base}Q{cx + lean * .2} {base - h * .55} {tx - 4} {ty}L{tx + 4} {ty}Q{cx + lean * .4 + 6} {base - h * .5} {cx + 9} {base}Z', fill)
    fr = ''
    for a, L in ((-160, 1.0), (-130, 1.1), (-95, .8), (-60, 1.1), (-25, 1.0), (10, .8), (-200, .8)):
        rr = 130 * L
        ex, ey = tx + rr * math.cos(math.radians(a)), ty + rr * math.sin(math.radians(a))
        mx, my = tx + rr * .55 * math.cos(math.radians(a - 12)), ty + rr * .55 * math.sin(math.radians(a - 12)) - 18
        fr += P(f'M{tx} {ty}Q{mx:.1f} {my:.1f} {ex:.1f} {ey + 26:.1f}Q{mx + 8:.1f} {my + 18:.1f} {tx} {ty + 6}Z', fill)
    return trunk + fr


def birds(pts, fill, s=1.0):
    return ''.join(P(f'M{x - 18 * s} {y - 6 * s}Q{x - 8 * s} {y - 12 * s} {x} {y}Q{x + 8 * s} {y - 12 * s} {x + 18 * s} {y - 6 * s}', 'none', fill, 4 * s) for x, y in pts)


def mountains(peaks, base, fill, snow=None, snow_k=.28):
    pts = [(-20, base)] + peaks + [(W + 20, base)]
    out = poly(pts, fill)
    if snow:
        for i, (px, py) in enumerate(peaks):
            if i % 2 == 0 or True:
                left = pts[i] if i < len(pts) else pts[-1]
                right = pts[i + 2]
                k = snow_k
                lx, ly = px + (left[0] - px) * k, py + (left[1] - py) * k
                rx, ry = px + (right[0] - px) * k, py + (right[1] - py) * k
                if ly < base - 40:
                    out += poly([(lx, ly), (px, py), (rx, ry), (px + (rx - px) * .5, ry - (ry - py) * .25), (px, ly + (ry - ly) * .5 + 10), (px - (px - lx) * .5, ly - (ly - py) * .2)], snow)
    return out


def water(y0, y1, c1, c2, stripes, seed=1):
    R = rng(f'water{seed}')
    out = R_(0, y0, W, y1 - y0, c1)
    for k in range(stripes):
        y = y0 + 12 + (y1 - y0 - 24) * (k / max(1, stripes - 1)) ** 1.6
        x = R.uniform(-100, 600)
        w = R.uniform(200, 700)
        out += R_(x, y, w, 4 + k * .6, c2, 2, 'opacity=".55"')
        out += R_(x + w + R.uniform(60, 200), y + 6, R.uniform(80, 300), 3 + k * .5, c2, 2, 'opacity=".4"')
    return out


def skyline(seed, x0, x1, base, hmin, hmax, wmin, wmax, fill, win=None):
    R = rng(seed)
    out, x = '', x0
    while x < x1:
        w = R.uniform(wmin, wmax)
        h = R.uniform(hmin, hmax)
        out += R_(x, base - h, w + 1, h, fill)
        if win:
            out += windows(x + 6, base - h + 10, w - 12, h - 20, max(1, int(w / 22)), max(1, int(h / 30)), win, .35)
        x += w
    return out


def reflection(svg_part, hz, opacity=.22):
    return (f'<clipPath id="wclip"><rect x="0" y="{hz}" width="{W}" height="{H - hz}"/></clipPath>'
            f'<g clip-path="url(#wclip)" opacity="{opacity}"><g transform="translate(0 {2 * hz}) scale(1 -1)">{svg_part}</g></g>')


# ------------------------------------------------------------------------------------------------ cities
CITIES: dict[str, dict] = {}


def city(cid, name, local, num, pal, title_font='anton', local_font='golos800c', badge_cy=960, title_col=None):
    def deco(fn):
        CITIES[cid] = dict(id=cid, name=name, local=local, num=num, pal=pal, scene=fn, title_font=title_font,
                           local_font=local_font, badge_cy=badge_cy)
        return fn
    return deco


@city('riga', 'RIGA', 'Rīga', 1, dict(sky=('#0F5E63', '#3E9C93', '#F6B48C'), sun='#FF7A59', title='#FFF1DC', acc='#FFC857',
                                      band='#0B3B3F', bandtx='#FFF1DC', water=('#1D6E70', '#9FD6CC')))
def riga(p):
    far = skyline('rigafar', 0, W, HZ, 120, 230, 60, 120, '#5FA59B')
    # St. Peter's three-tier spire + Art Nouveau row
    mid = spire(330, HZ - 140, 92, 640, '#185457', tiers=3)
    mid += R_(250, HZ - 260, 170, 260, '#185457')
    houses = ''
    xs = [440, 560, 680, 800, 920]
    cols = ['#E8B28A', '#F3D2A2', '#D98B6A', '#F3C5A8', '#E3A47F']
    for i, x in enumerate(xs):
        h = [300, 340, 280, 360, 310][i]
        houses += gable_house(x, HZ, 120, h, cols[i], cols[i], roof_h=90, win=(3, 6, '#185457', .55, True), kind='curvy')
        houses += f'<circle cx="{x + 60}" cy="{HZ - h - 30}" r="16" fill="#185457" opacity=".5"/>'
        houses += R_(x, HZ - h, 120, 10, '#185457', 0, 'opacity=".35"')
    # cable-stayed bridge on the left
    bridge = (R_(60, HZ - 420, 22, 420, '#0E3A3C') + ''.join(
        P(f'M71 {HZ - 400 + k * 30}L{110 + k * 60} {HZ - 40}', 'none', '#0E3A3C', 3) for k in range(6))
        + R_(0, HZ - 50, 520, 18, '#0E3A3C'))
    near = (R_(0, HZ - 40, W, 40, '#0E3A3C') + tree(1080, HZ - 20, 70, '#0E3A3C', '#0E3A3C') + tree(1150, HZ - 10, 52, '#0E3A3C'))
    return far, mid + houses + bridge, near, birds([(560, 470), (610, 440), (650, 480)], '#0E3A3C')


@city('tallinn', 'TALLINN', 'Tallinn', 2, dict(sky=('#2F5D9E', '#8DB5DE', '#F7D9D4'), sun='#FFE1A8', title='#FFFFFF', acc='#F25C4C',
                                             band='#1E3B6E', bandtx='#FFFFFF', water=('#2C5C8F', '#B9D7F2')))
def tallinn(p):
    far = mountains([(200, HZ - 120), (600, HZ - 90), (1000, HZ - 140)], HZ, '#7FA6D0')
    wall, roof, dark = '#F2E6D3', '#D9483B', '#1E3B6E'
    mid = R_(0, HZ - 180, W, 180, '#C9B79C')  # town wall
    mid += ''.join(R_(x, HZ - 196, 26, 20, '#C9B79C') for x in range(0, W, 44))
    mid += spire(640, HZ - 170, 90, 760, '#2A4E80')   # tall church spire
    mid += R_(590, HZ - 380, 100, 210, '#2A4E80')
    for (x, w, h) in ((150, 110, 380), (330, 90, 300), (860, 100, 340), (1040, 120, 290)):
        mid += cone_tower(x, HZ - 150, w, h, wall, roof, roof_h=w * 1.25)
        mid += windows(x - w * .3, HZ - 150 - h + 30, w * .6, h * .6, 2, 4, dark, .5, arch=True)
    # Fat tower (round) right
    mid += R_(960, HZ - 330, 190, 330, wall) + R_(950, HZ - 345, 210, 20, roof)
    mid += windows(970, HZ - 310, 170, 240, 4, 4, dark, .4, arch=True)
    near = R_(0, HZ - 30, W, 30, dark) + ''.join(gable_house(x, HZ, 70, 90, dark, dark, roof_h=60) for x in (40, 130, 1000, 1090))
    return far, mid, near, birds([(420, 520), (470, 500)], dark)


@city('vilnius', 'VILNIUS', 'Vilnius', 3, dict(sky=('#4B2C6F', '#C2779B', '#FFC9A0'), sun='#FFE08A', title='#FFF4E2', acc='#FFB347',
                                             band='#2E1A47', bandtx='#FFF4E2', water=('#5B3A7A', '#E7B3C6')), badge_cy=900)
def vilnius(p):
    hill = P(smooth([(-20, HZ - 120), (180, HZ - 330), (380, HZ - 380), (560, HZ - 260), (760, HZ - 160), (1220, HZ - 120)], HZ), '#7A4E8E')
    tower = R_(300, HZ - 560, 120, 200, '#8C3B3B') + R_(292, HZ - 570, 136, 16, '#6E2C2C') + windows(310, HZ - 540, 100, 160, 3, 3, '#2E1A47', .5, arch=True)
    far = hill + tower
    bell = spire(820, HZ - 80, 110, 640, '#F4E6D8', tiers=3) + R_(760, HZ - 300, 120, 220, '#F4E6D8')
    bell += windows(770, HZ - 290, 100, 200, 2, 3, '#4B2C6F', .5, arch=True)
    church = R_(560, HZ - 260, 200, 260, '#E9D3C2') + poly([(550, HZ - 260), (660, HZ - 360), (770, HZ - 260)], '#E9D3C2')
    church += spire(590, HZ - 260, 40, 220, '#E9D3C2') + spire(730, HZ - 260, 40, 220, '#E9D3C2')
    mid = skyline('viln', 0, W, HZ, 80, 160, 70, 130, '#A0668F') + church + bell
    # balloons
    bal = ''
    for (x, y, r, c1, c2) in ((180, 360, 64, '#FF6B6B', '#FFD166'), (980, 300, 54, '#4ECDC4', '#FFFFFF'), (620, 230, 40, '#FFD166', '#EF476F'), (1060, 520, 34, '#EF476F', '#FFFFFF')):
        bal += P(f'M{x} {y + r * 1.25}C{x - r * 1.3} {y + r * .3} {x - r} {y - r} {x} {y - r}C{x + r} {y - r} {x + r * 1.3} {y + r * .3} {x} {y + r * 1.25}Z', c1)
        bal += P(f'M{x} {y + r * 1.25}C{x - r * .45} {y + r * .3} {x - r * .35} {y - r} {x} {y - r}C{x + r * .35} {y - r} {x + r * .45} {y + r * .3} {x} {y + r * 1.25}Z', c2)
        bal += R_(x - r * .2, y + r * 1.45, r * .4, r * .3, '#5B3A1E', 3)
        bal += P(f'M{x - r * .2} {y + r * 1.45}L{x - r * .1} {y + r * 1.22}M{x + r * .2} {y + r * 1.45}L{x + r * .1} {y + r * 1.22}', 'none', '#5B3A1E', 2)
    near = R_(0, HZ - 30, W, 30, '#2E1A47') + tree(70, HZ, 60, '#2E1A47') + tree(1140, HZ, 66, '#2E1A47')
    return far, mid, near, bal


@city('warsaw', 'WARSAW', 'Warszawa', 4, dict(sky=('#1C5D99', '#78B7E0', '#FCE7C8'), sun='#FFB703', title='#FFFFFF', acc='#FFB703',
                                            band='#123B63', bandtx='#FFFFFF', water=('#1F6AA5', '#A9D3F5')))
def warsaw(p):
    far = skyline('wawfar', 0, W, HZ - 60, 180, 420, 60, 140, '#5F9DCB')
    far += R_(980, HZ - 620, 70, 560, '#5F9DCB') + poly([(975, HZ - 620), (1015, HZ - 700), (1055, HZ - 620)], '#5F9DCB')
    cols = ['#F4A259', '#E76F51', '#F6D186', '#9BC1BC', '#E9C46A', '#F28482', '#84A59D', '#F5CAC3', '#E07A5F']
    mid = ''
    x = 20
    R = rng('waw')
    i = 0
    while x < 760:
        w = R.uniform(78, 104)
        h = R.uniform(260, 360)
        kind = ['step', 'gable', 'curvy'][i % 3]
        mid += gable_house(x, HZ - 60, w, h, cols[i % len(cols)], cols[i % len(cols)], roof_h=w * .55, win=(3, 5, '#123B63', .45, i % 2 == 0), kind=kind)
        x += w
        i += 1
    # castle clock tower
    mid += R_(800, HZ - 470, 300, 410, '#E8A87C') + windows(810, HZ - 440, 280, 360, 6, 5, '#123B63', .4)
    mid += R_(900, HZ - 680, 100, 210, '#E8A87C') + spire(950, HZ - 680, 100, 260, '#2A6F4E')
    mid += f'<circle cx="950" cy="{HZ - 600}" r="32" fill="#FFF4D6"/><path d="M950 {HZ - 600}V{HZ - 622}M950 {HZ - 600}L966 {HZ - 592}" stroke="#123B63" stroke-width="5" stroke-linecap="round"/>'
    near = R_(0, HZ - 60, W, 60, '#123B63')
    return far, mid, near, birds([(360, 560), (400, 540)], '#123B63')


@city('berlin', 'BERLIN', 'Berlin', 5, dict(sky=('#140F3C', '#5B2A86', '#FF6F91'), sun='#FFC75F', title='#FFFFFF', acc='#00E5FF',
                                          band='#0D0A2A', bandtx='#FFFFFF', water=('#2A1B5E', '#FF6F91')), badge_cy=900)
def berlin(p):
    far = skyline('berfar', 0, W, HZ, 140, 300, 60, 130, '#3F2775', win='#FFC75F')
    tv = (R_(585, HZ - 900, 30, 900, '#1E1450') + f'<circle cx="600" cy="{HZ - 740}" r="70" fill="#1E1450"/>'
          + R_(560, HZ - 690, 80, 14, '#1E1450') + R_(594, HZ - 1020, 12, 130, '#1E1450')
          + ''.join(f'<rect x="{545 + k * 16}" y="{HZ - 748}" width="8" height="14" rx="3" fill="#FFC75F" opacity=".9"/>' for k in range(7))
          + R_(560, HZ - 80, 80, 80, '#1E1450'))
    # bridge with arches and two towers
    br = R_(0, HZ - 150, W, 150, '#8C2F39')
    br += ''.join(f'<path d="M{x} {HZ}V{HZ - 70}A60 60 0 0 1 {x + 120} {HZ - 70}V{HZ}Z" fill="#2A1B5E"/>' for x in range(30, 1200, 160))
    br += ''.join(R_(x, HZ - 150, 30, 20, '#6E2430') for x in range(0, W, 60))
    for x in (300, 820):
        br += R_(x, HZ - 380, 80, 230, '#8C2F39') + poly([(x - 6, HZ - 380), (x + 40, HZ - 450), (x + 86, HZ - 380)], '#6E2430')
        br += windows(x + 8, HZ - 360, 64, 180, 2, 4, '#FFC75F', .7, arch=True)
    mid = tv + br
    near = ''
    stars = ''.join(f'<path d="{sparkle(x, y, r)}" fill="#FFFFFF" opacity=".8"/>' for x, y, r in ((120, 520, 10), (300, 600, 7), (980, 560, 12), (1100, 680, 8), (820, 470, 6)))
    return far, mid, near, stars


@city('kyiv', 'KYIV', 'Київ', 6, dict(sky=('#3D5A98', '#B9A3D6', '#FFD7A8'), sun='#FFE7A3', title='#FFF8E8', acc='#F4C542',
                                     band='#24345E', bandtx='#FFF8E8', water=('#4D6CA8', '#D9CDEE')))
def kyiv(p):
    hills = P(smooth([(-20, HZ - 140), (200, HZ - 260), (520, HZ - 300), (820, HZ - 240), (1220, HZ - 180)], HZ), '#5E7DB8')
    gold, wall = '#E9B949', '#F5F0E6'
    mid = hills
    # monastery: white walls, drums, golden onion domes
    mid += R_(330, HZ - 420, 520, 230, wall) + windows(350, HZ - 400, 480, 200, 8, 2, '#3D5A98', .35, arch=True)
    mid += R_(420, HZ - 520, 340, 110, wall)
    for (cx, y, r, drum) in ((590, HZ - 560, 78, 60), (450, HZ - 520, 46, 50), (730, HZ - 520, 46, 50), (380, HZ - 430, 34, 30), (800, HZ - 430, 34, 30)):
        mid += onion(cx, y - drum, r, gold, '#FFF3C4', drum=drum, drum_fill=wall)
    # bell tower
    mid += R_(950, HZ - 560, 110, 560, wall) + windows(960, HZ - 540, 90, 420, 2, 5, '#3D5A98', .35, arch=True)
    mid += onion(1005, HZ - 560, 46, gold, '#FFF3C4')
    # arch bridge
    br = P(f'M0 {HZ - 40}Q300 {HZ - 260} 600 {HZ - 40}', 'none', '#24345E', 14)
    br += ''.join(P(f'M{x} {HZ - 40}V{HZ - 40 - (260 - 260 * ((x - 300) / 300) ** 2) * .82:.1f}', 'none', '#24345E', 4) for x in range(60, 560, 60))
    # chestnut blossom branch foreground
    near = R_(0, HZ - 40, W, 40, '#24345E') + br
    br2 = ''
    for (x, base, r) in ((1110, HZ + 10, 95), (60, HZ + 10, 70)):
        br2 += tree(x, base, r, '#2F5A43', '#24345E')
        R = rng(f'chestnut{x}')
        for _ in range(9):
            bx, by = x + R.uniform(-r * 1.2, r * 1.2), base - r * 1.5 + R.uniform(-r * .9, r * .5)
            br2 += P(f'M{bx - 8:.1f} {by + 14:.1f}L{bx:.1f} {by - 16:.1f}L{bx + 8:.1f} {by + 14:.1f}Z', '#FFF6EC')
            br2 += f'<circle cx="{bx:.1f}" cy="{by + 4:.1f}" r="3.5" fill="#F48FB1"/>'
    return '', mid, near, br2


@city('bucharest', 'BUCHAREST', 'București', 7, dict(sky=('#7A3E65', '#E39AA6', '#FCE0C4'), sun='#FFF0C2', title='#FFF7EE', acc='#F7C873',
                                                   band='#4C2340', bandtx='#FFF7EE', water=('#8E4F75', '#F2C1C9')))
def bucharest(p):
    far = skyline('bucfar', 0, W, HZ, 140, 260, 70, 130, '#B06C8B')
    cream, shade = '#FBEBD7', '#E7CBB0'
    cx = 600
    ath = R_(cx - 300, HZ - 330, 600, 330, cream)
    ath += f'<path d="M{cx - 230} {HZ - 330}A230 250 0 0 1 {cx + 230} {HZ - 330}Z" fill="{shade}"/>'
    ath += ''.join(P(f'M{cx + k * 36} {HZ - 330}Q{cx + k * 30} {HZ - 470} {cx} {HZ - 575}', 'none', cream, 4) for k in range(-6, 7))
    ath += R_(cx - 24, HZ - 610, 48, 40, shade) + poly([(cx - 30, HZ - 610), (cx, HZ - 640), (cx + 30, HZ - 610)], shade)
    ath += poly([(cx - 220, HZ - 300), (cx, HZ - 380), (cx + 220, HZ - 300)], shade)  # pediment
    ath += R_(cx - 220, HZ - 300, 440, 22, shade)
    ath += ''.join(R_(cx - 200 + k * 76, HZ - 278, 26, 230, shade) for k in range(6))
    ath += R_(cx - 240, HZ - 48, 480, 48, shade)
    trees = ''.join(tree(x, HZ, r, '#4F7A55') for x, r in ((120, 80), (230, 64), (980, 76), (1100, 86)))
    mid = ath + trees
    near = R_(0, HZ - 20, W, 20, '#4C2340')
    return far, mid, near, birds([(300, 520), (340, 500), (900, 560)], '#4C2340')


@city('sofia', 'SOFIA', 'София', 8, dict(sky=('#155E63', '#76B39D', '#F9F0C6'), sun='#F4D35E', title='#FFFDF2', acc='#F4D35E',
                                        band='#0E3F42', bandtx='#FFFDF2', water=('#1C6E73', '#BFE3D3')))
def sofia(p):
    far = P(smooth([(-20, HZ - 260), (250, HZ - 470), (520, HZ - 560), (800, HZ - 470), (1220, HZ - 300)], HZ), '#4E8F86')
    wall, gold, green = '#F6EDD9', '#E8B540', '#3F8F6B'
    cx = 600
    mid = R_(cx - 320, HZ - 300, 640, 300, wall) + windows(cx - 300, HZ - 280, 600, 200, 9, 2, '#155E63', .35, arch=True)
    mid += R_(cx - 120, HZ - 430, 240, 140, wall)
    mid += dome(cx, HZ - 430, 130, gold) + dome(cx - 210, HZ - 300, 70, green) + dome(cx + 210, HZ - 300, 70, green)
    mid += dome(cx - 300, HZ - 300, 40, green, False) + dome(cx + 300, HZ - 300, 40, green, False)
    # bell tower left
    mid += R_(cx - 470, HZ - 470, 120, 470, wall) + windows(cx - 460, HZ - 450, 100, 300, 2, 3, '#155E63', .35, arch=True) + dome(cx - 410, HZ - 470, 64, gold)
    mid += ''.join(tree(x, HZ, r, '#2F6E55') for x, r in ((80, 70), (1080, 80), (1160, 60)))
    near = R_(0, HZ - 24, W, 24, '#0E3F42')
    return far, mid, near, birds([(820, 500), (860, 480)], '#0E3F42')


@city('tbilisi', 'TBILISI', 'თბილისი', 9, dict(sky=('#1F6F78', '#E59C6A', '#FFE3B3'), sun='#FFD07A', title='#FFF6E8', acc='#E9603D',
                                              band='#173F44', bandtx='#FFF6E8', water=('#2B7F87', '#F4C29A')), local_font='geo800', badge_cy=930)
def tbilisi(p):
    ridge = P(smooth([(-20, HZ - 330), (200, HZ - 470), (430, HZ - 520), (700, HZ - 420), (1000, HZ - 300), (1220, HZ - 240)], HZ), '#8C5A44')
    fort = ''.join(R_(x, y - h, 46, h, '#6F4535') + ''.join(R_(x + k * 12, y - h - 12, 8, 12, '#6F4535') for k in range(4))
                   for x, y, h in ((180, HZ - 455, 90), (300, HZ - 500, 120), (430, HZ - 520, 100), (560, HZ - 480, 80)))
    fort += P(f'M180 {HZ - 455}L300 {HZ - 500}L430 {HZ - 520}L560 {HZ - 480}', 'none', '#6F4535', 16)
    far = ridge + fort
    # stacked houses with carved balconies
    cols = ['#F2D0A4', '#E9A178', '#D46A4E', '#F7E1C1', '#8FC1B5', '#E5B181']
    mid = ''
    R = rng('tbi')
    for row, (y0, n) in enumerate(((HZ - 300, 6), (HZ - 150, 7))):
        x = -20 + row * 40
        for i in range(n):
            w = R.uniform(140, 190)
            h = 160
            c = cols[(i + row) % len(cols)]
            mid += gable_house(x, y0 + h, w, h, c, '#8C3F2E', roof_h=40, kind='gable')
            # balcony: lattice band
            mid += R_(x + 10, y0 + 60, w - 20, 50, '#4A8C86')
            mid += ''.join(P(f'M{x + 14 + k * 14} {y0 + 62}V{y0 + 108}', 'none', '#FFF6E8', 2.5) for k in range(int((w - 28) / 14)))
            mid += R_(x + 6, y0 + 56, w - 12, 8, '#2F6560')
            x += w + 6
    # baths: brick domes
    mid += ''.join(dome(x, HZ - 20, 46, '#B45F3C', False) + R_(x - 4, HZ - 80, 8, 20, '#B45F3C') for x in (880, 980, 1080))
    near = R_(0, HZ - 24, W, 24, '#173F44')
    near += P(f'M60 {HZ + 70}C260 {HZ + 10} 470 {HZ + 120} 700 {HZ + 40}', 'none', '#7FE0E8', 14, 'opacity=".9"')
    near += ''.join(P(f'M{x} {HZ + 64 - 30 * math.sin((x - 60) / 640 * math.pi)}V{HZ + 110}', 'none', '#7FE0E8', 4, 'opacity=".6"') for x in range(100, 700, 80))
    return far, mid, near, birds([(860, 520), (900, 500)], '#173F44')


@city('yerevan', 'YEREVAN', 'Երևան', 10, dict(sky=('#5B2C6F', '#E9785D', '#FFD6A0'), sun='#FFE29A', title='#FFF4EA', acc='#FFB26B',
                                            band='#3B1D49', bandtx='#FFF4EA', water=('#7A3E7E', '#F3B6A1')), local_font='arm800')
def yerevan(p):
    far = skyline('yerfar', 0, W, HZ - 200, 80, 200, 70, 140, '#B85C6B')
    tuff = '#E89A8A'
    # Cascade: stepped terraces up the hill
    mid = P(smooth([(-20, HZ - 250), (300, HZ - 300), (600, HZ - 640), (900, HZ - 660), (1220, HZ - 600)], HZ), '#9C4D63')
    for k in range(7):
        y = HZ - 120 - k * 72
        w = 420 - k * 26
        x = 600 - w / 2 + k * 12
        mid += R_(x, y - 72, w, 72, '#F2B8A6' if k % 2 else tuff)
        mid += windows(x + 10, y - 66, w - 20, 50, max(2, int(w / 40)), 1, '#5B2C6F', .5, arch=True)
        mid += R_(x + w / 2 - 22, y - 72, 44, 72, '#F7D2C4')
    # pink tuff blocks with arches
    for x, w, h in ((40, 200, 260), (980, 200, 300)):
        mid += R_(x, HZ - h, w, h, tuff) + windows(x + 10, HZ - h + 20, w - 20, h - 40, 3, 4, '#5B2C6F', .5, arch=True)
    near = R_(0, HZ - 24, W, 24, '#3B1D49')
    # apricot branch
    br = P('M-40 980C120 1000 240 960 330 900', 'none', '#4A2A3A', 16)
    for x, y in ((80, 990), (180, 975), (280, 925)):
        br += f'<ellipse cx="{x}" cy="{y - 30}" rx="34" ry="16" fill="#5E8C4A" transform="rotate(-25 {x} {y - 30})"/>'
        br += f'<circle cx="{x + 20}" cy="{y + 14}" r="22" fill="#FFA046"/><circle cx="{x + 14}" cy="{y + 8}" r="7" fill="#FFD08A"/>'
    return far, mid, near, br


@city('baku', 'BAKU', 'Bakı', 11, dict(sky=('#0B1F4B', '#26518C', '#F28F3B'), sun='#FFC15E', title='#FFF3E0', acc='#FF8C42',
                                     band='#08162F', bandtx='#FFF3E0', water=('#123A6B', '#F2A65A')), badge_cy=920)
def baku(p):
    far = P(smooth([(-20, HZ - 200), (300, HZ - 300), (700, HZ - 360), (1000, HZ - 300), (1220, HZ - 240)], HZ), '#1B3D70')
    mid = ''
    # flame towers
    for (x, h, w, c) in ((640, 620, 150, '#FF8C42'), (820, 560, 130, '#F25F3A'), (980, 500, 120, '#FFB45E')):
        b = HZ - 300
        d = f'M{x - w / 2} {b}C{x - w / 2} {b - h * .5} {x - w * .25} {b - h * .8} {x + w * .15} {b - h}C{x + w * .5} {b - h * .65} {x + w / 2} {b - h * .35} {x + w / 2} {b}Z'
        mid += P(d, c) + ''.join(P(f'M{x - w / 2 + 6} {b - k * 40}H{x + w / 2 - 6}', 'none', '#FFF3E0', 2, 'opacity=".35"') for k in range(1, int(h * .8 / 40)))
    # Maiden tower
    mid += R_(180, HZ - 430, 170, 430, '#C9A27A') + R_(340, HZ - 300, 50, 300, '#B48C66') + R_(170, HZ - 440, 190, 16, '#B48C66')
    mid += windows(195, HZ - 410, 140, 360, 2, 6, '#0B1F4B', .45, arch=True)
    mid += skyline('bakmid', 400, 1200, HZ, 60, 140, 60, 120, '#183361', win='#FFC15E')
    near = R_(0, HZ - 30, W, 30, '#08162F') + ''.join(palm(x, HZ - 10, h, '#08162F', l) for x, h, l in ((70, 300, 20), (1120, 340, -24), (1010, 250, 18)))
    return far, mid, near, ''


@city('almaty', 'ALMATY', 'Алматы', 12, dict(sky=('#1D4E89', '#6FA8DC', '#E8F4FF'), sun='#FFF3B0', title='#FFFFFF', acc='#E63946',
                                           band='#123257', bandtx='#FFFFFF', water=('#2D6A9F', '#CFE6FA')))
def almaty(p):
    far = mountains([(120, HZ - 520), (330, HZ - 700), (520, HZ - 560), (760, HZ - 780), (980, HZ - 600), (1150, HZ - 660)], HZ - 120, '#5B7FB0', snow='#F4FAFF', snow_k=.32)
    far += mountains([(200, HZ - 380), (500, HZ - 440), (800, HZ - 360), (1100, HZ - 420)], HZ - 60, '#3E6A9C')
    # Kok-Tobe tower on a hill
    mid = P(smooth([(600, HZ - 120), (820, HZ - 280), (1000, HZ - 300), (1220, HZ - 240)], HZ), '#2E5C84')
    tw = '#E8EEF5'
    mid += P(f'M960 {HZ - 300}L990 {HZ - 760}L1020 {HZ - 300}', 'none', tw, 6) + P(f'M940 {HZ - 300}L990 {HZ - 760}L1040 {HZ - 300}', 'none', tw, 6)
    mid += ''.join(P(f'M{960 - k * 2.5} {HZ - 300 - k * 30}L{1020 + k * 2.5} {HZ - 330 - k * 30}', 'none', tw, 3) for k in range(0, 14))
    mid += R_(985, HZ - 860, 10, 100, tw)
    mid += skyline('alm', 0, 900, HZ, 60, 170, 60, 120, '#244B70', win='#FFF3B0')
    near = R_(0, HZ - 30, W, 30, '#123257')
    # apple branch
    br = P('M-40 1000C120 980 220 1010 360 940', 'none', '#3A2A20', 16)
    for x, y in ((60, 990), (170, 990), (290, 960)):
        br += f'<ellipse cx="{x}" cy="{y - 30}" rx="34" ry="15" fill="#4E8F4A" transform="rotate(-20 {x} {y - 30})"/>'
        br += f'<circle cx="{x + 18}" cy="{y + 18}" r="26" fill="#E63946"/><circle cx="{x + 10}" cy="{y + 10}" r="8" fill="#FF8A8A"/>'
    return far, mid, near, br


@city('tashkent', 'TASHKENT', 'Toshkent', 13, dict(sky=('#0F4C81', '#3FA7B5', '#F7E3B5'), sun='#FFD36E', title='#FFFBEF', acc='#F2A541',
                                                 band='#0A3157', bandtx='#FFFBEF', water=('#1C6E8C', '#B9E4EA')))
def tashkent(p):
    far = skyline('tasfar', 0, W, HZ, 100, 220, 70, 140, '#4F8FAE')
    sand, tile, deep = '#EED5A8', '#20A4B4', '#13617E'
    cx = 600
    mid = R_(cx - 330, HZ - 300, 660, 300, sand)
    # portal (iwan) with pointed arch + tile frame
    mid += R_(cx - 170, HZ - 470, 340, 470, sand) + R_(cx - 150, HZ - 450, 300, 450, tile)
    mid += P(f'M{cx - 100} {HZ}V{HZ - 260}Q{cx - 100} {HZ - 380} {cx} {HZ - 410}Q{cx + 100} {HZ - 380} {cx + 100} {HZ - 260}V{HZ}Z', deep)
    mid += ''.join(f'<path d="{K.star(cx - 130 + i * 52, HZ - 430, 12, 5, 8, 0)}" fill="#FFFBEF" opacity=".8"/>' for i in range(6))
    # ribbed domes
    for dx, r in ((-250, 90), (250, 90), (0, 0)):
        if r:
            mid += R_(cx + dx - r * .7, HZ - 360, r * 1.4, 60, sand)
            mid += f'<path d="M{cx + dx - r} {HZ - 360}C{cx + dx - r} {HZ - 360 - r * 1.3} {cx + dx + r} {HZ - 360 - r * 1.3} {cx + dx + r} {HZ - 360}Z" fill="{tile}"/>'
            mid += ''.join(P(f'M{cx + dx + k * r / 4} {HZ - 360}Q{cx + dx + k * r / 7} {HZ - 360 - r * 1.05} {cx + dx} {HZ - 360 - r * .98}', 'none', deep, 3) for k in range(-3, 4))
    # minarets
    for x in (cx - 380, cx + 380):
        mid += R_(x - 26, HZ - 560, 52, 560, sand) + R_(x - 34, HZ - 580, 68, 30, tile) + dome(x, HZ - 580, 34, tile, False)
        mid += ''.join(R_(x - 26, HZ - 500 + k * 90, 52, 14, tile) for k in range(5))
    near = R_(0, HZ - 30, W, 30, '#0A3157')
    br = P('M1240 990C1100 980 1000 1000 880 940', 'none', '#3B2A1E', 14)
    for x, y in ((1150, 990), (1030, 990), (930, 955)):
        br += f'<ellipse cx="{x}" cy="{y - 28}" rx="30" ry="13" fill="#4E8F4A" transform="rotate(20 {x} {y - 28})"/>'
        br += f'<circle cx="{x - 10}" cy="{y + 20}" r="28" fill="#C0392B"/><path d="M{x - 18} {y - 6}l8 -10l8 10z" fill="#C0392B"/><circle cx="{x - 18}" cy="{y + 12}" r="8" fill="#FF7A6B"/>'
    return far, mid, near, br


@city('madrid', 'MADRID', 'Madrid', 14, dict(sky=('#7A0F1E', '#D7263D', '#F6B93B'), sun='#FFE08A', title='#FFF3D6', acc='#F6B93B',
                                           band='#4E0A14', bandtx='#FFE08A', water=('#A31A2B', '#F6B93B')), badge_cy=940)
def madrid(p):
    far = skyline('madfar', 0, W, HZ, 180, 340, 70, 130, '#A82633', win='#F6B93B')
    cream, slate, gold = '#F7E7CE', '#2B2D42', '#F6B93B'
    x0 = 380
    # Metrópolis-style corner building with dome + golden figure
    mid = R_(x0, HZ - 560, 440, 560, cream)
    mid += ''.join(R_(x0 + 30 + k * 64, HZ - 520, 26, 470, '#E6CFAE') for k in range(7))
    mid += windows(x0 + 20, HZ - 520, 400, 460, 6, 7, slate, .35, arch=True)
    mid += R_(x0 + 100, HZ - 640, 240, 80, cream) + R_(x0 + 90, HZ - 646, 260, 12, gold)
    mid += f'<path d="M{x0 + 110} {HZ - 640}C{x0 + 110} {HZ - 800} {x0 + 330} {HZ - 800} {x0 + 330} {HZ - 640}Z" fill="{slate}"/>'
    mid += ''.join(P(f'M{x0 + 220 + k * 22} {HZ - 640}Q{x0 + 220 + k * 12} {HZ - 760} {x0 + 220} {HZ - 762}', 'none', gold, 3) for k in range(-4, 5))
    fx, fy = x0 + 220, HZ - 790
    mid += P(f'M{fx - 6} {fy}L{fx - 10} {fy - 60}L{fx} {fy - 82}L{fx + 10} {fy - 60}L{fx + 6} {fy}Z', gold)
    mid += P(f'M{fx} {fy - 60}C{fx - 50} {fy - 70} {fx - 70} {fy - 110} {fx - 60} {fy - 140}C{fx - 40} {fy - 110} {fx - 20} {fy - 90} {fx} {fy - 72}Z', gold)
    mid += P(f'M{fx} {fy - 60}C{fx + 50} {fy - 70} {fx + 70} {fy - 110} {fx + 60} {fy - 140}C{fx + 40} {fy - 110} {fx + 20} {fy - 90} {fx} {fy - 72}Z', gold)
    mid += f'<circle cx="{fx}" cy="{fy - 90}" r="9" fill="{gold}"/>'
    # Gran Vía blocks
    mid += gable_house(60, HZ, 260, 380, '#F2D7B6', slate, roof_h=40, win=(5, 7, slate, .35), kind='flat')
    mid += gable_house(880, HZ, 280, 420, '#F2D7B6', slate, roof_h=40, win=(5, 8, slate, .35), kind='flat')
    near = R_(0, HZ - 30, W, 30, '#4E0A14')
    lamps = ''.join(R_(x - 4, HZ - 200, 8, 200, '#4E0A14') + f'<circle cx="{x}" cy="{HZ - 206}" r="16" fill="#FFE08A"/>' for x in (330, 860))
    return far, mid, near, lamps


@city('london', 'LONDON', 'London', 15, dict(sky=('#1B2A4A', '#5C7AA6', '#F2C6A0'), sun='#FFD9A0', title='#FFFFFF', acc='#E63946',
                                           band='#111C33', bandtx='#FFFFFF', water=('#2C426B', '#A9BDD9')))
def london(p):
    far = skyline('lonfar', 0, W, HZ, 120, 260, 60, 130, '#4A6290')
    stone, dark = '#D9C49A', '#1B2A4A'
    # clock tower
    mid = R_(140, HZ - 620, 120, 620, stone) + windows(150, HZ - 420, 100, 380, 2, 6, dark, .35, arch=True)
    mid += R_(130, HZ - 760, 140, 150, stone) + f'<circle cx="200" cy="{HZ - 690}" r="48" fill="#FFF6DD"/>'
    mid += P(f'M200 {HZ - 690}V{HZ - 726}M200 {HZ - 690}L224 {HZ - 676}', 'none', dark, 6)
    mid += poly([(126, HZ - 760), (200, HZ - 980), (274, HZ - 760)], stone) + R_(196, HZ - 1030, 8, 60, stone)
    # tower bridge
    for x in (560, 900):
        mid += R_(x, HZ - 500, 110, 500, stone) + poly([(x - 8, HZ - 500), (x + 55, HZ - 600), (x + 118, HZ - 500)], '#5C6B8A')
        mid += windows(x + 10, HZ - 480, 90, 380, 2, 5, dark, .4, arch=True)
        mid += R_(x - 6, HZ - 610, 10, 40, '#5C6B8A') + R_(x + 106, HZ - 610, 10, 40, '#5C6B8A')
    mid += R_(670, HZ - 440, 230, 34, '#5C9CC9') + R_(670, HZ - 400, 230, 10, '#5C9CC9')
    mid += P(f'M300 {HZ - 160}Q440 {HZ - 280} 560 {HZ - 430}M1010 {HZ - 430}Q1100 {HZ - 280} 1220 {HZ - 180}', 'none', '#5C9CC9', 10)
    mid += R_(280, HZ - 170, 940, 40, '#5C6B8A')
    # double-decker bus on the bridge
    bx, by = 330, HZ - 170
    bus = R_(bx, by - 150, 300, 150, '#E63946', 18) + windows(bx + 12, by - 140, 276, 110, 6, 2, '#FFF6DD', .9)
    bus += R_(bx, by - 72, 300, 10, '#B71C2B') + f'<circle cx="{bx + 60}" cy="{by}" r="22" fill="{dark}"/><circle cx="{bx + 240}" cy="{by}" r="22" fill="{dark}"/>'
    near = ''
    return far, mid + bus, near, birds([(900, 300), (950, 280)], dark)


@city('vienna', 'VIENNA', 'Wien', 16, dict(sky=('#2A1E3F', '#8C4A5A', '#F2C48D'), sun='#F6D06F', title='#FFF6E4', acc='#E7B547',
                                         band='#1F1530', bandtx='#F6D06F', water=('#4A3254', '#E8B98C')), badge_cy=900)
def vienna(p):
    far = skyline('viefar', 0, W, HZ, 120, 240, 70, 140, '#6E3F5A')
    gold, dark = '#E7B547', '#2A1E3F'
    # giant wheel
    cx, cy, r = 820, HZ - 420, 300
    wheel = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{dark}" stroke-width="14"/><circle cx="{cx}" cy="{cy}" r="{r - 26}" fill="none" stroke="{dark}" stroke-width="5"/>'
    wheel += ''.join(P(f'M{cx} {cy}L{cx + r * math.cos(math.radians(a)):.1f} {cy + r * math.sin(math.radians(a)):.1f}', 'none', dark, 4) for a in range(0, 360, 20))
    wheel += ''.join(R_(cx + (r + 2) * math.cos(math.radians(a)) - 22, cy + (r + 2) * math.sin(math.radians(a)), 44, 34, '#C0392B', 6) for a in range(0, 360, 30))
    wheel += P(f'M{cx - 200} {HZ}L{cx} {cy}L{cx + 200} {HZ}', 'none', dark, 16) + f'<circle cx="{cx}" cy="{cy}" r="24" fill="{gold}"/>'
    # cathedral spire with zigzag roof
    cat = R_(120, HZ - 330, 360, 330, '#C7A98B')
    cat += P(f'M110 {HZ - 330}L300 {HZ - 520}L490 {HZ - 330}Z', '#2E6E73')
    cat += ''.join(P(f'M{150 + k * 40} {HZ - 340}l20 -26l20 26', 'none', gold, 6) for k in range(8))
    cat += spire(220, HZ - 330, 80, 720, '#B89878', tiers=2)
    cat += windows(140, HZ - 300, 320, 260, 5, 2, dark, .4, arch=True)
    mid = cat + wheel
    near = R_(0, HZ - 24, W, 24, '#1F1530')
    sp = ''.join(P(f'M{x} {y}m-14 0a14 14 0 1 0 28 0a8 8 0 1 0 -16 0', 'none', gold, 3, 'opacity=".55"') for x, y in ((140, 420), (1060, 360), (980, 600)))
    return far, mid, near, sp


@city('montecarlo', 'MONTE CARLO', 'Monte-Carlo', 17, dict(sky=('#0D5C91', '#3FB6E8', '#FFE2B8'), sun='#FFC872', title='#FFFFFF', acc='#FF8A65',
                                                        band='#0A3E63', bandtx='#FFE2B8', water=('#1479B8', '#9FE2FF')), title_font='abril')
def montecarlo(p):
    far = P(smooth([(-20, HZ - 360), (180, HZ - 560), (420, HZ - 470), (620, HZ - 520), (900, HZ - 380), (1220, HZ - 300)], HZ), '#5E8FA8')
    far += P(smooth([(-20, HZ - 260), (260, HZ - 330), (520, HZ - 290), (860, HZ - 250), (1220, HZ - 200)], HZ), '#7FB0C4')
    cream, roof, gold = '#FFF1DF', '#3E7C8C', '#E8B04A'
    cx = 640
    cas = R_(cx - 300, HZ - 300, 600, 300, cream) + windows(cx - 280, HZ - 280, 560, 240, 8, 2, '#0D5C91', .4, arch=True)
    cas += R_(cx - 110, HZ - 380, 220, 100, cream) + dome(cx, HZ - 380, 110, roof)
    for x in (cx - 300, cx + 220):
        cas += R_(x, HZ - 470, 80, 470, cream) + P(f'M{x - 4} {HZ - 470}C{x - 4} {HZ - 560} {x + 84} {HZ - 560} {x + 84} {HZ - 470}Z', roof)
        cas += R_(x + 36, HZ - 600, 8, 50, gold) + windows(x + 10, HZ - 450, 60, 380, 1, 5, '#0D5C91', .45, arch=True)
    cas += ''.join(R_(cx - 280 + k * 40, HZ - 304, 24, 10, gold) for k in range(15))
    mid = cas + ''.join(palm(x, HZ, h, '#1F5E3A', l) for x, h, l in ((180, 380, 20), (260, 300, -14), (1060, 360, -24)))
    # yachts
    near = ''
    for (x, s) in ((140, 1.0), (820, 1.3), (1040, .9)):
        y = HZ + 110 * s
        near += P(f'M{x} {y}L{x + 220 * s} {y}L{x + 190 * s} {y + 34 * s}L{x + 24 * s} {y + 34 * s}Z', '#FFFFFF')
        near += R_(x + 60 * s, y - 30 * s, 110 * s, 30 * s, '#FFFFFF', 6) + R_(x + 70 * s, y - 22 * s, 90 * s, 10 * s, '#0D5C91', 3)
        near += P(f'M{x + 120 * s} {y - 30 * s}V{y - 180 * s}', 'none', '#FFFFFF', 4)
    return far, mid, near, birds([(380, 420), (420, 400)], '#0A3E63')


# ------------------------------------------------------------------------------------------------ assembly
def sun_disc(cx, cy, r, col, stripes_col, suit='S'):
    out = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{col}"/>'
    for k in range(5):
        y = cy + r * .15 + k * k * 8 + k * 22
        hh = 6 + k * 3.2
        out += f'<rect x="{cx - r}" y="{y:.1f}" width="{2 * r}" height="{hh:.1f}" fill="{stripes_col}"/>'
    out += suit_el(suit, cx, cy - r * .28, r * .42, stripes_col, extra='opacity=".18"')
    return out


def scene(c):
    p = c['pal']
    far, mid, near, extra = c['scene'](p)
    sky = p['sky']
    defs = (lin(f'sky{c["id"]}', [(0, sky[0]), (.55, sky[1]), (1, sky[2])])
            + K.GRAIN)
    sx = {'riga': 760, 'tallinn': 860, 'vilnius': 420, 'warsaw': 420, 'berlin': 860, 'kyiv': 900, 'bucharest': 900, 'sofia': 260,
          'tbilisi': 900, 'yerevan': 600, 'baku': 360, 'almaty': 600, 'tashkent': 860, 'madrid': 900, 'london': 760, 'vienna': 380,
          'montecarlo': 900}.get(c['id'], 600)
    sy = {'almaty': 520, 'yerevan': 560, 'madrid': 640, 'vienna': 560}.get(c['id'], 640)
    body = (f'<rect width="{W}" height="{H}" fill="url(#sky{c["id"]})"/>'
            + sun_disc(sx, sy, 170, p['sun'], sky[2] if c['id'] not in ('berlin', 'baku') else sky[1]))
    w1, w2 = p['water']
    water_svg = water(HZ, H, w1, w2, 9, seed=c['num'])
    body += far + mid + water_svg + reflection(far + mid, HZ, .2) + near + extra
    return defs, body


def poster(cid):
    c = CITIES[cid]
    p = c['pal']
    defs, body = scene(c)
    BACKGROUNDS[f'city-{cid}'] = p['band']
    # title block
    tf = c['title_font']
    name = c['name']
    d, w, size = fit_text(tf, name, W / 2, 410 if tf == 'anton' else 380, 1060, 280 if tf == 'anton' else 200, tracking=.04 if tf == 'anton' else .0)
    sh = f'<g transform="translate(8 8)">{P(d, p["band"], extra="opacity=\".55\"")}</g>'
    title = sh + P(d, p['title'])
    kick, _, _ = fit_text('golos800c', 'BRIDGE 125 · SALON', W / 2, 96, 700, 36, tracking=.5)
    line = P(f'M{W / 2 - 330} 124H{W / 2 - 30}M{W / 2 + 30} 124H{W / 2 + 330}', 'none', p['title'], 3, 'opacity=".7"')
    title += P(kick, p['title']) + line + suit_el('S', W / 2, 124, 30, p['acc'])
    # bottom band
    band = R_(0, 1440, W, 160, p['band'])
    b1, _, _ = fit_text('golos800c', 'CARD ROOMS OF EUROPE · THE JOURNEY', 70, 1512, 760, 30, tracking=.3, anchor='start')
    loc, _, _ = fit_text(c['local_font'], c['local'], 70, 1562, 520, 36, tracking=.08, anchor='start')
    num, _, _ = fit_text('anton', f'NO. {c["num"]:02d}', W - 70, 1556, 300, 90, anchor='end')
    band += P(b1, p['bandtx']) + P(loc, p['acc']) + P(num, p['acc'])
    band += ''.join(suit_el(s, 760 + i * 46, 1546, 30, p['bandtx'], extra='opacity=".85"') for i, s in enumerate('SHDC'))
    grain = f'<rect width="{W}" height="{H}" fill="#000" filter="url(#grain)" opacity=".10"/>'
    inner = f'<rect x="28" y="28" width="{W - 56}" height="{1440 - 56}" fill="none" stroke="{p["title"]}" stroke-width="3" opacity=".55"/>'
    return svg(W, H, body + title + band + inner + grain, defs, f'Bridge 125 · {c["name"].title()} Salon — City edition poster')


def badge(cid):
    c = CITIES[cid]
    p = c['pal']
    defs, body = scene(c)
    S = 1200
    cx = cy = S / 2
    r_in, r_out = 430, 560
    bcy = c['badge_cy']
    k = r_in / 470
    clip = f'<clipPath id="bclip"><circle cx="{cx}" cy="{cy}" r="{r_in}"/></clipPath>'
    win = (f'<g clip-path="url(#bclip)"><g transform="translate({cx} {cy}) scale({k:.4f}) translate({-W / 2} {-bcy})">{body}</g></g>')
    ring = (f'<circle cx="{cx}" cy="{cy}" r="{r_out}" fill="{p["band"]}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r_out - 14}" fill="none" stroke="{p["acc"]}" stroke-width="5"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r_in + 12}" fill="none" stroke="{p["acc"]}" stroke-width="5"/>')
    top_txt = K.arched_text('unb900', f'{c["name"]} SALON', cx, cy, (r_in + r_out) / 2 - 22, 58, tracking=.14, top=True)
    bot_txt = K.arched_text('golos800c', 'BRIDGE 125 · CARD ROOMS OF EUROPE', cx, cy, (r_in + r_out) / 2 - 14, 34, tracking=.24, top=False)
    stars = ''.join(suit_el(s, cx + (r_in + r_out) / 2 * math.cos(math.radians(a)), cy + (r_in + r_out) / 2 * math.sin(math.radians(a)), 34, p['acc'])
                    for s, a in (('S', 180), ('H', 0)))
    body2 = ring + clip + win + P(top_txt, p['title']) + P(bot_txt, p['bandtx'], extra='opacity=".9"') + stars
    return svg(S, S, body2, defs, f'Bridge 125 · {c["name"].title()} Salon — City edition badge')


for _cid in list(CITIES):
    design(f'city-{_cid}')(lambda _c=_cid: poster(_c))
    design(f'badge-{_cid}')(lambda _c=_cid: badge(_c))

CITY_IDS = list(CITIES)
del font, rad
