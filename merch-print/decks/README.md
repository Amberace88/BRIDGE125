# Bridge 125 — the deck collection

Eight original 54-card poker decks (52 + 2 jokers), everything drawn in code by `scripts/merch/decks/` — no stock art, no
fonts needed (all text is outlined from the app's own Golos Text / Cormorant Garamond), no third-party brands or characters.

| Deck (`<id>`) | Store product | Markets (UI languages) | 36-card edition | Look |
|---|---|---|---|---|
| `signature` | `deck` (store hero, keeps the old id) | all | yes (Bridge 125) | felt green + brass, art-deco courts, dark Q♠ |
| `baltic` | `deck-baltic` | lv lt et en | yes (Zolīte-ready) | woven-belt diamonds, Auseklis star, oak, amber |
| `slavic` | `deck-slavic` | ru uk be kk bg | yes (Durak) | red berries + gold leaves on black lacquer, kokoshniks |
| `caucasus` (“Silk Road”) | `deck-caucasus` | ka hy az kk uz | yes | carpet medallions, 8-point stars, pomegranates |
| `iberian` | `deck-iberian` | es en | — | azulejo tiles, red-and-gold sun, polka dots, guitars |
| `bauhaus` | `deck-bauhaus` | de pl ro en | — | primary geometry, constructed suits & courts |
| `neon` (“Neon Noir”) | `deck-neon` | all | — | magenta/cyan neon on black, synthwave sun |
| `ivory` | `deck-ivory` | all | — | luxury minimal, fine line, one spot gold (foil-ready) |

Every deck: 13 ranks × 4 suits with the standard pip layouts, 12 illustrated double-ended courts, 2 jokers, a 180°
rotation-symmetric back (tested pixel by pixel), international indices A K Q J, and a tuck box whose back carries a QR code
to `https://bridge125.com/?source=deck_<id>` and the “digital twin” line.

## Files

```
merch-print/decks/<id>/
  svg/                  vector masters: AS … KC, JK1, JK2, back, box-front/back/side/top, box-dieline   (committed)
  print/cards-825x1125/ 01-AS.png … 54-JK2.png + 55-back.png — the print masters                         (committed)
  print/box/            box-front/back/side/top.png + box-dieline-print.png (art) + -guides.png (cut/fold) (committed)
  print/back-only-750x1050/back.png  back at trim size, for back-only products                         (committed)
  print/edition36.txt   which 36 files make the 6 … A edition                                            (committed, 4 decks)
  print/prodigi-815x1110/  same cards cropped to 69 × 94 mm                                              (git-ignored, regenerate)
  preview.jpg           contact sheet: all 55 faces + the dieline
  manifest.json         card order, sizes, QR target, markets, cosmetic id
public/merch/decks/<id>/
  mockups/hero|fan|spread|backs.webp   store photos, 1200 × 1200 (rendered in perspective, lit, shadowed)
  web/*.webp            3D-viewer faces (same names as public/merch/web/deck): box-front/back 420 × 585,
                        box-side 124 × 587, box-top 420 × 124, cards 360 × 504 (back, AS, KH, QS, JD, KC, QH, JS, 10C, JK1, …)
  back.svg, <card>.svg  vector back (the in-game twin) + the product's `design` card
```

**Why the print PNGs are committed:** all eight decks' masters + boxes come to ≈ 64 MB (≈ 115 MB with the Prodigi crop,
which is therefore git-ignored and regenerated on demand) — inside the ~150 MB budget, and it means the owner can upload to a
print provider straight from the repo without installing anything.

## Print specs per provider

| | Size | Notes |
|---|---|---|
| Card master (`cards-825x1125`) | 825 × 1125 px, 300 dpi = 2.75 × 3.75 in | poker 2.5 × 3.5 in (63.5 × 88.9 mm) + 1/8 in (3.2 mm) bleed each side; safe area 1/8 in inside the trim. The usual template of custom-deck printers (MakePlayingCards, The Game Crafter, Printify's playing-card providers) |
| Prodigi-style (`prodigi-815x1110`) | 815 × 1110 px | 63 × 88 mm + 3 mm bleed = 69 × 94 mm at 300 dpi; a centre crop of the master (only bleed is removed) |
| Back-only (`back-only-750x1050`) | 750 × 1050 px | trim size, for products where you only customise the back (e.g. Printful's poker deck) |
| Tuck box panels | front/back 840 × 1140, side 300 × 1140, top/bottom 840 × 300 px | inner box 64.8 × 90.2 × 19 mm (54 cards on 300–310 gsm), each with 1/8 in bleed |
| Tuck box dieline | 2245 × 2040 px | [side · front · side · back · glue], lid + tuck above the back, bottom + tuck below the front; `-guides` shows cut (red) and fold (blue dashed) |

Many POD services have a fixed 54-card slot list: upload in file-number order (01 … 54), `55-back.png` as the common back.
For the 36-card edition pick the files listed in `edition36.txt`. Always check the provider's current template once before
the first order (bleed and corner radius differ slightly between printers), and order a proof — especially for **Neon Noir**
(RGB neon prints ~15 % duller in CMYK) and **Ivory** (gold is a flat #B8954A; with a hot-foil printer, use the gold areas
of the SVG as the foil layer).

## Regenerate

```
npm run merch:decks                         # SVG masters, previews, manifests, store mockups, web faces (~5 min)
npm run merch:decks -- --print              # + all print PNGs (~15 min)
npm run merch:decks -- --decks=baltic,neon  # just some decks
npx tsc -p scripts/merch/decks              # type-check the generator
npx vitest run scripts/merch src/merch      # checks: 54 unique cards, pip counts, sources == generator output,
                                            #   pixel sizes, back 180° symmetry, products / strings / cosmetics
```

Node ≥ 22.18 runs the TypeScript directly. Rasterising uses `sharp` (librsvg), already in `node_modules` via wrangler.
Output is deterministic: same code → byte-identical SVGs (the tests compare the committed SVGs with fresh output).

Code map: `lib/font.ts` (WOFF reader → outlined text, kerning, lining figures) · `lib/cards.ts` (geometry, pip layouts,
the `DeckTheme` contract) · `lib/figure.ts` (the court-figure builder, painted per deck) · `lib/court.ts` · `lib/box.ts`
(panels + dieline) · `lib/qr.ts` · `lib/scene.ts` (perspective compositor for the mockups) · `mockups.ts` · `decks/*.ts`
(one file per deck) · `build.ts`.

## Store + app integration

- `src/merch/decks/index.ts` — `DECK_PRODUCTS` (one product per deck, 4 mockups), `DECK_MARKETS` (product → languages),
  `decksForLang(lang)` (Signature first, then decks made for the visitor's language), `deckWeb(id, name)` for the 3D box
  (e.g. switch `Merch.tsx`'s `DECK()` to `deckWeb('signature', n)` to show the new Signature box).
- `src/merch/decks/strings.ts` — `DECK_STRINGS` (`Strings<DeckStrings>`): en/lv/ru/uk complete, names + taglines in all 17
  languages; already merged into the store's product copy (`src/i18n/merch.ts`, `src/i18n/locales/*.ts`).
- `src/merch/decks/data.ts` — prices, badges, colours, markets, 36-card flags (single source for the app and the generator).

## Digital twin (card back as an in-game cosmetic)

`src/merch/decks/cosmetics.ts` exports `DECK_COSMETICS` / `DECK_BACKS` (`dk_<id>`, CardBack-shaped: id, name, css, premium +
svg/image/colours). They are **not registered yet** (that touches shared files). To switch them on:

1. `src/theme.ts` → `BACKS`: add `...DECK_BACKS` after `S1_BACKS`.
2. `src/cosmetics/data.ts` → `EARNED_IDS`: add `...DECK_COSMETIC_IDS` (earn-only, never sold for BM).
3. Supabase migration: whitelist the ids for `owned`/`card_back` like migration 016 did for the season items; add
   `deck_codes(code_hash text primary key, deck text not null, order_id text, redeemed_by uuid, redeemed_at timestamptz)`
   and `redeem_deck_code(code text)` (security definer: hash, look up, mark redeemed, append `dk_<deck>` to `profiles.owned`).
4. Fulfilment issues one code per sold deck with `makeTwinCode(deck, crypto.getRandomValues(new Uint8Array(5)))`
   (`src/merch/decks/twin.ts`, format `B125-SIG-XXXX-XXXX-C`, typo check character) and e-mails it / prints it on the
   packing slip — print-on-demand boxes are identical, so a unique code can't be printed inside the box itself.
5. A “Redeem deck code” field in the wardrobe calling the RPC (`parseTwinCode()` validates input client-side).
