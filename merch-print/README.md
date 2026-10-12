# Bridge 125 — merch print files

Everything here is original artwork drawn in code for Bridge 125 (no stock art, no third-party characters or brands).
Sources are vector SVGs with all text converted to outlines, so no fonts are needed at the print shop.

```
designs/            vector sources (SVG) — open in Illustrator / Inkscape / Affinity, or upload where SVG is accepted
designs/deck/       the 36-card deck: 36 faces + back + tuck-box panels (SVG)
print/              upload-ready PNG/JPG exports (4000 px wide, 300 dpi tag, transparent unless noted)
print/deck/         deck exports, 825 × 1125 px = 2.75 × 3.75 in at 300 dpi (poker card + 1/8 in bleed)
mockups/            product photos used by the store screen (WebP, 1200 px)
web/deck/           small faces for the 3D deck box in the store hero
```

## Which file goes on which product

| Store product (id) | Upload | Product type to pick | Placement & size | Garment / base colours |
|---|---|---|---|---|
| Bridge 125 Playing Cards (`deck`) | `print/deck/*.png` (36 faces + `back.png`), box: `box-front/back/side/top.png` | Custom playing cards, **poker size 63 × 89 mm** | Full bleed, 1/8 in (3 mm) bleed already included; keep text 3 mm inside the trim | Back: felt green; faces: ivory |
| Queen of Spades Tee (`tee-queen`) | `print/queen-of-spades.png` | Unisex heavy/regular cotton tee (DTG) | Front, ~30 cm (12 in) wide, top ~7 cm below collar | Black / dark green |
| 125 → 0 Tee (`tee-burn`) | `print/burn-125.png` | Unisex tee (DTG) | Front, 28–30 cm wide | Black / dark green |
| Good Hands Tee (`tee-sunset`) | `print/sunset-70s.png` | Unisex tee (DTG) | Front, 28–30 cm wide | Black / dark green (not on cream — the lettering is cream) |
| Bridge Club Hoodie (`hoodie-varsity`) | `print/varsity-club.png` | Unisex pullover hoodie (DTG) | Front chest, ~28 cm wide, above the pocket | Forest green / black |
| Bluff Neon Hoodie (`hoodie-bluff`) | `print/bluff-neon.png` | Unisex pullover hoodie (DTG) | Front chest, ~24 cm wide | Black / maroon (the glow needs a dark garment) |
| Seven? Mug (`mug-seven`) | `print/seven-rules.png` (2550 × 1050 design ratio = 8.5 × 3.5 in wrap) | White ceramic mug 11 oz, full wrap | Full wrap; the headline sits left of the handle, the rule tiles right of it | White |
| Riga Jugendstil Poster (`poster-riga`) | `print/riga-jugendstil.jpg` (3:4, opaque) | Framed poster / enhanced matte paper | 30 × 40 cm and 50 × 70 cm (crop 50 × 70 slightly at top/bottom or add a 2 cm margin) | Black or oak frame |
| Jacks ×5 Phone Case (`phone-jacks`) | `print/jacks-x5.png` | Tough/slim case | Set the case background to **#0B3B30** (felt green), art centred, ~110 % of case width | — |
| Good Hand Tote (`tote-hand`) | `print/line-art-hand.png` | Cotton tote bag | Front, ~30 cm wide | Natural / ivory canvas |
| Modern Fan Cap (`cap-logo`) | `designs/logo-mark.svg` (use only the card mark, not the wordmark) | Dad hat / low-profile cap, **embroidery** | Front centre, ~5.5 cm wide; 2 threads: gold + the cap colour | Black / dark green |
| Sticker Sheet (`stickers`) | `print/logo-mark.png`, `bluff-neon.png`, `burn-125.png`, `varsity-club.png`, `jacks-x5.png`, `queen-of-spades.png` | Kiss-cut sticker sheet (or 6 single die-cut stickers) | Put each design on an ink **#15161B** rounded background so the gold and ivory read on white vinyl | White vinyl |

**Resolution.** PNG exports are 4000 px wide — 13.3 in / 34 cm at 300 dpi, comfortably above typical DTG front areas (12 × 16 in).
If a provider's template wants another pixel size, re-export from the SVG (see below) rather than upscaling.

**Colours.** Designed in sRGB. Brand values: Felt Green `#0B3B30` / `#17614D`, Brass Gold `#C9A85A` (gradient `#F3DE9C → #C9A85A → #A27E2C`),
Ivory `#F4EEDF`, Ink `#15161B`, Ruby `#C23347`. Printed gold is a yellow-brown ink, not metallic — order one sample of the Queen tee first.
DTG on dark garments adds a white underbase automatically; nothing to do in the file.

**The deck.** 36 cards: 6, 7, 8, 9, 10, J, Q, K, A in ♠ ♥ ♦ ♣ (files `6S.png … AC.png`). The Queen of Spades is the special full
art-deco portrait on a dark card — it is the most important card in the game. Many POD card printers sell a fixed 54-card poker deck;
choose one that allows a custom card count, or fill the extra slots with spare backs / a rules card. Box panels are separate files —
place them on the printer's own tuck-box template (`box-side.png` is for both narrow sides, `box-top.png` for the flaps).

## Turning on real checkout

1. Create the product in your POD account (Printful, Gelato, Printify …) and publish it to a storefront / payment link.
2. Paste the product URL in `src/merch/config.ts` → `MERCH_CHECKOUT` (per product, per colour or per exact variant).
3. That product's button switches from "Notify me" to "Buy — €xx". Prices in the store live in `src/merch/catalog.ts`;
   product text (EN/LV/RU/UK) in `src/i18n/merch.ts` — adjust materials/details to match the blank you choose.

Until then, "Notify me" sign-ups land in the Supabase table `merch_interest` (run `supabase/migration_005_merch.sql` once).
Read them as an admin with `select * from admin_merch_interest();` or `rpc('admin_merch_interest')`.

## Regenerating

Requires Python 3 with fontTools + Pillow + Playwright (Chromium), and `npm ci` (fonts come from `node_modules/@fontsource`).

```
python3 scripts/merch/export.py       # designs/*.svg + print/*.png, deck SVGs + print/deck/*.png
python3 scripts/merch/mockups.py      # mockups/*.webp + web/deck/*.webp
```
