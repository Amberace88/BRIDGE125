"""Bridge 125 — product mockups rendered in code (SVG/CSS scenes → Chromium → WebP).

    python3 scripts/merch/mockups.py              # all mockups → public/merch/mockups/*.webp
    python3 scripts/merch/mockups.py tee-queen-ink

Scenes are transparent, flat-lay style product shots (the store UI supplies the backdrop). The artwork is the
real design SVG from public/merch/designs, so a mockup always matches the print file.
"""
from __future__ import annotations

import os
import pathlib
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))

from PIL import Image  # noqa: E402

from designs import sym  # noqa: E402
from render import MERCH, browser, render_html  # noqa: E402
from svgkit import FELT, FELT2, FELT_D, GOLD, GOLD_HI, GOLD_LO, INK, IVORY, RUBY, SPADE  # noqa: E402

DESIGNS = os.path.join(MERCH, 'designs')
DECK_PNG = os.path.join(MERCH, 'print', 'deck')
OUT = os.path.join(MERCH, 'mockups')
WEB = os.path.join(MERCH, 'web')
SIZE = 1200

GARMENT = {'ink': ('#1B1C21', '#2A2B31'), 'forest': ('#0E3A2E', '#175343'), 'ruby': ('#7A1B2B', '#97263A'),
           'natural': ('#E6DCC6', '#F1EADB'), 'white': ('#F4F4F2', '#FFFFFF')}


def uri(p):
    return pathlib.Path(p).resolve().as_uri()


def art(name):
    return uri(os.path.join(DESIGNS, name + '.svg'))


def card(name):
    return uri(os.path.join(DECK_PNG, name + '.png'))


COMMON_DEFS = f'''
<filter id="noise" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .55 0"/>
</filter>
<filter id="weave" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="turbulence" baseFrequency=".9 .06" numOctaves="1" seed="3" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .5 0"/>
</filter>
<filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="blur18" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="blur30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="drop" x="-30%" y="-30%" width="160%" height="170%">
  <feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#000" flood-opacity=".38"/>
</filter>
<filter id="dropS" x="-30%" y="-30%" width="160%" height="170%">
  <feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity=".35"/>
</filter>
'''


def page(svg_body: str, defs: str = '', vb=1000) -> str:
    return (f'<!doctype html><html><head><meta charset="utf-8"><style>html,body{{margin:0;background:transparent}}'
            f'svg{{display:block}}</style></head><body>'
            f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{SIZE}" height="{SIZE}" viewBox="0 0 {vb} {vb}">'
            f'<defs>{COMMON_DEFS}{defs}</defs>{svg_body}</svg></body></html>')


def shading(clip: str, base_hi: str, light=True) -> str:
    """Soft fabric light: side falloff + chest highlight + grain, clipped to the garment."""
    return (f'<g clip-path="url(#{clip})">'
            f'<rect width="1000" height="1000" fill="url(#side)" style="mix-blend-mode:multiply"/>'
            f'<ellipse cx="470" cy="380" rx="260" ry="300" fill="{base_hi}" opacity="{.35 if light else .2}" filter="url(#blur30)"/>'
            f'<rect width="1000" height="1000" filter="url(#noise)" opacity=".16" style="mix-blend-mode:overlay"/>'
            '</g>')


SIDE = ('<linearGradient id="side" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/>'
        '<stop offset=".22" stop-color="#000" stop-opacity=".08"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/>'
        '<stop offset=".78" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>')


# ------------------------------------------------------------------------------------------------ apparel
TEE = sym((500, 150), [((540, 150), (566, 152), (584, 156)), ((634, 172), (690, 186), (738, 204)),
                       ((794, 236), (850, 322), (878, 418)), ((850, 434), (816, 448), (786, 458)),
                       ((764, 420), (736, 378), (716, 350)), ((714, 520), (722, 720), (728, 884)),
                       ((652, 896), (572, 900), (500, 900))], cx=500)


def tee(design: str, colour: str, art_w=330, art_y=262, aspect=1400 / 1200):
    base, hi = GARMENT[colour]
    folds = (f'<path d="M300 520C330 640 320 760 300 880" stroke="#000" stroke-width="26" opacity=".18" filter="url(#blur18)" fill="none"/>'
             f'<path d="M690 470C660 610 690 760 668 880" stroke="#000" stroke-width="30" opacity=".16" filter="url(#blur18)" fill="none"/>'
             f'<path d="M420 840C470 800 560 810 600 860" stroke="#fff" stroke-width="22" opacity=".06" filter="url(#blur18)" fill="none"/>'
             f'<path d="M284 350C300 380 300 420 290 470" stroke="#000" stroke-width="22" opacity=".3" filter="url(#blur18)" fill="none"/>'
             f'<path d="M716 350C700 380 700 420 710 470" stroke="#000" stroke-width="22" opacity=".3" filter="url(#blur18)" fill="none"/>'
             f'<path d="M150 410L230 380M850 410L770 380" stroke="#000" stroke-width="10" opacity=".25" filter="url(#blur8)"/>')
    collar_in = 'M416 156C440 150 470 148 500 148C530 148 560 150 584 156C566 196 536 214 500 214C464 214 434 196 416 156Z'
    rib = 'M416 156C434 196 464 214 500 214C536 214 566 196 584 156'
    art_h = art_w * aspect
    body = (f'<clipPath id="tc"><path d="{TEE}"/></clipPath>'
            f'<g filter="url(#drop)"><path d="{TEE}" fill="{base}"/></g>'
            f'<path d="{collar_in}" fill="#000" opacity=".45"/>'
            f'<path d="M430 160C460 172 540 172 570 160" stroke="#000" stroke-width="10" opacity=".35" fill="none" filter="url(#blur8)"/>'
            f'<image href="{art(design)}" x="{500 - art_w / 2}" y="{art_y}" width="{art_w}" height="{art_h}" opacity=".97"/>'
            + shading('tc', hi) + f'<g clip-path="url(#tc)">{folds}</g>'
            + f'<path d="{rib}" stroke="{hi}" stroke-width="16" fill="none" opacity=".9"/>'
            f'<path d="{rib}" stroke="#000" stroke-width="16" fill="none" opacity=".25" stroke-dasharray="2 3"/>'
            f'<path d="M180 402L234 382M820 402L766 382" stroke="#fff" stroke-width="2" opacity=".12" stroke-dasharray="6 5"/>'
            f'<path d="M280 872C420 884 580 884 720 872" stroke="#fff" stroke-width="2" opacity=".1" stroke-dasharray="6 5" fill="none"/>')
    return page(body, SIDE)


HOODIE = sym((500, 200), [((540, 200), (570, 196), (592, 190)), ((650, 206), (710, 222), (748, 244)),
                          ((800, 300), (832, 430), (846, 560)), ((852, 650), (860, 730), (862, 790)),
                          ((836, 800), (800, 806), (772, 806)), ((762, 700), (752, 620), (742, 560)),
                          ((738, 500), (736, 460), (734, 420)), ((736, 560), (740, 700), (742, 800)),
                          ((660, 808), (580, 812), (500, 812))], cx=500)


def hoodie(design: str, colour: str, art_w=300, art_y=360, aspect=920 / 1200):
    base, hi = GARMENT[colour]
    hood = 'M352 236C340 150 400 70 500 66C600 70 660 150 648 236C620 214 560 200 500 200C440 200 380 214 352 236Z'
    hood_in = 'M398 214C410 150 450 116 500 114C550 116 590 150 602 214C580 204 540 198 500 198C460 198 420 204 398 214Z'
    opening = 'M408 214C430 246 470 268 500 300C530 268 570 246 592 214C560 204 530 200 500 200C470 200 440 204 408 214Z'
    pocket = 'M376 600L624 600L672 760L328 760Z'
    waist = 'M258 800C420 812 580 812 742 800L742 856C580 868 420 868 258 856Z'
    ribs = ''.join(f'<path d="M{x} {806 if 280 < x < 720 else 802}V{856}" stroke="#000" stroke-width="2" opacity=".22"/>' for x in range(266, 740, 9))
    cuffs = (f'<path d="M772 806L862 790L866 850L776 860Z" fill="{base}"/>' f'<path d="M228 806L138 790L134 850L224 860Z" fill="{base}"/>')
    cuff_ribs = ''.join(f'<path d="M{x} 800L{x + 2} 856M{1000 - x} 800L{998 - x} 856" stroke="#000" stroke-width="2" opacity=".22"/>' for x in range(780, 862, 8))
    strings = (f'<path d="M462 246C452 270 448 300 440 336" stroke="{IVORY}" stroke-width="7" fill="none" stroke-linecap="round"/>'
               f'<path d="M538 246C548 270 554 296 560 330" stroke="{IVORY}" stroke-width="7" fill="none" stroke-linecap="round"/>'
               f'<rect x="433" y="334" width="14" height="28" rx="4" fill="{GOLD}" transform="rotate(12 440 348)"/>'
               f'<rect x="553" y="328" width="14" height="28" rx="4" fill="{GOLD}" transform="rotate(-10 560 342)"/>')
    art_h = art_w * aspect
    body = (f'<clipPath id="hc"><path d="{HOODIE}"/><path d="{waist}"/><path d="{hood}"/></clipPath>'
            f'<g filter="url(#drop)"><path d="{hood}" fill="{base}"/><path d="{HOODIE}" fill="{base}"/><path d="{waist}" fill="{base}"/>{cuffs}</g>'
            f'<path d="{hood_in}" fill="#000" opacity=".5"/>'
            f'<image href="{art(design)}" x="{500 - art_w / 2}" y="{art_y}" width="{art_w}" height="{art_h}" opacity=".97"/>'
            f'<path d="{pocket}" fill="{base}" stroke="#000" stroke-opacity=".3" stroke-width="3"/>'
            f'<path d="M382 606L334 756M618 606L666 756" stroke="#000" stroke-width="8" opacity=".35" filter="url(#blur8)"/>'
            f'<path d="{pocket}" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2" stroke-dasharray="6 5" transform="translate(0 6) scale(1 .985)"/>'
            + shading('hc', hi)
            + f'<path d="{opening}" fill="{base}"/><path d="{opening}" fill="#000" opacity=".18"/>'
            f'<path d="M408 214C430 246 470 268 500 300C530 268 570 246 592 214" fill="none" stroke="{hi}" stroke-width="10" opacity=".7"/>'
            + ribs + cuff_ribs + strings
            + f'<g clip-path="url(#hc)"><path d="M300 560C330 660 320 740 300 800" stroke="#000" stroke-width="28" opacity=".2" filter="url(#blur18)" fill="none"/>'
            f'<path d="M700 520C670 620 690 720 680 800" stroke="#000" stroke-width="28" opacity=".18" filter="url(#blur18)" fill="none"/></g>')
    return page(body, SIDE)


def cap(colour: str):
    base, hi = GARMENT[colour]
    crown = 'M262 600C262 400 360 270 500 262C640 270 738 400 738 600C640 580 360 580 262 600Z'
    brim = 'M236 584C330 548 670 548 764 584C770 650 670 712 500 714C330 712 230 650 236 584Z'
    body = (f'<clipPath id="cc"><path d="{crown}"/></clipPath><clipPath id="brimC"><path d="{brim}"/></clipPath>'
            f'<radialGradient id="dome" cx=".42" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".22"/>'
            f'<stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>'
            f'<radialGradient id="brimG" cx=".5" cy=".1" r=".9"><stop offset="0" stop-color="#000" stop-opacity=".55"/>'
            f'<stop offset=".35" stop-color="#fff" stop-opacity=".1"/><stop offset=".8" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>'
            f'<g filter="url(#drop)"><path d="{brim}" fill="{base}"/><path d="{crown}" fill="{base}"/></g>'
            f'<g clip-path="url(#cc)">'
            f'<path d="M500 262C470 380 470 480 500 590" stroke="#000" stroke-width="3" opacity=".35" fill="none"/>'
            f'<path d="M500 262C410 330 360 460 352 590M500 262C590 330 640 460 648 590" stroke="#000" stroke-width="3" opacity=".3" fill="none"/>'
            f'<path d="M500 262C410 330 360 460 352 590M500 262C590 330 640 460 648 590" stroke="#fff" stroke-width="2" opacity=".12" fill="none" stroke-dasharray="5 5" transform="translate(6 0)"/>'
            f'<rect width="1000" height="1000" fill="url(#dome)"/>'
            f'<rect width="1000" height="1000" filter="url(#weave)" opacity=".18" style="mix-blend-mode:overlay"/></g>'
            + ''.join(f'<circle cx="{x}" cy="{y}" r="6" fill="#000" opacity=".45"/><circle cx="{x}" cy="{y}" r="9" fill="none" stroke="{hi}" stroke-width="2"/>' for x, y in ((404, 360), (596, 360)))
            + f'<circle cx="500" cy="266" r="16" fill="{hi}"/><circle cx="500" cy="263" r="12" fill="{base}"/>'
            # embroidered mark: the logo with a thread texture
            + f'<g transform="translate(410 380) scale(.9)" style="filter:drop-shadow(0 2px 1px rgba(0,0,0,.5))">'
            + ''.join(f'<g transform="rotate({a} 100 182)"><rect x="62" y="28" width="76" height="112" rx="11" fill="{base}" stroke="{GOLD}" stroke-width="8"/></g>' for a in (-22, 22, 0))
            + f'<g transform="translate(80 64) scale(.4)"><path d="{SPADE}" fill="{GOLD}"/></g></g>'
            + f'<path d="{brim}" fill="url(#brimG)" clip-path="url(#brimC)"/>'
            + ''.join(f'<path d="M{262 + k * 22} {600 + k * 6}C{300 + k * 20} {650 - k * 4} {400} {692 - k * 14} 500 {694 - k * 14}C{600} {692 - k * 14} {700 - k * 20} {650 - k * 4} {738 - k * 22} {600 + k * 6}" stroke="#fff" stroke-width="2" opacity=".14" stroke-dasharray="6 5" fill="none"/>' for k in range(4))
            + f'<path d="M262 600C360 580 640 580 738 600" stroke="#000" stroke-width="12" opacity=".5" filter="url(#blur8)" fill="none"/>')
    return page(body)


# ------------------------------------------------------------------------------------------------ home & accessories
def mug(view: str):
    """11 oz white ceramic mug; `view` = 'front' (headline panel) or 'back' (rule tiles)."""
    x0, x1, y0, y1 = 300, 680, 250, 760
    rx, ry = (x1 - x0) / 2, 36
    cx = (x0 + x1) / 2
    body_d = f'M{x0} {y0}V{y1}A{rx} {ry} 0 0 0 {x1} {y1}V{y0}A{rx} {ry} 0 0 1 {x0} {y0}Z'
    # the 2550 x 1050 wrap; show the visible slice
    wrap_h = (y1 - y0) - 40
    wrap_w = wrap_h * 2550 / 1050
    offset = (x1 - x0) / 2 - (.25 if view == 'front' else .75) * wrap_w
    handle = (f'<path d="M{x1 - 8} 340C800 330 830 420 812 500C796 580 740 640 {x1 - 8} 650" fill="none" stroke="#E4E3DF" stroke-width="54" stroke-linecap="round"/>'
              f'<path d="M{x1 - 8} 340C800 330 830 420 812 500C796 580 740 640 {x1 - 8} 650" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" opacity=".7" transform="translate(-6 -6)"/>')
    body = (f'<clipPath id="mc"><path d="{body_d}"/></clipPath>'
            f'<linearGradient id="cyl" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".18" stop-color="#000" stop-opacity=".06"/>'
            f'<stop offset=".32" stop-color="#fff" stop-opacity=".7"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/>'
            f'<stop offset=".8" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>'
            f'<radialGradient id="inside" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#c9c7c1"/><stop offset="1" stop-color="#f2f1ee"/></radialGradient>'
            f'<ellipse cx="{cx}" cy="{y1 + 26}" rx="{rx * 1.05}" ry="34" fill="#000" opacity=".35" filter="url(#blur18)"/>'
            + handle
            + f'<path d="{body_d}" fill="#F6F5F2"/>'
            f'<g clip-path="url(#mc)"><image href="{art("seven-rules")}" x="{x0 + offset}" y="{y0 + 30}" width="{wrap_w}" height="{wrap_h}"/>'
            f'<rect x="{x0}" y="0" width="{x1 - x0}" height="1000" fill="url(#cyl)"/></g>'
            f'<ellipse cx="{cx}" cy="{y0}" rx="{rx}" ry="{ry}" fill="url(#inside)" stroke="#fff" stroke-width="6"/>'
            f'<ellipse cx="{cx}" cy="{y0}" rx="{rx - 3}" ry="{ry - 3}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/>')
    return page(body)


def framed_poster(design: str, frame='#141418', aspect=4 / 3, ext='svg'):
    fw = 520
    fh = fw * aspect + 20
    x, y = 500 - fw / 2, 500 - fh / 2
    border, mat = 26, 34
    px, py, pw = x + border + mat, y + border + mat, fw - 2 * (border + mat)
    ph = fh - 2 * (border + mat)
    href = art(design)
    body = (f'<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/>'
            f'<stop offset=".45" stop-color="#fff" stop-opacity=".02"/><stop offset=".46" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
            f'<linearGradient id="bevel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>'
            f'<g filter="url(#drop)"><rect x="{x}" y="{y}" width="{fw}" height="{fh}" fill="{frame}"/></g>'
            f'<rect x="{x}" y="{y}" width="{fw}" height="{fh}" fill="url(#bevel)"/>'
            f'<rect x="{x + border}" y="{y + border}" width="{fw - 2 * border}" height="{fh - 2 * border}" fill="#F7F5EF"/>'
            f'<rect x="{x + border}" y="{y + border}" width="{fw - 2 * border}" height="{fh - 2 * border}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="6" filter="url(#blur8)"/>'
            f'<rect x="{px - 2}" y="{py - 2}" width="{pw + 4}" height="{ph + 4}" fill="#d9d4c7"/>'
            f'<image href="{href}" x="{px}" y="{py}" width="{pw}" height="{ph}" preserveAspectRatio="xMidYMid slice"/>'
            f'<rect x="{x + border}" y="{y + border}" width="{fw - 2 * border}" height="{fh - 2 * border}" fill="url(#glass)"/>')
    del ext
    return page(body)


def phone(design: str):
    w, h = 330, 670
    x, y = 500 - w / 2, 500 - h / 2
    body = (f'<radialGradient id="caseBg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="{FELT2}"/><stop offset=".7" stop-color="{FELT}"/><stop offset="1" stop-color="{FELT_D}"/></radialGradient>'
            f'<linearGradient id="edge" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".08" stop-color="#fff" stop-opacity="0"/>'
            f'<stop offset=".92" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>'
            f'<clipPath id="pc"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="56"/></clipPath>'
            f'<g transform="rotate(-9 500 500)">'
            f'<g filter="url(#drop)"><rect x="{x + 10}" y="{y + 8}" width="{w}" height="{h}" rx="56" fill="#0a0b0d"/></g>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="56" fill="url(#caseBg)"/>'
            f'<g clip-path="url(#pc)">'
            + ''.join(f'<path d="M{x - 200 + k * 34} {y - 50}L{x + 400 + k * 34} {y + h + 50}" stroke="{GOLD}" stroke-width="1" opacity=".08"/>' for k in range(-12, 18))
            + f'<image href="{art(design)}" x="{x - 40}" y="{y + 150}" width="{w + 80}" height="{(w + 80) * 1400 / 1200}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#edge)"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" filter="url(#noise)" opacity=".1" style="mix-blend-mode:overlay"/></g>'
            f'<rect x="{x + 1.5}" y="{y + 1.5}" width="{w - 3}" height="{h - 3}" rx="55" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3"/>'
            # camera island
            f'<rect x="{x + 22}" y="{y + 22}" width="136" height="136" rx="36" fill="#0d0e11" stroke="{GOLD}" stroke-opacity=".5" stroke-width="2"/>'
            + ''.join(f'<circle cx="{x + cx}" cy="{y + cy}" r="27" fill="#141519" stroke="#2c2d33" stroke-width="5"/>'
                      f'<circle cx="{x + cx}" cy="{y + cy}" r="13" fill="#05070b"/><circle cx="{x + cx - 5}" cy="{y + cy - 5}" r="4" fill="#6f7c99" opacity=".7"/>'
                      for cx, cy in ((60, 60), (60, 120), (120, 90)))
            + f'<circle cx="{x + 124}" cy="{y + 46}" r="7" fill="#e8e1c9" opacity=".7"/>'
            '</g>')
    return page(body)


def tote(design: str):
    base, hi = GARMENT['natural']
    bag = 'M290 360L710 360L732 880L268 880Z'
    body = (f'<clipPath id="bc"><path d="{bag}"/></clipPath>'
            f'<path d="M370 370C360 200 420 120 470 120C520 120 520 230 520 370" fill="none" stroke="#CDBF9F" stroke-width="40" stroke-linecap="round"/>'
            f'<path d="M370 370C360 200 420 120 470 120C520 120 520 230 520 370" fill="none" stroke="{base}" stroke-width="30" stroke-linecap="round"/>'
            f'<g filter="url(#drop)"><path d="{bag}" fill="{base}"/></g>'
            f'<image href="{art(design)}" x="{500 - 175}" y="410" width="350" height="{350 * 1420 / 1200}"/>'
            f'<g clip-path="url(#bc)"><rect width="1000" height="1000" fill="url(#side)" style="mix-blend-mode:multiply" opacity=".55"/>'
            f'<rect width="1000" height="1000" filter="url(#weave)" opacity=".28" style="mix-blend-mode:multiply"/>'
            f'<rect width="1000" height="1000" filter="url(#noise)" opacity=".25" style="mix-blend-mode:overlay"/>'
            f'<path d="M290 400H710" stroke="#000" stroke-opacity=".12" stroke-width="2" stroke-dasharray="7 6"/>'
            f'<path d="M380 520C400 640 380 760 400 880" stroke="#000" stroke-width="24" opacity=".07" filter="url(#blur18)" fill="none"/></g>'
            f'<path d="M480 370C490 200 540 120 590 120C640 120 640 230 630 370" fill="none" stroke="#CDBF9F" stroke-width="40" stroke-linecap="round"/>'
            f'<path d="M480 370C490 200 540 120 590 120C640 120 640 230 630 370" fill="none" stroke="{hi}" stroke-width="30" stroke-linecap="round"/>'
            f'<path d="M480 370C490 200 540 120 590 120C640 120 640 230 630 370" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="6 5" opacity=".18"/>')
    return page(body, SIDE)


def stickers():
    items = [('logo-mark', 'rect', 170, 290, 250, -8, 1100 / 1200), ('bluff-neon', 'rect', 230, 620, 290, 5, 1300 / 1200),
             ('varsity-club', 'rect', 280, 320, 520, -4, 920 / 1200), ('burn-125', 'rect', 180, 680, 575, -5, 1400 / 1200),
             ('jacks-x5', 'circle', 190, 290, 790, 10, 1400 / 1200), ('queen-of-spades', 'rect', 140, 540, 815, -3, 1400 / 1200)]
    sheet = '<g filter="url(#drop)"><rect x="140" y="110" width="720" height="800" rx="18" fill="#FBFAF6"/></g>'
    sheet += '<path d="M860 830L860 910L780 910Z" fill="#E7E3D8"/><path d="M780 910L860 830C842 870 822 896 780 910Z" fill="#fff" style="filter:drop-shadow(-4px -4px 6px rgba(0,0,0,.2))"/>'
    body = ''
    for name, shape, size, cx, cy, rot, aspect in items:
        aw = size
        ah = size * aspect
        if shape == 'circle':
            r = max(aw, ah) / 2 * .78
            bg = f'<circle cx="{cx}" cy="{cy}" r="{r + 14}" fill="#fff"/><circle cx="{cx}" cy="{cy}" r="{r}" fill="#15161B"/>'
            aw, ah = aw * .82, ah * .82
        else:
            bg = (f'<rect x="{cx - aw / 2 - 26}" y="{cy - ah / 2 - 26}" width="{aw + 52}" height="{ah + 52}" rx="38" fill="#fff"/>'
                  f'<rect x="{cx - aw / 2 - 12}" y="{cy - ah / 2 - 12}" width="{aw + 24}" height="{ah + 24}" rx="26" fill="#15161B"/>')
        body += (f'<g transform="rotate({rot} {cx} {cy})" filter="url(#dropS)">{bg}'
                 f'<image href="{art(name)}" x="{cx - aw / 2}" y="{cy - ah / 2}" width="{aw}" height="{ah}"/></g>')
    return page(sheet + body)


# ------------------------------------------------------------------------------------------------ the deck (CSS 3D)
def deck_scene(mode: str):
    """'hero': tuck box + fanned cards; 'fan': court cards fan; 'back': backs + box back."""
    css = '''
    html,body{margin:0;background:transparent}
    .stage{width:1200px;height:1200px;position:relative;perspective:2400px;overflow:hidden}
    .box{position:absolute;transform-style:preserve-3d}
    .box > img{position:absolute;left:0;top:0;backface-visibility:hidden}
    .card{position:absolute;width:300px;height:420px;border-radius:18px;overflow:hidden;
          box-shadow:0 2px 2px rgba(0,0,0,.25),0 18px 36px rgba(0,0,0,.35);transform-origin:50% 92%}
    .card img{width:100%;height:100%;object-fit:cover;display:block}
    .card::after{content:"";position:absolute;inset:0;border-radius:18px;
          background:linear-gradient(125deg,rgba(255,255,255,.28),rgba(255,255,255,0) 40%,rgba(0,0,0,.08));}
    .shadow{position:absolute;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(26px)}
    '''

    def c(name):
        return uri(os.path.join(WEB, 'deck', name + '.webp'))

    def box(x, y, w, ry, rx=-8, rz=0, scale=1.0):
        h, d = w * 1050 / 750, w * 260 / 750
        return (f'<div class="box" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;transform:rotateX({rx}deg) rotateY({ry}deg) rotateZ({rz}deg) scale({scale})">'
                f'<img src="{c("box-front")}" style="width:{w}px;height:{h}px;transform:translateZ({d / 2}px)">'
                f'<img src="{c("box-back")}" style="width:{w}px;height:{h}px;transform:rotateY(180deg) translateZ({d / 2}px)">'
                f'<img src="{c("box-side")}" style="width:{d}px;height:{h}px;left:{(w - d) / 2}px;transform:rotateY(90deg) translateZ({w / 2}px);filter:brightness(.72)">'
                f'<img src="{c("box-side")}" style="width:{d}px;height:{h}px;left:{(w - d) / 2}px;transform:rotateY(-90deg) translateZ({w / 2}px);filter:brightness(.8)">'
                f'<img src="{c("box-top")}" style="width:{w}px;height:{d}px;top:{(h - d) / 2}px;transform:rotateX(90deg) translateZ({h / 2}px);filter:brightness(1.12)">'
                '</div>')

    if mode == 'hero':
        fan = ['QS', 'AS', 'KH', 'JD', '10C']
        cards = ''.join(f'<div class="card" style="left:{640 + i * 22}px;top:{330 + abs(i - 2) * 10}px;transform:rotate({(i - 2) * 11}deg)"><img src="{c(n)}"></div>'
                        for i, n in enumerate(fan))
        html = (f'<div class="stage"><div class="shadow" style="left:200px;top:880px;width:820px;height:90px"></div>'
                + cards + box(190, 270, 410, -24, -6) + '</div>')
    elif mode == 'fan':
        fan = ['JS', 'QH', 'QS', 'KD', 'AS', 'KC', 'JH']
        n = len(fan)
        cards = ''.join(f'<div class="card" style="width:330px;height:462px;left:435px;top:300px;transform:rotate({(i - (n - 1) / 2) * 13}deg)"><img src="{c(nm)}"></div>'
                        for i, nm in enumerate(fan))
        html = f'<div class="stage"><div class="shadow" style="left:250px;top:830px;width:700px;height:80px"></div>{cards}</div>'
    else:  # backs
        backs = ''.join(f'<div class="card" style="left:{300 + i * 14}px;top:{360 - i * 6}px;transform:rotate({-14 + i * 4}deg)"><img src="{c("back")}"></div>' for i in range(4))
        html = (f'<div class="stage"><div class="shadow" style="left:220px;top:860px;width:780px;height:80px"></div>'
                + backs + f'<div class="card" style="left:620px;top:330px;transform:rotate(9deg)"><img src="{c("box-back")}"></div>'
                + '</div>')
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{html}</body></html>'


# ------------------------------------------------------------------------------------------------ catalogue of renders
SCENES = {
    'deck-hero': lambda: deck_scene('hero'),
    'deck-fan': lambda: deck_scene('fan'),
    'deck-backs': lambda: deck_scene('back'),
    'tee-queen-ink': lambda: tee('queen-of-spades', 'ink'),
    'tee-queen-forest': lambda: tee('queen-of-spades', 'forest'),
    'tee-burn-ink': lambda: tee('burn-125', 'ink'),
    'tee-burn-forest': lambda: tee('burn-125', 'forest'),
    'tee-sunset-ink': lambda: tee('sunset-70s', 'ink'),
    'tee-sunset-forest': lambda: tee('sunset-70s', 'forest'),
    'hoodie-varsity-forest': lambda: hoodie('varsity-club', 'forest'),
    'hoodie-varsity-ink': lambda: hoodie('varsity-club', 'ink'),
    'hoodie-bluff-ink': lambda: hoodie('bluff-neon', 'ink', art_w=230, art_y=350, aspect=1300 / 1200),
    'hoodie-bluff-ruby': lambda: hoodie('bluff-neon', 'ruby', art_w=230, art_y=350, aspect=1300 / 1200),
    'mug-front': lambda: mug('front'),
    'mug-back': lambda: mug('back'),
    'poster-riga-black': lambda: framed_poster('riga-jugendstil', '#141418'),
    'poster-riga-oak': lambda: framed_poster('riga-jugendstil', '#8A6439'),
    'phone-jacks': lambda: phone('jacks-x5'),
    'tote-hand': lambda: tote('line-art-hand'),
    'cap-logo-ink': lambda: cap('ink'),
    'cap-logo-forest': lambda: cap('forest'),
    'stickers': stickers,
}


def to_webp(png: str, out: str, size=SIZE, q=80):
    im = Image.open(png).convert('RGBA')
    bbox = im.getbbox()
    if bbox:  # keep it square-ish but trim excess transparent margin, then pad back to a square
        l, t, r, b = bbox
        pad = 30
        side = max(r - l, b - t) + 2 * pad
        cx, cy = (l + r) / 2, (t + b) / 2
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(im.crop((l, t, r, b)), (int(side / 2 - (r - l) / 2), int(side / 2 - (b - t) / 2)))
        im = canvas.resize((size, size), Image.LANCZOS) if side != size else canvas
        del cx, cy
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out, 'WEBP', quality=q, method=6)


def web_assets():
    """Small WebP versions of deck faces for the live 3D deck box in the store hero."""
    for n, w in (('box-front', 420), ('box-back', 420), ('box-side', 170), ('box-top', 420), ('back', 360),
                 ('QS', 360), ('AS', 360), ('KH', 360), ('JD', 360), ('10C', 360), ('JS', 360), ('QH', 360),
                 ('KD', 360), ('KC', 360), ('JH', 360)):
        im = Image.open(os.path.join(DECK_PNG, n + '.png')).convert('RGB')
        # trim the print bleed (37.5 px of 825) so the web faces show the trimmed card
        bx = round(im.width * 37.5 / (825 if n != 'box-side' else 335))
        by = round(im.height * 37.5 / (1125 if n != 'box-top' else 335))
        im = im.crop((bx, by, im.width - bx, im.height - by))
        im = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
        os.makedirs(os.path.join(WEB, 'deck'), exist_ok=True)
        im.save(os.path.join(WEB, 'deck', n + '.webp'), 'WEBP', quality=84, method=6)


def main(names):
    tmp = tempfile.mkdtemp(prefix='merch-')
    web_assets()
    with browser() as b:
        for name in names:
            html = SCENES[name]()
            png = os.path.join(tmp, name + '.png')
            render_html(b, html, png, SIZE, SIZE, base=tmp)
            to_webp(png, os.path.join(OUT, name + '.webp'))
            print(name, os.path.getsize(os.path.join(OUT, name + '.webp')) // 1024, 'KB')


if __name__ == '__main__':
    main(sys.argv[1:] or list(SCENES))
