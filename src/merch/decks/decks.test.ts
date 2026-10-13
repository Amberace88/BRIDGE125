/// <reference types="node" />
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { missingKeys } from '../../i18n/pick';
import { CATEGORIES, PRODUCTS, SWATCH, productById } from '../catalog';
import { DECK_BACKS, DECK_COSMETICS, DECK_COSMETIC_IDS } from './cosmetics';
import { ALL_LANGS, DECK_INFO } from './data';
import { DECK_MARKETS, DECK_PRODUCTS, decksForLang } from './index';
import { DECK_PRODUCT_IDS, DECK_STRINGS } from './strings';
import { TWIN_PREFIX, makeTwinCode, parseTwinCode } from './twin';

const pub = (p: string) => join(process.cwd(), 'public', p.replace(/^\//, ''));

describe('DECK_PRODUCTS', () => {
  it('one valid card product per deck, Signature keeps the id "deck"', () => {
    expect(DECK_PRODUCTS).toHaveLength(DECK_INFO.length);
    expect(DECK_PRODUCTS.length).toBeGreaterThanOrEqual(6);
    expect(DECK_PRODUCTS[0].id).toBe('deck');
    expect(DECK_PRODUCTS.filter(p => p.hero).map(p => p.id)).toEqual(['deck']);
    const ids = DECK_PRODUCTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of DECK_PRODUCTS) {
      expect(p.id === 'deck' || /^deck-[a-z]+$/.test(p.id), p.id).toBe(true);
      expect(p.category).toBe('cards');
      expect(CATEGORIES).toContain(p.category);
      expect(p.price).toBeGreaterThanOrEqual(19);
      expect(p.price).toBeLessThanOrEqual(29);
      expect(p.colours).toHaveLength(1);
      expect(Object.keys(SWATCH)).toContain(p.colours[0].id);
      expect(p.colours[0].images).toHaveLength(4);
      for (const img of p.colours[0].images) expect(existsSync(pub(img)), img).toBe(true);
      expect(existsSync(pub(`/merch/designs/${p.design}.svg`)), p.design).toBe(true);
      expect(productById(p.id), p.id).toBe(p);            // reachable from the catalogue, no duplicate base 'deck'
    }
    expect(PRODUCTS.slice(0, DECK_PRODUCTS.length)).toEqual(DECK_PRODUCTS); // decks first
  });

  it('markets: every deck has known languages; the store can sort by visitor language', () => {
    expect(Object.keys(DECK_MARKETS).sort()).toEqual(DECK_PRODUCTS.map(p => p.id).sort());
    for (const langs of Object.values(DECK_MARKETS)) {
      expect(langs.length).toBeGreaterThan(0);
      for (const l of langs) expect(ALL_LANGS as readonly string[]).toContain(l);
    }
    expect(decksForLang('es').map(p => p.id).slice(0, 2)).toEqual(['deck', 'deck-iberian']);
    expect(decksForLang('ka').map(p => p.id).slice(0, 2)).toEqual(['deck', 'deck-caucasus']);
    expect(decksForLang('lv').map(p => p.id).slice(0, 2)).toEqual(['deck', 'deck-baltic']);
    expect(decksForLang('de').map(p => p.id).slice(0, 2)).toEqual(['deck', 'deck-bauhaus']);
    expect(decksForLang('xx')).toHaveLength(DECK_PRODUCTS.length);
  });
});

describe('DECK_STRINGS', () => {
  it('covers every deck product', () => {
    expect([...DECK_PRODUCT_IDS].sort()).toEqual(DECK_PRODUCTS.map(p => p.id).sort());
  });
  it('en, lv, ru, uk are complete; all 17 languages have localized titles', () => {
    expect(Object.keys(DECK_STRINGS).sort()).toEqual([...ALL_LANGS].sort());
    for (const l of ['lv', 'ru', 'uk']) expect(missingKeys(DECK_STRINGS.en, DECK_STRINGS[l]), l).toEqual([]);
    for (const l of ALL_LANGS) {
      const s = DECK_STRINGS[l]!;
      expect(s.collection.title, l).toBeTruthy();
      for (const id of DECK_PRODUCT_IDS) {
        const c = s.decks[id];
        expect(c?.name && c.tagline && c.desc && c.details.length === 4, `${l}:${id}`).toBeTruthy();
        if (l !== 'en') expect(c.name, `${l}:${id} name`).not.toBe(DECK_STRINGS.en.decks[id].name);
      }
    }
  });
});

describe('digital twin', () => {
  it('one earn-only back cosmetic per deck, assets on disk', () => {
    expect(DECK_COSMETICS).toHaveLength(DECK_INFO.length);
    expect(new Set(DECK_COSMETIC_IDS).size).toBe(DECK_COSMETIC_IDS.length);
    for (const c of DECK_COSMETICS) {
      expect(c.id).toMatch(/^dk_[a-z]+$/);
      expect(existsSync(pub(c.image)), c.image).toBe(true);
      expect(existsSync(pub(c.svg)), c.svg).toBe(true);
      expect(c.css).toContain(c.image);
    }
    expect(DECK_BACKS[0]).toEqual({ id: 'dk_signature', name: 'Signature Felt', css: DECK_COSMETICS[0].css, premium: true });
  });

  it('codes round-trip, normalise input and catch typos', () => {
    for (const d of DECK_INFO) {
      expect(TWIN_PREFIX[d.id], d.id).toMatch(/^[A-Z]{3}$/);
      const code = makeTwinCode(d.id, new Uint8Array([1, 2, 3, 250, 99]));
      expect(code).toMatch(/^B125-[A-Z]{3}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]$/);
      expect(parseTwinCode(code)).toEqual({ deckId: d.id, code });
      expect(parseTwinCode(code.toLowerCase().replace(/-/g, ' '))?.deckId).toBe(d.id);
      const typo = code.slice(0, 10) + (code[10] === 'A' ? 'B' : 'A') + code.slice(11);
      expect(parseTwinCode(typo)).toBeNull();
    }
    expect(parseTwinCode('hello')).toBeNull();
    expect(() => makeTwinCode('nope', new Uint8Array(5))).toThrow();
  });
});
