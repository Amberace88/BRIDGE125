"""Render SVG / HTML to PNG with the preinstalled Playwright Chromium (transparent where the art is)."""
from __future__ import annotations

import os
import pathlib
import re
from contextlib import contextmanager

from playwright.sync_api import sync_playwright

from svgkit import ROOT


def svg_size(path: str):
    head = pathlib.Path(path).read_text(encoding='utf-8')[:600]
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', head)
    return float(m.group(1)), float(m.group(2))


@contextmanager
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--force-color-profile=srgb', '--disable-gpu'])
        try:
            yield b
        finally:
            b.close()


def render_svg(b, svg_path: str, out_png: str, width: int, bg: str | None = None):
    """Rasterise an SVG to `width` px wide (height from its viewBox)."""
    w, h = svg_size(svg_path)
    height = round(width * h / w)
    # render at a fraction of the size with deviceScaleFactor so huge exports stay within GPU limits
    dpr = 1 if width <= 2400 else 2
    vw, vh = width // dpr, round(height / dpr)
    page = b.new_page(viewport={'width': vw, 'height': vh}, device_scale_factor=dpr)
    src = pathlib.Path(svg_path).read_text(encoding='utf-8')
    bgcss = f'background:{bg};' if bg else 'background:transparent;'
    page.set_content(f'<html><head><style>svg{{display:block;width:{vw}px;height:{vh}px}}</style></head>'
                     f'<body style="margin:0;{bgcss}">{src}</body></html>')
    page.wait_for_load_state('networkidle')
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    page.screenshot(path=out_png, omit_background=bg is None, full_page=False, timeout=240000)
    page.close()


def render_html(b, html: str, out_png: str, width: int, height: int, dpr: float = 1, transparent=True, base: str | None = None):
    page = b.new_page(viewport={'width': width, 'height': height}, device_scale_factor=dpr)
    if base:
        tmp = pathlib.Path(base) / '_render.html'
        tmp.write_text(html, encoding='utf-8')
        page.goto(tmp.resolve().as_uri())
    else:
        page.set_content(html)
    page.wait_for_load_state('networkidle')
    page.evaluate('document.fonts.ready')
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    page.screenshot(path=out_png, omit_background=transparent)
    page.close()
    if base:
        (pathlib.Path(base) / '_render.html').unlink(missing_ok=True)


MERCH = os.path.join(ROOT, 'public', 'merch')
