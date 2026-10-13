# Bridge 125 — merch print files

Everything here is original artwork drawn in code for Bridge 125 (no stock art, no third-party brands or characters,
no real people, no flags, coats of arms or political symbols). Sources are vector SVGs with all text converted to
outlines, so no fonts are needed at the print shop.

```
designs/            vector sources (SVG) of every design — open in Illustrator / Inkscape / Affinity, or upload where SVG is accepted
print/              upload-ready raster files (PNG transparent, JPG for full-bleed art) — see "Regenerating"
deck/               the original 36-card deck, 825 × 1125 px = 2.75 × 3.75 in at 300 dpi (poker card + 1/8 in bleed)
../public/merch/mockups/   product photos used by the store screen (WebP, 1200 px, generated)
```

The **2026 collection** files in `print/` are generated, not committed (they are ~200 MB): run `npm run merch:build`
(or `python3 scripts/merch/export.py --designs [name …]` for single designs). Output is deterministic — seeded
randomness, fonts vendored in `scripts/merch/fonts` (SIL OFL) and `node_modules/@fontsource`.
The original line's print files (queen-of-spades, bluff-neon, varsity-club, riga-jugendstil, seven-rules, jacks-x5,
logo-mark …) stay committed in `print/`.

## The collection

**Universal designs** — speak to every market:

| Design file | Name | Style | On |
|---|---|---|---|
| `pop-lady` | The Lady | Pop-art Queen of Spades, Ben-Day dots, "Draw five, darling." | tee, poster, 11 oz mug (`pop-lady-wrap`), phone case, stickers |
| `bluff-riso` | Bluff | 2-ink risograph (fluoro pink + blue), "*except at 124." | tee, poster (paper `#F6F0E2`) |
| `burn-synth` | 125 → 0 | Synthwave: chrome 125, neon grid, "Burn it down" | hoodie (dark garments only), stickers |
| `never-durak` | Never the Durak | Varsity crest, laurel, crossed-out jester cap | sweatshirt, stickers |
| `lielais` | Lielais (Zolīte) | Folk-modern sun medallion, the four queens — LV market | tee, tote |
| `lucky-jack` | Lucky Jack | Old-school tattoo flash, J♥ in a horseshoe | tee, enamel mug (`lucky-jack-wrap`), phone case, stickers |
| `seven-two` | Seven? Draw Two. | Swiss / Bauhaus type | tee, poster, 11 oz mug (`seven-two-wrap`) |
| `sudoku-nines` | Think in Nines | Bauhaus Sudoku grid (a real valid grid) | A5 notebook cover |
| `patience` | Patience | Minimal Solitaire cascades | poster, A5 notebook cover |
| `four-suits` | Four Suits | Pop-art suit tiles | canvas, tote, stickers; `coaster-S/H/D/C` = one tile per coaster |
| `cap-125` | 125 Flame | Embroidery mark, 2 thread colours | cap |
| `mat-felt` / `mat-night` | The Table | Card-table play mat (felt green / neon night) | play mat |

**City editions** — "Bridge 125 · ‹City› Salon", retro travel posters for the 17 Journey home cities: Riga, Tallinn,
Vilnius, Warsaw, Berlin, Kyiv, Bucharest, Sofia, Tbilisi, Yerevan, Baku, Almaty, Tashkent, Madrid, London, Vienna,
Monte Carlo. Each city has three files: `city-<id>` (3:4 full-bleed poster), `badge-<id>` (round badge, transparent)
and `badge-<id>-wrap` (badge twice on an 8.5 × 3.5 in mug wrap). Landmarks are simplified original silhouettes.

## Which file goes on which product

Provider names are the catalogue names at Printful / Gelato / Printify / Prodigi (pick one provider per product; all
of them accept PNG/JPG at these sizes). Colours = the store's colourways (`src/merch/catalog.ts`).

| Store product (id) | Upload | Provider product | Placement & size | Colourways |
|---|---|---|---|---|
| Decks (`src/merch/decks`) / `deck` | `deck/*.png` | Custom playing cards, poker 63 × 89 mm | Full bleed, 3 mm bleed included | felt-green back |
| `mat-table` | `print/mat-felt.jpg`, `print/mat-night.jpg` (7200 × 4200, 12:7) | Printful *Gaming Mouse Pad* / Printify *Desk Mat* | Full bleed; crop 1–2 cm at the long ends for 90 × 40 cm | felt, night |
| `tee-lady` | `print/pop-lady.png` | Printful *Unisex Staple T-Shirt (Bella+Canvas 3001)*, Gelato *Unisex Classic Crewneck*, Printify *Unisex Jersey Short Sleeve Tee* | Front, 28 cm wide, 7 cm below collar | white, ink |
| `tee-bluff` | `print/bluff-riso-transparent.png` | as above (light garments only) | Front, 28 cm wide | white, sand |
| `tee-lucky` | `print/lucky-jack.png` | as above | Front, 28 cm wide | ink, white |
| `tee-seven` | `print/seven-two-transparent.png` | as above (light garments only) | Front, 26 cm wide | white, natural |
| `tee-lielais` | `print/lielais-transparent.png` | as above | Front, 26 cm wide | natural, white |
| `city-tee-<city>` (×17) | `print/badge-<city>.png` | as above | Front chest centre, 22 cm wide | white, ink |
| `hoodie-burn` | `print/burn-synth.png` | Printful / Printify *Unisex Heavy Blend Hoodie (Gildan 18500)* | Front, 26 cm wide, above the pocket | ink, navy (dark only) |
| `sweat-durak` | `print/never-durak.png` | Printful *Unisex Crew Neck Sweatshirt (Gildan 18000)*, Gelato *Unisex Crewneck Sweatshirt* | Front, 28 cm wide | navy, ink |
| `cap-125` | `designs/cap-125.svg` (digitise; 2 threads: gold `#E2B547`, red `#E8323C`) | Printful *Classic Dad Hat (Yupoong 6245CM)*, embroidery | Front centre, 5.5 cm wide | ink, navy |
| `poster-lady`, `poster-bluff`, `poster-seven`, `poster-patience` | `print/pop-lady.png` (on white), `print/bluff-riso.jpg`, `print/seven-two.jpg`, `print/patience.jpg` | Printful *Enhanced Matte Paper Poster (cm)* / *Framed Poster (cm)*, Gelato *Premium Matte Paper Poster* / *Wooden Framed Poster*, Prodigi *Fine Art Print* | 30 × 40 cm and 50 × 70 cm (crop ~2 cm top/bottom for 50 × 70 or let the frame mat absorb it) | print only (`paper`), black frame, oak frame (+€25) |
| `city-poster-<city>` (×17) | `print/city-<city>.jpg` (5906 × 7875) | as above | Full bleed 3:4 | paper, black, oak |
| `canvas-suits` | `print/four-suits.png` (on white) | Gelato / Prodigi *Canvas, 2 cm frame*, Printful *Canvas (cm)* | 40 × 40 and 60 × 60 cm, wrap the white edge | — |
| `coasters-suits` | `print/coaster-S.jpg`, `-H`, `-D`, `-C` | Printify *Cork Back Coaster* (set of 4) / Prodigi *Coasters* | Full bleed, one suit per coaster | — |
| `mug-sevens`, `mug-lady` | `print/seven-two-wrap.png`, `print/pop-lady-wrap.png` (2550 × 1050) | Printful / Gelato *White Glossy Mug 11 oz* | Full wrap (8.5 × 3.5 in); one copy each side of the handle | white |
| `mug-lucky`, `city-mug-<city>` (×17) | `print/lucky-jack-wrap.png`, `print/badge-<city>-wrap.png` | Printful *Enamel Mug* (white, dark rim) | Full wrap | white |
| `notebook-nines`, `notebook-patience` | `print/sudoku-nines.jpg`, `print/patience.jpg` | Gelato *Hardcover Notebook A5*, Printful *Hardcover Bound Notebook* | Front cover, full bleed (148 × 210 mm, crop the sides slightly) | — |
| `tote-suits`, `tote-lielais` | `print/four-suits.png`, `print/lielais-transparent.png` | Printify *Cotton Canvas Tote*, Printful *Eco Tote Bag* | Front, 30 cm wide | natural |
| `phone-lady` | `print/pop-lady.png` | Printful *Tough Case for iPhone®* / *Snap Case for Samsung®* | Fill the case (crop to the panel), background `#FFD23F` | — |
| `phone-lucky` | `print/lucky-jack.png` | as above | Centred, ~110 % of case width; background `#15161B` | — |
| `stickers-pop` | `print/pop-lady.png`, `four-suits.png`, `lucky-jack.png`, `never-durak.png`, `burn-synth.png`, `cap-125.png` | Printful *Kiss-Cut Sticker Sheet* | 6 stickers, 3 mm white contour | white vinyl |
| `tee-queen` | `print/queen-of-spades.png` | tee (DTG) | Front, ~30 cm | ink, forest |
| `hoodie-bluff` | `print/bluff-neon.png` | hoodie | Front chest, ~24 cm | ink, ruby |
| `hoodie-varsity` | `print/varsity-club.png` | hoodie | Front chest, ~28 cm | forest, ink |
| `poster-riga` | `print/riga-jugendstil.jpg` | framed poster | 30 × 40 / 50 × 70 cm | black, oak |
| `mug-seven` | `print/seven-rules.png` | 11 oz mug | Full wrap | white |
| `phone-jacks` | `print/jacks-x5.png` | phone case | Background `#0B3B30`, ~110 % width | — |
| `cap-logo` | `designs/logo-mark.svg` (mark only) | Dad hat, embroidery | Front centre, 5.5 cm | ink, forest |

**Resolution.** Garment PNGs are 4000 px wide (34 cm at 300 dpi); posters 5906 px = 50 cm at 300 dpi; mats 7200 px
= 61 cm at 300 dpi. If a provider template wants another size, re-export from the SVG — never upscale.

**Colours.** Designed in sRGB. Riso / pop colours (fluoro pink, cyan) are outside CMYK; expect them slightly calmer on
paper — order one sample of the posters first. Gold is a yellow-brown ink, not metallic. DTG on dark garments adds a
white underbase automatically. `bluff-riso`, `seven-two` and `lielais` are drawn for light garments.

**Text in the artwork** is English (plus the city's own name in local script on the posters) so one file serves every
market; product names and descriptions are translated in the store (`src/i18n/merch.ts` + the 13 locale packs).

## Checkout

The store's cart calls `startMerchCheckout()` (src/merch/checkout.ts → worker, Stripe + the providers above). While
`merchCheckoutAvailable()` is false the cart is a pre-order list: one email puts every line on the `merch_interest`
list (supabase/migration_005_merch.sql; admins read it with `rpc('admin_merch_interest')`). Store settings
(free-shipping threshold, ship-to countries, optional external product links) are in `src/merch/config.ts`.

## Regenerating

Requires Python 3 with fontTools + Pillow + Playwright (Chromium), and `npm ci` (fonts from `node_modules/@fontsource`).

```
npm run merch:svg                         # vector sources only → merch-print/designs/*.svg
npm run merch:build                       # + print files → merch-print/print, mockups → public/merch/mockups
python3 scripts/merch/export.py --designs city-riga badge-riga      # single designs
python3 scripts/merch/mockups2.py cposter-riga-oak                  # single mockups (--list for all)
python3 scripts/merch/export.py --deck    # the original deck → merch-print/deck
```

Generators: `scripts/merch/collection.py` (universal designs), `cities.py` (City editions), `wraps.py` (mug wraps),
`designs.py` / `designs_b.py` (original line), `artkit.py` + `svgkit.py` (fonts → outlines, halftones, riso, cards),
`mockups2.py` / `mockups.py` (product photos).
